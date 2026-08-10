import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GuestsClient, { type GuestRecord } from './GuestsClient'

export const metadata = { title: 'Guest Directory' }

type ProfileRow = {
  id: string
  full_name: string
  email: string
  phone: string | null
  country: string | null
  avatar_url: string | null
}

type BookingRow = {
  user_id: string
  status: string
  check_in: string
  special_requests: string | null
}

type HotelGuestRow = {
  id: string
  hotel_id: string
  user_id: string | null
  name: string
  email: string | null
  phone: string | null
  country: string | null
  passport_id: string | null
  notes: string | null
  is_vip: boolean
}

export default async function GuestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  const tenantId = profile?.tenant_id
  if (!tenantId) redirect('/login')

  const [{ data: bookings }, { data: hotelGuests }] = await Promise.all([
    supabase
      .from('bookings')
      .select('user_id, status, check_in, special_requests')
      .eq('hotel_id', tenantId),
    supabase
      .from('hotel_guests')
      .select('*')
      .eq('hotel_id', tenantId),
  ])

  // Unique user_ids from bookings
  const userIds = [...new Set(
    ((bookings ?? []) as BookingRow[]).map(b => b.user_id).filter(Boolean)
  )]

  // Fetch matching profiles
  const profileMap = new Map<string, ProfileRow>()
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, country, avatar_url')
      .in('id', userIds)
    for (const p of (profiles ?? []) as ProfileRow[]) profileMap.set(p.id, p)
  }

  // Aggregate stays + pull latest special_requests, status, and check-in date per user
  const stayCount      = new Map<string, number>()
  const lastNotes      = new Map<string, string>()
  const lastStatusMap  = new Map<string, 'checked_in' | 'checked_out'>()
  const lastCheckInMap = new Map<string, string>()

  for (const b of (bookings ?? []) as BookingRow[]) {
    if (!b.user_id) continue
    if (b.status !== 'cancelled') stayCount.set(b.user_id, (stayCount.get(b.user_id) ?? 0) + 1)
    if (b.special_requests?.trim()) lastNotes.set(b.user_id, b.special_requests.trim())
    // checked_in overrides checked_out — guest is currently on property
    if (b.status === 'checked_in') {
      lastStatusMap.set(b.user_id, 'checked_in')
    } else if (b.status === 'checked_out' && lastStatusMap.get(b.user_id) !== 'checked_in') {
      lastStatusMap.set(b.user_id, 'checked_out')
    }
    // Track the most recent check-in date
    const prev = lastCheckInMap.get(b.user_id)
    if (b.check_in && (!prev || b.check_in > prev)) {
      lastCheckInMap.set(b.user_id, b.check_in)
    }
  }

  const hgByUserId = new Map<string, HotelGuestRow>()
  const manualRows: HotelGuestRow[] = []
  for (const g of (hotelGuests ?? []) as HotelGuestRow[]) {
    if (g.user_id) hgByUserId.set(g.user_id, g)
    else manualRows.push(g)
  }

  // Profile-linked guests (derived from bookings)
  const profileGuests: GuestRecord[] = userIds.flatMap(uid => {
    const p = profileMap.get(uid)
    if (!p) return []
    const hg = hgByUserId.get(uid)
    const stays = stayCount.get(uid) ?? 0
    return [{
      id: hg?.id ?? uid,
      user_id: uid,
      hotel_id: tenantId,
      name: p.full_name?.trim() || p.email || 'Unknown',
      email: p.email ?? '',
      phone: p.phone ?? '',
      country: p.country ?? '',
      avatar_url: p.avatar_url ?? null,
      passport_id: hg?.passport_id ?? '',
      notes: hg?.notes || lastNotes.get(uid) || '',
      is_vip: hg?.is_vip ?? stays >= 3,
      stays,
      is_manual: false,
      last_booking_status: lastStatusMap.get(uid) ?? null,
      last_booking_date:   lastCheckInMap.get(uid) ?? null,
    }]
  })

  // Manually-added guests (no linked profile)
  const manualGuests: GuestRecord[] = manualRows.map(g => ({
    id: g.id,
    user_id: null,
    hotel_id: tenantId,
    name: g.name || 'Unknown',
    email: g.email ?? '',
    phone: g.phone ?? '',
    country: g.country ?? '',
    avatar_url: null,
    passport_id: g.passport_id ?? '',
    notes: g.notes ?? '',
    is_vip: g.is_vip,
    stays: 0,
    is_manual: true,
    last_booking_status: null,
    last_booking_date:   null,
  }))

  const allGuests = [...profileGuests, ...manualGuests].sort((a, b) => {
    if (b.is_vip !== a.is_vip) return Number(b.is_vip) - Number(a.is_vip)
    return b.stays - a.stays
  })

  return <GuestsClient initialGuests={allGuests} tenantId={tenantId} />
}
