import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth'

export async function POST() {
  const supabase = await createClient()
  const { user, profile } = await getAuthContext()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const hotelId = profile?.tenant_id
  if (!hotelId) return NextResponse.json({ error: 'No hotel' }, { status: 400 })

  const today = new Date().toISOString().slice(0, 10)

  // Fetch overdue checkouts, today's departures, and today's pending arrivals in parallel
  const [{ data: overdueBookings }, { data: departingBookings }, { data: arrivingBookings }] = await Promise.all([
    supabase.from('bookings').select('id').eq('hotel_id', hotelId).eq('status', 'checked_in').lt('check_out', today),
    supabase.from('bookings').select('id').eq('hotel_id', hotelId).eq('status', 'checked_in').eq('check_out', today),
    supabase.from('bookings').select('id').eq('hotel_id', hotelId).eq('status', 'confirmed').eq('check_in', today),
  ])

  const overdueCount   = overdueBookings?.length  ?? 0
  const departingCount = departingBookings?.length ?? 0
  const arrivingCount  = arrivingBookings?.length  ?? 0

  if (overdueCount === 0 && departingCount === 0 && arrivingCount === 0) return NextResponse.json({ inserted: 0 })

  // Which notification titles were already sent today? (deduplication)
  const { data: todayNotifs } = await supabase
    .from('notifications')
    .select('title')
    .eq('user_id', user.id)
    .eq('hotel_id', hotelId)
    .gte('created_at', today + 'T00:00:00.000Z')
    .eq('type', 'booking')

  const sentToday = new Set((todayNotifs ?? []).map(n => n.title))
  const inserts: object[] = []

  if (overdueCount > 0) {
    const title = `${overdueCount} Overdue Checkout${overdueCount > 1 ? 's' : ''}`
    if (!sentToday.has(title)) {
      inserts.push({
        user_id: user.id,
        hotel_id: hotelId,
        title,
        message: `${overdueCount} guest${overdueCount > 1 ? 's have' : ' has'} not checked out. Room${overdueCount > 1 ? 's are' : ' is'} blocked for new bookings until checked out.`,
        type: 'booking',
        data: { type: 'overdue_checkout', count: overdueCount },
      })
    }
  }

  if (departingCount > 0) {
    const title = `${departingCount} Guest${departingCount > 1 ? 's' : ''} Checking Out Today`
    if (!sentToday.has(title)) {
      inserts.push({
        user_id: user.id,
        hotel_id: hotelId,
        title,
        message: `${departingCount} guest${departingCount > 1 ? 's are' : ' is'} scheduled to check out today by 12:00 PM.`,
        type: 'booking',
        data: { type: 'today_checkout', count: departingCount },
      })
    }
  }

  if (arrivingCount > 0) {
    const title = `${arrivingCount} Guest${arrivingCount > 1 ? 's' : ''} Arriving Today`
    if (!sentToday.has(title)) {
      inserts.push({
        user_id: user.id,
        hotel_id: hotelId,
        title,
        message: `${arrivingCount} guest${arrivingCount > 1 ? 's are' : ' is'} scheduled to check in today. Make sure to mark them as checked in once they arrive.`,
        type: 'booking',
        data: { type: 'today_arrival', count: arrivingCount },
      })
    }
  }

  if (inserts.length > 0) {
    await supabase.from('notifications').insert(inserts)
  }

  return NextResponse.json({ inserted: inserts.length })
}
