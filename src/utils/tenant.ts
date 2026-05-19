import { createClient } from '@/lib/supabase/server'

export async function getCurrentTenantId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  return profile?.tenant_id ?? null
}

export function buildTenantQuery<T>(
  query: T & { eq: (col: string, val: string) => T },
  tenantId: string
) {
  return query.eq('hotel_id', tenantId)
}
