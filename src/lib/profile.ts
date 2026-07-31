// What the hotel needs on file before a booking can be taken.
//
// A profile row is created empty by the signup trigger, so a guest can reach
// checkout with no name and no phone — leaving the hotel a reservation it
// can't confirm with anyone. Both screens and the API check the same rule.

export type ProfileLike = { full_name?: string | null; phone?: string | null }

export function isProfileComplete(profile: ProfileLike | null | undefined): boolean {
  return !!profile?.full_name?.trim() && !!profile?.phone?.trim()
}

/** Fields still missing, for a message the guest can act on. */
export function missingProfileFields(profile: ProfileLike | null | undefined): string[] {
  const missing: string[] = []
  if (!profile?.full_name?.trim()) missing.push('name')
  if (!profile?.phone?.trim())     missing.push('phone number')
  return missing
}

export const PROFILE_INCOMPLETE = 'profile_incomplete'
