<script setup lang="ts">
/**
 * The one button in the app. Renders as <button>, <a> or <NuxtLink> depending on
 * what it is given, so a link never has to be faked with a click handler.
 *
 * The chunky offset shadow that presses in on :active is the house style — it
 * gives a five-year-old the physical feedback a flat button does not.
 */
const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'sun'
    size?: 'sm' | 'md' | 'lg'
    to?: string | null
    href?: string | null
    type?: 'button' | 'submit'
    disabled?: boolean
    block?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    to: null,
    href: null,
    type: 'button',
    disabled: false,
    block: false,
  },
)

const tag = computed(() => {
  if (props.to) return resolveComponent('NuxtLink')
  if (props.href) return 'a'
  return 'button'
})

const bindings = computed(() => {
  if (props.to) return { to: props.to }
  if (props.href) return { href: props.href }
  return { type: props.type, disabled: props.disabled }
})
</script>

<template>
  <component
    :is="tag"
    v-bind="bindings"
    class="btn"
    :class="[`btn--${variant}`, `btn--${size}`, { 'btn--block': block, 'is-disabled': disabled }]"
  >
    <slot name="icon-left" />
    <span class="btn__label"><slot /></span>
    <slot name="icon-right" />
  </component>
</template>

<style scoped lang="scss">
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  font-family: var(--font-display);
  font-weight: 700;
  text-decoration: none;
  border: 2px solid var(--c-ink-line);
  border-radius: $radius-pill;
  transition:
    transform $duration-fast $ease-out,
    box-shadow $duration-fast $ease-out,
    background-color $duration-fast $ease-out;

  &:hover:not(.is-disabled) {
    transform: translateY(-2px);
  }

  &:active:not(.is-disabled) {
    transform: translateY(2px);
    box-shadow: 0 1px 0 var(--c-ink-line);
  }

  &.is-disabled,
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: 0 2px 0 var(--c-ink-line);
  }

  // --- Sizes ---------------------------------------------------------------
  &--sm {
    padding: 0.45rem 1rem;
    font-size: 0.9rem;
    box-shadow: 0 3px 0 var(--c-ink-line);
  }

  &--md {
    padding: 0.68rem 1.4rem;
    font-size: 1rem;
    box-shadow: 0 4px 0 var(--c-ink-line);
  }

  &--lg {
    padding: 0.95rem 2rem;
    font-size: 1.12rem;
    box-shadow: 0 5px 0 var(--c-ink-line);
  }

  // --- Variants ------------------------------------------------------------
  &--primary {
    background: var(--c-leaf);
    color: #ffffff;

    &:hover:not(.is-disabled) {
      background: var(--c-leaf-deep);
    }
  }

  &--sun {
    background: var(--c-sun);
    color: var(--c-ink);

    &:hover:not(.is-disabled) {
      background: #ffbb3d;
    }
  }

  &--secondary {
    background: var(--c-surface);
    color: var(--c-ink);

    &:hover:not(.is-disabled) {
      background: var(--c-sun-soft);
    }
  }

  &--ghost {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
    color: var(--c-ink);

    &:hover:not(.is-disabled) {
      background: rgba(35, 48, 31, 0.07);
      transform: none;
    }

    &:active:not(.is-disabled) {
      box-shadow: none;
    }
  }

  &--block {
    display: flex;
    width: 100%;
  }
}
</style>
