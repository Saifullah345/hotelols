'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Moon, DoorOpen, Phone, MessageCircle, Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PhoneInput from '@/components/ui/PhoneInput'
import { formatCurrency } from '@/lib/currency'

const SOURCES = [
  { value: 'walk_in',  label: 'Walk-in',  icon: DoorOpen,      cls: 'text-orange-600 bg-orange-50 border-orange-200' },
  { value: 'phone',    label: 'Phone',    icon: Phone,         cls: 'text-blue-600 bg-blue-50 border-blue-200'       },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, cls: 'text-green-600 bg-green-50 border-green-200'    },
  { value: 'online',   label: 'Online',   icon: Globe,         cls: 'text-purple-600 bg-purple-50 border-purple-200' },
]

type Booking = {
  id: string
  check_in: string
  check_out: string
  adults: number
  children: number
  source: string
  special_requests: string | null
  guest_name: string | null
  guest_phone: string | null
  total_amount: number
  user: { full_name?: string; email?: string } | null
  room: { id: string; room_number: string; name: string | null; price_per_night: number } | null
}

const calcNights = (ci: string, co: string) =>
  Math.max(1, Math.ceil((new Date(co).getTime() - new Date(ci).getTime()) / 86_400_000))

export default function EditBookingPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [booking,    setBooking]    = useState<Booking | null>(null)
  const [currency,   setCurrency]   = useState('USD')
  const [loading,    setLoading]    = useState(true)

  const [checkIn,    setCheckIn]    = useState('')
  const [checkOut,   setCheckOut]   = useState('')
  const [adults,     setAdults]     = useState(1)
  const [children,   setChildren]   = useState(0)
  const [source,     setSource]     = useState('walk_in')
  const [guestName,  setGuestName]  = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [notes,      setNotes]      = useState('')
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
      if (!profile?.tenant_id) { router.push('/login'); return }

      const [{ data: b }, { data: hotel }] = await Promise.all([
        supabase
          .from('bookings')
          .select('*, user:profiles(full_name, email), room:rooms(id, room_number, name, price_per_night)')
          .eq('id', id)
          .eq('hotel_id', profile.tenant_id)
          .single(),
        supabase.from('hotels').select('currency').eq('id', profile.tenant_id).single(),
      ])

      if (!b) { router.push('/hotel-admin/bookings'); return }

      setBooking(b as Booking)
      setCheckIn(b.check_in.slice(0, 10))
      setCheckOut(b.check_out.slice(0, 10))
      setAdults(b.adults)
      setChildren(b.children)
      setSource(b.source ?? 'walk_in')
      setGuestName(b.guest_name ?? '')
      setGuestPhone(b.guest_phone ?? '')
      setNotes(b.special_requests ?? '')
      setCurrency((hotel as { currency?: string } | null)?.currency ?? 'USD')
      setLoading(false)
    }
    init()
  }, [id, router])

  const isOffline = !booking?.user

  const n = checkIn && checkOut && new Date(checkOut) > new Date(checkIn)
    ? calcNights(checkIn, checkOut) : 0
  const newTotal = n * (booking?.room?.price_per_night ?? 0)

  const save = async () => {
    if (!checkIn || !checkOut) { toast.error('Please set both check-in and check-out dates'); return }
    if (new Date(checkOut) <= new Date(checkIn)) { toast.error('Check-out must be after check-in'); return }

    setSaving(true)
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        check_in: checkIn,
        check_out: checkOut,
        adults,
        children,
        source,
        special_requests: notes || null,
        ...(isOffline ? { guest_name: guestName || null, guest_phone: guestPhone || null } : {}),
      }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error ?? 'Failed to update booking'); return }
    toast.success('Booking updated')
    router.push(`/hotel-admin/bookings/${id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  const guest = booking?.user?.full_name ?? booking?.guest_name ?? 'Guest'
  const roomLabel = booking?.room?.name ?? `Room ${booking?.room?.room_number}`

  return (
    <div className="max-w-xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/hotel-admin/bookings/${id}`} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Edit Booking</h2>
          <p className="text-sm text-gray-400 mt-0.5">{guest} · {roomLabel}</p>
        </div>
      </div>

      <div className="card p-6 space-y-6">

        {/* Guest Info (offline only) */}
        {isOffline && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Guest Info</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Full Name</label>
                <input value={guestName} onChange={e => setGuestName(e.target.value)}
                  className="input" placeholder="John Smith" />
              </div>
              <div>
                <label className="label">Phone</label>
                <PhoneInput value={guestPhone} onChange={setGuestPhone} className="w-full" />
              </div>
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stay</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Check-in</label>
              <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Check-out</label>
              <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} min={checkIn} className="input" />
            </div>
          </div>
          {n > 0 && (
            <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-xl text-sm text-blue-700">
              <span className="flex items-center gap-1.5">
                <Moon className="h-3.5 w-3.5" />
                <strong>{n}</strong> night{n !== 1 ? 's' : ''}
              </span>
              {newTotal > 0 && <span className="font-bold">{formatCurrency(newTotal, currency)}</span>}
            </div>
          )}
        </div>

        {/* Guests */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Guests</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Adults</label>
              <input type="number" value={adults} onChange={e => setAdults(Number(e.target.value))}
                min={1} max={20} className="input" />
            </div>
            <div>
              <label className="label">Children</label>
              <input type="number" value={children} onChange={e => setChildren(Number(e.target.value))}
                min={0} max={20} className="input" />
            </div>
          </div>
        </div>

        {/* Source */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Booking Source</p>
          <div className="grid grid-cols-4 gap-2">
            {SOURCES.map(s => {
              const Icon = s.icon
              const active = source === s.value
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSource(s.value)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-medium transition-all ${
                    active ? `${s.cls} border-current` : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Special Requests */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Special Requests <span className="normal-case text-gray-400 font-normal">(optional)</span>
          </p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            rows={4} className="input resize-none" placeholder="Any special requests, preferences, or notes…" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href={`/hotel-admin/bookings/${id}`} className="flex-1 text-center px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
          Cancel
        </Link>
        <button onClick={save} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

    </div>
  )
}
