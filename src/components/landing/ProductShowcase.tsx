'use client'

import { useState } from 'react'

const screens = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    file: '/screenshots/dashboard.png',
    desc: 'Real-time overview — revenue, occupancy, pending bookings and recent activity at a glance.',
    color: 'from-blue-50 to-indigo-50',
    accent: 'bg-blue-600',
  },
  {
    id: 'bookings',
    label: 'Bookings',
    file: '/screenshots/bookings.png',
    desc: 'All reservations in one place — filter by status, source, or date and act instantly.',
    color: 'from-purple-50 to-blue-50',
    accent: 'bg-purple-600',
  },
  {
    id: 'rooms',
    label: 'Rooms',
    file: '/screenshots/rooms.png',
    desc: 'Track room status and pricing — switch availability with a single click.',
    color: 'from-green-50 to-teal-50',
    accent: 'bg-green-600',
  },
  {
    id: 'payments',
    label: 'Payments',
    file: '/screenshots/payments.png',
    desc: 'Full payment history with revenue stats, pending amounts and one-click confirmation.',
    color: 'from-amber-50 to-orange-50',
    accent: 'bg-amber-600',
  },
  {
    id: 'reports',
    label: 'Reports',
    file: '/screenshots/reports.png',
    desc: 'Detailed analytics — revenue breakdown, occupancy trends and booking insights.',
    color: 'from-rose-50 to-pink-50',
    accent: 'bg-rose-600',
  },
]

function MockUI({ screen }: { screen: typeof screens[0] }) {
  return (
    <div className={`w-full h-full bg-gradient-to-br ${screen.color} flex flex-col`}>
      {/* Sidebar + main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-16 md:w-44 bg-white border-r border-gray-100 flex-shrink-0 flex flex-col py-4 gap-1 px-2">
          <div className="flex items-center gap-2 mb-4 px-1">
            <div className={`w-6 h-6 md:w-8 md:h-8 rounded-lg ${screen.accent} flex-shrink-0`} />
            <div className="hidden md:block">
              <div className="h-2.5 bg-gray-900 rounded w-16 mb-1" />
              <div className="h-2 bg-gray-300 rounded w-12" />
            </div>
          </div>
          {['Dashboard','Rooms','Bookings','WhatsApp','Staff','Reports','Reviews','Payments','Settings'].map((item, i) => (
            <div key={item} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${item === screen.label ? `${screen.accent} text-white` : 'text-gray-400'}`}>
              <div className={`w-3 h-3 rounded flex-shrink-0 ${item === screen.label ? 'bg-white/50' : 'bg-gray-200'}`} />
              <span className="hidden md:block text-xs font-medium truncate">{item}</span>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="h-10 bg-white border-b border-gray-100 flex items-center px-4 gap-3">
            <div className="h-3 bg-gray-700 rounded w-24 font-bold" />
            <div className="flex-1" />
            <div className="w-5 h-5 rounded-full bg-gray-200" />
            <div className="w-16 h-5 rounded-full bg-gray-200" />
          </div>

          {/* Page content */}
          <div className="flex-1 p-4 overflow-hidden">
            {screen.id === 'dashboard' && <DashboardMock accent={screen.accent} />}
            {screen.id === 'rooms' && <RoomsMock accent={screen.accent} />}
            {screen.id === 'bookings' && <BookingsMock accent={screen.accent} />}
            {screen.id === 'payments' && <PaymentsMock accent={screen.accent} />}
            {screen.id === 'reports' && <ReportsMock accent={screen.accent} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function DashboardMock({ accent }: { accent: string }) {
  return (
    <div className="space-y-3 h-full">
      <div className="grid grid-cols-4 gap-3">
        {['Total Rooms','Available','Bookings','Revenue'].map((label, i) => (
          <div key={label} className="bg-white rounded-xl p-3 shadow-sm">
            <div className="h-2 bg-gray-200 rounded w-16 mb-2" />
            <div className={`h-5 rounded w-10 ${i === 3 ? accent : 'bg-gray-800'}`} style={i === 3 ? {} : { background: '#1f2937' }} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3" style={{ height: 'calc(100% - 80px)' }}>
        <div className="col-span-2 bg-white rounded-xl p-3 shadow-sm flex flex-col">
          <div className="h-2.5 bg-gray-800 rounded w-28 mb-3" />
          <div className="flex-1 flex items-end gap-1.5 pb-2">
            {[15,25,20,35,55,80,65,90,75,95,110,130].map((h, i) => (
              <div key={i} className={`flex-1 rounded-t-sm ${accent}`} style={{ height: `${h * 0.6}%`, opacity: 0.7 + i * 0.02 }} />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <div className="h-2.5 bg-gray-800 rounded w-24 mb-3" />
          <div className="space-y-2.5">
            {[['Check-ins Today','text-green-600','0'],['Pending Bookings','text-orange-500','1'],['Occupancy Rate','text-blue-600','25%']].map(([label, cls, val]) => (
              <div key={label as string} className="flex justify-between items-center">
                <div className="h-2 bg-gray-200 rounded w-20" />
                <span className={`text-xs font-bold ${cls}`}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function RoomsMock({ accent }: { accent: string }) {
  const statuses = ['available','available','cleaning','available']
  const colors: Record<string,string> = { available:'bg-green-100 text-green-700', cleaning:'bg-yellow-100 text-yellow-700', booked:'bg-blue-100 text-blue-700' }
  return (
    <div className="space-y-3 h-full">
      <div className="grid grid-cols-3 gap-3">
        {[['3','Available','bg-green-50 text-green-700 border-green-200'],['0','Occupied','bg-blue-50 text-blue-700 border-blue-200'],['0','Maintenance','bg-red-50 text-red-700 border-red-200']].map(([n,l,c]) => (
          <div key={l as string} className={`rounded-xl border p-3 text-center ${c}`}>
            <p className="text-xl font-bold">{n}</p>
            <p className="text-xs font-medium">{l}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-6 gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
          {['ROOM','TYPE','FLOOR','CAPACITY','PRICE/NIGHT','STATUS'].map(h => (
            <div key={h} className="h-2 bg-gray-300 rounded text-xs" />
          ))}
        </div>
        {[['Room 1','Standard','Floor 1','2 guests','Rs 200','available'],['Room 230','Standard','Floor 2','2 guests','Rs 2,000','available'],['Room 298','Suite','Floor 41','6 guests','Rs 722','available'],['Room 870','Suite','Floor 18','6 guests','Rs 711','cleaning']].map(([room,,,,price,status]) => (
          <div key={room as string} className="grid grid-cols-6 gap-2 px-3 py-2 border-b border-gray-50 items-center">
            <div className="h-2 bg-gray-700 rounded w-14" />
            <div className="h-2 bg-gray-200 rounded w-16" />
            <div className="h-2 bg-gray-200 rounded w-10" />
            <div className="h-2 bg-gray-200 rounded w-12" />
            <div className="h-2 bg-gray-600 rounded w-12" />
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${colors[status as string] ?? 'bg-gray-100 text-gray-600'}`}>{status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BookingsMock({ accent }: { accent: string }) {
  const statuses = [['cancelled','bg-red-100 text-red-700'],['checked out','bg-gray-100 text-gray-700'],['confirmed','bg-blue-100 text-blue-700'],['pending','bg-yellow-100 text-yellow-700']]
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {['All','pending','confirmed','checked in','checked out','cancelled'].map((t, i) => (
          <div key={t} className={`px-3 py-1 rounded-lg text-xs font-medium ${i === 0 ? `${accent} text-white` : 'bg-white text-gray-500 border border-gray-200'}`}>{t}</div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 px-3 py-2 bg-gray-50 border-b border-gray-100 gap-2">
          {['GUEST','ROOM','CHECK-IN','CHECK-OUT','SOURCE','AMOUNT','STATUS'].map(h => (
            <div key={h} className="h-2 bg-gray-300 rounded" />
          ))}
        </div>
        {statuses.map(([status, cls], i) => (
          <div key={i} className="grid grid-cols-7 px-3 py-2.5 border-b border-gray-50 gap-2 items-center">
            <div className="space-y-1"><div className="h-2 bg-gray-700 rounded w-20" /><div className="h-1.5 bg-gray-200 rounded w-16" /></div>
            <div className="h-2 bg-gray-300 rounded w-12" />
            <div className="h-2 bg-gray-300 rounded w-14" />
            <div className="h-2 bg-gray-300 rounded w-14" />
            <div className="h-2 bg-purple-200 rounded w-12" />
            <div className="h-2 bg-gray-600 rounded w-12" />
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${cls}`}>{status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PaymentsMock({ accent }: { accent: string }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {[['Total Revenue','Rs 3,044','text-green-700'],['Pending Amount','Rs 4,711','text-orange-600'],['Transactions','5','text-gray-900']].map(([label,val,cls]) => (
          <div key={label as string} className="bg-white rounded-xl p-3 shadow-sm">
            <div className="h-2 bg-gray-200 rounded w-20 mb-2" />
            <p className={`text-sm font-bold ${cls}`}>{val}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-6 px-3 py-2 bg-gray-50 border-b border-gray-100 gap-2">
          {['INVOICE','GUEST','AMOUNT','METHOD','STATUS','DATE'].map(h => (
            <div key={h} className="h-2 bg-gray-300 rounded" />
          ))}
        </div>
        {[['pending','bg-yellow-100 text-yellow-700'],['completed','bg-green-100 text-green-700'],['completed','bg-green-100 text-green-700'],['pending','bg-yellow-100 text-yellow-700']].map(([s, cls], i) => (
          <div key={i} className="grid grid-cols-6 px-3 py-2.5 border-b border-gray-50 gap-2 items-center">
            <div className="h-1.5 bg-gray-200 rounded font-mono w-20" />
            <div className="h-2 bg-gray-600 rounded w-16" />
            <div className="h-2 bg-gray-700 rounded w-12" />
            <div className="h-2 bg-gray-200 rounded w-12" />
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${cls}`}>{s}</span>
            <div className="h-2 bg-gray-200 rounded w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ReportsMock({ accent }: { accent: string }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        {[['Total Revenue','$','text-green-600'],['Total Bookings','8','text-gray-900'],['Occupancy','25%','text-blue-600'],['Avg Rating','4.0 ★','text-amber-500']].map(([label,val,cls]) => (
          <div key={label as string} className="bg-white rounded-xl p-3 shadow-sm">
            <div className="h-2 bg-gray-200 rounded w-20 mb-2" />
            <p className={`text-sm font-bold ${cls}`}>{val}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl p-3 shadow-sm">
        <div className="h-2.5 bg-gray-700 rounded w-28 mb-3" />
        <div className="flex items-end gap-1 h-24 pb-2">
          {[5,8,12,6,10,18,15,25,30,45,70,90].map((h, i) => (
            <div key={i} className={`flex-1 rounded-t-sm ${accent}`} style={{ height: `${h}%`, opacity: 0.6 + i * 0.035 }} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <div className="h-2.5 bg-gray-700 rounded w-32 mb-2" />
          {['Available','Booked','Maintenance'].map((s,i) => (
            <div key={s} className="flex items-center gap-2 mb-1.5">
              <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${accent}`} style={{ width: `${[75,15,10][i]}%` }} />
              </div>
              <span className="text-xs text-gray-400 w-8">{[75,15,10][i]}%</span>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <div className="h-2.5 bg-gray-700 rounded w-28 mb-2" />
          {['This Month','Last Month','This Year','Avg/Booking'].map(l => (
            <div key={l} className="flex justify-between items-center mb-1.5">
              <div className="h-2 bg-gray-200 rounded w-16" />
              <div className="h-2 bg-gray-600 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ProductShowcase() {
  const [active, setActive] = useState('dashboard')
  const [imgError, setImgError] = useState<Record<string, boolean>>({})
  const screen = screens.find(s => s.id === active)!
  const hasImage = !imgError[active]

  return (
    <section className="py-24 px-6 bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto">
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

        {/* Screenshot — real image (already has browser chrome baked in) */}
        {hasImage ? (
          <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5"
            style={{ animation: 'fadeIn 0.25s ease' }}>
            <img
              key={active}
              src={screen.file}
              alt={`HotelOS — ${screen.label}`}
              className="w-full block"
              onError={() => setImgError(prev => ({ ...prev, [active]: true }))}
            />
          </div>
        ) : (
          /* Mockup fallback — show browser chrome only here */
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200 ring-1 ring-black/5"
            style={{ animation: 'fadeIn 0.25s ease' }}>
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-100 border-b border-gray-200">
              <div className="flex gap-1.5 flex-shrink-0">
                <span className="w-3 h-3 rounded-full bg-red-400 block" />
                <span className="w-3 h-3 rounded-full bg-yellow-400 block" />
                <span className="w-3 h-3 rounded-full bg-green-400 block" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-white rounded-md px-4 py-1.5 text-xs text-gray-400 w-72 text-center">
                  app.hotelos.pk/hotel-admin/{active}
                </div>
              </div>
            </div>
            <div className="w-full overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <MockUI screen={screen} />
            </div>
          </div>
        )}

        <p className="text-center text-gray-500 text-sm mt-5 max-w-xl mx-auto">{screen.desc}</p>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </section>
  )
}
