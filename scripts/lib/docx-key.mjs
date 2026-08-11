// =============================================================================
// Reading the answer key out of the .docx XML.
//
// This is the second, independent opinion on every key: the importer reads the
// highlight off rendered pixels, this reads it out of Word's markup. They share
// no code, so agreement between them is real evidence.
//
// Shared by audit-papers, recover-keys and review-sheet, which all used to
// carry their own copy.
// =============================================================================
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

/**
 * Compare option text loosely: case, spacing, a leading option marker and
 * trailing punctuation all vary between the .docx and the printed page.
 */
export function normalise(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/^\s*[a-d]\s*[.)]\s*/, '')
    .replace(/[.,;:!?…]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Every non-empty paragraph of the .docx, in order, with its highlight state. */
export async function paragraphsOf(docxPath) {
  const { stdout } = await run('unzip', ['-p', docxPath, 'word/document.xml'], {
    maxBuffer: 64 * 1024 * 1024,
    encoding: 'buffer',
  })
  const xml = stdout.toString('utf8')
  const out = []

  for (const paragraph of xml.split('<w:p ').slice(1)) {
    let full = ''
    let highlighted = ''
    // Split on `<w:r>` AND `<w:r attr=...>`; Word writes revision ids on most
    // runs, and matching only the bare tag silently drops them. `<w:rPr>` is not
    // caught by this, since the character after `<w:r` there is `P`.
    for (const runXml of paragraph.split(/<w:r[ >]/).slice(1)) {
      const properties = runXml.slice(0, runXml.indexOf('</w:rPr>') + 1)
      let text = ''
      for (const match of runXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)) text += match[1]
      full += text
      if (/<w:highlight w:val="(magenta|yellow)"/.test(properties)) highlighted += text
    }
    const body = normalise(full)
    if (body) out.push({ text: body, marked: Boolean(highlighted.trim()) })
  }
  return out
}

/**
 * Which of these options the .docx highlights, or null when it is not certain.
 *
 * Matching the *ordered triple* of option texts rather than a single word is
 * what makes this reliable: "3" appears all over a maths paper, but
 * ["3", "4", "5"] in that order almost never appears twice. If it does, the
 * question is skipped rather than guessed at.
 */
export function markedIndexFor(paragraphs, optionTexts) {
  const wanted = optionTexts.map(normalise)
  if (wanted.some((text) => !text)) return null

  const starts = []
  for (let i = 0; i + wanted.length <= paragraphs.length; i += 1) {
    if (wanted.every((text, j) => paragraphs[i + j].text === text)) starts.push(i)
  }
  if (starts.length !== 1) return null

  const marked = []
  for (let j = 0; j < wanted.length; j += 1) {
    if (paragraphs[starts[0] + j].marked) marked.push(j)
  }
  return marked.length === 1 ? marked[0] : null
}
