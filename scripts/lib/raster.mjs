// =============================================================================
// Pixel-level work on a rendered page: reading the answer-key highlight and
// cutting the illustrations out.
//
// Every page is decoded exactly once into a raw RGB buffer; the answer key is
// read from it, the highlight is then erased, and the crops are taken from the
// cleaned buffer. That order matters — otherwise the key would be visible in the
// pictures the child is supposed to answer.
// =============================================================================
import sharp from 'sharp'

// Most papers mark the answer with Word's magenta highlight (#FF00FF); a few
// questions use yellow (#FFFF00) instead. Both are matched loosely enough to
// survive the JPEG artefacts in the source scans.
const HUES = {
  magenta: (r, g, b) => r > 170 && b > 170 && g < 130 && r - g > 70 && b - g > 70,
  yellow: (r, g, b) => r > 190 && g > 170 && b < 120 && r - b > 90 && g - b > 80,
}

/** True when the pixel matches the named highlight colour. */
function isHue(r, g, b, hue) {
  return HUES[hue](r, g, b)
}

/** Decode a page PNG into `{ data, width, height, channels: 3 }`. */
export async function loadPage(path) {
  const { data, info } = await sharp(path)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height, channels: info.channels }
}

/** Clamp a box to the page and round it to whole pixels. */
export function clampBox(page, box) {
  const left = Math.max(0, Math.min(page.width - 1, Math.round(box.left)))
  const top = Math.max(0, Math.min(page.height - 1, Math.round(box.top)))
  const width = Math.max(1, Math.min(page.width - left, Math.round(box.width)))
  const height = Math.max(1, Math.min(page.height - top, Math.round(box.height)))
  return { left, top, width, height }
}

/** True when the point falls inside one of the protected rectangles. */
function isProtected(x, y, boxes) {
  for (const box of boxes) {
    if (x >= box.left && x < box.left + box.width && y >= box.top && y < box.top + box.height) {
      return true
    }
  }
  return false
}

/**
 * How many highlight pixels of `hue` sit inside `box`.
 *
 * `protect` lists the illustrations on the page. A yellow schoolbag is not an
 * answer key, so anything drawn inside a picture is ignored — which is what
 * makes yellow safe to look for at all.
 */
export function countHue(page, box, hue, protect = []) {
  const { left, top, width, height } = clampBox(page, box)
  const { data, channels } = page
  let hits = 0
  for (let y = top; y < top + height; y += 1) {
    let index = (y * page.width + left) * channels
    for (let x = left; x < left + width; x += 1) {
      if (
        isHue(data[index], data[index + 1], data[index + 2], hue) &&
        !isProtected(x, y, protect)
      ) {
        hits += 1
      }
      index += channels
    }
  }
  return hits
}

/**
 * Paint every highlight pixel white, in place, so the answer key can never leak
 * into the pictures the child is shown. Magenta goes everywhere (nothing in the
 * artwork is that colour); yellow is spared inside `protect`, where it is far
 * more likely to be a drawing than a swatch.
 */
export function eraseHues(page, protect = []) {
  const { data, channels, width } = page
  for (let y = 0; y < page.height; y += 1) {
    let index = y * width * channels
    for (let x = 0; x < width; x += 1) {
      const r = data[index]
      const g = data[index + 1]
      const b = data[index + 2]
      if (isHue(r, g, b, 'magenta') || (isHue(r, g, b, 'yellow') && !isProtected(x, y, protect))) {
        data[index] = 255
        data[index + 1] = 255
        data[index + 2] = 255
      }
      index += channels
    }
  }
}

/** Paint a rectangle white, in place — used to remove the printed "a." markers. */
export function eraseBox(page, box) {
  const { left, top, width, height } = clampBox(page, box)
  const { data, channels } = page
  for (let y = top; y < top + height; y += 1) {
    let index = (y * page.width + left) * channels
    for (let x = 0; x < width; x += 1) {
      data[index] = 255
      data[index + 1] = 255
      data[index + 2] = 255
      index += channels
    }
  }
}

/** True when the box holds no ink worth cropping. */
export function isBlank(page, box, threshold = 246) {
  const { left, top, width, height } = clampBox(page, box)
  const { data, channels } = page
  for (let y = top; y < top + height; y += 1) {
    let index = (y * page.width + left) * channels
    for (let x = 0; x < width; x += 1) {
      if (
        data[index] < threshold ||
        data[index + 1] < threshold ||
        data[index + 2] < threshold
      ) {
        return false
      }
      index += channels
    }
  }
  return true
}

const MAX_WIDTH = 720

/**
 * Write `box` out as a trimmed WebP. Resolves to `{ width, height }`, or null
 * when the region turned out to be empty.
 */
export async function writeCrop(page, box, destination) {
  const region = clampBox(page, box)
  if (isBlank(page, region)) return null

  // Two passes on purpose: sharp applies trim() BEFORE extract() inside a single
  // pipeline, which would trim the whole page and leave the crop coordinates
  // pointing at the wrong pixels. Materialise the cut first, then trim it.
  const cut = await sharp(page.data, {
    raw: { width: page.width, height: page.height, channels: page.channels },
  })
    .extract(region)
    .png()
    .toBuffer()

  let trimmed
  try {
    trimmed = await sharp(cut)
      .trim({ background: '#ffffff', threshold: 12 })
      .png()
      .toBuffer({ resolveWithObject: true })
  } catch {
    // sharp refuses to trim an image it considers uniform.
    return null
  }
  if (trimmed.info.width < 8 || trimmed.info.height < 8) return null

  const output = await sharp(trimmed.data)
    .resize({
      width: Math.min(MAX_WIDTH, trimmed.info.width),
      withoutEnlargement: true,
    })
    .flatten({ background: '#ffffff' })
    .webp({ quality: 82, effort: 5 })
    .toFile(destination)

  return { width: output.width, height: output.height }
}
