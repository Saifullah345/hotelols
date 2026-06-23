'use client'

import { Bell, CheckCheck, Loader2, Calendar, CreditCard, Users, Info } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Notification } from '@/types'

const typeIcon: Record<Notification['type'], React.ElementType> = {
  booking: Calendar,
  payment: CreditCard,
  staff: Users,
  system: Info,
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function NotificationBell({ userId }: { userId?: string }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    setItems((data as Notification[]) ?? [])
    setLoading(false)
  }, [userId])

  // Initial load so the unread badge is accurate before the panel is opened.
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const unread = items.filter(i => !i.read).length

  const markRead = async (id: string) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, read: true } : i)))
    await createClient().from('notifications').update({ read: true }).eq('id', id)
  }

  const markAll = async () => {
    if (!userId || unread === 0) return
    setItems(prev => prev.map(i => ({ ...i, read: true })))
    await createClient().from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
  }

  const toggle = () => {
    setOpen(o => !o)
    if (!open) load()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">
              Notifications {unread > 0 && <span className="text-gray-400 font-normal">({unread} new)</span>}
            </p>
            {unread > 0 && (
              <button
                onClick={markAll}
                className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="px-4 py-10 text-center">
                <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No notifications yet</p>
              </div>
            )}

            {!loading && items.map(n => {
              const Icon = typeIcon[n.type] ?? Info
              return (
                <button
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`w-full flex gap-3 px-4 py-3 text-left border-b border-gray-50 last:border-0 transition-colors ${
                    n.read ? 'hover:bg-gray-50' : 'bg-primary-50/50 hover:bg-primary-50'
                  }`}
                >
                  <span className={`mt-0.5 h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${
                    n.read ? 'bg-gray-100 text-gray-400' : 'bg-primary-100 text-primary-600'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${n.read ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                        {n.title}
                      </span>
                      {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary-600" />}
                    </span>
                    <span className="block text-xs text-gray-500 line-clamp-2">{n.message}</span>
                    <span className="block text-[11px] text-gray-400 mt-0.5">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
