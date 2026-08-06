<script setup lang="ts">
/**
 * The picker above the paper grid.
 *
 * Level first, because it is the one choice a parent has to get right — a TK B
 * paper in front of a four-year-old is discouraging, not challenging.
 */
import { LEVELS, ROUNDS, SUBJECTS } from '~/config/practice.config'
import type { Level, PaperFilter, Round, Subject } from '~/types'

const props = defineProps<{ modelValue: PaperFilter; seasons: number[]; resultCount: number }>()
const emit = defineEmits<{ 'update:modelValue': [PaperFilter] }>()

const { levelLabel, subjectLabel, roundLabel, levelIcon, subjectIcon } = usePaperLabels()

function patch(part: Partial<PaperFilter>) {
  emit('update:modelValue', { ...props.modelValue, ...part })
}

const isDefault = computed(
  () =>
    props.modelValue.level === 'all' &&
    props.modelValue.subject === 'all' &&
    props.modelValue.season === 'all' &&
    props.modelValue.round === 'all',
)
</script>

<template>
  <div class="filters">
    <fieldset class="filters__group">
      <legend class="filters__legend">{{ $t('filters.level') }}</legend>
      <div class="filters__chips">
        <button
          type="button"
          class="chip"
          :class="{ 'is-active': modelValue.level === 'all' }"
          @click="patch({ level: 'all' })"
        >
          {{ $t('filters.allLevels') }}
        </button>
        <button
          v-for="level in LEVELS"
          :key="level"
          type="button"
          class="chip"
          :class="{ 'is-active': modelValue.level === level }"
          @click="patch({ level: level as Level })"
        >
          <span aria-hidden="true">{{ levelIcon(level) }}</span>
          {{ levelLabel(level) }}
        </button>
      </div>
    </fieldset>

    <fieldset class="filters__group">
      <legend class="filters__legend">{{ $t('filters.subject') }}</legend>
      <div class="filters__chips">
        <button
          type="button"
          class="chip"
          :class="{ 'is-active': modelValue.subject === 'all' }"
          @click="patch({ subject: 'all' })"
        >
          {{ $t('filters.allSubjects') }}
        </button>
        <button
          v-for="subject in SUBJECTS"
          :key="subject"
          type="button"
          class="chip"
          :class="{ 'is-active': modelValue.subject === subject }"
          @click="patch({ subject: subject as Subject })"
        >
          <span aria-hidden="true">{{ subjectIcon(subject) }}</span>
          {{ subjectLabel(subject) }}
        </button>
      </div>
    </fieldset>

    <div class="filters__row">
      <fieldset class="filters__group">
        <legend class="filters__legend">{{ $t('filters.season') }}</legend>
        <div class="filters__chips">
          <button
            type="button"
            class="chip chip--sm"
            :class="{ 'is-active': modelValue.season === 'all' }"
            @click="patch({ season: 'all' })"
          >
            {{ $t('filters.allSeasons') }}
          </button>
          <button
            v-for="season in seasons"
            :key="season"
            type="button"
            class="chip chip--sm"
            :class="{ 'is-active': modelValue.season === season }"
            @click="patch({ season })"
          >
            {{ $t('paper.season', { n: season }) }}
          </button>
        </div>
      </fieldset>

      <fieldset class="filters__group">
        <legend class="filters__legend">{{ $t('filters.round') }}</legend>
        <div class="filters__chips">
          <button
            type="button"
            class="chip chip--sm"
            :class="{ 'is-active': modelValue.round === 'all' }"
            @click="patch({ round: 'all' })"
          >
            {{ $t('filters.allRounds') }}
          </button>
          <button
            v-for="round in ROUNDS"
            :key="round"
            type="button"
            class="chip chip--sm"
            :class="{ 'is-active': modelValue.round === round }"
            @click="patch({ round: round as Round })"
          >
            {{ roundLabel(round) }}
          </button>
        </div>
      </fieldset>
    </div>

    <p class="filters__count" aria-live="polite">
      {{ $t('filters.resultCount', { n: resultCount }) }}
      <button
        v-if="!isDefault"
        type="button"
        class="filters__reset"
        @click="patch({ level: 'all', subject: 'all', season: 'all', round: 'all' })"
      >
        {{ $t('filters.reset') }}
      </button>
    </p>
  </div>
</template>

<style scoped lang="scss">
.filters {
  display: grid;
  gap: 1.25rem;

  &__group {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
  }

  &__legend {
    @include eyebrow;
    padding: 0;
    margin-bottom: 0.55rem;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  &__row {
    display: grid;
    gap: 1.25rem;

    @include respond-to('md') {
      grid-template-columns: 1fr 1fr;
    }
  }

  &__count {
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  &__reset {
    font-weight: 700;
    color: var(--c-leaf-deep);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 1rem;
  border: 2px solid var(--c-ink-line-soft);
  border-radius: $radius-pill;
  background: var(--c-surface);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--c-ink);
  transition:
    background-color $duration-fast $ease-out,
    border-color $duration-fast $ease-out,
    transform $duration-fast $ease-out;

  &:hover {
    border-color: var(--c-sun);
    transform: translateY(-2px);
  }

  &.is-active {
    background: var(--c-ink);
    border-color: var(--c-ink);
    color: var(--c-paper);
  }

  &--sm {
    padding: 0.3rem 0.8rem;
    font-size: 0.85rem;
  }
}
</style>
