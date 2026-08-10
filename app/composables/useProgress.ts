// =============================================================================
// Device-local progress, as reactive state.
//
// Reads happen on mount only: localStorage does not exist during SSR, and
// rendering a number on the server that the client then contradicts is a
// hydration mismatch.
// =============================================================================
import { bestScoreFor, clearSessions, loadSessions, progressSummary } from '~/services/progress.service'
import type { SessionResult } from '~/types'

export function useProgress() {
  const sessions = useState<SessionResult[]>('progress-sessions', () => [])
  const loaded = ref(false)

  onMounted(() => {
    sessions.value = loadSessions()
    loaded.value = true
  })

  const summary = computed(() => progressSummary(sessions.value))

  function clear() {
    clearSessions()
    sessions.value = []
  }

  function bestFor(paperId: string) {
    return bestScoreFor(sessions.value, paperId)
  }

  return { sessions, summary, loaded, clear, bestFor }
}
