import type { SupabaseClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Destination matching
// ---------------------------------------------------------------------------

/**
 * Splits a destination query into searchable tokens.
 *
 * The field accepts free text ("wah place", "hotel islamabad"), so matching the
 * whole phrase against a single column finds nothing unless the guest typed the
 * city exactly as it is stored. Tokenising lets "wah place" still surface hotels
 * in "Wah" / "wahcannt"; `relevance()` then pushes the closest matches first.
 *
 * Single characters are dropped (they match nearly everything) and the list is
 * capped so a pasted paragraph can't build a giant PostgREST filter.
 */
export function tokenize(term: string): string[] {
  return Array.from(
    new Set(
      // `,` `(` `)` `*` `%` `\` carry meaning inside a PostgREST or() filter.
      term.replace(/[(),*%\\]/g, ' ')
        .toLowerCase()
        .split(/\s+/)
        .map(t => t.trim())
        .filter(t => t.length >= 2),
    ),
  ).slice(0, 6)
}

const MATCH_COLUMNS = ['name', 'city', 'country', 'address'] as const

/** Builds the `.or()` filter that matches ANY token in ANY searchable column. */
export function buildOrFilter(tokens: string[]): string {
  return tokens.flatMap(t => MATCH_COLUMNS.map(col => `${col}.ilike.%${t}%`)).join(',')
}

export interface Matchable {
  name?: string | null
  city?: string | null
  country?: string | null
  address?: string | null
}

/**
 * Lower is better. Ranks by how many query tokens the hotel matches, then by how
 * precisely it matched (exact city/name > starts-with > substring), so a search
 * for "wah palace" leads with Wah Palace rather than every hotel near Wah.
 */
export function relevance(hotel: Matchable, tokens: string[]): number {
  if (!tokens.length) return 0

  const fields = [hotel.city, hotel.name, hotel.country, hotel.address]
    .map(v => (v ?? '').toLowerCase().trim())
    .filter(Boolean)

  let matched = 0
  let best = 3
  for (const token of tokens) {
    const exact = fields.some(f => f === token)
    const prefix = !exact && fields.some(f => f.split(/\s+/).some(word => word.startsWith(token)))
    const partial = !exact && !prefix && fields.some(f => f.includes(token))
    if (exact || prefix || partial) {
      matched++
      best = Math.min(best, exact ? 0 : prefix ? 1 : 2)
    }
  }

  if (!matched) return 100
  // Unmatched tokens cost more than an imprecise match, so a hotel hitting both
  // words always outranks one hitting a single word exactly.
  return (tokens.length - matched) * 10 + best
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

/** True when both dates are present and check-out is strictly after check-in. */
export function hasValidRange(checkIn?: string, checkOut?: string): boolean {
  if (!checkIn || !checkOut) return false
  const from = new Date(checkIn).getTime()
  const to = new Date(checkOut).getTime()
  return Number.isFinite(from) && Number.isFinite(to) && to > from
}

/** Whole nights between two ISO dates (minimum 1 for a valid range). */
export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000))
}

/**
 * Room IDs already taken for the given range across the given hotels.
 *
 * Mirrors the overlap rule enforced by the `bookings` insert trigger: only
 * confirmed and checked-in stays block a roomand a range touching another
 * only at the changeover day is not a conflict (`check_in < other.check_out`
 * and `check_out > other.check_in`).
 */
export async function getBookedRoomIds(
  supabase: SupabaseClient,
  hotelIds: string[],
  checkIn: string,
  checkOut: string,
): Promise<Set<string>> {
  if (!hotelIds.length) return new Set()

  const { data } = await supabase
    .from('bookings')
    .select('room_id, room_ids')
    .in('hotel_id', hotelIds)
    .in('status', ['confirmed', 'checked_in', 'pending'])
    .lt('check_in', checkOut)
    .gt('check_out', checkIn)

  return new Set(
    (data ?? []).flatMap((b: { room_id: string; room_ids: string[] | null }) =>
      b.room_ids?.length ? b.room_ids : [b.room_id],
    ),
  )
}
