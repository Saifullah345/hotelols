'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function toggleSaveHotel(hotelId: string): Promise<{ saved?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' }

  // maybeSingle: "no row yet" is the normal first-save case, not an error.
  const { data: existing } = await supabase
    .from('saved_hotels')
    .select('id')
    .eq('user_id', user.id)
    .eq('hotel_id', hotelId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase.from('saved_hotels').delete().eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('saved_hotels')
      .insert({ user_id: user.id, hotel_id: hotelId })
    // 23505 = the pair is already saved (double click / two tabs) — that's the
    // state we wanted anyway. Any other failure has to surface, otherwise the
    // heart fills in the UI and empties again on the next page load.
    if (error && error.code !== '23505') return { error: error.message }
  }

  const saved = !existing
  // The filled/empty heart is server-rendered on both the listing and the
  // detail page, so both have to be refetched for the change to stick.
  revalidatePath('/')
  revalidatePath(`/hotels/${hotelId}`)
  return { saved }
}
