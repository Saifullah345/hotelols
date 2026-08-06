import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { getPlanFeatures, type PlanDbData } from '@/lib/plan-features'
import {
  resolveWindow, summarise, windowLabel, inWindow,
  type PaymentRow, type BookingRow, type RoomRow, type ReviewRow,
} from '@/lib/reports'

const PRIMARY = rgb(79 / 255, 70 / 255, 229 / 255)   // indigo-600
const DARK    = rgb(15 / 255, 23 / 255, 42 / 255)
const MUTED   = rgb(100 / 255, 116 / 255, 139 / 255)
const LINE    = rgb(226 / 255, 232 / 255, 240 / 255)
const ACCENT  = rgb(16 / 255, 185 / 255, 129 / 255)   // emerald-500

const money = (n: number, currency: string) =>
  `${currency} ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// ── Advanced analytics helpers ─────────────────────────────────────
function computeAdvanced(bookings: BookingRow[], rooms: RoomRow[], revenue: number, win: ReturnType<typeof resolveWindow>) {
  const totalRooms = rooms.length
  const daysInPeriod = (() => {
    if (!win) return 365
    const to = Number.isFinite(win.to) ? win.to : Date.now()
    return Math.max(1, Math.round((to - win.from) / 86_400_000))
  })()

  const made = bookings.filter(b => inWindow(b.created_at, win))
  const live = made.filter(b => b.status !== 'cancelled')
  const cancelled = made.filter(b => b.status === 'cancelled')

  const revPAR = totalRooms && daysInPeriod ? revenue / (totalRooms * daysInPeriod) : 0

  const avgLengthOfStay = live.length
    ? live.reduce((s, b) => s + Math.max(1, Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86_400_000)), 0) / live.length
    : 0

  const cancellationRate = made.length ? Math.round((cancelled.length / made.length) * 100) : 0

  const avgLeadTime = made.length
    ? Math.round(made.reduce((s, b) => s + Math.max(0, Math.round((new Date(b.check_in).getTime() - new Date(b.created_at).getTime()) / 86_400_000)), 0) / made.length)
    : 0

  const leadTimeBuckets = [
    { name: 'Same day (0)', min: 0, max: 1, count: 0 },
    { name: '1–3 days',     min: 1, max: 4, count: 0 },
    { name: '4–7 days',     min: 4, max: 8, count: 0 },
    { name: '1–2 weeks',    min: 8, max: 15, count: 0 },
    { name: '2–4 weeks',    min: 15, max: 29, count: 0 },
    { name: '1+ month',     min: 29, max: Infinity, count: 0 },
  ]
  for (const b of made) {
    const days = Math.max(0, Math.round((new Date(b.check_in).getTime() - new Date(b.created_at).getTime()) / 86_400_000))
    const bucket = leadTimeBuckets.find(bc => days >= bc.min && days < bc.max)
    if (bucket) bucket.count++
  }

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const dayOfWeekCounts = new Array(7).fill(0)
  for (const b of live) {
    const d = new Date(b.check_in).getDay()
    dayOfWeekCounts[(d + 6) % 7]++
  }
  const dayOfWeek = dayNames.map((name, i) => ({ name, count: dayOfWeekCounts[i] }))

  const cancellationTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const month = d.toLocaleDateString('en', { month: 'short', year: 'numeric' })
    const count = bookings.filter(b => {
      const t = new Date(b.created_at)
      return t.getMonth() === d.getMonth() && t.getFullYear() === d.getFullYear() && b.status === 'cancelled'
    }).length
    return { month, count }
  })

  return { revPAR, avgLengthOfStay, cancellationRate, avgLeadTime, leadTimeBuckets, dayOfWeek, cancellationTrend, totalRooms, daysInPeriod }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role, tenant_id').eq('id', user.id).single()
  if (!profile || !['hotel_admin', 'super_admin', 'staff'].includes(profile.role) || !profile.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const tenantId = profile.tenant_id

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') === 'pdf' ? 'pdf' : 'excel'
  const range  = searchParams.get('range') ?? 'all'
  const from   = searchParams.get('from') ?? undefined
  const to     = searchParams.get('to') ?? undefined
  const today  = searchParams.get('today') ?? new Date().toISOString().slice(0, 10)

  const [{ data: payments }, { data: bookings }, { data: rooms }, { data: reviews }, { data: hotel }] =
    await Promise.all([
      supabase.from('payments').select('amount, created_at, status, payment_method').eq('hotel_id', tenantId),
      supabase.from('bookings').select('created_at, check_in, check_out, status, total_amount, source').eq('hotel_id', tenantId),
      supabase.from('rooms').select('status').eq('hotel_id', tenantId),
      supabase.from('reviews').select('rating, created_at').eq('hotel_id', tenantId),
      supabase.from('hotels').select('name, currency, plan:plans(feature_advanced_reports, feature_housekeeping, feature_reviews, feature_online_booking, feature_listing, feature_api_access, feature_multi_property)').eq('id', tenantId).single(),
    ])

  const currency    = (hotel as { currency?: string } | null)?.currency ?? 'USD'
  const hotelName   = (hotel as { name?: string } | null)?.name ?? 'Hotel'
  const plan        = (hotel as { plan?: PlanDbData | null } | null)?.plan
  const hasAdvanced = getPlanFeatures(plan).advancedReports

  const w       = resolveWindow(range, today, from, to)
  const label   = windowLabel(range, from, to)
  const summary = summarise(
    (payments ?? []) as PaymentRow[],
    (bookings ?? []) as BookingRow[],
    (rooms    ?? []) as RoomRow[],
    (reviews  ?? []) as ReviewRow[],
    w,
  )

  const adv = hasAdvanced
    ? computeAdvanced((bookings ?? []) as BookingRow[], (rooms ?? []) as RoomRow[], summary.revenue, w)
    : null

  const stamp    = new Date().toISOString().slice(0, 10)
  const safeName = `${hotelName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-report-${stamp}`

  // ── Excel ─────────────────────────────────────────────────────────
  if (format === 'excel') {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'BookQayam'
    wb.created = new Date()

    // ── Summary sheet ──────────────────────────────────────────────
    const sheet = wb.addWorksheet('Summary')
    sheet.columns = [{ width: 32 }, { width: 22 }]

    sheet.addRow([hotelName]).font = { bold: true, size: 14 }
    sheet.addRow([`Report period: ${label}`]).font = { color: { argb: 'FF64748B' } }
    sheet.addRow([`Generated: ${new Date().toLocaleString('en-GB')}`]).font = { color: { argb: 'FF64748B' } }
    sheet.addRow([])

    const addSection = (title: string) => {
      sheet.addRow([])
      const hdr = sheet.addRow([title])
      hdr.font = { bold: true, size: 12, color: { argb: 'FF4F46E5' } }
      hdr.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } }
      hdr.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } }
    }

    const addRow = (metric: string, value: string | number, isNumeric = false) => {
      const row = sheet.addRow([metric, value])
      if (isNumeric) row.getCell(2).numFmt = '#,##0.00'
      return row
    }

    addSection('Core Metrics')
    addRow('Revenue',              summary.revenue, true)
    addRow('Payments received',    summary.paymentsCount)
    addRow('Bookings',             summary.bookings)
    addRow('Cancelled bookings',   summary.cancelled)
    addRow('Nights sold',          summary.nightsSold)
    addRow('Average booking value', summary.avgBookingValue, true)
    addRow('Average rating',       summary.avgRating)
    addRow('Reviews',              summary.reviewCount)
    addRow('Occupancy rate (now)', `${summary.occupancyRate}%`)
    addRow('Rooms',                summary.roomTotal)

    if (summary.revenueByMethod.length) {
      addSection('Revenue by Payment Method')
      for (const m of summary.revenueByMethod) addRow(m.method.replace(/_/g, ' '), m.amount, true)
    }

    if (summary.bookingsBySource.length) {
      addSection('Bookings by Source')
      for (const s of summary.bookingsBySource) addRow(s.source.replace(/_/g, ' '), s.count)
    }

    addSection('Rooms by Status')
    for (const [status, count] of Object.entries(summary.roomsByStatus)) addRow(status, `${count} of ${summary.roomTotal}`)

    if (adv) {
      addSection('Advanced Analytics')
      addRow('RevPAR (revenue per available room/day)', adv.revPAR, true)
      addRow('Average length of stay (nights)',         Number(adv.avgLengthOfStay.toFixed(2)))
      addRow('Cancellation rate',                       `${adv.cancellationRate}%`)
      addRow('Average lead time (days before check-in)', adv.avgLeadTime)
      addRow('Total rooms',                             adv.totalRooms)
      addRow('Days in period',                          adv.daysInPeriod)
    }

    // ── Payments detail sheet ──────────────────────────────────────
    const paymentSheet = wb.addWorksheet('Payments')
    paymentSheet.columns = [
      { header: 'Date',   key: 'date',   width: 22 },
      { header: 'Amount', key: 'amount', width: 14, style: { numFmt: '#,##0.00' } },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Method', key: 'method', width: 16 },
    ]
    paymentSheet.getRow(1).font = { bold: true }
    paymentSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } }
    for (const p of (payments ?? []) as PaymentRow[]) {
      if (!inWindow(p.created_at, w)) continue
      paymentSheet.addRow({ date: new Date(p.created_at).toLocaleString('en-GB'), amount: Number(p.amount ?? 0), status: p.status, method: (p.payment_method ?? '').replace(/_/g, ' ') })
    }

    // ── Bookings detail sheet ──────────────────────────────────────
    const bookingSheet = wb.addWorksheet('Bookings')
    bookingSheet.columns = [
      { header: 'Booked',    key: 'booked',   width: 22 },
      { header: 'Check-in',  key: 'checkin',  width: 14 },
      { header: 'Check-out', key: 'checkout', width: 14 },
      { header: 'Nights',    key: 'nights',   width: 10 },
      { header: 'Status',    key: 'status',   width: 14 },
      { header: 'Source',    key: 'source',   width: 14 },
      { header: 'Lead Days', key: 'lead',     width: 12 },
      { header: 'Total',     key: 'total',    width: 14, style: { numFmt: '#,##0.00' } },
    ]
    bookingSheet.getRow(1).font = { bold: true }
    bookingSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } }
    for (const b of (bookings ?? []) as BookingRow[]) {
      if (!inWindow(b.created_at, w)) continue
      const nights = Math.max(1, Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / 86_400_000))
      const lead   = Math.max(0, Math.round((new Date(b.check_in).getTime() - new Date(b.created_at).getTime()) / 86_400_000))
      bookingSheet.addRow({ booked: new Date(b.created_at).toLocaleString('en-GB'), checkin: b.check_in, checkout: b.check_out, nights, status: b.status, source: (b.source ?? 'online').replace(/_/g, ' '), lead, total: Number(b.total_amount ?? 0) })
    }

    // ── Advanced Analytics sheet (plan-gated) ─────────────────────
    if (adv) {
      const advSheet = wb.addWorksheet('Advanced Analytics')
      advSheet.columns = [{ width: 32 }, { width: 20 }]

      const advHdr = (title: string) => {
        advSheet.addRow([])
        const row = advSheet.addRow([title])
        row.font = { bold: true, size: 12, color: { argb: 'FF4F46E5' } }
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } }
        row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } }
      }

      advHdr('Key Performance Indicators')
      advSheet.addRow(['RevPAR',                    Number(adv.revPAR.toFixed(2))]).getCell(2).numFmt = '#,##0.00'
      advSheet.addRow(['Avg Length of Stay (nights)', Number(adv.avgLengthOfStay.toFixed(2))])
      advSheet.addRow(['Cancellation Rate',          `${adv.cancellationRate}%`])
      advSheet.addRow(['Avg Lead Time (days)',        adv.avgLeadTime])

      advHdr('Booking Lead Time Distribution')
      const ltHdr = advSheet.addRow(['Lead Time Bucket', 'Bookings'])
      ltHdr.font = { bold: true }
      for (const b of adv.leadTimeBuckets) advSheet.addRow([b.name, b.count])

      advHdr('Check-in Day of Week')
      const dowHdr = advSheet.addRow(['Day', 'Check-ins'])
      dowHdr.font = { bold: true }
      for (const d of adv.dayOfWeek) advSheet.addRow([d.name, d.count])

      advHdr('Monthly Cancellation Trend (Last 6 Months)')
      const ctHdr = advSheet.addRow(['Month', 'Cancellations'])
      ctHdr.font = { bold: true }
      for (const c of adv.cancellationTrend) advSheet.addRow([c.month, c.count])
    }

    const buffer = await wb.xlsx.writeBuffer()
    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${safeName}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  // ── PDF ───────────────────────────────────────────────────────────
  const pdf  = await PDFDocument.create()
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const body = await pdf.embedFont(StandardFonts.Helvetica)

  const addPage = () => {
    const pg = pdf.addPage([595.28, 841.89])
    const { width, height } = pg.getSize()
    pg.drawRectangle({ x: 0, y: height - 50, width, height: 50, color: PRIMARY })
    pg.drawText(hotelName, { x: 48, y: height - 34, size: 11, font: bold, color: rgb(1, 1, 1) })
    pg.drawText('Reports & Analytics', { x: 48, y: height - 46, size: 8, font: body, color: rgb(0.85, 0.87, 1) })
    return pg
  }

  // First page — full header
  const firstPage = pdf.addPage([595.28, 841.89])
  const { width, height } = firstPage.getSize()
  firstPage.drawRectangle({ x: 0, y: height - 110, width, height: 110, color: PRIMARY })
  firstPage.drawText(hotelName,            { x: 48, y: height - 58,  size: 20, font: bold, color: rgb(1, 1, 1) })
  firstPage.drawText('Reports & Analytics', { x: 48, y: height - 80,  size: 11, font: body, color: rgb(1, 1, 1) })
  firstPage.drawText(label,                { x: 48, y: height - 96,  size: 10, font: body, color: rgb(0.9, 0.95, 1) })

  let currentPage = firstPage
  let y = height - 150

  const ensureSpace = (needed: number) => {
    if (y - needed < 60) {
      currentPage = addPage()
      y = currentPage.getSize().height - 70
    }
  }

  const section = (title: string) => {
    ensureSpace(40)
    y -= 16
    currentPage.drawText(title, { x: 48, y, size: 12, font: bold, color: PRIMARY })
    y -= 8
    currentPage.drawLine({ start: { x: 48, y }, end: { x: width - 48, y }, thickness: 1, color: LINE })
    y -= 22
  }

  const pdfLine = (labelText: string, value: string) => {
    ensureSpace(22)
    currentPage.drawText(labelText, { x: 48, y, size: 10, font: body, color: MUTED })
    currentPage.drawText(value, { x: width - 48 - bold.widthOfTextAtSize(value, 10), y, size: 10, font: bold, color: DARK })
    y -= 20
  }

  section('Summary')
  pdfLine('Revenue',               money(summary.revenue, currency))
  pdfLine('Payments received',     String(summary.paymentsCount))
  pdfLine('Bookings',              String(summary.bookings))
  pdfLine('Cancelled bookings',    String(summary.cancelled))
  pdfLine('Nights sold',           String(summary.nightsSold))
  pdfLine('Average booking value', money(summary.avgBookingValue, currency))
  pdfLine('Average rating',        `${summary.avgRating} (${summary.reviewCount} reviews)`)
  pdfLine('Occupancy rate (now)',  `${summary.occupancyRate}%`)

  if (summary.revenueByMethod.length) {
    section('Revenue by Payment Method')
    for (const m of summary.revenueByMethod) pdfLine(m.method.replace(/_/g, ' '), money(m.amount, currency))
  }

  if (summary.bookingsBySource.length) {
    section('Bookings by Source')
    for (const s of summary.bookingsBySource) pdfLine(s.source.replace(/_/g, ' '), String(s.count))
  }

  section('Rooms by Status')
  for (const [status, count] of Object.entries(summary.roomsByStatus)) pdfLine(status, `${count} of ${summary.roomTotal}`)

  // Advanced section in PDF
  if (adv) {
    section('Advanced Analytics')

    // KPI table header
    ensureSpace(24)
    currentPage.drawRectangle({ x: 48, y: y - 2, width: width - 96, height: 20, color: rgb(0.94, 0.93, 1) })
    currentPage.drawText('Key Performance Indicators', { x: 52, y: y + 2, size: 10, font: bold, color: PRIMARY })
    y -= 22

    pdfLine('RevPAR (revenue per available room/day)', money(adv.revPAR, currency))
    pdfLine('Average length of stay',                  `${adv.avgLengthOfStay.toFixed(1)} nights`)
    pdfLine('Cancellation rate',                       `${adv.cancellationRate}%`)
    pdfLine('Average lead time',                       `${adv.avgLeadTime} days before check-in`)

    // Lead time distribution
    ensureSpace(24)
    y -= 8
    currentPage.drawRectangle({ x: 48, y: y - 2, width: width - 96, height: 20, color: rgb(0.94, 0.93, 1) })
    currentPage.drawText('Booking Lead Time Distribution', { x: 52, y: y + 2, size: 10, font: bold, color: PRIMARY })
    y -= 22

    for (const b of adv.leadTimeBuckets) {
      ensureSpace(20)
      const pct = adv.leadTimeBuckets.reduce((s, x) => s + x.count, 0)
      const barW = pct ? Math.round(((b.count / pct) * (width - 200))) : 0
      currentPage.drawText(b.name, { x: 48, y, size: 9, font: body, color: MUTED })
      if (barW > 0) currentPage.drawRectangle({ x: 175, y: y + 1, width: barW, height: 8, color: PRIMARY })
      currentPage.drawText(String(b.count), { x: width - 80, y, size: 9, font: bold, color: DARK })
      y -= 18
    }

    // Day of week
    ensureSpace(24)
    y -= 8
    currentPage.drawRectangle({ x: 48, y: y - 2, width: width - 96, height: 20, color: rgb(0.94, 0.93, 1) })
    currentPage.drawText('Check-in Day of Week', { x: 52, y: y + 2, size: 10, font: bold, color: PRIMARY })
    y -= 22

    const maxDow = Math.max(...adv.dayOfWeek.map(d => d.count), 1)
    for (const d of adv.dayOfWeek) {
      ensureSpace(20)
      const barW = Math.round((d.count / maxDow) * (width - 200))
      currentPage.drawText(d.name.slice(0, 3), { x: 48, y, size: 9, font: body, color: MUTED })
      if (barW > 0) currentPage.drawRectangle({ x: 100, y: y + 1, width: barW, height: 8, color: ACCENT })
      currentPage.drawText(String(d.count), { x: width - 80, y, size: 9, font: bold, color: DARK })
      y -= 18
    }

    // Cancellation trend
    ensureSpace(24)
    y -= 8
    currentPage.drawRectangle({ x: 48, y: y - 2, width: width - 96, height: 20, color: rgb(0.94, 0.93, 1) })
    currentPage.drawText('Cancellation Trend (Last 6 Months)', { x: 52, y: y + 2, size: 10, font: bold, color: PRIMARY })
    y -= 22
    for (const c of adv.cancellationTrend) pdfLine(c.month, String(c.count))
  }

  ensureSpace(20)
  currentPage.drawText(`Generated ${new Date().toLocaleString('en-GB')}`, { x: 48, y: 40, size: 8, font: body, color: MUTED })

  const bytes = await pdf.save()
  return new NextResponse(bytes as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
