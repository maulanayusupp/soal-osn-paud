<script setup lang="ts">
/**
 * Compliance: what this site is, what it is not, where the questions come from,
 * and what the app does with data. Any change to code rules, features or content
 * has to be reflected here in the same commit — see CLAUDE.md.
 *
 * The live numbers come from the catalogue rather than being typed in, so the
 * page cannot claim a coverage the bank does not actually have.
 */
import { SOURCE } from '~/config/brand.config'
import { bankTotals, fetchCatalog } from '~/services/catalog.service'

const { t } = useI18n()
const { data: catalog } = await useAsyncData('catalog', fetchCatalog)
const totals = computed(() => (catalog.value ? bankTotals(catalog.value) : null))

const sections = useLocalizedSections('compliance.sections')

usePageSeo(
  () => t('compliance.seo.title'),
  () => t('compliance.seo.description'),
)
</script>

<template>
  <div>
    <PageHero
      :eyebrow="$t('compliance.hero.eyebrow')"
      :title="$t('compliance.hero.title')"
      :lead="$t('compliance.hero.lead')"
    />

    <section class="container-narrow page">
      <InfoNote tone="warn">
        <p>{{ $t('compliance.disclaimer', { organiser: SOURCE.organiser }) }}</p>
      </InfoNote>

      <!-- Printed straight from the data, so it can never overstate coverage. -->
      <table v-if="totals" class="table">
        <caption>{{ $t('compliance.table.caption') }}</caption>
        <tbody>
          <tr>
            <th scope="row">{{ $t('compliance.table.papers') }}</th>
            <td>{{ totals.papers }}</td>
          </tr>
          <tr>
            <th scope="row">{{ $t('compliance.table.playable') }}</th>
            <td>{{ totals.playable }}</td>
          </tr>
          <tr>
            <th scope="row">{{ $t('compliance.table.seasons') }}</th>
            <td>{{ totals.seasons }}</td>
          </tr>
        </tbody>
      </table>

      <LegalDocument :sections="sections" :updated="$t('compliance.updated')" />
    </section>
  </div>
</template>

<style scoped lang="scss">
.page {
  display: grid;
  gap: 2rem;
  padding-bottom: 3rem;
}

.table {
  width: 100%;
  border-collapse: collapse;
  @include paper;
  overflow: hidden;

  caption {
    @include eyebrow;
    text-align: left;
    padding: 1rem 1rem 0.5rem;
  }

  th,
  td {
    padding: 0.7rem 1rem;
    text-align: left;
    border-top: 2px dashed var(--c-ink-line-soft);
  }

  th {
    font-weight: 600;
    color: var(--c-ink-soft);
  }

  td {
    font-family: var(--font-display);
    font-weight: 700;
    text-align: right;
  }
}
</style>
