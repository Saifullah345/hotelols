import { Facebook, Instagram, Linkedin, Twitter, type LucideIcon } from 'lucide-react'

/**
 * Social profiles, shared by the footer and the contact page so both switch on
 * together. Give an entry a `url` and its icon appears; entries left at null are
 * skipped and the row disappears when none are set.
 *
 * Left empty deliberately — an icon pointing at a profile that does not exist
 * yet either 404s or, worse, sends guests to somebody else's account.
 */
export const SOCIAL_LINKS: { label: string; icon: LucideIcon; url: string | null }[] = [
  { label: 'Facebook', icon: Facebook, url: null },
  { label: 'X', icon: Twitter, url: null },
  { label: 'Instagram', icon: Instagram, url: null },
  { label: 'LinkedIn', icon: Linkedin, url: null },
]

/** The ones with a URL set — render from this, never the raw list. */
export function activeSocialLinks() {
  return SOCIAL_LINKS.filter((item): item is typeof item & { url: string } => Boolean(item.url))
}
