<script setup lang="ts">
/**
 * The composition root of a practice session: question, options, mascot,
 * progress, and the results screen.
 *
 * The mascot's mood is derived, never set by hand — it follows the session's
 * own state so the two can never disagree.
 */
import { playableQuestions } from '~/services/catalog.service'
import type { MascotMood, OptionKey, Paper } from '~/types'

const props = defineProps<{ paper: Paper }>()
const { t } = useI18n()

const questions = computed(() => playableQuestions(props.paper))
const practice = usePractice(props.paper.id, questions)
const {
  current,
  position,
  total,
  phase,
  chosen,
  correctCount,
  score,
  band,
  isLast,
  wasCorrect,
  shuffled,
  choose,
  next,
  restart,
} = practice

const mood = computed<MascotMood>(() => {
  if (phase.value === 'finished') return score.value >= 55 ? 'cheer' : 'idle'
  if (phase.value === 'revealed') return wasCorrect.value ? 'cheer' : 'oops'
  return 'thinking'
})

/** Announced to screen readers the moment an answer is judged. */
const feedback = computed(() => {
  if (phase.value !== 'revealed') return ''
  return wasCorrect.value ? t('practice.feedbackCorrect') : t('practice.feedbackWrong')
})

function onChoose(key: OptionKey) {
  choose(key)
}
</script>

<template>
  <div class="stage">
    <!-- Playing --------------------------------------------------------- -->
    <template v-if="phase !== 'finished' && current">
      <ProgressRail :position="position" :total="total" :correct="correctCount" />

      <BaseCard class="stage__card">
        <QuestionCard :question="current" :position="position" :total="total" />

        <div class="stage__options">
          <QuestionOptionButton
            v-for="option in current.options"
            :key="option.key"
            :option="option"
            :revealed="phase === 'revealed'"
            :chosen="chosen === option.key"
            :correct="current.answer === option.key"
            :disabled="phase === 'revealed'"
            @click="onChoose(option.key)"
          />
        </div>
      </BaseCard>

      <div class="stage__foot">
        <div class="stage__mascot">
          <MascotKancil :mood="mood" :size="120" />
          <p class="stage__says" aria-live="polite">
            <template v-if="phase === 'revealed'">{{ feedback }}</template>
            <template v-else>{{ $t('practice.pickOne') }}</template>
          </p>
        </div>

        <BaseButton
          v-if="phase === 'revealed'"
          size="lg"
          variant="primary"
          @click="next"
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
      @again="restart({ shuffle: false })"
      @shuffle="restart({ shuffle: true })"
    />
  </div>
</template>

<style scoped lang="scss">
.stage {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  &__card {
    padding-block: 1.75rem;
  }

  &__options {
    display: grid;
    gap: 0.8rem;
    margin-top: 1.75rem;
  }

  &__foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  &__mascot {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  &__says {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--c-ink);
    max-width: 22ch;
  }

  &__empty {
    text-align: center;
    display: grid;
    justify-items: center;
    gap: 0.75rem;
  }
}
</style>
