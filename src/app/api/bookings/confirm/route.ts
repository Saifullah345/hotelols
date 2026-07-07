import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateInvoicePdf } from '@/lib/pdf/invoice'
import { sendEmail } from '@/lib/email/resend'
import { bookingConfirmationTemplate } from '@/lib/email/templates'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()
  if (!caller || !['super_admin', 'hotel_admin', 'staff'].includes(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const bookingId = typeof body?.bookingId === 'string' ? body.bookingId : ''
  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*, hotel:hotels(name), room:rooms(room_number, room_type:room_types(name)), user:profiles(full_name, email)')
    .eq('id', bookingId)
    .single()
  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Tenant isolation: a hotel admin/staff may only confirm their own hotel's bookings.
  if (caller.role !== 'super_admin' && booking.hotel_id !== caller.tenant_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error: updateError } = await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', bookingId)
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  // Gather details for the invoice + email.
  const hotelName = (booking.hotel as { name?: string } | null)?.name ?? 'Hotel'
  const room = booking.room as { room_number?: string; room_type?: { name?: string } } | null
  const guest = booking.user as { full_name?: string; email?: string } | null
  const guestName = guest?.full_name || (booking as { guest_name?: string }).guest_name || 'Guest'
  const guestEmail = guest?.email || undefined

  const nights = Math.max(
    1,
    Math.round((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86_400_000),
  )

  // Reuse the payment invoice number if one exists, otherwise mint a readable one.
  const { data: payments } = await supabase
    .from('payments')
    .select('invoice_number')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
  const invoiceNumber =
    payments?.[0]?.invoice_number ||
    `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${bookingId.slice(0, 8).toUpperCase()}`

  // No email on file (walk-in / phone guest) — confirm without sending.
  if (!guestEmail) {
    return NextResponse.json({ success: true, emailed: false, reason: 'no_email' })
  }

  try {
    const pdfBytes = await generateInvoicePdf({
      invoiceNumber,
      hotelName,
      guestName,
      guestEmail,
      roomNumber: room?.room_number,
      roomType: room?.room_type?.name,
      checkIn: new Date(booking.check_in).toLocaleDateString(),
      checkOut: new Date(booking.check_out).toLocaleDateString(),
      nights,
      amount: Number(booking.total_amount),
      issuedAt: new Date().toISOString(),
    })

    const { subject, html } = bookingConfirmationTemplate({
      guestName,
      hotelName,
      roomNumber: room?.room_number,
      roomType: room?.room_type?.name,
      checkIn: new Date(booking.check_in).toLocaleDateString(),
      checkOut: new Date(booking.check_out).toLocaleDateString(),
      nights,
      amount: Number(booking.total_amount),
      invoiceNumber,
    })

    await sendEmail({
      to: guestEmail,
      subject,
      html,
      attachments: [{ filename: `${invoiceNumber}.pdf`, content: Buffer.from(pdfBytes).toString('base64') }],
    })
  } catch (e) {
    console.error('Booking confirmation email failed:', e)
    // The booking is confirmed regardless; report that the email didn't go out.
    return NextResponse.json({ success: true, emailed: false, reason: 'email_failed' })
  }

  return NextResponse.json({ success: true, emailed: true })
}
