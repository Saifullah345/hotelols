// How a guest is labelled on screen.
//
// `full_name` on a profile defaults to an empty string, so `??` chains fall
// straight through it and leave a nameless guest with a blank avatar and no
// label. Everything here treats blank as missing and always has something left
// to show.

type GuestSource = {
  user?: { full_name?: string | null; email?: string | null; avatar_url?: string | null } | null
  guest_name?: string | null
  guest_phone?: string | null
}

const clean = (v?: string | null) => (typeof v === 'string' ? v.trim() : '')

/** Best available name: account name → walk-in name → email → phone → "Guest". */
export function guestLabel(b: GuestSource): string {
  return (
    clean(b.user?.full_name) ||
    clean(b.guest_name) ||
    clean(b.user?.email) ||
    clean(b.guest_phone) ||
    'Guest'
  )
}

/** Secondary line under the name — never repeats whatever `guestLabel` picked. */
export function guestContact(b: GuestSource): string {
  const label = guestLabel(b)
  const email = clean(b.user?.email)
  const phone = clean(b.guest_phone)
  if (email && email !== label) return email
  if (phone && phone !== label) return phone
  return ''
}

/** The guest's own photo, when their account has one. */
export function guestAvatar(b: GuestSource): string | null {
  return clean(b.user?.avatar_url) || null
}

/** First letter of the label, so the avatar is never an empty circle. */
export function guestInitial(b: GuestSource): string {
  const label = guestLabel(b)
  const letter = label.replace(/[^A-Za-z0-9]/g, '').charAt(0)
  return (letter || label.charAt(0) || 'G').toUpperCase()
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-orange-500', 'bg-pink-500', 'bg-cyan-500',
]

/** Stable colour for a guest. Falls back rather than indexing with NaN. */
export function avatarColor(seed: string): string {
  const s = clean(seed)
  if (!s) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = (hash + s.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[hash]
}
