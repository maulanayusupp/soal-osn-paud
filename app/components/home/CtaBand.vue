<script setup lang="ts">
const localePath = useLocalePath()
</script>

<template>
  <section class="cta">
    <div class="cta__inner container">
      <MascotKancil mood="cheer" :size="140" />
      <div class="cta__copy">
        <h2 class="cta__title">{{ $t('home.cta.title') }}</h2>
        <p class="cta__lead">{{ $t('home.cta.lead') }}</p>
      </div>
      <BaseButton :to="localePath('latihan')" size="lg" variant="sun">
        {{ $t('home.cta.button') }}
        <template #icon-right><BaseIcon name="arrowRight" :size="18" /></template>
      </BaseButton>
    </div>
  </section>
</template>

<style scoped lang="scss">
.cta {
  &__inner {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    padding: 2rem;
    text-align: center;
    background: var(--c-leaf-soft);
    border: 2px solid var(--c-ink-line);
    border-radius: $radius-xl;
    box-shadow: $shadow-md;

    @include respond-to('md') {
      text-align: left;
      justify-content: space-between;
      padding: 2.25rem 2.5rem;
    }
  }

  &__copy {
    flex: 1 1 18rem;
  }

  &__title {
    font-size: clamp(1.5rem, 1.2rem + 1.2vw, 2.1rem);
  }

  &__lead {
    margin-top: 0.4rem;
    color: var(--c-leaf-deep);
    max-width: 44ch;
  }
}
</style>
