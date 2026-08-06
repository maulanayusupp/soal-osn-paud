<script setup lang="ts">
/** A call-out for something the reader should not miss. */
withDefaults(defineProps<{ tone?: 'info' | 'warn' }>(), { tone: 'info' })
</script>

<template>
  <aside class="note" :class="`note--${tone}`">
    <BaseIcon :name="tone === 'warn' ? 'shield' : 'info'" :size="20" />
    <div class="note__body"><slot /></div>
  </aside>
</template>

<style scoped lang="scss">
.note {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.1rem;
  border-radius: $radius-md;
  border: 2px dashed var(--c-ink-line-soft);
  background: var(--c-surface-quiet);

  &--warn {
    border-color: var(--c-sun);
    background: var(--c-sun-soft);
  }

  &__body {
    font-size: 0.94rem;

    :deep(p + p) {
      margin-top: 0.6rem;
    }
  }
}
</style>
