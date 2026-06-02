'use client'

import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import {
  MessageCircle, Send, CheckCheck, Check,
  Clock, User, RefreshCw, X, BookOpen,
} from 'lucide-react'
import Link from 'next/link'
import type { WhatsAppConversation, WhatsAppMessage } from '@/types'

type ConvWithMessages = WhatsAppConversation & { messages: WhatsAppMessage[] }

const statusIcon = (s: string) => {
  if (s === 'read')      return <CheckCheck className="h-3 w-3 text-blue-400" />
  if (s === 'delivered') return <CheckCheck className="h-3 w-3 text-gray-400" />
  if (s === 'sent')      return <Check className="h-3 w-3 text-gray-400" />
  return <Clock className="h-3 w-3 text-gray-300" />
}

export default function WhatsAppInboxPage() {
  const [conversations, setConversations] = useState<ConvWithMessages[]>([])
  const [active, setActive]               = useState<ConvWithMessages | null>(null)
  const [reply, setReply]                 = useState('')
  const [sending, setSending]             = useState(false)
  const [loading, setLoading]             = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchConversations = async () => {
    const res  = await fetch('/api/admin/whatsapp/conversations')
    const data = await res.json()
    if (res.ok) {
      const sorted = (data as ConvWithMessages[]).map(c => ({
        ...c,
        messages: [...(c.messages ?? [])].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        ),
      }))
      setConversations(sorted)
      if (active) {
        const updated = sorted.find(c => c.id === active.id)
        if (updated) setActive(updated)
      }
    }
    setLoading(false)
  }

  useEffect(() => { fetchConversations() }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active?.messages])

  const sendReply = async () => {
    if (!reply.trim() || !active) return
    setSending(true)
    const res = await fetch('/api/admin/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: active.id, message: reply }),
    })
    setSending(false)
    if (!res.ok) { toast.error('Failed to send message'); return }
    setReply('')
    await fetchConversations()
  }

  const resolveConversation = async (conv: ConvWithMessages) => {
    const res = await fetch('/api/admin/whatsapp/conversations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: conv.id, status: conv.status === 'open' ? 'resolved' : 'open' }),
    })
    if (res.ok) {
      toast.success(conv.status === 'open' ? 'Marked as resolved' : 'Reopened')
      await fetchConversations()
    }
  }

  const openCount = conversations.filter(c => c.status === 'open').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* ── Conversation list ── */}
      <div className="w-80 flex-shrink-0 flex flex-col card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-600" /> WhatsApp
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{openCount} open conversation{openCount !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={fetchConversations} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {conversations.length === 0 && (
            <div className="p-6 text-center text-gray-500 text-sm">
              No conversations yet.<br />
              <span className="text-xs text-gray-400">Incoming WhatsApp messages will appear here.</span>
            </div>
          )}
          {conversations.map(conv => {
            const lastMsg = conv.messages[conv.messages.length - 1]
            const isActive = active?.id === conv.id
            return (
              <button
                key={conv.id}
                onClick={() => setActive(conv)}
                className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${isActive ? 'bg-green-50' : ''}`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm flex-shrink-0">
                    {conv.guest_name?.[0]?.toUpperCase() ?? <User className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conv.guest_name ?? conv.guest_phone}
                      </p>
                      <span className="text-xs text-gray-400 shrink-0">
                        {new Date(conv.last_message_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {lastMsg ? lastMsg.content : 'No messages'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                        conv.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {conv.status}
                      </span>
                      {conv.booking_id && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-600">
                          <BookOpen className="h-2.5 w-2.5 mr-0.5" /> booked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Chat area ── */}
      {active ? (
        <div className="flex-1 flex flex-col card overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold">
                {active.guest_name?.[0]?.toUpperCase() ?? <User className="h-4 w-4" />}
              </div>
              <div>
                <p className="font-medium text-gray-900">{active.guest_name ?? 'Unknown Guest'}</p>
                <p className="text-xs text-gray-500">{active.guest_phone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {active.booking_id && (
                <Link
                  href={`/hotel-admin/bookings`}
                  className="text-xs px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                >
                  <BookOpen className="h-3 w-3" /> View Booking
                </Link>
              )}
              <button
                onClick={() => resolveConversation(active)}
                className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                  active.status === 'open'
                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <CheckCheck className="h-3 w-3" />
                {active.status === 'open' ? 'Resolve' : 'Reopen'}
              </button>
              <button onClick={() => setActive(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {active.messages.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">No messages yet</p>
            )}
            {active.messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                  msg.direction === 'outbound'
                    ? 'bg-green-500 text-white rounded-br-sm'
                    : 'bg-white text-gray-900 rounded-bl-sm'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                    msg.direction === 'outbound' ? 'text-green-100' : 'text-gray-400'
                  }`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.direction === 'outbound' && statusIcon(msg.status)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply box */}
          <div className="p-3 border-t border-gray-100 bg-white">
            {active.status === 'resolved' ? (
              <p className="text-center text-gray-400 text-sm py-2">Conversation resolved — reopen to reply.</p>
            ) : (
              <div className="flex items-end gap-2">
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                  placeholder="Type a message… (Enter to send)"
                  className="flex-1 input resize-none text-sm py-2"
                  rows={2}
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  className="btn-primary p-2.5 shrink-0"
                >
                  {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 card flex items-center justify-center">
          <div className="text-center text-gray-400">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-200" />
            <p className="font-medium">Select a conversation</p>
            <p className="text-sm mt-1">Choose from the list to view messages</p>
          </div>
        </div>
      )}
    </div>
  )
}
