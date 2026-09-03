import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Building2, MapPin, Mail, Phone,
  BedDouble, CalendarCheck, DollarSign, User,
  CreditCard, Gift, Calendar, ExternalLink,
} from 'lucide-react'
import { formatCurrency } from '@/lib/currency'
import HotelActions from './HotelActions'

export const metadata = { title: 'Hotel Details' }

const statusCls: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  suspended: 'bg-rose-100 text-rose-700',
  pending:   'bg-amber-100 text-amber-700',
}

const subStatusCls: Record<string, string> = {
  active:       'bg-emerald-100 text-emerald-700',
  trialing:     'bg-indigo-100 text-indigo-700',
  past_due:     'bg-amber-100 text-amber-700',
  paused:       'bg-gray-100 text-gray-600',
  canceled:     'bg-rose-100 text-rose-700',
  unsubscribed: 'bg-gray-100 text-gray-500',
}

const bookingBadge: Record<string, string> = {
  pending: 'badge-yellow', confirmed: 'badge-blue',
  checked_in: 'badge-green', checked_out: 'badge-gray', cancelled: 'badge-red',
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function HotelDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const admin    = await createAdminClient()

  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/login')

  const { data: hotel } = await admin
    .from('hotels')
    .select(`
      *, currency,
      subscription_status, billing_cycle, plan_expires_at,
      trial_ends_at, trial_started_at, plan_activated_at,
      paddle_subscription_id, paddle_customer_id, subscription_cancel_at,
      plan:plans(id, name, price_monthly, price_yearly),
      owner:profiles(full_name, email)
    `)
    .eq('id', id)
    .single()

  if (!hotel) notFound()

  const [{ data: rooms }, { data: bookings }, { data: payments }, { data: allPlans }] = await Promise.all([
    admin.from('rooms').select('id, status').eq('hotel_id', id),
    admin.from('bookings')
      .select('id, status, total_amount, check_in, check_out, created_at, guest_name, user:profiles(full_name, email)')
      .eq('hotel_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
    admin.from('payments').select('amount, status').eq('hotel_id', id),
    admin.from('plans').select('id, name, price_monthly').eq('is_active', true).order('tier_rank'),
  ])

  const { count: bookingCount } = await admin
    .from('bookings').select('id', { count: 'exact', head: true }).eq('hotel_id', id)

  const roomCount      = rooms?.length ?? 0
  const availableRooms = rooms?.filter(r => r.status === 'available').length ?? 0
  const revenue        = (payments ?? [])
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const hotelCurrency = (hotel.currency as string | null) ?? 'USD'
  const owner         = hotel.owner  as { full_name?: string; email?: string } | null
  const plan          = hotel.plan   as { id?: string; name?: string; price_monthly?: number; price_yearly?: number } | null

  const subStatus = (hotel.subscription_status as string | null) ?? 'unsubscribed'
  const subLabel: Record<string, string> = {
    active: 'Active', trialing: 'Trial', past_due: 'Past Due',
    paused: 'Paused', canceled: 'Cancelled', unsubscribed: 'No active plan',
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/super-admin/hotels" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Building2 className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold text-gray-900">{hotel.name}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusCls[hotel.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {hotel.status}
                </span>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([hotel.address, hotel.city, hotel.country].filter(Boolean).join(', '))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 text-sm flex items-center gap-1 mt-0.5 hover:text-primary-600 transition-colors"
              >
                <MapPin className="h-3 w-3" />
                {[hotel.city, hotel.country].filter(Boolean).join(', ') || '—'}
              </a>
            </div>
          </div>
        </div>

        {/* Status actions */}
        <HotelActions hotelId={id} currentStatus={hotel.status} />
      </div>

      {/* ── KPI tiles ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Rooms',    value: roomCount,               sub: `${availableRooms} available`,  icon: BedDouble,     color: 'text-blue-600   bg-blue-50'   },
          { label: 'Bookings', value: bookingCount ?? 0,       sub: 'all time',                     icon: CalendarCheck, color: 'text-purple-600 bg-purple-50' },
          { label: 'Revenue',  value: formatCurrency(revenue, hotelCurrency), sub: 'completed payments', icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label} · {s.sub}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hotel information */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Hotel Information</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600"><Mail  className="h-4 w-4 text-gray-400 shrink-0" />{hotel.email  || '—'}</div>
            <div className="flex items-center gap-2 text-gray-600"><Phone className="h-4 w-4 text-gray-400 shrink-0" />{hotel.phone  || '—'}</div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([hotel.address, hotel.city, hotel.country].filter(Boolean).join(', '))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors"
            >
              <MapPin className="h-4 w-4 text-gray-400 shrink-0" />{hotel.address || '—'}
            </a>
            <div className="flex justify-between border-t border-gray-100 pt-3">
              <span className="text-gray-500">Check-in / Check-out</span>
              <span className="text-gray-900 text-xs">{hotel.check_in_time} · {hotel.check_out_time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Created</span>
              <span className="text-gray-900">{fmtDate(hotel.created_at)}</span>
            </div>
          </dl>
        </div>

        {/* Subscription info */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-indigo-500" /> Subscription
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Status</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${subStatusCls[subStatus] ?? subStatusCls.unsubscribed}`}>
                {subLabel[subStatus] ?? subStatus}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Plan</span>
              <span className="font-semibold text-gray-900">{plan?.name ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Billing cycle</span>
              <span className="text-gray-900 capitalize">{(hotel.billing_cycle as string | null) ?? '—'}</span>
            </div>
            {subStatus === 'trialing' && hotel.trial_ends_at && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 flex items-center gap-1"><Gift className="h-3 w-3" /> Trial ends</span>
                <span className="text-indigo-700 font-medium">{fmtDate(hotel.trial_ends_at as string)}</span>
              </div>
            )}
            {hotel.plan_expires_at && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 flex items-center gap-1"><Calendar className="h-3 w-3" /> Renews / Expires</span>
                <span className="text-gray-900">{fmtDate(hotel.plan_expires_at as string)}</span>
              </div>
            )}
            {hotel.plan_activated_at && (
              <div className="flex justify-between">
                <span className="text-gray-500">Activated</span>
                <span className="text-gray-900">{fmtDate(hotel.plan_activated_at as string)}</span>
              </div>
            )}
            {hotel.paddle_subscription_id && (
              <div className="flex justify-between items-start border-t border-gray-100 pt-3">
                <span className="text-gray-500">Paddle Sub ID</span>
                <span className="text-xs font-mono text-gray-500 text-right break-all max-w-[140px]">
                  {hotel.paddle_subscription_id as string}
                </span>
              </div>
            )}
          </dl>
        </div>

        {/* Owner */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Owner</h3>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
              {owner?.full_name?.[0]?.toUpperCase() ?? <User className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{owner?.full_name ?? '—'}</p>
              <p className="text-sm text-gray-500 truncate">{owner?.email ?? '—'}</p>
            </div>
          </div>
          {owner?.email && (
            <a
              href={`mailto:${owner.email}`}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <Mail className="h-3.5 w-3.5" /> Email owner
            </a>
          )}
        </div>
      </div>

      {/* ── Recent Bookings ── */}
      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Recent Bookings
            <span className="ml-2 text-xs font-normal text-gray-400">(last 10)</span>
          </h3>
          <Link
            href={`/super-admin/hotels/${id}/bookings`}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
          >
            View all {bookingCount ?? ''} <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header">Guest</th>
                <th className="table-header">Check-in</th>
                <th className="table-header">Check-out</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings?.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">
                    {(b.user as { full_name?: string } | null)?.full_name
                      || b.guest_name
                      || (b.user as { email?: string } | null)?.email
                      || '—'}
                  </td>
                  <td className="table-cell text-gray-500">{new Date(b.check_in).toLocaleDateString()}</td>
                  <td className="table-cell text-gray-500">{new Date(b.check_out).toLocaleDateString()}</td>
                  <td className="table-cell font-semibold">{formatCurrency(b.total_amount, hotelCurrency)}</td>
                  <td className="table-cell">
                    <span className={bookingBadge[b.status] ?? 'badge-gray'}>{b.status.replace('_', ' ')}</span>
                  </td>
                </tr>
              ))}
              {!bookings?.length && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">No bookings yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
