// =============================================================================
// PDF geometry + rasterisation (poppler).
//
// Two views of the same page are needed:
//   * `pdfLayout()` — where every text run and every embedded image sits, from
//     `pdftohtml -xml`. Coordinates are in "xml units" = PDF points x ZOOM.
//   * `renderPages()` — a raster of the page from `pdftoppm`, used to cut the
//     illustrations out and to detect the magenta answer-key highlight.
//
// Both are locked to the same scale factor so a box measured in one can be read
// in the other: RASTER_DPI / 72 = ZOOM * RASTER_PER_XML.
// =============================================================================
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, readdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'

const run = promisify(execFile)

/** `pdftohtml -zoom` value. Its default is 1.5; we pin it so nothing drifts. */
export const ZOOM = 1.5

/** Raster resolution. 216dpi = 3x PDF points = 2x the xml grid. */
export const RASTER_DPI = 216

/** Multiply an xml coordinate by this to land on a raster pixel. */
export const RASTER_PER_XML = RASTER_DPI / 72 / ZOOM

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

function decode(value) {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&(\w+);/g, (_, name) => ENTITIES[name] ?? `&${name};`)
}

function attrs(tag) {
  const out = {}
  for (const match of tag.matchAll(/(\w+)="([^"]*)"/g)) out[match[1]] = match[2]
  return out
}

function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/**
 * Parse a PDF into per-page text and image boxes.
 * `workDir` receives pdftohtml's side-effect image dump, which we delete again —
 * poppler has no switch that keeps `<image>` nodes while suppressing the files.
 */
export async function pdfLayout(pdfPath, workDir, baseName) {
  const outBase = join(workDir, baseName)
  await run('pdftohtml', ['-xml', '-zoom', String(ZOOM), pdfPath, outBase], {
    maxBuffer: 64 * 1024 * 1024,
  })
  const xml = await readFile(`${outBase}.xml`, 'utf8')

  const pages = []
  const pageChunks = xml.split(/<page\s/).slice(1)

  for (const chunk of pageChunks) {
    const head = chunk.slice(0, chunk.indexOf('>'))
    const pageAttrs = attrs(head)
    const page = {
      number: num(pageAttrs.number),
      width: num(pageAttrs.width),
      height: num(pageAttrs.height),
      texts: [],
      images: [],
    }

    for (const match of chunk.matchAll(/<text\s([^>]*)>([\s\S]*?)<\/text>/g)) {
      const a = attrs(match[1])
      const text = decode(match[2]).replace(/\s+/g, ' ').trim()
      if (!text) continue
      page.texts.push({
        top: num(a.top),
        left: num(a.left),
        width: num(a.width),
        height: num(a.height),
        text,
      })
    }

    for (const match of chunk.matchAll(/<image\s([^>]*?)\/?>/g)) {
      const a = attrs(match[1])
      page.images.push({
        top: num(a.top),
        left: num(a.left),
        width: num(a.width),
        height: num(a.height),
      })
    }

    page.texts.sort((x, y) => x.top - y.top || x.left - y.left)
    pages.push(page)
  }

  // Clean up the sidecar files poppler dropped next to `outBase`.
  const junk = (await readdir(workDir)).filter(
    (name) => name.startsWith(`${baseName}-`) || name === `${baseName}.xml`,
  )
  await Promise.all(junk.map((name) => unlink(join(workDir, name)).catch(() => {})))

  return pages
}

/** Rasterise every page to PNG. Returns the file paths in page order. */
export async function renderPages(pdfPath, workDir, baseName) {
  const prefix = join(workDir, `${baseName}-page`)
  await run('pdftoppm', ['-r', String(RASTER_DPI), '-png', pdfPath, prefix], {
    maxBuffer: 64 * 1024 * 1024,
  })
  const produced = (await readdir(workDir))
    .filter((name) => name.startsWith(`${baseName}-page-`) && name.endsWith('.png'))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
  return produced.map((name) => join(workDir, name))
}
