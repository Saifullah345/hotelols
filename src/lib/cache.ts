import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server'
import type { PlanDbData } from '@/lib/plan-features'

// ── Cache tags ────────────────────────────────────────────────────────────────
// Exported so mutation routes can call revalidateTag(CACHE_TAGS.hotel(id)) to
// bust specific entries without blowing the entire cache.
export const CACHE_TAGS = {
  hotel:        (id: string) => `hotel-${id}`,
  roomTypes:    (id: string) => `room-types-${id}`,
  plans:        'plans',
  publicHotels: 'public-hotels',
} as const

export type HotelCached = {
  id: string
  name: string
  currency: string
  status: string
  plan: PlanDbData | null
}

// ── Hotel info + plan ─────────────────────────────────────────────────────────
// Keyed per hotel, 60 s TTL. Saves one DB round-trip on every hotel-admin page
// (layout.tsx fetches this on every navigation). Uses the service-role client so
// it works inside unstable_cache without cookie access.
export function getCachedHotel(hotelId: string): Promise<HotelCached | null> {
  return unstable_cache(
    async () => {
      const supabase = await createAdminClient()
      const { data } = await supabase
        .from('hotels')
        .select(`
          id, name, currency, status,
          plan:plans(
            name, max_rooms, max_staff,
            feature_listing, feature_housekeeping, feature_reviews, feature_online_booking,
            feature_advanced_reports, feature_api_access, feature_multi_property
          )
        `)
        .eq('id', hotelId)
        .single()
      return (data ?? null) as HotelCached | null
    },
    [`hotel-data-${hotelId}`],
    { revalidate: 60, tags: [CACHE_TAGS.hotel(hotelId)] }
  )()
}

// ── Room types per hotel ──────────────────────────────────────────────────────
// 2-minute TTL — room types are rarely created or renamed, so this is safe.
export function getCachedRoomTypes(hotelId: string): Promise<Array<{
  id: string; name: string; capacity: number | null
  max_adults: number | null; max_children: number | null
}>> {
  return unstable_cache(
    async () => {
      const supabase = await createAdminClient()
      const { data } = await supabase
        .from('room_types')
        .select('id, name, capacity, max_adults, max_children')
        .eq('hotel_id', hotelId)
        .order('name')
      return data ?? []
    },
    [`room-types-${hotelId}`],
    { revalidate: 120, tags: [CACHE_TAGS.roomTypes(hotelId)] }
  )()
}

// ── Active plans ──────────────────────────────────────────────────────────────
// 5-minute TTL — plans change only when a super-admin edits them.
export const getCachedPlans = unstable_cache(
  async () => {
    const supabase = await createAdminClient()
    const { data } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly')
    return data ?? []
  },
  ['plans-active'],
  { revalidate: 300, tags: [CACHE_TAGS.plans] }
)
