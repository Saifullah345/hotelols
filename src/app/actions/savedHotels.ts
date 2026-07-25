'use server'

import { createClient } from '@/lib/supabase/server'

export async function toggleSaveHotel(hotelId: string): Promise<{ saved?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' }

  const { data: existing } = await supabase
    .from('saved_hotels')
    .select('id')
    .eq('user_id', user.id)
    .eq('hotel_id', hotelId)
    .single()

  if (existing) {
    await supabase.from('saved_hotels').delete().eq('id', existing.id)
    return { saved: false }
  } else {
    await supabase.from('saved_hotels').insert({ user_id: user.id, hotel_id: hotelId })
    return { saved: true }
  }
}
