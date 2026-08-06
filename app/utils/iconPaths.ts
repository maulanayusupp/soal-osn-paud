// =============================================================================
// SVG path registry.
//
// One place for every icon means no component ships a stray inline <svg>, and
// swapping an icon is a one-line change. All paths are drawn on a 24x24 grid
// and stroked (not filled), so they inherit currentColor and line weight.
// =============================================================================

export const ICON_PATHS = {
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  arrowLeft: 'M19 12H5M11 18l-6-6 6-6',
  check: 'M20 6L9 17l-5-5',
  close: 'M18 6L6 18M6 6l12 12',
  play: 'M8 5.5v13l11-6.5z',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.6M20 5v6h-6',
  shuffle: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  sparkle: 'M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z',
  book: 'M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z M18 17H6',
  shield: 'M12 3l7 3v6c0 4.2-2.9 7.8-7 9-4.1-1.2-7-4.8-7-9V6z',
  mail: 'M3 6h18v12H3z M3 7l9 6 9-6',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c2.5 2.4 3.8 5.5 3.8 9S14.5 18.6 12 21c-2.5-2.4-3.8-5.5-3.8-9S9.5 5.4 12 3z',
  home: 'M4 11l8-7 8 7 M6 10v10h12V10',
  chevronDown: 'M6 9l6 6 6-6',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 11v5 M12 8h.01',
  leaf: 'M20 4C10 4 4 9 4 16c0 2 1 4 1 4s2-8 15-11 M5 20c2-6 7-10 14-12',
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 11.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1z',
  trash: 'M4 7h16 M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2 M6 7l1 13h10l1-13',
} as const

export type IconName = keyof typeof ICON_PATHS
