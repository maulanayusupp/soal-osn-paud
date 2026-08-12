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
 *
 * `tried` marks an option the child already picked and got wrong while the
 * answer is still hidden. It reads as wrong and cannot be picked again, but it
 * says nothing about where the right answer is — that is the whole point of the
 * second go.
 */
import type { QuestionOption } from '~/types'

const props = withDefaults(
  defineProps<{
    option: QuestionOption
    /** Set once the answer is showing. */
    revealed?: boolean
    chosen?: boolean
    correct?: boolean
    /** Picked already and wrong, with the answer still hidden. */
    tried?: boolean
    disabled?: boolean
    /** Grid layout: letter above the picture, so it fits a narrow phone cell. */
    compact?: boolean
  }>(),
  {
    revealed: false,
    chosen: false,
    correct: false,
    tried: false,
    disabled: false,
    compact: false,
  },
)

const state = computed(() => {
  if (!props.revealed) return props.tried ? 'wrong' : 'idle'
  if (props.correct) return 'correct'
  if (props.chosen) return 'wrong'
  return 'muted'
})

/** Show a tick or a cross — never a tick before the answer is due. */
const mark = computed(() => {
  if (!props.revealed) return props.tried ? 'wrong' : null
  if (props.correct) return 'correct'
  return props.chosen ? 'wrong' : null
})
</script>

<template>
  <button
    class="option"
    :class="[
      `option--${state}`,
      { 'option--picture': option.images.length, 'option--compact': compact },
    ]"
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

    <span v-if="mark" class="option__mark">
      <BaseIcon :name="mark === 'correct' ? 'check' : 'close'" :size="18" />
      <span class="visually-hidden">
        {{ mark === 'correct' ? $t('practice.optionCorrect') : $t('practice.optionWrong') }}
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
  // A comfortable target for a small, imprecise finger.
  min-height: 3.75rem;
  padding: 0.9rem 1rem;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
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
    // Capped by width as well as height: some option art is very wide, and on a
    // 320px phone an unconstrained image pushes the whole row sideways.
    max-height: 7.5rem;
    max-width: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: $radius-sm;

    @include respond-to('sm') {
      max-height: 8.5rem;
    }

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

  // --- Grid cell -----------------------------------------------------------
  // Two of these sit across a phone, so the letter moves above the picture and
  // the picture gets the full width of the cell.
  &--compact {
    @include respond-below('md') {
      flex-direction: column;
      align-items: stretch;
      gap: 0.4rem;
      min-height: 0;
      padding: 0.55rem 0.5rem 0.65rem;

      .option__key {
        width: 1.9rem;
        height: 1.9rem;
        font-size: 0.95rem;
      }

      .option__body {
        justify-content: center;
      }

      .option__image {
        // No min-height on the cell: grid rows already stretch to match, so a
        // pair of short pictures costs only the room they actually need.
        max-height: 7.5rem;
      }

      .option__mark {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        width: 1.6rem;
        height: 1.6rem;
      }
    }
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
