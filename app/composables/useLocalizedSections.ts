// =============================================================================
// Reading structured prose out of the locale files.
//
// The compliance, privacy and terms pages are stored as arrays of sections
// rather than as one blob of markup, so Indonesian and English are forced to
// keep the same shape — a section can't quietly go missing from one language.
//
// vue-i18n hands back compiled messages for anything below a leaf, so every
// string has to go through rt() before it can be rendered.
// =============================================================================
export interface LocalizedSection {
  heading: string
  body: string[]
  list: string[]
}

export function useLocalizedSections(key: string) {
  const { tm, rt } = useI18n()

  return computed<LocalizedSection[]>(() => {
    const raw = tm(key) as unknown
    if (!Array.isArray(raw)) return []

    return raw.map((section) => {
      const entry = section as Record<string, unknown>
      const asStrings = (value: unknown) =>
        Array.isArray(value) ? value.map((item) => rt(item as never)) : []
      return {
        heading: entry.heading ? rt(entry.heading as never) : '',
        body: asStrings(entry.body),
        list: asStrings(entry.list),
      }
    })
  })
}
