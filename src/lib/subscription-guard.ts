import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getSubscription } from '@/lib/subscription'

/**
 * Refuses a write when the hotel's plan has lapsed.
 *
 * The dashboard already hides itself behind a renewal notice, but the API is
 * what actually protects the data — a stale tab or a direct request must not be
 * able to keep operating a hotel that hasn't paid.
 *
 * Returns a response to send back, or null when the hotel may proceed.
 */
export async function blockIfExpired(hotelId: string | null | undefined): Promise<NextResponse | null> {
  if (!hotelId) return null

  const admin = await createAdminClient()
  const { data: hotel } = await admin
    .from('hotels')
    .select('subscription_status, plan_expires_at')
    .eq('id', hotelId)
    .maybeSingle()

  const info = getSubscription(hotel)
  if (info.canOperate) return null

  return NextResponse.json(
    {
      error: 'Your subscription has expired. Renew your plan to continue.',
      code: 'subscription_expired',
    },
    { status: 402 },   // Payment Required
  )
}
