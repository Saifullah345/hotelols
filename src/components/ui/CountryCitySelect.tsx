'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Country, City } from 'country-state-city'
import { ChevronDown, Search, MapPin, Building2, X } from 'lucide-react'

// ── Shared searchable dropdown ──────────────────────────────────────
interface Option { value: string; label: string; secondary?: string }

function SearchableDropdown({
  value, placeholder, options, onChange, disabled, icon: Icon,
  emptyText = 'No results',
}: {
  value: string
  placeholder: string
  options: Option[]
  onChange: (v: string) => void
  disabled?: boolean
  icon?: React.ElementType
  emptyText?: string
}) {
  const [open,   setOpen]   = useState(false)
  const [query,  setQuery]  = useState('')
  const ref   = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return options
    return options.filter(o =>
      o.label.toLowerCase().includes(q) || o.secondary?.toLowerCase().includes(q)
    )
  }, [options, query])

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 50)
  }, [open])

  const handleSelect = (v: string) => {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-2 px-3 py-2 border rounded-lg text-sm text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
          disabled
            ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
            : 'bg-white border-gray-300 hover:border-gray-400 text-gray-700'
        }`}
      >
        {Icon && <Icon className="h-4 w-4 text-gray-400 shrink-0" />}
        <span className="flex-1 truncate">
          {selected ? selected.label : <span className="text-gray-400">{placeholder}</span>}
        </span>
        {value && !disabled && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange('') }}
            className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                ref={input}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-sm text-center text-gray-400">{emptyText}</p>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`flex items-center gap-2 w-full px-4 py-2 text-sm text-left hover:bg-gray-50 transition-colors ${
                    opt.value === value ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-700'
                  }`}
                >
                  <span className="flex-1 truncate">{opt.label}</span>
                  {opt.secondary && <span className="text-xs text-gray-400 shrink-0">{opt.secondary}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Country selector ────────────────────────────────────────────────
interface CountrySelectProps {
  value: string       // ISO code e.g. "PK"
  onChange: (isoCode: string, name: string) => void
  className?: string
}

export function CountrySelect({ value, onChange, className = '' }: CountrySelectProps) {
  const countries = useMemo(() =>
    Country.getAllCountries().map(c => ({
      value: c.isoCode,
      label: `${c.flag ?? ''} ${c.name}`.trim(),
      secondary: c.isoCode,
    })), []
  )

  return (
    <div className={className}>
      <SearchableDropdown
        value={value}
        placeholder="Select country"
        options={countries}
        icon={MapPin}
        onChange={isoCode => {
          const country = Country.getCountryByCode(isoCode)
          onChange(isoCode, country?.name ?? '')
        }}
        emptyText="No country found"
      />
    </div>
  )
}

// ── City selector ───────────────────────────────────────────────────
interface CitySelectProps {
  countryCode: string   // ISO code e.g. "PK"
  value: string         // city name
  onChange: (name: string) => void
  className?: string
}

export function CitySelect({ countryCode, value, onChange, className = '' }: CitySelectProps) {
  const cities = useMemo(() => {
    if (!countryCode) return []
    const list = City.getCitiesOfCountry(countryCode) ?? []
    const seen  = new Set<string>()
    return list
      .filter(c => { if (seen.has(c.name)) return false; seen.add(c.name); return true })
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(c => ({ value: c.name, label: c.name }))
  }, [countryCode])

  return (
    <div className={className}>
      <SearchableDropdown
        value={value}
        placeholder={countryCode ? 'Select city' : 'Select country first'}
        options={cities}
        icon={Building2}
        onChange={onChange}
        disabled={!countryCode}
        emptyText="No cities found — type to search"
      />
    </div>
  )
}
