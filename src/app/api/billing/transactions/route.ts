import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth'
import { listPaddleTransactions, type PaddleTransaction } from '@/lib/paddle'

type NormalizedTransaction = {
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

function centsToDecimal(minor: string | undefined): number {
  return Math.round(Number(minor ?? 0)) / 100
}

function normalizeTransaction(txn: PaddleTransaction): NormalizedTransaction {
  const totals  = txn.details?.totals
  const payment = txn.payments?.[0]
  const card    = payment?.method_details?.card

  return {
    id:            txn.id,
    invoiceNumber: txn.invoice_number ?? null,
    status:        txn.status,
    createdAt:     txn.created_at,
    billedAt:      txn.billed_at ?? null,
    planName:      txn.items?.[0]?.price?.description ?? 'Subscription',
    subtotal:      centsToDecimal(totals?.subtotal),
    tax:           centsToDecimal(totals?.tax),
    total:         centsToDecimal(totals?.total),
    currency:      totals?.currency_code ?? 'USD',
    paymentMethod: payment?.method_details?.type ?? 'card',
    cardLast4:     card?.last4 ?? null,
    periodStart:   txn.billing_period?.starts_at ?? null,
    periodEnd:     txn.billing_period?.ends_at   ?? null,
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { user, profile } = await getAuthContext()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const hotelId = profile?.tenant_id
  if (!hotelId) return NextResponse.json({ transactions: [] })

  const admin = await createAdminClient()
  const { data: hotel } = await admin
    .from('hotels')
    .select('paddle_subscription_id')
    .eq('id', hotelId)
    .single()

  const subscriptionId = hotel?.paddle_subscription_id
  if (!subscriptionId) return NextResponse.json({ transactions: [] })

  // Verify the requested subscriptionId belongs to this hotel
  const requested = req.nextUrl.searchParams.get('subscriptionId')
  if (requested && requested !== subscriptionId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await listPaddleTransactions(subscriptionId)
  if (error) return NextResponse.json({ error }, { status: 502 })

  const transactions = (data ?? [])
    .filter(t => t.status === 'completed' || t.status === 'billed' || t.status === 'past_due')
    .map(normalizeTransaction)

  return NextResponse.json({ transactions })
}
