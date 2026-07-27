import { z } from 'zod'

// Accepts digits with common formatting characters (+, spaces, dashes, dots,
// parens) in any grouping, then checks the digit count against the E.164
// range — rather than a fixed group pattern, which rejected valid numbers
// like "+1 555 000 0000".
export const phoneSchema = z.string()
  .min(1, 'Phone number is required')
  .refine(v => /^[+]?[0-9()\-.\s]+$/.test(v), 'Phone number can only contain digits and formatting characters')
  .refine(v => {
    const digits = v.replace(/\D/g, '')
    return digits.length >= 7 && digits.length <= 15
  }, 'Phone number must be between 7 and 15 digits')

// ── Human name ──────────────────────────────────────────────────────
// Must start with a letter, then letters (any script), spaces and the
// separators . ' - only. Rejects pure numbers ("7678680"), symbol-only
// input ("------") and HTML/markup ("<img src=x …>"), while still allowing
// real names like "O'Brien", "Jean-Luc", "José María" or "Al-Rashid".
export const nameSchema = z.string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(80, 'Name is too long')
  .regex(
    /^[\p{L}][\p{L}\p{M}\s.'-]*$/u,
    'Enter a valid name using letters only (no numbers or symbols)',
  )

// ── Room display name ───────────────────────────────────────────────
// Human-facing label like "Ocean View Suite" or "Deluxe #204". Allows
// letters, numbers, spaces and a small set of safe separators, but must
// contain at least one letter and cannot contain markup like < >.
export const roomNameSchema = z.string()
  .trim()
  .min(1, 'Display name is required')
  .max(60, 'Display name is too long')
  .regex(
    /^[\p{L}\p{N}][\p{L}\p{N}\s.,'&()/#-]*$/u,
    'Use only letters, numbers and spaces (no special characters like < >)',
  )
  .refine(v => /\p{L}/u.test(v), 'Display name must include letters')

// ── Room number ─────────────────────────────────────────────────────
// Identifier like "101", "12B" or "A-14". Letters, numbers, spaces and
// hyphens only — rejects markup/symbols such as "<30>##" or "<150>#$Fatima".
export const roomNumberSchema = z.string()
  .trim()
  .min(1, 'Room number is required')
  .max(12, 'Room number is too long')
  .regex(
    /^[\p{L}\p{N}][\p{L}\p{N} -]*$/u,
    'Room number can contain letters, numbers and hyphens only',
  )
