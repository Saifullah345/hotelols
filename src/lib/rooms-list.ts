/**
 * The column list the rooms list screen reads.
 *
 * Why this isn't just `select('*')`
 * ─────────────────────────────────
 * `rooms.images` is a JSONB array of base64 data URLs — around 30 KB for the
 * first photo and 180 KB for the second, per room. `select('*')` dragged all of
 * it out of Postgres and across the wire on every page load and every
 * infinite-scroll page: four rooms measured at 1.7 MB raw / 493 KB gzipped,
 * ~2.2 s over the link to the Supabase host.
 *
 * The list renders two things from that column: the first photo, and how many
 * photos there are. So it now asks for exactly those. Same four rooms:
 * 124 KB raw, ~1.2 s — and what's left is the one thumbnail we actually draw.
 *
 * `image_count` is the computed column added in migration 034. Until that
 * migration is applied PostgREST answers 400/42703, so `selectRoomList()` below
 * retries once with the old shape rather than leaving the screen broken.
 */

const SHARED_COLUMNS =
  'id, room_number, name, floor, sort_order, capacity, price_per_night, status, room_type_id, ' +
  'room_type:room_types(id, name, capacity)'

/** Slim shape: thumbnail only, plus the photo count as a number. */
export const ROOM_LIST_COLUMNS = `${SHARED_COLUMNS}, thumbnail:images->>0, image_count`

/** Pre-migration shape: the whole `images` array. Only used as a fallback. */
export const ROOM_LIST_COLUMNS_LEGACY = `${SHARED_COLUMNS}, images`

/** A room as the list screen consumes it, whichever shape came back. */
export type RoomListRow = {
  id: string
  room_number: string
  name: string | null
  floor: number
  sort_order: number
  capacity: number
  price_per_night: number
  status: string
  room_type_id: string
  room_type: { id?: string; name?: string; capacity?: number } | null
  /** First photo, or null when the room has none. */
  thumbnail: string | null
  /** How many photos the room has — drives the "N photos" badge. */
  image_count: number
}

type RawRoomRow = Record<string, unknown> & {
  thumbnail?: string | null
  image_count?: number | null
  images?: string[] | null
}

/** Collapses either shape onto `thumbnail` + `image_count`. */
function normalize(row: RawRoomRow): RoomListRow {
  const images = Array.isArray(row.images) ? row.images : null
  const { images: _dropped, ...rest } = row
  void _dropped
  return {
    ...(rest as Omit<RoomListRow, 'thumbnail' | 'image_count'>),
    thumbnail: row.thumbnail ?? images?.[0] ?? null,
    image_count: row.image_count ?? images?.length ?? 0,
  }
}

type QueryResult = { data: unknown; error: { code?: string } | null }

/**
 * Whether this database has `image_count`. Null until the first query answers
 * it. Sticky on purpose: without it, a database still waiting on migration 034
 * would pay a doomed request *and* the legacy one on every single load, which
 * is slower than never having tried. Module scope means one wasted request per
 * server process and per browser tab, not per page view.
 */
let hasImageCount: boolean | null = null

/**
 * Runs a rooms query with the slim column list, falling back to the legacy one
 * if this database hasn't had migration 034 applied yet.
 *
 * `build` is called with the column list and must return the finished query —
 * the filters, ordering and range differ between call sites, only the columns
 * are shared.
 */
export async function selectRoomList(
  build: (columns: string) => PromiseLike<QueryResult>,
): Promise<RoomListRow[]> {
  if (hasImageCount === false) {
    const legacy = await build(ROOM_LIST_COLUMNS_LEGACY)
    return ((legacy.data ?? []) as RawRoomRow[]).map(normalize)
  }

  const slim = await build(ROOM_LIST_COLUMNS)

  // 42703 = undefined column: migration 034 hasn't run here. Anything else is a
  // real failure and is reported the way it always was — as an empty list.
  if (slim.error?.code === '42703') {
    hasImageCount = false
    const legacy = await build(ROOM_LIST_COLUMNS_LEGACY)
    return ((legacy.data ?? []) as RawRoomRow[]).map(normalize)
  }

  if (!slim.error) hasImageCount = true
  return ((slim.data ?? []) as RawRoomRow[]).map(normalize)
}
