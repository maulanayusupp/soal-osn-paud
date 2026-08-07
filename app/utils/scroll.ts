// =============================================================================
// Scrolling helpers.
// =============================================================================

/** Height of the sticky header, read from the design token rather than guessed. */
function headerOffset(): number {
  if (typeof window === 'undefined') return 0
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--header-height')
  const rem = Number.parseFloat(raw)
  if (!Number.isFinite(rem)) return 0
  const rootSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  return raw.trim().endsWith('rem') ? rem * rootSize : rem
}

/**
 * Bring `element` to the top of the viewport, clear of the sticky header.
 *
 * `scrollIntoView` is not enough on its own: the header overlays the page, so
 * the element would land underneath it.
 */
export function scrollToElement(element: HTMLElement | null, extra = 12): void {
  if (!element || typeof window === 'undefined') return

  const top = element.getBoundingClientRect().top + window.scrollY - headerOffset() - extra
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  window.scrollTo({ top: Math.max(0, top), behavior: reduced ? 'auto' : 'smooth' })
}
