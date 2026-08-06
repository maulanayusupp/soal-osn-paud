<script setup lang="ts">
/** The landing banner: what this is, who it is for, and one way in. */
const props = defineProps<{ questions: number; papers: number }>()

const localePath = useLocalePath()
const { number } = useFormat()
</script>

<template>
  <section class="hero">
    <div class="hero__inner container">
      <div class="hero__copy">
        <p class="hero__eyebrow">{{ $t('home.hero.eyebrow') }}</p>
        <h1 class="hero__title">
          {{ $t('home.hero.titleLead') }}
          <span class="hero__accent">{{ $t('home.hero.titleAccent') }}</span>
        </h1>
        <p class="hero__lead lead">
          {{ $t('home.hero.lead', { questions: number(props.questions), papers: number(props.papers) }) }}
        </p>

        <div class="hero__actions">
          <BaseButton :to="localePath('latihan')" size="lg" variant="primary">
            {{ $t('home.hero.primaryCta') }}
            <template #icon-right><BaseIcon name="arrowRight" :size="18" /></template>
          </BaseButton>
          <BaseButton :to="localePath('tentang')" size="lg" variant="secondary">
            {{ $t('home.hero.secondaryCta') }}
          </BaseButton>
        </div>

        <ul class="hero__points">
          <li v-for="point in ['free', 'noAds', 'offlineData']" :key="point">
            <BaseIcon name="check" :size="16" />
            {{ $t(`home.hero.points.${point}`) }}
          </li>
        </ul>
      </div>

      <div class="hero__mascot">
        <span class="hero__blob" aria-hidden="true" />
        <MascotKancil mood="idle" :size="300" :label="$t('home.hero.mascotAlt')" />
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.hero {
  padding-block: 2.5rem 1rem;

  @include respond-to('md') {
    padding-block: 4rem 2rem;
  }

  &__inner {
    display: grid;
    align-items: center;
    gap: 2rem;

    @include respond-to('lg') {
      grid-template-columns: 1.15fr 0.85fr;
      gap: 3rem;
    }
  }

  &__eyebrow {
    @include eyebrow;
    margin-bottom: 0.7rem;
  }

  &__title {
    max-width: 14ch;
  }

  &__accent {
    @include gradient-text;
  }

  &__lead {
    margin-top: 1rem;
    max-width: 46ch;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.85rem;
    margin-top: 1.75rem;
  }

  &__points {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.25rem;
    margin-top: 1.75rem;

    li {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-weight: 600;
      font-size: 0.92rem;
      color: var(--c-ink-soft);
    }

    :deep(svg) {
      color: var(--c-leaf);
    }
  }

  &__mascot {
    position: relative;
    display: grid;
    place-items: center;
    justify-self: center;
  }

  // A soft sun disc behind Kancil, drifting slowly.
  &__blob {
    position: absolute;
    inset: 8% 6%;
    border-radius: 46% 54% 58% 42% / 52% 44% 56% 48%;
    background: var(--grad-sun);
    opacity: 0.4;

    @include motion-safe {
      animation: hero-blob 14s $ease-out infinite;
    }
  }
}

@keyframes hero-blob {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
    border-radius: 46% 54% 58% 42% / 52% 44% 56% 48%;
  }
  50% {
    transform: rotate(8deg) scale(1.05);
    border-radius: 56% 44% 42% 58% / 44% 56% 44% 56%;
  }
}
</style>
