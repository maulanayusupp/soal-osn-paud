// =============================================================================
// Did every picture on the page actually reach the app?
//
// The three existing checks all start from what was extracted and ask whether
// it is right. None starts from the *source* and asks whether anything was
// lost. A picture that is silently dropped — because it was assigned to no
// band, or because its crop came out blank — leaves a question showing less
// than the paper does, which is exactly how a correct answer comes to look
// wrong.
//
// So this counts. For each question it takes the pictures printed in its span
// on the page and compares that against the pictures stored for it, and it
// separately reports any picture on the page that reached nothing at all.
//
// Run: node scripts/verify-completeness.mjs [--only <id-prefix>]
// =============================================================================
import { readFile, writeFile, access } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pdfLayout } from './lib/pdf.mjs'
import { segment, assignImages } from './lib/segment.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = join(root, '.import-cache')

const args = process.argv.slice(2)
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const sources = JSON.parse(await readFile(join(root, 'content', 'sources.json'), 'utf8'))
const papers = sources.papers.filter((p) => !only || p.id.startsWith(only))

const dropped = []
const shortfall = []
let pagesSeen = 0

for (const source of papers) {
  const stored = JSON.parse(
    await readFile(join(root, 'content', 'generated', 'papers', `${source.id}.json`), 'utf8'),
  )
  const cacheDir = join(CACHE, source.id)
  const pdfPath = source.pdf ?? join(cacheDir, 'converted.pdf')
  if (!(await exists(pdfPath))) continue

  const pages = await pdfLayout(pdfPath, cacheDir, 'vc-layout')
  const { questions } = segment(pages)
  assignImages(pages, questions)
  pagesSeen += pages.length

  // Every picture any band claimed, so page pictures that reached nothing show up.
  const claimed = new Set()
  for (const question of questions) {
    for (const band of question.bands) {
      for (const group of band.imageGroups ?? []) {
        for (const image of group.images) claimed.add(image)
      }
    }
  }

  pages.forEach((page, pageIndex) => {
    for (const image of page.images) {
      if (claimed.has(image)) continue
      // Above question 1 is the organiser's masthead, which the pipeline drops on
      // purpose — and rule 9 forbids shipping it anyway. Judge it by the picture's
      // CENTRE, the same measure assignImages uses: the logo's box carries deep
      // transparent margins that reach past the "1.", so its edges say otherwise.
      const first = questions[0]
      const centre = image.top + image.height / 2
      if (pageIndex === first?.start.page && centre < first.start.top) continue
      dropped.push({
        id: source.id,
        page: pageIndex + 1,
        top: Math.round(image.top),
        height: Math.round(image.height),
      })
    }
  })

  // A question that stored fewer pictures than its bands were given lost them at
  // the crop step — a blank or degenerate region.
  for (const question of questions) {
    const record = stored.questions.find((q) => q.n === question.n)
    if (!record) continue

    let assigned = 0
    for (const band of question.bands) {
      for (const group of band.imageGroups ?? []) assigned += group.images.length
    }
    const kept =
      record.images.length + record.options.reduce((sum, o) => sum + o.images.length, 0)

    if (kept < assigned) {
      shortfall.push({
        id: source.id,
        n: question.n,
        assigned,
        kept,
        status: record.status,
      })
    }
  }
}

console.log(`Pages inspected: ${pagesSeen}`)
console.log(`Pictures on the page that reached no question: ${dropped.length}`)
for (const d of dropped.slice(0, 40)) {
  console.log(`  ${d.id} page ${d.page} @${d.top} (h${d.height})`)
}
if (dropped.length > 40) console.log(`  … and ${dropped.length - 40} more`)

console.log(`\nQuestions that lost a picture at the crop step: ${shortfall.length}`)
for (const s of shortfall) {
  console.log(`  ${s.id} Q${s.n}: ${s.assigned} assigned, ${s.kept} kept  [${s.status}]`)
}

await writeFile(
  join(CACHE, 'lost-pictures.json'),
  `${JSON.stringify(
    { questions: shortfall.filter((s) => s.status === 'ok').map((s) => `${s.id} Q${s.n}`) },
    null,
    2,
  )}\n`,
)
