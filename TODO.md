# TODO

Ordered roughly by value. Anything here that changes rules, features or content
must also update `CLAUDE.md`, the compliance pages, and both locales.

## Content quality

- [ ] **Review the 58 held-back questions.** They sit in
      `content/generated/papers/*.json` with `status: "needs-review"`. Spot-checking
      says most are questions the original paper simply never marked. Everything
      recoverable from the .docx has already been recovered by
      `pnpm soal:recover --write`; what remains needs a human to read
      the printed page and add `content/overrides/<id>.json` by hand.
- [x] **Verify every served answer key.** 871 agree with the Word XML, 1,078 with
      independent blob analysis, and the rest were read against the printed page.
      Two keys were wrong and are fixed — `s2-final-matematika-tk-a` Q13 and
      `s3-penyisihan-matematika-tk-b` Q7, both questions that printed their
      figure on the option row, which shifted the options and the key together.
      `pnpm soal:check` re-runs all of it.
- [x] **Check that every printed picture arrived.** `verify-completeness` counts
      from the page inwards, which is what found the shifted-option bug the three
      extraction-side checks all agreed on. 50 questions were showing the
      question's own illustration as an answer; 6 more were held back for an
      empty option that had been taken from them.
- [ ] Mark reviewed papers `"verified": true` in their override file, so a future
      re-import can tell checked papers from unchecked ones.
- [ ] A handful of options still carry drafting noise ("ascxd", "Dcsa", "Sdefv")
      beside their picture. They contain vowels, so the filter spares them —
      deliberately, since tightening it far enough to catch them also catches
      "Hand", "Dog" and "Two". Cosmetic: picture and key were right in every
      case reviewed.
- [ ] Some stems still carry a sliver of the previous picture where the two
      boxes overlap by more than 40%. The clip is deliberately capped so it can
      never gut an illustration; going further needs per-pixel masking rather
      than a rectangle.
- [ ] A few crops are still tight — `s2-final-matematika-tk-a` Q12 and
      `s3-final-bahasa-inggris-tk-a` Q15.

## Features

- [x] Filters are kept in the URL, so back-navigation from a paper returns to
      the same narrowed list.
- [x] Mobile: picture options in a 2-up grid, pinned "next" bar, tighter chrome.
      Measured at 360px, an average question page went from ~1.6 screens to
      ~1.3. Worth re-measuring if the question card grows.
- [x] Verify the mobile layout in a browser. `pnpm browser:check` drives the
      built site in Chrome at 390x844 and asserts nothing overflows and every
      button lands on screen. Still worth a look on a real handset for feel —
      thumb reach and how the pinned bar sits are not things a headless run can
      judge — but it is no longer unmeasured.

- [x] **Hand-written papers.** `content/manual/<id>.json` + `pnpm soal:manual`,
      for questions with no printed source. Guide: `MENAMBAH-SOAL.md`.
- [x] **A second go at a wrong answer.** The pick is marked wrong, the right one
      stays hidden, and "Coba lagi" reopens the question; "Lihat jawaban" gives
      up. Not offered when only one option is left untried, since a forced tap
      would prove nothing. Driven by `pnpm practice:check`.
- [ ] **Read-aloud button.** Web Speech API on the question prompt (id-ID and
      en-US voices). **Parked on 12 Aug 2026 at the owner's request** — do not
      start it without being asked. Not a technical objection, so the note is
      only about who decides when.
- [x] **Resume an unfinished paper.** Settled answers are kept on the device;
      coming back offers "Lanjutkan dari soal N" or "Mulai dari awal", with the
      time it was last worked on. Covered by `practice:check` and `browser:check`.
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
- [ ] No test runner. `pnpm practice:check` drives the session state machine
      through jiti without one, which covers the branch a child actually feels,
      but `services/practice.service.ts` (scoring, bands, seeded shuffle) and the
      segmentation helpers in `scripts/lib/` are pure functions still uncovered —
      the obvious next step, and the point at which a real runner earns its keep.
- [ ] Image weight: 1,662 WebP files, ~17 MB. Fine over HTTP/2, but a sprite or
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
