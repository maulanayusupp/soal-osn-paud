// =============================================================================
// A practice session, as reactive state.
//
// The rules live in services/practice.service.ts; this only holds where we are
// and reacts to answers. One question at a time, answered once, with immediate
// feedback — a five-year-old cannot hold a list of pending answers in their head,
// and being told straight away is the part that teaches.
// =============================================================================
import { bandOf, isCorrect, scoreOf, shuffle, summarise } from '~/services/practice.service'
import { saveSession } from '~/services/progress.service'
import type { Attempt, OptionKey, Question, SessionResult } from '~/types'

export type PracticePhase = 'answering' | 'revealed' | 'finished'

export function usePractice(paperId: string, source: Ref<Question[]>) {
  const shuffled = ref(false)
  const seed = ref(1)

  /** Printed order by default; a stable shuffled order when asked for. */
  const questions = computed(() =>
    shuffled.value ? shuffle(source.value, seed.value) : source.value,
  )

  const index = ref(0)
  const attempts = ref<Attempt[]>([])
  const chosen = ref<OptionKey | null>(null)
  const phase = ref<PracticePhase>('answering')
  const result = ref<SessionResult | null>(null)

  const current = computed<Question | null>(() => questions.value[index.value] ?? null)
  const total = computed(() => questions.value.length)
  const position = computed(() => Math.min(index.value + 1, total.value))
  const correctCount = computed(() => attempts.value.filter((a) => a.correct).length)
  const score = computed(() => scoreOf(attempts.value, total.value))
  const band = computed(() => bandOf(score.value))
  const isLast = computed(() => index.value >= total.value - 1)
  const wasCorrect = computed(
    () => phase.value !== 'answering' && Boolean(chosen.value) && current.value?.answer === chosen.value,
  )

  /** Answer the current question. Ignored once it has been answered. */
  function choose(key: OptionKey) {
    if (phase.value !== 'answering' || !current.value) return
    chosen.value = key
    attempts.value = [
      ...attempts.value,
      { questionId: current.value.id, chosen: key, correct: isCorrect(current.value, key) },
    ]
    phase.value = 'revealed'
  }

  /** Move to the next question, or finish. */
  function next() {
    if (isLast.value) {
      finish()
      return
    }
    index.value += 1
    chosen.value = null
    phase.value = 'answering'
  }

  function finish() {
    result.value = summarise(paperId, attempts.value, total.value)
    saveSession(result.value)
    phase.value = 'finished'
  }

  /** Start again from question one. Optionally in a new shuffled order. */
  function restart({ shuffle: doShuffle = shuffled.value } = {}) {
    shuffled.value = doShuffle
    // A fresh seed so "acak lagi" really is a different order.
    if (doShuffle) seed.value = Math.floor(Math.random() * 2 ** 31)
    index.value = 0
    attempts.value = []
    chosen.value = null
    result.value = null
    phase.value = 'answering'
  }

  return {
    // state
    questions,
    current,
    index,
    position,
    total,
    phase,
    chosen,
    attempts,
    result,
    shuffled,
    // derived
    correctCount,
    score,
    band,
    isLast,
    wasCorrect,
    // actions
    choose,
    next,
    finish,
    restart,
  }
}
