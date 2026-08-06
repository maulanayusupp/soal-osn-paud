// =============================================================================
// Vercel Web Analytics + Speed Insights.
//
// Client-only, and only when actually deployed on Vercel — locally there is no
// endpoint to report to, and firing during development would put junk in the
// dashboard.
//
// Worth knowing for the privacy page: Vercel Analytics is cookie-free and does
// not track visitors across sites. It records the page path, referrer, and
// coarse device/country data, with no identifier that follows a person around.
// Nothing about a practice session — which paper, which answers, which score —
// is ever sent; that stays in localStorage as it always did.
// =============================================================================
import { inject as injectAnalytics } from '@vercel/analytics'
import { injectSpeedInsights } from '@vercel/speed-insights'

export default defineNuxtPlugin(() => {
  const { public: config } = useRuntimeConfig()
  if (!config.analyticsEnabled) return

  injectAnalytics({ mode: 'production' })
  injectSpeedInsights()
})
