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

const jiti = createJiti(root, { alias: { '~': join(root, 'app') }, interopDefault: true })
const { usePractice } = await jiti.import(join(root, 'app', 'composables', 'usePractice.ts'))

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

console.log(failures ? `\n${failures} FAILED` : '\nAll checks passed.')
process.exit(failures ? 1 : 0)
