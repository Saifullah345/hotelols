import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext, getSessionSubject } from '@/lib/auth'
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
 *  behind the lockand settings is where the account itself lives. */
const ALLOWED_WHEN_EXPIRED = ['/hotel-admin/billing', '/hotel-admin/settings']

export const metadata = noIndexMetadata

export default async function HotelAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // Cookies are a local read, so resolve them before anything awaits the
  // network — a wrong role here means we redirect without querying at all.
  const store = await cookies()
  const activeRole     = store.get('bq_role')?.value
  const activeTenantId = store.get('bq_tenant')?.value

  // The role row used to wait for getAuthContext() to hand back a verified user
  // id, which put a second serial Supabase round-trip in front of every admin
  // navigation. The id the session cookie claims is available for free and is
  // enough to *start* the query — it is only trusted afterwardsand only if
  // getUser() confirms it names this user. Same guarantee getAuthContext() uses
  // for the speculative profile readand the fallback below is what the code
  // did before, so the worst case is the old timing and never a wrong answer.
  const claimedId = activeTenantId ? await getSessionSubject() : null

  const roleQuery = (userId: string, tenantId: string) =>
    supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'hotel_admin')
      .eq('tenant_id', tenantId)
      .maybeSingle()

  const [{ user, profile }, speculativeRole, hotel] = await Promise.all([
    getAuthContext(),
    claimedId && activeTenantId ? roleQuery(claimedId, activeTenantId) : Promise.resolve(null),
    activeTenantId ? getCachedHotel(activeTenantId) : Promise.resolve(null),
  ])

  if (!user) redirect('/login')

  if (activeRole !== 'hotel_admin' || !activeTenantId) redirect('/select-role')

  const roleRow = speculativeRole && claimedId === user.id
    ? speculativeRole.data
    : (await roleQuery(user.id, activeTenantId)).data

  if (!roleRow) redirect('/select-role')

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
