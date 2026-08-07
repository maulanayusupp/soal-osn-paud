<script setup lang="ts">
import { fetchCatalog, filterPapers, seasonsIn } from '~/services/catalog.service'
import type { Level, PaperFilter, Round, Subject } from '~/types'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const { data: catalog } = await useAsyncData('catalog', fetchCatalog)

// The level can arrive in the URL (the home page's level doors link straight in),
// so it is read from the query rather than defaulted blindly.
const filter = ref<PaperFilter>({
  level: (route.query.level as Level) ?? 'all',
  subject: (route.query.subject as Subject) ?? 'all',
  season: route.query.season ? Number(route.query.season) : 'all',
  round: (route.query.round as Round) ?? 'all',
})

/**
 * Keep the chosen filters in the URL.
 *
 * Without this, narrowing to "TK A / Sains", opening a paper and pressing back
 * dumps you at the unfiltered list again — with 60 papers, that means finding
 * your place a second time. `replace` so filtering does not fill the history
 * with entries the back button has to walk through.
 */
watch(
  filter,
  (value) => {
    const query: Record<string, string> = {}
    if (value.level !== 'all') query.level = value.level
    if (value.subject !== 'all') query.subject = value.subject
    if (value.season !== 'all') query.season = String(value.season)
    if (value.round !== 'all') query.round = value.round
    router.replace({ query })
  },
  { deep: true },
)

const papers = computed(() => catalog.value?.papers ?? [])
const seasons = computed(() => seasonsIn(papers.value))
const visible = computed(() => filterPapers(papers.value, filter.value))

const { bestFor, summary, loaded, clear } = useProgress()
const { percent, number } = useFormat()

usePageSeo(
  () => t('practice.seo.title'),
  () => t('practice.seo.description'),
)
</script>

<template>
  <div>
    <PageHero
      :eyebrow="$t('practice.hero.eyebrow')"
      :title="$t('practice.hero.title')"
      :lead="$t('practice.hero.lead')"
    />

    <section class="container">
      <BaseCard class="board">
        <PaperFilters v-model="filter" :seasons="seasons" :result-count="visible.length" />
      </BaseCard>
    </section>

    <section v-if="loaded && summary.sessions > 0" class="container progress">
      <BaseCard quiet class="progress__card">
        <div class="progress__stats">
          <p class="progress__title">{{ $t('progress.title') }}</p>
          <p class="progress__line">
            {{ $t('progress.summary', {
              sessions: number(summary.sessions),
              papers: number(summary.papers),
              accuracy: percent(summary.accuracy),
            }) }}
          </p>
        </div>
        <BaseButton variant="ghost" size="sm" @click="clear">
          <template #icon-left><BaseIcon name="trash" :size="16" /></template>
          {{ $t('progress.clear') }}
        </BaseButton>
      </BaseCard>
    </section>

    <section class="section container">
      <div v-if="visible.length" class="grid">
        <PaperCard
          v-for="paper in visible"
          :key="paper.id"
          :paper="paper"
          :best="bestFor(paper.id)"
        />
      </div>

      <BaseCard v-else class="empty">
        <MascotKancil mood="thinking" :size="140" />
        <h2>{{ $t('practice.noMatchTitle') }}</h2>
        <p>{{ $t('practice.noMatchBody') }}</p>
      </BaseCard>
    </section>
  </div>
</template>

<style scoped lang="scss">
.board {
  margin-top: 0.5rem;
}

.progress {
  margin-top: 1.25rem;

  &__card {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  &__title {
    @include eyebrow;
  }

  &__line {
    font-weight: 600;
    color: var(--c-ink);
  }
}

.grid {
  display: grid;
  gap: 1rem;

  @include respond-to('sm') {
    grid-template-columns: repeat(2, 1fr);
  }

  @include respond-to('lg') {
    grid-template-columns: repeat(3, 1fr);
  }
}

.empty {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 0.6rem;
}
</style>
