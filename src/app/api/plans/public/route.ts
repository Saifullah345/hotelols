import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const admin = await createAdminClient()
  const { data } = await admin
    .from('plans')
    .select('id, name, price_monthly, price_yearly, features, max_rooms, max_staff, feature_listing, feature_online_booking')
    .eq('is_active', true)
    .order('price_monthly')
  return NextResponse.json(data ?? [], {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
  })
}
