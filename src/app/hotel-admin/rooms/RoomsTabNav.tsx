'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BedDouble, Tag, Layers } from 'lucide-react'

const TABS = [
  { href: '/hotel-admin/rooms',        label: 'Rooms',       icon: BedDouble, exact: true  },
  { href: '/hotel-admin/rooms/types',  label: 'Room Types',  icon: Tag,       exact: false },
  { href: '/hotel-admin/rooms/floors', label: 'Floors',      icon: Layers,    exact: false },
]

export default function RoomsTabNav() {
  const path = usePathname()
  return (
    <div className="flex gap-0 border-b border-gray-200">
      {TABS.map(tab => {
        const active = tab.exact ? path === tab.href : path.startsWith(tab.href)
        const Icon   = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              active
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
