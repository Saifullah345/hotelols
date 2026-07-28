'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Plus, BedDouble, Search, Pencil, Users, X, ChevronLeft, ChevronRight, GripVertical, Wrench, BookOpen, CalendarSearch, Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
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

const PER_PAGE_OPTIONS = [10, 25, 50, 100]

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

/** One night from the given day — the default range for a single-day check. */
const nextDay = (date: string) => addDays(date, 1)

const fmtShort = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

/** Who is occupying a room over the checked dates. */
type Occupancy = { guest: string; checkIn: string; checkOut: string }

export default function RoomsClient({
  rooms: initialRooms,
  roomTypes,
  currency,
  hotelId,
}: {
  rooms: Room[]
  roomTypes: RoomType[]
  currency: string
  hotelId: string
}) {
  const [rooms, setRooms]       = useState<Room[]>(initialRooms)
  const [saving, setSaving]     = useState(false)
  const [dragId, setDragId]     = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [q, setQ]               = useState('')
  const [status, setStatus]     = useState('')
  const [typeId, setTypeId]     = useState('')
  const saveTimer               = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Availability check ────────────────────────────────────────────
  // "Is this room free on that day?" — pick a range and every room is marked
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

  // ── Pagination ────────────────────────────────────────────────────
  const [page, setPage]       = useState(1)
  const [perPage, setPerPage] = useState(10)

  // Any filter change puts you back on the first page
  useEffect(() => { setPage(1) }, [q, status, typeId, perPage])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  // Clamp instead of storing — the list can shrink under us (delete + refresh)
  const safePage   = Math.min(page, totalPages)
  const start      = (safePage - 1) * perPage
  const paged      = filtered.slice(start, start + perPage)

  // Page buttons: first, last, and a window around the current page
  const pageNumbers = useMemo(() => {
    const out: (number | '…')[] = []
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - safePage) <= 1) out.push(i)
      else if (out[out.length - 1] !== '…') out.push('…')
    }
    return out
  }, [totalPages, safePage])

  const available   = rooms.filter(r => r.status === 'available').length
  const booked      = rooms.filter(r => r.status === 'booked').length
  const maintenance = rooms.filter(r => r.status === 'maintenance').length

  const clearAll = () => { setQ(''); setStatus(''); setTypeId('') }

  // ── Drag handlers ──────────────────────────────────────────────
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
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800 px-6 py-5 sm:px-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-violet-600/20 blur-3xl" />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white leading-tight">Rooms</h2>
            <p className="text-indigo-300 text-sm mt-0.5">
              {rooms.length} total
              {filtered.length !== rooms.length && ` · ${filtered.length} shown`}
              {saving && <span className="ml-2 text-amber-400 animate-pulse">Saving…</span>}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
              <BedDouble className="h-4 w-4 text-emerald-400" />
              <div>
                <p className="text-white font-bold leading-none">{available}</p>
                <p className="text-indigo-300 text-xs leading-none mt-0.5">Available</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
              <BookOpen className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-white font-bold leading-none">{booked}</p>
                <p className="text-indigo-300 text-xs leading-none mt-0.5">Occupied</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3.5 py-2 rounded-xl text-sm">
              <Wrench className="h-4 w-4 text-red-400" />
              <div>
                <p className="text-white font-bold leading-none">{maintenance}</p>
                <p className="text-indigo-300 text-xs leading-none mt-0.5">Maintenance</p>
              </div>
            </div>
            <Link href="/hotel-admin/rooms/new" className="flex items-center gap-2 bg-white text-indigo-700 font-semibold text-sm px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors shadow-sm">
              <Plus className="h-4 w-4" /> Add Room
            </Link>
          </div>
        </div>
      </div>

      {/* Availability checker — a tool, not a list filter, so it reads as its
          own panel: pick a stay on the left, get the verdict on the right. */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 px-4 py-4 sm:px-5">

          {/* Title */}
          <div className="flex items-center gap-3 lg:w-56 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
              <CalendarSearch className="h-4.5 w-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 leading-tight">Check availability</p>
              <p className="text-xs text-indigo-500/80 leading-tight mt-0.5">See what&apos;s free on a date</p>
            </div>
          </div>

          {/* Dates — grouped so the two inputs read as one range */}
          <div className="flex items-center gap-2 rounded-xl bg-white border border-indigo-100 px-3 py-2 shadow-sm">
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
                className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                Tonight
              </button>
              <button
                onClick={() => onFromChange(addDays(todayISO(), 1))}
                className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
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
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking…
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
                  <span className="font-medium opacity-70">· {fmtShort(availFrom)}–{fmtShort(availTo)}</span>
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
            placeholder="Search name or number…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <select
          value={typeId}
          onChange={e => setTypeId(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-700"
        >
          <option value="">All Types</option>
          {roomTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-700"
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        {hasFilter && (
          <button onClick={clearAll} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors px-2 py-1">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {!hasFilter && rooms.length > 1 && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5 -mt-2">
          <GripVertical className="h-3.5 w-3.5" /> Drag rows to reorder — order is shown to customers.
        </p>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
          <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
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
              {paged.map(room => (
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
                  {/* Drag handle */}
                  {!hasFilter && (
                    <td className="pl-3 pr-0 py-3 w-8" onClick={e => e.stopPropagation()}>
                      <GripVertical className="h-4 w-4 text-gray-300 cursor-grab" />
                    </td>
                  )}

                  {/* Room */}
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

                  {/* Type */}
                  <td className="table-cell">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {room.room_type?.name ?? '—'}
                    </span>
                  </td>

                  {/* Floor */}
                  <td className="table-cell text-sm text-gray-500">
                    {room.floor === 0 ? 'Ground' : `Floor ${room.floor}`}
                  </td>

                  {/* Capacity */}
                  <td className="table-cell">
                    <span className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      {room.room_type?.capacity ?? room.capacity}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="table-cell font-semibold text-gray-900 text-sm">
                    {formatCurrency(room.price_per_night, currency)}
                  </td>

                  {/* Availability for the checked dates */}
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
                              {taken.guest} · {fmtShort(taken.checkIn)}–{fmtShort(taken.checkOut)}
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

                  {/* Status */}
                  <td className="table-cell">
                    <span className={`${statusBadge[room.status] ?? 'badge-gray'} capitalize`}>
                      {room.status}
                    </span>
                  </td>

                  {/* Actions */}
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
                        ? `No rooms free for ${fmtShort(availFrom)} – ${fmtShort(availTo)}.`
                        : hasFilter ? 'No rooms match your filters.' : 'No rooms yet.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-500">
              Showing{' '}
              <span className="font-semibold text-gray-700">
                {start + 1}–{Math.min(start + perPage, filtered.length)}
              </span>{' '}
              of <span className="font-semibold text-gray-700">{filtered.length}</span> room
              {filtered.length !== 1 ? 's' : ''}
            </p>

            <div className="flex items-center gap-3">
              <select
                value={perPage}
                onChange={e => setPerPage(Number(e.target.value))}
                aria-label="Rooms per page"
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {PER_PAGE_OPTIONS.map(n => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(safePage - 1)}
                    disabled={safePage === 1}
                    aria-label="Previous page"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-40 disabled:hover:bg-white"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>

                  {pageNumbers.map((p, i) =>
                    p === '…' ? (
                      <span key={`gap-${i}`} className="px-1 text-xs text-gray-400 select-none">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        aria-current={p === safePage ? 'page' : undefined}
                        className={`inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-lg text-xs font-semibold transition-colors ${
                          p === safePage
                            ? 'bg-indigo-600 text-white'
                            : 'border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => setPage(safePage + 1)}
                    disabled={safePage === totalPages}
                    aria-label="Next page"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors disabled:opacity-40 disabled:hover:bg-white"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
