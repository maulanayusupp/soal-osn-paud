// =============================================================================
// Render a visual proof sheet for an imported paper.
//
// The importer's own warnings only catch what it knows to look for. A proof
// sheet puts the *result* side by side — stem, options, and the answer the
// pipeline read off the page — so a human can check a whole paper in one look
// instead of paging through the original PDF.
//
// Run: pnpm soal:proof <paper-id> [--per 10]
// Output: .import-cache/proof/<paper-id>-<sheet>.png
// =============================================================================
import { readFile, mkdir, readdir, unlink } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, '.import-cache', 'proof')

const SHEET_WIDTH = 1180
const GUTTER = 14
const LABEL_WIDTH = 108
const STEM_HEIGHT = 118
const OPTION_HEIGHT = 96
const ROW_PADDING = 12

const [paperId, ...rest] = process.argv.slice(2)
if (!paperId) {
  console.error('usage: pnpm soal:proof <paper-id> [--per N]')
  process.exit(1)
}
const perSheet = rest.includes('--per') ? Number(rest[rest.indexOf('--per') + 1]) : 10

const paper = JSON.parse(
  await readFile(join(root, 'content', 'generated', 'papers', `${paperId}.json`), 'utf8'),
)

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** A text tile rendered as SVG so it can be composited like an image. */
async function textTile(text, { width, height, size = 22, weight = 600, colour = '#16232c' }) {
  const words = String(text).split(/\s+/)
  const perLine = Math.max(1, Math.floor(width / (size * 0.56)))
  const lines = []
  let line = []
  for (const word of words) {
    if (line.join(' ').length + word.length + 1 > perLine && line.length) {
      lines.push(line.join(' '))
      line = []
    }
    line.push(word)
  }
  if (line.length) lines.push(line.join(' '))
  const visible = lines.slice(0, Math.max(1, Math.floor(height / (size * 1.3))))

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    ${visible
      .map(
        (l, i) =>
          `<text x="0" y="${size + i * size * 1.3}" font-family="Helvetica, Arial" font-size="${size}" font-weight="${weight}" fill="${colour}">${escapeXml(l)}</text>`,
      )
      .join('')}
  </svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

/** Load one of the imported illustrations, scaled to fit a box. */
async function assetTile(src, maxHeight) {
  const path = join(root, 'public', src.replace(/^\//, ''))
  return sharp(path)
    .resize({ height: maxHeight, withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer()
}

async function sizeOf(buffer) {
  const meta = await sharp(buffer).metadata()
  return { width: meta.width, height: meta.height }
}

/** Build the composite layers for one question; returns { layers, height }. */
async function questionBlock(question, top) {
  const layers = []
  let cursorY = top + ROW_PADDING
  let rowHeight = 0

  const answerColour = question.answer ? '#0f7a4a' : '#c02626'
  const heading = await textTile(
    `${question.n}.  ✔ ${question.answer ? question.answer.toUpperCase() : '??'}`,
    { width: LABEL_WIDTH, height: 30, size: 21, weight: 700, colour: answerColour },
  )
  layers.push({ input: heading, left: GUTTER, top: cursorY })

  let cursorX = GUTTER + LABEL_WIDTH

  if (question.prompt) {
    const tile = await textTile(question.prompt, {
      width: SHEET_WIDTH - cursorX - GUTTER,
      height: 60,
      size: 20,
      weight: 500,
    })
    const size = await sizeOf(tile)
    layers.push({ input: tile, left: cursorX, top: cursorY })
    rowHeight = Math.max(rowHeight, size.height)
  }
  cursorY += question.prompt ? 62 : 0

  for (const src of question.images) {
    const tile = await assetTile(src, STEM_HEIGHT)
    const size = await sizeOf(tile)
    layers.push({ input: tile, left: GUTTER + LABEL_WIDTH, top: cursorY })
    cursorY += size.height + 6
  }

  // Options laid out on one row so a wrong pairing is obvious at a glance.
  let optionX = GUTTER + LABEL_WIDTH
  let optionRowHeight = 0
  for (const option of question.options) {
    const isAnswer = option.key === question.answer
    const label = await textTile(`${option.key})`, {
      width: 34,
      height: 26,
      size: 19,
      weight: 700,
      colour: isAnswer ? '#0f7a4a' : '#7a8894',
    })
    layers.push({ input: label, left: optionX, top: cursorY + 4 })
    optionX += 36

    if (option.images.length) {
      for (const src of option.images) {
        const tile = await assetTile(src, OPTION_HEIGHT)
        const size = await sizeOf(tile)
        layers.push({ input: tile, left: optionX, top: cursorY })
        optionX += size.width + 10
        optionRowHeight = Math.max(optionRowHeight, size.height)
      }
    }
    if (option.text) {
      const tile = await textTile(option.text, {
        width: Math.min(260, SHEET_WIDTH - optionX - GUTTER),
        height: 52,
        size: 19,
        weight: 500,
      })
      const size = await sizeOf(tile)
      layers.push({ input: tile, left: optionX, top: cursorY + 2 })
      optionX += size.width + 12
      optionRowHeight = Math.max(optionRowHeight, 26)
    }
    if (!option.images.length && !option.text) {
      const tile = await textTile('(EMPTY)', {
        width: 110,
        height: 26,
        size: 18,
        weight: 700,
        colour: '#c02626',
      })
      layers.push({ input: tile, left: optionX, top: cursorY + 2 })
      optionX += 118
      optionRowHeight = Math.max(optionRowHeight, 26)
    }
    optionX += 18
  }

  cursorY += optionRowHeight + ROW_PADDING
  return { layers, bottom: cursorY, rowHeight }
}

await mkdir(OUT, { recursive: true })
for (const stale of (await readdir(OUT)).filter((n) => n.startsWith(`${paperId}-`))) {
  await unlink(join(OUT, stale)).catch(() => {})
}

const sheets = []
for (let i = 0; i < paper.questions.length; i += perSheet) {
  sheets.push(paper.questions.slice(i, i + perSheet))
}

let index = 0
for (const sheet of sheets) {
  index += 1
  const layers = []
  let cursor = 8

  const header = await textTile(
    `${paper.id}  ·  ${paper.printed.title ?? ''}  ·  ${paper.printed.level ?? ''}  ·  ${paper.printed.date ?? ''}  ·  sheet ${index}/${sheets.length}`,
    { width: SHEET_WIDTH - GUTTER * 2, height: 28, size: 18, weight: 700, colour: '#243746' },
  )
  layers.push({ input: header, left: GUTTER, top: cursor })
  cursor += 34

  for (const question of sheet) {
    const block = await questionBlock(question, cursor)
    layers.push(...block.layers)
    layers.push({
      input: {
        create: { width: SHEET_WIDTH - GUTTER * 2, height: 1, channels: 3, background: '#d9e0e6' },
      },
      left: GUTTER,
      top: Math.round(block.bottom),
    })
    cursor = block.bottom + 8
  }

  const height = Math.ceil(cursor + 16)
  const file = join(OUT, `${paperId}-${index}.png`)
  await sharp({
    create: { width: SHEET_WIDTH, height, channels: 3, background: '#ffffff' },
  })
    .composite(layers.map((l) => ({ ...l, top: Math.round(l.top), left: Math.round(l.left) })))
    .png({ compressionLevel: 9 })
    .toFile(file)
  console.log(file)
}
