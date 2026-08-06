<script setup lang="ts">
/**
 * One answer choice.
 *
 * An option can be words, a picture, or both — most PAUD questions are pictures,
 * because the children answering them cannot read yet. The letter stays visible
 * either way so a parent can read the choice aloud ("pilih b").
 *
 * After an answer is given the button reports its outcome in text as well as
 * colour, so the result does not depend on distinguishing green from red.
 */
import type { QuestionOption } from '~/types'

const props = withDefaults(
  defineProps<{
    option: QuestionOption
    /** Set once the question has been answered. */
    revealed?: boolean
    chosen?: boolean
    correct?: boolean
    disabled?: boolean
  }>(),
  { revealed: false, chosen: false, correct: false, disabled: false },
)

const state = computed(() => {
  if (!props.revealed) return 'idle'
  if (props.correct) return 'correct'
  if (props.chosen) return 'wrong'
  return 'muted'
})
</script>

<template>
  <button
    class="option"
    :class="[`option--${state}`, { 'option--picture': option.images.length }]"
    type="button"
    :disabled="disabled"
    :aria-pressed="chosen"
  >
    <span class="option__key" aria-hidden="true">{{ option.key }}</span>

    <span class="option__body">
      <img
        v-for="src in option.images"
        :key="src"
        class="option__image"
        :src="src"
        alt=""
        loading="lazy"
        decoding="async"
      />
      <span v-if="option.text" class="option__text">{{ option.text }}</span>
    </span>

    <span v-if="revealed && (correct || chosen)" class="option__mark">
      <BaseIcon :name="correct ? 'check' : 'close'" :size="18" />
      <span class="visually-hidden">
        {{ correct ? $t('practice.optionCorrect') : $t('practice.optionWrong') }}
      </span>
    </span>
  </button>
</template>

<style scoped lang="scss">
.option {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  width: 100%;
  padding: 0.9rem 1rem;
  text-align: left;
  background: var(--c-surface);
  border: 3px solid var(--c-ink-line-soft);
  border-radius: $radius-lg;
  transition:
    transform $duration-fast $ease-bounce,
    border-color $duration-fast $ease-out,
    background-color $duration-fast $ease-out;

  &:not(:disabled):hover {
    border-color: var(--c-sun);
    transform: translateY(-3px);
  }

  &:not(:disabled):active {
    transform: translateY(1px);
  }

  &__key {
    display: grid;
    place-items: center;
    flex: none;
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 50%;
    background: var(--c-paper-deep);
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 800;
    text-transform: uppercase;
    color: var(--c-ink);
  }

  &__body {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
    flex: 1;
    min-width: 0;
  }

  &__image {
    max-height: 8.5rem;
    width: auto;
    border-radius: $radius-sm;

    @include respond-to('md') {
      max-height: 10.5rem;
    }
  }

  &__text {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 600;
  }

  &__mark {
    display: grid;
    place-items: center;
    flex: none;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    color: #ffffff;
  }

  // --- Outcomes ------------------------------------------------------------
  &--correct {
    border-color: var(--c-correct);
    background: var(--c-correct-soft);

    .option__key {
      background: var(--c-correct);
      color: #ffffff;
    }

    .option__mark {
      background: var(--c-correct);
    }
  }

  &--wrong {
    border-color: var(--c-wrong);
    background: var(--c-wrong-soft);

    .option__key {
      background: var(--c-wrong);
      color: #ffffff;
    }

    .option__mark {
      background: var(--c-wrong);
    }
  }

  &--muted {
    opacity: 0.55;
  }

  @include motion-safe {
    &--correct {
      animation: option-pop 0.45s $ease-bounce;
    }

    &--wrong {
      animation: option-shake 0.42s $ease-out;
    }
  }
}

@keyframes option-pop {
  0% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.035);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes option-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-7px);
  }
  60% {
    transform: translateX(5px);
  }
}
</style>
