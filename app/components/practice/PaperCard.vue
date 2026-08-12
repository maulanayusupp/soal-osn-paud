<script setup lang="ts">
/** One paper in the browse grid. The subject's colour is its constant cue. */
import type { CatalogEntry } from '~/types'

const props = defineProps<{ paper: CatalogEntry; best?: number | null }>()

const localePath = useLocalePath()
const { subjectLabel, levelLabel, roundLabel, subjectIcon } = usePaperLabels()
const { percent } = useFormat()

const accent = computed(() => `var(--c-subject-${props.paper.subject})`)
const to = computed(() => localePath({ name: 'latihan-paper', params: { paper: props.paper.id } }))
</script>

<template>
  <BaseCard interactive :accent="accent" class="paper">
    <div class="paper__top">
      <span class="paper__icon" aria-hidden="true">{{ subjectIcon(paper.subject) }}</span>
      <!-- A hand-written paper belongs to no season; it says what it is instead. -->
      <BaseBadge tone="neutral">
        {{ paper.season === null ? $t('paper.own') : $t('paper.season', { n: paper.season }) }}
      </BaseBadge>
    </div>

    <h3 class="paper__title">
      <NuxtLink :to="to" class="paper__link">
        <template v-if="paper.title">{{ paper.title }}</template>
        <template v-else>{{ subjectLabel(paper.subject) }}</template>
        <span class="paper__level">{{ levelLabel(paper.level) }}</span>
      </NuxtLink>
    </h3>

    <p class="paper__meta">
      <template v-if="paper.round">{{ roundLabel(paper.round) }}</template>
      <template v-else>{{ subjectLabel(paper.subject) }}</template>
      <template v-if="paper.printedDate"> · {{ paper.printedDate }}</template>
    </p>

    <div class="paper__foot">
      <BaseBadge tone="leaf">{{ $t('paper.questionCount', { n: paper.playableCount }) }}</BaseBadge>
      <BaseBadge v-if="best !== null && best !== undefined" tone="sun">
        {{ $t('paper.best', { score: percent(best) }) }}
      </BaseBadge>
    </div>
  </BaseCard>
</template>

<style scoped lang="scss">
.paper {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  height: 100%;

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  &__icon {
    font-size: 1.9rem;
    line-height: 1;
  }

  &__title {
    font-size: 1.25rem;
  }

  &__link {
    text-decoration: none;
    color: var(--c-ink);

    // The whole card is the hit area; the link keeps the accessible name.
    &::after {
      content: '';
      position: absolute;
      inset: 0;
    }
  }

  &__level {
    display: block;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--c-ink-soft);
  }

  &__meta {
    font-size: 0.85rem;
  }

  &__foot {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin-top: auto;
    padding-top: 0.6rem;
  }
}
</style>
