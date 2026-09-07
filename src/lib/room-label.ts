// What a room is called on screen.
//
// `rooms.name` and `rooms.room_number` are free text, and rows created before
// `roomNameSchema` / `roomNumberSchema` were enforced hold things like "-------"
// and "-----". Rendering those verbatim — "------- (Deluxe Room)" on the public
// hotel page — reads as a broken listing rather than a room, so every screen
// asks for the label here instead of interpolating the columns itself.
//
// Nothing is written back: the row keeps whatever it holds, and a hotel that
// edits it gets the validated version. This only decides what a guest sees.

export type LabelledRoom = {
  name?: string | null
  room_number?: string | null
  room_type?: { name?: string | null } | null
}

// Filler at the edges of a label — the dots, dashes and slashes people type when
// they have nothing to put in the field. Brackets and quotes are excluded on the
// side that opens or closes them, so "Suite (Annexe)" and "Deluxe #204" survive.
const LEAD_JUNK  = /^[^\p{L}\p{N}(\[{«“‘]+/u
const TRAIL_JUNK = /[^\p{L}\p{N})\]}»”’]+$/u

/**
 * A trimmed label, or '' when there is nothing readable in it. Inner spacing is
 * collapsed so "Deluxe    Room" and "Deluxe Room" render the same.
 */
export function cleanLabel(value: string | null | undefined): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.replace(/\s+/g, ' ').trim().replace(LEAD_JUNK, '').replace(TRAIL_JUNK, '')
  // "-------", "###", "   " — punctuation with no word in it is not a name.
  return /[\p{L}\p{N}]/u.test(trimmed) ? trimmed : ''
}

/**
 * The room's name, else its number, else its type — the first of those that is
 * actually readable. "Room" only when a row has none of the three.
 */
export function roomLabel(room: LabelledRoom | null | undefined): string {
  const name = cleanLabel(room?.name)
  if (name) return name

  const number = cleanLabel(room?.room_number)
  if (number) return `Room ${number}`

  const type = cleanLabel(room?.room_type?.name)
  if (type) return type

  return 'Room'
}

/**
 * The room type shown beside the label, or '' when it would only repeat it —
 * a room named "Deluxe Room" of type "Deluxe Room" reads once, not twice.
 */
export function roomTypeSuffix(room: LabelledRoom | null | undefined): string {
  const type = cleanLabel(room?.room_type?.name)
  return type && type.toLowerCase() !== roomLabel(room).toLowerCase() ? type : ''
}

/** "Room 204" for a usable number, else just "Room". */
export function roomNumberLabel(roomNumber: string | null | undefined): string {
  const number = cleanLabel(roomNumber)
  return number ? `Room ${number}` : 'Room'
}
