'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Plus, BedDouble, Search, Pencil, Users, X, GripVertical, Wrench, BookOpen, CalendarSearch, Loader2, CheckCircle2, XCircle, ArrowRight, LayoutGrid, LayoutList } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { addDays, todayISO } from '@/lib/date'
import RoomStatusToggle from './RoomStatusToggle'
import DeleteRoomButton from './DeleteRoomButton'
import { RoomRow, ActionsCell } from './RoomRow'
import { formatCurrency } from '@/lib/currency'

const statusBadge: Record<string, string> = {
  available: 'badge-green', booked: 'badge-blue',
  maintenance: 'badge-red', cleaning: 'badge-yellow',
}

const STATUSES = ['available', 'booked', 'maintenance', 'cleaning']


type Room = {
  id: string
  room_number: string
  name: string | null
  floor: number
  sort_order: number
  capacity: number
  price_per_night: number
  status: string
  room_type_id: string
  images: string[] | null
  room_type: { id?: string; name?: string; capacity?: number } | null
}

type RoomType = { id: string; name: string }

/** One night from the given day â€” the default range for a single-day check. */
const nextDay = (date: string) => addDays(date, 1)

const fmtShort = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

/** Who is occupying a room over the checked dates. */
type Occupancy = { guest: string; checkIn: string; checkOut: string }

type RoomGridCardProps = {
  room: Room
  rangeActive: boolean
  occupancy: Map<string, Occupancy>
  availFrom: string
  availTo: string
  currency: string
}

function RoomGridCard({ room, rangeActive, occupancy, availFrom, availTo, currency }: RoomGridCardProps) {
  const taken = occupancy.get(room.id)
  const statusConfig = {
    available:   { badge: 'bg-emerald-500', label: 'Available'   },
    booked:      { badge: 'bg-blue-500',    label: 'Occupied'    },
    maintenance: { badge: 'bg-red-500',     label: 'Maintenance' },
    cleaning:    { badge: 'bg-amber-500',   label: 'Cleaning'    },
  }
  const sc      = statusConfig[room.status as keyof typeof statusConfig] ?? { badge: 'bg-gray-500', label: room.status }
  const imgBg   = { available: 'from-emerald-50 to-teal-50', booked: 'from-blue-50 to-primary-50', maintenance: 'from-red-50 to-orange-50', cleaning: 'from-amber-50 to-yellow-50' }[room.status] ?? 'from-gray-50 to-gray-100'
  const iconClr = { available: 'text-emerald-200', booked: 'text-blue-200', maintenance: 'text-red-200', cleaning: 'text-amber-200' }[room.status] ?? 'text-gray-200'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-shadow flex flex-col">
      <div className="relative h-44 shrink-0">
        {room.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={room.images[0]} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${imgBg} flex items-center justify-center`}>
            <BedDouble className={`h-14 w-14 ${iconClr}`} />
          </div>
        )}
        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide text-white shadow ${sc.badge}`}>
          {sc.label}
        </span>
        {(room.images?.length ?? 0) > 1 && (
          <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
            {room.images!.length} photos
          </span>
        )}
      </div>

      <div className="p-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">
              {room.name ?? `Room ${room.room_number}`}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {room.room_type?.name ?? 'â€”'} Â· {room.floor === 0 ? 'Ground floor' : `Floor ${room.floor}`}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-gray-900 text-sm">{formatCurrency(room.price_per_night, currency)}</p>
            <p className="text-[11px] text-gray-400">/night</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2.5 text-xs text-gray-500">
          <Users className="h-3.5 w-3.5 text-gray-400" />
          Sleeps {room.room_type?.capacity ?? room.capacity}
        </div>

        {rangeActive && (
          taken ? (
            <div className="mt-2.5 px-3 py-2 rounded-lg bg-red-50 border border-red-100 flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
              <span className="text-xs text-red-700 font-medium truncate">
                {taken.guest} Â· {fmtShort(taken.checkIn)}â€“{fmtShort(taken.checkOut)}
              </span>
            </div>
          ) : room.status === 'available' ? (
            <div className="mt-2.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span className="text-xs text-emerald-700 font-medium">
                Free Â· {fmtShort(availFrom)}â€“{fmtShort(availTo)}
              </span>
            </div>
          ) : null
        )}
      </div>

      <div className="flex items-center border-t border-gray-100 divide-x divide-gray-100">
        <Link
          href={`/hotel-admin/rooms/${room.id}/edit`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors font-medium"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Link>
        <div className="flex items-center justify-center px-4 py-2.5">
          <RoomStatusToggle roomId={room.id} currentStatus={room.status} />
        </div>
        <div className="flex items-center justify-center px-4 py-2.5">
          <DeleteRoomButton roomId={room.id} roomNumber={room.room_number} />
        </div>
      </div>
    </div>
  )
}

export default function RoomsClient({
  rooms: initialRooms,
  roomTypes,
  currency,
  hotelId,
  pageSize,
  totalAvailable,
  totalBooked,
  totalMaintenance,
  totalRooms,
}: {
  rooms: Room[]
  roomTypes: RoomType[]
  currency: string
  hotelId: string
  pageSize: number
  totalAvailable: number
  totalBooked: number
  totalMaintenance: number
  totalRooms: number
}) {
  const [rooms, setRooms]       = useState<Room[]>(initialRooms)
  const [saving, setSaving]     = useState(false)
  const [view, setView]         = useState<'list' | 'grid'>('grid')
  const [dragId, setDragId]     = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [q, setQ]               = useState('')
  const [status, setStatus]     = useState('')
  const [typeId, setTypeId]     = useState('')
  const saveTimer               = useRef<ReturnType<typeof setTimeout> | null>(null)

  // â”€â”€ Availability check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // "Is this room free on that day?" â€” pick a range and every room is marked
  // against the bookings that actually overlap it.
  const [availFrom, setAvailFrom] = useState('')
  const [availTo, setAvailTo]     = useState('')
  const [occupancy, setOccupancy] = useState<Map<string, Occupancy>>(new Map())
  const [checking, setChecking]   = useState(false)
  const [freeOnly, setFreeOnly]   = useState(false)

  const rangeActive = Boolean(availFrom && availTo && availTo > availFrom)

  useEffect(() => {
    if (!rangeActive) { setOccupancy(new Map()); return }

    let cancelled = false
    const run = async () => {
      setChecking(true)
      // Same overlap rule the booking trigger enforces: only confirmed and
      // checked-in stays hold a room, and a same-day changeover isn't a clash.
      const { data } = await createClient()
        .from('bookings')
        .select('room_id, room_ids, check_in, check_out, guest_name, user:profiles(full_name)')
        .eq('hotel_id', hotelId)
        .in('status', ['confirmed', 'checked_in'])
        .lt('check_in', availTo)
        .gt('check_out', availFrom)

      if (cancelled) return
      const map = new Map<string, Occupancy>()
      for (const b of data ?? []) {
        const row = b as unknown as {
          room_id: string; room_ids: string[] | null
          check_in: string; check_out: string
          guest_name: string | null; user: { full_name?: string } | null
        }
        const guest = row.user?.full_name || row.guest_name || 'Guest'
        for (const rid of row.room_ids?.length ? row.room_ids : [row.room_id]) {
          map.set(rid, { guest, checkIn: row.check_in, checkOut: row.check_out })
        }
      }
      setOccupancy(map)
      setChecking(false)
    }
    run()
    return () => { cancelled = true }
  }, [rangeActive, availFrom, availTo, hotelId])

  const onFromChange = (value: string) => {
    setAvailFrom(value)
    // One night by default, so a single click answers "free on this day?"
    if (!value) { setAvailTo(''); return }
    if (!availTo || availTo <= value) setAvailTo(nextDay(value))
  }

  const clearRange = () => { setAvailFrom(''); setAvailTo(''); setFreeOnly(false) }

  /** Free = bookable status AND no overlapping booking for the checked dates. */
  const isFree = (room: Room) => room.status === 'available' && !occupancy.has(room.id)

  const hasFilter = !!(q || status || typeId || (rangeActive && freeOnly))

  const filtered = useMemo(() => {
    const lq = q.toLowerCase()
    return rooms.filter(room => {
      if (status && room.status !== status) return false
      if (typeId && room.room_type_id !== typeId) return false
      if (rangeActive && freeOnly && !isFree(room)) return false
      if (lq && !room.room_number.toLowerCase().includes(lq) && !(room.name?.toLowerCase().includes(lq))) return false
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, q, status, typeId, rangeActive, freeOnly, occupancy])

  const freeCount = useMemo(
    () => (rangeActive ? rooms.filter(isFree).length : 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rooms, rangeActive, occupancy],
  )

  // Server-side infinite scroll
  const offsetRef    = useRef(initialRooms.length)
  const fetchingRef  = useRef(false)
  const hasMoreRef   = useRef(initialRooms.length === pageSize)
  const sentinelRef  = useRef<HTMLDivElement>(null)
  const [fetchingMore, setFetchingMore] = useState(false)
  const [hasMore, setHasMore]           = useState(initialRooms.length === pageSize)

  const loadMore = useCallback(async (reset = false) => {
    if (fetchingRef.current && !reset) return
    fetchingRef.current = true
    setFetchingMore(true)

    const from = reset ? 0 : offsetRef.current
    const to   = from + pageSize - 1

    let q2 = createClient()
      .from('rooms')
      .select('*, room_type:room_types(id, name, capacity), images')
      .eq('hotel_id', hotelId)
      .order('sort_order', { ascending: true })
      .order('room_number')
      .range(from, to)

    if (status) q2 = q2.eq('status', status)
    if (typeId) q2 = q2.eq('room_type_id', typeId)

    const { data } = await q2
    const fetched = (data ?? []) as Room[]

    if (reset) {
      setRooms(fetched)
      offsetRef.current = fetched.length
    } else {
      setRooms(prev => [...prev, ...fetched])
      offsetRef.current = from + fetched.length
    }

    const more = fetched.length === pageSize
    hasMoreRef.current = more
    setHasMore(more)
    fetchingRef.current = false
    setFetchingMore(false)
  }, [hotelId, status, typeId, pageSize])

  // Reset + reload when server-side filters change
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    loadMore(true)
  }, [loadMore])

  // Sentinel: load next page when scrolled into view
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMoreRef.current && !fetchingRef.current) {
          loadMore(false)
        }
      },
      { rootMargin: '300px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  const visible = filtered

  const available   = totalAvailable
  const booked      = totalBooked
  const maintenance = totalMaintenance

  const clearAll = () => { setQ(''); setStatus(''); setTypeId('') }

  // â”€â”€ Drag handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDragStart = (id: string) => (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    setDragId(id)
  }

  const handleDragOver = (id: string) => (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== dragOverId) setDragOverId(id)
  }

  const handleDrop = (targetId: string) => (e: React.DragEvent) => {
    e.preventDefault()
    if (!dragId || dragId === targetId) { setDragOverId(null); return }

    const next = [...rooms]
    const fromIdx = next.findIndex(r => r.id === dragId)
    const toIdx   = next.findIndex(r => r.id === targetId)
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)

    setRooms(next)
    setDragId(null)
    setDragOverId(null)

    // Debounce save so rapid drags don't flood the API
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      await fetch('/api/rooms/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: next.map((r, i) => ({ id: r.id, sort_order: i })),
        }),
      })
      setSaving(false)
    }, 400)
  }

  const handleDragEnd = () => {
    setDragId(null)
    setDragOverId(null)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 px-6 py-5 sm:px-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-primary-600/20 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-primary-500/20 blur-3xl" />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white leading-tight">Rooms</h2>
            <p className="text-primary-300 text-sm mt-0.5">
              {rooms.length} total
              {filtered.length !== rooms.length && ` Â· ${filtered.length} shown`}
              {saving && <span className="ml-2 text-amber-400 animate-pulse">Savingâ€¦</span>}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
              <BedDouble className="h-4 w-4 text-emerald-400" />
              <div>
                <p className="text-white font-bold leading-none">{available}</p>
                <p className="text-primary-300 text-xs leading-none mt-0.5">Available</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
              <BookOpen className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-white font-bold leading-none">{booked}</p>
                <p className="text-primary-300 text-xs leading-none mt-0.5">Occupied</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
              <Wrench className="h-4 w-4 text-red-400" />
              <div>
                <p className="text-white font-bold leading-none">{maintenance}</p>
                <p className="text-primary-300 text-xs leading-none mt-0.5">Maintenance</p>
              </div>
            </div>
            <Link href="/hotel-admin/rooms/new" className="flex items-center gap-2 bg-white text-primary-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-primary-50 transition-colors shadow-sm">
              <Plus className="h-4 w-4" /> Add Room
            </Link>
          </div>
        </div>
      </div>

      {/* Availability checker â€” a tool, not a list filter, so it reads as its
          own panel: pick a stay on the left, get the verdict on the right. */}
      <div className="rounded-2xl border border-primary-100 bg-primary-50/50 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 px-4 py-4 sm:px-5">

          {/* Title */}
          <div className="flex items-center gap-3 lg:w-56 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center shrink-0">
              <CalendarSearch className="h-4.5 w-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 leading-tight">Check availability</p>
              <p className="text-xs text-primary-500/80 leading-tight mt-0.5">See what&apos;s free on a date</p>
            </div>
          </div>

          {/* Dates â€” grouped so the two inputs read as one range */}
          <div className="flex items-center gap-2 rounded-xl bg-white border border-primary-100 px-3 py-2 shadow-sm">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Check-in</label>
              <input
                type="date"
                value={availFrom}
                onChange={e => onFromChange(e.target.value)}
                className="text-sm font-semibold text-gray-900 bg-transparent outline-none w-[8.5rem]"
              />
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 shrink-0" />
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Check-out</label>
              <input
                type="date"
                value={availTo}
                min={availFrom ? nextDay(availFrom) : undefined}
                onChange={e => setAvailTo(e.target.value)}
                className="text-sm font-semibold text-gray-900 bg-transparent outline-none w-[8.5rem]"
              />
            </div>
          </div>

          {/* Quick picks, until a stay is chosen */}
          {!availFrom && (
            <div className="flex items-center gap-2">
              {/* Resolved on click, so they land on the viewer's own "today". */}
              <button
                onClick={() => onFromChange(todayISO())}
                className="px-3 py-1.5 rounded-lg bg-white border border-primary-200 text-sm font-semibold text-primary-700 hover:bg-primary-100 transition-colors"
              >
                Tonight
              </button>
              <button
                onClick={() => onFromChange(addDays(todayISO(), 1))}
                className="px-3 py-1.5 rounded-lg bg-white border border-primary-200 text-sm font-semibold text-primary-700 hover:bg-primary-100 transition-colors"
              >
                Tomorrow
              </button>
            </div>
          )}

          {/* Verdict */}
          {rangeActive && (
            <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
              {checking ? (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checkingâ€¦
                </span>
              ) : (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold ${
                    freeCount > 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {freeCount > 0 ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {freeCount} of {rooms.length} free
                  <span className="font-medium opacity-70">Â· {fmtShort(availFrom)}â€“{fmtShort(availTo)}</span>
                </span>
              )}
              <button
                onClick={() => setFreeOnly(v => !v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  freeOnly
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Free only
              </button>
              <button
                onClick={clearRange}
                title="Clear dates"
                aria-label="Clear dates"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="card flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search name or numberâ€¦"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
        </div>
        <select
          value={typeId}
          onChange={e => setTypeId(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white text-gray-700"
        >
          <option value="">All Types</option>
          {roomTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white text-gray-700"
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        {hasFilter && (
          <button onClick={clearAll} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors px-2 py-1">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
        <div className="ml-auto flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
          <button
            onClick={() => setView('list')}
            title="List view"
            aria-label="List view"
            className={`p-1.5 rounded-lg transition-colors ${view === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView('grid')}
            title="Grid view"
            aria-label="Grid view"
            className={`p-1.5 rounded-lg transition-colors ${view === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!hasFilter && rooms.length > 1 && view === 'list' && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5 -mt-2">
          <GripVertical className="h-3.5 w-3.5" /> Drag rows to reorder â€” order is shown to customers.
        </p>
      )}

      {/* Rooms: grid or list */}
      {view === 'grid' ? (
        <div className="space-y-4">
          <div className="card px-5 py-3.5 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-primary-500 rounded-full" />
            <h3 className="font-semibold text-gray-900 text-sm">
              {hasFilter ? `${filtered.length} room${filtered.length !== 1 ? 's' : ''} found` : 'All Rooms'}
            </h3>
          </div>

          {filtered.length === 0 ? (
            <div className="card py-14 text-center">
              <BedDouble className="h-9 w-9 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                {rangeActive && freeOnly
                  ? `No rooms free for ${fmtShort(availFrom)} â€“ ${fmtShort(availTo)}.`
                  : hasFilter ? 'No rooms match your filters.' : 'No rooms yet.'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {visible.map(room => (
                  <RoomGridCard
                    key={room.id}
                    room={room}
                    rangeActive={rangeActive}
                    occupancy={occupancy}
                    availFrom={availFrom}
                    availTo={availTo}
                    currency={currency}
                  />
                ))}
              </div>
              <div ref={sentinelRef} className="h-1" />
              {hasMore && (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary-400" />
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-primary-500 rounded-full" />
            <h3 className="font-semibold text-gray-900 text-sm">
              {hasFilter ? `${filtered.length} room${filtered.length !== 1 ? 's' : ''} found` : 'All Rooms'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  {!hasFilter && <th className="table-header w-8" />}
                  <th className="table-header">Room</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Floor</th>
                  <th className="table-header">Capacity</th>
                  <th className="table-header">Price / Night</th>
                  {rangeActive && <th className="table-header">On these dates</th>}
                  <th className="table-header">Status</th>
                  <th className="table-header text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map(room => (
                  <RoomRow
                    key={room.id}
                    href={`/hotel-admin/rooms/${room.id}`}
                    draggable={!hasFilter}
                    isDragOver={dragOverId === room.id}
                    onDragStart={handleDragStart(room.id)}
                    onDragOver={handleDragOver(room.id)}
                    onDrop={handleDrop(room.id)}
                    onDragEnd={handleDragEnd}
                  >
                    {!hasFilter && (
                      <td className="pl-3 pr-0 py-3 w-8" onClick={e => e.stopPropagation()}>
                        <GripVertical className="h-4 w-4 text-gray-300 cursor-grab" />
                      </td>
                    )}

                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        {room.images?.[0] ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={room.images[0]} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center ${
                            room.status === 'available'   ? 'bg-emerald-50' :
                            room.status === 'booked'      ? 'bg-blue-50'    :
                            room.status === 'maintenance' ? 'bg-red-50'     : 'bg-amber-50'
                          }`}>
                            <BedDouble className={`h-4 w-4 ${
                              room.status === 'available'   ? 'text-emerald-400' :
                              room.status === 'booked'      ? 'text-blue-400'    :
                              room.status === 'maintenance' ? 'text-red-400'     : 'text-amber-400'
                            }`} />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900 text-sm leading-snug">
                            {room.name ?? `Room ${room.room_number}`}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">#{room.room_number}</p>
                        </div>
                      </div>
                    </td>

                    <td className="table-cell">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {room.room_type?.name ?? 'â€”'}
                      </span>
                    </td>

                    <td className="table-cell text-sm text-gray-500">
                      {room.floor === 0 ? 'Ground' : `Floor ${room.floor}`}
                    </td>

                    <td className="table-cell">
                      <span className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Users className="h-3.5 w-3.5 text-gray-400" />
                        {room.room_type?.capacity ?? room.capacity}
                      </span>
                    </td>

                    <td className="table-cell font-semibold text-gray-900 text-sm">
                      {formatCurrency(room.price_per_night, currency)}
                    </td>

                    {rangeActive && (() => {
                      const taken = occupancy.get(room.id)
                      return (
                        <td className="table-cell">
                          {taken ? (
                            <>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                                <XCircle className="h-3 w-3" /> Booked
                              </span>
                              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[150px]">
                                {taken.guest} Â· {fmtShort(taken.checkIn)}â€“{fmtShort(taken.checkOut)}
                              </p>
                            </>
                          ) : room.status === 'available' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" /> Free
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500 border border-gray-200 capitalize">
                              {room.status}
                            </span>
                          )}
                        </td>
                      )
                    })()}

                    <td className="table-cell">
                      <span className={`${statusBadge[room.status] ?? 'badge-gray'} capitalize`}>
                        {room.status}
                      </span>
                    </td>

                    <ActionsCell>
                      <RoomStatusToggle roomId={room.id} currentStatus={room.status} />
                      <Link
                        href={`/hotel-admin/rooms/${room.id}/edit`}
                        title="Edit room"
                        aria-label="Edit room"
                        className="row-action hover:text-blue-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <DeleteRoomButton roomId={room.id} roomNumber={room.room_number} />
                    </ActionsCell>
                  </RoomRow>
                ))}

                {!filtered.length && (
                  <tr>
                    <td colSpan={(hasFilter ? 7 : 8) + (rangeActive ? 1 : 0)} className="px-4 py-14 text-center">
                      <BedDouble className="h-9 w-9 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">
                        {rangeActive && freeOnly
                          ? `No rooms free for ${fmtShort(availFrom)} â€“ ${fmtShort(availTo)}.`
                          : hasFilter ? 'No rooms match your filters.' : 'No rooms yet.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div ref={sentinelRef} className="h-1" />
          {hasMore && (
            <div className="flex justify-center py-3 border-t border-gray-100">
              <Loader2 className="h-5 w-5 animate-spin text-primary-400" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
