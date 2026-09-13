import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { roomLabel } from '@/lib/room-label'

const PAGE_SIZE = 50

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (!caller || !['super_admin', 'hotel_admin', 'hotel_staff'].includes(caller.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const hotelId = caller.tenant_id as string | null
  if (!hotelId) return NextResponse.json({ error: 'No hotel' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10))

  const { data: rawTasks, error } = await supabase
    .from('housekeeping_tasks')
    .select('*, room:rooms(room_number, name)')
    .eq('hotel_id', hotelId)
    .order('due_date')
    .order('created_at')
    .range(offset, offset + PAGE_SIZE - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tasks = (rawTasks ?? []).map((t: Record<string, unknown>) => {
    const room = t.room as { room_number?: string; name?: string | null } | null
    return {
      id: t.id,
      hotel_id: t.hotel_id,
      room_id: t.room_id,
      room_number: room ? roomLabel(room) : '—',
      task: t.task,
      priority: t.priority,
      assignee: (t.assignee as string) || '',
      due_date: t.due_date,
      status: t.status,
      notes: (t.notes as string) || '',
    }
  })

  return NextResponse.json({
    tasks,
    hasMore: (rawTasks ?? []).length === PAGE_SIZE,
  })
}
