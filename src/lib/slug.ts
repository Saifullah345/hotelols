/** Convert a hotel name to a unique URL-safe slug. */
export function generateHotelSlug(name: string): string {
  return (
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') +
    '-' +
    Date.now().toString(36)
  )
}
