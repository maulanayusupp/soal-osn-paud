// =============================================================================
// Per-page SEO. Reactive to locale, so switching language rewrites the tags.
// =============================================================================
interface PageSeoOptions {
  /** Absolute or root-relative image path. Defaults to the site OG raster. */
  image?: string
  type?: 'website' | 'article'
  noindex?: boolean
}

export function usePageSeo(
  title: () => string,
  description: () => string,
  options: PageSeoOptions = {},
) {
  const config = useRuntimeConfig()
  const siteUrl = config.public.siteUrl as string
  const image = computed(() => {
    const path = options.image ?? '/og-image.png'
    return path.startsWith('http') ? path : `${siteUrl}${path}`
  })

  useSeoMeta({
    title: () => title(),
    description: () => description(),
    ogTitle: () => title(),
    ogDescription: () => description(),
    ogType: options.type ?? 'website',
    ogImage: () => image.value,
    ogImageSecureUrl: () => image.value,
    ogImageType: 'image/png',
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageAlt: () => title(),
    twitterCard: 'summary_large_image',
    twitterTitle: () => title(),
    twitterDescription: () => description(),
    twitterImage: () => image.value,
    robots: options.noindex ? 'noindex, nofollow' : undefined,
  })
}
