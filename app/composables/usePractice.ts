// =============================================================================
// A practice session, as reactive state.
//
// The rules live in services/practice.service.ts; this only holds where we are
// and reacts to answers. One question at a time, with immediate feedback — a
// five-year-old cannot hold a list of pending answers in their head, and being
// told straight away is the part that teaches.
//
// A wrong answer does not end the question. The pick is marked wrong, the right
// one stays hidden, and the child is offered another go: showing the answer at
// the first mistake removes the only moment where any thinking happens. The
// retry is only offered while two or more options are still untried, because
// with one left there is nothing to choose — the child would be tapping the
// last button standing, and the app would be pretending that meant something.
// =============================================================================
import { bandOf, isCorrect, scoreOf, shuffle, summarise } from '~/services/practice.service'
import { saveSession } from '~/services/progress.service'
import { clearResume, saveResume } from '~/services/resume.service'
import type { Attempt, OptionKey, Question, ResumeState, SessionResult } from '~/types'

export type PracticePhase = 'answering' | 'retry' | 'revealed' | 'finished'

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
  /** Options picked for the current question so far, in order. */
  const tried = ref<OptionKey[]>([])
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

  /** True the moment a wrong pick still leaves a real choice to make. */
  const canRetry = computed(
    () => Boolean(current.value) && current.value!.options.length - tried.value.length >= 2,
  )

  /**
   * Keep the unfinished paper on the device.
   *
   * Written the moment an answer is settled, not when leaving: `beforeunload` is
   * not dependable — a killed tab, a phone that sleeps and never wakes, iOS
   * discarding the page — and this costs one small write per question.
   *
   * Deliberately not called from `resumeFrom`, which would stamp "last worked
   * on" with the moment the paper was merely reopened.
   */
  function remember() {
    // The last answer needs no entry: `finish()` is next, and it clears one.
    if (attempts.value.length === 0 || attempts.value.length >= total.value) return
    saveResume({
      paperId,
      attempts: attempts.value,
      shuffled: shuffled.value,
      seed: seed.value,
      total: total.value,
      savedAt: new Date().toISOString(),
    })
  }

  /** Settle the current question and show the answer. */
  function settle(key: OptionKey) {
    if (!current.value) return
    chosen.value = key
    attempts.value = [
      ...attempts.value,
      {
        questionId: current.value.id,
        chosen: key,
        correct: isCorrect(current.value, key),
        tries: [...tried.value],
      },
    ]
    phase.value = 'revealed'
    remember()
  }

  /**
   * Answer the current question.
   *
   * A wrong pick moves to `retry` rather than settling, unless it was the second
   * to last option — at which point there is nothing left to choose between.
   * Ignored once the answer is showing, and an option already tried is ignored
   * too, so a double tap cannot spend the child's second go.
   */
  function choose(key: OptionKey) {
    if (phase.value !== 'answering' || !current.value) return
    if (tried.value.includes(key)) return

    tried.value = [...tried.value, key]
    if (isCorrect(current.value, key) || !canRetry.value) settle(key)
    else phase.value = 'retry'
  }

  /** Take the offered second go. */
  function retry() {
    if (phase.value !== 'retry') return
    phase.value = 'answering'
  }

  /** Give up on the current question and show the answer. */
  function reveal() {
    const last = tried.value[tried.value.length - 1]
    if (phase.value !== 'retry' || !last) return
    settle(last)
  }

  /** Move to the next question, or finish. */
  function next() {
    if (isLast.value) {
      finish()
      return
    }
    index.value += 1
    chosen.value = null
    tried.value = []
    phase.value = 'answering'
  }

  function finish() {
    result.value = summarise(paperId, attempts.value, total.value)
    saveSession(result.value)
    // The paper is done; there is nothing left to come back to.
    clearResume(paperId)
    phase.value = 'finished'
  }

  /**
   * Pick this paper up where it was left.
   *
   * The order is restored before the answers, because on a shuffled paper the
   * answers only line up with the questions they belong to once the same seed
   * has dealt the same sequence.
   */
  function resumeFrom(state: ResumeState) {
    shuffled.value = state.shuffled
    seed.value = state.seed
    attempts.value = [...state.attempts]
    // Settled answers and position are the same fact: one attempt is recorded
    // per question, so the count IS the question to carry on from.
    index.value = state.attempts.length
    chosen.value = null
    tried.value = []
    result.value = null
    phase.value = 'answering'
  }


  /** Start again from question one. Optionally in a new shuffled order. */
  function restart({ shuffle: doShuffle = shuffled.value } = {}) {
    // Whatever was saved describes a run that is being abandoned on purpose.
    clearResume(paperId)
    shuffled.value = doShuffle
    // A fresh seed so "acak lagi" really is a different order.
    if (doShuffle) seed.value = Math.floor(Math.random() * 2 ** 31)
    index.value = 0
    attempts.value = []
    chosen.value = null
    tried.value = []
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
    tried,
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
    retry,
    reveal,
    next,
    finish,
    restart,
    resumeFrom,
  }
}
