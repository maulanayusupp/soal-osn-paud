<script setup lang="ts">
import { bankTotals, countBy, fetchCatalog } from '~/services/catalog.service'
import { BRAND, SOURCE } from '~/config/brand.config'

const { t } = useI18n()

// The catalogue is a small static file; fetching it here keeps the numbers on
// this page and the numbers in the bank the same numbers.
const { data: catalog } = await useAsyncData('catalog', fetchCatalog)

const totals = computed(() => (catalog.value ? bankTotals(catalog.value) : null))
const levelCounts = computed(() =>
  catalog.value ? countBy(catalog.value.papers, 'level') : {},
)

usePageSeo(
  () => t('home.seo.title'),
  () => t('home.seo.description'),
)

useSchemaOrg([
  defineWebSite({ name: BRAND.name }),
  defineWebPage({ '@type': 'CollectionPage' }),
])

const { root } = useReveal()
</script>

<template>
  <div ref="root">
    <HomeHero :questions="totals?.playable ?? 0" :papers="totals?.papers ?? 0" />

    <section class="section container">
      <SectionHeading
        centred
        :eyebrow="$t('home.levels.eyebrow')"
        :title="$t('home.levels.title')"
        :lead="$t('home.levels.lead')"
      />
      <LevelPicker :counts="levelCounts" />
    </section>

    <section class="section container">
      <SectionHeading
        :eyebrow="$t('home.steps.eyebrow')"
        :title="$t('home.steps.title')"
        :lead="$t('home.steps.lead')"
      />
      <HowItWorks />
    </section>

    <section class="section container">
      <SectionHeading
        :eyebrow="$t('home.features.eyebrow')"
        :title="$t('home.features.title')"
      />
      <FeatureGrid />
    </section>

    <section class="section container">
      <div class="stats reveal">
        <div v-for="stat in ['papers', 'questions', 'seasons', 'subjects']" :key="stat" class="stats__item">
          <span class="stats__value">{{ totals?.[stat as 'papers'] ?? 0 }}</span>
          <span class="stats__label">{{ $t(`home.stats.${stat}`) }}</span>
        </div>
      </div>
      <InfoNote class="stats__note">
        <p>{{ $t('home.stats.note', { organiser: SOURCE.organiser }) }}</p>
      </InfoNote>
    </section>

    <section class="section">
      <CtaBand />
    </section>
  </div>
</template>

<style scoped lang="scss">
.stats {
  display: grid;
  gap: 1rem;
  margin-bottom: 1.25rem;

  @include respond-to('sm') {
    grid-template-columns: repeat(2, 1fr);
  }

  @include respond-to('lg') {
    grid-template-columns: repeat(4, 1fr);
  }

  &__item {
    display: grid;
    gap: 0.15rem;
    padding: 1.25rem;
    text-align: center;
    @include paper;
  }

  &__value {
    font-family: var(--font-display);
    font-size: clamp(2rem, 1.6rem + 1.6vw, 2.8rem);
    font-weight: 800;
    line-height: 1;
    @include gradient-text;
  }

  &__label {
    font-size: 0.9rem;
    color: var(--c-ink-soft);
  }

  &__note {
    margin-top: 1.25rem;
  }
}
</style>
