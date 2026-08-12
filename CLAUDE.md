# CLAUDE.md — Project guide for AI assistants & contributors

> Keep this file in sync with reality. **Any change to code rules, features,
> pages, the import pipeline, or content MUST also update: this file, the
> compliance/legal pages, and BOTH i18n locales (`id` + `en`).** Hard project
> rule (see §Rules).

## What this is

**Kancil Pintar** is a browser-based practice app for the **OSN PAUD / TK**
practice papers. A parent picks a paper, the child answers one question per
screen, and the correct answer is marked immediately. Named after *si Kancil*,
the clever mouse-deer of Indonesian folk tales, who is also the mascot.

- **Not the organiser.** Independent, personal project. Not affiliated with,
  sponsored by, or endorsed by the OSN organisers — stated in the footer of
  every page and on `/kepatuhan`.
- **No accounts, no ads.** Practice history lives in the visitor's own
  `localStorage` and is never uploaded. Vercel Web Analytics + Speed Insights run
  **on the deployed site only** (`analyticsEnabled` is keyed off the `VERCEL` env
  var) — cookie-free, no cross-site tracking, and no practice content leaves the
  device. Documented on `/privasi` and `/kepatuhan`.
- **Aesthetic:** *paper jungle* — warm recycled-paper background, cut-paper
  cards with hairline ink borders and chunky offset shadows, leaf green / sun
  amber / river blue with a berry accent. Light theme only.
- **Content is honest / no over-claiming.** Every count on the site is computed
  from the data. No certification, ranking, award, or claim that practising here
  improves competition results.

## Stack (verified versions)

| Concern    | Choice                                              |
| ---------- | --------------------------------------------------- |
| Framework  | **Nuxt 4.5.2** (Vue 3.5, Nitro 2, Vite)             |
| Language   | TypeScript (strict)                                 |
| i18n       | `@nuxtjs/i18n` 10.6.0 — **ID (default)** + EN       |
| SEO        | `@nuxtjs/seo` 5.3.10 (sitemap, robots, schema.org)  |
| Styling    | **SCSS only** (`sass` 1.102.0), no inline CSS       |
| Favicons   | `favicons` 7.3.1 (build-time script)                |
| OG image   | `sharp` 0.35.3 (build-time script, raster PNG)      |
| Import     | poppler (`pdftohtml`, `pdftoppm`) + LibreOffice     |
| Typecheck  | `vue-tsc` 3.3 on **TypeScript 5.9** (see note)       |
| Node       | ≥ 20.11                                             |

> TypeScript is pinned to `5.x` on purpose: `vue-tsc` 3.3 resolves
> `typescript/lib/tsc`, which TypeScript 7's native port no longer exports, so
> `pnpm typecheck` dies at startup on `typescript@7`.

## Commands

```bash
pnpm dev            # dev server
pnpm build          # production build (validated)
pnpm preview        # run the built server
pnpm favicons       # regenerate favicons from assets/favicon-source.svg
pnpm og             # regenerate public/og-image.png
pnpm i18n:check     # ID/EN key + placeholder parity (fails loudly on drift)
pnpm typecheck      # vue-tsc type check

pnpm soal:scan <source-root>    # re-index the source papers on disk
pnpm soal:import                # rebuild content/generated + public/soal from them
pnpm soal:check                 # audit + keys + pictures + completeness — run
                                #   after any pipeline change (§Verifying the bank)
pnpm soal:recover               # recover missed keys from the .docx (--write)
pnpm soal:review --unreached    # review sheets for whatever the checks missed
pnpm soal:proof <paper-id>      # visual proof sheet for one paper
```

## Directory map (Nuxt 4 `app/` srcDir)

```
app/
  app.vue                 # title template only (i18n owns the localized head)
  error.vue               # 404 / 500, with the mascot
  assets/scss/            # design system (see §Styling)
  components/             # auto-imported by FILENAME (pathPrefix: false)
    base/                 # BaseIcon, BaseButton, BaseCard, BaseBadge
    common/               # PageHero, SectionHeading, InfoNote, LegalDocument,
                          #   ConfirmDialog (native <dialog>)
    layout/               # AppHeader, AppFooter, BrandLogo, LanguageSwitcher
    mascot/               # MascotKancil (inline animated SVG)
    home/                 # HomeHero, LevelPicker, HowItWorks, FeatureGrid, CtaBand
    practice/             # PracticeStage (composition root), QuestionCard,
                          #   QuestionOptionButton, ProgressRail, ResultPanel,
                          #   PaperCard, PaperFilters
  composables/            # usePractice, useProgress, usePaperLabels, usePageSeo,
                          #   useFormat, useReveal, useLocalizedSections,
                          #   useSoundEffects, useLeaveGuard
  config/                 # STRUCTURE, not text: brand, navigation, practice
  layouts/default.vue     # skip link + header + <slot> + footer
  plugins/                # vercel-analytics.client.ts (deployed builds only)
  pages/                  # index, latihan/index, latihan/[paper], tentang,
                          #   kontak, kepatuhan, privasi, ketentuan
  services/               # catalog, practice (engine), progress
  types/index.ts          # shared domain types
  utils/                  # iconPaths (SVG registry), scroll
content/
  sources.json            # inventory of the source papers on disk (generated)
  overrides/<id>.json     # optional hand corrections, applied on import
  generated/              # catalog.json + papers/<id>.json — imported, not served
i18n/locales/{id,en}.json # ALL user-facing text (261 keys each)
public/soal/<id>/*.webp   # question illustrations (generated)
scripts/                  # import pipeline, proof sheets, favicons, og, i18n check
assets/favicon-source.svg # favicon source of truth
```

Components are auto-imported by **filename**, so folder names never appear in
tags: `<BaseButton>`, `<MascotKancil>`, `<PracticeStage>`.

## Architecture conventions

- **Config → Services → Composables/Components.** Components never import
  `config/*` for text and never fetch a data path themselves; they read through
  `services/*.service.ts`. Where the JSON lives on disk is one module's problem
  (`catalog.service.ts`).
- **Structure vs. text.** `config/*` holds ids, routes, thresholds and icons.
  Every human-readable string lives in i18n by key.
- **The practice engine is framework-free.** `services/practice.service.ts` is
  plain TypeScript (scoring, bands, seeded shuffle). `usePractice()` is the thin
  reactive wrapper that also writes the finished session to local storage.
- **Question data is imported, not fetched.** It lives in `content/generated/`
  (deliberately *not* `public/`) and is pulled in by `catalog.service.ts`: the
  catalogue as a plain import, the papers through `import.meta.glob`, which Vite
  splits into one lazily-loaded chunk each. It used to sit in `public/` behind
  `$fetch('/data/…')`, which worked in production and silently failed in dev —
  Vite serves `public/` there, so the server-side fetch found nothing and every
  count on the page rendered as a convincing zero. Importing makes a missing file
  a build error instead.
- **Scores are encouragement, not assessment.** `SCORE_BANDS` picks the mascot's
  reaction and the closing message. Never present a band as a grade.

## The import pipeline (why it works this way)

The 60 source papers are Word documents whose illustrations are *floating*
anchors, so the `.docx` XML says almost nothing about reading order. **The
printed page does.** Everything is therefore read off the rendered page.

| Concern | Decision |
| ------- | -------- |
| Geometry | `pdftohtml -xml -zoom 1.5` gives every text run and picture box. `pdftoppm -r 216` rasterises at exactly 2× that grid, so a box measured in one is readable in the other. |
| Structure | A "N." at the left margin starts a question; an indented "a."/"b."/"c." starts an option. The option column is found *relative* to the question column, because some papers indent one question's options twice as far as the last one's. |
| Side-by-side options | Options printed on one line ("a. ▢  b. ▢  c. ▢") arrive as a single merged text run. Splitting them by character offset does **not** work — poppler collapses the wide printed gaps, so the estimated columns sit far left and option a's picture is handed to option b. The pictures are the ruler instead: sort the row's pictures by x and cut at the widest gaps. The same measurement then tells the key reader where each letter really is (`markerHint`). |
| Picture ownership | A picture belongs to the band its **centre** lands in, with a 20-unit look-ahead for pictures centred on the marker's own line. Matching on "which marker does the box cover" fails: the source PNGs carry wide transparent margins, so a box reaches well past the visible artwork. |
| Figures beside the options | Many questions print the illustration to the LEFT of their options — a shape beside "a. b. c.", a boy beside a stacked a/b/c — and it lands on an option, offering the question itself as an answer. A picture whose right edge clears the option column entirely cannot be an option's, because artwork always reaches past its own letter; those go to the stem. **On a side-by-side row this also corrupted the key**: the row is cut into as many runs as there are options, so a fourth picture shifted every option one place left, and `markerHint` shifted with them, so the key reader sampled the *next* letter's swatch. Both key checks derive from those hints, so they agreed with each other and saw nothing. |
| Stem pictures reclaimed | A picture reaching past the next question's number may be that question's stem, printed above its own number with a deep transparent margin. Reclaimed only when it **fills at least half** the next question's stem region (its number to its first option). Overshoot alone cannot decide it — margin scales with the picture — but coverage separates the two cleanly: a real next-question stem covers 85–99% of that gap, a box that merely drifts in covers ~10%. Its crop is then floored at its own question number, since the overlap clip refuses to cut a box this deep. |
| Answer key | The authors highlighted the correct option — magenta almost everywhere, yellow on a few questions. It is read from the pixels, in a narrow strip at the option marker (the artwork starts ~25 units further right, so nothing coloured in a picture can be mistaken for a key). |
| Key erasure | The highlight is painted white **before** the pictures are cut, so it can never leak into what the child sees. |
| Season 4 finals | The shipped PDF is the clean student copy with no key at all. The key is read from a second render of the `.docx`, then merged by question number. |
| Papers with no PDF | Season 3 and Season 4's Babak Penyisihan ship `.docx` only. **LibreOffice** converts them. Word 365 for Mac no longer answers AppleScript `save as` (-1708), and Pages reflows the floating pictures so badly it loses half the highlights — both verified, both rejected. |
| Crop edges | A picture may only be trimmed by prose in the **outer fifths** of its box — the lower 40% or the top 20%. Its box carries wide transparent margins, so the paragraph it overlaps sits near its foot; clipping at any text run higher up sliced options down to a fragment — half an umbrella, the tip of a finger. Clipping anywhere further in sliced options down to a fragment; not clipping the top at all baked the descenders of the line above into the picture. |
| Overlapping pictures | Where two picture boxes overlap, the lower one's crop carries a sliver of the upper one's artwork. It is clipped below the overlapping neighbour, capped so at least 60% of the picture survives — chasing the fragment any harder guts the illustration. |
| Degenerate boxes | poppler reports some mirrored placements with a NEGATIVE width or height. Flipped back to their real extent, not discarded: left alone such a box wins the nearest-marker contest and then crops to nothing, so the option it claimed loses its picture. |
| Drafting noise | Options carry leftover keyboard-mash. The test is **no vowels at all**, never a low ratio — a quarter-vowel threshold deletes "Strawberry", "Black" and "Twenty". It only runs where the option also has a picture, so it cannot empty one. A picture-less option that is nothing but a short vowel-free scrap ("ff") makes the question incomplete instead, so it is held back rather than served with a stray for an answer. |
| Held-back questions | A question whose key or options could not be read in full is written to the JSON with `status: "needs-review"` and **never served**. A half-read question is worse for a five-year-old than a missing one. |

**Current state: 1,142 of 1,200 questions across all 60 papers are served.** The
remainder are questions the original paper left unmarked — spot-checked against
the printed pages, not assumed. Re-running `pnpm soal:import` is safe and
idempotent; `content/overrides/<id>.json` lets a human correction win over the
extractor.

### Verifying the bank

Four checks, each reaching something the others cannot. `pnpm soal:check` runs
all four; run it after touching the pipeline.

| Script | Asks |
| ------ | ---- |
| `audit-papers` | Does the data agree with the sources? Coverage from `pdftotext`, keys from the **Word XML**, plus integrity and asset checks. |
| `verify-keys` | Independent second opinion on every key: finds the highlight **blobs** and reports which marker each sits on, rather than sampling a strip beside each marker. Reaches the picture options the Word XML cannot. |
| `verify-pictures` | Is the artwork under letter "b" the artwork printed beside b? Both key checks assume the option assignment is right; this is the only one that tests it. |
| `verify-completeness` | Did every picture printed on the page actually arrive? The only check that starts at the **source** rather than at the extraction, which is why it caught what the other three could not. |

The first two share `scripts/lib/docx-key.mjs`; nothing re-implements it.

**Every check above starts from the extraction except the last.** Three of them
asked "is what we pulled out right?", and none asked "is any of it missing?" — so
a question that lost its picture, or had its options shifted along by one, looked
consistent to all three. That was the gap, and `verify-completeness` closes it by
counting from the page inwards.

Whatever the checks cannot confirm goes to `pnpm soal:review`, which lays the
questions out with their options and the key that was read. `soal:recover` goes
the other way: for a question the pixel reader could not resolve, it looks the
key up in the Word XML and writes an override.

False-alarm modes that cost real time and are worth not rediscovering. A check
that cries wolf is how the real defect gets missed, so each of these was fixed in
the check rather than tolerated:

- **Match a highlight blob to a marker by how much of its LINE BOX it covers**,
  not by its top edge and never by its centre. The centre sits half a line low,
  which is half the line spacing — "nearest marker" is then a coin flip, and it
  produced 40 phantom disagreements. The top edge is better but still wrong when
  a picture's box overlaps the option lines beneath it: the artwork-protection
  mask then blanks the top of a real swatch and slides it onto the next option.
- **Side-by-side options share one line box**, so y cannot separate them; they
  must be told apart by x.
- **Do not ask which question a picture's BOX sits in.** The boxes carry deep
  transparent margins and overlap each other — one question's crop can contain,
  pixel for pixel, the artwork of the question before it — so neither the box's
  centre, nor its bulk, nor even its ink bounds settle it. Two attempts at that
  test flagged 85 and then 35 correctly-placed questions. `verify-pictures`
  reports the pictures the importer *moved* instead, which is a claim it can
  stand behind.

## Styling (SCSS, no inline CSS — hard rule)

- `_variables.scss` (build-time) + `_mixins.scss` (`z()`, `respond-to`,
  `respond-below`, `container`, `paper`, `paper-quiet`, `focus-ring`, `eyebrow`,
  `section-padding`, `motion-safe`, `visually-hidden`, `gradient-text`) are
  injected into every component `<style>` via `nuxt.config` →
  `vite.css.preprocessorOptions.scss.additionalData`.
- Partials pulled into `main.scss` via `@use` **must `@use 'variables'/'mixins'`
  themselves** — additionalData only reaches Vite entry files.
- Runtime/theme values are **CSS custom properties** in `_tokens.scss`
  (`var(--c-leaf)`, `var(--grad-brand)`, `var(--c-subject-matematika)`, …).
- `@include paper` is the signature surface used by every boxed block.
- **Never** use `style="..."` for visual declarations. The **only** permitted
  `:style` use is passing **CSS custom properties** that scoped SCSS consumes —
  currently `--fill` (ProgressRail), `--card-accent` (BaseCard) and
  `--mascot-size` (MascotKancil).
- **Put plain declarations before nested media queries.** Sass emits a trailing
  declaration as a second rule *after* the query; at equal specificity it then
  wins at every width and silently cancels the responsive value.
- **`overflow: hidden`, not `clip`.** Safari only understands `clip` from 16.0,
  and an unknown value drops the whole declaration — the card would stop
  clipping altogether on an older iPad.

## The mascot

`MascotKancil.vue` is inline SVG, not an image file, so every part can be
animated and recoloured from the design tokens. Four moods — `idle`, `thinking`,
`cheer`, `oops` — matching the four moments of a session. **All motion is CSS**,
which is precisely why `prefers-reduced-motion` switches it off globally without
the component knowing anything about it. `PracticeStage` derives the mood from
session state rather than setting it by hand, so the two cannot disagree.

## Session behaviour on a phone

Most of a session happens on a phone held by a parent, so the small screen is
the primary target rather than an adaptation. Measured at 390x760, a question
and its page came to roughly 1.6 screens of content; the rules below bring the
average to 0.82, with the large majority of questions fitting one screen — and the
child never scrolls to continue.

- **Advancing scrolls back to the question.** "Next" is at the foot of the card,
  so the tap happens below the fold; without this the next question renders
  above the viewport and the child is left staring at answer buttons with no
  question in sight. `scrollToElement()` offsets by `--header-height` (the
  header is sticky and would otherwise cover the target) and honours
  `prefers-reduced-motion`. It fires on the last question too, so the result
  panel's headline is what comes into view.
- **Picture-only options lay out as a grid.** Three full-width pictures stacked
  were the single biggest source of scrolling in the app; two across a phone
  halves it, and a child compares pictures far more easily side by side — which
  is how the printed paper sets them out anyway. `PracticeStage` decides
  (`pictureOnly`) and passes `compact` to each option, which moves the letter
  above the picture so the picture gets the full width of a narrow cell.
- **The "next" bar pins to the bottom of a phone screen once an answer shows.**
  Otherwise it is scroll down past three answers to continue, then get scrolled
  back up for the new question — down, up, down, up, twenty times. It pins only
  in the `revealed` phase: while the question is still open, that space belongs
  to the question. The sticky containing block is `.stage`, so it settles back
  into place at the end of the question rather than following you into the site
  footer. It is one short row — mascot at 44px, feedback, button — because while
  pinned it floats over the card, and every millimetre of bar is a millimetre of
  answers hidden.
- **The paper page's eyebrow is hidden on a phone** — round and season are
  already in the heading below it. The question-number pill is **not**: the rail
  beside it shows the running score (`4 dari 19`), not the position, and hiding
  the pill left a parent reading the tally as the question number.
- **Leaving a part-answered paper asks first.** A session lives only in memory,
  and the menu sits directly above the question, so a mistaken tap is easy.
  `useLeaveGuard()` covers both exits: `onBeforeRouteLeave` for in-app
  navigation, which gets the app's own `ConfirmDialog`, and `beforeunload` for
  closing or reloading the tab, where the browser insists on its own wording.
  `PracticeStage` arms it through `usePracticeInProgress()` — shared state
  rather than a prop, since the component that knows and the component that
  guards are not parent and child. It disarms on finishing and on unmount.

## Sound

`useSoundEffects()` synthesises the right/wrong tones with the Web Audio API
rather than shipping audio files: two short tones cost nothing to download and
can be tuned in code. They are deliberately soft — this plays next to a small
child's ear over and over, and a harsh buzzer for a wrong answer teaches the
wrong thing. An `AudioContext` may only start from a user gesture, so it is
created on the first answer. The mute toggle sits next to the progress rail and
persists in `localStorage` (`SOUND_STORAGE_KEY`).

## Accessibility & motion

- Skip link, semantic landmarks, visible focus rings, real `<table>` markup for
  data, `aria-live` on the answer feedback, `role="progressbar"` on the rail.
- Answer outcomes are announced in text as well as colour, so nothing depends on
  telling green from red.
- `prefers-reduced-motion` is honoured globally in `_reset.scss`, by the
  `.reveal` utility, and by every mascot animation.
- No formal WCAG audit has been done, and `/kepatuhan` says so rather than
  claiming a conformance level.

## i18n

- Locales in `i18n/locales/{id,en}.json`; **ID is the default** (no prefix), EN
  lives under `/en/*` (`strategy: 'prefix_except_default'`).
- **English visitors get English slugs** (`/practice`, `/about`, `/compliance`),
  configured through `i18n.pages` in `nuxt.config`. Keys there are page file
  paths relative to `app/pages` without the extension (`latihan/index`).
- Keys mirror page/section structure. **Keep ID and EN in lockstep** — same keys,
  same interpolation placeholders (**261 keys each**). `pnpm i18n:check` verifies
  both and exits non-zero on drift.
- Legal/compliance prose is stored as an **array of sections** and read through
  `useLocalizedSections()`, so a section cannot quietly go missing from one
  language.
- **Question content is not translated.** An English paper stays in English and
  an Indonesian one stays in Indonesian — it is exam material, not interface
  text. Only the interface is bilingual.

## SEO

- Per-page: `usePageSeo(titleGetter, descGetter, { image, type, noindex })` —
  reactive to locale; sets title/description + OG + Twitter tags.
- Localized head tags (hreflang alternates, canonical, `<html lang>`, og:locale)
  are emitted by `@nuxtjs/i18n` itself via `i18n.experimental.strictSeo`. That
  option **forbids `useLocaleHead()`**, which is why `app.vue` only sets the
  title template.
- Structured data via `useSchemaOrg` (WebSite on home, Organization on about).
- Sitemap: `/` and the 60 paper pages are listed explicitly in `nuxt.config`,
  read from the generated catalogue. English paper URLs are spelled out rather
  than left to `_i18nTransform`, which only prefixes the locale and would emit
  `/en/latihan/<id>` — a 404, since the English slug is `/practice`.
- **og:image must stay raster** — crawlers do not render SVG. `public/og-image.png`
  (1200×630, ~49 KB) is generated by `pnpm og`.

## Rules (do not break)

1. **No inline CSS.** SCSS only, centralized as above (custom-property `:style`
   pass-through is the sole exception).
2. **Multilingual parity.** Update ID + EN together for every text change, and
   run `pnpm i18n:check`.
3. **Sync on change.** Every code/rule/feature change updates this file, the
   compliance/legal pages, and both locales.
4. **Evidence over assumption.** Verify versions, APIs and rendered output before
   relying on them.
5. **No over-claiming.** No fake certifications, awards, guarantees, rankings, or
   any claim that practising here improves competition results. Counts shown on
   the site must be computed from the data, never typed in.
6. **Never serve a half-read question.** If the key or an option could not be
   resolved, the question stays `needs-review` and out of the app.
7. **Never leak the answer key into an image.** The highlight is erased from the
   raster before any crop is written.
8. **Privacy by default.** No accounts, and no practice result ever leaves the
   device. Analytics are limited to anonymous page views on the deployed site.
   Any new third-party call goes on the privacy and compliance pages **in the
   same commit** that adds it.
9. **Respect the source.** The papers are third-party material used for study.
   Keep the non-affiliation notice and the takedown offer on every relevant page,
   and never ship the organiser's logo.
10. **Commits.** Author = **Maulana Yusup Abdullah <maulanayusupp@gmail.com>**.
    **No AI/Claude co-author trailer.** Commit **and push** after each change.

## Backlog

See [TODO.md](./TODO.md).
