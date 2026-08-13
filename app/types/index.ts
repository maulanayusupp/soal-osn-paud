// =============================================================================
// Shared domain types.
//
// These mirror what scripts/import-papers.mjs writes into content/generated —
// that pipeline is the single source of truth for question content, and these
// types are the contract the app reads it through.
// =============================================================================

export type Subject = 'matematika' | 'sains' | 'bahasa-inggris'
export type Level = 'paud' | 'tk-a' | 'tk-b'
export type Round = 'penyisihan' | 'final'
export type OptionKey = 'a' | 'b' | 'c' | 'd'

/** A question the extractor could not fully resolve is never served. */
export type QuestionStatus = 'ok' | 'needs-review'

/**
 * Where a paper came from.
 *
 * `osn` papers are read off a printed exam by the import pipeline and carry a
 * season and a round. `manual` papers are written by hand in `content/manual/`
 * and carry neither — "Season 3, Babak Final" means nothing for a set of sums a
 * parent wrote for their own child, so those fields are null and a free-text
 * `title` names the paper instead. See MENAMBAH-SOAL.md.
 */
export type PaperOrigin = 'osn' | 'manual'

export interface QuestionOption {
  key: OptionKey
  /** Printed text of the option, or null when the option is a picture. */
  text: string | null
  /** Illustrations belonging to this option, in printed order. */
  images: string[]
}

export interface Question {
  id: string
  /** Its number on the printed paper. */
  n: number
  prompt: string | null
  images: string[]
  options: QuestionOption[]
  answer: OptionKey | null
  status: QuestionStatus
}

/** What the paper's masthead actually printed — quoted, never paraphrased. */
export interface PrintedMasthead {
  title: string | null
  level: string | null
  date: string | null
  raw: string[]
}

export interface Paper {
  id: string
  origin: PaperOrigin
  /** Names a hand-written paper. Null for OSN papers, which compose a title. */
  title: string | null
  /** Null on a hand-written paper — it belongs to no OSN season or round. */
  season: number | null
  round: Round | null
  subject: Subject
  level: Level
  printed: PrintedMasthead
  layoutSource: 'pdf' | 'docx' | 'manual'
  answerSource: 'pdf' | 'docx' | 'manual'
  verified: boolean
  questionCount: number
  playableCount: number
  warnings: string[]
  questions: Question[]
}

/** The lightweight index the app boots from. */
export interface CatalogEntry {
  id: string
  origin: PaperOrigin
  title: string | null
  season: number | null
  round: Round | null
  subject: Subject
  level: Level
  printedDate: string | null
  questionCount: number
  playableCount: number
  verified: boolean
  warningCount: number
}

export interface Catalog {
  generatedFrom: string
  paperCount: number
  questionCount: number
  playableCount: number
  papers: CatalogEntry[]
}

// --- Practice session --------------------------------------------------------

export interface Attempt {
  questionId: string
  /** The option settled on — the last one picked before the answer was shown. */
  chosen: OptionKey
  correct: boolean
}

/**
 * A paper left part-answered, kept so it can be picked up again.
 *
 * Only settled answers are stored. The question in front of the child when they
 * left is not: it may have been half-tried, and restoring someone into the
 * middle of a question they cannot remember reading is worse than asking it
 * again. `attempts.length` is therefore both the score so far and the question
 * to resume at.
 *
 * `shuffled` and `seed` reproduce the exact order the questions were in —
 * without them, resuming a shuffled paper would deal a different sequence and
 * the stored answers would belong to the wrong questions.
 */
export interface ResumeState {
  paperId: string
  attempts: Attempt[]
  shuffled: boolean
  seed: number
  /** Questions the paper had when this was saved; a re-import may change it. */
  total: number
  savedAt: string
}

export interface SessionResult {
  paperId: string
  total: number
  correct: number
  /** Whole percent, 0–100. */
  score: number
  finishedAt: string
}

/**
 * The mascot's four moments: waiting, deciding, right, wrong.
 * Lives here rather than in the component because `<script setup>` cannot export.
 */
export type MascotMood = 'idle' | 'thinking' | 'cheer' | 'oops'

/** A parent-facing filter over the catalogue. */
export interface PaperFilter {
  level: Level | 'all'
  subject: Subject | 'all'
  season: number | 'all'
  round: Round | 'all'
}
