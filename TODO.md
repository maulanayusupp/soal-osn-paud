# TODO

Ordered roughly by value. Anything here that changes rules, features or content
must also update `CLAUDE.md`, the compliance pages, and both locales.

## Content quality

- [ ] **Review the 86 held-back questions.** They sit in
      `public/data/papers/*.json` with `status: "needs-review"`. Most are
      questions the original paper never marked an answer for; a handful lost an
      option to an unusual layout. Fix by adding `content/overrides/<id>.json`
      and re-running `pnpm soal:import`.
      Find them with:
      `node -e "…"` over the papers, or read the `warnings` array on each paper.
- [ ] **Human spot-check every paper.** `pnpm soal:proof <paper-id>` renders a
      sheet showing each question with its extracted options and the answer the
      pipeline read. Seasons 1–4 have been sampled, not exhaustively reviewed.
      Mark a paper `"verified": true` in its override file once checked.
- [ ] Strip the last of the drafting noise. A handful of options still carry
      keyboard-mash from the source ("assa", "ijuhyt") next to their picture; the
      vowel-ratio filter in `import-papers.mjs` catches most but not all.
- [ ] Some option images are cropped tighter than the printed original where a
      floating picture overlapped the following line. Worth an eye.

## Features

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

- [ ] Not deployed yet. `NUXT_PUBLIC_SITE_URL` defaults to
      `https://kancil-pintar.vercel.app`; set it to the real host before the
      first deploy, or the canonical and OG URLs will point at the wrong place.
- [ ] Verify link previews after deploying (WhatsApp / Facebook / X) — OG tags
      are server-rendered and `og:image` is an absolute https PNG, so it should
      work without a JS-executing crawler.
- [ ] Create the GitHub remote (`git@github.com:maulanayusupp/soal-osn-paud.git`)
      and push; the local repository is ready.
