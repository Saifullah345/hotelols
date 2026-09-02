import { Phone, Mail, MessageCircle, Clock, MapPin } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import ContactForm from './ContactForm'
import { activeSocialLinks } from '@/lib/social'
import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'Contact BookQayam — Sales, Support & Hotel Onboarding Help',
  description:
    'Talk to the BookQayam team about listing your hotel, pricing, demos or booking support. Reach us by phone, WhatsApp or email — we reply the same day.',
  path: '/contact',
})

const PHONE   = '+92 325 5258421'
const WA_LINK = 'https://wa.me/923255258421'
const EMAIL   = 'sales@n6solution.com'

const CHANNELS = [
  {
    title: 'Call us',
    detail: PHONE,
    note: 'Mon – Sat, 10 am – 7 pm',
    href: `tel:${PHONE.replace(/\s/g, '')}`,
    icon: Phone,
    ring: 'from-indigo-100 to-indigo-200',
    tint: 'text-indigo-600',
    external: false,
  },
  {
    title: 'WhatsApp',
    detail: PHONE,
    note: 'Chat with us instantly',
    href: WA_LINK,
    icon: MessageCircle,
    ring: 'from-green-100 to-emerald-200',
    tint: 'text-green-600',
    external: true,
  },
  {
    title: 'Email Us',
    detail: EMAIL,
    note: 'We reply within 24 hours',
    href: `mailto:${EMAIL}`,
    icon: Mail,
    ring: 'from-purple-100 to-violet-200',
    tint: 'text-purple-600',
    external: false,
  },
]

export default function ContactPage() {
  const social = activeSocialLinks()

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* Hero */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-6 pt-16 pb-10 text-center lg:pt-20">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-indigo-600">Get in touch</p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl">
            We&apos;d love to hear from you
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-gray-500">
            Have a question about BookQayam? Reach out — we typically respond within a few hours.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 pb-16">
        {/* Channels beside the form, as two halves of one row */}
        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_1fr]">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {CHANNELS.map(({ title, detail, note, href, icon: Icon, ring, tint, external }) => (
              <a
                key={title}
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="group flex flex-col items-center text-center"
              >
                <span
                  className={`flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${ring} shadow-sm transition-transform duration-200 group-hover:-translate-y-1`}
                >
                  <Icon className={`h-9 w-9 ${tint}`} aria-hidden="true" />
                </span>
                <h2 className="mt-5 font-bold text-gray-900">{title}</h2>
                <p className="mt-1 break-all text-sm font-medium text-gray-700 group-hover:text-indigo-600">
                  {detail}
                </p>
                <p className="mt-1 text-xs text-gray-400">{note}</p>
              </a>
            ))}
          </div>

          <ContactForm />
        </div>

        {/* Info strip */}
        <div className="mt-12 rounded-2xl border border-gray-100 bg-gray-50 px-6 py-5">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-6 sm:flex-row sm:gap-12">
              <div className="flex items-start gap-4">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white">
                  <Clock className="h-4 w-4 text-gray-500" aria-hidden="true" />
                </span>
                <div>
                  <p className="mb-1 text-sm font-semibold text-gray-900">Business Hours</p>
                  <p className="text-sm text-gray-500">Monday – Saturday: 10:00 am – 7:00 pm PKT</p>
                  <p className="text-sm text-gray-500">Sunday: Closed</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white">
                  <MapPin className="h-4 w-4 text-gray-500" aria-hidden="true" />
                </span>
                <div>
                  <p className="mb-1 text-sm font-semibold text-gray-900">Company</p>
                  <p className="text-sm text-gray-500">N6 Solution SMC PVT LTD</p>
                  <p className="text-sm text-gray-500">Pakistan</p>
                </div>
              </div>
            </div>

            {social.length > 0 && (
              <div className="flex items-center gap-2">
                {social.map(({ label, icon: Icon, url }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition-colors hover:text-gray-900"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
