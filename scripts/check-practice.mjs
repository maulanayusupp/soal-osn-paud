// =============================================================================
// Exercise the practice state machine.
//
// `usePractice()` decides what a wrong answer costs and when a second go is
// offered, and it is the one piece of logic in the app a child feels directly.
// It has branches that are tedious to reach by hand — a wrong pick on a
// two-option question, a second wrong pick, a double tap on an option already
// tried — so they are driven from here instead.
//
// The composable is written for Nuxt, so it calls `ref`/`computed` as globals
// and imports through the `~` alias. Both are supplied below; jiti compiles the
// TypeScript. pnpm keeps transitive packages out of the top-level
// `node_modules`, hence the lookup rather than a plain import.
//
// Run: pnpm practice:check
// =============================================================================
import { readdir } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Resolve a package pnpm has stored under .pnpm/<name>@<version>/. */
async function pnpmPackage(name, entry) {
  const store = join(root, 'node_modules', '.pnpm')
  const dirs = (await readdir(store)).filter((dir) => dir.startsWith(`${name}@`)).sort()
  const dir = dirs[0]
  if (!dir) throw new Error(`${name} not found under node_modules/.pnpm`)
  return pathToFileURL(join(store, dir, 'node_modules', name, entry)).href
}

const vue = await import(await pnpmPackage('vue', 'index.mjs'))
const { createJiti } = await import(await pnpmPackage('jiti', 'lib/jiti.mjs'))

globalThis.ref = vue.ref
globalThis.computed = vue.computed

// usePractice writes an unfinished session to localStorage as it goes. There is
// no browser here, so it gets one — which also lets the checks below read back
// what was actually stored rather than trusting that it was.
const store = new Map()
globalThis.window = {
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  },
}

const jiti = createJiti(root, { alias: { '~': join(root, 'app') }, interopDefault: true })
const { usePractice } = await jiti.import(join(root, 'app', 'composables', 'usePractice.ts'))
const { resumeFor, loadResumeStates } = await jiti.import(
  join(root, 'app', 'services', 'resume.service.ts'),
)
const { RESUME_STORAGE_KEY, PROGRESS_STORAGE_KEY: PROGRESS_KEY } = await jiti.import(
  join(root, 'app', 'config', 'practice.config.ts'),
)

const question = (id, answer, keys = ['a', 'b', 'c']) => ({
  id,
  n: Number(id.slice(1)),
  prompt: id,
  images: [],
  answer,
  options: keys.map((key) => ({ key, text: key, images: [] })),
})

const start = (...questions) => usePractice('paper', vue.ref(questions))

let failures = 0
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures += 1
  console.log(
    `${ok ? '  ok  ' : ' FAIL '} ${label}: ${JSON.stringify(actual)}` +
      (ok ? '' : ` — wanted ${JSON.stringify(expected)}`),
  )
}

// --- a wrong pick leaves the question open ----------------------------------
{
  const p = start(question('q1', 'b'), question('q2', 'a'))

  check('starts answering', p.phase.value, 'answering')
  p.choose('a')
  check('a wrong pick offers a second go', p.phase.value, 'retry')
  check('the wrong pick is remembered', p.tried.value, ['a'])
  check('nothing is recorded yet', p.attempts.value.length, 0)
  check('no answer is settled', p.chosen.value, null)

  p.choose('c')
  check('picking again before pressing retry is ignored', p.tried.value, ['a'])

  p.retry()
  check('retry reopens the question', p.phase.value, 'answering')

  p.choose('a')
  check('an option already tried is ignored', p.tried.value, ['a'])

  p.choose('b')
  check('right on the second go settles it', p.phase.value, 'revealed')
  check('and counts as correct', p.attempts.value[0].correct, true)
  check('both picks are recorded', p.attempts.value[0].tries, ['a', 'b'])
  check('the tally moves', p.correctCount.value, 1)
}

// --- with one option left there is nothing to choose ------------------------
{
  const p = start(question('q1', 'b'))

  p.choose('a')
  p.retry()
  p.choose('c')
  check('a second wrong pick settles it', p.phase.value, 'revealed')
  check('counted wrong', p.attempts.value[0].correct, false)
  check('both wrong picks recorded', p.attempts.value[0].tries, ['a', 'c'])
}

// --- giving up ---------------------------------------------------------------
{
  const p = start(question('q1', 'b'))

  p.choose('a')
  p.reveal()
  check('showing the answer settles it', p.phase.value, 'revealed')
  check('giving up counts wrong', p.attempts.value[0].correct, false)
  check('settled on the last pick', p.chosen.value, 'a')
}

// --- a two-option question can never offer a real second go ------------------
{
  const p = start(question('q1', 'b', ['a', 'b']))

  p.choose('a')
  check('two options: a wrong pick settles at once', p.phase.value, 'revealed')
  check('counted wrong', p.attempts.value[0].correct, false)
}

// --- right first time is untouched -------------------------------------------
{
  const p = start(question('q1', 'b'))

  p.choose('b')
  check('right first time settles', p.phase.value, 'revealed')
  check('one try recorded', p.attempts.value[0].tries, ['b'])
  check('wasCorrect', p.wasCorrect.value, true)
}

// --- moving on and restarting both clear the tried list ----------------------
{
  const p = start(question('q1', 'b'), question('q2', 'a'))

  p.choose('a')
  p.retry()
  p.choose('b')
  p.next()
  check('next clears the tried list', p.tried.value, [])
  check('next reopens answering', p.phase.value, 'answering')

  p.choose('c')
  check('question two offers its own second go', p.phase.value, 'retry')

  p.restart({ shuffle: false })
  check('restart clears the tried list', p.tried.value, [])
  check('restart clears the attempts', p.attempts.value.length, 0)
  check('restart reopens answering', p.phase.value, 'answering')
}

// --- one attempt per question, however many tries ----------------------------
{
  const p = start(question('q1', 'b'), question('q2', 'a'))

  p.choose('a')
  p.retry()
  p.choose('b')
  p.next()
  p.choose('c')
  p.retry()
  p.choose('a')
  check('two questions, two attempts', p.attempts.value.length, 2)
  check('scored out of the question count', p.score.value, 100)
}

// --- an unfinished paper is kept, and picked back up ------------------------
{
  store.clear()
  const questions = [
    question('q1', 'b'),
    question('q2', 'a'),
    question('q3', 'c'),
    question('q4', 'a'),
  ]
  const paper = { id: 'paper', questions }

  const first = usePractice('paper', vue.ref(questions))
  first.choose('b')
  first.next()
  first.choose('a')
  first.next()

  const saved = loadResumeStates()
  check('the unfinished paper is stored', saved.length, 1)
  check('with the answers so far', saved[0].attempts.length, 2)
  check('and the order it was dealt in', [saved[0].shuffled, saved[0].seed], [false, 1])

  const offer = resumeFor(saved, paper, 4)
  check('and is offered back', offer !== null, true)

  // A fresh session, as if the tab had been closed and reopened.
  const second = usePractice('paper', vue.ref(questions))
  check('which starts at the beginning', second.index.value, 0)
  second.resumeFrom(offer)
  check('resumes at the next unanswered question', second.index.value, 2)
  check('with the score carried over', second.correctCount.value, 2)
  check('and a clean question in front of it', second.phase.value, 'answering')
  check('nothing half-tried carried across', second.tried.value, [])
}

// --- finishing clears it, so it is never offered afterwards ------------------
{
  store.clear()
  const questions = [question('q1', 'b'), question('q2', 'a')]
  const p = usePractice('paper', vue.ref(questions))

  p.choose('b')
  p.next()
  check('stored midway', loadResumeStates().length, 1)
  p.choose('a')
  p.next() // last question -> finish()
  check('finished', p.phase.value, 'finished')
  check('and no longer stored', loadResumeStates().length, 0)
}

// --- starting over drops it -------------------------------------------------
{
  store.clear()
  const questions = [question('q1', 'b'), question('q2', 'a'), question('q3', 'c')]
  const p = usePractice('paper', vue.ref(questions))

  p.choose('b')
  p.next()
  check('stored', loadResumeStates().length, 1)
  p.restart({ shuffle: false })
  check('restart drops it', loadResumeStates().length, 0)
}

// --- a shuffled paper resumes in the same order it was dealt ----------------
{
  store.clear()
  const questions = [
    question('q1', 'b'),
    question('q2', 'a'),
    question('q3', 'c'),
    question('q4', 'a'),
    question('q5', 'b'),
  ]
  const p = usePractice('paper', vue.ref(questions))
  p.restart({ shuffle: true })
  const dealt = p.questions.value.map((q) => q.id)
  p.choose(p.current.value.answer)
  p.next()
  p.choose(p.current.value.answer)
  p.next()

  const resumed = usePractice('paper', vue.ref(questions))
  resumed.resumeFrom(loadResumeStates()[0])
  check('same shuffled order after resuming', resumed.questions.value.map((q) => q.id), dealt)
  check('and the right question is next', resumed.current.value.id, dealt[2])
}

// --- entries that no longer fit their paper are refused ---------------------
{
  const questions = [question('q1', 'b'), question('q2', 'a'), question('q3', 'c')]
  const paper = { id: 'paper', questions }
  const base = {
    paperId: 'paper',
    attempts: [{ questionId: 'q1', chosen: 'b', correct: true, tries: ['b'] }],
    shuffled: false,
    seed: 1,
    total: 3,
    savedAt: '2026-08-12T09:00:00.000Z',
  }

  check('a good entry is offered', resumeFor([base], paper, 3) !== null, true)
  check('nothing answered yet', resumeFor([{ ...base, attempts: [] }], paper, 3), null)
  check('for a different paper', resumeFor([base], { ...paper, id: 'other' }, 3), null)
  check(
    'already at the end',
    resumeFor(
      [{ ...base, attempts: [base.attempts[0], base.attempts[0], base.attempts[0]] }],
      paper,
      3,
    ),
    null,
  )
  check('the paper has a different length now', resumeFor([base], paper, 4), null)
  check(
    'an answer names a question that no longer exists',
    resumeFor([{ ...base, attempts: [{ ...base.attempts[0], questionId: 'gone' }] }], paper, 3),
    null,
  )
}

// --- storage that cannot be trusted -----------------------------------------
{
  store.clear()
  store.set(RESUME_STORAGE_KEY, '{ not json')
  check('corrupt storage reads as empty', loadResumeStates(), [])

  store.set(RESUME_STORAGE_KEY, JSON.stringify([{ paperId: 'x' }, null, 42]))
  check('malformed entries are dropped', loadResumeStates(), [])
}

// --- redoing only the ones that were missed ---------------------------------
{
  store.clear()
  const questions = [
    question('q1', 'a'),
    question('q2', 'a'),
    question('q3', 'a'),
    question('q4', 'a'),
  ]
  const p = usePractice('paper', vue.ref(questions))

  // Right, wrong, right, wrong. Each wrong needs two picks to settle.
  p.choose('a')
  p.next()
  p.choose('b')
  p.retry()
  p.choose('c')
  p.next()
  p.choose('a')
  p.next()
  p.choose('b')
  p.retry()
  p.choose('c')
  p.next()

  check('the run is over', p.phase.value, 'finished')
  check('two were missed', p.wrongIds.value, ['q2', 'q4'])
  check('a redo is offered', p.canReplayWrong.value, true)
  check('scored over the whole paper', p.score.value, 50)
  check('the paper result was recorded', JSON.parse(store.get(PROGRESS_KEY)).length, 1)

  p.replayWrong()
  check('the redo holds only the missed ones', p.questions.value.map((q) => q.id), ['q2', 'q4'])
  check('starting at the first of them', p.current.value.id, 'q2')
  check('with a clean slate', [p.attempts.value.length, p.correctCount.value], [0, 0])
  check('and its own length', p.total.value, 2)

  // Get one right, miss the other again.
  p.choose('a')
  p.next()
  p.choose('b')
  p.retry()
  p.choose('c')
  p.next()
  check('the redo ends', p.phase.value, 'finished')
  check('still one missed', p.wrongIds.value, ['q4'])

  // The heart of it: a redo is not a run of the paper.
  check(
    'the redo is NOT recorded as a paper result',
    JSON.parse(store.get(PROGRESS_KEY)).length,
    1,
  )
  check('and left no unfinished paper behind', loadResumeStates().length, 0)

  // Drill again, and get it right this time.
  p.replayWrong()
  check('drilling narrows further', p.questions.value.map((q) => q.id), ['q4'])
  p.choose('a')
  p.next()
  check('nothing left to drill', p.canReplayWrong.value, false)
  check('still just the one paper result', JSON.parse(store.get(PROGRESS_KEY)).length, 1)
}

// --- a clean sheet offers no redo -------------------------------------------
{
  store.clear()
  const questions = [question('q1', 'a'), question('q2', 'b')]
  const p = usePractice('paper', vue.ref(questions))
  p.choose('a')
  p.next()
  p.choose('b')
  p.next()
  check('all correct', p.score.value, 100)
  check('no redo offered', p.canReplayWrong.value, false)
  p.replayWrong()
  check('and calling it anyway does nothing', p.phase.value, 'finished')
}

// --- "the whole paper" means the whole paper --------------------------------
{
  store.clear()
  const questions = [question('q1', 'a'), question('q2', 'a'), question('q3', 'a')]
  const p = usePractice('paper', vue.ref(questions))
  p.choose('b')
  p.retry()
  p.choose('c')
  p.next()
  p.choose('a')
  p.next()
  p.choose('a')
  p.next()

  p.replayWrong()
  check('focused on one question', p.total.value, 1)
  p.restart({ shuffle: false })
  check('restart returns to the whole paper', p.total.value, 3)
  check('at question one', p.index.value, 0)
}

// --- a redo of a shuffled run keeps the order it was seen in ----------------
{
  store.clear()
  const questions = Array.from({ length: 6 }, (_, i) => question(`q${i + 1}`, 'a'))
  const p = usePractice('paper', vue.ref(questions))
  p.restart({ shuffle: true })
  const dealt = p.questions.value.map((q) => q.id)

  // Miss the 2nd and 5th as dealt.
  dealt.forEach((_, i) => {
    if (i === 1 || i === 4) {
      p.choose('b')
      p.retry()
      p.choose('c')
    } else {
      p.choose('a')
    }
    p.next()
  })

  const missed = [dealt[1], dealt[4]]
  check('the right two were missed', p.wrongIds.value, missed)
  p.replayWrong()
  check('the redo follows the dealt order', p.questions.value.map((q) => q.id), missed)
}

console.log(failures ? `\n${failures} FAILED` : '\nAll checks passed.')
process.exit(failures ? 1 : 0)
