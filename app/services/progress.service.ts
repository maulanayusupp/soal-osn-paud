// =============================================================================
// Finished sessions, stored on the visitor's own device.
//
// Nothing is uploaded. There are no accounts and no analytics — a parent can
// clear it from the results screen, and clearing browser storage removes it for
// good. This is stated on /privasi and /kepatuhan.
// =============================================================================
import { PROGRESS_LIMIT, PROGRESS_STORAGE_KEY } from '~/config/practice.config'
import type { SessionResult } from '~/types'

function canStore(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

/** Every stored session, newest first. Returns [] when storage is unavailable. */
export function loadSessions(): SessionResult[] {
  if (!canStore()) return []
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is SessionResult =>
        Boolean(entry) &&
        typeof (entry as SessionResult).paperId === 'string' &&
        typeof (entry as SessionResult).score === 'number',
    )
  } catch {
    // Corrupt or blocked storage is not worth an error to the visitor.
    return []
  }
}

/** Prepend a finished session, keeping the list bounded. */
export function saveSession(result: SessionResult): SessionResult[] {
  const next = [result, ...loadSessions()].slice(0, PROGRESS_LIMIT)
  if (canStore()) {
    try {
      window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* Private mode or a full quota — the session still finishes normally. */
    }
  }
  return next
}

export function clearSessions(): void {
  if (!canStore()) return
  try {
    window.localStorage.removeItem(PROGRESS_STORAGE_KEY)
  } catch {
    /* Nothing to do. */
  }
}

/** The best score recorded for a paper, or null if it has not been finished. */
export function bestScoreFor(sessions: SessionResult[], paperId: string): number | null {
  const scores = sessions.filter((s) => s.paperId === paperId).map((s) => s.score)
  return scores.length ? Math.max(...scores) : null
}

/** Headline numbers for the practice page. */
export function progressSummary(sessions: SessionResult[]) {
  const papers = new Set(sessions.map((session) => session.paperId))
  const answered = sessions.reduce((sum, session) => sum + session.total, 0)
  const correct = sessions.reduce((sum, session) => sum + session.correct, 0)
  return {
    sessions: sessions.length,
    papers: papers.size,
    answered,
    correct,
    accuracy: answered === 0 ? 0 : Math.round((correct / answered) * 100),
  }
}
