// =============================================================================
// Import the exam papers into the app's data layer.
//
//   content/sources.json             (what exists on disk)
//     + content/overrides/*.json     (human corrections, always win)
//        -> content/generated/papers/<id>.json  (one file per paper)
//        -> content/generated/catalog.json      (index the app boots from)
//        -> public/soal/<id>/*.webp        (the illustrations)
//
// Run: pnpm soal:import [--only <id-prefix>] [--force]
//
// The pipeline is deliberately re-runnable: delete content/generated + public/soal and
// run it again and you get the same output, because every decision comes from
// the paper itself, not from anything typed by hand.
//
// Two source shapes exist and both are handled:
//   * a paper that ships a PDF — read layout, pictures and (usually) the key
//     straight from it;
//   * a paper that ships only .docx — Pages renders it to PDF first.
// Season 4's finals are a third case: the shipped PDF is the *clean student
// copy* with no key at all, while the .docx still carries the highlights. Those
// get a second, key-only pass over the converted .docx.
// =============================================================================
import { readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pdfLayout, renderPages, RASTER_PER_XML } from './lib/pdf.mjs'
import { docxToPdf, closePages, exists } from './lib/convert.mjs'
import { segment, bandText, bandImages, assignImages } from './lib/segment.mjs'
import { loadPage, eraseHues, eraseBox, writeCrop } from './lib/raster.mjs'
import { scoreOptionBands, pickAnswer } from './lib/answer-key.mjs'
import { questionSlug } from './lib/paper-id.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = join(root, '.import-cache')
const DATA_OUT = join(root, 'content', 'generated', 'papers')
const IMAGE_OUT = join(root, 'public', 'soal')

/** Padding around a cropped illustration, in xml units. */
const CROP_PADDING = 6

const args = process.argv.slice(2)
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
const force = args.includes('--force')

const toRaster = (value) => value * RASTER_PER_XML

/** The paper's printed masthead — everything above question 1 on page 1. */
function readMasthead(pages, firstQuestion) {
  const lines = pages[0].texts
    .filter((node) => firstQuestion.page > 0 || node.top < firstQuestion.top - 4)
    .map((node) => node.text.trim())
    .filter((text) => text.length > 1)
  return {
    title: lines[1] ?? null,
    level: lines[2] ?? null,
    date: lines[3] ?? null,
    raw: lines,
  }
}

/**
 * Union of a band's images on one page, padded, in raster pixels.
 *
 * A floating picture is allowed to overlap the paragraph printed underneath it,
 * so the raw union often reaches down over the next line of prose. `page` lets
 * us stop the crop just above the first line of type the picture swallowed —
 * without it, half a sentence gets baked into the illustration.
 */
function cropBox(images, page, markerNodes) {
  const left = Math.min(...images.map((i) => i.left)) - CROP_PADDING
  let top = Math.min(...images.map((i) => i.top)) - CROP_PADDING
  const right = Math.max(...images.map((i) => i.left + i.width)) + CROP_PADDING
  let bottom = Math.max(...images.map((i) => i.top + i.height)) + CROP_PADDING

  const artTop = Math.min(...images.map((i) => i.top))
  const artHeight = Math.max(...images.map((i) => i.top + i.height)) - artTop
  // A picture's box carries wide transparent margins, so the paragraphs it
  // overlaps sit at its very top and bottom. Prose in the outer fifths may
  // therefore trim the crop; prose further in is drawn over the artwork itself,
  // and cutting there sliced options down to a fragment — half an umbrella, the
  // tip of a finger.
  const clipFloor = artTop + Math.max(40, artHeight * 0.6)
  // `max`, not `min`: a tall picture's transparent margin is tall too, so the
  // line above it can sit well over 30 units below `artTop`. Capping the window
  // at 30 let that line straight through and baked it into the crop.
  const clipCeiling = artTop + Math.max(30, artHeight * 0.2)

  for (const node of page.texts) {
    // The "18." a picture straddles is the very reason it was assigned here —
    // clipping at it would slice the illustration in half. Only prose counts.
    if (markerNodes.has(node)) continue
    if (node.top > clipFloor && node.top < bottom) bottom = Math.min(bottom, node.top - 2)
    // The line ABOVE the picture, whose descenders the box reaches up over —
    // without this its bottom sliver is baked into the top of the crop.
    const nodeBottom = node.top + node.height
    if (nodeBottom > top && nodeBottom < clipCeiling) top = Math.max(top, nodeBottom + 1)
  }

  return {
    left: toRaster(left),
    top: toRaster(top),
    width: toRaster(right - left),
    height: toRaster(Math.max(4, bottom - top)),
  }
}

/**
 * Leftover drafting noise: "fghjkl", "gvdshb", "vdcx". Several papers carry it
 * beside an illustrated option, where the picture is the real answer.
 *
 * Words in both languages of this corpus are vowel-rich, so a run of letters
 * with almost no vowels is not a word. Applied ONLY to options that also have a
 * picture, so a genuine text option can never be blanked by it — and deliberately
 * conservative: "Hand" (a quarter vowels) and "Bunglon" both survive.
 */
function isKeyboardMash(text) {
  const letters = text.toLowerCase().replace(/[^a-z]/g, '')
  if (letters.length < 2) return false
  const vowels = (letters.match(/[aeiou]/g) ?? []).length
  if (vowels / letters.length < 0.25) return true
  // "ddd", "bgggg" — a single letter hammered out.
  return letters.length >= 3 && new Set(letters).size === 1
}

/** Illustrations, in raster pixels — off-limits to the highlight reader. */
function protectedFor(pages) {
  return pages.map((page) =>
    page.images.map((image) => ({
      left: toRaster(image.left - 2),
      top: toRaster(image.top - 2),
      width: toRaster(image.width + 4),
      height: toRaster(image.height + 4),
    })),
  )
}

/**
 * Everything needed to reason about one rendered document: geometry, structure
 * and decoded page rasters, with the highlight scores already attached.
 */
async function analyse(pdfPath, cacheDir, prefix, { reuse = true } = {}) {
  const pages = await pdfLayout(pdfPath, cacheDir, `${prefix}-layout`)
  const rasterPrefix = `${prefix}-raster`

  const cached = (await readdir(cacheDir)).filter((n) => n.startsWith(`${rasterPrefix}-page-`))
  const rasterPaths =
    cached.length && reuse && !force
      ? cached
          .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
          .map((n) => join(cacheDir, n))
      : await renderPages(pdfPath, cacheDir, rasterPrefix)

  const { questions, warnings, marks } = segment(pages)
  if (!questions.length) throw new Error('no questions found')

  assignImages(pages, questions)

  const rasters = []
  for (const path of rasterPaths) rasters.push(await loadPage(path))

  const protectedBoxes = protectedFor(pages)
  scoreOptionBands({ questions, marks, rasters, protectedBoxes, toRaster })

  return { pages, questions, marks, rasters, protectedBoxes, warnings }
}

/**
 * Read only the key from a second rendering of the same paper.
 * Returns `Map<questionNumber, letter>`.
 */
async function readKeyFrom(pdfPath, cacheDir, prefix) {
  const { questions } = await analyse(pdfPath, cacheDir, prefix)
  const key = new Map()
  for (const question of questions) {
    const { answer } = pickAnswer(question.bands.filter((b) => b.role === 'option'))
    if (answer) key.set(question.n, answer)
  }
  return key
}

async function importPaper(source, overrides) {
  const warnings = []
  const cacheDir = join(CACHE, source.id)
  await mkdir(cacheDir, { recursive: true })

  // 1. The document we read layout and pictures from.
  let pdfPath = source.pdf
  if (!pdfPath) {
    pdfPath = join(cacheDir, 'converted.pdf')
    await docxToPdf(source.docx, pdfPath)
  }

  const { pages, questions, marks, rasters, protectedBoxes, warnings: structural } =
    await analyse(pdfPath, cacheDir, 'main')
  warnings.push(...structural)

  const markerNodes = new Set(marks.map((m) => m.node))
  const masthead = readMasthead(pages, questions[0].start)

  // 2. Decide the key. If the shipped PDF turns out to be the clean student
  //    copy, fall back to the .docx, which still carries the highlights.
  const decisions = new Map()
  for (const question of questions) {
    decisions.set(question.n, pickAnswer(question.bands.filter((b) => b.role === 'option')))
  }
  let answerSource = source.pdf ? 'pdf' : 'docx'
  const answered = [...decisions.values()].filter((d) => d.answer).length

  if (answered === 0 && source.pdf) {
    const converted = join(cacheDir, 'from-docx.pdf')
    try {
      await docxToPdf(source.docx, converted)
      const key = await readKeyFrom(converted, cacheDir, 'key')
      if (key.size) {
        for (const question of questions) {
          const answer = key.get(question.n)
          const letters = question.optionKeys
          // Only accept a letter this question actually offers.
          if (answer && letters.includes(answer)) {
            decisions.set(question.n, { answer, hue: 'docx', reason: null })
          }
        }
        answerSource = 'docx'
        warnings.push(
          `answer key read from the .docx (the shipped PDF is the unmarked student copy)`,
        )
      }
    } catch (error) {
      warnings.push(`could not read key from .docx: ${error.message}`)
    }
  }

  // 3. Erase the key from the pixels BEFORE cutting the pictures out, so it
  //    never leaks into what the child is shown.
  for (const [index, raster] of rasters.entries()) eraseHues(raster, protectedBoxes[index])
  for (const mark of marks) {
    const raster = rasters[mark.page]
    // Inline markers only have an estimated x, so blanking their box could bite
    // into the artwork beside them. They sit outside the crops anyway.
    if (!raster || mark.inline) continue
    eraseBox(raster, {
      left: toRaster(mark.left - 3),
      top: toRaster(mark.top - 3),
      width: toRaster(mark.width + 6),
      height: toRaster(mark.height + 6),
    })
  }

  // 4. Emit.
  const imageDir = join(IMAGE_OUT, source.id)
  await rm(imageDir, { recursive: true, force: true })
  await mkdir(imageDir, { recursive: true })

  const out = []

  for (const question of questions) {
    const slug = questionSlug(question.n)
    const stemBand = question.bands.find((b) => b.role === 'stem')
    const optionBands = question.bands.filter((b) => b.role === 'option')

    for (const band of question.bands) {
      const parts = []
      for (const group of bandImages(band)) {
        const raster = rasters[group.pageIndex]
        if (!raster) continue
        const suffix = parts.length ? `-${parts.length + 1}` : ''
        const name =
          band.role === 'stem' ? `${slug}-stem${suffix}.webp` : `${slug}-${band.key}${suffix}.webp`
        const written = await writeCrop(
          raster,
          cropBox(group.images, pages[group.pageIndex], markerNodes),
          join(imageDir, name),
        )
        if (written) parts.push({ src: `/soal/${source.id}/${name}`, ...written })
      }
      band.assets = parts
    }

    const decision = decisions.get(question.n)
    if (decision.reason) warnings.push(`Q${question.n}: ${decision.reason}`)

    // Printed order is not always alphabetical — a few papers set out "a. c."
    // side by side with "b." underneath. The letters are what the child is told
    // to pick, so the app always lists them a, b, c.
    const options = [...optionBands]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((band) => {
        let text = bandText(band, pages, markerNodes) || null
        // Several papers repeat the option letter as the option's own body text
        // ("b.  b"). That is a typing slip in the source, not an answer.
        if (text && text.toLowerCase() === band.key) text = null
        if (text && band.assets.length && isKeyboardMash(text)) text = null
        return { key: band.key, text, images: band.assets.map((asset) => asset.src) }
      })

    for (const option of options) {
      if (!option.text && !option.images.length) {
        warnings.push(`Q${question.n}: option ${option.key} is empty`)
      }
    }

    const complete =
      Boolean(decision.answer) &&
      options.length >= 3 &&
      options.every((option) => option.text || option.images.length)

    out.push({
      id: `${source.id}-${slug}`,
      n: question.n,
      prompt: bandText(stemBand, pages, markerNodes) || null,
      images: stemBand.assets.map((asset) => asset.src),
      options,
      answer: decision.answer,
      // Questions the extractor could not fully resolve are kept in the file for
      // traceability but held back from the app — a half-read question is worse
      // for a five-year-old than a missing one.
      status: complete ? 'ok' : 'needs-review',
    })
  }

  const merged = applyOverrides(out, overrides)
  const playable = merged.filter((question) => question.status === 'ok').length

  const paper = {
    id: source.id,
    season: source.season,
    round: source.round,
    subject: source.subject,
    level: source.level,
    printed: masthead,
    layoutSource: source.pdf ? 'pdf' : 'docx',
    answerSource,
    verified: overrides?.verified === true,
    questionCount: merged.length,
    playableCount: playable,
    warnings,
    questions: merged,
  }

  await mkdir(DATA_OUT, { recursive: true })
  await writeFile(join(DATA_OUT, `${source.id}.json`), `${JSON.stringify(paper, null, 2)}\n`)

  return paper
}

/** Human corrections beat the extractor, always. */
function applyOverrides(questions, overrides) {
  if (!overrides?.questions) return questions
  return questions.map((question) => {
    const patch = overrides.questions[String(question.n)]
    if (!patch) return question
    const next = { ...question, ...patch }
    if (patch.options) {
      next.options = question.options.map((option) => ({
        ...option,
        ...(patch.options[option.key] ?? {}),
      }))
    }
    // A corrected question is playable again once it has an answer and options.
    if (
      next.answer &&
      next.options.length >= 3 &&
      next.options.every((option) => option.text || option.images.length)
    ) {
      next.status = patch.status ?? 'ok'
    }
    return next
  })
}

async function loadOverrides(id) {
  const path = join(root, 'content', 'overrides', `${id}.json`)
  if (!(await exists(path))) return null
  return JSON.parse(await readFile(path, 'utf8'))
}

// ---------------------------------------------------------------------------

const sources = JSON.parse(await readFile(join(root, 'content', 'sources.json'), 'utf8'))
const targets = sources.papers.filter((p) => !only || p.id.startsWith(only))

if (!targets.length) {
  console.error(`✗ no papers match ${only}`)
  process.exit(1)
}

const catalog = []
let failed = 0

for (const source of targets) {
  try {
    const paper = await importPaper(source, await loadOverrides(source.id))
    catalog.push({
      id: paper.id,
      season: paper.season,
      round: paper.round,
      subject: paper.subject,
      level: paper.level,
      printedDate: paper.printed.date,
      questionCount: paper.questionCount,
      playableCount: paper.playableCount,
      verified: paper.verified,
      warningCount: paper.warnings.length,
    })
    const flag = paper.playableCount === paper.questionCount ? '·' : `⚠`
    console.log(`${flag}\t${paper.id}\t${paper.playableCount}/${paper.questionCount} playable`)
    for (const warning of paper.warnings) console.log(`  \t  ${warning}`)
  } catch (error) {
    failed += 1
    console.error(`✗\t${source.id}\t${error.message}`)
  }
}

await closePages()

// The catalog is rewritten wholesale only on a full run; a --only run patches it.
if (only) {
  const path = join(root, 'content', 'generated', 'catalog.json')
  const previous = (await exists(path)) ? JSON.parse(await readFile(path, 'utf8')) : { papers: [] }
  const byId = new Map(previous.papers.map((p) => [p.id, p]))
  for (const entry of catalog) byId.set(entry.id, entry)
  catalog.length = 0
  catalog.push(...byId.values())
}

catalog.sort((a, b) => a.id.localeCompare(b.id))
await mkdir(join(root, 'content', 'generated'), { recursive: true })
await writeFile(
  join(root, 'content', 'generated', 'catalog.json'),
  `${JSON.stringify(
    {
      generatedFrom: 'scripts/import-papers.mjs',
      paperCount: catalog.length,
      questionCount: catalog.reduce((sum, p) => sum + p.questionCount, 0),
      playableCount: catalog.reduce((sum, p) => sum + p.playableCount, 0),
      papers: catalog,
    },
    null,
    2,
  )}\n`,
)

console.log(
  `\n${catalog.length} papers · ${catalog.reduce((s, p) => s + p.playableCount, 0)}/${catalog.reduce((s, p) => s + p.questionCount, 0)} questions playable${failed ? ` · ${failed} failed` : ''}`,
)
if (failed) process.exit(1)
