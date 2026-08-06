// =============================================================================
// Build content/sources.json — the inventory of exam papers on disk.
//
// The original .docx/.pdf files are NOT part of this repository (they are
// third-party exam papers kept locally). This script records where they are and
// what each one is, so `pnpm soal:import` has a deterministic input list.
//
// Run: node scripts/scan-sources.mjs [sourceRoot]
// =============================================================================
import { readdir, writeFile, mkdir } from 'node:fs/promises'
import { join, resolve, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  paperId,
  roundFromFolder,
  subjectFromFilename,
  levelFromFilename,
} from './lib/paper-id.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_ROOT =
  process.argv[2] || join(process.env.HOME, 'Downloads', 'Soal OSN Paud')

/** Season folders are named `Soal OSN PAUD-TK Season N`. */
function seasonFromFolder(name) {
  const match = /season\s*(\d+)/i.exec(name)
  return match ? Number(match[1]) : null
}

async function dirs(path) {
  const entries = await readdir(path, { withFileTypes: true })
  return entries.filter((e) => e.isDirectory() && !e.name.startsWith('.'))
}

async function files(path) {
  const entries = await readdir(path, { withFileTypes: true })
  return entries.filter((e) => e.isFile() && !e.name.startsWith('.'))
}

const papers = []

for (const seasonDir of await dirs(SOURCE_ROOT)) {
  const season = seasonFromFolder(seasonDir.name)
  if (!season) continue
  const seasonPath = join(SOURCE_ROOT, seasonDir.name)

  // Season 1 keeps its papers straight in the season folder (single round);
  // later seasons split them into Babak Penyisihan / Babak Final.
  const roundDirs = await dirs(seasonPath)
  const scopes = roundDirs.length
    ? roundDirs.map((d) => ({ folder: d.name, path: join(seasonPath, d.name) }))
    : [{ folder: '', path: seasonPath }]

  for (const scope of scopes) {
    const round = roundFromFolder(scope.folder)
    const docs = (await files(scope.path)).filter((f) => f.name.endsWith('.docx'))

    for (const doc of docs) {
      const stem = basename(doc.name, '.docx')
      const subject = subjectFromFilename(stem)
      const level = levelFromFilename(stem)
      if (!subject || !level) {
        console.warn(`! could not classify: ${join(scope.path, doc.name)}`)
        continue
      }
      const pdfName = `${stem}.pdf`
      const hasPdf = (await files(scope.path)).some((f) => f.name === pdfName)

      papers.push({
        id: paperId({ season, round, subject, level }),
        season,
        round,
        subject,
        level,
        docx: join(scope.path, doc.name),
        // Seasons 3 and 4-penyisihan ship .docx only; those get converted to PDF
        // at import time (see scripts/lib/convert.mjs).
        pdf: hasPdf ? join(scope.path, pdfName) : null,
      })
    }
  }
}

papers.sort((a, b) => a.id.localeCompare(b.id))

const duplicates = papers
  .map((p) => p.id)
  .filter((id, i, all) => all.indexOf(id) !== i)
if (duplicates.length) {
  console.error(`✗ duplicate paper ids: ${[...new Set(duplicates)].join(', ')}`)
  process.exit(1)
}

await mkdir(join(root, 'content'), { recursive: true })
await writeFile(
  join(root, 'content', 'sources.json'),
  `${JSON.stringify({ sourceRoot: SOURCE_ROOT, papers }, null, 2)}\n`,
)

const withPdf = papers.filter((p) => p.pdf).length
console.log(
  `✓ ${papers.length} papers indexed — ${withPdf} with a source PDF, ${papers.length - withPdf} needing conversion`,
)
