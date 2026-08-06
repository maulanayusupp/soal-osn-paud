<script setup lang="ts">
/** What the app does, stated as facts rather than promises. */
import type { IconName } from '~/utils/iconPaths'

const features: { id: string; icon: IconName }[] = [
  { id: 'realPapers', icon: 'book' },
  { id: 'instantFeedback', icon: 'target' },
  { id: 'pictures', icon: 'sparkle' },
  { id: 'private', icon: 'shield' },
  { id: 'bilingual', icon: 'globe' },
  { id: 'free', icon: 'leaf' },
]
</script>

<template>
  <div class="features">
    <article v-for="feature in features" :key="feature.id" class="features__item reveal">
      <span class="features__icon">
        <BaseIcon :name="feature.icon" :size="22" />
      </span>
      <h3 class="features__title">{{ $t(`home.features.${feature.id}.title`) }}</h3>
      <p>{{ $t(`home.features.${feature.id}.body`) }}</p>
    </article>
  </div>
</template>

<style scoped lang="scss">
.features {
  display: grid;
  gap: 1rem;

  @include respond-to('md') {
    grid-template-columns: repeat(2, 1fr);
  }

  @include respond-to('lg') {
    grid-template-columns: repeat(3, 1fr);
  }

  &__item {
    padding: 1.4rem;
    @include paper-quiet;
  }

  &__icon {
    display: grid;
    place-items: center;
    width: 2.6rem;
    height: 2.6rem;
    margin-bottom: 0.8rem;
    border-radius: $radius-md;
    background: var(--c-leaf-soft);
    color: var(--c-leaf-deep);
  }

  &__title {
    font-size: 1.1rem;
    margin-bottom: 0.35rem;
  }
}
</style>
