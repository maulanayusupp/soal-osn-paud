<script setup lang="ts">
/** Wordmark plus a small Kancil head. Links home unless told otherwise. */
import { BRAND } from '~/config/brand.config'

withDefaults(defineProps<{ asLink?: boolean }>(), { asLink: true })

const localePath = useLocalePath()
</script>

<template>
  <!-- A real <NuxtLink>, not <component :is="'NuxtLink'">: a string passed to
       `is` is not resolved against auto-imported components, so that renders an
       inert <NuxtLink> custom element and the logo stops being clickable. -->
  <NuxtLink v-if="asLink" :to="localePath('index')" class="brand" :aria-label="$t('nav.home')">
    <svg class="brand__mark" viewBox="0 0 48 48" aria-hidden="true">
      <circle class="brand__disc" cx="24" cy="24" r="22" />
      <ellipse class="brand__ear" cx="14" cy="15" rx="5" ry="8" />
      <ellipse class="brand__ear" cx="34" cy="15" rx="5" ry="8" />
      <ellipse class="brand__face" cx="24" cy="26" rx="15" ry="13" />
      <ellipse class="brand__muzzle" cx="24" cy="31" rx="8" ry="6" />
      <circle class="brand__eye" cx="18" cy="24" r="3" />
      <circle class="brand__eye" cx="30" cy="24" r="3" />
      <ellipse class="brand__nose" cx="24" cy="28" rx="2.6" ry="2.2" />
    </svg>
    <span class="brand__name">{{ BRAND.name }}</span>
  </NuxtLink>

  <span v-else class="brand">
    <svg class="brand__mark" viewBox="0 0 48 48" aria-hidden="true">
      <circle class="brand__disc" cx="24" cy="24" r="22" />
      <ellipse class="brand__ear" cx="14" cy="15" rx="5" ry="8" />
      <ellipse class="brand__ear" cx="34" cy="15" rx="5" ry="8" />
      <ellipse class="brand__face" cx="24" cy="26" rx="15" ry="13" />
      <ellipse class="brand__muzzle" cx="24" cy="31" rx="8" ry="6" />
      <circle class="brand__eye" cx="18" cy="24" r="3" />
      <circle class="brand__eye" cx="30" cy="24" r="3" />
      <ellipse class="brand__nose" cx="24" cy="28" rx="2.6" ry="2.2" />
    </svg>
    <span class="brand__name">{{ BRAND.name }}</span>
  </span>
</template>

<style scoped lang="scss">
.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
  color: var(--c-ink);

  &__mark {
    width: 2.35rem;
    height: 2.35rem;
    flex: none;
  }

  &__disc {
    fill: var(--c-leaf-soft);
    stroke: var(--c-ink-line);
    stroke-width: 2;
  }

  &__ear,
  &__face {
    fill: #d99a58;
  }

  &__muzzle {
    fill: #f7dcae;
  }

  &__eye,
  &__nose {
    fill: var(--c-ink);
  }

  &__name {
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 800;
    letter-spacing: -0.015em;
  }
}
</style>
