<script setup lang="ts">
withDefaults(
  defineProps<{ eyebrow?: string | null; title: string; lead?: string | null; centred?: boolean }>(),
  { eyebrow: null, lead: null, centred: false },
)
</script>

<template>
  <header class="heading" :class="{ 'heading--centred': centred }">
    <p v-if="eyebrow" class="heading__eyebrow">{{ eyebrow }}</p>
    <h2 class="heading__title">{{ title }}</h2>
    <p v-if="lead" class="heading__lead lead">{{ lead }}</p>
  </header>
</template>

<style scoped lang="scss">
.heading {
  margin-bottom: 1.75rem;

  &--centred {
    text-align: center;

    .heading__lead {
      margin-inline: auto;
    }
  }

  &__eyebrow {
    @include eyebrow;
    margin-bottom: 0.5rem;
  }

  &__lead {
    margin-top: 0.7rem;
    max-width: 60ch;
  }
}
</style>
