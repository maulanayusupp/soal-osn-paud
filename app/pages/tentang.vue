<script setup lang="ts">
import { BRAND, SOURCE } from '~/config/brand.config'
import { bankTotals, fetchCatalog } from '~/services/catalog.service'

const { t } = useI18n()
const localePath = useLocalePath()

const { data: catalog } = await useAsyncData('catalog', fetchCatalog)
const totals = computed(() => (catalog.value ? bankTotals(catalog.value) : null))

usePageSeo(
  () => t('about.seo.title'),
  () => t('about.seo.description'),
)

useSchemaOrg([
  defineWebPage({ '@type': 'AboutPage' }),
  defineOrganization({ name: BRAND.name }),
])

const sections = useLocalizedSections('about.sections')
</script>

<template>
  <div>
    <PageHero
      :eyebrow="$t('about.hero.eyebrow')"
      :title="$t('about.hero.title')"
      :lead="$t('about.hero.lead')"
    />

    <section class="container-narrow about">
      <div class="about__mascot">
        <MascotKancil mood="idle" :size="180" :label="$t('about.mascotAlt')" />
        <div>
          <h2 class="about__mascotTitle">{{ $t('about.mascot.title') }}</h2>
          <p>{{ $t('about.mascot.body') }}</p>
        </div>
      </div>

      <article v-for="section in sections" :key="section.heading" class="about__section">
        <h2>{{ section.heading }}</h2>
        <p v-for="paragraph in section.body" :key="paragraph">{{ paragraph }}</p>
      </article>

      <InfoNote tone="warn" class="about__note">
        <p>{{ $t('about.disclaimer', { organiser: SOURCE.organiser }) }}</p>
      </InfoNote>

      <dl v-if="totals" class="about__facts">
        <div v-for="fact in ['papers', 'questions', 'withheld']" :key="fact">
          <dt>{{ $t(`about.facts.${fact}`) }}</dt>
          <dd>{{ totals[fact as 'papers'] }}</dd>
        </div>
      </dl>

      <div class="about__actions">
        <BaseButton :to="localePath('latihan')" variant="primary">
          {{ $t('about.cta') }}
          <template #icon-right><BaseIcon name="arrowRight" :size="18" /></template>
        </BaseButton>
        <BaseButton :to="localePath('kepatuhan')" variant="secondary">
          {{ $t('nav.compliance') }}
        </BaseButton>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.about {
  display: grid;
  gap: 2rem;
  padding-bottom: 3rem;

  &__mascot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 1.5rem;
    padding: 1.5rem;
    @include paper;
  }

  &__mascotTitle {
    font-size: 1.25rem;
    margin-bottom: 0.35rem;
  }

  &__section {
    display: grid;
    gap: 0.6rem;

    h2 {
      font-size: 1.3rem;
    }
  }

  &__facts {
    display: grid;
    gap: 1rem;

    @include respond-to('sm') {
      grid-template-columns: repeat(3, 1fr);
    }

    div {
      padding: 1rem;
      text-align: center;
      @include paper-quiet;
    }

    dt {
      font-size: 0.85rem;
      color: var(--c-ink-soft);
    }

    dd {
      margin: 0.2rem 0 0;
      font-family: var(--font-display);
      font-size: 1.8rem;
      font-weight: 800;
      color: var(--c-ink);
    }
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
}
</style>
