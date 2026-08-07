<script setup lang="ts">
/**
 * A modal question, built on the native <dialog>.
 *
 * `showModal()` gives focus trapping, Escape-to-close, inertness of the page
 * behind and the top-layer stacking for free — all of which a hand-rolled
 * overlay has to reimplement badly.
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    body: string
    confirmLabel: string
    cancelLabel: string
    /** Marks the confirming action as the destructive one. */
    danger?: boolean
  }>(),
  { danger: false },
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)

watch(
  () => props.open,
  (open) => {
    const element = dialog.value
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  },
  { flush: 'post' },
)

// Escape closes the dialog natively; treat that as "stay".
function onClose() {
  if (props.open) emit('cancel')
}
</script>

<template>
  <dialog ref="dialog" class="confirm" aria-labelledby="confirm-title" @close="onClose" @cancel.prevent="emit('cancel')">
    <div class="confirm__inner">
      <MascotKancil mood="thinking" :size="110" />
      <h2 id="confirm-title" class="confirm__title">{{ title }}</h2>
      <p class="confirm__body">{{ body }}</p>

      <div class="confirm__actions">
        <BaseButton variant="primary" size="lg" @click="emit('cancel')">
          {{ cancelLabel }}
        </BaseButton>
        <BaseButton :variant="danger ? 'secondary' : 'ghost'" size="lg" @click="emit('confirm')">
          {{ confirmLabel }}
        </BaseButton>
      </div>
    </div>
  </dialog>
</template>

<style scoped lang="scss">
.confirm {
  width: min(30rem, calc(100vw - 2rem));
  padding: 0;
  border: 0;
  background: transparent;
  // Centred by the UA's `margin: auto`, which _reset.scss restores after the
  // blanket margin reset. Kept `visible` so the card's drop shadow is not
  // clipped — the scrolling lives on the card instead.
  overflow: visible;

  &::backdrop {
    background: rgba(35, 48, 31, 0.55);
    backdrop-filter: blur(3px);
  }

  &__inner {
    display: grid;
    justify-items: center;
    gap: 0.6rem;
    padding: 1.75rem 1.5rem;
    text-align: center;
    // Scrolls inside itself on a short screen (a phone in landscape) rather
    // than running off the top and bottom.
    max-height: calc(100dvh - 2rem);
    overflow-y: auto;
    overscroll-behavior: contain;
    @include paper($radius-xl);
  }

  &__title {
    font-size: clamp(1.25rem, 1.1rem + 0.7vw, 1.6rem);
    max-width: 22ch;
  }

  &__body {
    max-width: 34ch;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.7rem;
    margin-top: 1.1rem;
    width: 100%;

    // Stacked on a phone, with the safe choice on top under the thumb.
    @include respond-below('sm') {
      flex-direction: column-reverse;

      > * {
        width: 100%;
      }
    }
  }

  @include motion-safe {
    &[open] .confirm__inner {
      animation: confirm-in 0.28s $ease-bounce;
    }
  }
}

@keyframes confirm-in {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
