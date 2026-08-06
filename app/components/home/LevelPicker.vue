<script setup lang="ts">
/** Three big doors into the bank, one per age group. */
import { LEVELS } from '~/config/practice.config'
import type { Level } from '~/types'

defineProps<{ counts: Record<string, number> }>()

const localePath = useLocalePath()
const { levelLabel, levelIcon } = usePaperLabels()
const { number } = useFormat()
</script>

<template>
  <div class="levels">
    <NuxtLink
      v-for="level in LEVELS"
      :key="level"
      class="levels__item reveal"
      :to="localePath({ name: 'latihan', query: { level } })"
    >
      <span class="levels__icon" aria-hidden="true">{{ levelIcon(level as Level) }}</span>
      <span class="levels__name">{{ levelLabel(level as Level) }}</span>
      <span class="levels__age">{{ $t(`level.age.${level}`) }}</span>
      <span class="levels__count">
        {{ $t('paper.questionCount', { n: number(counts[level] ?? 0) }) }}
      </span>
      <span class="levels__go">
        {{ $t('home.levels.cta') }}
        <BaseIcon name="arrowRight" :size="16" />
      </span>
    </NuxtLink>
  </div>
</template>

<style scoped lang="scss">
.levels {
  display: grid;
  gap: 1rem;

  @include respond-to('md') {
    grid-template-columns: repeat(3, 1fr);
  }

  &__item {
    display: grid;
    gap: 0.3rem;
    padding: 1.6rem;
    text-decoration: none;
    color: var(--c-ink);
    @include paper($radius-xl);
    transition:
      transform $duration-base $ease-bounce,
      box-shadow $duration-base $ease-out;

    &:hover {
      transform: translateY(-6px) rotate(-0.6deg);
      box-shadow: $shadow-lg;
      color: var(--c-ink);
    }

    &:nth-child(2):hover {
      transform: translateY(-6px) rotate(0.6deg);
    }
  }

  &__icon {
    font-size: 2.6rem;
    line-height: 1;
  }

  &__name {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 800;
  }

  &__age,
  &__count {
    font-size: 0.9rem;
    color: var(--c-ink-soft);
  }

  &__go {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.8rem;
    font-family: var(--font-display);
    font-weight: 700;
    color: var(--c-leaf-deep);
  }
}
</style>
