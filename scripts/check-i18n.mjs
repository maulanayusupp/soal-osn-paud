// =============================================================================
// Locale parity check. Fails loudly when ID and EN drift apart — a missing key
// renders as a raw path in the UI, which is worse than an untranslated string.
//
// Run: pnpm i18n:check
// =============================================================================
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LOCALES = ['id', 'en']

/** Flatten a nested message object into dotted key paths (arrays included). */
function flatten(value, prefix = '', out = new Map()) {
  for (const [key, entry] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (entry && typeof entry === 'object') flatten(entry, path, out)
    else out.set(path, entry)
  }
  return out
}

/** Interpolation placeholders such as {value}. Both locales must use the same. */
function placeholders(text) {
  if (typeof text !== 'string') return ''
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort().join(',')
}

async function load(locale) {
  const file = resolve(root, `i18n/locales/${locale}.json`)
  return flatten(JSON.parse(await readFile(file, 'utf8')))
}

const [base, ...others] = await Promise.all(LOCALES.map(load))
const baseLocale = LOCALES[0]
const problems = []

others.forEach((other, index) => {
  const locale = LOCALES[index + 1]

  for (const key of base.keys()) {
    if (!other.has(key)) problems.push(`missing in ${locale}: ${key}`)
  }
  for (const key of other.keys()) {
    if (!base.has(key)) problems.push(`missing in ${baseLocale}: ${key}`)
  }
  for (const [key, value] of base) {
    if (!other.has(key)) continue
    const a = placeholders(value)
    const b = placeholders(other.get(key))
    if (a !== b) problems.push(`placeholder mismatch at ${key}: ${baseLocale}="${a}" ${locale}="${b}"`)
  }
})

if (problems.length > 0) {
  console.error(`✗ i18n parity failed (${problems.length} problem(s)):`)
  problems.forEach((problem) => console.error(`  - ${problem}`))
  process.exit(1)
}

console.log(`✓ i18n parity OK — ${base.size} keys in ${LOCALES.join(' / ')}`)
