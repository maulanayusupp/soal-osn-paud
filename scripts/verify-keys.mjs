// =============================================================================
// A second, independent opinion on every answer key — including the picture
// ones the .docx text check cannot reach.
//
// The importer reads a narrow strip beside each option marker and asks "is
// there highlight here?". That is precise but blind to context: if a swatch
// drifts, or an option's marker is mispositioned, the strip can sit over the
// wrong line and report the neighbour.
//
// This asks the opposite question. It finds the highlight *blobs* on the page
// and reports which option marker each one sits on. Same pixels, different
// reasoning — so where the two disagree, one of them is wrong and a human
// should look.
//
// Two things it must get right, both learned the hard way:
//   * anchor on the blob's TOP edge, not its centre. Word draws the swatch over
//     the whole line box, so its centre sits half a line low — which is half the
//     line spacing, making "nearest marker" a coin flip. 40 phantom
//     disagreements came from that alone;
//   * side-by-side options share one top, so y cannot separate them. They are
//     told apart by x, using the picture-derived `markerHint`.
//
// Writes .import-cache/unreached.json — the served questions it could not reach,
// for `review-sheet.mjs --unreached`.
//
// Run: node scripts/verify-keys.mjs [--only <id-prefix>]
// =============================================================================
import { readFile, readdir, access, writeFile } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pdfLayout, renderPages, RASTER_PER_XML } from './lib/pdf.mjs'
import { segment, assignImages } from './lib/segment.mjs'
import { loadPage } from './lib/raster.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = join(root, '.import-cache')

const args = process.argv.slice(2)
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null

const toRaster = (value) => value * RASTER_PER_XML

function isHighlight(r, g, b) {
  const magenta = r > 170 && b > 170 && g < 130 && r - g > 70 && b - g > 70
  const yellow = r > 190 && g > 170 && b < 120 && r - b > 90 && g - b > 80
  return magenta || yellow
}

/**
 * Highlight blobs on one page, as `{ top, bottom, left, right, pixels }` in xml
 * units. Rows of highlight pixels are merged when they touch vertically, which
 * is enough: a Word swatch is a solid rectangle, never a speckle.
 */
function findBlobs(raster, protect) {
  const { data, width, height, channels } = raster
  const rows = []

  for (let y = 0; y < height; y += 1) {
    let count = 0
    let minX = Infinity
    let maxX = -Infinity
    let index = y * width * channels
    for (let x = 0; x < width; x += 1) {
      if (isHighlight(data[index], data[index + 1], data[index + 2])) {
        // Ignore anything drawn inside an illustration — a yellow bag is not a key.
        let inside = false
        for (const box of protect) {
          if (x >= box.left && x < box.left + box.width && y >= box.top && y < box.top + box.height) {
            inside = true
            break
          }
        }
        if (!inside) {
          count += 1
          if (x < minX) minX = x
          if (x > maxX) maxX = x
        }
      }
      index += channels
    }
    rows.push(count > 2 ? { count, minX, maxX } : null)
  }

  const blobs = []
  let current = null
  for (let y = 0; y < rows.length; y += 1) {
    const row = rows[y]
    if (!row) {
      if (current && y - current.lastY > 3) {
        blobs.push(current)
        current = null
      }
      continue
    }
    if (!current) current = { top: y, lastY: y, pixels: 0, minX: row.minX, maxX: row.maxX }
    current.lastY = y
    current.pixels += row.count
    current.minX = Math.min(current.minX, row.minX)
    current.maxX = Math.max(current.maxX, row.maxX)
  }
  if (current) blobs.push(current)

  return blobs
    .filter((blob) => blob.pixels >= 120)
    .map((blob) => ({
      // Anchor on the swatch's TOP edge, not its centre. Word draws the swatch
      // over the whole line box, so its centre sits about half a line below the
      // marker's top — which is half the line spacing, making "nearest marker to
      // the centre" a coin flip between the right option and the next one. That
      // alone produced 40 false disagreements.
      topY: blob.top / RASTER_PER_XML,
      left: blob.minX / RASTER_PER_XML,
      pixels: blob.pixels,
    }))
}

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

const disagreements = []
const confirmed = new Set()
const allServed = []
let checked = 0

for (const source of papers) {
  const stored = JSON.parse(
    await readFile(join(root, 'content', 'generated', 'papers', `${source.id}.json`), 'utf8'),
  )
  for (const q of stored.questions) {
    if (q.status === 'ok') allServed.push(`${source.id} Q${q.n}`)
  }
  const cacheDir = join(CACHE, source.id)

  // Use whichever rendering the key was actually read from.
  const fromDocx = join(cacheDir, 'from-docx.pdf')
  const converted = join(cacheDir, 'converted.pdf')
  const pdfPath =
    stored.answerSource === 'docx' && (await exists(fromDocx))
      ? fromDocx
      : source.pdf ?? converted
  if (!(await exists(pdfPath))) continue

  const prefix = pdfPath === fromDocx ? 'vk-docx' : 'vk'
  const pages = await pdfLayout(pdfPath, cacheDir, `${prefix}-layout`)
  const { questions } = segment(pages)
  assignImages(pages, questions)

  const cached = (await readdir(cacheDir)).filter((n) => n.startsWith(`${prefix}-raster-page-`))
  const rasterPaths = cached.length
    ? cached.sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).map((n) => join(cacheDir, n))
    : await renderPages(pdfPath, cacheDir, `${prefix}-raster`)

  // Every option marker in the document, so a blob can be matched to one.
  const markers = []
  for (const question of questions) {
    for (const band of question.bands) {
      if (band.role !== 'option') continue
      markers.push({
        n: question.n,
        key: band.key,
        page: band.marker.page,
        top: band.marker.top,
        // Where the letter really is. For a side-by-side option the marker's own
        // `left` is only a character-offset guess; `markerHint` is measured from
        // that option's pictures.
        x: band.markerHint ?? band.marker.left,
      })
    }
  }

  for (const [pageIndex, path] of rasterPaths.entries()) {
    const raster = await loadPage(path)
    const page = pages[pageIndex]
    if (!page) continue
    const protect = page.images.map((image) => ({
      left: toRaster(image.left - 2),
      top: toRaster(image.top - 2),
      width: toRaster(image.width + 4),
      height: toRaster(image.height + 4),
    }))

    for (const blob of findBlobs(raster, protect)) {
      const onPage = markers.filter((m) => m.page === pageIndex)
      if (!onPage.length) continue
      // The swatch sits ON the option's line, so its centre is nearest that
      // marker's top.
      // A swatch starts within a few units of its marker's top.
      const sameLine = onPage.filter((m) => Math.abs(m.top - blob.topY) <= 12)
      if (!sameLine.length) continue

      // Side-by-side options all share one top, so y cannot tell them apart —
      // taking the first match there reported "a" for every such question. The
      // swatch sits just left of its own option, so x decides.
      const nearest = sameLine.reduce((best, m) =>
        Math.abs(m.x - blob.left) < Math.abs(best.x - blob.left) ? m : best,
      )
      if (sameLine.length > 1 && Math.abs(nearest.x - blob.left) > 60) continue

      const question = stored.questions.find((q) => q.n === nearest.n)
      if (!question || question.status !== 'ok') continue
      checked += 1
      confirmed.add(`${source.id} Q${nearest.n}`)
      if (question.answer !== nearest.key) {
        disagreements.push({
          id: source.id,
          n: nearest.n,
          stored: question.answer,
          blob: nearest.key,
          pixels: blob.pixels,
        })
      }
    }
  }
}

console.log(`Blobs matched to an option: ${checked}`)
console.log(`Disagreements with the stored key: ${disagreements.length}\n`)
for (const d of disagreements) {
  console.log(`  ${d.id} Q${d.n}: stored "${d.stored}", blob says "${d.blob}" (${d.pixels}px)`)
}

const unreached = allServed.filter((k) => !confirmed.has(k))
console.log(`\nServed questions this check could NOT reach: ${unreached.length}`)
for (const k of unreached) console.log(`  ${k}`)

// Written out so review-sheet.mjs can lay exactly these in front of a human.
await writeFile(
  join(CACHE, 'unreached.json'),
  `${JSON.stringify({ unreached, disagreements }, null, 2)}\n`,
)
