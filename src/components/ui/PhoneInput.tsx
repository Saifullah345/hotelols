'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search } from 'lucide-react'

// `digits` = exact expected digit count for the local part (after the dial code).
// 0 = no strict limit (fallback: 7–12 digits).
const COUNTRIES = [
  { flag: '🇵🇰', name: 'Pakistan',        dial: '+92',  digits: 10, placeholder: '3XX XXX XXXX'  },
  { flag: '🇦🇪', name: 'UAE',              dial: '+971', digits: 9,  placeholder: '5X XXX XXXX'   },
  { flag: '🇸🇦', name: 'Saudi Arabia',     dial: '+966', digits: 9,  placeholder: '5X XXX XXXX'   },
  { flag: '🇶🇦', name: 'Qatar',            dial: '+974', digits: 8,  placeholder: 'XXXX XXXX'     },
  { flag: '🇰🇼', name: 'Kuwait',           dial: '+965', digits: 8,  placeholder: 'XXXX XXXX'     },
  { flag: '🇧🇭', name: 'Bahrain',          dial: '+973', digits: 8,  placeholder: 'XXXX XXXX'     },
  { flag: '🇴🇲', name: 'Oman',             dial: '+968', digits: 8,  placeholder: 'XXXX XXXX'     },
  { flag: '🇮🇳', name: 'India',            dial: '+91',  digits: 10, placeholder: 'XXXXX XXXXX'   },
  { flag: '🇧🇩', name: 'Bangladesh',       dial: '+880', digits: 10, placeholder: 'XXXXX XXXXX'   },
  { flag: '🇱🇰', name: 'Sri Lanka',        dial: '+94',  digits: 9,  placeholder: 'XX XXX XXXX'   },
  { flag: '🇳🇵', name: 'Nepal',            dial: '+977', digits: 10, placeholder: 'XXXXX XXXXX'   },
  { flag: '🇬🇧', name: 'United Kingdom',   dial: '+44',  digits: 10, placeholder: 'XXXX XXX XXXX' },
  { flag: '🇺🇸', name: 'United States',    dial: '+1',   digits: 10, placeholder: 'XXX XXX XXXX'  },
  { flag: '🇨🇦', name: 'Canada',           dial: '+1',   digits: 10, placeholder: 'XXX XXX XXXX'  },
  { flag: '🇩🇪', name: 'Germany',          dial: '+49',  digits: 0,  placeholder: 'XXX XXXXXXX'   },
  { flag: '🇫🇷', name: 'France',           dial: '+33',  digits: 9,  placeholder: 'X XX XX XX XX' },
  { flag: '🇮🇹', name: 'Italy',            dial: '+39',  digits: 0,  placeholder: 'XXX XXX XXXX'  },
  { flag: '🇪🇸', name: 'Spain',            dial: '+34',  digits: 9,  placeholder: 'XXX XXX XXX'   },
  { flag: '🇳🇱', name: 'Netherlands',      dial: '+31',  digits: 9,  placeholder: 'X XXXX XXXX'   },
  { flag: '🇧🇪', name: 'Belgium',          dial: '+32',  digits: 9,  placeholder: 'XXX XX XX XX'  },
  { flag: '🇨🇭', name: 'Switzerland',      dial: '+41',  digits: 9,  placeholder: 'XX XXX XX XX'  },
  { flag: '🇦🇺', name: 'Australia',        dial: '+61',  digits: 9,  placeholder: 'X XXXX XXXX'   },
  { flag: '🇳🇿', name: 'New Zealand',      dial: '+64',  digits: 9,  placeholder: 'XX XXX XXXX'   },
  { flag: '🇸🇬', name: 'Singapore',        dial: '+65',  digits: 8,  placeholder: 'XXXX XXXX'     },
  { flag: '🇲🇾', name: 'Malaysia',         dial: '+60',  digits: 9,  placeholder: 'XX XXX XXXX'   },
  { flag: '🇮🇩', name: 'Indonesia',        dial: '+62',  digits: 0,  placeholder: 'XXX XXX XXXX'  },
  { flag: '🇵🇭', name: 'Philippines',      dial: '+63',  digits: 10, placeholder: 'XXX XXX XXXX'  },
  { flag: '🇹🇭', name: 'Thailand',         dial: '+66',  digits: 9,  placeholder: 'XX XXX XXXX'   },
  { flag: '🇻🇳', name: 'Vietnam',          dial: '+84',  digits: 9,  placeholder: 'XXX XXX XXX'   },
  { flag: '🇨🇳', name: 'China',            dial: '+86',  digits: 11, placeholder: 'XXX XXXX XXXX' },
  { flag: '🇯🇵', name: 'Japan',            dial: '+81',  digits: 10, placeholder: 'XX XXXX XXXX'  },
  { flag: '🇰🇷', name: 'South Korea',      dial: '+82',  digits: 10, placeholder: 'XX XXXX XXXX'  },
  { flag: '🇹🇷', name: 'Turkey',           dial: '+90',  digits: 10, placeholder: 'XXX XXX XXXX'  },
  { flag: '🇪🇬', name: 'Egypt',            dial: '+20',  digits: 10, placeholder: 'XX XXXX XXXX'  },
  { flag: '🇳🇬', name: 'Nigeria',          dial: '+234', digits: 10, placeholder: 'XXX XXX XXXX'  },
  { flag: '🇰🇪', name: 'Kenya',            dial: '+254', digits: 9,  placeholder: 'XXX XXX XXX'   },
  { flag: '🇿🇦', name: 'South Africa',     dial: '+27',  digits: 9,  placeholder: 'XX XXX XXXX'   },
  { flag: '🇬🇭', name: 'Ghana',            dial: '+233', digits: 9,  placeholder: 'XX XXX XXXX'   },
  { flag: '🇪🇹', name: 'Ethiopia',         dial: '+251', digits: 9,  placeholder: 'XX XXX XXXX'   },
  { flag: '🇺🇬', name: 'Uganda',           dial: '+256', digits: 9,  placeholder: 'XXX XXX XXX'   },
  { flag: '🇧🇷', name: 'Brazil',           dial: '+55',  digits: 11, placeholder: 'XX XXXXX XXXX' },
  { flag: '🇲🇽', name: 'Mexico',           dial: '+52',  digits: 10, placeholder: 'XXX XXX XXXX'  },
  { flag: '🇦🇷', name: 'Argentina',        dial: '+54',  digits: 10, placeholder: 'XXX XXX XXXX'  },
  { flag: '🇷🇺', name: 'Russia',           dial: '+7',   digits: 10, placeholder: 'XXX XXX XXXX'  },
  { flag: '🇦🇫', name: 'Afghanistan',      dial: '+93',  digits: 9,  placeholder: 'XX XXX XXXX'   },
  { flag: '🇮🇷', name: 'Iran',             dial: '+98',  digits: 10, placeholder: 'XXX XXX XXXX'  },
  { flag: '🇮🇶', name: 'Iraq',             dial: '+964', digits: 10, placeholder: 'XXX XXX XXXX'  },
  { flag: '🇯🇴', name: 'Jordan',           dial: '+962', digits: 9,  placeholder: 'X XXXX XXXX'   },
  { flag: '🇱🇧', name: 'Lebanon',          dial: '+961', digits: 8,  placeholder: 'XX XXX XXX'    },
  { flag: '🇸🇾', name: 'Syria',            dial: '+963', digits: 9,  placeholder: 'XXX XXX XXX'   },
]

function parsePhone(value: string): { dial: string; local: string } {
  if (value.startsWith('+')) {
    const match = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length)
      .find(c => value.startsWith(c.dial))
    if (match) return { dial: match.dial, local: value.slice(match.dial.length).trimStart() }
  }
  return { dial: '+92', local: value }
}

interface Props {
  value: string
  onChange: (value: string) => void
  className?: string
}

export default function PhoneInput({ value, onChange, className = '' }: Props) {
  const parsed        = parsePhone(value)
  const [dial, setDial]    = useState(parsed.dial)
  const [local, setLocal]  = useState(parsed.local)
  const [open, setOpen]    = useState(false)
  const [search, setSearch]= useState('')
  const dropRef = useRef<HTMLDivElement>(null)

  const selected    = COUNTRIES.find(c => c.dial === dial)  ?? COUNTRIES[0]
  const maxDigits   = selected.digits  // 0 = no strict limit
  const localDigits = local.replace(/\D/g, '').length

  // Live digit count validation
  const tooLong  = maxDigits > 0 && localDigits > maxDigits
  const tooShort = maxDigits > 0 && local.trim() !== '' && localDigits < maxDigits

  // Don't fire onChange on first mount — the parent already has the initial value.
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return }
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

  function handleLocalChange(raw: string) {
    // Strip disallowed chars
    const cleaned = raw.replace(/[^0-9\s\-().]/g, '')
    // Enforce max digits — allow spaces/formatting beyond digit count but not extra digits
    if (maxDigits > 0) {
      const digits = cleaned.replace(/\D/g, '')
      if (digits.length > maxDigits) return  // silently block
    }
    setLocal(cleaned)
  }

  function handleDialChange(newDial: string) {
    setDial(newDial)
    setLocal('')       // clear local when country changes
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={dropRef} className={`relative ${className}`}>
      <div className="flex">
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
          inputMode="numeric"
          value={local}
          onChange={e => handleLocalChange(e.target.value)}
          placeholder={selected.placeholder}
          className={`flex-1 min-w-0 px-3 py-2 border rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent ${
            tooLong
              ? 'border-red-400 focus:ring-red-400'
              : 'border-gray-300 focus:ring-primary-500'
          }`}
        />
      </div>

      {/* Digit count hint */}
      {maxDigits > 0 && local.trim() !== '' && (
        <p className={`text-xs mt-1 ${tooLong ? 'text-red-500' : tooShort ? 'text-amber-500' : 'text-emerald-600'}`}>
          {tooLong
            ? `Too long — ${selected.name} numbers are ${maxDigits} digits`
            : tooShort
            ? `${localDigits}/${maxDigits} digits entered`
            : `✓ ${maxDigits} digits`}
        </p>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
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
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-400 text-center">No results</p>
            )}
            {filtered.map((c, i) => (
              <button
                key={`${c.dial}-${i}`}
                type="button"
                onClick={() => handleDialChange(c.dial)}
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
