<script setup lang="ts">
const { t } = useI18n()
const sections = useLocalizedSections('terms.sections')

usePageSeo(
  () => t('terms.seo.title'),
  () => t('terms.seo.description'),
)
</script>

<template>
  <div>
    <PageHero
      :eyebrow="$t('terms.hero.eyebrow')"
      :title="$t('terms.hero.title')"
      :lead="$t('terms.hero.lead')"
    />
    <section class="container-narrow page">
      <LegalDocument :sections="sections" :updated="$t('terms.updated')" />
    </section>
  </div>
</template>

<style scoped lang="scss">
.page {
  padding-bottom: 3rem;
}
</style>
