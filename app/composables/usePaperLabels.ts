// =============================================================================
// Turning a paper's structural ids into words a parent reads.
//
// Levels, subjects and rounds are stored as slugs everywhere else in the app;
// this is the single place that maps them onto i18n keys, so a renamed label
// only ever changes in the locale files.
// =============================================================================
import { LEVEL_ICON, SUBJECT_ICON } from '~/config/practice.config'
import type { CatalogEntry, Level, Paper, Round, Subject } from '~/types'

/** The four fields a title needs — shared by a catalogue entry and a full paper. */
type Describable = Pick<CatalogEntry | Paper, 'subject' | 'level' | 'round' | 'season'>

export function usePaperLabels() {
  const { t } = useI18n()

  const levelLabel = (level: Level) => t(`level.${level}`)
  const subjectLabel = (subject: Subject) => t(`subject.${subject}`)
  const roundLabel = (round: Round) => t(`round.${round}`)
  const seasonLabel = (season: number) => t('paper.season', { n: season })

  const subjectIcon = (subject: Subject) => SUBJECT_ICON[subject]
  const levelIcon = (level: Level) => LEVEL_ICON[level]

  /** "Matematika · PAUD" — the two things a parent picks by. */
  const shortTitle = (paper: Describable) =>
    `${subjectLabel(paper.subject)} · ${levelLabel(paper.level)}`

  /** The full description used as a page title and card subtitle. */
  const fullTitle = (paper: Describable) =>
    t('paper.fullTitle', {
      subject: subjectLabel(paper.subject),
      level: levelLabel(paper.level),
      round: roundLabel(paper.round),
      season: paper.season,
    })

  return {
    levelLabel,
    subjectLabel,
    roundLabel,
    seasonLabel,
    subjectIcon,
    levelIcon,
    shortTitle,
    fullTitle,
  }
}
