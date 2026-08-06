<script setup lang="ts">
const { t } = useI18n()
const sections = useLocalizedSections('privacy.sections')

usePageSeo(
  () => t('privacy.seo.title'),
  () => t('privacy.seo.description'),
)
</script>

<template>
  <div>
    <PageHero
      :eyebrow="$t('privacy.hero.eyebrow')"
      :title="$t('privacy.hero.title')"
      :lead="$t('privacy.hero.lead')"
    />
    <section class="container-narrow page">
      <LegalDocument :sections="sections" :updated="$t('privacy.updated')" />
    </section>
  </div>
</template>

<style scoped lang="scss">
.page {
  padding-bottom: 3rem;
}
</style>
