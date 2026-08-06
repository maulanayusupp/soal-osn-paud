<script setup lang="ts">
/**
 * How far through the paper we are, as one filled bar plus a running tally.
 *
 * `--fill` is a CSS custom property rather than a width in a style attribute:
 * the scoped SCSS below owns every visual rule, the component only supplies the
 * number. This is the one permitted use of :style in the app.
 */
const props = defineProps<{ position: number; total: number; correct: number }>()

const fill = computed(() => (props.total === 0 ? 0 : (props.position / props.total) * 100))
</script>

<template>
  <div class="rail">
    <div
      class="rail__track"
      role="progressbar"
      :aria-valuenow="position"
      :aria-valuemin="0"
      :aria-valuemax="total"
      :aria-label="$t('practice.progressLabel')"
    >
      <span class="rail__fill" :style="{ '--fill': `${fill}%` }" />
    </div>
    <p class="rail__tally">
      <BaseIcon name="star" :size="16" filled />
      {{ $t('practice.tally', { correct, total }) }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.rail {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;

  @include respond-to('sm') {
    gap: 1rem;
  }

  &__track {
    position: relative;
    flex: 1;
    height: 0.85rem;
    border: 2px solid var(--c-ink-line);
    border-radius: $radius-pill;
    background: var(--c-surface);
    overflow: hidden;
  }

  &__fill {
    display: block;
    height: 100%;
    width: var(--fill);
    background: var(--grad-brand);
    border-radius: $radius-pill;
    transition: width $duration-base $ease-out;
  }

  &__tally {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    flex: none;
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 0.88rem;
    white-space: nowrap;
    color: var(--c-ink);

    @include respond-to('sm') {
      font-size: 0.95rem;
    }
  }
}
</style>
