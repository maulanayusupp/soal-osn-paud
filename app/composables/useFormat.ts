// =============================================================================
// Locale-aware formatting. Indonesian uses a comma decimal and a dot thousands
// separator, so numbers must never be hand-formatted.
// =============================================================================
export function useFormat() {
  const { locale } = useI18n()

  const tag = computed(() => (locale.value === 'en' ? 'en-US' : 'id-ID'))

  const number = (value: number) => new Intl.NumberFormat(tag.value).format(value)

  const percent = (value: number) => `${number(Math.round(value))}%`

  const time = (iso: string) =>
    new Intl.DateTimeFormat(tag.value, { timeStyle: 'short' }).format(new Date(iso))

  const dateLong = (iso: string) =>
    new Intl.DateTimeFormat(tag.value, { dateStyle: 'long' }).format(new Date(iso))

  /**
   * Whole calendar days between then and now: 0 today, 1 yesterday.
   *
   * Counted from midnight to midnight rather than in elapsed hours. Something at
   * 11pm and something at 1am are two hours apart but belong to different days,
   * and "kemarin" means what the calendar says, not what the clock does.
   */
  const daysAgo = (iso: string) => {
    const midnight = (date: Date) =>
      new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    return Math.round((midnight(new Date()) - midnight(new Date(iso))) / 86_400_000)
  }

  return { number, percent, time, dateLong, daysAgo }
}
