# TODO

Ordered roughly by value. Anything here that changes rules, features or content
must also update `CLAUDE.md`, the compliance pages, and both locales.

## Content quality

- [ ] **Review the 54 held-back questions.** They sit in
      `content/generated/papers/*.json` with `status: "needs-review"`. Spot-checking
      says most are questions the original paper simply never marked. Everything
      recoverable from the .docx has already been recovered by
      `node scripts/recover-keys.mjs --write`; what remains needs a human to read
      the printed page and add `content/overrides/<id>.json` by hand.
- [ ] **Human spot-check every paper.** `node scripts/audit-papers.mjs` already
      verifies coverage, integrity, assets, and 873 answer keys against the Word
      XML with no disagreements — but 273 picture-option keys cannot be checked
      that way and only a sample has been read by eye. `pnpm soal:proof <paper-id>`
      renders a sheet per paper for that. Mark a paper `"verified": true` in its
      override file once checked.
- [ ] Strip the last of the drafting noise. A handful of options still carry
      keyboard-mash from the source ("assa", "ijuhyt") next to their picture; the
      vowel-ratio filter in `import-papers.mjs` catches most but not all.
- [ ] 18 crops are still very small. Most are legitimate (solid colour squares
      for the pattern questions, printed sums), but a couple look tight —
      `s2-final-matematika-tk-a` Q12 and `s3-final-bahasa-inggris-tk-a` Q15 are
      the ones to look at.

## Features

- [x] Filters are kept in the URL, so back-navigation from a paper returns to
      the same narrowed list.
- [x] Mobile: picture options in a 2-up grid, pinned "next" bar, tighter chrome.
      Measured at 360px, an average question page went from ~1.6 screens to
      ~1.3. Worth re-measuring if the question card grows.
- [ ] Verify the mobile layout on a real handset. It was tuned by measuring
      rendered heights from the image dimensions and the CSS, not by looking at
      it — no browser was available in the session that built it.

- [ ] **Read-aloud button.** Web Speech API on the question prompt (id-ID and
      en-US voices) — the biggest single win for pre-readers.
- [ ] **Mixed practice.** Draw N random questions across a level/subject instead
      of working one paper end to end.
- [ ] **Wrong-answers-only replay** after finishing a paper.
- [ ] Per-question progress on the paper cards (not just best score).
- [ ] Offline support via a service worker — the whole bank is static files, so
      this is mostly configuration.
- [ ] Parent view: which subjects come up short, based on local history only.

## Content coverage

- [ ] Add new seasons as they are published. Drop the files into the source
      folder, run `node scripts/scan-sources.mjs` then `pnpm soal:import`.
- [ ] Consider optional translations of question prompts, stored alongside the
      original rather than replacing it. Deliberately not done yet: exam wording
      is not interface text, and a loose translation would change the question.

## Engineering

- [ ] `pnpm typecheck` is not wired into a pre-commit hook yet.
- [ ] No test suite. `services/practice.service.ts` (scoring, bands, seeded
      shuffle) and the segmentation helpers in `scripts/lib/` are pure functions
      and the obvious place to start.
- [ ] Image weight: 1,593 WebP files, ~15 MB. Fine over HTTP/2, but a sprite or
      per-paper bundle would cut request count on slow connections.
- [ ] The import pipeline shells out to poppler and LibreOffice, so it only runs
      on a machine that has them. Document or containerise if anyone else needs
      to regenerate the data.

## Deployment

- [ ] `NUXT_PUBLIC_SITE_URL` defaults to `https://kancil-pintar.vercel.app`. If
      the site ever moves, set it, or the canonical and OG URLs point at the
      wrong host.
- [ ] Vercel Analytics and Speed Insights are wired up and switch on only when
      `VERCEL` is set in the environment, so they stay silent locally. Confirm
      data appears in the dashboard after the next deploy.
- [ ] Verify link previews after deploying (WhatsApp / Facebook / X) — OG tags
      are server-rendered and `og:image` is an absolute https PNG, so it should
      work without a JS-executing crawler.
- [ ] Create the GitHub remote (`git@github.com:maulanayusupp/soal-osn-paud.git`)
      and push; the local repository is ready.
