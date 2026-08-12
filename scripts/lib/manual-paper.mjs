// =============================================================================
// Hand-written question papers: content/manual/<id>.json
//
// The import pipeline reads questions off printed exam papers. There is no
// printed page behind a set of sums a parent wrote for their own child, so those
// are authored directly, in a deliberately smaller shape than the generated one:
// no bands, no crops, no masthead, no status to reason about.
//
// Everything here is validation. A hand-written file is the one input to this
// project a human types, so it is the one input that can hold a typo — a key
// that matches no option, two options lettered "b", a picture path that does not
// exist. Each of those would surface as a question a child cannot answer, so
// they are refused at import with a message naming the file and the question,
// rather than written out and discovered later.
//
// See MENAMBAH-SOAL.md for the authoring guide.
// =============================================================================
import { readdir, readFile, access } from 'node:fs/promises'
import { join } from 'node:path'

const SUBJECTS = ['matematika', 'sains', 'bahasa-inggris']
const LEVELS = ['paud', 'tk-a', 'tk-b']
const OPTION_KEYS = ['a', 'b', 'c', 'd']

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/** Collects failures with enough context to fix them without guessing. */
class Complaints {
  constructor(file) {
    this.file = file
    this.list = []
  }

  at(where, message) {
    this.list.push(`${where}: ${message}`)
  }

  throwIfAny() {
    if (!this.list.length) return
    throw new Error(`${this.file}\n    - ${this.list.join('\n    - ')}`)
  }
}

/**
 * Validate one authored paper and expand it into the shape the app reads.
 *
 * `id` comes from the filename, so it cannot disagree with anything.
 */
function build(id, raw, file, takenIds) {
  const problems = new Complaints(file)

  if (takenIds.has(id)) {
    problems.at('id', `"${id}" is already an imported OSN paper — rename the file`)
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    problems.at('id', `"${id}" must be lower-case letters, digits and hyphens`)
  }

  const title = typeof raw.title === 'string' ? raw.title.trim() : ''
  if (!title) problems.at('title', 'required, and must be a non-empty string')

  if (!SUBJECTS.includes(raw.subject)) {
    problems.at('subject', `must be one of ${SUBJECTS.join(', ')} (got ${JSON.stringify(raw.subject)})`)
  }
  if (!LEVELS.includes(raw.level)) {
    problems.at('level', `must be one of ${LEVELS.join(', ')} (got ${JSON.stringify(raw.level)})`)
  }

  if (!Array.isArray(raw.questions) || !raw.questions.length) {
    problems.at('questions', 'required, and must hold at least one question')
    problems.throwIfAny()
  }

  const images = []
  const seenNumbers = new Set()

  const questions = raw.questions.map((question, index) => {
    // Number them from the file's order when `n` is left out, so a short paper
    // does not have to carry bookkeeping the author gains nothing from.
    const n = typeof question.n === 'number' ? question.n : index + 1
    const where = `question ${n}`

    if (seenNumbers.has(n)) problems.at(where, 'two questions share this number')
    seenNumbers.add(n)

    const prompt = typeof question.prompt === 'string' ? question.prompt.trim() : ''
    const stemImages = Array.isArray(question.images) ? question.images : []

    if (!prompt && !stemImages.length) {
      problems.at(where, 'needs a prompt, a picture, or both')
    }

    const options = Array.isArray(question.options) ? question.options : []
    if (options.length < 2) {
      problems.at(where, `needs at least two options (got ${options.length})`)
    }

    const seenKeys = new Set()
    const built = options.map((option, optionIndex) => {
      // Letter them by position when omitted — a, b, c in the order written.
      const key = typeof option.key === 'string' ? option.key.trim() : OPTION_KEYS[optionIndex]
      const optionWhere = `${where} option ${key ?? optionIndex + 1}`

      if (!OPTION_KEYS.includes(key)) {
        problems.at(optionWhere, `letter must be one of ${OPTION_KEYS.join(', ')}`)
      }
      if (seenKeys.has(key)) problems.at(optionWhere, 'this letter is used twice')
      seenKeys.add(key)

      const text = typeof option.text === 'string' ? option.text.trim() : ''
      const optionImages = Array.isArray(option.images) ? option.images : []
      if (!text && !optionImages.length) {
        problems.at(optionWhere, 'needs text, a picture, or both')
      }

      images.push(...optionImages.map((src) => ({ src, where: optionWhere })))
      return { key, text: text || null, images: optionImages }
    })

    if (!question.answer) {
      problems.at(where, 'needs an "answer" naming the correct option')
    } else if (!built.some((option) => option.key === question.answer)) {
      problems.at(
        where,
        `answer "${question.answer}" matches no option (has ${built.map((o) => o.key).join(', ')})`,
      )
    }

    images.push(...stemImages.map((src) => ({ src, where })))

    return {
      id: `${id}-q${String(n).padStart(2, '0')}`,
      n,
      prompt: prompt || null,
      images: stemImages,
      options: built,
      answer: question.answer ?? null,
      // A hand-written question is either right or it is refused above; there is
      // no half-read state to represent, so nothing is ever held back.
      status: 'ok',
    }
  })

  return { problems, title, questions, images }
}

/**
 * Every paper under content/manual/, validated and expanded.
 *
 * `takenIds` are the OSN paper ids, so a filename cannot quietly shadow one and
 * have its questions overwritten by the next full import.
 */
export async function loadManualPapers(root, takenIds = new Set()) {
  const dir = join(root, 'content', 'manual')
  if (!(await exists(dir))) return { papers: [], errors: [] }

  const files = (await readdir(dir)).filter((name) => name.endsWith('.json')).sort()
  const papers = []
  const errors = []

  for (const file of files) {
    const id = file.replace(/\.json$/, '')
    let raw
    try {
      raw = JSON.parse(await readFile(join(dir, file), 'utf8'))
    } catch (error) {
      errors.push(`content/manual/${file}\n    - not valid JSON: ${error.message}`)
      continue
    }

    const { problems, title, questions, images } = build(id, raw, `content/manual/${file}`, takenIds)

    // A missing picture is checked last: it is the slowest test and the least
    // likely to be the author's only mistake.
    for (const { src, where } of images) {
      if (typeof src !== 'string' || !src.startsWith('/')) {
        problems.at(where, `picture path ${JSON.stringify(src)} must start with "/"`)
        continue
      }
      if (!(await exists(join(root, 'public', src.replace(/^\//, ''))))) {
        problems.at(where, `picture ${src} is not in public/`)
      }
    }

    try {
      problems.throwIfAny()
    } catch (error) {
      errors.push(error.message)
      continue
    }

    papers.push({
      id,
      origin: 'manual',
      title,
      season: null,
      round: null,
      subject: raw.subject,
      level: raw.level,
      printed: { title: null, level: null, date: null, raw: [] },
      layoutSource: 'manual',
      answerSource: 'manual',
      // Hand-written questions were read by a person by definition.
      verified: true,
      questionCount: questions.length,
      playableCount: questions.length,
      warnings: [],
      questions,
    })
  }

  return { papers, errors }
}

/** The catalogue row for a paper — identical in shape for both origins. */
export function catalogEntry(paper) {
  return {
    id: paper.id,
    origin: paper.origin,
    title: paper.title,
    season: paper.season,
    round: paper.round,
    subject: paper.subject,
    level: paper.level,
    printedDate: paper.printed.date,
    questionCount: paper.questionCount,
    playableCount: paper.playableCount,
    verified: paper.verified,
    warningCount: paper.warnings.length,
  }
}
