import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import {
  resolveWindow, summarise, windowLabel, inWindow,
  type PaymentRow, type BookingRow, type RoomRow, type ReviewRow,
} from '@/lib/reports'

const PRIMARY = rgb(2 / 255, 132 / 255, 199 / 255)
const DARK    = rgb(15 / 255, 23 / 255, 42 / 255)
const MUTED   = rgb(100 / 255, 116 / 255, 139 / 255)
const LINE    = rgb(226 / 255, 232 / 255, 240 / 255)

const money = (n: number, currency: string) =>
  `${currency} ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

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
  // The browser's own date, so "last 7 days" means the same here as on screen.
  const today  = searchParams.get('today') ?? new Date().toISOString().slice(0, 10)

  const [{ data: payments }, { data: bookings }, { data: rooms }, { data: reviews }, { data: hotel }] =
    await Promise.all([
      supabase.from('payments').select('amount, created_at, status, payment_method').eq('hotel_id', tenantId),
      supabase.from('bookings').select('created_at, check_in, check_out, status, total_amount, source').eq('hotel_id', tenantId),
      supabase.from('rooms').select('status').eq('hotel_id', tenantId),
      supabase.from('reviews').select('rating, created_at').eq('hotel_id', tenantId),
      supabase.from('hotels').select('name, currency').eq('id', tenantId).single(),
    ])

  const currency = (hotel as { currency?: string } | null)?.currency ?? 'USD'
  const hotelName = (hotel as { name?: string } | null)?.name ?? 'Hotel'
  const w = resolveWindow(range, today, from, to)
  const label = windowLabel(range, from, to)

  const summary = summarise(
    (payments ?? []) as PaymentRow[],
    (bookings ?? []) as BookingRow[],
    (rooms ?? []) as RoomRow[],
    (reviews ?? []) as ReviewRow[],
    w,
  )

  const stamp = new Date().toISOString().slice(0, 10)
  const safeName = `${hotelName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-report-${stamp}`

  const rows: [string, string | number][] = [
    ['Revenue',            summary.revenue],
    ['Payments received',  summary.paymentsCount],
    ['Bookings',           summary.bookings],
    ['Cancelled bookings', summary.cancelled],
    ['Nights sold',        summary.nightsSold],
    ['Average booking value', summary.avgBookingValue],
    ['Average rating',     summary.avgRating],
    ['Reviews',            summary.reviewCount],
    ['Occupancy rate (now)', `${summary.occupancyRate}%`],
    ['Rooms',              summary.roomTotal],
  ]

  // ── Excel ─────────────────────────────────────────────────────────
  if (format === 'excel') {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'BookQayam'
    wb.created = new Date()

    const sheet = wb.addWorksheet('Summary')
    sheet.columns = [{ width: 28 }, { width: 20 }]

    sheet.addRow([hotelName]).font = { bold: true, size: 14 }
    sheet.addRow([`Report period: ${label}`]).font = { color: { argb: 'FF64748B' } }
    sheet.addRow([`Generated: ${new Date().toLocaleString('en-GB')}`]).font = { color: { argb: 'FF64748B' } }
    sheet.addRow([])

    const header = sheet.addRow(['Metric', 'Value'])
    header.font = { bold: true }
    header.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } }
    })

    for (const [metric, value] of rows) {
      const row = sheet.addRow([metric, value])
      if (typeof value === 'number' && /revenue|value/i.test(metric)) {
        row.getCell(2).numFmt = '#,##0.00'
      }
    }

    if (summary.revenueByMethod.length) {
      sheet.addRow([])
      sheet.addRow(['Revenue by payment method']).font = { bold: true }
      for (const m of summary.revenueByMethod) {
        const row = sheet.addRow([m.method.replace(/_/g, ' '), m.amount])
        row.getCell(2).numFmt = '#,##0.00'
      }
    }

    if (summary.bookingsBySource.length) {
      sheet.addRow([])
      sheet.addRow(['Bookings by source']).font = { bold: true }
      for (const s of summary.bookingsBySource) sheet.addRow([s.source.replace(/_/g, ' '), s.count])
    }

    sheet.addRow([])
    sheet.addRow(['Rooms by status']).font = { bold: true }
    for (const [status, count] of Object.entries(summary.roomsByStatus)) sheet.addRow([status, count])

    // ── Detail sheets, so the numbers can be checked ────────────────
    const paymentSheet = wb.addWorksheet('Payments')
    paymentSheet.columns = [
      { header: 'Date',   key: 'date',   width: 22 },
      { header: 'Amount', key: 'amount', width: 14, style: { numFmt: '#,##0.00' } },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Method', key: 'method', width: 16 },
    ]
    paymentSheet.getRow(1).font = { bold: true }
    for (const p of (payments ?? []) as PaymentRow[]) {
      if (!inWindow(p.created_at, w)) continue
      paymentSheet.addRow({
        date: new Date(p.created_at).toLocaleString('en-GB'),
        amount: Number(p.amount ?? 0),
        status: p.status,
        method: (p.payment_method ?? '').replace(/_/g, ' '),
      })
    }

    const bookingSheet = wb.addWorksheet('Bookings')
    bookingSheet.columns = [
      { header: 'Booked',    key: 'booked',   width: 22 },
      { header: 'Check-in',  key: 'checkin',  width: 14 },
      { header: 'Check-out', key: 'checkout', width: 14 },
      { header: 'Status',    key: 'status',   width: 14 },
      { header: 'Source',    key: 'source',   width: 14 },
      { header: 'Total',     key: 'total',    width: 14, style: { numFmt: '#,##0.00' } },
    ]
    bookingSheet.getRow(1).font = { bold: true }
    for (const b of (bookings ?? []) as BookingRow[]) {
      if (!inWindow(b.created_at, w)) continue
      bookingSheet.addRow({
        booked: new Date(b.created_at).toLocaleString('en-GB'),
        checkin: b.check_in,
        checkout: b.check_out,
        status: b.status,
        source: (b.source ?? 'online').replace(/_/g, ' '),
        total: Number(b.total_amount ?? 0),
      })
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
  const page = pdf.addPage([595.28, 841.89])   // A4
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const body = await pdf.embedFont(StandardFonts.Helvetica)
  const { width, height } = page.getSize()

  page.drawRectangle({ x: 0, y: height - 110, width, height: 110, color: PRIMARY })
  page.drawText(hotelName, { x: 48, y: height - 58, size: 20, font: bold, color: rgb(1, 1, 1) })
  page.drawText('Reports & Analytics', { x: 48, y: height - 80, size: 11, font: body, color: rgb(1, 1, 1) })
  page.drawText(label, { x: 48, y: height - 96, size: 10, font: body, color: rgb(0.9, 0.95, 1) })

  let y = height - 150
  page.drawText('Summary', { x: 48, y, size: 13, font: bold, color: DARK })
  y -= 8
  page.drawLine({ start: { x: 48, y }, end: { x: width - 48, y }, thickness: 1, color: LINE })
  y -= 24

  const line = (labelText: string, value: string) => {
    page.drawText(labelText, { x: 48, y, size: 10, font: body, color: MUTED })
    page.drawText(value, { x: width - 48 - bold.widthOfTextAtSize(value, 10), y, size: 10, font: bold, color: DARK })
    y -= 20
  }

  line('Revenue',               money(summary.revenue, currency))
  line('Payments received',     String(summary.paymentsCount))
  line('Bookings',              String(summary.bookings))
  line('Cancelled bookings',    String(summary.cancelled))
  line('Nights sold',           String(summary.nightsSold))
  line('Average booking value', money(summary.avgBookingValue, currency))
  line('Average rating',        `${summary.avgRating} (${summary.reviewCount} reviews)`)
  line('Occupancy rate (now)',  `${summary.occupancyRate}%`)

  if (summary.revenueByMethod.length) {
    y -= 12
    page.drawText('Revenue by payment method', { x: 48, y, size: 12, font: bold, color: DARK })
    y -= 8
    page.drawLine({ start: { x: 48, y }, end: { x: width - 48, y }, thickness: 1, color: LINE })
    y -= 22
    for (const m of summary.revenueByMethod) line(m.method.replace(/_/g, ' '), money(m.amount, currency))
  }

  if (summary.bookingsBySource.length) {
    y -= 12
    page.drawText('Bookings by source', { x: 48, y, size: 12, font: bold, color: DARK })
    y -= 8
    page.drawLine({ start: { x: 48, y }, end: { x: width - 48, y }, thickness: 1, color: LINE })
    y -= 22
    for (const s of summary.bookingsBySource) line(s.source.replace(/_/g, ' '), String(s.count))
  }

  y -= 12
  page.drawText('Rooms by status', { x: 48, y, size: 12, font: bold, color: DARK })
  y -= 8
  page.drawLine({ start: { x: 48, y }, end: { x: width - 48, y }, thickness: 1, color: LINE })
  y -= 22
  for (const [status, count] of Object.entries(summary.roomsByStatus)) {
    line(status, `${count} of ${summary.roomTotal}`)
  }

  page.drawText(`Generated ${new Date().toLocaleString('en-GB')}`, {
    x: 48, y: 40, size: 8, font: body, color: MUTED,
  })

  const bytes = await pdf.save()
  return new NextResponse(bytes as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
