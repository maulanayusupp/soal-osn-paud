// =============================================================================
// Asking before a half-finished paper is abandoned.
//
// A practice session lives only in memory: navigating away throws away the
// answers given so far. On a phone the menu sits right above the question, so a
// mistaken tap is easy — and losing twelve answers to it is miserable.
//
// Two exits have to be covered, and they behave differently:
//   * in-app navigation, which we can intercept and show our own dialog for;
//   * closing or reloading the tab, where the browser insists on its own
//     wording and only listens if `beforeunload` is cancelled.
// =============================================================================
import type { RouteLocationRaw } from 'vue-router'

/**
 * Whether a session currently has answers worth losing.
 *
 * Shared state rather than a prop, because the component that knows (the
 * practice stage) and the component that guards (the page) are not in a
 * parent/child relationship worth threading a prop through.
 */
export function usePracticeInProgress() {
  return useState<boolean>('practice-in-progress', () => false)
}

export function useLeaveGuard() {
  const inProgress = usePracticeInProgress()
  const router = useRouter()

  /** Where the visitor tried to go; non-null means the dialog is open. */
  const pending = ref<RouteLocationRaw | null>(null)
  const asking = computed(() => pending.value !== null)

  // Set for the one navigation we have already agreed to, so the guard does not
  // catch our own router.push and ask a second time.
  let cleared = false

  onBeforeRouteLeave((to) => {
    if (!inProgress.value || cleared) return true
    pending.value = to.fullPath
    return false
  })

  function onBeforeUnload(event: BeforeUnloadEvent) {
    if (!inProgress.value) return
    // Both are needed: `preventDefault` for the modern spec, `returnValue` for
    // the browsers that still only honour the legacy form.
    event.preventDefault()
    event.returnValue = ''
  }

  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

  async function leave() {
    const target = pending.value
    pending.value = null
    if (!target) return

    cleared = true
    inProgress.value = false

    // `replace`, not `push`. The blocked navigation may well have been the back
    // gesture, and pushing would add a *forward* entry: history becomes
    // [list, paper, list] and pressing back walks straight into the paper whose
    // answers were just thrown away. Replacing drops the abandoned paper from
    // history instead, so back can never return to a wiped session.
    const failure = await router.replace(target)

    // A cancelled navigation (a chunk that failed to load, a redirect) would
    // otherwise leave the visitor on the paper with the guard switched off.
    if (failure) {
      cleared = false
      inProgress.value = true
    }
  }

  function stay() {
    pending.value = null
  }

  return { asking, leave, stay }
}
