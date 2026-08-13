<script setup lang="ts">
/**
 * Offered when this paper was left part-answered.
 *
 * Continuing is the primary action but never the automatic one: a paper left
 * three weeks ago is one a child has forgotten, and dropping them at question
 * fourteen of a paper they do not remember starting is worse than beginning
 * again. So it says when it was last touched and how far it got, and lets the
 * grown-up decide.
 */
import type { ResumeState } from '~/types'

const props = defineProps<{ state: ResumeState; total: number }>()
defineEmits<{ resume: []; restart: [] }>()

const { number, time, dateLong, daysAgo } = useFormat()

/** "today at 14.30", "yesterday at 14.30", or the full date. */
const lastWorked = computed(() => {
  const saved = props.state.savedAt
  if (Number.isNaN(new Date(saved).getTime())) return null

  const days = daysAgo(saved)
  if (days === 0) return { key: 'practice.resume.today', params: { time: time(saved) } }
  if (days === 1) return { key: 'practice.resume.yesterday', params: { time: time(saved) } }
  return { key: 'practice.resume.on', params: { time: time(saved), date: dateLong(saved) } }
})

const answered = computed(() => props.state.attempts.length)
</script>

<template>
  <BaseCard class="resume">
    <MascotKancil mood="thinking" :size="96" />

    <div class="resume__body">
      <h2 class="resume__title">{{ $t('practice.resume.title') }}</h2>

      <p v-if="lastWorked" class="resume__when">
        {{ $t(lastWorked.key, lastWorked.params) }}
      </p>

      <p class="resume__position">
        {{ $t('practice.resume.position', { n: number(answered), total: number(total) }) }}
      </p>

      <div class="resume__actions">
        <BaseButton size="lg" variant="primary" @click="$emit('resume')">
          {{ $t('practice.resume.continue', { n: number(answered + 1) }) }}
          <template #icon-right><BaseIcon name="arrowRight" :size="18" /></template>
        </BaseButton>
        <BaseButton size="lg" variant="ghost" @click="$emit('restart')">
          {{ $t('practice.resume.fromStart') }}
        </BaseButton>
      </div>
    </div>
  </BaseCard>
</template>

<style scoped lang="scss">
.resume {
  display: flex;
  align-items: center;
  gap: 1.25rem;

  @include respond-below('sm') {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.85rem;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
  }

  &__title {
    font-family: var(--font-display);
    font-size: 1.3rem;
    line-height: 1.25;
    color: var(--c-ink);
  }

  &__when {
    font-weight: 700;
    color: var(--c-leaf-deep);
  }

  &__position {
    color: var(--c-ink-soft);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-top: 0.75rem;

    @include respond-below('sm') {
      // Full width apiece on a phone, so neither is a thin target.
      width: 100%;

      > * {
        flex: 1 1 100%;
      }
    }
  }
}
</style>
