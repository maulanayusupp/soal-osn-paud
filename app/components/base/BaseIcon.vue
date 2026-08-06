<script setup lang="ts">
/** Renders one path from the icon registry. Decorative unless given a title. */
import { ICON_PATHS, type IconName } from '~/utils/iconPaths'

const props = withDefaults(
  defineProps<{
    name: IconName
    size?: number | string
    /** Give a title only when the icon carries meaning on its own. */
    title?: string | null
    filled?: boolean
  }>(),
  { size: 20, title: null, filled: false },
)

const path = computed(() => ICON_PATHS[props.name])
</script>

<template>
  <svg
    class="icon"
    :class="{ 'icon--filled': filled }"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :role="title ? 'img' : undefined"
    :aria-hidden="title ? undefined : 'true'"
    focusable="false"
  >
    <title v-if="title">{{ title }}</title>
    <path :d="path" />
  </svg>
</template>

<style scoped lang="scss">
.icon {
  flex: none;

  path {
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &--filled path {
    fill: currentColor;
    stroke: none;
  }
}
</style>
