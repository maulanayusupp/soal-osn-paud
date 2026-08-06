import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

// Shared SCSS (variables + mixins only — emits no CSS) injected into every
// component <style lang="scss">. Absolute path so Sass always resolves it.
const scssShared = fileURLToPath(new URL('./app/assets/scss/_shared.scss', import.meta.url))

const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'https://kancil-pintar.vercel.app'

// The paper pages are the bulk of the site and live behind a dynamic route, so
// the sitemap has to be told about them. Reading the generated catalogue here
// keeps the sitemap and the question bank from ever disagreeing — both come out
// of scripts/import-papers.mjs.
const catalogPath = fileURLToPath(new URL('./public/data/catalog.json', import.meta.url))
const paperIds: string[] = (() => {
  try {
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as {
      papers: { id: string; playableCount: number }[]
    }
    return catalog.papers.filter((paper) => paper.playableCount > 0).map((paper) => paper.id)
  } catch {
    // A fresh clone before `pnpm soal:import` has run — the site still builds.
    return []
  }
})()

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-01',
  devtools: { enabled: true },

  modules: ['@nuxtjs/i18n', '@nuxtjs/seo'],

  // Components are named by filename only, so folders never appear in tags.
  components: [{ path: '~/components', pathPrefix: false }],

  // One centralized SCSS entrypoint. No inline styles anywhere in the app.
  css: ['~/assets/scss/main.scss'],

  app: {
    head: {
      htmlAttrs: { lang: 'id' },
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;600;700&display=swap',
        },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
      meta: [
        { name: 'theme-color', content: '#fff8ec' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
    },
  },

  // @nuxtjs/seo site-wide identity (sitemap, robots, schema.org).
  site: {
    url: siteUrl,
    name: 'Kancil Pintar',
    description:
      'Kancil Pintar — latihan soal OSN PAUD, TK A dan TK B: matematika, sains dan bahasa Inggris, gratis dan tanpa iklan.',
    defaultLocale: 'id',
  },

  // Dynamic OG rendering needs a native renderer we do not bundle; the OG tags
  // are set by usePageSeo against a pre-generated raster (pnpm og).
  ogImage: { enabled: false },

  sitemap: {
    // '/' is not discovered automatically, and the paper pages sit behind a
    // dynamic route, so both are listed by hand.
    //
    // The English paper URLs are spelled out rather than left to
    // `_i18nTransform`: that only prefixes the locale, so on a dynamic route it
    // produces /en/latihan/<id> — a 404, because the English slug is /practice.
    urls: [
      { loc: '/', _i18nTransform: true },
      ...paperIds.flatMap((id) => [`/latihan/${id}`, `/en/practice/${id}`]),
    ],
  },

  i18n: {
    baseUrl: siteUrl,
    strategy: 'prefix_except_default',
    defaultLocale: 'id',
    locales: [
      { code: 'id', language: 'id-ID', name: 'Bahasa Indonesia', file: 'id.json', dir: 'ltr' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json', dir: 'ltr' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      redirectOn: 'root',
      alwaysRedirect: false,
    },
    // Indonesian slugs are the default; English visitors get English ones.
    customRoutes: 'config',
    // Keys are page file paths relative to app/pages, without the extension.
    pages: {
      'latihan/index': { id: '/latihan', en: '/practice' },
      'latihan/[paper]': { id: '/latihan/[paper]', en: '/practice/[paper]' },
      tentang: { id: '/tentang', en: '/about' },
      kontak: { id: '/kontak', en: '/contact' },
      kepatuhan: { id: '/kepatuhan', en: '/compliance' },
      privasi: { id: '/privasi', en: '/privacy' },
      ketentuan: { id: '/ketentuan', en: '/terms' },
    },
    experimental: {
      // Lets @nuxtjs/i18n own the localized head tags (hreflang alternates,
      // canonical, og:locale) instead of the app assembling them by hand — and
      // it then refuses useLocaleHead(), so the two can never both emit them.
      strictSeo: true,
    },
  },

  runtimeConfig: {
    public: {
      siteUrl,
      contactEmail: process.env.NUXT_PUBLIC_CONTACT_EMAIL || 'maulanayusupp@gmail.com',
    },
  },

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "${scssShared}" as *;`,
        },
      },
    },
  },

  typescript: {
    typeCheck: false,
    strict: true,
  },
})
