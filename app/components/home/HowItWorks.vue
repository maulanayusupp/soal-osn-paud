<script setup lang="ts">
/** Three steps, drawn as a path through the jungle. */
const steps = ['pick', 'answer', 'repeat']
</script>

<template>
  <ol class="steps">
    <li v-for="(step, i) in steps" :key="step" class="steps__item reveal">
      <span class="steps__number" aria-hidden="true">{{ i + 1 }}</span>
      <h3 class="steps__title">{{ $t(`home.steps.${step}.title`) }}</h3>
      <p>{{ $t(`home.steps.${step}.body`) }}</p>
    </li>
  </ol>
</template>

<style scoped lang="scss">
.steps {
  display: grid;
  gap: 1.5rem;
  counter-reset: step;

  @include respond-to('md') {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
  }

  &__item {
    position: relative;
    padding: 1.5rem 1.25rem 1.25rem;
    @include paper;

    // A dashed trail linking the steps on wide screens.
    @include respond-to('md') {
      &:not(:last-child)::after {
        content: '';
        position: absolute;
        top: 2.2rem;
        right: -1.1rem;
        width: 1rem;
        border-top: 3px dashed var(--c-ink-line-soft);
      }
    }
  }

  &__number {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    margin-bottom: 0.7rem;
    border-radius: 50%;
    background: var(--c-sun);
    border: 2px solid var(--c-ink-line);
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--c-ink);
  }

  &__title {
    font-size: 1.15rem;
    margin-bottom: 0.35rem;
  }
}
</style>
