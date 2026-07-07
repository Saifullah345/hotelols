import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export interface InvoiceData {
  invoiceNumber: string
  hotelName: string
  guestName: string
  guestEmail?: string
  roomNumber?: string
  roomType?: string
  checkIn: string
  checkOut: string
  nights: number
  amount: number
  currency?: string
  issuedAt: string
}

const PRIMARY = rgb(2 / 255, 132 / 255, 199 / 255) // #0284c7
const DARK = rgb(15 / 255, 23 / 255, 42 / 255) // #0f172a
const MUTED = rgb(100 / 255, 116 / 255, 139 / 255) // #64748b
const LINE = rgb(226 / 255, 232 / 255, 240 / 255) // #e2e8f0

/** Generates a clean one-page A4 PDF invoice and returns the raw bytes. */
export async function generateInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([595.28, 841.89]) // A4 in points
  const { width, height } = page.getSize()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)

  const currency = data.currency || 'USD'
  const money = (n: number) => `${currency} ${n.toFixed(2)}`
  const margin = 50

  // Header band
  page.drawRectangle({ x: 0, y: height - 110, width, height: 110, color: PRIMARY })
  page.drawText('HotelOS', { x: margin, y: height - 60, size: 24, font: bold, color: rgb(1, 1, 1) })
  page.drawText('Hotel Management Platform', { x: margin, y: height - 80, size: 10, font, color: rgb(1, 1, 1) })
  page.drawText('INVOICE', { x: width - margin - 110, y: height - 62, size: 26, font: bold, color: rgb(1, 1, 1) })

  let y = height - 150

  // Invoice meta
  page.drawText(`Invoice No:  ${data.invoiceNumber}`, { x: margin, y, size: 11, font: bold, color: DARK })
  page.drawText(`Issued:  ${new Date(data.issuedAt).toLocaleDateString()}`, { x: width - margin - 160, y, size: 11, font, color: MUTED })
  y -= 18
  page.drawText(data.hotelName, { x: margin, y, size: 11, font, color: MUTED })

  // Bill to
  y -= 40
  page.drawText('BILL TO', { x: margin, y, size: 9, font: bold, color: MUTED })
  y -= 16
  page.drawText(data.guestName || 'Guest', { x: margin, y, size: 12, font: bold, color: DARK })
  if (data.guestEmail) {
    y -= 15
    page.drawText(data.guestEmail, { x: margin, y, size: 10, font, color: MUTED })
  }

  // Table header
  y -= 40
  page.drawRectangle({ x: margin, y: y - 6, width: width - margin * 2, height: 24, color: rgb(241 / 255, 245 / 255, 249 / 255) })
  page.drawText('DESCRIPTION', { x: margin + 10, y, size: 9, font: bold, color: MUTED })
  page.drawText('AMOUNT', { x: width - margin - 90, y, size: 9, font: bold, color: MUTED })

  // Line item
  y -= 30
  const desc = [
    `Room ${data.roomNumber ?? ''}`.trim(),
    data.roomType ? `(${data.roomType})` : '',
  ].filter(Boolean).join(' ')
  page.drawText(desc || 'Room booking', { x: margin + 10, y, size: 11, font, color: DARK })
  page.drawText(money(data.amount), { x: width - margin - 90, y, size: 11, font, color: DARK })
  y -= 16
  page.drawText(`${data.checkIn} → ${data.checkOut} · ${data.nights} night${data.nights === 1 ? '' : 's'}`, {
    x: margin + 10, y, size: 9, font, color: MUTED,
  })

  // Divider + total
  y -= 24
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: LINE })
  y -= 26
  page.drawText('Total', { x: width - margin - 200, y, size: 13, font: bold, color: DARK })
  page.drawText(money(data.amount), { x: width - margin - 90, y, size: 13, font: bold, color: PRIMARY })

  // Footer
  page.drawText('Thank you for your booking.', { x: margin, y: 70, size: 10, font, color: MUTED })
  page.drawText('This is a computer-generated invoice from HotelOS.', { x: margin, y: 55, size: 8, font, color: MUTED })

  return pdf.save()
}
