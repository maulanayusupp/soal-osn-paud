<script setup lang="ts">
/** The paper-cut surface every boxed block in the app sits on. */
withDefaults(
  defineProps<{
    /** Adds hover lift and a pointer; use when the whole card is a link. */
    interactive?: boolean
    quiet?: boolean
    /** A coloured strip along the top, e.g. a subject colour. */
    accent?: string | null
  }>(),
  { interactive: false, quiet: false, accent: null },
)
</script>

<template>
  <div
    class="card"
    :class="{ 'card--interactive': interactive, 'card--quiet': quiet }"
    :style="accent ? { '--card-accent': accent } : undefined"
  >
    <span v-if="accent" class="card__accent" />
    <slot />
  </div>
</template>

<style scoped lang="scss">
.card {
  position: relative;
  overflow: hidden;
  padding: 1.4rem;
  @include paper;

  @include respond-to('md') {
    padding: 1.75rem;
  }

  &--quiet {
    @include paper-quiet;
    box-shadow: none;
  }

  &__accent {
    position: absolute;
    inset: 0 0 auto 0;
    height: 6px;
    background: var(--card-accent);
  }

  &--interactive {
    transition:
      transform $duration-base $ease-bounce,
      box-shadow $duration-base $ease-out;

    &:hover,
    &:focus-within {
      transform: translateY(-4px);
      box-shadow: $shadow-lg;
    }
  }
}
</style>
