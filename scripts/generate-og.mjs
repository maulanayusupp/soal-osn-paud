// =============================================================================
// Build public/og-image.png (1200x630).
//
// Crawlers do not render SVG, so the OG image has to be a raster. It is drawn
// once here rather than rendered per request — the site has no dynamic titles
// worth the extra machinery.
//
// Run: pnpm og
// =============================================================================
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public', 'og-image.png')

const WIDTH = 1200
const HEIGHT = 630

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="sun" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f6a821"/>
      <stop offset="100%" stop-color="#ffd166"/>
    </linearGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="#fff8ec"/>
  <circle cx="990" cy="300" r="230" fill="url(#sun)" opacity="0.38"/>

  <!-- Kancil -->
  <g transform="translate(840 150) scale(1.5)">
    <ellipse cx="100" cy="180" rx="46" ry="8" fill="#3a2a17" opacity="0.14"/>
    <ellipse cx="100" cy="128" rx="44" ry="34" fill="#d99a58"/>
    <ellipse cx="100" cy="137" rx="26" ry="20" fill="#f7dcae"/>
    <ellipse cx="66" cy="52" rx="13" ry="20" fill="#d99a58"/>
    <ellipse cx="134" cy="52" rx="13" ry="20" fill="#d99a58"/>
    <ellipse cx="66" cy="53" rx="6" ry="12" fill="#f0b9a0"/>
    <ellipse cx="134" cy="53" rx="6" ry="12" fill="#f0b9a0"/>
    <ellipse cx="100" cy="74" rx="40" ry="36" fill="#d99a58"/>
    <ellipse cx="100" cy="90" rx="22" ry="16" fill="#f7dcae"/>
    <ellipse cx="100" cy="87" rx="7" ry="6" fill="#23301f"/>
    <circle cx="84" cy="70" r="8" fill="#23301f"/>
    <circle cx="116" cy="70" r="8" fill="#23301f"/>
    <circle cx="87" cy="67" r="3" fill="#ffffff"/>
    <circle cx="119" cy="67" r="3" fill="#ffffff"/>
  </g>

  <!-- Wordmark -->
  <text x="90" y="250" font-family="Trebuchet MS, Helvetica, Arial" font-size="82" font-weight="bold" fill="#23301f">Kancil Pintar</text>
  <text x="90" y="330" font-family="Helvetica, Arial" font-size="38" fill="#6b7a63">Latihan soal OSN PAUD, TK A &amp; TK B</text>
  <text x="90" y="392" font-family="Helvetica, Arial" font-size="30" fill="#6b7a63">Matematika · Sains · Bahasa Inggris</text>

  <g transform="translate(90 452)">
    <rect width="290" height="66" rx="33" fill="#2f9e63"/>
    <text x="145" y="43" text-anchor="middle" font-family="Trebuchet MS, Helvetica, Arial" font-size="28" font-weight="bold" fill="#ffffff">Gratis, tanpa iklan</text>
  </g>

  <rect x="0" y="${HEIGHT - 14}" width="${WIDTH}" height="14" fill="#2f9e63"/>
</svg>`

await mkdir(join(root, 'public'), { recursive: true })
const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
await writeFile(out, png)

console.log(`✓ public/og-image.png — ${WIDTH}x${HEIGHT}, ${(png.length / 1024).toFixed(0)} KB`)
