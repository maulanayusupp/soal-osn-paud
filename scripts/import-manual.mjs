// =============================================================================
// Build only the hand-written papers in content/manual/.
//
// `pnpm soal:import` does these too, but it re-reads sixty exam papers through
// poppler on the way — minutes of work, and it needs the source documents and
// LibreOffice on the machine. Writing one question for your own child should not
// require any of that, so this does the manual papers alone and patches them
// into the catalogue.
//
// It is a shortcut, never the only route: a full import rebuilds the catalogue
// from scratch and includes these same papers, so the two can never drift.
//
// Run: pnpm soal:manual
// =============================================================================
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { exists } from './lib/convert.mjs'
import { loadManualPapers, catalogEntry } from './lib/manual-paper.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_OUT = join(root, 'content', 'generated', 'papers')
const CATALOG = join(root, 'content', 'generated', 'catalog.json')

const sourcesPath = join(root, 'content', 'sources.json')
const sources = (await exists(sourcesPath))
  ? JSON.parse(await readFile(sourcesPath, 'utf8'))
  : { papers: [] }

const { papers, errors } = await loadManualPapers(
  root,
  new Set(sources.papers.map((paper) => paper.id)),
)

for (const message of errors) console.error(`✗\t${message}`)

// No early exit when there is nothing to write: deleting the LAST hand-written
// paper is exactly the case that leaves a stale file and a stale catalogue row,
// and it is the one where this script has the least to do.
if (!papers.length && !errors.length) {
  console.log('Nothing in content/manual/ — see MENAMBAH-SOAL.md to add a paper.')
}

await mkdir(DATA_OUT, { recursive: true })
for (const paper of papers) {
  await writeFile(join(DATA_OUT, `${paper.id}.json`), `${JSON.stringify(paper, null, 2)}\n`)
  console.log(`·\t${paper.id}\t${paper.questionCount} question(s)\t${paper.title}`)
}

// Patch rather than rewrite: the OSN papers are not being rebuilt here, and
// dropping them from the catalogue would empty the app.
const previous = (await exists(CATALOG))
  ? JSON.parse(await readFile(CATALOG, 'utf8'))
  : { papers: [] }
const byId = new Map(previous.papers.map((paper) => [paper.id, paper]))

/**
 * Deleting content/manual/<id>.json should take the paper with it — both its
 * catalogue row and its generated file, or the page would stay reachable by URL
 * after being taken out of every list.
 *
 * Only ever a paper this script owns: `origin === 'manual'`, and only when the
 * authored file is genuinely gone rather than merely refused above, so a single
 * typo cannot unpublish a paper that is still on disk.
 */
const refused = (id) => errors.some((message) => message.startsWith(`content/manual/${id}.json`))
const written = new Set(papers.map((paper) => paper.id))

for (const [id, entry] of [...byId]) {
  if (entry.origin !== 'manual' || written.has(id) || refused(id)) continue
  byId.delete(id)
  await rm(join(DATA_OUT, `${id}.json`), { force: true })
  console.log(`-\t${id}\tremoved (no longer in content/manual/)`)
}

// A generated file with no catalogue row at all — left behind by an older run.
for (const file of (await exists(DATA_OUT)) ? await readdir(DATA_OUT) : []) {
  const id = file.replace(/\.json$/, '')
  if (byId.has(id) || written.has(id) || refused(id)) continue
  const paper = JSON.parse(await readFile(join(DATA_OUT, file), 'utf8'))
  if (paper.origin !== 'manual') continue
  await rm(join(DATA_OUT, file), { force: true })
  console.log(`-\t${id}\tremoved (orphaned file)`)
}

for (const paper of papers) byId.set(paper.id, catalogEntry(paper))

const catalog = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))
const next = `${JSON.stringify(
  {
    generatedFrom: 'scripts/import-papers.mjs',
    paperCount: catalog.length,
    questionCount: catalog.reduce((sum, paper) => sum + paper.questionCount, 0),
    playableCount: catalog.reduce((sum, paper) => sum + paper.playableCount, 0),
    papers: catalog,
  },
  null,
  2,
)}\n`

// Only when it actually differs, so running this on an unchanged folder does not
// show up as a modified file in git.
if (!(await exists(CATALOG)) || (await readFile(CATALOG, 'utf8')) !== next) {
  await writeFile(CATALOG, next)
}

const manualCount = catalog.filter((paper) => paper.origin === 'manual').length
console.log(
  `\n${manualCount} hand-written paper(s) · ${catalog.length} papers in the catalogue${
    errors.length ? ` · ${errors.length} refused` : ''
  }`,
)
if (errors.length) process.exit(1)
