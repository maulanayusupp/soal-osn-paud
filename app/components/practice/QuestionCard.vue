<script setup lang="ts">
/**
 * The question itself: its number, its words (when it has any) and its pictures.
 *
 * Many papers carry the whole question inside the illustration, so a card with
 * no prompt text is normal and not a bug. The alt text says so plainly rather
 * than inventing a description of a picture nobody has read.
 */
import type { Question } from '~/types'

defineProps<{ question: Question; position: number; total: number }>()
</script>

<template>
  <section class="question" :aria-label="$t('practice.questionOf', { n: position, total })">
    <p class="question__count">
      <span class="question__count-now">{{ position }}</span>
      <span class="question__count-total">/ {{ total }}</span>
    </p>

    <h2 v-if="question.prompt" class="question__prompt">{{ question.prompt }}</h2>
    <p v-else class="question__prompt question__prompt--picture">
      {{ $t('practice.lookAtPicture') }}
    </p>

    <div v-if="question.images.length" class="question__art">
      <img
        v-for="src in question.images"
        :key="src"
        class="question__image"
        :src="src"
        :alt="$t('practice.imageAlt', { n: question.n })"
        decoding="async"
      />
    </div>
  </section>
</template>

<style scoped lang="scss">
.question {
  text-align: center;

  &__count {
    display: inline-flex;
    align-items: baseline;
    gap: 0.25rem;
    padding: 0.2rem 0.9rem;
    margin-bottom: 0.9rem;
    border-radius: $radius-pill;
    background: var(--c-sun-soft);
    font-family: var(--font-display);
    color: #8a5b00;
  }

  &__count-now {
    font-size: 1.3rem;
    font-weight: 800;
  }

  &__count-total {
    font-size: 0.95rem;
    font-weight: 600;
    opacity: 0.75;
  }

  &__prompt {
    font-size: clamp(1.25rem, 1.05rem + 0.9vw, 1.75rem);
    line-height: 1.3;
    max-width: 30ch;
    margin-inline: auto;

    &--picture {
      color: var(--c-ink-soft);
      font-family: var(--font-display);
      font-weight: 600;
    }
  }

  &__art {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-top: 1.25rem;
    // Without this the flex line refuses to shrink below its content and a wide
    // strip of artwork pushes straight out of the card, which clips it.
    min-width: 0;
  }

  &__image {
    // Both dimensions are capped. Height alone was not enough: a wide strip
    // ("3 + 1 = ▢") sized to a 15rem height is far wider than a phone, and the
    // card's overflow rule then cut the right-hand side clean off.
    max-height: 15rem;
    max-width: 100%;
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: $radius-md;

    @include respond-to('md') {
      max-height: 19rem;
    }
  }
}
</style>
