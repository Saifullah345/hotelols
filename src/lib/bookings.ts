import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Number of nights between two ISO date strings.
 * Use everywhere instead of inline 86_400_000 division.
 */
export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.max(
    1,
    Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000,
    ),
  )
}

/**
 * Auto-mark expired bookings for a hotel.
 * - confirmed + check_in < today  →  no_show  (payment collected, guest no-showed)
 * - pending   + check_in < today  →  overdue  (payment never collected, dates passed)
 *
 * Call from server page components on load — runs silently, best-effort.
 */
export async function markExpiredBookings(
  supabase: SupabaseClient,
  hotelId: string,
  today: string,
): Promise<void> {
  await Promise.all([
    supabase
      .from('bookings')
      .update({ status: 'no_show' })
      .eq('hotel_id', hotelId)
      .eq('status', 'confirmed')
      .lt('check_in', today),
    supabase
      .from('bookings')
      .update({ status: 'overdue' })
      .eq('hotel_id', hotelId)
      .eq('status', 'pending')
      .lt('check_in', today),
  ])
}
