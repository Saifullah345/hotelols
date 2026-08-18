// Validation for the numeric fields of a plan, shared by the create and update
// routes so neither can store a value the other would reject.

/** Only -1 carries a meaning; every other negative is a typo waiting to break something. */
export const UNLIMITED = -1

export type LimitResult = { value: number } | { error: string }

/**
 * Reads a room or staff limit.
 *
 * Accepts a whole number of 1 or more, or -1 for "unlimited" — nothing else.
 * A limit like -20 used to be storable and made the plan unusable: the room
 * check reads `used >= max`, which is true at zero rooms, so the hotel could
 * never add one.
 */
export function parsePlanLimit(raw: unknown, label: string): LimitResult {
  const n = Number(raw)
  if (!Number.isFinite(n)) return { error: `${label} must be a number` }
  if (!Number.isInteger(n)) return { error: `${label} must be a whole number` }
  if (n === UNLIMITED) return { value: UNLIMITED }
  if (n < 0) return { error: `${label} cannot be negative. Use -1 for unlimited.` }
  if (n === 0) return { error: `${label} must be at least 1, or -1 for unlimited` }
  return { value: n }
}

/** Position on the upgrade ladder: a whole number of 1 or more. */
export function parseTierRank(raw: unknown, fallback: number): LimitResult {
  if (raw === undefined || raw === null || raw === '') return { value: fallback }
  const n = Number(raw)
  if (!Number.isFinite(n)) return { error: 'Tier rank must be a number' }
  if (n < 1) return { error: 'Tier rank must be 1 or higher' }
  return { value: Math.round(n) }
}

/**
 * Free trial length, in days.
 *
 * 0 means "charge at checkout" and is perfectly valid, so this can't reuse the
 * limit parser — there, 0 is a mistake. The ceiling matches the database
 * constraint, so a value that passes here always saves.
 */
export function parseTrialDays(raw: unknown): LimitResult {
  if (raw === undefined || raw === null || raw === '') return { value: 0 }
  const n = Number(raw)
  if (!Number.isFinite(n)) return { error: 'Trial days must be a number' }
  if (!Number.isInteger(n)) return { error: 'Trial days must be a whole number' }
  if (n < 0) return { error: 'Trial days cannot be negative. Use 0 for no trial.' }
  if (n > 365) return { error: 'Trial days cannot exceed 365' }
  return { value: n }
}
