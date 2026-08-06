// =============================================================================
// Paper identity — the single place that decides what a paper is called.
//
// A paper id is `s{season}-{round}-{subject}-{level}`, e.g.
// `s1-penyisihan-matematika-paud`. Every downstream artefact (JSON file name,
// image folder, route param, i18n lookup) is derived from it, so nothing else
// in the codebase is allowed to invent its own naming.
// =============================================================================

/** Subject slugs. The source files spell these several ways; we normalise. */
export const SUBJECTS = ['matematika', 'bahasa-inggris', 'sains']

/** Age-group slugs, ordered from youngest to oldest. */
export const LEVELS = ['paud', 'tk-a', 'tk-b']

/** Competition rounds, in the order a season runs them. */
export const ROUNDS = ['penyisihan', 'final']

/** Map a source file name fragment onto a subject slug. */
export function subjectFromFilename(name) {
  const lower = name.toLowerCase()
  if (lower.includes('bahasa inggris')) return 'bahasa-inggris'
  if (lower.includes('sains') || lower.includes('ipa')) return 'sains'
  if (lower.includes('matematika') || lower.includes('mtk')) return 'matematika'
  return null
}

/** Map a source file name fragment onto a level slug. */
export function levelFromFilename(name) {
  const lower = name.toLowerCase()
  if (/\btk\s*a\b/.test(lower)) return 'tk-a'
  if (/\btk\s*b\b/.test(lower)) return 'tk-b'
  if (lower.includes('paud')) return 'paud'
  return null
}

/** Map a source folder name onto a round slug. Season 1 has no round folder. */
export function roundFromFolder(name) {
  const lower = (name || '').toLowerCase()
  if (lower.includes('final')) return 'final'
  return 'penyisihan'
}

/** Build the canonical paper id. */
export function paperId({ season, round, subject, level }) {
  return `s${season}-${round}-${subject}-${level}`
}

/** Zero-padded question slot, used for image file names (`q01`). */
export function questionSlug(n) {
  return `q${String(n).padStart(2, '0')}`
}
