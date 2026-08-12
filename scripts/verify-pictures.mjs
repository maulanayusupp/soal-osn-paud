// =============================================================================
// Does the picture under option "b" actually belong to option b?
//
// Both existing key checks share one assumption: that the option assignment is
// right. They ask "which option is highlighted" — neither asks whether the
// artwork stored under that letter is the artwork printed beside it. If a
// picture lands under the wrong letter, both checks agree and both are wrong,
// and the app shows the right letter against the wrong picture. From a parent's
// seat that is indistinguishable from a wrong answer key.
//
// So this ignores the clever placement rules entirely and applies the naive one:
// a picture beside option b is printed after b's marker and before c's. Anything
// the clever rules moved shows up here — which is the point. The output is a
// risk list to look at, not a defect list.
//
// Run: node scripts/verify-pictures.mjs [--only <id-prefix>]
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

/** Slack above a marker, for pictures Word centres on the marker's own line. */
const LEAD = 26

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

const suspects = []
let checked = 0

for (const source of papers) {
  const stored = JSON.parse(
    await readFile(join(root, 'content', 'generated', 'papers', `${source.id}.json`), 'utf8'),
  )
  const cacheDir = join(CACHE, source.id)
  const pdfPath = source.pdf ?? join(cacheDir, 'converted.pdf')
  if (!(await exists(pdfPath))) continue

  const pages = await pdfLayout(pdfPath, cacheDir, 'vp-layout')
  const { questions } = segment(pages)
  assignImages(pages, questions)

  for (const question of questions) {
    const record = stored.questions.find((q) => q.n === question.n)
    if (!record || record.status !== 'ok') continue

    const stem = question.bands.find((band) => band.role === 'stem')
    const optionBands = question.bands.filter((band) => band.role === 'option')

    // Stem pictures the importer moved between questions.
    //
    // There is no geometric test that settles these. Which question a picture
    // belongs to cannot be read off its box, because the boxes carry deep
    // transparent margins and routinely overlap each other — the crop for the
    // watering cans of one question contains, pixel for pixel, the road diagram
    // of the one before it. Ink bounds do not separate them either, for the same
    // reason. Asking whether the box's centre, or the bulk of the box, lands in
    // the right span flagged 85 and then 35 questions whose artwork was in fact
    // correctly placed — a check that cries wolf is how the real one gets
    // missed.
    //
    // So this reports what it can stand behind: the pictures the importer moved
    // out of the band they were printed in. Those are the ones whose placement
    // rests on a rule rather than on the plain reading of the page, which makes
    // them exactly the set worth a human's eyes.
    if (stem?.clipTop != null) {
      checked += (stem.imageGroups ?? []).reduce((sum, g) => sum + g.images.length, 0)
      suspects.push({
        id: source.id,
        n: question.n,
        key: 'stem',
        why: 'reclaimed from the question above — placement rests on a rule',
      })
    }

    for (const [index, band] of optionBands.entries()) {
      const groups = band.imageGroups ?? []
      if (!groups.length) continue

      const next = optionBands[index + 1]
      const row = band.siblings && band.siblings.length > 1 ? band.siblings : null

      for (const group of groups) {
        for (const image of group.images) {
          checked += 1
          const centre = image.top + image.height / 2

          if (row) {
            // Side by side: the picture must be in this option's x column,
            // judged from the row's own markers rather than the splitter.
            const position = row.indexOf(band)
            const leftBound = position === 0 ? -Infinity : row[position].markerHint ?? row[position].marker.left
            const rightBound = row[position + 1]
              ? row[position + 1].markerHint ?? row[position + 1].marker.left
              : Infinity
            const centreX = image.left + image.width / 2
            if (centreX < leftBound - 30 || centreX >= rightBound) {
              suspects.push({ id: source.id, n: question.n, key: band.key, why: 'x column' })
            }
            continue
          }

          // Stacked: after this marker (allowing the lead), before the next.
          // Page-aware — a band whose next marker is on the following page has
          // no upper bound on this one.
          const from = band.marker.top - LEAD
          const sameNextPage = next && next.marker.page === group.pageIndex
          const to = sameNextPage ? next.marker.top : Infinity
          const belowStart = group.pageIndex > band.marker.page || centre >= from
          if (!belowStart || centre >= to) {
            suspects.push({
              id: source.id,
              n: question.n,
              key: band.key,
              why: `centre ${Math.round(centre)} outside [${Math.round(from)}, ${Number.isFinite(to) ? Math.round(to) : '∞'})`,
            })
          }
        }
      }
    }
  }
}

const byQuestion = new Map()
for (const s of suspects) byQuestion.set(`${s.id} Q${s.n}`, s)

console.log(`Option pictures checked: ${checked}`)
console.log(`Placed somewhere the naive rule would not: ${byQuestion.size} question(s)\n`)
for (const [key, s] of byQuestion) console.log(`  ${key} option ${s.key} — ${s.why}`)

await writeFile(
  join(CACHE, 'picture-suspects.json'),
  `${JSON.stringify({ questions: [...byQuestion.keys()] }, null, 2)}\n`,
)
