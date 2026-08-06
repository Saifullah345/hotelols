import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cancelPaddleSubscription } from '@/lib/paddle'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { subscriptionId } = await request.json().catch(() => ({}))
  if (!subscriptionId) return NextResponse.json({ error: 'Missing subscriptionId' }, { status: 400 })

  // Confirm this subscription belongs to the caller's hotel
  const { data: profile } = await supabase
    .from('profiles').select('tenant_id').eq('id', user.id).single()

  const { data: hotel } = await supabase
    .from('hotels')
    .select('paddle_subscription_id')
    .eq('id', profile?.tenant_id ?? '')
    .single()

  if (hotel?.paddle_subscription_id !== subscriptionId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ok = await cancelPaddleSubscription(subscriptionId)
  if (!ok) return NextResponse.json({ error: 'Paddle API error' }, { status: 502 })

  return NextResponse.json({ success: true })
}
