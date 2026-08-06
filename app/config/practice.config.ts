// =============================================================================
// Practice structure: the axes a paper is filed under, and the rules of a
// session. Labels come from i18n by id; nothing here is user-visible text.
// =============================================================================
import type { Level, Round, Subject } from '~/types'

/** Ordered youngest to oldest — the order they appear in every picker. */
export const LEVELS: Level[] = ['paud', 'tk-a', 'tk-b']

export const SUBJECTS: Subject[] = ['matematika', 'sains', 'bahasa-inggris']

export const ROUNDS: Round[] = ['penyisihan', 'final']

/** Emoji used as the subject's picture cue for pre-readers. */
export const SUBJECT_ICON: Record<Subject, string> = {
  matematika: '🔢',
  sains: '🔬',
  'bahasa-inggris': '🔤',
}

export const LEVEL_ICON: Record<Level, string> = {
  paud: '🌱',
  'tk-a': '🌿',
  'tk-b': '🌳',
}

/**
 * Score bands used to pick the mascot's reaction and the closing message.
 * These are encouragement, not assessment — see the note on /kepatuhan.
 */
export const SCORE_BANDS = [
  { id: 'great', min: 80 },
  { id: 'good', min: 55 },
  { id: 'keep-going', min: 0 },
] as const

export type ScoreBand = (typeof SCORE_BANDS)[number]['id']

/** How long the "correct!" flourish stays on screen, in milliseconds. */
export const FEEDBACK_MS = 900

/** localStorage key holding finished sessions. Bump to invalidate old shapes. */
export const PROGRESS_STORAGE_KEY = 'kancil-progress-v1'

/** Most recent sessions kept on the device. */
export const PROGRESS_LIMIT = 60
