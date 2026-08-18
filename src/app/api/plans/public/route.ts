import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const admin = await createAdminClient()
  const { data } = await admin
    .from('plans')
    // trial_days so the signup page can say "14 days free" on the plan it is
    // asking people to pick.
    .select('id, name, price_monthly, price_yearly, features, max_rooms, max_staff, trial_days, tier_rank, feature_listing, feature_online_booking')
    .eq('is_active', true)
    .order('price_monthly')
  return NextResponse.json(data ?? [], {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
  })
}
