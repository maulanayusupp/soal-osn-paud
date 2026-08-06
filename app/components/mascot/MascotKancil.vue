<script setup lang="ts">
/**
 * Kancil — the mouse-deer of Indonesian folk tales, and this app's guide.
 *
 * Drawn as inline SVG rather than an image file so every part can be animated
 * and recoloured from the design tokens. The moods are the four moments that
 * matter in a practice session: waiting, thinking, getting it right, getting it
 * wrong. All motion is CSS, which means `prefers-reduced-motion` switches it off
 * globally without this component knowing anything about it.
 */
import type { MascotMood } from '~/types'

withDefaults(
  defineProps<{
    mood?: MascotMood
    /** Rendered width; the drawing keeps its aspect ratio. */
    size?: number
    /** Decorative instances are hidden from assistive technology. */
    label?: string | null
  }>(),
  { mood: 'idle', size: 180, label: null },
)
</script>

<template>
  <div
    class="mascot"
    :class="`mascot--${mood}`"
    :style="{ '--mascot-size': `${size}px` }"
    :role="label ? 'img' : undefined"
    :aria-label="label ?? undefined"
    :aria-hidden="label ? undefined : 'true'"
  >
    <svg class="mascot__svg" viewBox="0 0 200 200" fill="none">
      <!-- Ground shadow, so the little one has weight when it hops. -->
      <ellipse class="mascot__shadow" cx="100" cy="180" rx="46" ry="8" />

      <g class="mascot__body">
        <!-- Back legs -->
        <path class="mascot__limb" d="M74 150v18a6 6 0 0 0 12 0v-18z" />
        <path class="mascot__limb" d="M116 150v18a6 6 0 0 0 12 0v-18z" />
        <path class="mascot__hoof" d="M72 166h16v8a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4z" />
        <path class="mascot__hoof" d="M114 166h16v8a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4z" />

        <!-- Tail -->
        <path class="mascot__tail" d="M142 128c10-4 15-12 12-19" />

        <!-- Torso -->
        <ellipse class="mascot__fur" cx="100" cy="128" rx="44" ry="34" />
        <ellipse class="mascot__belly" cx="100" cy="137" rx="26" ry="20" />

        <!-- Spots: the chevrotain's dappled coat -->
        <circle class="mascot__spot" cx="70" cy="116" r="4" />
        <circle class="mascot__spot" cx="86" cy="106" r="3" />
        <circle class="mascot__spot" cx="128" cy="118" r="4" />
        <circle class="mascot__spot" cx="114" cy="105" r="3" />

        <g class="mascot__head">
          <!-- Ears -->
          <g class="mascot__ear mascot__ear--left">
            <ellipse class="mascot__fur" cx="66" cy="52" rx="13" ry="20" />
            <ellipse class="mascot__ear-inner" cx="66" cy="53" rx="6" ry="12" />
          </g>
          <g class="mascot__ear mascot__ear--right">
            <ellipse class="mascot__fur" cx="134" cy="52" rx="13" ry="20" />
            <ellipse class="mascot__ear-inner" cx="134" cy="53" rx="6" ry="12" />
          </g>

          <!-- Skull -->
          <ellipse class="mascot__fur" cx="100" cy="74" rx="40" ry="36" />
          <!-- Muzzle -->
          <ellipse class="mascot__muzzle" cx="100" cy="90" rx="22" ry="16" />
          <path class="mascot__nose" d="M100 80a7 7 0 0 1 7 7c0 4-3 6-7 6s-7-2-7-6a7 7 0 0 1 7-7z" />
          <path class="mascot__mouth" d="M92 96q8 7 16 0" />

          <!-- Eyes. The lids are what blink. -->
          <g class="mascot__eyes">
            <circle class="mascot__eye" cx="84" cy="70" r="8" />
            <circle class="mascot__eye" cx="116" cy="70" r="8" />
            <circle class="mascot__glint" cx="87" cy="67" r="3" />
            <circle class="mascot__glint" cx="119" cy="67" r="3" />
            <path class="mascot__lid" d="M74 70h20" />
            <path class="mascot__lid" d="M106 70h20" />
          </g>

          <!-- Cheeks -->
          <ellipse class="mascot__cheek" cx="70" cy="84" rx="7" ry="5" />
          <ellipse class="mascot__cheek" cx="130" cy="84" rx="7" ry="5" />
        </g>
      </g>

      <!-- Celebration sparkles, only drawn for the cheer mood. -->
      <g v-if="mood === 'cheer'" class="mascot__sparkles">
        <path class="mascot__sparkle" d="M36 60l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" />
        <path class="mascot__sparkle" d="M164 48l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
        <path class="mascot__sparkle" d="M158 122l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
      </g>

      <!-- A single thought dot cluster while the child is deciding. -->
      <g v-if="mood === 'thinking'" class="mascot__thoughts">
        <circle class="mascot__thought" cx="150" cy="46" r="4" />
        <circle class="mascot__thought" cx="162" cy="34" r="6" />
        <circle class="mascot__thought" cx="178" cy="20" r="8" />
      </g>
    </svg>
  </div>
</template>

<style scoped lang="scss">
.mascot {
  width: var(--mascot-size);
  max-width: 100%;
  line-height: 0;

  &__svg {
    width: 100%;
    height: auto;
    overflow: visible;
  }

  &__shadow {
    fill: rgba(58, 42, 23, 0.14);
  }

  &__fur {
    fill: #d99a58;
  }

  &__belly {
    fill: #f7dcae;
  }

  &__spot {
    fill: #f7dcae;
    opacity: 0.75;
  }

  &__muzzle {
    fill: #f7dcae;
  }

  &__ear-inner {
    fill: #f0b9a0;
  }

  &__nose {
    fill: var(--c-ink);
  }

  &__mouth {
    stroke: var(--c-ink);
    stroke-width: 3;
    stroke-linecap: round;
    fill: none;
  }

  &__eye {
    fill: var(--c-ink);
  }

  &__glint {
    fill: #ffffff;
  }

  // The lid is a stroked line that scales over the eye to blink.
  &__lid {
    stroke: #d99a58;
    stroke-width: 0;
    stroke-linecap: round;
  }

  &__cheek {
    fill: var(--c-berry);
    opacity: 0.32;
  }

  &__limb {
    fill: #c9863f;
  }

  &__hoof {
    fill: #7a4a1f;
  }

  &__tail {
    stroke: #c9863f;
    stroke-width: 6;
    stroke-linecap: round;
    fill: none;
    transform-origin: 142px 128px;
  }

  &__sparkle {
    fill: var(--c-sun);
  }

  &__thought {
    fill: #ffffff;
    stroke: var(--c-ink-line-soft);
    stroke-width: 2;
  }

  // --- Motion --------------------------------------------------------------
  // Everything below is inside motion-safe, so a visitor who asks for less
  // motion sees a still, perfectly readable drawing.
  @include motion-safe {
    &__body {
      transform-origin: 100px 170px;
      animation: kancil-breathe 3.4s $ease-out infinite;
    }

    &__head {
      transform-origin: 100px 100px;
      animation: kancil-nod 5s $ease-out infinite;
    }

    &__ear--left {
      transform-origin: 66px 68px;
      animation: kancil-ear 4.2s $ease-out infinite;
    }

    &__ear--right {
      transform-origin: 134px 68px;
      animation: kancil-ear 4.2s $ease-out infinite 0.6s;
    }

    &__tail {
      animation: kancil-tail 2.6s $ease-out infinite;
    }

    &__eyes {
      animation: kancil-blink 5.5s step-end infinite;
      transform-origin: 100px 70px;
    }

    &--cheer &__body {
      animation: kancil-hop 0.62s $ease-bounce 2;
    }

    &--cheer &__sparkles {
      animation: kancil-sparkle 0.9s $ease-out;
      transform-origin: 100px 90px;
    }

    &--oops &__head {
      animation: kancil-tilt 0.9s $ease-out;
    }

    &--thinking &__thoughts {
      animation: kancil-think 1.8s $ease-out infinite;
    }
  }
}

@keyframes kancil-breathe {
  0%,
  100% {
    transform: scale(1) translateY(0);
  }
  50% {
    transform: scale(1.018) translateY(-2px);
  }
}

@keyframes kancil-nod {
  0%,
  72%,
  100% {
    transform: rotate(0deg);
  }
  80% {
    transform: rotate(-3.5deg);
  }
  90% {
    transform: rotate(2.5deg);
  }
}

@keyframes kancil-ear {
  0%,
  78%,
  100% {
    transform: rotate(0deg);
  }
  85% {
    transform: rotate(-13deg);
  }
  92% {
    transform: rotate(5deg);
  }
}

@keyframes kancil-tail {
  0%,
  100% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(16deg);
  }
}

// Squashing the eye group to nothing for two frames reads as a blink.
@keyframes kancil-blink {
  0%,
  92%,
  100% {
    transform: scaleY(1);
  }
  94%,
  96% {
    transform: scaleY(0.08);
  }
}

@keyframes kancil-hop {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  30% {
    transform: translateY(-26px) scale(1.04);
  }
  60% {
    transform: translateY(0) scale(0.96, 1.04);
  }
}

@keyframes kancil-sparkle {
  0% {
    opacity: 0;
    transform: scale(0.4) rotate(-20deg);
  }
  45% {
    opacity: 1;
    transform: scale(1.15) rotate(6deg);
  }
  100% {
    opacity: 0;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes kancil-tilt {
  0%,
  100% {
    transform: rotate(0deg);
  }
  35% {
    transform: rotate(-11deg);
  }
  70% {
    transform: rotate(4deg);
  }
}

@keyframes kancil-think {
  0%,
  100% {
    opacity: 0.35;
    transform: translateY(2px);
  }
  50% {
    opacity: 1;
    transform: translateY(-3px);
  }
}
</style>
