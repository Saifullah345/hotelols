'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Plus, LayoutList, LayoutGrid, Trash2, Play,
  CheckCircle2, Loader2, X, SprayCan, Pencil,
  Clock, AlertCircle, AlertTriangle,
} from 'lucide-react'
import type { HKTask, RoomOption, StaffOption } from './page'
import Pagination from '@/components/admin/Pagination'

// ── Input sanitization ────────────────────────────────────────────────────
function sanitizeText(value: string) {
  return value.replace(/<[^>]*>/g, '').replace(/[<>]/g, '')
}

// Task descriptions: letters, digits, spaces, and minimal safe punctuation.
// Dashes, slashes, and quotes are blocked — they appear in garbled/injected input
// but are not needed for real task descriptions like "Full turnover clean".
function sanitizeTaskText(value: string) {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[^a-zA-ZÀ-ɏ0-9\s.,!?():&]/g, '')
}

// Assignee free-text: only letters (including accented), spaces, hyphens, apostrophes
function sanitizeAssignee(value: string) {
  return value.replace(/[^a-zA-ZÀ-ɏ\s'\-]/g, '')
}

function hasMeaningfulContent(value: string) {
  // Must contain at least 3 letters/digits — rejects near-pure special-char input
  const matches = value.match(/[a-zA-Z0-9À-ɏ]/g)
  return matches !== null && matches.length >= 3
}

// ── Badge styles ──────────────────────────────────────────────────────────
const PRIORITY_CLS: Record<string, string> = {
  normal: 'bg-blue-50  text-blue-600  border border-blue-200',
  high:   'bg-orange-50 text-orange-600 border border-orange-200',
  urgent: 'bg-pink-50  text-pink-600  border border-pink-200',
}

const STATUS_CLS: Record<string, string> = {
  dirty:       'bg-pink-50  text-pink-600  border border-pink-200',
  in_progress: 'bg-amber-50 text-amber-700 border border-amber-200',
  clean:       'bg-teal-50  text-teal-600  border border-teal-200',
}

const STATUS_LABEL: Record<string, string> = {
  dirty: 'Dirty',
  in_progress: 'In Progress',
  clean: 'Clean',
}

// ── Form ─────────────────────────────────────────────────────────────────
type TaskForm = {
  room_id: string
  task: string
  priority: 'normal' | 'high' | 'urgent'
  assignee: string
  due_date: string
  notes: string
}

const EMPTY: TaskForm = {
  room_id: '',
  task: '',
  priority: 'normal',
  assignee: '',
  due_date: new Date().toISOString().split('T')[0],
  notes: '',
}

interface Props {
  initialTasks: HKTask[]
  rooms: RoomOption[]
  staff: StaffOption[]
  tenantId: string
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export default function HousekeepingClient({ initialTasks, rooms, staff, tenantId }: Props) {
  const router = useRouter()
  const [tasks, setTasks]       = useState<HKTask[]>(initialTasks)
  const [view, setView]         = useState<'list' | 'grid'>('list')
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState<TaskForm>(EMPTY)
  const [editModal, setEditModal]   = useState(false)
  const [editTarget, setEditTarget] = useState<HKTask | null>(null)
  const [editForm, setEditForm]     = useState<TaskForm>(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [busyId, setBusyId]     = useState<string | null>(null)

  // ── Pagination ─────────────────────────────────────────────────
  const [page, setPage]       = useState(1)
  const [perPage, setPerPage] = useState(10)

  useEffect(() => { setPage(1) }, [perPage])

  // Clamp instead of storing — finishing a task can shrink the list under us.
  const safePage = Math.min(page, Math.max(1, Math.ceil(tasks.length / perPage)))
  const paged    = tasks.slice((safePage - 1) * perPage, (safePage - 1) * perPage + perPage)

  const openTasks    = tasks.filter(t => t.status !== 'clean').length
  const awaitClean   = tasks.filter(t => t.status === 'dirty').length

  const cleanCount   = tasks.filter(t => t.status === 'clean').length
  const inProgCount  = tasks.filter(t => t.status === 'in_progress').length
  const dirtyCount   = tasks.filter(t => t.status === 'dirty').length
  const todayStr     = new Date().toISOString().split('T')[0]
  const overdueCount = tasks.filter(t => t.status !== 'clean' && t.due_date < todayStr).length

  function setF<K extends keyof TaskForm>(k: K, v: TaskForm[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  // ── Add task ─────────────────────────────────────────────────────────
  const handleAdd = async () => {
    const taskText = sanitizeTaskText(form.task.trim())
    if (!form.room_id)                    { toast.error('Please select a room'); return }
    if (!taskText)                        { toast.error('Task description is required'); return }
    if (taskText.length < 3)              { toast.error('Task description is too short'); return }
    if (taskText.length > 150)            { toast.error('Task description is too long (max 150 characters)'); return }
    if (!hasMeaningfulContent(taskText))  { toast.error('Task description must contain meaningful text'); return }
    if (!form.assignee)                   { toast.error('Please assign this task to a staff member'); return }
    if (!form.due_date)                   { toast.error('Due date is required'); return }
    setSaving(true)
    const supabase = createClient()
    const roomMatch = rooms.find(r => r.id === form.room_id)
    const roomNum   = roomMatch ? (roomMatch.name ?? `Room ${roomMatch.room_number}`) : '—'
    const notesText = sanitizeText(form.notes.trim())

    const { data, error } = await supabase.from('housekeeping_tasks').insert({
      hotel_id:  tenantId,
      room_id:   form.room_id || null,
      task:      taskText,
      priority:  form.priority,
      assignee:  form.assignee.trim(),
      due_date:  form.due_date,
      notes:     notesText || null,
      status:    'dirty',
    }).select().single()

    if (error) { toast.error(error.message); setSaving(false); return }

    setTasks(prev => [{
      id: data.id, hotel_id: tenantId,
      room_id: form.room_id || null, room_number: roomNum,
      task: taskText, priority: form.priority,
      assignee: form.assignee.trim(), due_date: form.due_date,
      status: 'dirty', notes: notesText,
    }, ...prev])
    toast.success('Task added')
    setModal(false)
    setForm(EMPTY)
    setSaving(false)
  }

  // ── Status transition ─────────────────────────────────────────────────
  const changeStatus = async (taskId: string, next: 'in_progress' | 'clean') => {
    setBusyId(taskId)
    const supabase = createClient()
    const { error } = await supabase
      .from('housekeeping_tasks').update({ status: next }).eq('id', taskId)

    if (error) {
      toast.error(error.message)
    } else {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: next } : t))
      if (next === 'clean') {
        const t = tasks.find(x => x.id === taskId)
        if (t?.room_id) {
          await supabase.from('rooms').update({ status: 'available' }).eq('id', t.room_id)
        }
        toast.success('Room marked clean — status updated!')
      } else {
        toast.success('Task started')
      }
      router.refresh()
    }
    setBusyId(null)
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  const deleteTask = async (taskId: string) => {
    setBusyId(taskId)
    const supabase = createClient()
    const { error } = await supabase.from('housekeeping_tasks').delete().eq('id', taskId)
    if (error) { toast.error(error.message) } else {
      setTasks(prev => prev.filter(t => t.id !== taskId))
      toast.success('Task removed')
    }
    setBusyId(null)
  }

  // ── Edit task ─────────────────────────────────────────────────────────
  function openEdit(task: HKTask) {
    setEditTarget(task)
    setEditForm({
      room_id:   task.room_id ?? '',
      task:      task.task,
      priority:  task.priority as TaskForm['priority'],
      assignee:  task.assignee,
      due_date:  task.due_date,
      notes:     task.notes ?? '',
    })
    setEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editTarget) return
    const taskText = sanitizeTaskText(editForm.task.trim())
    if (!editForm.room_id)               { toast.error('Please select a room'); return }
    if (!taskText)                        { toast.error('Task description is required'); return }
    if (taskText.length < 3)             { toast.error('Task description is too short'); return }
    if (taskText.length > 150)           { toast.error('Task description is too long (max 150 characters)'); return }
    if (!hasMeaningfulContent(taskText)) { toast.error('Task description must contain meaningful text'); return }
    if (!editForm.assignee)              { toast.error('Please assign this task to a staff member'); return }
    if (!editForm.due_date)              { toast.error('Due date is required'); return }
    const notesText = sanitizeText(editForm.notes.trim())
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('housekeeping_tasks').update({
      room_id:  editForm.room_id || null,
      task:     taskText,
      priority: editForm.priority,
      assignee: editForm.assignee.trim(),
      due_date: editForm.due_date,
      notes:    notesText || null,
    }).eq('id', editTarget.id)
    if (error) { toast.error(error.message); setSaving(false); return }
    const roomMatch = rooms.find(r => r.id === editForm.room_id)
    const roomNum   = roomMatch ? (roomMatch.name ?? `Room ${roomMatch.room_number}`) : editTarget.room_number
    setTasks(prev => prev.map(t => t.id !== editTarget.id ? t : {
      ...t,
      room_id:     editForm.room_id || null,
      room_number: roomNum,
      task:        taskText,
      priority:    editForm.priority,
      assignee:    editForm.assignee.trim(),
      due_date:    editForm.due_date,
      notes:       notesText,
    }))
    toast.success('Task updated')
    setEditModal(false)
    setEditTarget(null)
    setSaving(false)
  }

  function setEF<K extends keyof TaskForm>(k: K, v: TaskForm[K]) {
    setEditForm(f => ({ ...f, [k]: v }))
  }

  // ── Shared input styles ───────────────────────────────────────────────
  const lbl = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'
  const fi  = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-300'

  // ── Action button in table ────────────────────────────────────────────
  const ActionBtn = ({ task }: { task: HKTask }) => {
    const busy = busyId === task.id
    if (task.status === 'dirty') return (
      <button
        onClick={() => changeStatus(task.id, 'in_progress')}
        disabled={busy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors disabled:opacity-60 shadow-sm"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-white" />}
        Start
      </button>
    )
    if (task.status === 'in_progress') return (
      <button
        onClick={() => changeStatus(task.id, 'clean')}
        disabled={busy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors disabled:opacity-60 shadow-sm"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
        Mark Done
      </button>
    )
    return null
  }

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Housekeeping</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {openTasks} open task{openTasks !== 1 ? 's' : ''}
            {awaitClean > 0 && ` · ${awaitClean} room${awaitClean !== 1 ? 's' : ''} awaiting clean`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded-lg transition-colors ${view === 'list' ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
              title="List view"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded-lg transition-colors ${view === 'grid' ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => { setForm(EMPTY); setModal(true) }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-semibold text-sm transition-colors shadow-sm shadow-primary-200"
          >
            <Plus className="h-4 w-4" /> New Task
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Clean */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Clean Rooms</span>
            <div className="p-1.5 bg-teal-50 rounded-xl">
              <CheckCircle2 className="h-4 w-4 text-teal-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tabular-nums">{cleanCount}</p>
          <p className="text-xs text-teal-600 font-medium">Ready for guests</p>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">In Progress</span>
            <div className="p-1.5 bg-amber-50 rounded-xl">
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tabular-nums">{inProgCount}</p>
          <p className="text-xs text-amber-600 font-medium">Being cleaned now</p>
        </div>

        {/* Dirty / Pending */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Dirty / Pending</span>
            <div className="p-1.5 bg-pink-50 rounded-xl">
              <AlertCircle className="h-4 w-4 text-pink-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900 tabular-nums">{dirtyCount}</p>
          <p className="text-xs text-pink-600 font-medium">Awaiting assignment</p>
        </div>

        {/* Overdue */}
        <div className={`rounded-2xl border shadow-sm p-4 flex flex-col gap-3 ${overdueCount > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Overdue</span>
            <div className={`p-1.5 rounded-xl ${overdueCount > 0 ? 'bg-red-100' : 'bg-gray-50'}`}>
              <AlertTriangle className={`h-4 w-4 ${overdueCount > 0 ? 'text-red-500' : 'text-gray-400'}`} />
            </div>
          </div>
          <p className={`text-3xl font-bold tabular-nums ${overdueCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>{overdueCount}</p>
          <p className={`text-xs font-medium ${overdueCount > 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {overdueCount > 0 ? 'Past due date' : 'All on schedule'}
          </p>
        </div>
      </div>

      {/* ══ LIST VIEW ══════════════════════════════════════════════════════ */}
      {view === 'list' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {['Room', 'Task', 'Priority', 'Assignee', 'Due', 'Status', 'Actions'].map((col, i) => (
                    <th
                      key={col}
                      className={`text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] px-5 py-3.5 ${i === 6 ? 'text-right' : 'text-left'}`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <SprayCan className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-400">No housekeeping tasks</p>
                      <p className="text-xs text-gray-300 mt-1">Click &quot;New Task&quot; to add the first one</p>
                    </td>
                  </tr>
                ) : paged.map(task => {
                  const busy = busyId === task.id
                  return (
                    <tr key={task.id} className="hover:bg-gray-50/50 transition-colors">

                      {/* Room */}
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-sm text-gray-900">
                          {task.room_number}
                        </span>
                      </td>

                      {/* Task */}
                      <td className="px-5 py-3.5 max-w-[220px]">
                        <p className="text-sm text-gray-800 truncate">{task.task}</p>
                        {task.notes && (
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">{task.notes}</p>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${PRIORITY_CLS[task.priority]}`}>
                          {task.priority}
                        </span>
                      </td>

                      {/* Assignee */}
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-gray-700">{task.assignee || '—'}</span>
                      </td>

                      {/* Due */}
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-gray-500 tabular-nums">{fmtDate(task.due_date)}</span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_CLS[task.status]}`}>
                          {STATUS_LABEL[task.status]}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <ActionBtn task={task} />
                          <button
                            onClick={() => openEdit(task)}
                            disabled={busy}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                            title="Edit task"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            disabled={busy}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Delete task"
                          >
                            {busy && !['dirty','in_progress'].includes(task.status)
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            onPage={setPage}
            perPage={perPage}
            onPerPage={setPerPage}
            total={tasks.length}
            noun="task"
          />
        </div>
      )}

      {/* ══ GRID VIEW ══════════════════════════════════════════════════════ */}
      {view === 'grid' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tasks.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-16 text-center">
                <SprayCan className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-400">No housekeeping tasks</p>
              </div>
            ) : paged.map(task => {
              const busy = busyId === task.id
              return (
                <div key={task.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 text-sm">{task.room_number}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.task}</p>
                    </div>
                    <span className={`flex-shrink-0 inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${PRIORITY_CLS[task.priority]}`}>
                      {task.priority}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{task.assignee || 'Unassigned'}</span>
                    <span className="tabular-nums">{fmtDate(task.due_date)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_CLS[task.status]}`}>
                      {STATUS_LABEL[task.status]}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {task.status === 'dirty' && (
                        <button
                          onClick={() => changeStatus(task.id, 'in_progress')}
                          disabled={busy}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-[11px] font-semibold transition-colors disabled:opacity-60"
                        >
                          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-white" />}
                          Start
                        </button>
                      )}
                      {task.status === 'in_progress' && (
                        <button
                          onClick={() => changeStatus(task.id, 'clean')}
                          disabled={busy}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-[11px] font-semibold transition-colors disabled:opacity-60"
                        >
                          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                          Done
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(task)}
                        disabled={busy}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        title="Edit task"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        disabled={busy}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <Pagination
              page={page}
              onPage={setPage}
              perPage={perPage}
              onPerPage={setPerPage}
              total={tasks.length}
              noun="task"
            />
          </div>
        </div>
      )}

      {/* ══ NEW TASK MODAL ════════════════════════════════════════════════ */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">New Task</h3>
              <button
                onClick={() => setModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">

              {/* Room */}
              <div>
                <label className={lbl}>Room *</label>
                <select value={form.room_id} onChange={e => setF('room_id', e.target.value)} className={fi}>
                  <option value="">Select a room…</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name ?? `Room ${r.room_number}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task */}
              <div>
                <label className={lbl}>Task Description *</label>
                <input
                  value={form.task}
                  onChange={e => setF('task', sanitizeTaskText(e.target.value))}
                  maxLength={150}
                  className={fi}
                  placeholder="Full turnover clean, Linen change…"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Priority */}
                <div>
                  <label className={lbl}>Priority</label>
                  <select value={form.priority} onChange={e => setF('priority', e.target.value as TaskForm['priority'])} className={fi}>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                {/* Due date */}
                <div>
                  <label className={lbl}>Due Date *</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={e => setF('due_date', e.target.value)}
                    className={fi}
                  />
                </div>
              </div>

              {/* Assignee */}
              <div>
                <label className={lbl}>Assignee *</label>
                {staff.length > 0 ? (
                  <select value={form.assignee} onChange={e => setF('assignee', e.target.value)} className={fi}>
                    <option value="">Unassigned</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={form.assignee}
                    onChange={e => setF('assignee', sanitizeAssignee(e.target.value))}
                    maxLength={80}
                    className={fi}
                    placeholder="Assignee name…"
                  />
                )}
              </div>

              {/* Notes */}
              <div>
                <label className={lbl}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setF('notes', sanitizeText(e.target.value))}
                  rows={2}
                  maxLength={500}
                  className={`${fi} resize-none`}
                  placeholder="Additional instructions…"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm transition-colors disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ EDIT TASK MODAL ══════════════════════════════════════════════ */}
      {editModal && editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Edit Task</h3>
              <button
                onClick={() => { setEditModal(false); setEditTarget(null) }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Room */}
              <div>
                <label className={lbl}>Room *</label>
                <select value={editForm.room_id} onChange={e => setEF('room_id', e.target.value)} className={fi}>
                  <option value="">Select a room…</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name ?? `Room ${r.room_number}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task description */}
              <div>
                <label className={lbl}>Task Description *</label>
                <input
                  value={editForm.task}
                  onChange={e => setEF('task', sanitizeTaskText(e.target.value))}
                  maxLength={200}
                  className={fi}
                  placeholder="Full turnover clean, Linen change…"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Priority */}
                <div>
                  <label className={lbl}>Priority</label>
                  <select value={editForm.priority} onChange={e => setEF('priority', e.target.value as TaskForm['priority'])} className={fi}>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                {/* Due date */}
                <div>
                  <label className={lbl}>Due Date *</label>
                  <input
                    type="date"
                    value={editForm.due_date}
                    onChange={e => setEF('due_date', e.target.value)}
                    className={fi}
                  />
                </div>
              </div>

              {/* Assignee */}
              <div>
                <label className={lbl}>Assignee *</label>
                {staff.length > 0 ? (
                  <select value={editForm.assignee} onChange={e => setEF('assignee', e.target.value)} className={fi}>
                    <option value="">Unassigned</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={editForm.assignee}
                    onChange={e => setEF('assignee', sanitizeAssignee(e.target.value))}
                    maxLength={80}
                    className={fi}
                    placeholder="Assignee name…"
                  />
                )}
              </div>

              {/* Notes */}
              <div>
                <label className={lbl}>Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEF('notes', sanitizeText(e.target.value))}
                  rows={2}
                  maxLength={500}
                  className={`${fi} resize-none`}
                  placeholder="Additional instructions…"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => { setEditModal(false); setEditTarget(null) }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm transition-colors disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
