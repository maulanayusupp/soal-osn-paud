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
- **No accounts, no ads, no analytics.** Practice history lives in the visitor's
  own `localStorage`. Nothing is uploaded.
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
| Node       | ≥ 20.11                                             |

## Commands

```bash
pnpm dev            # dev server
pnpm build          # production build (validated)
pnpm preview        # run the built server
pnpm favicons       # regenerate favicons from assets/favicon-source.svg
pnpm og             # regenerate public/og-image.png
pnpm i18n:check     # ID/EN key + placeholder parity (fails loudly on drift)
pnpm typecheck      # vue-tsc type check

node scripts/scan-sources.mjs   # re-index the source papers on disk
pnpm soal:import                # rebuild public/data + public/soal from them
pnpm soal:proof <paper-id>      # render a visual proof sheet of one paper
```

## Directory map (Nuxt 4 `app/` srcDir)

```
app/
  app.vue                 # title template only (i18n owns the localized head)
  error.vue               # 404 / 500, with the mascot
  assets/scss/            # design system (see §Styling)
  components/             # auto-imported by FILENAME (pathPrefix: false)
    base/                 # BaseIcon, BaseButton, BaseCard, BaseBadge
    common/               # PageHero, SectionHeading, InfoNote, LegalDocument
    layout/               # AppHeader, AppFooter, BrandLogo, LanguageSwitcher
    mascot/               # MascotKancil (inline animated SVG)
    home/                 # HomeHero, LevelPicker, HowItWorks, FeatureGrid, CtaBand
    practice/             # PracticeStage (composition root), QuestionCard,
                          #   QuestionOptionButton, ProgressRail, ResultPanel,
                          #   PaperCard, PaperFilters
  composables/            # usePractice, useProgress, usePaperLabels, usePageSeo,
                          #   useFormat, useReveal, useLocalizedSections
  config/                 # STRUCTURE, not text: brand, navigation, practice
  layouts/default.vue     # skip link + header + <slot> + footer
  pages/                  # index, latihan/index, latihan/[paper], tentang,
                          #   kontak, kepatuhan, privasi, ketentuan
  services/               # catalog, practice (engine), progress
  types/index.ts          # shared domain types
  utils/iconPaths.ts      # SVG path registry
content/
  sources.json            # inventory of the source papers on disk (generated)
  overrides/<id>.json     # optional hand corrections, applied on import
i18n/locales/{id,en}.json # ALL user-facing text (252 keys each)
public/data/              # catalog.json + papers/<id>.json (generated)
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
- **Question data is fetched, not bundled.** 1,200 questions would otherwise ship
  in the client bundle. `public/data/catalog.json` is small and loaded once; a
  paper's JSON is fetched only when it is opened.
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
| Side-by-side options | Options printed on one line arrive as a single merged text run; it is split back into letters and they are told apart by x instead of y. |
| Picture ownership | A picture belongs to the band its **centre** lands in, with a 20-unit look-ahead for pictures centred on the marker's own line. Matching on "which marker does the box cover" fails: the source PNGs carry wide transparent margins, so a box reaches well past the visible artwork. |
| Answer key | The authors highlighted the correct option — magenta almost everywhere, yellow on a few questions. It is read from the pixels, in a narrow strip at the option marker (the artwork starts ~25 units further right, so nothing coloured in a picture can be mistaken for a key). |
| Key erasure | The highlight is painted white **before** the pictures are cut, so it can never leak into what the child sees. |
| Season 4 finals | The shipped PDF is the clean student copy with no key at all. The key is read from a second render of the `.docx`, then merged by question number. |
| Papers with no PDF | Season 3 and Season 4's Babak Penyisihan ship `.docx` only. **LibreOffice** converts them. Word 365 for Mac no longer answers AppleScript `save as` (-1708), and Pages reflows the floating pictures so badly it loses half the highlights — both verified, both rejected. |
| Held-back questions | A question whose key or options could not be read in full is written to the JSON with `status: "needs-review"` and **never served**. A half-read question is worse for a five-year-old than a missing one. |

**Current state: 1,120 of 1,200 questions across all 60 papers are served.** The
remainder are mostly questions the original paper left unmarked. Re-running
`pnpm soal:import` is safe and idempotent; `content/overrides/<id>.json` lets a
human correction win over the extractor.

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

## The mascot

`MascotKancil.vue` is inline SVG, not an image file, so every part can be
animated and recoloured from the design tokens. Four moods — `idle`, `thinking`,
`cheer`, `oops` — matching the four moments of a session. **All motion is CSS**,
which is precisely why `prefers-reduced-motion` switches it off globally without
the component knowing anything about it. `PracticeStage` derives the mood from
session state rather than setting it by hand, so the two cannot disagree.

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
  same interpolation placeholders (**252 keys each**). `pnpm i18n:check` verifies
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
8. **Privacy by default.** No analytics, no accounts, no upload of results. New
   third-party calls go on the privacy and compliance pages first.
9. **Respect the source.** The papers are third-party material used for study.
   Keep the non-affiliation notice and the takedown offer on every relevant page,
   and never ship the organiser's logo.
10. **Commits.** Author = **Maulana Yusup Abdullah <maulanayusupp@gmail.com>**.
    **No AI/Claude co-author trailer.** Commit **and push** after each change.

## Backlog

See [TODO.md](./TODO.md).
