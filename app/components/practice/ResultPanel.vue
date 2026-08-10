<script setup lang="ts">
/**
 * The end of a session.
 *
 * The score is presented as encouragement, not as a grade: the copy names what
 * happened ("12 of 20 right") and invites another go. There is no ranking, no
 * badge implying a standard has been met, and no comparison with other children.
 */
import type { ScoreBand } from '~/config/practice.config'
import type { Paper } from '~/types'

const props = defineProps<{
  paper: Paper
  score: number
  correct: number
  total: number
  band: ScoreBand
  shuffled: boolean
}>()

defineEmits<{ again: []; shuffle: [] }>()

const localePath = useLocalePath()
const { percent } = useFormat()
const { fullTitle } = usePaperLabels()

const mood = computed(() => (props.band === 'keep-going' ? 'idle' : 'cheer'))
</script>

<template>
  <BaseCard class="result">
    <MascotKancil :mood="mood" :size="170" :label="$t('practice.mascotAlt')" />

    <p class="result__eyebrow">{{ $t(`practice.band.${band}.eyebrow`) }}</p>
    <h2 class="result__headline">{{ $t(`practice.band.${band}.headline`) }}</h2>

    <p class="result__score">
      <span class="result__score-value">{{ percent(score) }}</span>
      <span class="result__score-detail">
        {{ $t('practice.resultDetail', { correct, total }) }}
      </span>
    </p>

    <p class="result__paper">{{ fullTitle(paper) }}</p>

    <div class="result__actions">
      <BaseButton variant="primary" size="lg" @click="$emit('again')">
        {{ $t('practice.tryAgain') }}
        <template #icon-left><BaseIcon name="refresh" :size="18" /></template>
      </BaseButton>
      <BaseButton variant="secondary" size="lg" @click="$emit('shuffle')">
        {{ $t('practice.shuffleAgain') }}
        <template #icon-left><BaseIcon name="shuffle" :size="18" /></template>
      </BaseButton>
      <BaseButton variant="ghost" size="lg" :to="localePath('latihan')">
        {{ $t('practice.pickAnother') }}
      </BaseButton>
    </div>

    <p class="result__note">{{ $t('practice.resultNote') }}</p>
  </BaseCard>
</template>

<style scoped lang="scss">
.result {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 0.5rem;
  padding-block: 2.5rem;

  // The score and the two ways to go again are what this screen is for; on a
  // phone they should land above the fold rather than below Kancil.
  @include respond-below('md') {
    padding-block: 1.4rem;

    :deep(.mascot) {
      width: 118px;
    }
  }

  &__eyebrow {
    @include eyebrow;
  }

  &__headline {
    max-width: 20ch;
  }

  &__score {
    display: grid;
    gap: 0.15rem;
    margin-top: 0.5rem;
  }

  &__score-value {
    font-family: var(--font-display);
    font-size: clamp(2.6rem, 2rem + 2.4vw, 3.6rem);
    font-weight: 800;
    line-height: 1;
    @include gradient-text;
  }

  &__score-detail {
    font-weight: 600;
    color: var(--c-ink-soft);
  }

  &__paper {
    margin-top: 0.25rem;
    font-size: 0.92rem;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
    margin-top: 1.5rem;

    @include respond-below('md') {
      gap: 0.55rem;
      margin-top: 1rem;
    }
  }

  &__note {
    margin-top: 1.25rem;
    max-width: 46ch;
    // Declared BEFORE the media query on purpose: Sass emits a trailing
    // declaration as a second rule after the query, and equal specificity means
    // the later one wins at every width — which silently cancelled the phone
    // size below.
    font-size: 0.86rem;

    @include respond-below('md') {
      margin-top: 0.85rem;
      font-size: 0.78rem;
    }
  }
}
</style>
