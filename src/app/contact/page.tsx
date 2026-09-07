import { Phone, Mail, MessageCircle, Clock, MapPin } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import ContactForm from './ContactForm'
import ContactArt from './ContactArt'
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
    chip: 'bg-indigo-100',
    tint: 'text-indigo-600',
    external: false,
  },
  {
    title: 'WhatsApp',
    detail: PHONE,
    note: 'Chat with us instantly',
    href: WA_LINK,
    icon: MessageCircle,
    chip: 'bg-emerald-100',
    tint: 'text-emerald-600',
    external: true,
  },
  {
    title: 'Email Us',
    detail: EMAIL,
    note: 'We reply within 24 hours',
    href: `mailto:${EMAIL}`,
    icon: Mail,
    chip: 'bg-violet-100',
    tint: 'text-violet-600',
    external: false,
  },
]

export default function ContactPage() {
  const social = activeSocialLinks()

  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      {/* Everything above the footer sits on one tinted field, so the form card
          and the channel cards read as raised out of the page rather than as
          boxes drawn on white. */}
      <main className="relative isolate overflow-hidden bg-gradient-to-b from-indigo-50/70 via-white to-indigo-50/50">
        {/* Soft corner washes — the page's only decoration, kept behind
            everything and out of the accessibility tree. */}
        <div
          className="pointer-events-none absolute -left-40 top-10 -z-10 h-96 w-96 rounded-full bg-primary-100/40 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-32 top-64 -z-10 h-[28rem] w-[28rem] rounded-full bg-violet-100/40 blur-3xl"
          aria-hidden="true"
        />

        <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pt-20">
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)]">

            {/* ── Left: the pitch and the direct channels ── */}
            <div>
              <p className="inline-flex rounded-lg bg-primary-100/80 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-primary-700">
                Get in touch
              </p>

              <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl">
                We&apos;d love to hear
                <br className="hidden sm:block" /> from <span className="text-primary-600">you</span>
              </h1>

              <p className="mt-5 max-w-md text-lg leading-relaxed text-gray-500">
                Have a question about BookQayam? Reach out — we typically respond within a few hours.
              </p>

              {/* One card per channel, left-aligned: the phone number and the
                  address are the content here, not the icon, so they get the
                  reading position rather than sitting under a centred circle. */}
              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {CHANNELS.map(({ title, detail, note, href, icon: Icon, chip, tint, external }) => (
                  <a
                    key={title}
                    href={href}
                    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
                  >
                    <span className={`flex h-12 w-12 items-center justify-center rounded-full ${chip}`}>
                      <Icon className={`h-5 w-5 ${tint}`} aria-hidden="true" />
                    </span>
                    <h2 className="mt-4 text-sm font-bold text-gray-900">{title}</h2>
                    <p className="mt-1.5 break-words text-sm font-medium text-gray-700 group-hover:text-primary-600">
                      {detail}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{note}</p>
                  </a>
                ))}
              </div>
            </div>

            {/* ── Right: the form, with the envelope drifting off its edge ── */}
            <div className="relative">
              <ContactArt className="pointer-events-none absolute -right-24 top-16 -z-10 hidden h-72 w-72 xl:block" />
              <ContactForm />
            </div>
          </div>

          {/* ── Hours and company ── */}
          <div className="mt-14 rounded-2xl bg-primary-50/70 px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white">
                    <Clock className="h-5 w-5 text-primary-600" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Business Hours</p>
                    <p className="mt-1 text-sm text-gray-500">Monday – Saturday: 10:00 am – 7:00 pm PKT</p>
                    <p className="text-sm text-gray-500">Sunday: Closed</p>
                  </div>
                </div>

                <span className="hidden h-14 w-px bg-primary-200 sm:mx-6 sm:block" aria-hidden="true" />

                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white">
                    <MapPin className="h-5 w-5 text-primary-600" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Company</p>
                    <p className="mt-1 text-sm text-gray-500">N6 Solution SMC PVT LTD</p>
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
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-400 transition-colors hover:text-primary-600"
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
