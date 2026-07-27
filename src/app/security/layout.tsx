import { pageMetadata } from '@/lib/seo'

// The security page itself is a client component, so its metadata lives here.
export const metadata = pageMetadata({
  title: 'Security — Data Protection & Platform Safeguards',
  description:
    'How BookQayam protects your data: encrypted connections, role-based access control, isolated hotel tenants, audited changes and secure payment handling.',
  path: '/security',
})

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return children
}
