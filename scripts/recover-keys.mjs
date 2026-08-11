// =============================================================================
// Recover answer keys the pixel reader missed, from the .docx XML.
//
// A question is held back when the highlight could not be read off the rendered
// page. But the .docx still carries that highlight as markup, and for a question
// whose options are all words we can find them there — matching the ordered
// triple of option texts, which is distinctive enough not to be guessing.
//
// Anything recovered is written to content/overrides/<paper>.json, which
// `pnpm soal:import` applies on the next run. Nothing here edits the generated
// data directly: the import stays reproducible from the sources.
//
// Run: node scripts/recover-keys.mjs [--write]
// =============================================================================
import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { paragraphsOf, markedIndexFor, normalise } from './lib/docx-key.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const write = process.argv.includes('--write')

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const sources = JSON.parse(await readFile(join(root, 'content', 'sources.json'), 'utf8'))
let recovered = 0
let stillOpen = 0

for (const source of sources.papers) {
  const paper = JSON.parse(
    await readFile(join(root, 'content', 'generated', 'papers', `${source.id}.json`), 'utf8'),
  )
  const open = paper.questions.filter((question) => !question.answer)
  if (!open.length) continue

  const paragraphs = await paragraphsOf(source.docx)
  const patch = {}

  for (const question of open) {
    // Needs a full set of word options, and every option present.
    const usable =
      question.options.length >= 3 && question.options.every((option) => normalise(option.text))
    if (!usable) {
      stillOpen += 1
      continue
    }
    const index = markedIndexFor(paragraphs, question.options.map((o) => o.text))
    if (index === null) {
      stillOpen += 1
      continue
    }
    patch[String(question.n)] = { answer: question.options[index].key }
    recovered += 1
    console.log(
      `${source.id} Q${question.n} -> ${question.options[index].key} ("${question.options[index].text}")`,
    )
  }

  if (write && Object.keys(patch).length) {
    const path = join(root, 'content', 'overrides', `${source.id}.json`)
    const existing = (await exists(path)) ? JSON.parse(await readFile(path, 'utf8')) : {}
    const merged = {
      ...existing,
      questions: { ...(existing.questions ?? {}), ...patch },
    }
    await mkdir(join(root, 'content', 'overrides'), { recursive: true })
    await writeFile(path, `${JSON.stringify(merged, null, 2)}\n`)
  }
}

console.log(
  `\n${recovered} key(s) recoverable from the .docx; ${stillOpen} still have no readable answer.`,
)
if (!write) console.log('Dry run — pass --write to save the overrides.')
