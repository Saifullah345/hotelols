import { createClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/auth'
import FloorsClient from './FloorsClient'

export const metadata = { title: 'Floor Management' }

export default async function FloorsPage() {
  const supabase    = await createClient()
  const { tenantId } = await requireTenant()

  const { data: floors } = await supabase
    .from('hotel_floors')
    .select('id, floor_number, name')
    .eq('hotel_id', tenantId)
    .order('floor_number')

  return <FloorsClient initial={floors ?? []} />
}
