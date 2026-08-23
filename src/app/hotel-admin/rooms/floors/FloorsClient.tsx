'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Pencil, Trash2, Layers, Check, X, Loader2, Building2 } from 'lucide-react'

type Floor = { id: string; floor_number: number; name: string }

function floorLabel(n: number) {
  return n === 0 ? 'Ground Floor' : `Floor ${n}`
}

export default function FloorsClient({ initial }: { initial: Floor[] }) {
  const [floors, setFloors]   = useState<Floor[]>(initial)
  const [editId, setEditId]   = useState<string | null>(null)
  const [editNum, setEditNum] = useState('')
  const [editName, setEditName] = useState('')
  const [saving, setSaving]   = useState(false)

  // Add form state
  const [addNum,  setAddNum]  = useState('')
  const [addName, setAddName] = useState('')
  const [adding,  setAdding]  = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const startEdit = (f: Floor) => {
    setEditId(f.id)
    setEditNum(String(f.floor_number))
    setEditName(f.name)
  }

  const cancelEdit = () => { setEditId(null); setEditNum(''); setEditName('') }

  const saveEdit = async () => {
    const num = parseInt(editNum, 10)
    if (isNaN(num) || num < 0) { toast.error('Floor number must be 0 or above'); return }
    if (!editName.trim()) { toast.error('Floor name is required'); return }
    setSaving(true)
    const res = await fetch(`/api/admin/floors/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ floor_number: num, name: editName.trim() }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { toast.error(json.error ?? 'Failed to update floor'); return }
    setFloors(prev => prev.map(f => f.id === editId ? json : f).sort((a, b) => a.floor_number - b.floor_number))
    toast.success('Floor updated')
    cancelEdit()
  }

  const addFloor = async () => {
    const num = parseInt(addNum, 10)
    if (isNaN(num) || num < 0) { toast.error('Floor number must be 0 or above'); return }
    if (!addName.trim()) { toast.error('Floor name is required'); return }
    setAdding(true)
    const res = await fetch('/api/admin/floors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ floor_number: num, name: addName.trim() }),
    })
    const json = await res.json()
    setAdding(false)
    if (!res.ok) { toast.error(json.error ?? 'Failed to add floor'); return }
    setFloors(prev => [...prev, json].sort((a, b) => a.floor_number - b.floor_number))
    toast.success(`Floor added`)
    setAddNum(''); setAddName('')
  }

  const deleteFloor = async (id: string) => {
    setDeletingId(id)
    const res = await fetch(`/api/admin/floors/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      toast.error(json.error ?? 'Failed to delete floor')
      return
    }
    setFloors(prev => prev.filter(f => f.id !== id))
    toast.success('Floor removed')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/hotel-admin/rooms" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Floor Management</h2>
          <p className="text-gray-500 text-sm mt-0.5">Define floors so rooms can be assigned by name</p>
        </div>
      </div>

      {/* Add floor card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center flex-shrink-0">
            <Plus className="h-4 w-4" />
          </div>
          <h3 className="font-semibold text-gray-900 text-sm">Add New Floor</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-[120px_1fr_auto] gap-3 items-end">
            <div>
              <label className="label">Floor No. <span className="text-red-500">*</span></label>
              <input
                type="number"
                min={0}
                value={addNum}
                onChange={e => setAddNum(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addFloor()}
                placeholder="0"
                className="input"
              />
              <p className="text-[10px] text-gray-400 mt-1">0 = Ground</p>
            </div>
            <div>
              <label className="label">Floor Name <span className="text-red-500">*</span></label>
              <input
                value={addName}
                onChange={e => setAddName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addFloor()}
                placeholder="e.g. Ground Floor, Lobby Level, Penthouse"
                className="input"
              />
            </div>
            <button
              onClick={addFloor}
              disabled={adding || !addNum || !addName.trim()}
              className="btn-primary flex items-center gap-2 h-[42px] px-5 disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Floor list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Layers className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">
              Your Floors
              {floors.length > 0 && <span className="ml-2 text-xs font-normal text-gray-400">({floors.length})</span>}
            </h3>
          </div>
        </div>

        {floors.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No floors yet — add your first one above.</p>
            <p className="text-xs text-gray-400 mt-1">Tip: start with floor 0 (Ground Floor).</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {floors.map(f => (
              <div key={f.id} className="px-5 py-3">
                {editId === f.id ? (
                  /* Edit row */
                  <div className="grid grid-cols-[120px_1fr_auto] gap-3 items-center">
                    <input
                      type="number"
                      min={0}
                      value={editNum}
                      onChange={e => setEditNum(e.target.value)}
                      className="input text-sm"
                    />
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit()}
                      className="input text-sm"
                      autoFocus
                    />
                    <div className="flex items-center gap-1.5">
                      <button onClick={saveEdit} disabled={saving}
                        className="p-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50">
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={cancelEdit}
                        className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display row */
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-gray-600">{f.floor_number}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{f.name}</p>
                      <p className="text-xs text-gray-400">{floorLabel(f.floor_number)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => startEdit(f)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteFloor(f.id)}
                        disabled={deletingId === f.id}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                      >
                        {deletingId === f.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center pb-4">
        Floor numbers are used to group and sort rooms throughout the app.
        Deleting a floor does not affect rooms already assigned to that floor number.
      </p>
    </div>
  )
}
