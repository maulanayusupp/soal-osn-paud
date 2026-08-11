// =============================================================================
// Render review sheets for the questions whose answer key nobody has checked.
//
// 873 keys agree with the .docx text and can be trusted. The rest — mostly
// questions whose options are pictures, so there is no text to match — rest on
// the pixel reader alone. Those are the ones a human has to look at, and this
// lays them out so that a wrong key is obvious: the marked option is boxed in
// green, everything else is plain.
//
// Run: node scripts/review-sheet.mjs [--per 6] [--only <id-prefix>]
// Output: .import-cache/review/<nnn>.png
// =============================================================================
import { readFile, readdir, mkdir, unlink } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { paragraphsOf, markedIndexFor } from './lib/docx-key.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, '.import-cache', 'review')

const args = process.argv.slice(2)
const perSheet = args.includes('--per') ? Number(args[args.indexOf('--per') + 1]) : 6
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null

const WIDTH = 1240
const PAD = 14
const STEM_H = 120
const OPT_H = 104

function esc(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function text(value, { width, size = 19, weight = 500, colour = '#16232c', height }) {
  const perLine = Math.max(1, Math.floor(width / (size * 0.55)))
  const words = String(value).split(/\s+/)
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
  const h = height ?? Math.max(size + 6, lines.length * size * 1.3 + 4)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}">${lines
    .map(
      (l, i) =>
        `<text x="0" y="${size + i * size * 1.3}" font-family="Helvetica,Arial" font-size="${size}" font-weight="${weight}" fill="${colour}">${esc(l)}</text>`,
    )
    .join('')}</svg>`
  return { buf: await sharp(Buffer.from(svg)).png().toBuffer(), h }
}

async function art(src, maxH) {
  return sharp(join(root, 'public', src.replace(/^\//, '')))
    .resize({ height: maxH, withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer()
}

async function sizeOf(buf) {
  const m = await sharp(buf).metadata()
  return { w: m.width, h: m.height }
}

/** One question block. Returns { layers, bottom }. */
async function block(item, top) {
  const { paper, q } = item
  const layers = []
  let y = top + 10

  const head = await text(`${paper.id}  Q${q.n}    ✔ ${String(q.answer).toUpperCase()}`, {
    width: WIDTH - PAD * 2,
    size: 20,
    weight: 700,
    colour: '#0f7a4a',
  })
  layers.push({ input: head.buf, left: PAD, top: y })
  y += head.h + 2

  if (q.prompt) {
    const p = await text(q.prompt, { width: WIDTH - PAD * 2, size: 19, weight: 500 })
    layers.push({ input: p.buf, left: PAD, top: y })
    y += p.h + 4
  }

  for (const src of q.images) {
    const buf = await art(src, STEM_H)
    const s = await sizeOf(buf)
    layers.push({ input: buf, left: PAD + 8, top: y })
    y += s.h + 6
  }

  let x = PAD
  let rowH = 0
  for (const option of q.options) {
    const isKey = option.key === q.answer
    const label = await text(`${option.key})`, {
      width: 30,
      size: 20,
      weight: 800,
      colour: isKey ? '#0f7a4a' : '#8a97a3',
    })
    layers.push({ input: label.buf, left: x, top: y + 6 })
    x += 32

    let cellW = 0
    let cellH = 0
    for (const src of option.images) {
      const buf = await art(src, OPT_H)
      const s = await sizeOf(buf)
      layers.push({ input: buf, left: x, top: y })
      x += s.w + 8
      cellW += s.w + 8
      cellH = Math.max(cellH, s.h)
    }
    if (option.text) {
      const t = await text(option.text, { width: 200, size: 19, weight: 600 })
      layers.push({ input: t.buf, left: x, top: y + 6 })
      x += 208
      cellH = Math.max(cellH, 28)
    }
    // A green rule under the marked option, so the key reads at a glance.
    if (isKey && cellW > 0) {
      layers.push({
        input: { create: { width: Math.max(20, cellW), height: 4, channels: 3, background: '#0f7a4a' } },
        left: x - cellW,
        top: y + cellH + 3,
      })
    }
    rowH = Math.max(rowH, cellH + 10)
    x += 22
  }

  y += rowH + 12
  return { layers, bottom: y }
}

// ---------------------------------------------------------------------------

const sources = JSON.parse(await readFile(join(root, 'content', 'sources.json'), 'utf8'))
const dir = join(root, 'content', 'generated', 'papers')
const items = []

for (const source of sources.papers) {
  if (only && !source.id.startsWith(only)) continue
  const paper = JSON.parse(await readFile(join(dir, `${source.id}.json`), 'utf8'))
  const served = paper.questions.filter((q) => q.status === 'ok')
  if (!served.length) continue

  const paragraphs = await paragraphsOf(source.docx)
  for (const q of served) {
    // Anything the .docx could confirm is already trustworthy; only the rest
    // needs eyes on it.
    const index = markedIndexFor(paragraphs, q.options.map((o) => o.text))
    if (index !== null && q.options[index].key === q.answer) continue
    items.push({ paper, q })
  }
}

console.log(`${items.length} questions need a human check`)

await mkdir(OUT, { recursive: true })
for (const stale of await readdir(OUT)) await unlink(join(OUT, stale)).catch(() => {})

let sheet = 0
for (let i = 0; i < items.length; i += perSheet) {
  sheet += 1
  const group = items.slice(i, i + perSheet)
  const layers = []
  let cursor = 6

  const head = await text(`REVIEW SHEET ${sheet} — questions ${i + 1}–${i + group.length} of ${items.length}`, {
    width: WIDTH - PAD * 2,
    size: 17,
    weight: 700,
    colour: '#243746',
  })
  layers.push({ input: head.buf, left: PAD, top: cursor })
  cursor += head.h + 6

  for (const item of group) {
    const b = await block(item, cursor)
    layers.push(...b.layers)
    layers.push({
      input: { create: { width: WIDTH - PAD * 2, height: 1, channels: 3, background: '#cfd8de' } },
      left: PAD,
      top: Math.round(b.bottom),
    })
    cursor = b.bottom + 8
  }

  const file = join(OUT, `${String(sheet).padStart(3, '0')}.png`)
  await sharp({
    create: { width: WIDTH, height: Math.ceil(cursor + 12), channels: 3, background: '#ffffff' },
  })
    .composite(layers.map((l) => ({ ...l, left: Math.round(l.left), top: Math.round(l.top) })))
    .png({ compressionLevel: 9 })
    .toFile(file)
}

console.log(`${sheet} sheets in .import-cache/review/`)
