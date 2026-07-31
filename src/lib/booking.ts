// Rules a guest's own reservation is governed by, shared by the UI and the API
// so both agree on what "still editable" means.

/**
 * A guest may change their own booking for one day after making it. After that
 * the hotel has planned around it, so changes go through the hotel instead.
 */
export const GUEST_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000

export type EditableBooking = { status: string; created_at: string }

/** Timestamp (ms) at which the guest's own edit window closes. */
export function guestEditDeadline(createdAt: string): number {
  return new Date(createdAt).getTime() + GUEST_EDIT_WINDOW_MS
}

/** True while the guest can still edit the booking themselves. */
export function canGuestEdit(booking: EditableBooking, now: number = Date.now()): boolean {
  if (booking.status !== 'pending') return false
  const deadline = guestEditDeadline(booking.created_at)
  return Number.isFinite(deadline) && now < deadline
}

/** Whole hours left in the edit window, rounded up. 0 once it has closed. */
export function guestEditHoursLeft(createdAt: string, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((guestEditDeadline(createdAt) - now) / 3_600_000))
}

// ─── Stay grouping ───────────────────────────────────────────────────
// Rooms booked together share one booking row. Reservations made before that
// was true — and rooms added to the same trip on a later visit — are separate
// rows describing one stay. Guest and staff screens both group on this key so
// they never disagree about what counts as one booking.

type GuestIdentity = { user_id?: string | null; guest_name?: string | null; guest_phone?: string | null }

/** Who the booking is for: the account when there is one, name + phone otherwise. */
export function guestKey(b: GuestIdentity): string {
  if (b.user_id) return `user:${b.user_id}`
  return `walkin:${(b.guest_name ?? '').trim().toLowerCase()}|${(b.guest_phone ?? '').trim()}`
}

export type StayIdentity = GuestIdentity & {
  hotel_id?: string | null
  check_in: string
  check_out: string
  status: string
}

/** Same guest, same hotel, same dates, same status = one stay. */
export function stayKey(b: StayIdentity): string {
  return `${b.hotel_id ?? ''}|${guestKey(b)}|${b.check_in}|${b.check_out}|${b.status}`
}

/** Groups rows into stays, preserving the order the first row of each appeared. */
export function groupByStay<T extends StayIdentity>(rows: T[]): T[][] {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const key = stayKey(row)
    const bucket = map.get(key)
    if (bucket) bucket.push(row); else map.set(key, [row])
  }
  return Array.from(map.values())
}

/**
 * Maps an edited pool of rooms back onto the rows of a stay.
 *
 * Each row keeps whichever of its own rooms survived; rooms newly added land on
 * the first row. A row that comes back empty lost all of its rooms and has
 * nothing left to hold.
 */
export function assignRoomsToRows(rowRoomIds: string[][], selected: string[]): string[][] {
  const keep = new Set(selected)
  const originals = new Set(rowRoomIds.flat())
  const added = selected.filter(id => !originals.has(id))
  return rowRoomIds.map((own, i) => {
    const kept = own.filter(id => keep.has(id))
    return i === 0 ? [...kept, ...added] : kept
  })
}

/** True when two room sets differ, order ignored. */
export function roomSetChanged(a: string[], b: string[]): boolean {
  return a.length !== b.length || a.some(id => !b.includes(id))
}

/**
 * Spreads a party over the rows of a stay, filling each row up to its capacity.
 * Every row keeps at least `min` guests so no room is left empty.
 */
export function distributeGuests(total: number, caps: number[], min: number): number[] {
  const out = caps.map(() => min)
  let left = total - min * caps.length
  for (let i = 0; i < caps.length && left > 0; i++) {
    const room = Math.max(0, caps[i] - out[i])
    const give = Math.min(room, left)
    out[i] += give
    left   -= give
  }
  // Anything still left (capacity was tighter than the total allowed) goes on
  // the first row rather than being silently dropped.
  if (left > 0 && out.length) out[0] += left
  return out
}
