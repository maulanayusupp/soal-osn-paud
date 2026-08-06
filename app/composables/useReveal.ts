// =============================================================================
// Reveal-on-scroll for `.reveal` elements.
//
// The CSS in _utilities.scss already leaves elements visible when the visitor
// prefers reduced motion, so this only ever adds the class that finishes an
// animation which may not run at all.
// =============================================================================
export function useReveal(selector = '.reveal') {
  const root = ref<HTMLElement | null>(null)

  onMounted(() => {
    const scope: ParentNode = root.value ?? document
    const targets = Array.from(scope.querySelectorAll<HTMLElement>(selector))
    if (!targets.length) return

    if (!('IntersectionObserver' in window)) {
      targets.forEach((element) => element.classList.add('is-revealed'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.classList.add('is-revealed')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )

    targets.forEach((element) => observer.observe(element))
    onBeforeUnmount(() => observer.disconnect())
  })

  return { root }
}
