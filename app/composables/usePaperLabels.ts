// =============================================================================
// Turning a paper's structural ids into words a parent reads.
//
// Levels, subjects and rounds are stored as slugs everywhere else in the app;
// this is the single place that maps them onto i18n keys, so a renamed label
// only ever changes in the locale files.
// =============================================================================
import { LEVEL_ICON, SUBJECT_ICON } from '~/config/practice.config'
import type { CatalogEntry, Level, Paper, Round, Subject } from '~/types'

/** What a title needs — shared by a catalogue entry and a full paper. */
type Describable = Pick<CatalogEntry | Paper, 'subject' | 'level' | 'round' | 'season' | 'title'>

export function usePaperLabels() {
  const { t } = useI18n()

  const levelLabel = (level: Level) => t(`level.${level}`)
  const subjectLabel = (subject: Subject) => t(`subject.${subject}`)
  const roundLabel = (round: Round) => t(`round.${round}`)

  const subjectIcon = (subject: Subject) => SUBJECT_ICON[subject]
  const levelIcon = (level: Level) => LEVEL_ICON[level]

  /**
   * The full description used as a page title and card subtitle.
   *
   * A hand-written paper carries its own name and belongs to no OSN season or
   * round, so there is nothing to compose — it is shown as the author wrote it,
   * in whichever language they wrote it, rather than being bent into a sentence
   * about a competition it has nothing to do with.
   */
  const fullTitle = (paper: Describable) =>
    paper.title ??
    t('paper.fullTitle', {
      subject: subjectLabel(paper.subject),
      level: levelLabel(paper.level),
      round: roundLabel(paper.round as Round),
      season: paper.season,
    })

  return {
    levelLabel,
    subjectLabel,
    roundLabel,
    subjectIcon,
    levelIcon,
    fullTitle,
  }
}
