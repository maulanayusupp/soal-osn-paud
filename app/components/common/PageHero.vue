<script setup lang="ts">
/** The banner every non-home page opens with. */
withDefaults(
  defineProps<{ eyebrow?: string | null; title: string; lead?: string | null }>(),
  { eyebrow: null, lead: null },
)
</script>

<template>
  <section class="hero">
    <div class="container-narrow">
      <p v-if="eyebrow" class="hero__eyebrow">{{ eyebrow }}</p>
      <h1 class="hero__title">{{ title }}</h1>
      <p v-if="lead" class="hero__lead lead">{{ lead }}</p>
      <slot />
    </div>
  </section>
</template>

<style scoped lang="scss">
.hero {
  padding-block: 2.75rem 1.5rem;

  @include respond-to('md') {
    padding-block: 4rem 2rem;
  }

  &__eyebrow {
    @include eyebrow;
    margin-bottom: 0.6rem;
  }

  &__lead {
    margin-top: 0.9rem;
    max-width: 58ch;
  }
}
</style>
