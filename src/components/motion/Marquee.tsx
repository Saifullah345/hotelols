'use client'

const ITEMS = [
  'Room Management', 'Online Bookings', 'Staff & Roles', 'Stripe Payments',
  'Revenue Analytics', 'Mobile App', 'Walk-in Payments', 'WhatsApp Bookings',
  'Guest Reviews', 'Reporting', 'Housekeeping', 'Multi-property',
]

export function Marquee() {
  const doubled = [...ITEMS, ...ITEMS]
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 z-10 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 z-10 bg-gradient-to-l from-white to-transparent" />
      <div className="flex w-max gap-3 animate-marquee">
        {doubled.map((name, i) => (
          <span
            key={i}
            className="flex-shrink-0 px-4 py-1.5 bg-gray-50 border border-gray-100 rounded-full text-sm font-medium text-gray-500"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}
