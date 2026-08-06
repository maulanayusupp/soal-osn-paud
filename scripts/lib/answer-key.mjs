// =============================================================================
// Reading the answer key off a printed page.
//
// The paper authors mark the correct option with a Word text highlight —
// magenta almost everywhere, yellow on a handful of questions. That swatch
// survives into the PDF, so the key can be read from pixels instead of guessed.
//
// Two wrinkles the naive version gets wrong, both handled here:
//   * Word draws the swatch a few units ABOVE the text box, and text options sit
//     only ~22 units apart — so each option's window is fenced against the lines
//     either side of it, or it reads its neighbour's highlight.
//   * Side-by-side options share one line, so they are fenced by x instead.
// =============================================================================
import { countHue } from './raster.mjs'

/** Minimum highlight pixels before a band counts as marked. */
export const HIGHLIGHT_FLOOR = 80

/**
 * Annotate every option band with `{ magenta, yellow }` pixel counts.
 * `toRaster` converts an xml coordinate to a raster pixel.
 */
export function scoreOptionBands({ questions, marks, rasters, protectedBoxes, toRaster }) {
  const leftEdge = Math.min(...marks.map((m) => m.left)) - 8
  const markIndex = new Map(marks.map((mark, i) => [mark, i]))

  for (const question of questions) {
    for (const band of question.bands) {
      if (band.role !== 'option') continue
      const marker = band.marker
      const raster = rasters[marker.page]
      if (!raster) {
        band.highlight = { magenta: 0, yellow: 0 }
        continue
      }

      const index = markIndex.get(marker)
      const above = marks
        .slice(0, index)
        .reverse()
        .find((m) => m.page === marker.page && marker.top - m.top > 6)
      const below = marks
        .slice(index + 1)
        .find((m) => m.page === marker.page && m.top - marker.top > 6)

      let top = marker.top - 9
      if (above) top = Math.max(top, above.top + above.height - 1)
      let bottom = marker.top + marker.height + 4
      if (below) bottom = Math.min(bottom, below.top - 2)

      // Horizontally the window is a narrow strip at the option marker, not the
      // whole line. Word starts the swatch at the marker, while the artwork
      // begins ~25 units further right — so a strip this wide always sees the
      // key and never sees the picture, whatever colours the picture uses.
      //
      // For a side-by-side option, `marker.left` is only a character-offset
      // guess; `markerHint` — measured from that option's own pictures — says
      // where the letter really is, so the strip is placed just left of them.
      const anchor = band.markerHint ?? marker.left
      const stripLeft = band.markerHint
        ? Math.max(leftEdge, anchor - 44)
        : Math.max(leftEdge, band.xFrom, marker.left - 6)
      const stripRight = band.markerHint
        ? anchor - 2
        : Math.min(band.xTo, marker.left + Math.min(marker.width + 10, 30))
      const left = toRaster(stripLeft)
      const right = Math.min(raster.width, toRaster(stripRight))

      const window = {
        left,
        top: toRaster(top),
        width: Math.max(2, right - left),
        height: toRaster(Math.max(2, bottom - top)),
      }
      // Yellow is guarded against the artwork (a yellow schoolbag is not a key);
      // magenta is not. A floating picture's bounding box routinely overhangs
      // the option lines beside it — Season 4 Matematika PAUD Q2 sits inside the
      // box of question 3's train — and no illustration in this corpus contains
      // pure magenta, so guarding it only ever hid real keys.
      band.highlight = {
        magenta: countHue(raster, window, 'magenta'),
        yellow: countHue(raster, window, 'yellow', protectedBoxes[marker.page]),
      }
    }
  }
}

/**
 * Decide which option a question marks.
 * Returns `{ answer, hue, reason }`; `answer` is null when nothing is certain.
 */
export function pickAnswer(optionBands) {
  // Magenta is the usual key colour; yellow only counts when this question
  // carries no magenta at all.
  const magentaTotal = optionBands.reduce((sum, band) => sum + band.highlight.magenta, 0)
  const hue = magentaTotal >= HIGHLIGHT_FLOOR ? 'magenta' : 'yellow'
  const score = (band) => band.highlight[hue]

  const best = optionBands.reduce(
    (top, band) => (score(band) > (top ? score(top) : -1) ? band : top),
    null,
  )
  if (!best || score(best) < HIGHLIGHT_FLOOR) {
    return { answer: null, hue, reason: 'no answer highlight found' }
  }

  const runnerUp = optionBands
    .filter((band) => band !== best)
    .reduce((top, band) => Math.max(top, score(band)), 0)

  if (runnerUp > score(best) * 0.35) {
    return {
      answer: null,
      hue,
      reason: `ambiguous ${hue} highlight (${best.key}=${score(best)}, next=${runnerUp})`,
    }
  }
  return { answer: best.key, hue, reason: null }
}
