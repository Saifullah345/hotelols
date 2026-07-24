'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search } from 'lucide-react'

const COUNTRIES = [
  { flag: '🇵🇰', name: 'Pakistan',        dial: '+92'  },
  { flag: '🇦🇪', name: 'UAE',              dial: '+971' },
  { flag: '🇸🇦', name: 'Saudi Arabia',     dial: '+966' },
  { flag: '🇶🇦', name: 'Qatar',            dial: '+974' },
  { flag: '🇰🇼', name: 'Kuwait',           dial: '+965' },
  { flag: '🇧🇭', name: 'Bahrain',          dial: '+973' },
  { flag: '🇴🇲', name: 'Oman',             dial: '+968' },
  { flag: '🇮🇳', name: 'India',            dial: '+91'  },
  { flag: '🇧🇩', name: 'Bangladesh',       dial: '+880' },
  { flag: '🇱🇰', name: 'Sri Lanka',        dial: '+94'  },
  { flag: '🇳🇵', name: 'Nepal',            dial: '+977' },
  { flag: '🇬🇧', name: 'United Kingdom',   dial: '+44'  },
  { flag: '🇺🇸', name: 'United States',    dial: '+1'   },
  { flag: '🇨🇦', name: 'Canada',           dial: '+1'   },
  { flag: '🇩🇪', name: 'Germany',          dial: '+49'  },
  { flag: '🇫🇷', name: 'France',           dial: '+33'  },
  { flag: '🇮🇹', name: 'Italy',            dial: '+39'  },
  { flag: '🇪🇸', name: 'Spain',            dial: '+34'  },
  { flag: '🇳🇱', name: 'Netherlands',      dial: '+31'  },
  { flag: '🇧🇪', name: 'Belgium',          dial: '+32'  },
  { flag: '🇨🇭', name: 'Switzerland',      dial: '+41'  },
  { flag: '🇦🇺', name: 'Australia',        dial: '+61'  },
  { flag: '🇳🇿', name: 'New Zealand',      dial: '+64'  },
  { flag: '🇸🇬', name: 'Singapore',        dial: '+65'  },
  { flag: '🇲🇾', name: 'Malaysia',         dial: '+60'  },
  { flag: '🇮🇩', name: 'Indonesia',        dial: '+62'  },
  { flag: '🇵🇭', name: 'Philippines',      dial: '+63'  },
  { flag: '🇹🇭', name: 'Thailand',         dial: '+66'  },
  { flag: '🇻🇳', name: 'Vietnam',          dial: '+84'  },
  { flag: '🇨🇳', name: 'China',            dial: '+86'  },
  { flag: '🇯🇵', name: 'Japan',            dial: '+81'  },
  { flag: '🇰🇷', name: 'South Korea',      dial: '+82'  },
  { flag: '🇹🇷', name: 'Turkey',           dial: '+90'  },
  { flag: '🇪🇬', name: 'Egypt',            dial: '+20'  },
  { flag: '🇳🇬', name: 'Nigeria',          dial: '+234' },
  { flag: '🇰🇪', name: 'Kenya',            dial: '+254' },
  { flag: '🇿🇦', name: 'South Africa',     dial: '+27'  },
  { flag: '🇬🇭', name: 'Ghana',            dial: '+233' },
  { flag: '🇪🇹', name: 'Ethiopia',         dial: '+251' },
  { flag: '🇺🇬', name: 'Uganda',           dial: '+256' },
  { flag: '🇧🇷', name: 'Brazil',           dial: '+55'  },
  { flag: '🇲🇽', name: 'Mexico',           dial: '+52'  },
  { flag: '🇦🇷', name: 'Argentina',        dial: '+54'  },
  { flag: '🇷🇺', name: 'Russia',           dial: '+7'   },
  { flag: '🇦🇫', name: 'Afghanistan',      dial: '+93'  },
  { flag: '🇮🇷', name: 'Iran',             dial: '+98'  },
  { flag: '🇮🇶', name: 'Iraq',             dial: '+964' },
  { flag: '🇯🇴', name: 'Jordan',           dial: '+962' },
  { flag: '🇱🇧', name: 'Lebanon',          dial: '+961' },
  { flag: '🇸🇾', name: 'Syria',            dial: '+963' },
]

function parsePhone(value: string): { dial: string; local: string } {
  if (value.startsWith('+')) {
    const match = COUNTRIES.sort((a, b) => b.dial.length - a.dial.length)
      .find(c => value.startsWith(c.dial))
    if (match) return { dial: match.dial, local: value.slice(match.dial.length).trimStart() }
  }
  return { dial: '+92', local: value }
}

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function PhoneInput({ value, onChange, placeholder = '3XX XXX XXXX', className = '' }: Props) {
  const parsed        = parsePhone(value)
  const [dial, setDial]    = useState(parsed.dial)
  const [local, setLocal]  = useState(parsed.local)
  const [open, setOpen]    = useState(false)
  const [search, setSearch]= useState('')
  const dropRef = useRef<HTMLDivElement>(null)

  // Sync outward
  useEffect(() => {
    onChange(local ? `${dial} ${local}` : '')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dial, local])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false); setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = COUNTRIES.filter(
    c => c.name.toLowerCase().includes(search.toLowerCase()) || c.dial.includes(search)
  )

  const selected = COUNTRIES.find(c => c.dial === dial) ?? COUNTRIES[0]

  return (
    <div ref={dropRef} className={`relative flex ${className}`}>
      {/* Country code button */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch('') }}
        className="flex items-center gap-1.5 px-3 py-2 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700 shrink-0 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:z-10"
      >
        <span className="text-base leading-none">{selected.flag}</span>
        <span className="text-gray-600">{dial}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Local number */}
      <input
        type="tel"
        inputMode="tel"
        value={local}
        onChange={e => setLocal(e.target.value.replace(/[^0-9\s\-().]/g, ''))}
        placeholder={placeholder}
        maxLength={15}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search country…"
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-400 text-center">No results</p>
            )}
            {filtered.map((c, i) => (
              <button
                key={`${c.dial}-${i}`}
                type="button"
                onClick={() => { setDial(c.dial); setOpen(false); setSearch('') }}
                className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors ${
                  c.dial === dial && c.name === selected.name ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
                }`}
              >
                <span className="text-base leading-none w-6 text-center">{c.flag}</span>
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-gray-400 text-xs">{c.dial}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
