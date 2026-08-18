'use client'

import { useEffect, useState } from 'react'
import { Download, FileText, Loader2, AlertCircle, CalendarDays, TrendingUp, ReceiptText } from 'lucide-react'

type Transaction = {
  id: string
  invoiceNumber: string | null
  status: string
  createdAt: string
  billedAt: string | null
  planName: string
  subtotal: number
  tax: number
  total: number
  currency: string
  paymentMethod: string
  cardLast4: string | null
  periodStart: string | null
  periodEnd: string | null
}

interface Props {
  hotelName: string
  nextBillingDate: string | null
  currentPlanName?: string | null
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount)
}

function fmtDate(iso: string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', opts ?? { year: 'numeric', month: 'short', day: 'numeric' })
}

function fmtPeriod(start: string | null, end: string | null): string {
  if (!start || !end) return ''
  const s = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const e = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${s} – ${e}`
}

function daysUntil(iso: string | null): string {
  if (!iso) return ''
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
  if (diff < 0)  return 'Overdue'
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `in ${diff} days`
}

function safePlanName(raw: string): string {
  // Guard against Paddle returning a numeric ID or price ID as description
  if (!raw || /^\d+$/.test(raw.trim()) || raw.startsWith('pri_')) return 'Subscription'
  return raw
}

function methodLabel(method: string, last4: string | null): string {
  if (method === 'card') return last4 ? `Card ···· ${last4}` : 'Card'
  return method.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── PDF receipt generator ─────────────────────────────────────────────────────

function generateReceiptHtml(txn: Transaction, hotelName: string): string {
  const invoiceNum   = txn.invoiceNumber ?? txn.id.slice(-10).toUpperCase()
  const billedDate   = fmtDate(txn.billedAt ?? txn.createdAt)
  const period       = fmtPeriod(txn.periodStart, txn.periodEnd)
  const planName     = safePlanName(txn.planName)
  const payment      = methodLabel(txn.paymentMethod, txn.cardLast4)
  const isPaid       = txn.status === 'completed'
  const statusLabel  = isPaid ? 'Paid' : txn.status === 'billed' ? 'Billed' : 'Failed'
  const statusColor  = isPaid ? '#059669' : '#dc2626'
  const statusBg     = isPaid ? '#d1fae5' : '#fee2e2'
  const year         = new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Invoice ${invoiceNum} · ${hotelName}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;background:#fff;padding:56px;font-size:14px;line-height:1.5}
@media print{body{padding:28px}.no-print{display:none!important}@page{margin:16mm}}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:48px;padding-bottom:32px;border-bottom:1px solid #f3f4f6}
.brand-name{font-size:20px;font-weight:700;color:#111827;letter-spacing:-0.3px}
.brand-sub{font-size:12px;color:#9ca3af;margin-top:2px}
.inv-right{text-align:right}
.inv-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;margin-bottom:6px}
.inv-number{font-size:26px;font-weight:800;color:#111827;letter-spacing:-0.5px;line-height:1}
.badge{display:inline-flex;align-items:center;margin-top:10px;padding:3px 12px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;background:${statusBg};color:${statusColor}}
.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-bottom:40px;padding:24px;background:#f9fafb;border-radius:12px}
.meta-item h4{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.09em;color:#9ca3af;margin-bottom:6px}
.meta-item p{font-size:13px;color:#374151;font-weight:500}
table{width:100%;border-collapse:collapse;margin-bottom:32px}
thead th{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#9ca3af;padding:10px 16px;border-bottom:2px solid #f3f4f6;text-align:left}
thead th.right{text-align:right}
tbody td{padding:16px 16px;font-size:13px;color:#374151;border-bottom:1px solid #f9fafb;vertical-align:top}
tbody td.right{text-align:right;font-weight:600;color:#111827}
.desc-main{font-weight:600;color:#111827;margin-bottom:2px}
.desc-sub{font-size:11px;color:#9ca3af}
.totals{margin-left:auto;width:260px;margin-bottom:48px}
.t-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;color:#6b7280}
.t-row span:last-child{color:#374151;font-weight:500}
.t-divider{height:1px;background:#f3f4f6;margin:10px 0}
.t-total{display:flex;justify-content:space-between;padding:12px 0 0;font-size:16px;font-weight:700;color:#111827}
.footer{display:flex;justify-content:space-between;align-items:center;padding-top:24px;border-top:1px solid #f3f4f6;margin-top:auto}
.footer-note{font-size:11px;color:#9ca3af}
.print-btn{position:fixed;bottom:24px;right:24px;display:inline-flex;align-items:center;gap:8px;background:#4f46e5;color:#fff;border:none;padding:11px 20px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(79,70,229,.35);letter-spacing:.01em;transition:background .15s}
.print-btn:hover{background:#4338ca}
</style>
</head>
<body>
<button class="no-print print-btn" onclick="window.print()">⬇ Download PDF</button>

<div class="header">
  <div>
    <p class="brand-name">${hotelName}</p>
    <p class="brand-sub">Powered by Hotelos</p>
  </div>
  <div class="inv-right">
    <p class="inv-label">Invoice</p>
    <p class="inv-number">#${invoiceNum}</p>
    <span class="badge">${statusLabel}</span>
  </div>
</div>

<div class="meta">
  <div class="meta-item">
    <h4>Bill To</h4>
    <p>${hotelName}</p>
  </div>
  <div class="meta-item">
    <h4>Issue Date</h4>
    <p>${billedDate}</p>
  </div>
  <div class="meta-item">
    <h4>Payment</h4>
    <p>${payment}</p>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Description</th>
      <th class="right">Qty</th>
      <th class="right">Unit Price</th>
      <th class="right">Amount</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <p class="desc-main">${planName}</p>
        ${period ? `<p class="desc-sub">Period: ${period}</p>` : ''}
      </td>
      <td class="right">1</td>
      <td class="right">${fmt(txn.subtotal, txn.currency)}</td>
      <td class="right">${fmt(txn.subtotal, txn.currency)}</td>
    </tr>
  </tbody>
</table>

<div class="totals">
  <div class="t-row"><span>Subtotal</span><span>${fmt(txn.subtotal, txn.currency)}</span></div>
  <div class="t-row"><span>Tax</span><span>${fmt(txn.tax, txn.currency)}</span></div>
  <div class="t-divider"></div>
  <div class="t-total"><span>Total</span><span>${fmt(txn.total, txn.currency)}</span></div>
</div>

<div class="footer">
  <p class="footer-note">Thank you for your business. Questions? support@hotelos.com</p>
  <p class="footer-note">© ${year} Hotelos. All rights reserved.</p>
</div>
</body>
</html>`
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; dot: string; badge: string }> = {
  completed: { label: 'Paid',   dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  billed:    { label: 'Billed', dot: 'bg-blue-500',    badge: 'bg-blue-50 text-blue-700 ring-blue-200' },
  past_due:  { label: 'Failed', dot: 'bg-rose-500',    badge: 'bg-rose-50 text-rose-700 ring-rose-200' },
}

function statusCfg(status: string) {
  return STATUS[status] ?? { label: status, dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-600 ring-gray-200' }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BillingHistory({ hotelName, nextBillingDate, currentPlanName }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/billing/transactions')
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setTransactions(d.transactions ?? [])
      })
      .catch(() => setError('Could not load billing history.'))
      .finally(() => setLoading(false))
  }, [])

  const currentYear = new Date().getFullYear()
  const currency    = transactions[0]?.currency ?? 'USD'

  const totalThisYear = transactions
    .filter(t => t.status === 'completed' && new Date(t.billedAt ?? t.createdAt).getFullYear() === currentYear)
    .reduce((sum, t) => sum + t.total, 0)

  // Group invoices by year for the list
  const byYear = transactions.reduce<Record<number, Transaction[]>>((acc, t) => {
    const y = new Date(t.billedAt ?? t.createdAt).getFullYear()
    ;(acc[y] ??= []).push(t)
    return acc
  }, {})
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a)

  function downloadReceipt(txn: Transaction) {
    const html = generateReceiptHtml(txn, hotelName)
    const win  = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => win.print(), 400)
    }
  }

  const untilNext = daysUntil(nextBillingDate)

  return (
    <section className="space-y-6">

      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Billing History</h3>
          <p className="text-sm text-gray-400 mt-0.5">Invoices and subscription charges</p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Total this year */}
        <div className="flex items-center gap-4 px-6 py-5">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-[0.07em]">
              Total {currentYear}
            </p>
            <p className="text-xl font-bold text-gray-900 mt-0.5 tabular-nums">
              {loading ? <span className="skeleton h-6 w-20 rounded inline-block" /> : fmt(totalThisYear, currency)}
            </p>
          </div>
        </div>

        {/* Next billing */}
        <div className="flex items-center gap-4 px-6 py-5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <CalendarDays className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-[0.07em]">Next Renewal</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {nextBillingDate ? fmtDate(nextBillingDate, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </p>
            {untilNext && (
              <p className="text-xs text-amber-500 font-medium mt-0.5">{untilNext}</p>
            )}
          </div>
        </div>

        {/* Invoice count */}
        <div className="flex items-center gap-4 px-6 py-5">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            <ReceiptText className="h-5 w-5 text-gray-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-[0.07em]">Invoices</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {loading ? <span className="skeleton h-6 w-8 rounded inline-block" /> : transactions.length}
            </p>
            {currentPlanName && (
              <p className="text-xs text-gray-400 mt-0.5 capitalize">{currentPlanName} plan</p>
            )}
          </div>
        </div>
      </div>

      {/* Invoice list */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* List header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">Invoices</h4>
          {!loading && transactions.length > 0 && (
            <span className="text-xs text-gray-400">{transactions.length} total</span>
          )}
        </div>

        {/* States */}
        {loading ? (
          <div className="divide-y divide-gray-50">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-4 px-6 py-5">
                <div className="skeleton w-9 h-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3.5 w-32 rounded" />
                  <div className="skeleton h-3 w-48 rounded" />
                </div>
                <div className="skeleton h-3.5 w-20 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="m-5 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
              <FileText className="h-7 w-7 text-gray-300" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-500">No invoices yet</p>
              <p className="text-xs text-gray-300 mt-1">Your billing history will appear here after the first charge</p>
            </div>
          </div>
        ) : (
          <div>
            {years.map(year => (
              <div key={year}>
                {/* Year label — only show when there are multiple years */}
                {years.length > 1 && (
                  <div className="px-6 py-2 bg-gray-50 border-y border-gray-100">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.08em]">{year}</span>
                  </div>
                )}
                <div className="divide-y divide-gray-50">
                  {byYear[year].map(txn => {
                    const cfg       = statusCfg(txn.status)
                    const invoiceNo = txn.invoiceNumber ?? txn.id.slice(-8).toUpperCase()
                    const plan      = safePlanName(txn.planName)
                    const period    = fmtPeriod(txn.periodStart, txn.periodEnd)
                    const dateStr   = fmtDate(txn.billedAt ?? txn.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })

                    return (
                      <div key={txn.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/70 transition-colors group">

                        {/* Icon */}
                        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 group-hover:bg-gray-200/60 transition-colors">
                          <FileText className="h-4 w-4 text-gray-500" />
                        </div>

                        {/* Date + invoice # */}
                        <div className="w-36 shrink-0">
                          <p className="text-sm font-semibold text-gray-900">{dateStr}</p>
                          <p className="text-[11px] text-gray-400 font-mono mt-0.5">{invoiceNo}</p>
                        </div>

                        {/* Plan + period */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{plan}</p>
                          {period && (
                            <p className="text-[11px] text-gray-400 mt-0.5 truncate">{period}</p>
                          )}
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {methodLabel(txn.paymentMethod, txn.cardLast4)}
                          </p>
                        </div>

                        {/* Amount */}
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-gray-900 tabular-nums">{fmt(txn.total, txn.currency)}</p>
                          {txn.tax > 0 && (
                            <p className="text-[11px] text-gray-400 mt-0.5">incl. {fmt(txn.tax, txn.currency)} tax</p>
                          )}
                        </div>

                        {/* Status */}
                        <div className="shrink-0 w-20 flex justify-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ring-inset ${cfg.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
                            {cfg.label}
                          </span>
                        </div>

                        {/* Download */}
                        <button
                          onClick={() => downloadReceipt(txn)}
                          title="Download PDF receipt"
                          className="shrink-0 w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-primary-600 hover:border-primary-300 hover:bg-primary-50 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>

                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
