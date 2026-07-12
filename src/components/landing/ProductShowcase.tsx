'use client'

import { useState } from 'react'

const screens = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    file: '/screenshots/dashboard.png',
    desc: 'Real-time overview — revenue, occupancy, pending bookings and recent activity at a glance.',
  },
  {
    id: 'bookings',
    label: 'Bookings',
    file: '/screenshots/bookings.png',
    desc: 'All reservations in one place — filter by status, source, or date and act instantly.',
  },
  {
    id: 'rooms',
    label: 'Rooms',
    file: '/screenshots/rooms.png',
    desc: 'Track room status and pricing — switch availability with a single click.',
  },
  {
    id: 'payments',
    label: 'Payments',
    file: '/screenshots/payments.png',
    desc: 'Full payment history with revenue stats, pending amounts and one-click confirmation.',
  },
  {
    id: 'reports',
    label: 'Reports',
    file: '/screenshots/reports.png',
    desc: 'Detailed analytics — revenue breakdown, occupancy trends and booking insights.',
  },
]

export function ProductShowcase() {
  const [active, setActive] = useState('dashboard')
  const screen = screens.find(s => s.id === active)!

  return (
    <section className="py-24 px-6 bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Product Preview</p>
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
            A complete platform, right out of the box
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            From bookings to reports — everything your hotel needs, beautifully organised and ready in under an hour.
          </p>
        </div>

        {/* Tab pills */}
        <div className="flex justify-center gap-2 flex-wrap mb-10">
          {screens.map(s => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                active === s.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Browser frame */}
        <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200 ring-1 ring-black/5">
          {/* Chrome bar */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-100 border-b border-gray-200">
            <div className="flex gap-1.5 flex-shrink-0">
              <span className="w-3 h-3 rounded-full bg-red-400 block" />
              <span className="w-3 h-3 rounded-full bg-yellow-400 block" />
              <span className="w-3 h-3 rounded-full bg-green-400 block" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-white rounded-md px-4 py-1 text-xs text-gray-400 w-72 text-center">
                app.hotelos.pk/hotel-admin/{active}
              </div>
            </div>
          </div>

          {/* Screenshot */}
          <div className="w-full bg-gray-50 overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <img
              key={active}
              src={screen.file}
              alt={`HotelOS — ${screen.label}`}
              className="w-full h-full object-cover object-top"
              style={{ animation: 'fadeIn 0.25s ease' }}
            />
          </div>
        </div>

        {/* Caption */}
        <p className="text-center text-gray-500 text-sm mt-5 max-w-xl mx-auto">{screen.desc}</p>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </section>
  )
}
