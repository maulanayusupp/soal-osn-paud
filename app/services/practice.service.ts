// =============================================================================
// The practice engine — plain TypeScript, no Vue.
//
// Keeping it framework-free means the rules of a session (what counts as
// correct, how a score becomes a band) can be read, reasoned about and reused
// without tracing reactivity. `usePractice()` is the thin reactive wrapper.
// =============================================================================
import { SCORE_BANDS, type ScoreBand } from '~/config/practice.config'
import type { Attempt, OptionKey, Question, SessionResult } from '~/types'

/** Was this the option the paper marked? */
export function isCorrect(question: Question, chosen: OptionKey): boolean {
  return question.answer === chosen
}

/** Percent correct, rounded to a whole number. 0 questions scores 0. */
export function scoreOf(attempts: Attempt[], total: number): number {
  if (total === 0) return 0
  const correct = attempts.filter((attempt) => attempt.correct).length
  return Math.round((correct / total) * 100)
}

/**
 * Which encouragement band a score falls in.
 * These bands drive the mascot's reaction and the closing message. They are not
 * a grade, and nothing in the app presents them as one.
 */
export function bandOf(score: number): ScoreBand {
  const band = SCORE_BANDS.find((candidate) => score >= candidate.min)
  return (band ?? SCORE_BANDS[SCORE_BANDS.length - 1]!).id
}

/** Build the record kept on the device once a session ends. */
export function summarise(paperId: string, attempts: Attempt[], total: number): SessionResult {
  return {
    paperId,
    total,
    correct: attempts.filter((attempt) => attempt.correct).length,
    score: scoreOf(attempts, total),
    finishedAt: new Date().toISOString(),
  }
}

/**
 * Deterministic shuffle from a seed, so "acak" (shuffle) gives a genuinely mixed
 * order that is still stable across a re-render. Mulberry32 + Fisher–Yates.
 */
export function shuffle<T>(items: T[], seed: number): T[] {
  const out = [...items]
  let state = seed >>> 0
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}
