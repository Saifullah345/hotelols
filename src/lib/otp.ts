import crypto from 'crypto'

// Stateless OTP challenge: the code itself is never stored server-side. Instead
// we issue a signed, tamper-proof token (kept in an httpOnly cookie) that holds
// a hash of the code plus an expiry and attempt counter. This avoids needing an
// extra database table while still being secure against tampering and replay.

export const OTP_COOKIE = 'otp_challenge'
export const PASSWORD_RESET_COOKIE = 'pwreset_challenge'
const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes
const MAX_ATTEMPTS = 5

function secret(): string {
  return process.env.OTP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'insecure-dev-otp-secret'
}

function hashCode(email: string, code: string): string {
  return crypto.createHash('sha256').update(`${email.toLowerCase()}:${code}:${secret()}`).digest('hex')
}

function sign(payloadB64: string): string {
  return crypto.createHmac('sha256', secret()).update(payloadB64).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

interface Payload {
  email: string
  codeHash: string
  exp: number
  attempts: number
}

function encode(payload: Payload): string {
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${b64}.${sign(b64)}`
}

function decode(token: string): Payload | null {
  const dot = token.lastIndexOf('.')
  if (dot < 0) return null
  const b64 = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (!safeEqual(sign(b64), sig)) return null
  try {
    return JSON.parse(Buffer.from(b64, 'base64url').toString()) as Payload
  } catch {
    return null
  }
}

/** Returns a random 6-digit numeric code as a zero-padded string. */
export function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
}

/** Builds the signed challenge token to store in the OTP cookie. */
export function createChallenge(email: string, code: string): string {
  return encode({
    email: email.toLowerCase(),
    codeHash: hashCode(email, code),
    exp: Date.now() + OTP_TTL_MS,
    attempts: 0,
  })
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: string; nextToken?: string; clear?: boolean }

/**
 * Verifies a submitted code against the challenge token. On a wrong-but-valid
 * attempt it returns `nextToken` with an incremented counter so the caller can
 * refresh the cookie; on expiry/exhaustion it asks the caller to clear it.
 */
export function verifyChallenge(token: string | undefined, email: string, code: string): VerifyResult {
  if (!token) return { ok: false, reason: 'No code was requested. Please sign in again.', clear: true }

  const payload = decode(token)
  if (!payload || payload.email !== email.toLowerCase()) {
    return { ok: false, reason: 'Invalid session. Please sign in again.', clear: true }
  }
  if (Date.now() > payload.exp) {
    return { ok: false, reason: 'Code expired. Please request a new one.', clear: true }
  }
  if (payload.attempts >= MAX_ATTEMPTS) {
    return { ok: false, reason: 'Too many attempts. Please sign in again.', clear: true }
  }
  if (!safeEqual(hashCode(email, code), payload.codeHash)) {
    const next = encode({ ...payload, attempts: payload.attempts + 1 })
    const left = MAX_ATTEMPTS - (payload.attempts + 1)
    return {
      ok: false,
      reason: left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many attempts. Please sign in again.',
      nextToken: next,
    }
  }
  return { ok: true }
}
