// =============================================================================
// Turning a rendered exam paper back into structured questions.
//
// The papers are Word documents whose illustrations are *floating* anchors, so
// the .docx XML says almost nothing about reading order. The printed page does.
// So the whole pipeline works off page geometry:
//
//   1. every "N." at the left margin starts a question;
//   2. every "a." / "b." / "c." one indent in starts an option;
//   3. a question's stem is everything between its number and its first option;
//   4. an illustration belongs to whichever band its vertical centre lands in.
//
// The answer key is the magenta highlight the paper authors left on the correct
// option — see detectAnswer() in import-papers.mjs.
// =============================================================================

/** Most frequent value in a list, rounded into 2-unit buckets. */
function mode(values) {
  const tally = new Map()
  for (const value of values) {
    const bucket = Math.round(value / 2) * 2
    tally.set(bucket, (tally.get(bucket) ?? 0) + 1)
  }
  let best = null
  let bestCount = -1
  for (const [bucket, count] of tally) {
    if (count > bestCount) {
      best = bucket
      bestCount = count
    }
  }
  return best ?? 0
}

const QUESTION_MARKER = /^(\d{1,2})\s*[.)]\s*(.*)$/
const OPTION_MARKER = /^([a-dA-D])\s*[.)]\s*(.*)$/

/** Every "a." / "b." … inside a run, wherever it sits. */
const INLINE_OPTION = /(?:^|\s)([a-dA-D])\s*[.)]/g

/**
 * Options printed side by side ("a. ▢  b. ▢  c. ▢") arrive as ONE text run,
 * because poppler merges runs that share a baseline. Split such a run back into
 * its letters, estimating each letter's x from its offset in the string — the
 * only positional information the merged run still carries.
 *
 * Returns null when the run holds at most one option letter.
 */
function splitInlineOptions(node) {
  const found = [...node.text.matchAll(INLINE_OPTION)]
  if (found.length < 2) return null

  // The letters must ascend — "a. … c." is a real pair (b is printed on its own
  // line below), while "a. … a." is prose that happens to contain a full stop.
  const letters = found.map((m) => m[1].toLowerCase())
  if (letters[0] !== 'a' && letters[0] !== 'b') return null
  for (let i = 1; i < letters.length; i += 1) {
    if (letters[i] <= letters[i - 1]) return null
  }

  const perChar = node.width / Math.max(1, node.text.length)
  return found.map((match, i) => {
    const start = match.index + match[0].length
    const stop = found[i + 1] ? found[i + 1].index : node.text.length
    return {
      value: letters[i],
      rest: node.text.slice(start, stop).trim(),
      left: node.left + match.index * perChar,
      width: Math.max(8, (stop - match.index) * perChar),
      inline: true,
    }
  })
}

/**
 * Locate the question-number column.
 *
 * Only the question column is fixed: the numbers always sit hard against the
 * left margin. Option letters are *not* — several papers indent a question's
 * options twice as far as the one above it (see Season 2 Sains PAUD Q9 vs Q8),
 * so options are recognised by being indented relative to the numbers rather
 * than by matching a column of their own.
 */
function findColumns(pages) {
  const questionLefts = []
  const optionLefts = []
  for (const page of pages) {
    for (const node of page.texts) {
      if (QUESTION_MARKER.test(node.text)) questionLefts.push(node.left)
      else if (OPTION_MARKER.test(node.text)) optionLefts.push(node.left)
    }
  }
  if (!questionLefts.length || !optionLefts.length) return null
  return { questionLeft: mode(questionLefts) }
}

const COLUMN_TOLERANCE = 14

/** How far right of the question number an option letter has to start. */
const OPTION_INDENT = 12

/**
 * Collect the markers in reading order across the whole document.
 * Each mark is `{ page, top, left, kind, value, rest, node }`.
 */
function collectMarks(pages, columns) {
  const marks = []

  pages.forEach((page, pageIndex) => {
    for (const node of page.texts) {
      const base = {
        page: pageIndex,
        top: node.top,
        left: node.left,
        width: node.width,
        height: node.height,
        node,
      }

      const question = QUESTION_MARKER.exec(node.text)
      if (question && Math.abs(node.left - columns.questionLeft) <= COLUMN_TOLERANCE) {
        marks.push({ ...base, kind: 'question', value: Number(question[1]), rest: question[2].trim() })
        continue
      }

      const option = OPTION_MARKER.exec(node.text)
      if (option && node.left >= columns.questionLeft + OPTION_INDENT) {
        const inline = splitInlineOptions(node)
        if (inline) {
          for (const part of inline) {
            marks.push({
              ...base,
              kind: 'option',
              value: part.value,
              rest: part.rest,
              left: part.left,
              width: part.width,
              inline: true,
            })
          }
        } else {
          marks.push({
            ...base,
            kind: 'option',
            value: option[1].toLowerCase(),
            rest: option[2].trim(),
          })
        }
      }
    }
  })

  marks.sort((a, b) => a.page - b.page || a.top - b.top || a.left - b.left)
  return marks
}

/** Bottom-most ink on a page, so the last band does not run into dead space. */
function contentBottom(page) {
  let bottom = 0
  for (const node of page.texts) bottom = Math.max(bottom, node.top + node.height)
  for (const image of page.images) bottom = Math.max(bottom, image.top + image.height)
  return bottom
}

/**
 * Split a paper into questions.
 *
 * Returns `{ questions, warnings }`. A warning never stops the import — it is
 * surfaced in the proof sheet so a human can look at that specific paper.
 */
export function segment(pages) {
  const warnings = []
  const columns = findColumns(pages)
  if (!columns) return { questions: [], warnings: ['no option markers found'] }

  const marks = collectMarks(pages, columns)

  // Keep only question markers that continue the 1,2,3… run. A stray "2." inside
  // a sentence at the left margin would otherwise open a bogus question.
  const ordered = []
  let expected = 1
  for (const mark of marks) {
    if (mark.kind === 'question') {
      if (mark.value !== expected) continue
      expected += 1
    }
    ordered.push(mark)
  }

  const questionMarks = ordered.filter((m) => m.kind === 'question')
  if (!questionMarks.length) return { questions: [], warnings: ['no question markers found'] }

  const questions = []

  questionMarks.forEach((mark, index) => {
    const next = questionMarks[index + 1]
    const start = { page: mark.page, top: mark.top }
    const end = next
      ? { page: next.page, top: next.top }
      : { page: pages.length - 1, top: contentBottom(pages[pages.length - 1]) + 4 }

    // Loosening the option column (above) lets an "a." that is really prose slip
    // in, so each letter is taken at most once and only the a, b, c… family
    // counts. Note the letters need not appear in document order: when options
    // are printed side by side the run reads "a. … c." with b on the line below.
    const options = []
    const claimed = new Set()
    for (const candidate of ordered) {
      if (candidate.kind !== 'option') continue
      if (!after(candidate, start) || !before(candidate, end)) continue
      if (claimed.has(candidate.value)) continue
      // No gaps: 'c' without 'a' means the "c." is prose.
      const expected = String.fromCharCode(97 + claimed.size)
      if (candidate.value < expected) continue
      claimed.add(candidate.value)
      options.push(candidate)
    }

    if (options.length < 2) warnings.push(`Q${mark.value}: only ${options.length} option(s)`)

    // Options stacked vertically get a band each; options printed side by side
    // share one band of page height and are told apart by x instead.
    const rows = []
    for (const option of options) {
      const row = rows[rows.length - 1]
      if (row && row[0].page === option.page && Math.abs(row[0].top - option.top) <= 6) {
        row.push(option)
      } else {
        rows.push([option])
      }
    }

    const bands = []
    bands.push({
      role: 'stem',
      key: null,
      from: start,
      to: rows.length ? { page: rows[0][0].page, top: rows[0][0].top } : end,
      xFrom: -Infinity,
      xTo: Infinity,
      textFrom: -Infinity,
      textTo: Infinity,
    })

    rows.forEach((row, rowIndex) => {
      const stop = rows[rowIndex + 1]
        ? { page: rows[rowIndex + 1][0].page, top: rows[rowIndex + 1][0].top }
        : end
      // Side-by-side options share one band; `siblings` lets assignImages split
      // the row's pictures between them by x afterwards.
      const siblings = []
      row.forEach((option, i) => {
        const band = {
          role: 'option',
          key: option.value,
          marker: option,
          from: { page: option.page, top: row[0].top },
          to: stop,
          // Pictures are shared out by splitSideBySideRows, which measures the
          // pictures themselves, so the band imposes no x limit on them.
          xFrom: -Infinity,
          xTo: Infinity,
          // TEXT still needs an x fence. Without one, the first option in a
          // side-by-side row collects the whole line — including the leftovers
          // of its neighbours' merged run, which surfaced as an option reading
          // literally "c.".
          textFrom: row.length > 1 && i > 0 ? option.left - 8 : -Infinity,
          textTo: row.length > 1 && row[i + 1] ? row[i + 1].left - 8 : Infinity,
          siblings,
        }
        siblings.push(band)
        bands.push(band)
      })
    })

    questions.push({
      n: mark.value,
      marker: mark,
      start,
      end,
      bands,
      optionKeys: options.map((o) => o.value),
    })
  })

  return { questions, warnings, columns, marks: ordered }
}

/** Position comparison helpers over `{ page, top }` cursors. */
export function after(a, b) {
  return a.page > b.page || (a.page === b.page && a.top >= b.top)
}
export function before(a, b) {
  return a.page < b.page || (a.page === b.page && a.top < b.top)
}

/**
 * The per-page slices a band covers: `[{ pageIndex, from, to }]`.
 * A band that straddles a page break yields one slice per page.
 */
export function bandSlices(band, pages) {
  const slices = []
  for (let pageIndex = band.from.page; pageIndex <= band.to.page; pageIndex += 1) {
    const page = pages[pageIndex]
    if (!page) break
    const from = pageIndex === band.from.page ? band.from.top : 0
    const to = pageIndex === band.to.page ? band.to.top : page.height
    if (to - from > 1) slices.push({ pageIndex, from, to })
  }
  return slices
}

/**
 * True when a picture is printed over this run, hiding it.
 *
 * Many papers carry keyboard-mash next to the options ("fghjkl", "gvdshb",
 * "vdcx") left over from drafting. It is invisible on paper because an
 * illustration sits on top of it — but it is still in the text layer, and
 * without this it would surface in the app as an answer choice.
 */
function hiddenByArt(node, page) {
  const area = Math.max(1, node.width * node.height)
  for (const image of page.images) {
    const overlapX =
      Math.min(node.left + node.width, image.left + image.width) - Math.max(node.left, image.left)
    const overlapY =
      Math.min(node.top + node.height, image.top + image.height) - Math.max(node.top, image.top)
    if (overlapX <= 0 || overlapY <= 0) continue
    if ((overlapX * overlapY) / area >= 0.8) return true
  }
  return false
}

/** Text inside a band, with the marker run itself already stripped. */
export function bandText(band, pages, markerNodes) {
  const parts = []
  // A side-by-side option carries its own words inside the merged run.
  if (band.role === 'option' && band.marker?.inline) {
    if (band.marker.rest) parts.push(band.marker.rest)
    return parts.join(' ').replace(/\s+/g, ' ').trim()
  }
  for (const slice of bandSlices(band, pages)) {
    const page = pages[slice.pageIndex]
    for (const node of page.texts) {
      const centre = node.top + node.height / 2
      const centreX = node.left + node.width / 2
      if (centre < slice.from || centre >= slice.to) continue
      if (centreX < band.textFrom || centreX >= band.textTo) continue
      // Only ever discard covered text from a band that still has its picture,
      // so this can never leave an option with nothing to show.
      if (!markerNodes.has(node) && band.imageGroups?.length && hiddenByArt(node, page)) {
        continue
      }
      if (markerNodes.has(node)) {
        if (band.role === 'option' || band.role === 'stem') {
          const marker =
            band.role === 'option' ? OPTION_MARKER.exec(node.text) : QUESTION_MARKER.exec(node.text)
          if (marker && marker[2]) parts.push(marker[2].trim())
        }
        continue
      }
      parts.push(node.text)
    }
  }
  return parts
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:?!])/g, '$1')
    .trim()
}

/**
 * How far above a marker a picture's centre may sit and still belong to it.
 * Covers the pictures Word centres *on* the marker's own line, whose centre
 * therefore lands a few units above it.
 */
const ANCHOR_LOOKAHEAD = 20

/**
 * Give every illustration on the page to exactly one band.
 *
 * Word anchors these pictures as floating shapes, so a picture straddles the
 * line it belongs to rather than following it — the dragonflies of question 17
 * start 41 units above the "17." itself. Tempting as it is to ask "which marker
 * does this picture cover", the answer is unreliable: the source PNGs carry wide
 * transparent margins, so a picture's reported box reaches well past the artwork
 * you can actually see and routinely covers the line above as well.
 *
 * What survives every layout in this corpus is the picture's *centre*: it lands
 * nearer its own line than any other. Pictures whose nearest line is further off
 * than MAX_ANCHOR_DISTANCE belong to nothing — that is the organiser's masthead
 * logo, and it is dropped.
 *
 * Mutates each band, setting `band.imageGroups = [{ pageIndex, images }]`.
 */
export function assignImages(pages, questions) {
  const bands = []
  for (const question of questions) {
    for (const band of question.bands) {
      band.imageGroups = []
      bands.push(band)
    }
  }
  // Document order: the bands already come out of segment() sorted, but be
  // explicit so this does not depend on the caller.
  bands.sort(
    (a, b) => a.from.page - b.from.page || a.from.top - b.from.top,
  )

  const push = (band, pageIndex, image) => {
    let group = band.imageGroups.find((g) => g.pageIndex === pageIndex)
    if (!group) {
      group = { pageIndex, images: [] }
      band.imageGroups.push(group)
    }
    group.images.push(image)
  }

  pages.forEach((page, pageIndex) => {
    for (const image of page.images) {
      const centre = { page: pageIndex, top: image.top + image.height / 2 }
      const centreX = image.left + image.width / 2
      const eligible = bands.filter((band) => centreX >= band.xFrom && centreX < band.xTo)

      // 1. A marker that starts just below the picture's centre: the picture is
      //    printed ON that line (question 17's dragonflies, whose centre sits
      //    4 units above the "17.").
      const upcoming = eligible
        .filter(
          (band) =>
            band.from.page === pageIndex &&
            band.from.top >= centre.top &&
            band.from.top - centre.top <= ANCHOR_LOOKAHEAD,
        )
        .sort((a, b) => a.from.top - b.from.top)
      if (upcoming.length) {
        push(upcoming[0], pageIndex, image)
        continue
      }

      // 2. Otherwise the band the picture is printed inside — which is what the
      //    eye reads, and what a picture between the prompt and option "a"
      //    means: it illustrates the question, not the option.
      const containing = eligible.filter(
        (band) => after(centre, band.from) && before(centre, band.to),
      )
      if (containing.length) {
        push(containing[containing.length - 1], pageIndex, image)
        continue
      }

      // 3. Above every band. Usually the organiser's masthead — but question 1
      //    has no question before it to catch a picture that hangs above its
      //    own number, and these boxes hang a long way: Season 4 Maths TK B
      //    prints its first sum as a 286-unit box whose transparent top margin
      //    reaches up over the masthead, putting its centre 39 units above the
      //    "1.". It was dropped, and question 1 asked for the sum of nothing.
      //
      //    The masthead never reaches down past the first question's number;
      //    artwork belonging to that question always does.
      const firstQuestion = questions[0]
      const firstStem = firstQuestion?.bands.find((band) => band.role === 'stem')
      if (
        firstStem &&
        pageIndex === firstQuestion.start.page &&
        image.top + image.height > firstQuestion.start.top
      ) {
        push(firstStem, pageIndex, image)
        firstStem.clipTop = firstQuestion.start.top
      }
      // 4. Otherwise it really is the masthead. Dropped.
    }
  })

  claimStemFigures(questions)
  splitSideBySideRows(questions)
  reclaimNextStemPictures(questions)
}

/**
 * Give back a picture that is really the NEXT question's stem.
 *
 * A question's bands run all the way down to the next question's number, and
 * these pictures carry deep transparent margins — so a stem picture printed
 * above its own "5." can have its centre land 30-odd units earlier, inside
 * question 4. The look-ahead that catches this for pictures sitting *on* a
 * marker line is far too small for one this tall.
 *
 * The tell is that the picture reaches *past* the next question's number: no
 * artwork of this question's does that, whichever band it landed in. Only
 * claimed when the next question has no stem picture of its own, so nothing is
 * ever stolen from a question that already has one.
 *
 * Every band is checked, not just the last option. A question whose options are
 * printed *below* its illustration puts the next question's stem picture into
 * this question's STEM band instead — and there it was left, merged into the
 * same crop as the real illustration, so the child saw two questions' artwork
 * stacked in one picture while the next question showed none at all.
 */
function reclaimNextStemPictures(questions) {
  questions.forEach((question, index) => {
    const next = questions[index + 1]
    if (!next) return

    const nextStem = next.bands.find((band) => band.role === 'stem')
    if (!nextStem || nextStem.imageGroups?.length) return

    for (const band of question.bands) {
      for (const group of band.imageGroups ?? []) {
        if (group.pageIndex !== next.start.page) continue
        const moving = group.images.filter(
          (image) =>
            image.top + image.height > next.start.top &&
            image.top < next.start.top &&
            fillsNextStemRegion(image, next),
        )
        if (!moving.length) continue

        group.images = group.images.filter((image) => !moving.includes(image))
        nextStem.imageGroups ??= []
        let target = nextStem.imageGroups.find((g) => g.pageIndex === group.pageIndex)
        if (!target) {
          target = { pageIndex: group.pageIndex, images: [] }
          nextStem.imageGroups.push(target)
        }
        target.images.push(...moving)
        // The box reaches up over the previous question, so its crop would carry
        // that question's artwork above its own. The overlap clip cannot help:
        // it refuses to cut when too little of the box would survive, and here
        // the real artwork IS only the bottom of it. This picture's own question
        // number is the honest floor — a stem illustration is printed below its
        // number, never above.
        nextStem.clipTop = next.start.top
      }

      if (band.imageGroups) {
        band.imageGroups = band.imageGroups.filter((group) => group.images.length)
      }
    }
  })
}

/**
 * Does this picture actually FILL the space where the next question prints its
 * illustration — between its number and its first option?
 *
 * "Reaches past the next question's number" is the right idea but far too eager
 * on its own: these boxes carry deep transparent margins, so the last option's
 * artwork routinely clears the number below it by a few units while belonging
 * squarely to the question above. Season 4 Sains PAUD question 12 lost its kiwi
 * that way — the box cleared question 13's number by 13 of its 176 units — and
 * the question was held back from the app for having an empty option c.
 *
 * Overshoot alone cannot separate the two, because the amount of margin scales
 * with the picture. Coverage can, and by a wide margin: measured across the
 * papers, a picture that really is the next question's stem covers 85–99% of
 * that gap, while one that merely drifts into it covers around 10%.
 */
function fillsNextStemRegion(image, next) {
  const firstOption = next.bands.find((band) => band.role === 'option')
  const regionTop = next.start.top
  const regionBottom = firstOption?.from.page === next.start.page ? firstOption.from.top : null
  // Nothing to measure against — a question whose options are on the next page.
  // Fall back to the plain overshoot test rather than guessing at a span.
  if (regionBottom === null || regionBottom <= regionTop) return true

  const overlap = Math.min(image.top + image.height, regionBottom) - Math.max(image.top, regionTop)
  return overlap / (regionBottom - regionTop) >= 0.5
}

/**
 * Share a side-by-side row's pictures out between its options.
 *
 * The row arrives as one band holding every picture on that line, because there
 * is no reliable x boundary to split on beforehand: poppler merges "a. b. c."
 * into a single run whose character offsets say nothing about the wide gaps
 * actually printed between the letters. Estimating from those offsets put the
 * boundaries far to the left and handed option a's picture to option b.
 *
 * The pictures themselves are the better ruler. Sort them left to right and cut
 * at the widest gaps: three pictures across a row are three options, whatever
 * the text run claims — once the question's own figure has been taken out of
 * the row, which `claimStemFigures` does first.
 */
function splitSideBySideRows(questions) {
  const done = new Set()

  for (const question of questions) {
    for (const band of question.bands) {
      const row = band.siblings
      if (!row || row.length < 2 || done.has(row)) continue
      done.add(row)

      const pooled = row.flatMap((sibling) => sibling.imageGroups ?? [])
      for (const sibling of row) sibling.imageGroups = []

      const images = pooled
        .flatMap((group) => group.images.map((image) => ({ image, pageIndex: group.pageIndex })))
        .sort((a, b) => a.image.left - b.image.left)
      if (!images.length) continue

      // Cut at the row's widest gaps until there are as many runs as options.
      const gaps = images
        .slice(1)
        .map((entry, i) => ({ at: i + 1, size: entry.image.left - images[i].image.left }))
        .sort((a, b) => b.size - a.size)
        .slice(0, row.length - 1)
        .map((gap) => gap.at)
        .sort((a, b) => a - b)

      let cut = 0
      for (const [index, entry] of images.entries()) {
        if (gaps.includes(index)) cut += 1
        const target = row[Math.min(cut, row.length - 1)]
        let group = target.imageGroups.find((g) => g.pageIndex === entry.pageIndex)
        if (!group) {
          group = { pageIndex: entry.pageIndex, images: [] }
          target.imageGroups.push(group)
        }
        group.images.push(entry.image)
      }

      // Where each letter is actually printed. The merged run only gives a
      // character-offset guess, which is what made the columns wrong in the
      // first place; the left edge of an option's own pictures is a real
      // measurement, and its letter sits just to the left of it.
      for (const sibling of row) {
        const own = sibling.imageGroups.flatMap((group) => group.images)
        if (own.length) sibling.markerHint = Math.min(...own.map((image) => image.left))
      }
    }
  }
}

/**
 * Take the question's own figure back off an option that cannot own it.
 *
 * Some questions print the figure to reason about beside their options rather
 * than above them — "break this shape down into its parts" with the shape to the
 * left of a, b, c; "what is Liam writing with?" with the boy to the left of a
 * stacked a/b/c. Either way the figure lands on an option, and the child is
 * offered the question itself as an answer.
 *
 * On a side-by-side row it also corrupts the key. The row is cut into as many
 * runs as there are options, so a fourth picture shifts every option one place
 * left, and `markerHint` — measured from these same pictures — shifts with them.
 * The key reader then samples the swatch beside the NEXT letter and stores the
 * answer one letter late. Both key checks derive from those hints, so they agree
 * with each other and report nothing: the blind spot they shared.
 * `verify-completeness.mjs` catches it from the other end, by starting at the
 * page and asking whether every printed picture arrived.
 *
 * The boundary is measurable. An option prints its letter as a text run, and
 * artwork always reaches well past its own letter — so a picture whose right
 * edge clears the letter entirely cannot belong to it. Inline markers are
 * excluded: their x is a character-offset guess, which is what made the columns
 * wrong in the first place.
 *
 * Runs before the row splitter, so the row it splits holds only real options.
 */
function claimStemFigures(questions) {
  for (const question of questions) {
    const stem = question.bands.find((band) => band.role === 'stem')
    if (!stem) continue

    for (const band of question.bands) {
      if (band.role !== 'option') continue

      const row = band.siblings?.length > 1 ? band.siblings : null
      // A side-by-side row has not been split yet, so all of its pictures sit in
      // one arbitrary sibling's band — comparing them against THAT letter moved
      // most of a row onto the stem. The row's leftmost letter is the column.
      const column = row
        ? Math.min(
            ...row.filter((sibling) => !sibling.marker?.inline).map((s) => s.marker.left),
          )
        : band.marker?.inline
          ? Number.NaN
          : band.marker.left
      if (!Number.isFinite(column)) continue

      for (const group of band.imageGroups ?? []) {
        const strays = group.images.filter((image) => image.left + image.width <= column)
        if (!strays.length) continue
        // On a side-by-side row the pictures ARE the options, so emptying it
        // would mean the measurement is at fault rather than the layout. A
        // stacked option holding nothing but the figure is the normal case.
        if (row && strays.length === group.images.length) continue

        group.images = group.images.filter((image) => !strays.includes(image))
        stem.imageGroups ??= []
        let target = stem.imageGroups.find((g) => g.pageIndex === group.pageIndex)
        if (!target) {
          target = { pageIndex: group.pageIndex, images: [] }
          stem.imageGroups.push(target)
        }
        target.images.push(...strays)
      }
    }
  }
}

/** The groups assigned to a band by assignImages(). */
export function bandImages(band) {
  return band.imageGroups ?? []
}
