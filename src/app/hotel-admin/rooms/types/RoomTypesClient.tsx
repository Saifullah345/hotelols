'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Plus, Pencil, Trash2, Loader2, X, Tag,
  Users, Baby, AlertTriangle, BedDouble, ArrowLeft,
} from 'lucide-react'
import RoomTypeModal, { type RoomTypeRecord } from '../RoomTypeModal'

export type RoomType = RoomTypeRecord

// ── Delete Confirmation Modal ────────────────────────────────────────
function DeleteModal({
  type,
  onClose,
  onDeleted,
}: {
  type: RoomType
  onClose: () => void
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  const del = async () => {
    setDeleting(true)
    const res  = await fetch(`/api/room-types/${type.id}`, { method: 'DELETE' })
    const json = await res.json()
    setDeleting(false)
    if (!res.ok) { toast.error(json.error ?? 'Failed to delete'); return }
    toast.success('Room type deleted')
    onDeleted()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">Delete Room Type</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              <strong className="text-gray-700">{type.name}</strong>
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          This cannot be undone. If rooms are using this type, you must reassign them first.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={deleting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={del} disabled={deleting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Type Card ───────────────────────────────────────────────────────
function TypeCard({ type, onEdit, onDelete }: { type: RoomType; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="card p-4 flex items-start gap-4 group hover:shadow-sm transition-shadow">
      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <BedDouble className="h-4 w-4 text-gray-500" />
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">{type.name}</h3>
          {type.description && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{type.description}</p>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{type.max_adults}A</span>
          <span className="flex items-center gap-1"><Baby className="h-3 w-3" />{type.max_children}C</span>
          <span className="text-gray-300">·</span>
          <span>{type.max_adults + type.max_children} guests total</span>
        </div>

        {type.amenities && type.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {type.amenities.slice(0, 5).map(a => (
              <span key={a} className="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-500">{a}</span>
            ))}
            {type.amenities.length > 5 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-400">+{type.amenities.length - 5}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={onEdit} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────
export default function RoomTypesClient({ initial }: { initial: RoomType[] }) {
  const [types,        setTypes]        = useState<RoomType[]>(initial)
  const [showCreate,   setShowCreate]   = useState(false)
  const [editingType,  setEditingType]  = useState<RoomType | null>(null)
  const [deletingType, setDeletingType] = useState<RoomType | null>(null)

  const onSaved = (saved: RoomType) => {
    setTypes(prev => {
      const idx = prev.findIndex(t => t.id === saved.id)
      return idx >= 0 ? prev.map(t => t.id === saved.id ? saved : t) : [saved, ...prev]
    })
    setShowCreate(false)
    setEditingType(null)
  }

  const onDeleted = () => {
    if (deletingType) setTypes(prev => prev.filter(t => t.id !== deletingType.id))
    setDeletingType(null)
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/hotel-admin/rooms" className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Room Types</h2>
            <p className="text-sm text-gray-500 mt-0.5">{types.length} type{types.length !== 1 ? 's' : ''} defined</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="h-4 w-4" /> New Type
        </button>
      </div>

      {/* Grid */}
      {types.length === 0 ? (
        <div className="card p-16 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Tag className="h-7 w-7 text-gray-400" />
          </div>
          <div>
            <p className="font-semibold text-gray-700">No room types yet</p>
            <p className="text-sm text-gray-400 mt-1">Create your first room type to categorise rooms</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Room Type
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {types.map(t => (
            <TypeCard
              key={t.id}
              type={t}
              onEdit={() => setEditingType(t)}
              onDelete={() => setDeletingType(t)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {(showCreate || editingType) && (
        <RoomTypeModal
          open
          initial={editingType}
          onClose={() => { setShowCreate(false); setEditingType(null) }}
          onSaved={onSaved}
        />
      )}

      {deletingType && (
        <DeleteModal
          type={deletingType}
          onClose={() => setDeletingType(null)}
          onDeleted={onDeleted}
        />
      )}
    </>
  )
}
