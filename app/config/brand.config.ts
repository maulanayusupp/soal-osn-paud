// =============================================================================
// Brand structure. Text lives in i18n; only ids, routes and values live here.
// =============================================================================

export const BRAND = {
  name: 'Kancil Pintar',
  /** The mascot: si Kancil, the clever mouse-deer of Indonesian folk tales. */
  mascot: 'Kancil',
  /** Used by schema.org and the footer. Not a registered company. */
  founded: 2026,
} as const

/** Where the practice content came from, stated plainly on /kepatuhan. */
export const SOURCE = {
  organiser: 'Olimpiade Siswa Nasional (OSN)',
  seasons: [1, 2, 3, 4],
  firstPrinted: 'DESEMBER 2024',
  latestPrinted: 'FEBRUARI 2026',
} as const
