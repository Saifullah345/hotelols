'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, CreditCard } from 'lucide-react'

export type HotelRow = {
  id: string
  name: string
  city: string | null
  country: string | null
  subscription_status: string | null
  billing_cycle: string | null
  plan_expires_at: string | null
  trial_ends_at: string | null
  plan_activated_at: string | null
  paddle_subscription_id: string | null
  paddle_customer_id: string | null
  plan_id: string | null
  plan: { id: string; name: string; price_monthly: number; price_yearly: number } | null
}

const STATUS_TABS = [
  { key: 'all',          label: 'All'       },
  { key: 'active',       label: 'Active'    },
  { key: 'trialing',     label: 'Trial'     },
  { key: 'past_due',     label: 'Past Due'  },
  { key: 'paused',       label: 'Paused'    },
  { key: 'canceled',     label: 'Cancelled' },
  { key: 'unsubscribed', label: 'No Plan'   },
] as const

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active:       { label: 'Active',     cls: 'bg-emerald-100 text-emerald-700' },
  trialing:     { label: 'Trial',      cls: 'bg-indigo-100 text-indigo-700'   },
  past_due:     { label: 'Past Due',   cls: 'bg-amber-100 text-amber-700'     },
  paused:       { label: 'Paused',     cls: 'bg-gray-100 text-gray-600'       },
  canceled:     { label: 'Cancelled',  cls: 'bg-rose-100 text-rose-700'       },
  unsubscribed: { label: 'No Plan',    cls: 'bg-gray-100 text-gray-500'       },
}

function StatusBadge({ status }: { status: string | null }) {
  const s = STATUS_BADGE[status ?? 'unsubscribed'] ?? STATUS_BADGE.unsubscribed
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  )
}

function fmt(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function SubscriptionsTable({ hotels }: { hotels: HotelRow[] }) {
  const [tab, setTab]       = useState('all')
  const [search, setSearch] = useState('')

  const visible = hotels.filter(h => {
    const st = h.subscription_status ?? 'unsubscribed'
    if (tab !== 'all' && st !== tab) return false
    if (search && !h.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts: Record<string, number> = { all: hotels.length }
  hotels.forEach(h => {
    const st = h.subscription_status ?? 'unsubscribed'
    counts[st] = (counts[st] ?? 0) + 1
  })

  return (
    <div className="rounded-2xl border border-gray-100 bg-white">
      <div className="p-5 border-b border-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-indigo-500" />
            All Subscriptions
            <span className="text-xs font-normal text-gray-400">({visible.length})</span>
          </h2>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search hotel…"
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-48"
            />
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {STATUS_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                tab === t.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
              {counts[t.key] != null && (
                <span className={`ml-1 ${tab === t.key ? 'opacity-70' : 'text-gray-400'}`}>
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Hotel</th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Plan</th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Billing</th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Expires / Trial ends</th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Activated</th>
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Paddle ID</th>
              <th className="py-2.5 px-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-sm text-gray-400">
                  No subscriptions match your filter
                </td>
              </tr>
            ) : visible.map(h => (
              <tr key={h.id} className="hover:bg-gray-50 transition-colors group">
                <td className="py-3 px-4">
                  <p className="font-medium text-gray-900">{h.name}</p>
                  {(h.city || h.country) && (
                    <p className="text-xs text-gray-400">{[h.city, h.country].filter(Boolean).join(', ')}</p>
                  )}
                </td>
                <td className="py-3 px-4 text-gray-700">
                  {h.plan?.name ?? <span className="text-gray-300">—</span>}
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={h.subscription_status} />
                </td>
                <td className="py-3 px-4 text-gray-500 capitalize">
                  {h.billing_cycle ?? '—'}
                </td>
                <td className="py-3 px-4 text-gray-500">
                  {h.subscription_status === 'trialing'
                    ? fmt(h.trial_ends_at)
                    : fmt(h.plan_expires_at)}
                </td>
                <td className="py-3 px-4 text-gray-500">
                  {fmt(h.plan_activated_at)}
                </td>
                <td className="py-3 px-4">
                  {h.paddle_subscription_id
                    ? <span className="text-xs font-mono text-gray-400">{h.paddle_subscription_id.slice(0, 16)}…</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="py-3 px-4">
                  <Link
                    href={`/super-admin/hotels/${h.id}`}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
