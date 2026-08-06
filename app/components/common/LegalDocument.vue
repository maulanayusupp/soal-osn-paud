<script setup lang="ts">
/**
 * Renders a legal/compliance page from i18n.
 *
 * The sections come from a locale array, so the Indonesian and English versions
 * cannot drift into saying different things — one shape, two languages.
 */
interface LegalSection {
  heading: string
  body: string[]
  list?: string[]
}

defineProps<{ sections: LegalSection[]; updated: string }>()
</script>

<template>
  <div class="legal">
    <p class="legal__updated">{{ updated }}</p>
    <section v-for="section in sections" :key="section.heading" class="legal__section">
      <h2 class="legal__heading">{{ section.heading }}</h2>
      <p v-for="paragraph in section.body" :key="paragraph">{{ paragraph }}</p>
      <ul v-if="section.list?.length" class="legal__list">
        <li v-for="item in section.list" :key="item">
          <BaseIcon name="check" :size="16" />
          <span>{{ item }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped lang="scss">
.legal {
  display: grid;
  gap: 2rem;

  &__updated {
    @include eyebrow;
  }

  &__section {
    display: grid;
    gap: 0.7rem;
  }

  &__heading {
    font-size: 1.3rem;
  }

  &__list {
    display: grid;
    gap: 0.5rem;
    margin-top: 0.2rem;
  }

  &__list li {
    display: flex;
    gap: 0.6rem;
    align-items: flex-start;
    color: var(--c-ink-soft);

    :deep(svg) {
      margin-top: 0.28rem;
      color: var(--c-leaf);
      flex: none;
    }
  }
}
</style>
