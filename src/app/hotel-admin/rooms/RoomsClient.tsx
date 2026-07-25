'use client'

import { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Plus, BedDouble, Search, Pencil, Users, X, GripVertical } from 'lucide-react'
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

export default function RoomsClient({
  rooms: initialRooms,
  roomTypes,
  currency,
}: {
  rooms: Room[]
  roomTypes: RoomType[]
  currency: string
}) {
  const [rooms, setRooms]       = useState<Room[]>(initialRooms)
  const [saving, setSaving]     = useState(false)
  const [dragId, setDragId]     = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [q, setQ]               = useState('')
  const [status, setStatus]     = useState('')
  const [typeId, setTypeId]     = useState('')
  const saveTimer               = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasFilter = !!(q || status || typeId)

  const filtered = useMemo(() => {
    const lq = q.toLowerCase()
    return rooms.filter(room => {
      if (status && room.status !== status) return false
      if (typeId && room.room_type_id !== typeId) return false
      if (lq && !room.room_number.toLowerCase().includes(lq) && !(room.name?.toLowerCase().includes(lq))) return false
      return true
    })
  }, [rooms, q, status, typeId])

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rooms</h2>
          <p className="text-gray-500 text-sm mt-1">
            {rooms.length} total
            {filtered.length !== rooms.length && ` · ${filtered.length} shown`}
            {saving && <span className="ml-2 text-indigo-500">Saving…</span>}
          </p>
        </div>
        <Link href="/hotel-admin/rooms/new" className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" /> Add Room
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Available',   count: available,   color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'Occupied',    count: booked,      color: 'bg-blue-50 text-blue-700 border-blue-200'          },
          { label: 'Maintenance', count: maintenance, color: 'bg-red-50 text-red-700 border-red-200'             },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-sm font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search name or number…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={typeId}
          onChange={e => setTypeId(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">All Types</option>
          {roomTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        {hasFilter && (
          <button onClick={clearAll} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition-colors">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {!hasFilter && rooms.length > 1 && (
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <GripVertical className="h-3.5 w-3.5" /> Drag rows to reorder — order is shown to customers.
        </p>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {!hasFilter && <th className="table-header w-8" />}
                <th className="table-header">Room</th>
                <th className="table-header">Type</th>
                <th className="table-header">Floor</th>
                <th className="table-header">Capacity</th>
                <th className="table-header">Price / Night</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(room => (
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
                  {/* Grip handle */}
                  {!hasFilter && (
                    <td className="table-cell w-8" onClick={e => e.stopPropagation()}>
                      <GripVertical className="h-4 w-4 text-gray-300 cursor-grab active:cursor-grabbing" />
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
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <DeleteRoomButton roomId={room.id} roomNumber={room.room_number} />
                  </ActionsCell>
                </RoomRow>
              ))}

              {!filtered.length && (
                <tr>
                  <td colSpan={hasFilter ? 7 : 8} className="px-4 py-14 text-center">
                    <BedDouble className="h-9 w-9 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">
                      {hasFilter ? 'No rooms match your filters.' : 'No rooms yet.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
