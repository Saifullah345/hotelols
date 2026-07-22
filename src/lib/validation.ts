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
