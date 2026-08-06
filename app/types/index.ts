// =============================================================================
// Shared domain types.
//
// These mirror what scripts/import-papers.mjs writes into public/data — that
// pipeline is the single source of truth for question content, and these types
// are the contract the app reads it through.
// =============================================================================

export type Subject = 'matematika' | 'sains' | 'bahasa-inggris'
export type Level = 'paud' | 'tk-a' | 'tk-b'
export type Round = 'penyisihan' | 'final'
export type OptionKey = 'a' | 'b' | 'c' | 'd'

/** A question the extractor could not fully resolve is never served. */
export type QuestionStatus = 'ok' | 'needs-review'

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
  season: number
  round: Round
  subject: Subject
  level: Level
  printed: PrintedMasthead
  layoutSource: 'pdf' | 'docx'
  answerSource: 'pdf' | 'docx'
  verified: boolean
  questionCount: number
  playableCount: number
  warnings: string[]
  questions: Question[]
}

/** The lightweight index the app boots from. */
export interface CatalogEntry {
  id: string
  season: number
  round: Round
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
  chosen: OptionKey
  correct: boolean
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
