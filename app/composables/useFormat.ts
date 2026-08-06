// =============================================================================
// Locale-aware formatting. Indonesian uses a comma decimal and a dot thousands
// separator, so numbers must never be hand-formatted.
// =============================================================================
export function useFormat() {
  const { locale } = useI18n()

  const tag = computed(() => (locale.value === 'en' ? 'en-US' : 'id-ID'))

  const number = (value: number) => new Intl.NumberFormat(tag.value).format(value)

  const percent = (value: number) => `${number(Math.round(value))}%`

  const date = (iso: string) =>
    new Intl.DateTimeFormat(tag.value, { dateStyle: 'medium' }).format(new Date(iso))

  const dateTime = (iso: string) =>
    new Intl.DateTimeFormat(tag.value, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso),
    )

  return { number, percent, date, dateTime }
}
