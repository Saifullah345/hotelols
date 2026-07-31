import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportsClient from './ReportsClient'
import type { PaymentRow, BookingRow, RoomRow, ReviewRow } from '@/lib/reports'

export const metadata = { title: 'Reports & Analytics' }

// Always read through to the database: a report the desk just refreshed must
// not come back from a cached render.
export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  // The rows are fetched once and every window is computed from them in the
  // browser, so changing the period is instant and never refetches.
  const [{ data: payments }, { data: bookings }, { data: rooms }, { data: reviews }, { data: hotelInfo }] =
    await Promise.all([
      supabase.from('payments').select('amount, created_at, status, payment_method').eq('hotel_id', tenantId),
      supabase.from('bookings').select('created_at, check_in, check_out, status, total_amount, source').eq('hotel_id', tenantId),
      supabase.from('rooms').select('status').eq('hotel_id', tenantId),
      supabase.from('reviews').select('rating, created_at').eq('hotel_id', tenantId),
      supabase.from('hotels').select('currency').eq('id', tenantId).single(),
    ])

  const currency = (hotelInfo as { currency?: string } | null)?.currency ?? 'USD'

  return (
    <ReportsClient
      payments={(payments ?? []) as PaymentRow[]}
      bookings={(bookings ?? []) as BookingRow[]}
      rooms={(rooms ?? []) as RoomRow[]}
      reviews={(reviews ?? []) as ReviewRow[]}
      currency={currency}
      serverToday={new Date().toISOString().slice(0, 10)}
    />
  )
}
