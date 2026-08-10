/** Strip HTML tags and bare angle brackets — use before saving any free-text field. */
export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/[<>]/g, '')
}

/** Allow only letters (including accented), spaces, hyphens, apostrophes — for personal names. */
export function sanitizeName(value: string): string {
  return value.replace(/[^a-zA-ZÀ-ɏ\s'-]/g, '')
}
