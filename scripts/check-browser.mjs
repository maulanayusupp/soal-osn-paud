// =============================================================================
// Drive the built site in a real browser, at phone size.
//
// `pnpm practice:check` exercises the session state machine, but state is not
// what a five-year-old touches. This clicks the actual buttons in Chrome at
// 390x844 and reads back what is on the screen — which is the only way to catch
// a translation that never reaches the client, a button pushed off the edge, or
// an answer revealed a moment too early.
//
// No test framework and no driver package: Node's --experimental-websocket
// gives us a WebSocket, and Chrome speaks the DevTools Protocol over it. The
// server under test is the production build, started and stopped here.
//
// Run: pnpm build && pnpm browser:check
// =============================================================================
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 3777
const DEBUG_PORT = 9333
const BASE = `http://127.0.0.1:${PORT}`

/** Where Chrome lives. Playwright's cached build is used if it is there. */
const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function findChrome() {
  for (const path of CHROME_CANDIDATES) if (await exists(path)) return path
  return null
}

const chromePath = await findChrome()
if (!chromePath) {
  // Not a failure: a machine without Chrome can still run every other check.
  console.log('No Chrome found — skipping the browser checks.')
  process.exit(0)
}

if (!(await exists(join(root, '.output', 'server', 'index.mjs')))) {
  console.error('✗ No build to test. Run `pnpm build` first.')
  process.exit(1)
}

// --- the site under test -----------------------------------------------------

const server = spawn('node', [join(root, '.output', 'server', 'index.mjs')], {
  env: { ...process.env, PORT: String(PORT), NITRO_PORT: String(PORT) },
  stdio: 'ignore',
})

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(BASE)
      if (res.ok) return
    } catch {
      /* not up yet */
    }
    await sleep(250)
  }
  throw new Error('the built server did not start')
}
await waitForServer()

// --- the browser -------------------------------------------------------------

const profile = await mkdtemp(join(tmpdir(), 'kancil-browser-'))
const chrome = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  'about:blank',
])
chrome.stderr.on('data', () => {})

function shutdown(code) {
  chrome.kill()
  server.kill()
  process.exit(code)
}
process.on('SIGINT', () => shutdown(130))

async function pageSocket() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json()
      const page = list.find((target) => target.type === 'page')
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch {
      /* not up yet */
    }
    await sleep(250)
  }
  throw new Error('Chrome did not come up')
}

const ws = new WebSocket(await pageSocket())
await new Promise((r) => ws.addEventListener('open', r, { once: true }))

let nextId = 0
const pending = new Map()
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  const waiting = message.id && pending.get(message.id)
  if (!waiting) return
  pending.delete(message.id)
  message.error ? waiting.reject(new Error(JSON.stringify(message.error))) : waiting.resolve(message.result)
})

function send(method, params = {}) {
  const id = (nextId += 1)
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression: `(() => { ${expression} })()`,
    returnByValue: true,
    awaitPromise: true,
  })
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? 'page error')
  return result.value
}

const click = (selector, index = 0) =>
  evaluate(`document.querySelectorAll('${selector}')[${index}].click(); return true`)

await send('Page.enable')
await send('Runtime.enable')
// A phone, because that is where this is used.
await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
})

async function goto(path) {
  await send('Page.navigate', { url: `${BASE}${path}` })
  for (let i = 0; i < 80; i += 1) {
    await sleep(250)
    if (await evaluate(`return Boolean(document.querySelector('.option, .resume'))`)) {
      await sleep(600) // let hydration settle before clicking anything
      return
    }
  }
  throw new Error(`page never became interactive: ${path}`)
}

let failures = 0
function check(label, actual, expected) {
  const ok =
    expected instanceof RegExp
      ? expected.test(String(actual))
      : JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures += 1
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}: ${JSON.stringify(actual)}`)
}

// --- pick a paper with room for the whole flow -------------------------------

const catalog = JSON.parse(
  await readFile(join(root, 'content', 'generated', 'catalog.json'), 'utf8'),
)
const entry = catalog.papers.find((paper) => paper.playableCount >= 3 && paper.origin === 'osn')
if (!entry) {
  console.error('✗ no paper with at least three playable questions')
  shutdown(1)
}
const paper = JSON.parse(
  await readFile(join(root, 'content', 'generated', 'papers', `${entry.id}.json`), 'utf8'),
)
const playable = paper.questions.filter((question) => question.status === 'ok')
const [one, two] = playable
const wrongIndex = one.options.findIndex((option) => option.key !== one.answer)
const rightIndex = one.options.findIndex((option) => option.key === one.answer)

console.log(`\n${entry.id} — question ${one.n}, key "${one.answer}", 390x844\n`)

try {
  // --- a wrong answer keeps the question open ------------------------------
  await goto(`/latihan/${entry.id}`)
  check(
    'the prompt is translated',
    await evaluate(`return document.querySelector('.stage__says')?.textContent?.trim()`),
    /Pilih satu jawaban/,
  )

  await click('.option', wrongIndex)
  await sleep(400)
  const wrong = await evaluate(`
    return {
      says: document.querySelector('.stage__says')?.textContent?.trim(),
      buttons: [...document.querySelectorAll('.stage__actions button')].map(b => b.textContent.trim()),
      marked: [...document.querySelectorAll('.option')].map(o => o.className.match(/option--(\\w+)/)?.[1]),
      boxes: [...document.querySelectorAll('.stage__actions button')].map(b => {
        const r = b.getBoundingClientRect()
        return { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) }
      }),
      overflowsX: document.documentElement.scrollWidth > window.innerWidth,
    }
  `)

  // A raw key here would mean the locale never reached the browser — the whole
  // interface after the first click is rendered client-side.
  check('the feedback is translated, not a raw key', wrong.says, /^(?!practice\.)Belum tepat/)
  check('a second go is offered', wrong.buttons, ['Coba lagi', 'Lihat jawaban'])
  check('the wrong pick is marked wrong', wrong.marked[wrongIndex], 'wrong')
  check('the answer is NOT given away yet', wrong.marked.filter((m) => m === 'correct').length, 0)
  check('nothing overflows a 390px screen', wrong.overflowsX, false)
  check('both buttons are on screen', wrong.boxes.every((b) => b.left >= 0 && b.right <= 390), true)
  check('both buttons are tappable', wrong.boxes.every((b) => b.width >= 100), true)

  // --- taking it -------------------------------------------------------------
  await click('.stage__actions button', 0)
  await sleep(300)
  const retry = await evaluate(`
    return {
      says: document.querySelector('.stage__says')?.textContent?.trim(),
      disabled: [...document.querySelectorAll('.option')].map(o => o.disabled),
    }
  `)
  check('the question reopens', retry.says, /Pilih satu jawaban/)
  check('the option already tried stays locked', retry.disabled[wrongIndex], true)
  check('the rest are pickable', retry.disabled.filter((d) => !d).length, one.options.length - 1)

  await click('.option', rightIndex)
  await sleep(300)
  check(
    'getting it on the second go is praised',
    await evaluate(`return document.querySelector('.stage__says')?.textContent?.trim()`),
    /mencoba lagi/,
  )

  // --- two answers in, then come back ---------------------------------------
  await click('.stage__next')
  await sleep(400)
  await click('.option', two.options.findIndex((option) => option.key === two.answer))
  await sleep(300)
  await click('.stage__next')
  await sleep(400)

  check(
    'the unfinished paper is on the device',
    await evaluate(`
      const raw = localStorage.getItem('kancil-resume-v1')
      return raw ? JSON.parse(raw)[0].attempts.length : null
    `),
    2,
  )

  await goto(`/latihan/${entry.id}`)
  const panel = await evaluate(`
    const el = document.querySelector('.resume')
    if (!el) return null
    return {
      title: el.querySelector('.resume__title')?.textContent?.trim(),
      when: el.querySelector('.resume__when')?.textContent?.trim(),
      position: el.querySelector('.resume__position')?.textContent?.trim(),
      buttons: [...el.querySelectorAll('button')].map(b => b.textContent.trim()),
      questionShowing: Boolean(document.querySelector('.option')),
    }
  `)
  check('the choice is offered on the way back in', panel !== null, true)
  check('and it is translated', panel?.title, /Lanjutkan latihan ini/)
  check('it says when, with a time', panel?.when, /Terakhir dikerjakan hari ini pukul \d/)
  check('it says how far it got', panel?.position, /2 dari \d+ soal/)
  check('continue names the next question', panel?.buttons?.[0], /Lanjutkan dari soal 3/)
  check('starting over is the other choice', panel?.buttons?.[1], /Mulai dari awal/)
  check('the question waits for the decision', panel?.questionShowing, false)

  // --- continuing ------------------------------------------------------------
  await click('.resume button', 0)
  await sleep(400)
  const continued = await evaluate(`
    return {
      position: document.querySelector('.question__count-now')?.textContent?.trim() ?? null,
      panelGone: !document.querySelector('.resume'),
    }
  `)
  check('the panel gives way to the question', continued.panelGone, true)
  check('carrying on at question 3', continued.position, '3')

  // --- or not ----------------------------------------------------------------
  await goto(`/latihan/${entry.id}`)
  await click('.resume button', 1)
  await sleep(400)
  const restarted = await evaluate(`
    return {
      position: document.querySelector('.question__count-now')?.textContent?.trim() ?? null,
      stored: JSON.parse(localStorage.getItem('kancil-resume-v1') ?? '[]').length,
    }
  `)
  check('starting over goes back to question 1', restarted.position, '1')
  check('and the saved run is forgotten', restarted.stored, 0)
} catch (error) {
  failures += 1
  console.error(`\n✗ ${error.message}`)
}

console.log(failures ? `\n${failures} FAILED` : '\nAll browser checks passed.')
shutdown(failures ? 1 : 0)
