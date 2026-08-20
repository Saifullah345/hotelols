import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth'
import { isValidEmail, validateHotelName } from '@/lib/validation'
import { generateHotelSlug } from '@/lib/slug'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { user, profile } = await getAuthContext()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only customers (or any logged-in user without a hotel yet) can use this endpoint

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Prevent registering a second hotel if they already own one
  const admin = await createAdminClient()
  const { data: existingHotel } = await admin
    .from('hotels')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()

  if (existingHotel) {
    return NextResponse.json({ error: 'You already have a hotel registered under this account.' }, { status: 409 })
  }

  const body = await request.json().catch(() => null)
  const hotel_name  = typeof body?.hotel_name  === 'string' ? body.hotel_name.trim()                : ''
  const city        = typeof body?.city        === 'string' ? body.city.trim()                       : ''
  const country     = typeof body?.country     === 'string' ? body.country.trim()                    : 'Pakistan'
  const address     = typeof body?.address     === 'string' ? body.address.trim()                    : ''
  const hotel_phone = typeof body?.hotel_phone === 'string' ? body.hotel_phone.trim()               : ''
  const hotel_email = typeof body?.hotel_email === 'string' ? body.hotel_email.trim().toLowerCase() : user.email ?? ''
  const plan_id     = typeof body?.plan_id     === 'string' ? body.plan_id                          : null

  if (!hotel_name || !city) {
    return NextResponse.json({ error: 'hotel_name and city are required' }, { status: 400 })
  }
  const hotelNameError = validateHotelName(hotel_name)
  if (hotelNameError) return NextResponse.json({ error: hotelNameError }, { status: 400 })
  if (!hotel_phone) {
    return NextResponse.json({ error: 'Hotel phone is required' }, { status: 400 })
  }
  if (!hotel_email || !isValidEmail(hotel_email)) {
    return NextResponse.json({ error: 'Enter a valid hotel email address' }, { status: 400 })
  }

  // Validate plan
  let resolvedPlanId: string | null = null
  if (plan_id) {
    const { data: plan } = await admin.from('plans').select('id').eq('id', plan_id).eq('is_active', true).single()
    resolvedPlanId = plan?.id ?? null
  }
  if (!resolvedPlanId) {
    const { data: plan } = await admin.from('plans').select('id').eq('is_active', true).order('price_monthly').limit(1).single()
    resolvedPlanId = plan?.id ?? null
  }
  if (!resolvedPlanId) {
    return NextResponse.json({ error: 'No active plans found. Please contact support.' }, { status: 500 })
  }

  const slug = generateHotelSlug(hotel_name)

  const { data: hotel, error: hotelError } = await admin.from('hotels').insert({
    name:     hotel_name,
    slug,
    city,
    country,
    address,
    phone:    hotel_phone,
    email:    hotel_email,
    owner_id: user.id,
    // Chosen, not bought. The hotel-admin dashboard stays locked behind
    // "choose a plan" until a subscription is actually running.
    plan_id:  resolvedPlanId,
    status:   'pending',
    subscription_status: 'unsubscribed',
    currency: 'USD',
  }).select('id').single()

  if (hotelError || !hotel) {
    return NextResponse.json({ error: 'Failed to create hotel. Please try again.' }, { status: 500 })
  }

  // Add hotel_admin role for this user pointing to the new hotel
  await admin.from('user_roles').insert({
    user_id:   user.id,
    role:      'hotel_admin',
    tenant_id: hotel.id,
  })

  // If the profile has no tenant yet, set it so they can switch to hotel admin mode
  await admin.from('profiles')
    .update({ tenant_id: hotel.id })
    .eq('id', user.id)
    .is('tenant_id', null)

  return NextResponse.json({ success: true, hotel_id: hotel.id }, { status: 201 })
}
