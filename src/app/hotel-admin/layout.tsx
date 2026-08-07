import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/layout/AdminShell'
import { noIndexMetadata } from '@/lib/seo'
import { getPlanFeatures } from '@/lib/plan-features'
import { getCachedHotel } from '@/lib/cache'
import { getSubscription } from '@/lib/subscription'
import SubscriptionBanner from '@/components/admin/SubscriptionBanner'
import SubscriptionLocked from '@/components/admin/SubscriptionLocked'

/** Screens that stay open once the plan lapses — the way to renew must not be
 *  behind the lock, and settings is where the account itself lives. */
const ALLOWED_WHEN_EXPIRED = ['/hotel-admin/billing', '/hotel-admin/settings']

export const metadata = noIndexMetadata

export default async function HotelAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const store = await cookies()
  const activeRole     = store.get('bq_role')?.value
  const activeTenantId = store.get('bq_tenant')?.value

  if (activeRole !== 'hotel_admin' || !activeTenantId) redirect('/select-role')

  // Role verification and profile/hotel fetch have no inter-dependency — run all
  // three concurrently to save one sequential DB round-trip per page load.
  const [roleResult, [{ data: profile }, hotel]] = await Promise.all([
    supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .eq('role', 'hotel_admin')
      .eq('tenant_id', activeTenantId)
      .maybeSingle(),
    Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      getCachedHotel(activeTenantId),
    ]),
  ])

  if (!roleResult.data) redirect('/select-role')

  const planFeatures = getPlanFeatures(hotel?.plan ?? null)

  // Billing state decides whether this is a working dashboard or a renewal
  // notice. Checked in the layout so it covers every page underneath it.
  const subscription = getSubscription(hotel)
  const pathname = (await headers()).get('x-pathname') ?? ''
  const onAllowedPage = ALLOWED_WHEN_EXPIRED.some(p => pathname.startsWith(p))
  const locked = !subscription.canOperate && !onAllowedPage

  return (
    <AdminShell
      role="hotel-admin"
      hotelName={hotel?.name}
      planFeatures={planFeatures}
      title={hotel?.name ?? 'Hotel Management'}
      profile={profile}
    >
      <div className="space-y-5">
        <SubscriptionBanner info={subscription} planName={hotel?.plan?.name} />
        {locked
          ? <SubscriptionLocked info={subscription} hotelName={hotel?.name} planName={hotel?.plan?.name} />
          : children}
      </div>
    </AdminShell>
  )
}
