<script setup lang="ts">
import { BRAND, SOURCE } from '~/config/brand.config'
import { FOOTER_NAV } from '~/config/navigation.config'

const localePath = useLocalePath()
const email = useRuntimeConfig().public.contactEmail as string
const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <div class="footer__inner container">
      <div class="footer__brand">
        <BrandLogo />
        <p class="footer__tagline">{{ $t('footer.tagline') }}</p>
        <!-- Stated in the footer of every page, not buried on one. -->
        <p class="footer__disclaimer">
          {{ $t('footer.notAffiliated', { organiser: SOURCE.organiser }) }}
        </p>
      </div>

      <nav class="footer__nav" :aria-label="$t('nav.footerLabel')">
        <h2 class="footer__heading">{{ $t('footer.pages') }}</h2>
        <ul>
          <li v-for="item in FOOTER_NAV" :key="item.to">
            <NuxtLink :to="localePath(item.to)">{{ $t(`nav.${item.label}`) }}</NuxtLink>
          </li>
        </ul>
      </nav>

      <div class="footer__contact">
        <h2 class="footer__heading">{{ $t('footer.contact') }}</h2>
        <a class="footer__email" :href="`mailto:${email}`">
          <BaseIcon name="mail" :size="18" />
          {{ email }}
        </a>
      </div>
    </div>

    <div class="footer__base container">
      <p>© {{ year }} {{ BRAND.name }}. {{ $t('footer.rights') }}</p>
    </div>
  </footer>
</template>

<style scoped lang="scss">
.footer {
  margin-top: 4rem;
  padding-top: 3rem;
  border-top: 2px solid var(--c-ink-line-soft);
  background: var(--c-paper-deep);

  &__inner {
    display: grid;
    gap: 2.25rem;

    @include respond-to('md') {
      grid-template-columns: 1.6fr 1fr 1fr;
      gap: 2.5rem;
    }
  }

  &__tagline {
    margin-top: 0.8rem;
    max-width: 34ch;
  }

  &__disclaimer {
    margin-top: 0.8rem;
    font-size: 0.85rem;
    max-width: 42ch;
  }

  &__heading {
    @include eyebrow;
    margin-bottom: 0.8rem;
  }

  &__nav ul {
    display: grid;
    gap: 0.45rem;
  }

  &__nav a {
    text-decoration: none;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }

  &__email {
    // `inline-flex`: as a block the anchor filled its whole grid column, so on a
    // phone most of the tap target was empty space beside the address.
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    text-decoration: none;
    // Break at the dots and @, never mid-word — see the note in kontak.vue.
    overflow-wrap: anywhere;
    word-break: normal;

    :deep(svg) {
      flex: none;
    }

    &:hover {
      text-decoration: underline;
    }
  }

  &__base {
    margin-top: 2.5rem;
    padding-block: 1.25rem;
    border-top: 2px dashed var(--c-ink-line-soft);
    font-size: 0.85rem;
    color: var(--c-ink-soft);
  }
}
</style>
