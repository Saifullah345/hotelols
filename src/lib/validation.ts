import { z } from 'zod'

// Expected local digit count (after the dial code) for each country prefix.
// Sorted longest-first so +880 matches before +88, etc.
const COUNTRY_DIGIT_RULES: { dial: string; digits: number }[] = [
  { dial: '+92',  digits: 10 }, // Pakistan
  { dial: '+971', digits: 9  }, // UAE
  { dial: '+966', digits: 9  }, // Saudi Arabia
  { dial: '+974', digits: 8  }, // Qatar
  { dial: '+965', digits: 8  }, // Kuwait
  { dial: '+973', digits: 8  }, // Bahrain
  { dial: '+968', digits: 8  }, // Oman
  { dial: '+91',  digits: 10 }, // India
  { dial: '+880', digits: 10 }, // Bangladesh
  { dial: '+94',  digits: 9  }, // Sri Lanka
  { dial: '+977', digits: 10 }, // Nepal
  { dial: '+44',  digits: 10 }, // UK
  { dial: '+1',   digits: 10 }, // US / Canada
  { dial: '+33',  digits: 9  }, // France
  { dial: '+34',  digits: 9  }, // Spain
  { dial: '+31',  digits: 9  }, // Netherlands
  { dial: '+32',  digits: 9  }, // Belgium
  { dial: '+41',  digits: 9  }, // Switzerland
  { dial: '+61',  digits: 9  }, // Australia
  { dial: '+64',  digits: 9  }, // New Zealand
  { dial: '+65',  digits: 8  }, // Singapore
  { dial: '+60',  digits: 9  }, // Malaysia
  { dial: '+63',  digits: 10 }, // Philippines
  { dial: '+66',  digits: 9  }, // Thailand
  { dial: '+84',  digits: 9  }, // Vietnam
  { dial: '+86',  digits: 11 }, // China
  { dial: '+81',  digits: 10 }, // Japan
  { dial: '+82',  digits: 10 }, // South Korea
  { dial: '+90',  digits: 10 }, // Turkey
  { dial: '+20',  digits: 10 }, // Egypt
  { dial: '+234', digits: 10 }, // Nigeria
  { dial: '+254', digits: 9  }, // Kenya
  { dial: '+27',  digits: 9  }, // South Africa
  { dial: '+233', digits: 9  }, // Ghana
  { dial: '+251', digits: 9  }, // Ethiopia
  { dial: '+256', digits: 9  }, // Uganda
  { dial: '+55',  digits: 11 }, // Brazil
  { dial: '+52',  digits: 10 }, // Mexico
  { dial: '+54',  digits: 10 }, // Argentina
  { dial: '+7',   digits: 10 }, // Russia
  { dial: '+93',  digits: 9  }, // Afghanistan
  { dial: '+98',  digits: 10 }, // Iran
  { dial: '+964', digits: 10 }, // Iraq
  { dial: '+962', digits: 9  }, // Jordan
  { dial: '+961', digits: 8  }, // Lebanon
  { dial: '+963', digits: 9  }, // Syria
].sort((a, b) => b.dial.length - a.dial.length)

function validatePhoneDigits(v: string): boolean {
  const trimmed = v.trim()
  const rule = COUNTRY_DIGIT_RULES.find(r => trimmed.startsWith(r.dial))
  const localDigits = trimmed
    .slice(rule ? rule.dial.length : 0)
    .replace(/\D/g, '')
    .length
  if (rule) return localDigits === rule.digits
  // Unknown country code or no prefix: accept E.164 range (7–15 total digits)
  const totalDigits = trimmed.replace(/\D/g, '').length
  return totalDigits >= 7 && totalDigits <= 15
}

export const phoneSchema = z.string()
  .min(1, 'Phone number is required')
  .refine(v => /^[+]?[0-9()\-.\s]+$/.test(v), 'Phone number can only contain digits and formatting characters')
  .refine(validatePhoneDigits, 'Phone number length is invalid for the selected country')

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
