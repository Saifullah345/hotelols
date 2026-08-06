import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportsClient from './ReportsClient'
import { getPlanFeatures, type PlanDbData } from '@/lib/plan-features'
import type { PaymentRow, BookingRow, RoomRow, ReviewRow } from '@/lib/reports'

export const metadata = { title: 'Reports & Analytics' }

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  const [
    { data: payments },
    { data: bookings },
    { data: rooms },
    { data: reviews },
    { data: hotelInfo },
    { data: bookingAmounts },
    { data: allRooms },
    { data: allRoomTypes },
  ] = await Promise.all([
    supabase.from('payments').select('amount, created_at, status, payment_method').eq('hotel_id', tenantId),
    supabase.from('bookings').select('created_at, check_in, check_out, status, total_amount, source').eq('hotel_id', tenantId),
    supabase.from('rooms').select('status').eq('hotel_id', tenantId),
    supabase.from('reviews').select('rating, created_at').eq('hotel_id', tenantId),
    supabase.from('hotels').select('currency, plan:plans(feature_advanced_reports, feature_housekeeping, feature_reviews, feature_online_booking, feature_listing, feature_api_access, feature_multi_property)').eq('id', tenantId).single(),
    supabase.from('bookings').select('total_amount, room_id, user_id, status').eq('hotel_id', tenantId),
    supabase.from('rooms').select('id, room_type_id').eq('hotel_id', tenantId),
    supabase.from('room_types').select('id, name').eq('hotel_id', tenantId),
  ])

  const hotel = hotelInfo as { currency?: string; plan?: PlanDbData | null } | null
  const currency = hotel?.currency ?? 'USD'
  const advancedReports = getPlanFeatures(hotel?.plan).advancedReports

  // Room type revenue: join bookings → rooms → room_types
  const roomTypeIdToName = new Map(
    (allRoomTypes ?? []).map(rt => [(rt as { id: string; name: string }).id, (rt as { id: string; name: string }).name])
  )
  const roomIdToTypeId = new Map(
    (allRooms ?? []).map(r => [(r as { id: string; room_type_id: string }).id, (r as { id: string; room_type_id: string }).room_type_id])
  )
  const rtRevMap = new Map<string, number>()
  for (const b of (bookingAmounts ?? []) as { total_amount: number; room_id: string; user_id: string; status: string }[]) {
    if (b.status === 'cancelled') continue
    const typeId = roomIdToTypeId.get(b.room_id)
    const typeName = typeId ? (roomTypeIdToName.get(typeId) ?? 'Other') : 'Other'
    rtRevMap.set(typeName, (rtRevMap.get(typeName) ?? 0) + Number(b.total_amount ?? 0))
  }
  const roomTypeRevenue = [...rtRevMap.entries()]
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)

  // Top guests: aggregate spend per user, then fetch profiles
  const guestSpend = new Map<string, number>()
  for (const b of (bookingAmounts ?? []) as { total_amount: number; room_id: string; user_id: string; status: string }[]) {
    if (b.status === 'cancelled' || !b.user_id) continue
    guestSpend.set(b.user_id, (guestSpend.get(b.user_id) ?? 0) + Number(b.total_amount ?? 0))
  }
  const topUserIds = [...guestSpend.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([uid]) => uid)

  let topGuests: { name: string; country: string; spend: number }[] = []
  if (topUserIds.length) {
    const { data: guestProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, country')
      .in('id', topUserIds)
    topGuests = topUserIds.map(uid => {
      const p = (guestProfiles ?? []).find((x: { id: string }) => x.id === uid) as { full_name?: string; country?: string } | undefined
      return {
        name: p?.full_name?.trim() || 'Guest',
        country: p?.country || '',
        spend: guestSpend.get(uid) ?? 0,
      }
    })
  }

  return (
    <ReportsClient
      payments={(payments ?? []) as PaymentRow[]}
      bookings={(bookings ?? []) as BookingRow[]}
      rooms={(rooms ?? []) as RoomRow[]}
      reviews={(reviews ?? []) as ReviewRow[]}
      currency={currency}
      serverToday={new Date().toISOString().slice(0, 10)}
      roomTypeRevenue={roomTypeRevenue}
      topGuests={topGuests}
      advancedReports={advancedReports}
      totalRooms={rooms?.length ?? 0}
    />
  )
}
