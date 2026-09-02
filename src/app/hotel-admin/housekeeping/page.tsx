import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/auth'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { getPlanFeatures } from '@/lib/plan-features'
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
  const { tenantId } = await requireTenant()

  const { data: hotelPlan } = await supabase
    .from('hotels').select(
      'plan:plans(name, feature_housekeeping, feature_reviews, feature_online_booking, feature_advanced_reports, feature_api_access, feature_multi_property)'
    ).eq('id', tenantId).single()
  const planDbData = (hotelPlan?.plan ?? null) as import('@/lib/plan-features').PlanDbData | null
  const planName = planDbData?.name ?? ''
  if (!getPlanFeatures(planDbData).housekeeping) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="rounded-2xl border border-gray-100 bg-white p-10 shadow-sm max-w-md w-full">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 mx-auto">
            <Sparkles className="h-7 w-7 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Housekeeping is a Growth feature</h2>
          <p className="mt-2 text-sm text-gray-500">
            Your current <span className="font-medium capitalize">{planName || 'Starter'}</span> plan does not include the Housekeeping module.
            Upgrade to Growth or higher to unlock task management, room trackingand staff assignments.
          </p>
          <Link
            href="/hotel-admin/settings"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
          >
            View Plan Options
          </Link>
        </div>
      </div>
    )
  }

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
