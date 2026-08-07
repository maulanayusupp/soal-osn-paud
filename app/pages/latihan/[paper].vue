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

// Asks before an unfinished paper is abandoned; armed by PracticeStage.
const { asking, leave, stay } = useLeaveGuard()
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

    <ConfirmDialog
      :open="asking"
      danger
      :title="$t('practice.leave.title')"
      :body="$t('practice.leave.body')"
      :cancel-label="$t('practice.leave.stay')"
      :confirm-label="$t('practice.leave.go')"
      @cancel="stay"
      @confirm="leave"
    />
  </div>
</template>

<style scoped lang="scss">
.page {
  padding-block: 1.75rem 2rem;

  // Everything above the question is chrome. On a phone it was costing most of
  // a screen before the child saw anything to answer.
  @include respond-below('md') {
    padding-block: 0.85rem 1.25rem;
  }

  &__inner {
    display: grid;
    gap: 1.25rem;

    @include respond-below('md') {
      gap: 0.75rem;
    }
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

    // Round and season are already in the heading below it; on a phone the line
    // is pure repetition, so only the printed date would be new — not worth a
    // row of a small screen.
    @include respond-below('md') {
      display: none;
    }
  }

  &__title {
    font-size: clamp(1.5rem, 1.25rem + 1.2vw, 2.1rem);

    // The paper's name matters far less than the question once you are in it,
    // so on a phone it becomes a label rather than a headline.
    @include respond-below('md') {
      font-size: 1.05rem;
      line-height: 1.25;
    }
  }

  &__source {
    font-size: 0.82rem;
    color: var(--c-ink-soft);

    @include respond-below('md') {
      font-size: 0.72rem;
    }
  }
}
</style>
