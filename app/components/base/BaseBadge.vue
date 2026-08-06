<script setup lang="ts">
/** A small status pill. `tone` carries the meaning, never the colour alone. */
withDefaults(
  defineProps<{
    tone?: 'neutral' | 'leaf' | 'sun' | 'river' | 'berry' | 'correct' | 'wrong'
  }>(),
  { tone: 'neutral' },
)
</script>

<template>
  <span class="badge" :class="`badge--${tone}`">
    <slot />
  </span>
</template>

<style scoped lang="scss">
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.65rem;
  border-radius: $radius-pill;
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.5;
  white-space: nowrap;

  &--neutral {
    background: var(--c-paper-deep);
    color: var(--c-ink-soft);
  }

  &--leaf {
    background: var(--c-leaf-soft);
    color: var(--c-leaf-deep);
  }

  &--sun {
    background: var(--c-sun-soft);
    color: #8a5b00;
  }

  &--river {
    background: var(--c-river-soft);
    color: #1c5ea3;
  }

  &--berry {
    background: var(--c-berry-soft);
    color: #a52456;
  }

  &--correct {
    background: var(--c-correct-soft);
    color: var(--c-leaf-deep);
  }

  &--wrong {
    background: var(--c-wrong-soft);
    color: #a63524;
  }
}
</style>
