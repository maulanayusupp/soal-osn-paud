<script setup lang="ts">
/**
 * The composition root of a practice session: question, options, mascot,
 * progress, and the results screen.
 *
 * The mascot's mood is derived, never set by hand — it follows the session's
 * own state so the two can never disagree.
 */
import { playableQuestions } from '~/services/catalog.service'
import { scrollToElement } from '~/utils/scroll'
import type { MascotMood, OptionKey, Paper } from '~/types'

const props = defineProps<{ paper: Paper }>()
const { t } = useI18n()
const stage = ref<HTMLElement | null>(null)

const questions = computed(() => playableQuestions(props.paper))
const practice = usePractice(props.paper.id, questions)
const {
  current,
  position,
  total,
  phase,
  chosen,
  tried,
  correctCount,
  score,
  band,
  isLast,
  wasCorrect,
  shuffled,
  choose,
  retry,
  reveal,
  next,
  restart,
} = practice

/**
 * True when every option is a picture and none carries words.
 *
 * Those lay out as a grid rather than a stack: three full-width pictures are two
 * phone screens of scrolling on their own, and a child choosing between pictures
 * compares them far more easily side by side — which is how the printed paper
 * sets them out too.
 */
const pictureOnly = computed(
  () => current.value?.options.every((option) => option.images.length && !option.text) ?? false,
)

const mood = computed<MascotMood>(() => {
  if (phase.value === 'finished') return score.value >= 55 ? 'cheer' : 'idle'
  if (phase.value === 'retry') return 'oops'
  if (phase.value === 'revealed') return wasCorrect.value ? 'cheer' : 'oops'
  return 'thinking'
})

/** Announced to screen readers the moment an answer is judged. */
const feedback = computed(() => {
  // Wrong, but the question is still open — say so without giving it away.
  if (phase.value === 'retry') return t('practice.feedbackRetry')
  if (phase.value !== 'revealed') return ''
  if (!wasCorrect.value) return t('practice.feedbackWrong')
  // Getting there on a second go is worth more praise than getting it first
  // time, not less: the child chose to keep trying.
  return tried.value.length > 1
    ? t('practice.feedbackCorrectRetry')
    : t('practice.feedbackCorrect')
})

const sound = useSoundEffects()

function onChoose(key: OptionKey) {
  if (phase.value !== 'answering' || !current.value) return
  const wanted = current.value.answer === key
  choose(key)
  // Judged from the question, not from what the phase became: a wrong pick may
  // now leave the question open rather than settling it.
  if (wanted) sound.playCorrect()
  else sound.playWrong()
}

/**
 * Go back to the top of the question after moving on.
 *
 * "Next" sits at the bottom of the card, so on a phone the tap happens well
 * below the fold — and the next question then renders above the viewport,
 * leaving the child looking at its answer buttons with no question in sight.
 * `nextTick` so the new question is in the DOM before we measure it.
 */
async function showQuestionFromTop() {
  await nextTick()
  scrollToElement(stage.value)
}

function onNext() {
  next()
  // Also on the last one: the result panel replaces the question, and its
  // headline is at the top of the same block the button sat below.
  void showQuestionFromTop()
}

function onRestart(options: { shuffle: boolean }) {
  restart(options)
  void showQuestionFromTop()
}

/**
 * A part-answered paper arms the leave guard, so tapping a menu item by mistake
 * asks first. Finishing or answering nothing disarms it — there is nothing left
 * to lose at that point.
 */
const inProgress = usePracticeInProgress()
watchEffect(() => {
  // `tried` as well as settled attempts: a first question still open on its
  // second go has nothing recorded yet, and losing it would smart just as much.
  const started = practice.attempts.value.length > 0 || tried.value.length > 0
  inProgress.value = started && phase.value !== 'finished'
})
onBeforeUnmount(() => {
  inProgress.value = false
})
</script>

<template>
  <div ref="stage" class="stage">
    <!-- Playing --------------------------------------------------------- -->
    <template v-if="phase !== 'finished' && current">
      <div class="stage__bar">
        <ProgressRail :position="position" :total="total" :correct="correctCount" />
        <button
          class="stage__sound"
          type="button"
          :aria-pressed="!sound.muted.value"
          @click="sound.toggle()"
        >
          <BaseIcon :name="sound.muted.value ? 'soundOff' : 'soundOn'" :size="20" />
          <span class="visually-hidden">
            {{ sound.muted.value ? $t('practice.soundOn') : $t('practice.soundOff') }}
          </span>
        </button>
      </div>

      <BaseCard class="stage__card">
        <QuestionCard :question="current" :position="position" :total="total" />

        <div class="stage__options" :class="{ 'stage__options--gallery': pictureOnly }">
          <QuestionOptionButton
            v-for="option in current.options"
            :key="option.key"
            :option="option"
            :revealed="phase === 'revealed'"
            :chosen="chosen === option.key"
            :correct="current.answer === option.key"
            :tried="tried.includes(option.key)"
            :disabled="phase !== 'answering' || tried.includes(option.key)"
            :compact="pictureOnly"
            @click="onChoose(option.key)"
          />
        </div>
      </BaseCard>

      <div
        class="stage__foot"
        :class="{
          'stage__foot--pinned': phase !== 'answering',
          'stage__foot--choices': phase === 'retry',
        }"
      >
        <div class="stage__mascot">
          <MascotKancil :mood="mood" :size="120" />
          <p class="stage__says" aria-live="polite">
            <template v-if="phase === 'answering'">{{ $t('practice.pickOne') }}</template>
            <template v-else>{{ feedback }}</template>
          </p>
        </div>

        <!-- Wrong, but the question is still open. -->
        <div v-if="phase === 'retry'" class="stage__actions">
          <BaseButton size="lg" variant="primary" @click="retry">
            {{ $t('practice.retry') }}
            <template #icon-right><BaseIcon name="refresh" :size="18" /></template>
          </BaseButton>
          <BaseButton size="lg" variant="ghost" @click="reveal">
            {{ $t('practice.showAnswer') }}
          </BaseButton>
        </div>

        <BaseButton
          v-else-if="phase === 'revealed'"
          class="stage__next"
          size="lg"
          variant="primary"
          @click="onNext"
        >
          {{ isLast ? $t('practice.seeResult') : $t('practice.nextQuestion') }}
          <template #icon-right><BaseIcon name="arrowRight" :size="18" /></template>
        </BaseButton>
      </div>
    </template>

    <!-- Nothing to play -------------------------------------------------- -->
    <BaseCard v-else-if="total === 0" class="stage__empty">
      <MascotKancil mood="idle" :size="140" />
      <h2>{{ $t('practice.emptyTitle') }}</h2>
      <p>{{ $t('practice.emptyBody') }}</p>
    </BaseCard>

    <!-- Finished --------------------------------------------------------- -->
    <ResultPanel
      v-else
      :paper="paper"
      :score="score"
      :correct="correctCount"
      :total="total"
      :band="band"
      :shuffled="shuffled"
      @again="onRestart({ shuffle: false })"
      @shuffle="onRestart({ shuffle: true })"
    />
  </div>
</template>

<style scoped lang="scss">
.stage {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  @include respond-below('md') {
    gap: 0.85rem;
  }

  &__bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;

    // The rail must be the part that shrinks, not the tally or the button.
    > :first-child {
      flex: 1;
      min-width: 0;
    }
  }

  &__sound {
    display: grid;
    place-items: center;
    flex: none;
    width: 2.6rem;
    height: 2.6rem;
    border: 2px solid var(--c-ink-line);
    border-radius: 50%;
    background: var(--c-surface);
    color: var(--c-ink);
    transition:
      background-color $duration-fast $ease-out,
      transform $duration-fast $ease-out;

    &:hover {
      background: var(--c-sun-soft);
      transform: translateY(-2px);
    }

    &[aria-pressed='false'] {
      color: var(--c-ink-soft);
      background: var(--c-paper-deep);
    }
  }

  &__card {
    padding-block: 1.75rem;

    @include respond-below('md') {
      padding: 1rem 0.85rem 1.25rem;
    }
  }

  &__options {
    display: grid;
    gap: 0.8rem;
    margin-top: 1.75rem;

    @include respond-below('md') {
      gap: 0.6rem;
      margin-top: 1.1rem;
    }
  }

  // Picture-only options sit two across on a phone. Stacked, they were the
  // single biggest cause of scrolling in the app.
  &__options--gallery {
    @include respond-below('md') {
      grid-template-columns: 1fr 1fr;
    }
  }

  &__foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;

    @include respond-below('sm') {
      gap: 0.55rem;
    }
  }

  /**
   * Once an answer is showing, the "next" bar pins itself to the bottom of a
   * phone screen.
   *
   * Otherwise the child has to scroll down past three answers to continue, and
   * then gets scrolled back up for the new question — down, up, down, up for
   * twenty questions. Pinned, the button is under the thumb the moment the
   * answer appears. It only pins once there is something to press: while the
   * question is still open, that space belongs to the question.
   */
  &__foot--pinned {
    @include respond-below('md') {
      position: sticky;
      bottom: 0;
      z-index: z('sticky');
      // One row, and as short as it can be: while pinned it floats over the
      // card, so every millimetre of it is a millimetre of answers hidden.
      flex-wrap: nowrap;
      gap: 0.5rem;
      padding: 0.45rem 0.25rem calc(0.45rem + env(safe-area-inset-bottom, 0px));
      background: var(--c-paper);
      border-top: 2px solid var(--c-ink-line-soft);

      .stage__mascot {
        gap: 0.45rem;
        min-width: 0;

        :deep(.mascot) {
          width: 44px;
        }
      }

      .stage__says {
        font-size: 0.8rem;
        line-height: 1.25;
      }

      // Beats the full-width rule below: in the bar it shares the row.
      .stage__next {
        flex: 0 0 auto;
      }
    }
  }

  /**
   * The retry bar carries two buttons where the "next" bar carries one, and the
   * pair will not fit beside the message on a narrow phone without squeezing
   * both to nothing. So this one state is allowed a second row: it appears only
   * on a wrong answer, and the buttons have to land under the thumb.
   */
  &__foot--choices {
    @include respond-below('md') {
      flex-wrap: wrap;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 0.6rem;

    @include respond-below('md') {
      // Its own row, sharing the width between the two buttons.
      flex: 1 1 100%;
      gap: 0.5rem;

      > * {
        flex: 1 1 0;
      }
    }
  }

  // Unpinned — that is, while the question is still open — the button gets the
  // full width of a phone rather than whatever gap is left over.
  &__next {
    @include respond-below('sm') {
      flex: 1 1 100%;
    }
  }

  &__mascot {
    display: flex;
    align-items: center;
    gap: 0.85rem;

    // Kancil is company, not content — she gives up the room on a phone.
    @include respond-below('sm') {
      gap: 0.6rem;

      :deep(.mascot) {
        width: 74px;
      }
    }
  }

  &__says {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--c-ink);
    max-width: 22ch;

    @include respond-below('sm') {
      font-size: 0.95rem;
    }
  }

  &__empty {
    text-align: center;
    display: grid;
    justify-items: center;
    gap: 0.75rem;
  }
}
</style>
