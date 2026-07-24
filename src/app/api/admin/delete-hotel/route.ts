import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, tenant_id').eq('id', user.id).single()

  if (!profile || profile.role !== 'hotel_admin') {
    return NextResponse.json({ error: 'Only hotel admins can delete their hotel.' }, { status: 403 })
  }

  const hotelId = profile.tenant_id
  if (!hotelId) return NextResponse.json({ error: 'No hotel linked to your account.' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const confirmName = typeof body.confirm_name === 'string' ? body.confirm_name.trim() : ''

  if (!confirmName) {
    return NextResponse.json({ error: 'Type your hotel name to confirm deletion.' }, { status: 400 })
  }

  // Verify the typed name matches
  const { data: hotel } = await supabase.from('hotels').select('name').eq('id', hotelId).single()
  if (!hotel) return NextResponse.json({ error: 'Hotel not found.' }, { status: 404 })

  if (confirmName.toLowerCase() !== hotel.name.trim().toLowerCase()) {
    return NextResponse.json(
      { error: `Hotel name doesn't match. Type "${hotel.name}" exactly.` },
      { status: 400 },
    )
  }

  const admin = await createAdminClient()

  // Clear tenant_id on all staff profiles before cascade-deleting the hotel
  await admin.from('profiles').update({ tenant_id: null }).eq('tenant_id', hotelId)

  // Delete the hotel — CASCADE removes rooms, room_types, bookings, payments, etc.
  const { error } = await admin.from('hotels').delete().eq('id', hotelId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
