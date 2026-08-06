<script setup lang="ts">
import { PRIMARY_NAV } from '~/config/navigation.config'

const localePath = useLocalePath()
const open = ref(false)
const route = useRoute()

// Any navigation closes the mobile menu, including a click on the current page.
watch(() => route.fullPath, () => { open.value = false })
</script>

<template>
  <header class="header">
    <div class="header__inner container">
      <BrandLogo />

      <button
        class="header__toggle"
        type="button"
        :aria-expanded="open"
        aria-controls="primary-menu"
        @click="open = !open"
      >
        <BaseIcon :name="open ? 'close' : 'chevronDown'" :size="22" />
        <span class="visually-hidden">{{ $t('nav.menu') }}</span>
      </button>

      <div id="primary-menu" class="header__menu" :class="{ 'is-open': open }">
        <nav class="header__nav" :aria-label="$t('nav.primaryLabel')">
          <NuxtLink
            v-for="item in PRIMARY_NAV"
            :key="item.to"
            :to="localePath(item.to)"
            class="header__link"
          >
            {{ $t(`nav.${item.label}`) }}
          </NuxtLink>
        </nav>

        <div class="header__actions">
          <LanguageSwitcher />
          <BaseButton :to="localePath('latihan')" size="sm" variant="sun">
            {{ $t('nav.startPractice') }}
            <template #icon-right><BaseIcon name="arrowRight" :size="16" /></template>
          </BaseButton>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
.header {
  position: sticky;
  top: 0;
  z-index: z('header');
  background: rgba(255, 248, 236, 0.92);
  backdrop-filter: blur(10px);
  border-bottom: 2px solid var(--c-ink-line-soft);

  &__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    min-height: var(--header-height);
    flex-wrap: wrap;
  }

  &__toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.6rem;
    height: 2.6rem;
    border: 2px solid var(--c-ink-line);
    border-radius: $radius-md;
    background: var(--c-surface);

    @include respond-to('lg') {
      display: none;
    }
  }

  &__menu {
    display: none;
    width: 100%;
    flex-direction: column;
    gap: 1rem;
    padding-block: 1rem;

    &.is-open {
      display: flex;
    }

    @include respond-to('lg') {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: flex-end;
      gap: 1.5rem;
      width: auto;
      padding-block: 0;
    }
  }

  &__nav {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;

    @include respond-to('lg') {
      flex-direction: row;
      gap: 1.4rem;
    }
  }

  &__link {
    font-family: var(--font-display);
    font-weight: 700;
    text-decoration: none;
    color: var(--c-ink);
    padding: 0.35rem 0;
    border-bottom: 3px solid transparent;
    transition: border-color $duration-fast $ease-out;

    &:hover,
    &.router-link-active {
      border-bottom-color: var(--c-sun);
      color: var(--c-ink);
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
}
</style>
