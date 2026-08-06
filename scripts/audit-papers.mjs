// =============================================================================
// Audit the imported bank against the source documents.
//
// The importer reports what *it* noticed. This asks the opposite question: does
// the finished data agree with the papers on disk, checked by routes the
// importer did not use?
//
//   1. Coverage    — does the source print more questions than we extracted?
//                    Counted from `pdftotext`, not from our own segmentation.
//   2. Answer keys — how many options does the .docx highlight, and does that
//                    match how many answers we ended up with? The .docx XML is a
//                    completely independent source from the rendered pixels.
//   3. Integrity   — every served question has 3+ options, exactly one answer,
//                    an answer that is actually on offer, and no option that is
//                    both empty and unillustrated.
//   4. Assets      — every referenced image exists, and no two bands in a
//                    question share the same crop (a tell-tale of mis-cropping).
//
// Run: node scripts/audit-papers.mjs [--only <id-prefix>]
// =============================================================================
import { readFile, readdir, access } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const run = promisify(execFile)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = join(root, '.import-cache')

const args = process.argv.slice(2)
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null

const sources = JSON.parse(await readFile(join(root, 'content', 'sources.json'), 'utf8'))
const papers = sources.papers.filter((p) => !only || p.id.startsWith(only))

/** Highest question number printed anywhere in the source PDF text. */
async function printedQuestionNumbers(pdfPath) {
  const { stdout } = await run('pdftotext', ['-layout', pdfPath, '-'], {
    maxBuffer: 32 * 1024 * 1024,
  })
  const seen = new Set()
  for (const line of stdout.split('\n')) {
    const match = /^\s{0,12}(\d{1,2})\s*[.)]\s/.exec(line)
    if (match) seen.add(Number(match[1]))
  }
  return seen
}

/**
 * The *text* the .docx highlights, normalised.
 *
 * This is the independent check that matters. The importer reads the key from
 * pixels on a rendered page; this reads it from the Word XML, which shares no
 * code and no assumptions with that path. Where an option is words rather than
 * a picture, the two can be compared directly.
 *
 * Returned as a multiset: "3" is the marked answer to more than one question in
 * most maths papers, so counts matter, not just membership.
 */
async function highlightedText(docxPath) {
  const { stdout } = await run('unzip', ['-p', docxPath, 'word/document.xml'], {
    maxBuffer: 64 * 1024 * 1024,
    encoding: 'buffer',
  })
  const xml = stdout.toString('utf8')
  const paragraphs = []

  for (const paragraph of xml.split('<w:p ').slice(1)) {
    let full = ''
    let highlighted = ''
    // Split on `<w:r>` AND `<w:r attr=...>`; Word writes revision ids on most
    // runs, and matching only the bare tag silently drops them. `<w:rPr>` is not
    // caught by this, since the character after `<w:r` there is `P`.
    for (const runXml of paragraph.split(/<w:r[ >]/).slice(1)) {
      const properties = runXml.slice(0, runXml.indexOf('</w:rPr>') + 1)
      let text = ''
      for (const match of runXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)) text += match[1]
      full += text
      if (/<w:highlight w:val="(magenta|yellow)"/.test(properties)) highlighted += text
    }

    const body = normalise(full)
    if (!body) continue
    // The highlight usually covers the option marker as well as the words
    // ("a.  Satu"), so a highlighted marker alone still marks the paragraph.
    paragraphs.push({ text: body, marked: Boolean(highlighted.trim()) })
  }
  return paragraphs
}

/**
 * Find this question's options inside the .docx paragraph stream and report
 * which one Word highlights.
 *
 * Matching the *ordered triple* of option texts rather than a single word is
 * what makes this reliable: "3" appears all over a maths paper, but
 * ["3", "4", "5"] in that order almost never appears twice. If it does, the
 * question is skipped rather than guessed at.
 *
 * Returns the marked option's index, or null when the check cannot be made.
 */
function markedIndexFor(paragraphs, optionTexts) {
  const wanted = optionTexts.map(normalise)
  const windows = []

  for (let i = 0; i + wanted.length <= paragraphs.length; i += 1) {
    let hit = true
    for (let j = 0; j < wanted.length; j += 1) {
      if (paragraphs[i + j].text !== wanted[j]) {
        hit = false
        break
      }
    }
    if (hit) windows.push(i)
  }
  if (windows.length !== 1) return null

  const start = windows[0]
  const markedAt = []
  for (let j = 0; j < wanted.length; j += 1) {
    if (paragraphs[start + j].marked) markedAt.push(j)
  }
  return markedAt.length === 1 ? markedAt[0] : null
}

/**
 * Compare option text loosely: case, spacing, a leading option marker and
 * trailing punctuation all vary between the .docx and the printed page.
 */
function normalise(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/^\s*[a-d]\s*[.)]\s*/, '')
    .replace(/[.,;:!?…]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const findings = []
const note = (id, kind, message) => findings.push({ id, kind, message })

let servedTotal = 0
let questionTotal = 0
let checkedKeys = 0
let skippedKeyChecks = 0

for (const source of papers) {
  const paper = JSON.parse(
    await readFile(join(root, 'content', 'generated', 'papers', `${source.id}.json`), 'utf8'),
  )
  questionTotal += paper.questionCount
  const served = paper.questions.filter((q) => q.status === 'ok')
  servedTotal += served.length

  // --- 1. Coverage --------------------------------------------------------
  const pdfPath = source.pdf ?? join(CACHE, source.id, 'converted.pdf')
  if (await exists(pdfPath)) {
    const printed = await printedQuestionNumbers(pdfPath)
    const extracted = new Set(paper.questions.map((q) => q.n))
    const highestPrinted = Math.max(0, ...printed)
    const highestExtracted = Math.max(0, ...extracted)

    if (highestPrinted > highestExtracted) {
      note(
        source.id,
        'coverage',
        `source prints up to Q${highestPrinted} but only Q1–Q${highestExtracted} were extracted`,
      )
    }
    for (let n = 1; n <= highestExtracted; n += 1) {
      if (!extracted.has(n)) note(source.id, 'coverage', `Q${n} missing from the extraction`)
    }
  } else {
    note(source.id, 'coverage', 'no rendered PDF in the cache — coverage not checked')
  }

  // --- 2. Answer keys vs the .docx ----------------------------------------
  const paragraphs = await highlightedText(source.docx)
  for (const question of served) {
    // Only questions whose options are all words can be cross-checked this way;
    // a picture option has no text to find in the .docx.
    if (!question.options.every((option) => normalise(option.text))) {
      skippedKeyChecks += 1
      continue
    }

    const index = markedIndexFor(paragraphs, question.options.map((o) => o.text))
    if (index === null) {
      skippedKeyChecks += 1
      continue
    }

    checkedKeys += 1
    const expected = question.options[index]
    if (expected.key !== question.answer) {
      note(
        source.id,
        'key',
        `Q${question.n}: pixels say "${question.answer}", the .docx highlights option ${expected.key} ("${expected.text}")`,
      )
    }
  }

  // --- 3. Integrity of what is served -------------------------------------
  for (const question of served) {
    const keys = question.options.map((o) => o.key)
    if (question.options.length < 3) {
      note(source.id, 'integrity', `Q${question.n} serves only ${question.options.length} options`)
    }
    if (new Set(keys).size !== keys.length) {
      note(source.id, 'integrity', `Q${question.n} has duplicate option letters`)
    }
    if (!question.answer) {
      note(source.id, 'integrity', `Q${question.n} is served with no answer`)
    } else if (!keys.includes(question.answer)) {
      note(source.id, 'integrity', `Q${question.n} answer "${question.answer}" is not among ${keys}`)
    }
    for (const option of question.options) {
      if (!option.text && option.images.length === 0) {
        note(source.id, 'integrity', `Q${question.n} option ${option.key} is empty`)
      }
    }
    if (!question.prompt && question.images.length === 0) {
      note(source.id, 'integrity', `Q${question.n} has neither wording nor a picture`)
    }
  }

  // --- 4. Assets ----------------------------------------------------------
  const dir = join(root, 'public', 'soal', source.id)
  const onDisk = (await exists(dir)) ? new Set(await readdir(dir)) : new Set()
  const referenced = new Set()
  for (const question of paper.questions) {
    const all = [...question.images, ...question.options.flatMap((o) => o.images)]
    const local = new Set()
    for (const src of all) {
      const file = src.split('/').pop()
      if (!onDisk.has(file)) note(source.id, 'asset', `Q${question.n} references missing ${file}`)
      if (local.has(src)) note(source.id, 'asset', `Q${question.n} uses ${file} twice`)
      local.add(src)
      referenced.add(file)
    }
  }
  for (const file of onDisk) {
    if (!referenced.has(file)) note(source.id, 'asset', `orphan image ${file}`)
  }

  // --- 5. Key distribution ------------------------------------------------
  // A paper whose answers are all the same letter almost certainly means the
  // detector locked onto something other than the highlight.
  const spread = {}
  for (const question of served) spread[question.answer] = (spread[question.answer] ?? 0) + 1
  const letters = Object.keys(spread)
  if (served.length >= 8 && letters.length === 1) {
    note(source.id, 'key', `every answer is "${letters[0]}" — suspicious`)
  }
}

// ---------------------------------------------------------------------------

const byKind = {}
for (const finding of findings) (byKind[finding.kind] ??= []).push(finding)

console.log(`Audited ${papers.length} papers — ${servedTotal}/${questionTotal} questions served`)
console.log(`Answer keys cross-checked against the .docx text: ${checkedKeys} (not comparable: ${skippedKeyChecks})\n`)

for (const [kind, list] of Object.entries(byKind)) {
  console.log(`## ${kind} (${list.length})`)
  for (const finding of list) console.log(`  ${finding.id}: ${finding.message}`)
  console.log()
}

if (!findings.length) console.log('No findings.')
