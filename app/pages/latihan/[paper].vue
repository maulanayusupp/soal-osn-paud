<script setup lang="ts">
import { fetchPaper } from '~/services/catalog.service'
import { SOURCE } from '~/config/brand.config'

const route = useRoute()
const { t } = useI18n()
const localePath = useLocalePath()
const paperId = computed(() => String(route.params.paper))

const { data: paper, error } = await useAsyncData(
  () => `paper-${paperId.value}`,
  () => fetchPaper(paperId.value),
)

if (error.value || !paper.value) {
  throw createError({ statusCode: 404, statusMessage: 'Paper not found', fatal: true })
}

const { subjectLabel, levelLabel, roundLabel } = usePaperLabels()

const heading = computed(() =>
  paper.value
    ? t('paper.fullTitle', {
        subject: subjectLabel(paper.value.subject),
        level: levelLabel(paper.value.level),
        round: roundLabel(paper.value.round),
        season: paper.value.season,
      })
    : '',
)

usePageSeo(
  () => heading.value,
  () => t('paper.seoDescription', { title: heading.value }),
)
</script>

<template>
  <div v-if="paper" class="page">
    <div class="container-narrow page__inner">
      <NuxtLink :to="localePath('latihan')" class="page__back">
        <BaseIcon name="arrowLeft" :size="16" />
        {{ $t('paper.backToList') }}
      </NuxtLink>

      <header class="page__header">
        <p class="page__eyebrow">
          {{ $t('paper.season', { n: paper.season }) }} ·
          {{ roundLabel(paper.round) }}
          <template v-if="paper.printed.date"> · {{ paper.printed.date }}</template>
        </p>
        <h1 class="page__title">{{ heading }}</h1>
      </header>

      <PracticeStage :paper="paper" />

      <p class="page__source">{{ $t('paper.sourceNote', { organiser: SOURCE.organiser }) }}</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page {
  padding-block: 1.75rem 2rem;

  &__inner {
    display: grid;
    gap: 1.25rem;
  }

  &__back {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-family: var(--font-display);
    font-weight: 700;
    text-decoration: none;
    justify-self: start;
  }

  &__eyebrow {
    @include eyebrow;
    margin-bottom: 0.4rem;
  }

  &__title {
    font-size: clamp(1.5rem, 1.25rem + 1.2vw, 2.1rem);
  }

  &__source {
    font-size: 0.82rem;
    color: var(--c-ink-soft);
  }
}
</style>
