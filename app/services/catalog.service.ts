// =============================================================================
// Reading the question bank.
//
// The bank is served as static JSON from /public/data, not bundled: 1,200
// questions would otherwise ride along in every page's JavaScript. The index
// (catalog.json) is small and fetched once; a paper is fetched only when someone
// actually opens it.
//
// Components never fetch these paths themselves — they go through here, so the
// shape of the data on disk stays one module's problem.
// =============================================================================
import type { Catalog, CatalogEntry, Level, Paper, PaperFilter, Question, Round, Subject } from '~/types'

const CATALOG_URL = '/data/catalog.json'
const paperUrl = (id: string) => `/data/papers/${id}.json`

/** Fetch the index of every paper. Cached by Nuxt under a stable key. */
export async function fetchCatalog(): Promise<Catalog> {
  return $fetch<Catalog>(CATALOG_URL)
}

/** Fetch one paper in full, including its questions. */
export async function fetchPaper(id: string): Promise<Paper> {
  return $fetch<Paper>(paperUrl(id))
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

/** Totals for the landing page and the compliance page. Counts, not claims. */
export function bankTotals(catalog: Catalog) {
  const papers = catalog.papers
  return {
    papers: papers.length,
    questions: catalog.questionCount,
    playable: catalog.playableCount,
    withheld: catalog.questionCount - catalog.playableCount,
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
