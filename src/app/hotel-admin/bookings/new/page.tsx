'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient, getBrowserUser } from '@/lib/supabase/client'
import {
  Loader2, ArrowLeft, Search, User, BedDouble,
  MessageCircle, Phone, DoorOpen, Globe,
  Banknote, CreditCard, Building2, FileText, HelpCircle,
  CheckCircle, Users, Check, CalendarDays, AlertTriangle,
  SlidersHorizontal, X, ChevronUp, ArrowUpDown, Star,
} from 'lucide-react'
import Link from 'next/link'
import PhoneInput from '@/components/ui/PhoneInput'
import type { BookingSource } from '@/types'
import { formatCurrency } from '@/lib/currency'
import { phoneSchema, nameSchema } from '@/lib/validation'

// ─── Schemas ─────────────────────────────────────────────────────────────────
const dateRefineMsg = { message: 'Check-out must be after check-in', path: ['check_out'] }

const onlineSchema = z.object({
  guest_email:      z.string().email('Valid email required'),
  check_in:         z.string().min(1, 'Check-in date required'),
  check_out:        z.string().min(1, 'Check-out date required'),
  adults:           z.coerce.number().min(1, 'At least 1 adult'),
  children:         z.coerce.number().min(0),
  special_requests: z.string().optional(),
  status:           z.enum(['pending', 'confirmed']),
}).refine(d => new Date(d.check_out) > new Date(d.check_in), dateRefineMsg)

const offlineSchema = z.object({
  guest_name:       nameSchema,
  guest_phone:      phoneSchema,
  check_in:         z.string().min(1, 'Check-in date required'),
  check_out:        z.string().min(1, 'Check-out date required'),
  adults:           z.coerce.number().min(1, 'At least 1 adult'),
  children:         z.coerce.number().min(0),
  special_requests: z.string().optional(),
  status:           z.enum(['pending', 'confirmed']),
}).refine(d => new Date(d.check_out) > new Date(d.check_in), dateRefineMsg)

type OnlineForm  = z.infer<typeof onlineSchema>
type OfflineForm = z.infer<typeof offlineSchema>

type Room = {
  id: string
  room_number: string
  name?: string
  floor: number
  price_per_night: number
  max_adults: number
  max_children: number
  capacity: number
  room_type: { name: string } | null
}
type GuestProfile = { id: string; full_name: string; email: string }

// ─── Config ──────────────────────────────────────────────────────────────────
const SOURCES: { value: BookingSource; label: string; icon: React.ElementType; color: string; activeClass: string }[] = [
  { value: 'walk_in',  label: 'Walk-in',  icon: DoorOpen,      color: 'text-orange-600', activeClass: 'border-orange-400 bg-orange-50 text-orange-700' },
  { value: 'phone',    label: 'Phone',    icon: Phone,         color: 'text-blue-600',   activeClass: 'border-blue-400 bg-blue-50 text-blue-700'   },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600',  activeClass: 'border-green-400 bg-green-50 text-green-700'  },
  { value: 'online',   label: 'Online',   icon: Globe,         color: 'text-purple-600', activeClass: 'border-purple-400 bg-purple-50 text-purple-700' },
]

const PAY_METHODS: { value: string; label: string; icon: React.ElementType }[] = [
  { value: 'cash',          label: 'Cash',          icon: Banknote   },
  { value: 'card_pos',      label: 'Card (POS)',    icon: CreditCard },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: Building2  },
  { value: 'cheque',        label: 'Cheque',        icon: FileText   },
  { value: 'other',         label: 'Other',         icon: HelpCircle },
]

type SortOption = 'default' | 'price_asc' | 'price_desc' | 'floor_asc'

// ─── Payment Block ────────────────────────────────────────────────────────────
function PaymentBlock({
  totalAmount, currency, nights, source,
  payMethod, setPayMethod,
  payNow, setPayNow,
  isAdvance, setIsAdvance,
  advanceAmount, setAdvanceAmount,
  payNotes, setPayNotes,
}: {
  totalAmount: number; currency: string; nights: number; source: string
  payMethod: string; setPayMethod: (v: string) => void
  payNow: boolean; setPayNow: (v: boolean) => void
  isAdvance: boolean; setIsAdvance: (v: boolean) => void
  advanceAmount: string; setAdvanceAmount: (v: string) => void
  payNotes: string; setPayNotes: (v: string) => void
}) {
  const advanceValue = Number(advanceAmount)

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Payment Method</label>
        <div className="grid grid-cols-5 gap-2">
          {PAY_METHODS.map(m => {
            const Icon = m.icon
            const active = payMethod === m.value
            return (
              <button key={m.value} type="button" onClick={() => setPayMethod(m.value)}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all text-xs font-medium ${
                  active ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                }`}>
                <Icon className="h-4 w-4" />
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="label">Collection Status</label>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setPayNow(true)}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
              payNow ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 bg-white hover:border-gray-300'
            }`}>
            <CheckCircle className="h-4 w-4" /> Paid Now
          </button>
          <button type="button" onClick={() => setPayNow(false)}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
              !payNow ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-500 bg-white hover:border-gray-300'
            }`}>
            <AlertTriangle className="h-4 w-4" /> Pay Later
          </button>
        </div>
      </div>

      {payNow && (
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
            <input type="checkbox" checked={isAdvance}
              onChange={e => { setIsAdvance(e.target.checked); if (!e.target.checked) setAdvanceAmount('') }}
              className="rounded border-gray-300" />
            Collect advance deposit instead of full amount
          </label>
          {isAdvance && (
            totalAmount > 0 ? (
              <div className="mt-2">
                <input type="number" min={0.01} max={totalAmount} step="0.01"
                  value={advanceAmount} onChange={e => setAdvanceAmount(e.target.value)}
                  className="input" placeholder={`Up to ${formatCurrency(totalAmount, currency)}`} />
                <p className="text-xs text-gray-400 mt-1">
                  Remaining {formatCurrency(Math.max(totalAmount - (advanceValue || 0), 0), currency)} collected later.
                </p>
              </div>
            ) : (
              <p className="text-xs text-amber-600 mt-2">Select rooms and dates first.</p>
            )
          )}
        </div>
      )}

      <div>
        <label className="label">Reference / Notes <span className="text-gray-400 font-normal">(optional)</span></label>
        <input value={payNotes} onChange={e => setPayNotes(e.target.value)}
          className="input" placeholder="Cheque no., transfer ref, receipt number…" />
      </div>

      {payNow && nights > 0 && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            {formatCurrency(isAdvance ? (advanceValue || 0) : totalAmount, currency)} via {PAY_METHODS.find(m => m.value === payMethod)?.label}
            {isAdvance && ` (advance — ${formatCurrency(Math.max(totalAmount - (advanceValue || 0), 0), currency)} due later)`}
            {payNotes && ` · Ref: ${payNotes}`}
          </span>
        </div>
      )}
      {!payNow && source === 'walk_in' && (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Advance required for walk-in bookings</p>
            <p className="text-xs text-red-600 mt-0.5">The guest is present — collect an advance now to confirm.</p>
          </div>
        </div>
      )}
      {!payNow && source !== 'walk_in' && (
        <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-700">Booking will be Pending</p>
            <p className="text-xs text-amber-600 mt-0.5">Confirm after the guest transfers the advance.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Room Picker ──────────────────────────────────────────────────────────────
function RoomPicker({
  rooms, selectedRoomIds, unavailableRoomIds, datesChosen, currency, nights, totalAmount, onToggle, checkingAvailability,
}: {
  rooms: Room[]
  selectedRoomIds: string[]
  unavailableRoomIds: Set<string>
  datesChosen: boolean
  currency: string
  nights: number
  totalAmount: number
  onToggle: (id: string) => void
  checkingAvailability: boolean
}) {
  const [q,             setQ]             = useState('')
  const [typeFilter,    setTypeFilter]    = useState('all')
  const [floorFilter,   setFloorFilter]   = useState('all')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [sortBy,        setSortBy]        = useState<SortOption>('default')

  // Derived filter options from the rooms list
  const roomTypes = Array.from(new Set(rooms.map(r => r.room_type?.name).filter(Boolean) as string[]))
  const floors    = Array.from(new Set(rooms.map(r => r.floor))).sort((a, b) => a - b)
  const floorLabel = (f: number) => f === 0 ? 'Ground' : `Floor ${f}`

  const hasFilters = q || typeFilter !== 'all' || floorFilter !== 'all' || availableOnly || sortBy !== 'default'

  const clearFilters = () => {
    setQ(''); setTypeFilter('all'); setFloorFilter('all'); setAvailableOnly(false); setSortBy('default')
  }

  const filtered = rooms
    .filter(r => {
      const lq = q.toLowerCase()
      if (lq && !(r.name ?? '').toLowerCase().includes(lq) && !r.room_number.toLowerCase().includes(lq) && !(r.room_type?.name ?? '').toLowerCase().includes(lq)) return false
      if (typeFilter  !== 'all' && r.room_type?.name !== typeFilter)  return false
      if (floorFilter !== 'all' && String(r.floor) !== floorFilter)  return false
      if (availableOnly && unavailableRoomIds.has(r.id))             return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc')  return a.price_per_night - b.price_per_night
      if (sortBy === 'price_desc') return b.price_per_night - a.price_per_night
      if (sortBy === 'floor_asc')  return a.floor - b.floor
      return 0
    })

  const availableCount = rooms.filter(r => !unavailableRoomIds.has(r.id)).length

  return (
    <div className="space-y-3">
      {/* Status row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {checkingAvailability ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
              <Loader2 className="h-3 w-3 animate-spin" /> Checking…
            </span>
          ) : datesChosen && unavailableRoomIds.size > 0 ? (
            <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {availableCount} of {rooms.length} available
            </span>
          ) : datesChosen ? (
            <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              All {rooms.length} rooms available
            </span>
          ) : null}
        </div>
        {selectedRoomIds.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-200">
            <Check className="h-3 w-3" /> {selectedRoomIds.length} room{selectedRoomIds.length > 1 ? 's' : ''} selected
          </span>
        )}
      </div>

      {/* Date pick prompt */}
      {!datesChosen && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
          Pick check-in and check-out dates above to see real-time availability.
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name, number or type…"
          className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        />
        {q && (
          <button onClick={() => setQ('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="space-y-2">
        {/* Room type chips */}
        {roomTypes.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-8">Type</span>
            {['all', ...roomTypes].map(t => (
              <button key={t} type="button" onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                  typeFilter === t
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}>
                {t === 'all' ? 'All types' : t}
              </button>
            ))}
          </div>
        )}

        {/* Floor chips */}
        {floors.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-8">Floor</span>
            {['all', ...floors.map(String)].map(f => (
              <button key={f} type="button" onClick={() => setFloorFilter(f)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                  floorFilter === f
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}>
                {f === 'all' ? 'All floors' : floorLabel(Number(f))}
              </button>
            ))}
          </div>
        )}

        {/* Sort + available-only row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {/* Available only toggle */}
            {datesChosen && (
              <button type="button" onClick={() => setAvailableOnly(v => !v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  availableOnly
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}>
                <Check className="h-3 w-3" /> Available only
              </button>
            )}

            {/* Clear filters */}
            {hasFilters && (
              <button type="button" onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3 w-3 text-gray-400" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}
              className="text-xs border border-gray-200 rounded-lg py-1 pl-1.5 pr-6 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-500">
              <option value="default">Default order</option>
              <option value="price_asc">Price: low → high</option>
              <option value="price_desc">Price: high → low</option>
              <option value="floor_asc">Floor: low → high</option>
            </select>
          </div>
        </div>
      </div>

      {/* Room list */}
      {filtered.length === 0 ? (
        <div className="py-8 text-center">
          <SlidersHorizontal className="h-8 w-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">
            {rooms.length === 0 ? 'No rooms configured yet' : 'No rooms match your filters'}
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="mt-2 text-xs text-primary-600 hover:underline">Clear filters</button>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 -mr-1">
          {filtered.map(r => {
            const unavailable = unavailableRoomIds.has(r.id)
            const selected    = selectedRoomIds.includes(r.id)
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onToggle(r.id)}
                disabled={unavailable}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  unavailable
                    ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                    : selected
                    ? 'border-primary-400 bg-primary-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {/* Checkbox */}
                <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                  selected ? 'bg-primary-600 border-primary-600' : 'border-gray-300 bg-white'
                }`}>
                  {selected && <Check className="h-3 w-3 text-white" />}
                </div>

                {/* Room icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  selected ? 'bg-primary-100' : 'bg-gray-100'
                }`}>
                  <BedDouble className={`h-4 w-4 ${selected ? 'text-primary-600' : 'text-gray-400'}`} />
                </div>

                {/* Room info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-sm text-gray-900">{r.name ?? `Room ${r.room_number}`}</span>
                    <span className="text-xs text-gray-400">#{r.room_number}</span>
                    {r.room_type?.name && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded-md font-semibold uppercase tracking-wide">{r.room_type.name}</span>
                    )}
                    {unavailable && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-600 rounded-md font-semibold">Booked</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400">
                    <span>{floorLabel(r.floor)}</span>
                    <span className="flex items-center gap-0.5">
                      <Users className="h-2.5 w-2.5" />{r.max_adults}A · {r.max_children}C
                    </span>
                    {nights > 0 && (
                      <span className="text-gray-300">·</span>
                    )}
                    {nights > 0 && (
                      <span className="text-emerald-600 font-medium">{formatCurrency(r.price_per_night * nights, currency)} total</span>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(r.price_per_night, currency)}</p>
                  <p className="text-[10px] text-gray-400">/night</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Selected summary */}
      {selectedRoomIds.length > 0 && nights > 0 && (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500">Selected rooms · {nights} night{nights !== 1 ? 's' : ''}</p>
          </div>
          <div className="divide-y divide-gray-50">
            {selectedRoomIds.map(id => {
              const room = rooms.find(r => r.id === id)
              if (!room) return null
              return (
                <div key={id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <BedDouble className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-gray-700">{room.name ?? `Room ${room.room_number}`}</span>
                  </div>
                  <span className="text-gray-600 font-medium">{formatCurrency(room.price_per_night * nights, currency)}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border-t border-gray-100">
            <span className="text-sm font-bold text-gray-900">Total</span>
            <span className="text-sm font-bold text-primary-600">{formatCurrency(totalAmount, currency)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Step Card ────────────────────────────────────────────────────────────────
function StepCard({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
          {step}
        </div>
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NewBookingPage() {
  const router = useRouter()
  const [source, setSource]                   = useState<BookingSource>('walk_in')
  const [rooms, setRooms]                     = useState<Room[]>([])
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  const [guest, setGuest]                     = useState<GuestProfile | null>(null)
  const [guestNotFound, setGuestNotFound]     = useState(false)
  const [searchingGuest, setSearchingGuest]   = useState(false)
  const [nights, setNights]                   = useState(0)
  const [totalAmount, setTotalAmount]         = useState(0)
  const [submitting, setSubmitting]           = useState(false)
  const [redirectMsg, setRedirectMsg]         = useState<string | null>(null)
  const [currency, setCurrency]               = useState('USD')
  const [tenantId, setTenantId]               = useState<string | null>(null)
  const [unavailableRoomIds, setUnavailableRoomIds] = useState<Set<string>>(new Set())
  const [checkingAvailability, setCheckingAvailability] = useState(false)

  const [payMethod, setPayMethod]       = useState('cash')
  const [payNow, setPayNow]             = useState(true)
  const [payNotes, setPayNotes]         = useState('')
  const [isAdvance, setIsAdvance]       = useState(false)
  const [advanceAmount, setAdvanceAmount] = useState('')

  const isOffline     = source !== 'online'
  const advanceValue  = Number(advanceAmount)
  const advanceInvalid = payNow && isAdvance && (
    !advanceAmount || !Number.isFinite(advanceValue) || advanceValue <= 0 || advanceValue > totalAmount
  )

  const onlineForm = useForm<OnlineForm>({
    resolver: zodResolver(onlineSchema),
    defaultValues: { adults: 1, children: 0, status: 'pending' },
  })
  const offlineForm = useForm<OfflineForm>({
    resolver: zodResolver(offlineSchema),
    defaultValues: { adults: 1, children: 0, status: 'pending' },
  })
  const guestNameField = offlineForm.register('guest_name')

  const [checkIn, checkOut]       = onlineForm.watch(['check_in', 'check_out'])
  const [checkInOff, checkOutOff] = offlineForm.watch(['check_in', 'check_out'])

  const activeCheckIn  = isOffline ? checkInOff  : checkIn
  const activeCheckOut = isOffline ? checkOutOff : checkOut
  const datesChosen = Boolean(activeCheckIn && activeCheckOut && new Date(activeCheckOut) > new Date(activeCheckIn))

  // Load rooms + currency
  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const user = await getBrowserUser(supabase)
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
      if (!profile?.tenant_id) return
      setTenantId(profile.tenant_id)
      const [{ data: roomData }, { data: hotel }] = await Promise.all([
        supabase
          .from('rooms')
          .select('id, room_number, name, floor, price_per_night, max_adults, max_children, capacity, room_type:room_types(name)')
          .eq('hotel_id', profile.tenant_id)
          .order('sort_order', { ascending: true })
          .order('room_number'),
        supabase.from('hotels').select('currency').eq('id', profile.tenant_id).single(),
      ])
      if (roomData) setRooms(roomData as unknown as Room[])
      if ((hotel as { currency?: string } | null)?.currency) setCurrency((hotel as { currency: string }).currency)
    }
    init()
  }, [])

  const selectedAdultCapacity = selectedRoomIds.reduce(
    (sum, id) => sum + (rooms.find(r => r.id === id)?.max_adults ?? 0), 0,
  )
  const selectedChildCapacity = selectedRoomIds.reduce(
    (sum, id) => sum + (rooms.find(r => r.id === id)?.max_children ?? 0), 0,
  )

  useEffect(() => {
    if (!activeCheckIn || !activeCheckOut || selectedRoomIds.length === 0) {
      setNights(0); setTotalAmount(0); return
    }
    const n = Math.ceil((new Date(activeCheckOut).getTime() - new Date(activeCheckIn).getTime()) / 86400000)
    if (n <= 0) { setNights(0); setTotalAmount(0); return }
    const total = selectedRoomIds.reduce((sum, id) => {
      const room = rooms.find(r => r.id === id)
      return sum + n * (room?.price_per_night ?? 0)
    }, 0)
    setNights(n)
    setTotalAmount(total)
  }, [activeCheckIn, activeCheckOut, selectedRoomIds, rooms])

  useEffect(() => {
    const check = async () => {
      if (!tenantId || !activeCheckIn || !activeCheckOut || new Date(activeCheckOut) <= new Date(activeCheckIn)) {
        setUnavailableRoomIds(new Set()); setCheckingAvailability(false); return
      }
      setCheckingAvailability(true)
      const { data } = await createClient()
        .from('bookings')
        .select('room_id, room_ids')
        .eq('hotel_id', tenantId)
        .in('status', ['confirmed', 'checked_in'])
        .lt('check_in', activeCheckOut)
        .gt('check_out', activeCheckIn)
      const ids = new Set(
        (data ?? []).flatMap((b: { room_id: string; room_ids: string[] | null }) =>
          b.room_ids?.length ? b.room_ids : [b.room_id]
        )
      )
      setUnavailableRoomIds(ids)
      setSelectedRoomIds(prev => prev.filter(id => !ids.has(id)))
      setCheckingAvailability(false)
    }
    check()
  }, [tenantId, activeCheckIn, activeCheckOut])

  const toggleRoom = (roomId: string) => {
    if (unavailableRoomIds.has(roomId)) return
    setSelectedRoomIds(prev =>
      prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
    )
  }

  const lookupGuest = useCallback(async (email: string) => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) return
    setSearchingGuest(true); setGuest(null); setGuestNotFound(false)
    const { data } = await createClient().from('profiles').select('id, full_name, email').eq('email', email.trim()).single()
    setSearchingGuest(false)
    if (data) setGuest(data)
    else setGuestNotFound(true)
  }, [])

  const createBookings = async (payload: {
    guest_name?: string; guest_phone?: string; guest_user_id?: string
    check_in: string; check_out: string; adults: number; children: number
    special_requests?: string; status: string
  }) => {
    if (selectedRoomIds.length === 0) { toast.error('Select at least one room'); return false }
    if (selectedRoomIds.length > 10) {
      toast.error('A single booking cannot include more than 10 rooms.')
      return false
    }
    const partySize     = (payload.adults ?? 1) + (payload.children ?? 0)
    const totalCapacity = selectedRoomIds.reduce((sum, id) => sum + (rooms.find(r => r.id === id)?.capacity ?? 0), 0)
    if (totalCapacity > 0 && partySize > totalCapacity) {
      toast.error(`Selected room${selectedRoomIds.length > 1 ? 's hold' : ' holds'} up to ${totalCapacity} guest${totalCapacity !== 1 ? 's' : ''}. Add another room or reduce guest count.`)
      return false
    }
    setSubmitting(true)
    const res = await fetch('/api/admin/create-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        room_ids: selectedRoomIds,
        source,
        ...(isOffline ? {
          payment_method:    payMethod,
          payment_collected: payNow,
          payment_notes:     payNotes || undefined,
          advance_amount:    payNow && isAdvance ? advanceValue : undefined,
        } : {}),
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setSubmitting(false)
      toast.error(json.error ?? 'Failed to create booking')
      return false
    }
    const roomCount = selectedRoomIds.length
    const roomLabel = roomCount > 1 ? ` (${roomCount} rooms)` : ''
    toast.success(
      payNow
        ? (isAdvance
            ? `Booking created & ${formatCurrency(advanceValue, currency)} advance collected${roomLabel}`
            : `Booking created & ${formatCurrency(totalAmount, currency)} collected${roomLabel}`)
        : `Booking created — payment pending${roomLabel}`
    )
    const goToReceipt = Boolean(payNow && json.payment_id)
    setRedirectMsg(goToReceipt ? 'Preparing receipt…' : 'Opening bookings…')
    router.push(goToReceipt ? `/hotel-admin/payments/${json.payment_id}/receipt` : '/hotel-admin/bookings')
    return true
  }

  const submitOffline = async (data: OfflineForm) => {
    if (advanceInvalid) {
      toast.error(`Advance must be between 0 and ${formatCurrency(totalAmount, currency)}`)
      return
    }
    await createBookings({
      guest_name: data.guest_name, guest_phone: data.guest_phone,
      check_in: data.check_in, check_out: data.check_out,
      adults: data.adults, children: data.children,
      special_requests: data.special_requests, status: data.status,
    })
  }

  const submitOnline = async (data: OnlineForm) => {
    if (!guest) { toast.error('Please find a valid guest first'); return }
    await createBookings({
      guest_user_id: guest.id,
      check_in: data.check_in, check_out: data.check_out,
      adults: data.adults, children: data.children,
      special_requests: data.special_requests, status: data.status,
    })
  }

  const paymentTaken = payNow && isOffline

  useEffect(() => {
    offlineForm.setValue('status', paymentTaken ? 'confirmed' : 'pending')
  }, [paymentTaken]) // eslint-disable-line react-hooks/exhaustive-deps

  const today = new Date().toISOString().split('T')[0]

  const DatesContent = (reg: any, errs: Record<string, { message?: string }>, ci: string) => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="label">Check-in <span className="text-red-500">*</span></label>
        <input {...reg('check_in')} type="date" min={today} className="input" />
        {errs.check_in && <p className="text-red-500 text-xs mt-1">{errs.check_in.message}</p>}
      </div>
      <div>
        <label className="label">Check-out <span className="text-red-500">*</span></label>
        <input {...reg('check_out')} type="date" min={ci || today} className="input" />
        {errs.check_out && <p className="text-red-500 text-xs mt-1">{errs.check_out.message}</p>}
      </div>
      {nights > 0 && (
        <div className="col-span-2 flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2">
          <CalendarDays className="h-4 w-4 text-primary-500" />
          <span><strong className="text-gray-900">{nights} night{nights !== 1 ? 's' : ''}</strong></span>
          {totalAmount > 0 && (
            <span className="text-gray-400">· Est. total <strong className="text-gray-900">{formatCurrency(totalAmount, currency)}</strong></span>
          )}
        </div>
      )}
    </div>
  )

  const DetailsContent = (reg: any, errs: Record<string, { message?: string }>) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Adults <span className="text-red-500">*</span></label>
          <input {...reg('adults')} type="number" min={1} max={selectedAdultCapacity || undefined} className="input" />
          {selectedAdultCapacity > 0 && (
            <p className="text-xs text-gray-400 mt-1">Max {selectedAdultCapacity} from selected room{selectedRoomIds.length > 1 ? 's' : ''}</p>
          )}
          {errs.adults && <p className="text-red-500 text-xs mt-1">{errs.adults.message}</p>}
        </div>
        <div>
          <label className="label">Children</label>
          <input {...reg('children')} type="number" min={0} max={selectedChildCapacity || undefined} className="input" />
          {selectedChildCapacity > 0 && (
            <p className="text-xs text-gray-400 mt-1">Max {selectedChildCapacity}</p>
          )}
        </div>
      </div>
      <div>
        <label className="label">Status</label>
        <select {...reg('status')} className="input" disabled={paymentTaken}>
          <option value="confirmed">Confirmed</option>
          {!paymentTaken && <option value="pending">Pending</option>}
        </select>
        {paymentTaken && (
          <p className="text-xs text-gray-400 mt-1">Set to Confirmed automatically — payment collected now.</p>
        )}
      </div>
      <div>
        <label className="label">Special Requests <span className="text-gray-400 font-normal">(optional)</span></label>
        <textarea {...reg('special_requests')} className="input resize-none" rows={3} placeholder="Dietary needs, room preferences, early check-in…" />
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {redirectMsg && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-white/90 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <p className="text-sm font-medium text-gray-700">{redirectMsg}</p>
          <p className="text-xs text-gray-500">Your booking has been saved.</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/hotel-admin/bookings" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">New Booking</h2>
          <p className="text-gray-500 text-sm mt-0.5">Create a booking from any channel</p>
        </div>
      </div>

      {/* Step 1 — Booking Source */}
      <StepCard step={1} title="Booking Source">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SOURCES.map(s => {
            const Icon = s.icon
            const active = source === s.value
            return (
              <button key={s.value} type="button"
                onClick={() => { setSource(s.value); setGuest(null); setGuestNotFound(false) }}
                className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-sm font-semibold ${
                  active ? s.activeClass + ' border-current' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                }`}>
                <Icon className={`h-4 w-4 ${active ? '' : s.color}`} />
                {s.label}
              </button>
            )
          })}
        </div>
      </StepCard>

      {/* ── Offline flow ── */}
      {isOffline && (
        <form onSubmit={offlineForm.handleSubmit(submitOffline)} className="space-y-4">
          {/* Step 2 — Guest Info */}
          <StepCard step={2} title="Guest Information">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Full Name <span className="text-red-500">*</span></label>
                <input
                  {...guestNameField}
                  onChange={e => {
                    e.target.value = e.target.value.replace(/[^a-zA-ZÀ-ɏ\s'-]/g, '')
                    guestNameField.onChange(e)
                  }}
                  maxLength={50}
                  className="input"
                  placeholder="e.g. John Smith"
                />
                {offlineForm.formState.errors.guest_name && (
                  <p className="text-red-500 text-xs mt-1">{offlineForm.formState.errors.guest_name.message}</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="label">Phone Number <span className="text-red-500">*</span></label>
                <PhoneInput
                  value={offlineForm.watch('guest_phone') ?? ''}
                  onChange={v => offlineForm.setValue('guest_phone', v, { shouldValidate: offlineForm.formState.isSubmitted })}
                />
                {offlineForm.formState.isSubmitted && offlineForm.formState.errors.guest_phone && (
                  <p className="text-red-500 text-xs mt-1">{offlineForm.formState.errors.guest_phone.message}</p>
                )}
              </div>
            </div>
          </StepCard>

          {/* Step 3 — Dates */}
          <StepCard step={3} title="Stay Dates">
            {DatesContent(offlineForm.register, offlineForm.formState.errors as Record<string, { message?: string }>, checkInOff)}
          </StepCard>

          {/* Step 4 — Rooms */}
          <StepCard step={4} title="Room Selection">
            <RoomPicker
              rooms={rooms}
              selectedRoomIds={selectedRoomIds}
              unavailableRoomIds={unavailableRoomIds}
              datesChosen={datesChosen}
              currency={currency}
              nights={nights}
              totalAmount={totalAmount}
              onToggle={toggleRoom}
              checkingAvailability={checkingAvailability}
            />
          </StepCard>

          {/* Step 5 — Guest Details */}
          <StepCard step={5} title="Guest Details">
            {DetailsContent(offlineForm.register, offlineForm.formState.errors as Record<string, { message?: string }>)}
          </StepCard>

          {/* Step 6 — Payment */}
          <StepCard step={6} title="Payment Collection">
            <PaymentBlock
              totalAmount={totalAmount} currency={currency} nights={nights} source={source}
              payMethod={payMethod}       setPayMethod={setPayMethod}
              payNow={payNow}             setPayNow={setPayNow}
              isAdvance={isAdvance}       setIsAdvance={setIsAdvance}
              advanceAmount={advanceAmount} setAdvanceAmount={setAdvanceAmount}
              payNotes={payNotes}         setPayNotes={setPayNotes}
            />
          </StepCard>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Link href="/hotel-admin/bookings" className="btn-secondary">Cancel</Link>
            <button type="submit"
              disabled={submitting || advanceInvalid || selectedRoomIds.length === 0}
              className="btn-primary flex items-center gap-2 px-8">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {submitting ? 'Creating booking…' : 'Create Booking'}
            </button>
          </div>
        </form>
      )}

      {/* ── Online flow ── */}
      {!isOffline && (
        <form onSubmit={onlineForm.handleSubmit(submitOnline)} className="space-y-4">
          {/* Step 2 — Guest lookup */}
          <StepCard step={2} title="Guest Lookup">
            <div className="space-y-3">
              <div>
                <label className="label">Guest Email <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <input {...onlineForm.register('guest_email')} type="email" className="input flex-1" placeholder="guest@example.com" />
                  <button type="button" onClick={() => lookupGuest(onlineForm.getValues('guest_email'))}
                    disabled={searchingGuest} className="btn-secondary flex items-center gap-1.5 text-sm shrink-0">
                    {searchingGuest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Find
                  </button>
                </div>
                {onlineForm.formState.errors.guest_email && (
                  <p className="text-red-500 text-xs mt-1">{onlineForm.formState.errors.guest_email.message}</p>
                )}
              </div>
              {guest && (
                <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 font-bold text-sm flex-shrink-0">
                    {guest.full_name?.[0]?.toUpperCase() ?? <User className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{guest.full_name}</p>
                    <p className="text-xs text-gray-500">{guest.email}</p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-emerald-600 ml-auto" />
                </div>
              )}
              {guestNotFound && (
                <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">
                    No account found for this email. Try a walk-in booking, or{' '}
                    <Link href="/super-admin/users/add" className="underline font-medium">add them as a user</Link>.
                  </p>
                </div>
              )}
            </div>
          </StepCard>

          {/* Step 3 — Dates */}
          <StepCard step={3} title="Stay Dates">
            {DatesContent(onlineForm.register, onlineForm.formState.errors as Record<string, { message?: string }>, checkIn)}
          </StepCard>

          {/* Step 4 — Rooms */}
          <StepCard step={4} title="Room Selection">
            <RoomPicker
              rooms={rooms}
              selectedRoomIds={selectedRoomIds}
              unavailableRoomIds={unavailableRoomIds}
              datesChosen={datesChosen}
              currency={currency}
              nights={nights}
              totalAmount={totalAmount}
              onToggle={toggleRoom}
              checkingAvailability={checkingAvailability}
            />
          </StepCard>

          {/* Step 5 — Guest Details */}
          <StepCard step={5} title="Guest Details">
            {DetailsContent(onlineForm.register, onlineForm.formState.errors as Record<string, { message?: string }>)}
          </StepCard>

          <div className="flex items-center justify-between gap-3 pt-2">
            <Link href="/hotel-admin/bookings" className="btn-secondary">Cancel</Link>
            <button type="submit"
              disabled={submitting || selectedRoomIds.length === 0}
              className="btn-primary flex items-center gap-2 px-8">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {submitting ? 'Creating booking…' : 'Create Booking'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
