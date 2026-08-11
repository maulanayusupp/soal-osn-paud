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

    if (stem) {
      const firstOption = optionBands[0]
      for (const group of stem.imageGroups ?? []) {
        for (const image of group.images) {
          checked += 1
          const centre = image.top + image.height / 2
          const from = question.start.top - LEAD
          const sameStartPage = group.pageIndex === question.start.page
          const sameOptionPage = firstOption && firstOption.marker.page === group.pageIndex
          const to = sameOptionPage ? firstOption.marker.top : Infinity
          const belowStart = !sameStartPage || centre >= from
          if (!belowStart || centre >= to) {
            suspects.push({
              id: source.id,
              n: question.n,
              key: 'stem',
              why: `centre ${Math.round(centre)} outside [${Math.round(from)}, ${Number.isFinite(to) ? Math.round(to) : '∞'})`,
            })
          }
        }
      }
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
  `${JSON.stringify({ unreached: [...byQuestion.keys()] }, null, 2)}\n`,
)
