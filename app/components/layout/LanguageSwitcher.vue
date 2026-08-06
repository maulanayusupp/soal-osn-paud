<script setup lang="ts">
/** Switches locale while staying on the current page. */
const { locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()

const options = computed(() =>
  (locales.value as { code: string; name: string }[]).map((entry) => ({
    code: entry.code,
    name: entry.name,
    short: entry.code.toUpperCase(),
    to: switchLocalePath(entry.code),
  })),
)
</script>

<template>
  <nav class="lang" :aria-label="$t('nav.languageLabel')">
    <NuxtLink
      v-for="option in options"
      :key="option.code"
      :to="option.to"
      class="lang__item"
      :class="{ 'is-active': option.code === locale }"
      :aria-current="option.code === locale ? 'true' : undefined"
    >
      <span aria-hidden="true">{{ option.short }}</span>
      <span class="visually-hidden">{{ option.name }}</span>
    </NuxtLink>
  </nav>
</template>

<style scoped lang="scss">
.lang {
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  background: var(--c-paper-deep);
  border: 2px solid var(--c-ink-line);
  border-radius: $radius-pill;

  &__item {
    padding: 0.18rem 0.7rem;
    border-radius: $radius-pill;
    font-family: var(--font-display);
    font-size: 0.82rem;
    font-weight: 700;
    text-decoration: none;
    color: var(--c-ink-soft);
    transition: background-color $duration-fast $ease-out;

    &:hover {
      color: var(--c-ink);
    }

    &.is-active {
      background: var(--c-ink);
      color: var(--c-paper);
    }
  }
}
</style>
