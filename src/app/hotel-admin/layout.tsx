import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminShell } from '@/components/layout/AdminShell'
import { noIndexMetadata } from '@/lib/seo'
import { getPlanFeatures } from '@/lib/plan-features'
import { getCachedHotel, getCachedPlans } from '@/lib/cache'
import { getSubscription } from '@/lib/subscription'
import SubscriptionBanner from '@/components/admin/SubscriptionBanner'
import SubscriptionLocked from '@/components/admin/SubscriptionLocked'
import TrialBanner from '@/components/admin/TrialBanner'
import { trialDaysOf } from '@/lib/paddle-plans'

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

  // Billing state decides whether this is a working dashboard, a renewal
  // notice, or the "choose a plan" gate a newly registered hotel sees. Checked
  // in the layout so it covers every page underneath it.
  const subscription = getSubscription(hotel)
  const pathname = (await headers()).get('x-pathname') ?? ''
  const onAllowedPage = ALLOWED_WHEN_EXPIRED.some(p => pathname.startsWith(p))
  const locked = !subscription.canOperate && !onAllowedPage

  // Only needed for the "start free" line on the lock screen, so it is fetched
  // only when the lock is actually going up.
  const trialOnOffer = locked && subscription.state === 'unsubscribed'
    ? Math.max(0, ...(await getCachedPlans()).map(p => trialDaysOf(p)))
    : 0

  return (
    <AdminShell
      role="hotel-admin"
      hotelName={hotel?.name}
      planFeatures={planFeatures}
      title={hotel?.name ?? 'Hotel Management'}
      profile={profile}
    >
      <div className="space-y-5">
        {/* The trial countdown sits above everything, on every page — a hotel
            should never have to go looking for how long is left. */}
        {subscription.isTrial && subscription.trialEndsAt && (
          <TrialBanner
            trialEndsAt={subscription.trialEndsAt.toISOString()}
            planName={hotel?.plan?.name}
            cancelAt={hotel?.subscription_cancel_at ?? null}
          />
        )}
        <SubscriptionBanner info={subscription} planName={hotel?.plan?.name} />
        {locked
          ? (
            <SubscriptionLocked
              info={subscription}
              hotelName={hotel?.name}
              planName={hotel?.plan?.name}
              trialDays={trialOnOffer}
              hasSubscriptionOnFile={Boolean(hotel?.paddle_subscription_id)}
            />
          )
          : children}
      </div>
    </AdminShell>
  )
}
