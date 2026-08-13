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

  /**
   * Question ids to drill, or null for the whole paper.
   *
   * Set when replaying only the ones that were answered wrong. The paper stays
   * the unit of everything else: a focused run is a lens over it, not a session
   * of its own — which is why it is never scored into the history below.
   */
  const focus = ref<string[] | null>(null)

  /** Printed order by default; a stable shuffled order when asked for. */
  const questions = computed(() => {
    const ordered = shuffled.value ? shuffle(source.value, seed.value) : source.value
    if (!focus.value) return ordered
    // Filter the ordered list rather than mapping over the ids, so a focused run
    // keeps the order the child just saw them in.
    const wanted = new Set(focus.value)
    return ordered.filter((question) => wanted.has(question.id))
  })

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
    // A focused run is short and belongs to no paper-shaped position, so there
    // is nothing coherent to come back to — and storing one would offer to
    // "continue" a twenty-question paper at question 3 of 4.
    if (focus.value) return
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

  /** The questions answered wrong in the run just finished, in the order seen. */
  const wrongIds = computed(() =>
    attempts.value.filter((attempt) => !attempt.correct).map((attempt) => attempt.questionId),
  )

  function finish() {
    result.value = summarise(paperId, attempts.value, total.value)
    // A focused run is NOT a session of this paper. Recording "3 of 3" against a
    // twenty-question paper would put a 100% in the history and on the card's
    // "best" badge for a paper that was never worked through — the number would
    // be real and the impression false.
    if (!focus.value) {
      saveSession(result.value)
      // The paper is done; there is nothing left to come back to.
      clearResume(paperId)
    }
    phase.value = 'finished'
  }

  /**
   * Go again over just the ones that were wrong.
   *
   * The whole point of a session for a five-year-old: the four they missed are
   * the lesson, and making them sit through the sixteen they already knew to
   * reach those four is how a paper stops being worth reopening.
   */
  function replayWrong() {
    const ids = wrongIds.value
    if (!ids.length) return
    focus.value = ids
    index.value = 0
    attempts.value = []
    chosen.value = null
    tried.value = []
    result.value = null
    phase.value = 'answering'
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


  /**
   * Start again from question one, over the WHOLE paper.
   *
   * Deliberately clears the focus: "ulangi lagi" beside a focused result has to
   * mean the paper, or there would be two buttons on the same screen both
   * meaning "these four again" and nothing meaning "all twenty".
   */
  function restart({ shuffle: doShuffle = shuffled.value } = {}) {
    // Whatever was saved describes a run that is being abandoned on purpose.
    clearResume(paperId)
    focus.value = null
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
    focus,
    // derived
    correctCount,
    score,
    band,
    isLast,
    wasCorrect,
    wrongIds,
    // actions
    choose,
    retry,
    reveal,
    next,
    finish,
    restart,
    resumeFrom,
    replayWrong,
  }
}
