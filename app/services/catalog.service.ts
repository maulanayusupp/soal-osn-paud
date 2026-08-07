// =============================================================================
// Reading the question bank.
//
// The bank is *imported*, not fetched over HTTP. It used to live in `public/`
// and be pulled with `$fetch('/data/…')`, which worked in production and
// silently failed in dev: `public/` is served by Vite there, so a server-side
// fetch of that path finds nothing, and every count on the page rendered as a
// convincing zero.
//
// Importing removes the problem rather than papering over it — the same code
// path runs on the server and in the browser, in dev and in production, and a
// missing file becomes a build error instead of a zero.
//
// The catalogue is small and needed on nearly every page, so it is a plain
// import. The papers are behind `import.meta.glob`, which Vite splits into one
// lazily-loaded chunk each: opening a paper pulls only that paper.
// =============================================================================
import catalogJson from '~~/content/generated/catalog.json'
import type { Catalog, CatalogEntry, Level, Paper, PaperFilter, Question, Round, Subject } from '~/types'

const paperModules = import.meta.glob<{ default: Paper }>(
  '~~/content/generated/papers/*.json',
)

/** Look-up by paper id, so a route param does not have to know the file path. */
const paperLoaders = new Map(
  Object.entries(paperModules).map(([path, load]) => [
    path.split('/').pop()!.replace(/\.json$/, ''),
    load,
  ]),
)

/** The index of every paper. */
export async function fetchCatalog(): Promise<Catalog> {
  return catalogJson as Catalog
}

/** One paper in full, including its questions. Throws when the id is unknown. */
export async function fetchPaper(id: string): Promise<Paper> {
  const load = paperLoaders.get(id)
  if (!load) throw new Error(`Unknown paper: ${id}`)
  return (await load()).default
}

/**
 * The questions a child is actually given: everything the importer resolved
 * completely, in printed order. A question missing its answer key or an option
 * is held back rather than shown half-read.
 */
export function playableQuestions(paper: Paper): Question[] {
  return paper.questions.filter((question) => question.status === 'ok' && question.answer !== null)
}

/** Papers matching a filter, in a stable, human-sensible order. */
export function filterPapers(papers: CatalogEntry[], filter: PaperFilter): CatalogEntry[] {
  return papers
    .filter((paper) => filter.level === 'all' || paper.level === filter.level)
    .filter((paper) => filter.subject === 'all' || paper.subject === filter.subject)
    .filter((paper) => filter.season === 'all' || paper.season === filter.season)
    .filter((paper) => filter.round === 'all' || paper.round === filter.round)
    .filter((paper) => paper.playableCount > 0)
    .sort(
      (a, b) =>
        a.season - b.season ||
        a.round.localeCompare(b.round) ||
        a.subject.localeCompare(b.subject) ||
        a.level.localeCompare(b.level),
    )
}

/** Seasons present in the bank, ascending. */
export function seasonsIn(papers: CatalogEntry[]): number[] {
  return [...new Set(papers.map((paper) => paper.season))].sort((a, b) => a - b)
}

/**
 * Totals for the landing page and the compliance page. Counts, not claims.
 *
 * `questions` is the number a visitor can actually answer, not the number read
 * out of the papers. Showing the larger figure beside the label "questions ready
 * to answer" would have been a small lie.
 */
export function bankTotals(catalog: Catalog) {
  const papers = catalog.papers
  return {
    papers: papers.length,
    questions: catalog.playableCount,
    seasons: seasonsIn(papers).length,
    subjects: new Set(papers.map((paper) => paper.subject)).size,
  }
}

/** How many playable questions exist per level / subject, for the pickers. */
export function countBy<K extends Level | Subject | Round>(
  papers: CatalogEntry[],
  key: 'level' | 'subject' | 'round',
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const paper of papers) {
    const value = paper[key] as K
    out[value] = (out[value] ?? 0) + paper.playableCount
  }
  return out
}
