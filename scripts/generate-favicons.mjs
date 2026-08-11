// =============================================================================
// Build every favicon size from assets/favicon-source.svg.
//
// Run: pnpm favicons
// =============================================================================
import { writeFile, mkdir, copyFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import favicons from 'favicons'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'assets', 'favicon-source.svg')
const outDir = join(root, 'public')

const response = await favicons(source, {
  path: '/',
  appName: 'Kancil Pintar',
  appShortName: 'Kancil',
  appDescription:
    'Latihan soal OSN PAUD, TK A dan TK B: matematika, sains dan bahasa Inggris.',
  lang: 'id',
  background: '#fff8ec',
  theme_color: '#2f9e63',
  display: 'standalone',
  start_url: '/',
  icons: {
    android: true,
    appleIcon: true,
    appleStartup: false,
    favicons: true,
    windows: false,
    yandex: false,
  },
})

await mkdir(outDir, { recursive: true })

for (const image of response.images) {
  await writeFile(join(outDir, image.name), image.contents)
}
for (const file of response.files) {
  await writeFile(join(outDir, file.name), file.contents)
}

// The SVG favicon is served as-is: it is the sharpest option in every browser
// that supports it, and the rasters are the fallback.
await copyFile(source, join(outDir, 'favicon.svg'))

console.log(
  `✓ ${response.images.length} icons + ${response.files.length} manifest files written to public/`,
)
