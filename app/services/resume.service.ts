// =============================================================================
// Papers left part-answered, stored on the visitor's own device.
//
// A session used to live only in memory, which is why leaving one asked for
// confirmation: twelve answers really were about to be thrown away. Twenty
// questions with a five-year-old gets interrupted — a phone call, a meal, a
// change of mind — so the answers are kept instead, and the interruption stops
// being something to warn about.
//
// Nothing is uploaded, exactly as with finished sessions. Documented on
// /privasi and /kepatuhan.
// =============================================================================
import { RESUME_LIMIT, RESUME_STORAGE_KEY } from '~/config/practice.config'
import type { Paper, ResumeState } from '~/types'

function canStore(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

/** Narrow enough that a hand-edited or stale entry cannot crash a session. */
function isShaped(entry: unknown): entry is ResumeState {
  const state = entry as ResumeState
  return (
    Boolean(state) &&
    typeof state.paperId === 'string' &&
    Array.isArray(state.attempts) &&
    typeof state.shuffled === 'boolean' &&
    typeof state.seed === 'number' &&
    typeof state.total === 'number' &&
    typeof state.savedAt === 'string' &&
    state.attempts.every(
      (attempt) =>
        Boolean(attempt) &&
        typeof attempt.questionId === 'string' &&
        typeof attempt.correct === 'boolean',
    )
  )
}

/** Every unfinished paper, newest first. Returns [] when storage is unavailable. */
export function loadResumeStates(): ResumeState[] {
  if (!canStore()) return []
  try {
    const raw = window.localStorage.getItem(RESUME_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isShaped) : []
  } catch {
    // Corrupt or blocked storage is not worth an error to the visitor.
    return []
  }
}

function write(states: ResumeState[]): void {
  if (!canStore()) return
  try {
    window.localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(states))
  } catch {
    /* Private mode or a full quota — the session still plays normally. */
  }
}

/** Remember where this paper got to, replacing any earlier entry for it. */
export function saveResume(state: ResumeState): void {
  const others = loadResumeStates().filter((entry) => entry.paperId !== state.paperId)
  write([state, ...others].slice(0, RESUME_LIMIT))
}

/** Forget one paper — it was finished, or restarted from the top. */
export function clearResume(paperId: string): void {
  write(loadResumeStates().filter((entry) => entry.paperId !== paperId))
}

/** Forget all of them, alongside the finished-session history. */
export function clearAllResume(): void {
  if (!canStore()) return
  try {
    window.localStorage.removeItem(RESUME_STORAGE_KEY)
  } catch {
    /* Nothing to do. */
  }
}

/**
 * The entry worth offering for this paper, or null.
 *
 * Pure, so the rules below can be exercised without a browser.
 *
 * An entry is refused when it no longer fits the paper it names. The bank is
 * regenerated from the source documents, and an import can add a question,
 * hold one back, or renumber the lot — after which "you were on question 8"
 * points somewhere else entirely. Rather than resume into a paper that has
 * moved underneath it, the entry is dropped and the paper starts fresh.
 */
export function resumeFor(states: ResumeState[], paper: Paper, total: number): ResumeState | null {
  const state = states.find((entry) => entry.paperId === paper.id)
  if (!state) return null

  // Nothing to resume: not started, or already at the end.
  if (state.attempts.length === 0 || state.attempts.length >= total) return null
  // The paper has a different number of playable questions than it did.
  if (state.total !== total) return null

  // Every answer must still belong to a question that exists.
  const known = new Set(paper.questions.map((question) => question.id))
  if (!state.attempts.every((attempt) => known.has(attempt.questionId))) return null

  return state
}
