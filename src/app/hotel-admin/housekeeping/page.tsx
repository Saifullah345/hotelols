import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HousekeepingClient from './HousekeepingClient'

export const metadata = { title: 'Housekeeping' }

export type HKTask = {
  id: string
  hotel_id: string
  room_id: string | null
  room_number: string
  task: string
  priority: 'normal' | 'high' | 'urgent'
  assignee: string
  due_date: string
  status: 'dirty' | 'in_progress' | 'clean'
  notes: string
}

export type RoomOption  = { id: string; room_number: string; name: string | null }
export type StaffOption = { id: string; name: string }

export default async function HousekeepingPage() {
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

  const [{ data: rawTasks }, { data: rooms }, { data: staffRows }] = await Promise.all([
    supabase.from('housekeeping_tasks')
      .select('*, room:rooms(room_number, name)')
      .eq('hotel_id', tenantId)
      .order('due_date')
      .order('created_at'),
    supabase.from('rooms')
      .select('id, room_number, name')
      .eq('hotel_id', tenantId)
      .order('room_number'),
    supabase.from('staff')
      .select('id, name')
      .eq('hotel_id', tenantId)
      .eq('status', 'active')
      .order('name'),
  ])

  const tasks: HKTask[] = (rawTasks ?? []).map((t: Record<string, unknown>) => {
    const room = t.room as { room_number?: string; name?: string | null } | null
    return {
      id: t.id as string,
      hotel_id: t.hotel_id as string,
      room_id: t.room_id as string | null,
      room_number: room?.name || (room?.room_number ? `Room ${room.room_number}` : '—'),
      task: t.task as string,
      priority: t.priority as HKTask['priority'],
      assignee: (t.assignee as string) || '',
      due_date: t.due_date as string,
      status: t.status as HKTask['status'],
      notes: (t.notes as string) || '',
    }
  })

  const roomOptions: RoomOption[] = (rooms ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    room_number: r.room_number as string,
    name: (r.name as string | null) ?? null,
  }))

  const staffOptions: StaffOption[] = (staffRows ?? [])
    .filter((s: Record<string, unknown>) => s.name)
    .map((s: Record<string, unknown>) => ({
      id: s.id as string,
      name: s.name as string,
    }))

  return (
    <HousekeepingClient
      initialTasks={tasks}
      rooms={roomOptions}
      staff={staffOptions}
      tenantId={tenantId}
    />
  )
}
