<script setup lang="ts">
import { BRAND } from '~/config/brand.config'

// The localized head tags — <html lang>, hreflang alternates, canonical and
// og:locale — are emitted by @nuxtjs/i18n itself (i18n.experimental.strictSeo in
// nuxt.config), which is why this file does not call useLocaleHead().
useHead({
  titleTemplate: (title) => (title ? `${title} — ${BRAND.name}` : BRAND.name),
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
