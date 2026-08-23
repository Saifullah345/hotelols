'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, X, Plus, Users, Baby } from 'lucide-react'

export type RoomTypeRecord = {
  id: string
  name: string
  description: string | null
  max_adults: number
  max_children: number
  amenities: string[]
}

// Subset used by the room form (max_adults/max_children for capacity sync)
export type CreatedRoomType = Pick<RoomTypeRecord, 'id' | 'name' | 'max_adults' | 'max_children'>

const PRESET_AMENITIES = [
  'WiFi', 'Air Conditioning', 'TV', 'Mini Bar', 'Safe',
  'Hair Dryer', 'Balcony', 'Sea View', 'Kitchen',
  'Jacuzzi', 'Bathtub', 'Coffee Maker', 'Workspace', 'Sofa',
]

export function AmenityPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [custom, setCustom] = useState('')

  const toggle = (a: string) =>
    onChange(value.includes(a) ? value.filter(x => x !== a) : [...value, a])

  const addCustom = () => {
    const trimmed = custom.trim()
    if (!trimmed) return
    if (trimmed.length > 50) { toast.error('Amenity name is too long (max 50 characters)'); return }
    if (/<[^>]+>/.test(trimmed) || /[<>"'`;={}[\]\\|^%*!@~+?]/.test(trimmed)) {
      toast.error('Amenity contains invalid characters'); return
    }
    if (!value.map(x => x.toLowerCase()).includes(trimmed.toLowerCase())) {
      onChange([...value, trimmed])
    }
    setCustom('')
  }

  const customSelected = value.filter(a => !PRESET_AMENITIES.includes(a))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PRESET_AMENITIES.map(a => {
          const on = value.includes(a)
          return (
            <button key={a} type="button" onClick={() => toggle(a)}
              className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                on
                  ? 'bg-primary-50 border-primary-400 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-primary-200 hover:text-primary-600'
              }`}>
              {a}
            </button>
          )
        })}
      </div>

      {customSelected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100">
          {customSelected.map(a => (
            <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
              {a}
              <button type="button" onClick={() => toggle(a)} className="text-violet-400 hover:text-violet-700">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          placeholder="Add custom amenity…"
          className="input flex-1 text-sm"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!custom.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
    </div>
  )
}

export default function RoomTypeModal({
  open,
  onClose,
  onSaved,
  initial,
}: {
  hotelId?: string
  open: boolean
  onClose: () => void
  onSaved: (type: RoomTypeRecord) => void
  initial?: RoomTypeRecord | null
}) {
  const isEdit = !!initial

  const [name,        setName]        = useState(initial?.name        ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [maxAdults,   setMaxAdults]   = useState(initial?.max_adults  ?? 2)
  const [maxChildren, setMaxChildren] = useState(initial?.max_children ?? 1)
  const [amenities,   setAmenities]   = useState<string[]>(initial?.amenities ?? [])
  const [saving,      setSaving]      = useState(false)

  const resetForm = () => {
    setName(''); setDescription(''); setMaxAdults(2); setMaxChildren(1); setAmenities([])
  }

  const close = () => { if (saving) return; if (!isEdit) resetForm(); onClose() }

  const save = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) { toast.error('Name is required'); return }
    if (trimmedName.length < 2) { toast.error('Name must be at least 2 characters'); return }
    if (trimmedName.length > 60) { toast.error('Name is too long (max 60 characters)'); return }
    if (/<[^>]+>/.test(trimmedName) || /[<>"'`;={}[\]\\|^%*!@~+?]/.test(trimmedName)) {
      toast.error('Name contains invalid characters'); return
    }
    if (!/[a-zA-ZÀ-ɏ]/.test(trimmedName)) { toast.error('Name must include at least one letter'); return }
    if (maxAdults < 1) { toast.error('Max adults must be at least 1'); return }

    setSaving(true)
    const url    = isEdit ? `/api/room-types/${initial!.id}` : '/api/room-types'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: trimmedName,
        description: description.trim() || null,
        max_adults: maxAdults,
        max_children: maxChildren,
        amenities,
      }),
    })
    const json = await res.json()
    setSaving(false)

    if (!res.ok) {
      const isDuplicate = typeof json.error === 'string' && json.error.toLowerCase().includes('unique')
      toast.error(isDuplicate ? `A room type named "${trimmedName}" already exists` : (json.error ?? 'Failed to save'))
      return
    }

    toast.success(isEdit ? 'Room type updated' : `Room type "${json.name}" created`)
    if (!isEdit) resetForm()
    onSaved(json as RoomTypeRecord)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && close()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{isEdit ? 'Edit Room Type' : 'New Room Type'}</h3>
          <button onClick={close} disabled={saving} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="label">Type Name <span className="text-red-400">*</span></label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save() } }}
              className="input"
              placeholder="e.g. Deluxe Suite"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="label">Description <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="input resize-none"
              placeholder="Brief description of this room type…"
            />
          </div>

          {/* Capacity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">
                <Users className="h-3.5 w-3.5 inline mr-1 text-gray-400" />
                Max Adults
              </label>
              <input
                type="number"
                value={maxAdults}
                min={1}
                max={20}
                onChange={e => {
                  const v = parseInt(e.target.value, 10)
                  setMaxAdults(isNaN(v) ? 1 : Math.max(1, Math.min(20, v)))
                }}
                className="input"
              />
            </div>
            <div>
              <label className="label">
                <Baby className="h-3.5 w-3.5 inline mr-1 text-gray-400" />
                Max Children
              </label>
              <input
                type="number"
                value={maxChildren}
                min={0}
                max={20}
                onChange={e => {
                  const v = parseInt(e.target.value, 10)
                  setMaxChildren(isNaN(v) ? 0 : Math.max(0, Math.min(20, v)))
                }}
                className="input"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 -mt-2">
            Total capacity: <strong className="text-gray-600">{maxAdults + maxChildren} guests</strong>
          </p>

          {/* Amenities */}
          <div>
            <label className="label">Amenities</label>
            <AmenityPicker value={amenities} onChange={setAmenities} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-100">
          <button
            onClick={close}
            disabled={saving}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Type'}
          </button>
        </div>
      </div>
    </div>
  )
}
