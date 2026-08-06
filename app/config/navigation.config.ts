// =============================================================================
// Navigation structure. `label` is an i18n KEY, never a string to display.
// =============================================================================

export interface NavItem {
  /** i18n key under `nav.` */
  label: string
  /** Route name, resolved through localePath() so EN gets English slugs. */
  to: string
}

export const PRIMARY_NAV: NavItem[] = [
  { label: 'practice', to: 'latihan' },
  { label: 'about', to: 'tentang' },
  { label: 'contact', to: 'kontak' },
]

export const FOOTER_NAV: NavItem[] = [
  { label: 'practice', to: 'latihan' },
  { label: 'about', to: 'tentang' },
  { label: 'contact', to: 'kontak' },
  { label: 'compliance', to: 'kepatuhan' },
  { label: 'privacy', to: 'privasi' },
  { label: 'terms', to: 'ketentuan' },
]
