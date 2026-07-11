import { getSiteUrl } from '@/lib/supabase/env'

// ----------------------------------------------------------------------------
// Brand tokens (kept in sync with tailwind.config.ts)
// ----------------------------------------------------------------------------
const BRAND = {
  name: 'HotelOS',
  tagline: 'Hotel Management Platform',
  primary: '#0284c7',
  primaryDark: '#0c4a6e',
  accent: '#f59e0b',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  bg: '#f1f5f9',
  // Optional hosted logo image. If unset we render a clean text logo instead.
  logoUrl: process.env.EMAIL_LOGO_URL,
}

interface BrandedEmailOptions {
  /** Hidden preheader shown in the inbox preview line. */
  preview?: string
  /** Large heading at the top of the card. */
  heading: string
  /** Intro paragraph(s) under the heading. Plain text. */
  intro?: string
  /** Pre-rendered HTML for the main content (e.g. an OTP code block, a button). */
  bodyHtml?: string
  /** Small print under the main content. Plain text. */
  footnote?: string
}

function logoBlock() {
  if (BRAND.logoUrl) {
    return `<img src="${BRAND.logoUrl}" alt="${BRAND.name}" height="34" style="height:34px;display:block;border:0;outline:none;text-decoration:none;" />`
  }
  // Text logo: a small "building" glyph + the brand name, in white on the header bar.
  return `
    <span style="font-size:22px;font-weight:800;letter-spacing:-0.3px;color:#ffffff;font-family:'Inter',Arial,sans-serif;">
      <span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;background:rgba(255,255,255,0.18);border-radius:7px;margin-right:8px;vertical-align:middle;">🏨</span>${BRAND.name}
    </span>`
}

/**
 * Wraps content in the shared, mobile-friendly HotelOS email shell:
 * branded header, white card, and footer. All styles inline so it renders
 * consistently across email clients.
 */
export function renderBrandedEmail({ preview, heading, intro, bodyHtml = '', footnote }: BrandedEmailOptions): string {
  const siteUrl = getSiteUrl()
  const year = '2026'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:'Inter',Arial,Helvetica,sans-serif;color:${BRAND.text};">
  ${preview ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, ${BRAND.primary}, ${BRAND.primaryDark});border-radius:14px 14px 0 0;padding:24px 32px;">
              <a href="${siteUrl}" style="text-decoration:none;">${logoBlock()}</a>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#ffffff;padding:36px 32px 28px;border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.text};">${escapeHtml(heading)}</h1>
              ${intro ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${BRAND.muted};">${escapeHtml(intro)}</p>` : ''}
              ${bodyHtml}
              ${footnote ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${BRAND.muted};">${escapeHtml(footnote)}</p>` : ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#ffffff;border-radius:0 0 14px 14px;border:1px solid ${BRAND.border};border-top:0;padding:24px 32px;">
              <p style="margin:0 0 4px;font-size:13px;color:${BRAND.text};font-weight:600;">${BRAND.name}</p>
              <p style="margin:0 0 14px;font-size:12px;color:${BRAND.muted};">${BRAND.tagline}</p>
              <p style="margin:0;font-size:12px;color:${BRAND.muted};line-height:1.6;">
                You received this email because of activity on your ${BRAND.name} account.
                If this wasn't you, you can safely ignore it.
              </p>
              <p style="margin:14px 0 0;font-size:11px;color:#94a3b8;">© ${year} ${BRAND.name}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/** Branded email-confirmation email (signup). */
export function confirmEmailTemplate(fullName: string, verifyUrl: string): { subject: string; html: string } {
  const name = fullName?.trim() ? fullName.trim() : 'there'
  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0 4px;">
          <a href="${verifyUrl}" style="display:inline-block;background:${BRAND.primary};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 30px;border-radius:10px;font-family:'Inter',Arial,sans-serif;">
            Verify my email
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:22px 0 6px;font-size:13px;color:${BRAND.muted};">Or paste this link into your browser:</p>
    <p style="margin:0;font-size:13px;word-break:break-all;"><a href="${verifyUrl}" style="color:${BRAND.primary};">${verifyUrl}</a></p>`

  return {
    subject: 'Confirm your HotelOS account',
    html: renderBrandedEmail({
      preview: 'Confirm your email to activate your HotelOS account',
      heading: `Welcome, ${name}!`,
      intro: 'Confirm your email address to activate your account and start booking.',
      bodyHtml,
      footnote: "This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.",
    }),
  }
}

const ROLE_LABELS: Record<string, string> = {
  hotel_admin: 'Hotel administrator',
  staff: 'Staff member',
  customer: 'Guest',
}

/**
 * Branded welcome email for admin-provisioned accounts (hotel owners & staff).
 * These accounts are created with a temporary password by an admin, so the
 * email hands the recipient their credentials and a link to sign in.
 */
export function staffWelcomeTemplate(opts: {
  fullName: string
  email: string
  tempPassword: string
  role: string
  loginUrl: string
}): { subject: string; html: string } {
  const name = opts.fullName?.trim() ? opts.fullName.trim() : 'there'
  const roleLabel = ROLE_LABELS[opts.role] ?? 'Team member'
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 0;font-size:13px;color:${BRAND.muted};">${escapeHtml(label)}</td>
      <td style="padding:8px 0;font-size:13px;color:${BRAND.text};text-align:right;font-weight:600;">${escapeHtml(value)}</td>
    </tr>`

  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.border};border-radius:12px;padding:6px 18px;">
      ${row('Role', roleLabel)}
      ${row('Email', opts.email)}
      ${row('Temporary password', opts.tempPassword)}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:22px 0 4px;">
          <a href="${opts.loginUrl}" style="display:inline-block;background:${BRAND.primary};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 30px;border-radius:10px;font-family:'Inter',Arial,sans-serif;">
            Sign in to ${BRAND.name}
          </a>
        </td>
      </tr>
    </table>`

  return {
    subject: `Your ${BRAND.name} account is ready`,
    html: renderBrandedEmail({
      preview: `Your ${BRAND.name} account has been created`,
      heading: `Welcome aboard, ${name}!`,
      intro: 'An account has been created for you on HotelOS. Use the credentials below to sign in and get started.',
      bodyHtml,
      footnote: 'For your security, please change your password right after your first sign-in, and never share these credentials with anyone.',
    }),
  }
}

/**
 * Branded invitation email for admin-created customer accounts. The customer
 * follows the link to verify their email and set their own password.
 */
export function customerInviteTemplate(fullName: string, inviteUrl: string): { subject: string; html: string } {
  const name = fullName?.trim() ? fullName.trim() : 'there'
  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0 4px;">
          <a href="${inviteUrl}" style="display:inline-block;background:${BRAND.primary};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 30px;border-radius:10px;font-family:'Inter',Arial,sans-serif;">
            Accept invitation
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:22px 0 6px;font-size:13px;color:${BRAND.muted};">Or paste this link into your browser:</p>
    <p style="margin:0;font-size:13px;word-break:break-all;"><a href="${inviteUrl}" style="color:${BRAND.primary};">${inviteUrl}</a></p>`

  return {
    subject: `You're invited to ${BRAND.name}`,
    html: renderBrandedEmail({
      preview: `You've been invited to join ${BRAND.name}`,
      heading: `You're invited, ${name}!`,
      intro: 'An account has been created for you. Accept the invitation to set your password and start booking your stays.',
      bodyHtml,
      footnote: "This invitation link expires in 24 hours. If you weren't expecting this, you can safely ignore this email.",
    }),
  }
}

export interface BookingConfirmationData {
  guestName: string
  hotelName: string
  roomNumber?: string
  roomType?: string
  checkIn: string
  checkOut: string
  nights: number
  amount: number
  currency?: string
  invoiceNumber: string
}

/** Branded booking-confirmation email (PDF invoice attached separately). */
export function bookingConfirmationTemplate(d: BookingConfirmationData): { subject: string; html: string } {
  const currency = d.currency || 'USD'
  const name = d.guestName?.trim() ? d.guestName.trim() : 'there'
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 0;font-size:13px;color:${BRAND.muted};">${escapeHtml(label)}</td>
      <td style="padding:8px 0;font-size:13px;color:${BRAND.text};text-align:right;font-weight:600;">${escapeHtml(value)}</td>
    </tr>`

  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BRAND.border};border-radius:12px;padding:6px 18px;">
      ${row('Hotel', d.hotelName)}
      ${row('Room', [d.roomNumber ? `Room ${d.roomNumber}` : '', d.roomType ? `(${d.roomType})` : ''].filter(Boolean).join(' ') || '—')}
      ${row('Check-in', d.checkIn)}
      ${row('Check-out', d.checkOut)}
      ${row('Nights', String(d.nights))}
      <tr><td colspan="2" style="border-top:1px solid ${BRAND.border};padding:0;"></td></tr>
      ${row('Total', `${currency} ${d.amount.toFixed(2)}`)}
    </table>
    <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:${BRAND.muted};">
      Your invoice (<strong style="color:${BRAND.text};">${escapeHtml(d.invoiceNumber)}</strong>) is attached to this email as a PDF.
    </p>`

  return {
    subject: `Booking confirmed — ${d.hotelName}`,
    html: renderBrandedEmail({
      preview: `Your booking at ${d.hotelName} is confirmed`,
      heading: 'Your booking is confirmed 🎉',
      intro: `Hi ${name}, your reservation is all set. Here are your details:`,
      bodyHtml,
      footnote: 'Need to make a change? Just reply to this email or contact the property directly.',
    }),
  }
}

/** Branded one-time login code email. */
export function otpEmailTemplate(code: string): { subject: string; html: string } {
  const spaced = code.split('').join('&nbsp;&nbsp;')
  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0 4px;">
          <div style="display:inline-block;background:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:12px;padding:18px 28px;">
            <div style="font-size:32px;font-weight:800;letter-spacing:6px;color:${BRAND.primaryDark};font-family:'Inter',Arial,sans-serif;">${spaced}</div>
          </div>
        </td>
      </tr>
    </table>
    <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:${BRAND.muted};">
      This code expires in <strong style="color:${BRAND.text};">10 minutes</strong>. Enter it on the sign-in screen to finish logging in.
    </p>`

  return {
    subject: `Your ${BRAND.name} login code: ${code}`,
    html: renderBrandedEmail({
      preview: `Your ${BRAND.name} verification code is ${code}`,
      heading: 'Verify your sign-in',
      intro: 'Use the one-time code below to securely sign in to your account.',
      bodyHtml,
      footnote: 'For your security, never share this code with anyone. HotelOS staff will never ask for it.',
    }),
  }
}

/** Branded password-reset code email. */
export function passwordResetEmailTemplate(code: string): { subject: string; html: string } {
  const spaced = code.split('').join('&nbsp;&nbsp;')
  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:8px 0 4px;">
          <div style="display:inline-block;background:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:12px;padding:18px 28px;">
            <div style="font-size:32px;font-weight:800;letter-spacing:6px;color:${BRAND.primaryDark};font-family:'Inter',Arial,sans-serif;">${spaced}</div>
          </div>
        </td>
      </tr>
    </table>
    <p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:${BRAND.muted};">
      This code expires in <strong style="color:${BRAND.text};">10 minutes</strong>. Enter it along with your new password to finish resetting your account.
    </p>`

  return {
    subject: `Your ${BRAND.name} password reset code: ${code}`,
    html: renderBrandedEmail({
      preview: `Your ${BRAND.name} password reset code is ${code}`,
      heading: 'Reset your password',
      intro: 'Use the one-time code below to set a new password for your account.',
      bodyHtml,
      footnote: "For your security, never share this code with anyone. If you didn't request this, you can safely ignore this email.",
    }),
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
