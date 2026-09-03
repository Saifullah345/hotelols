// Short-stay (hourly) reservations, shared by every route that prices or
// validates one so the guest, the desk and the invoice never disagree.
//
// A nightly booking owns whole calendar days: [check_in 00:00, check_out 00:00).
// An hourly booking owns a slice of them: [check_in + check_in_time,
// check_out + check_out_time) — check_out is usually the same day, but an
// overnight short stay (22:00 → 06:00) legitimately crosses midnight.
//
// Every boundary below is minutes-since-epoch built from the calendar parts, so
// nothing here depends on the server's timezone. `new Date('2026-09-03')` is
// UTC midnight while `new Date('2026-09-03T14:00')` is *local* midnight plus 14h
// — mixing the two silently shifts a stay by the UTC offset, so neither is used.

export type BookingType = 'nightly' | 'hourly'

export interface StayInterval {
  check_in: string
  check_out: string
  booking_type?: string | null
  check_in_time?: string | null
  check_out_time?: string | null
}

const MS_PER_DAY  = 86_400_000
const MS_PER_HOUR = 3_600_000

/** Midnight of a 'YYYY-MM-DD' (or ISO timestamp) as epoch ms, timezone-free. */
export function dayStartMs(date: string): number {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number)
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1)
}

/** Milliseconds past midnight for 'HH:MM' / 'HH:MM:SS', or null when unusable. */
export function timeOffsetMs(time?: string | null): number | null {
  if (typeof time !== 'string') return null
  const parts = time.split(':')
  const h = Number(parts[0])
  const m = Number(parts[1] ?? 0)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return (h * 60 + m) * 60_000
}

/** True when the time string is a well-formed 'HH:MM' / 'HH:MM:SS'. */
export function isValidTime(time?: string | null): boolean {
  return timeOffsetMs(time) !== null
}

/** The half-open [start, end) the reservation actually occupies, in epoch ms. */
export function stayBounds(stay: StayInterval): { start: number; end: number } {
  const inDay  = dayStartMs(stay.check_in)
  const outDay = dayStartMs(stay.check_out)
  if (stay.booking_type !== 'hourly') return { start: inDay, end: outDay }
  return {
    start: inDay  + (timeOffsetMs(stay.check_in_time)  ?? 0),
    end:   outDay + (timeOffsetMs(stay.check_out_time) ?? 0),
  }
}

/** Do two reservations want the same room at the same moment? */
export function staysOverlap(a: StayInterval, b: StayInterval): boolean {
  const first  = stayBounds(a)
  const second = stayBounds(b)
  return first.start < second.end && second.start < first.end
}

/**
 * Hours an hourly stay covers, charged in proportion rather than rounded up to
 * the next whole hour: 90 minutes is 1.5, not 2. Two decimals is exact for every
 * slot the pickers can produce (15-minute steps) and keeps the total off float
 * noise. 0 when the times are missing or run backwards, which the callers reject
 * before pricing anything.
 */
export function stayHours(stay: StayInterval): number {
  const { start, end } = stayBounds({ ...stay, booking_type: 'hourly' })
  if (!(end > start)) return 0
  return Math.round(((end - start) / MS_PER_HOUR) * 100) / 100
}

/** Nights a nightly stay covers — at least one, matching the booking routes. */
export function stayNights(stay: StayInterval): number {
  const nights = Math.ceil((dayStartMs(stay.check_out) - dayStartMs(stay.check_in)) / MS_PER_DAY)
  return Math.max(0, nights)
}

/**
 * Why this hourly request can't be booked, or null when it is fine. Kept in one
 * place so the guest API and the desk API refuse exactly the same things.
 */
export function hourlyProblem(stay: StayInterval): string | null {
  if (!isValidTime(stay.check_in_time) || !isValidTime(stay.check_out_time)) {
    return 'Check-in time and check-out time are required for hourly bookings'
  }
  if (dayStartMs(stay.check_out) < dayStartMs(stay.check_in)) {
    return 'Check-out date cannot be before check-in date'
  }
  const { start, end } = stayBounds({ ...stay, booking_type: 'hourly' })
  if (end <= start) return 'Check-out time must be after check-in time'
  return null
}
