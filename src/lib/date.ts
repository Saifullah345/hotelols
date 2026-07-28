// Local-calendar date helpers.
//
// `new Date().toISOString().split('T')[0]` is the usual shortcut for "today as
// yyyy-mm-dd", but it converts to UTC first. East of Greenwich that shifts the
// answer a day backwards for part of the day, which turned "check-in + 1 night"
// into "check-in" and silently produced an empty date range. These helpers read
// the local calendar parts instead, so the string always matches the date the
// user sees in the picker.

/** yyyy-mm-dd for a Date, from its LOCAL calendar parts. */
export function toISODate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

/** Today as yyyy-mm-dd in the viewer's own timezone. */
export function todayISO(): string {
  return toISODate(new Date())
}

/** Shifts a yyyy-mm-dd string by whole days, staying on the local calendar. */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}
