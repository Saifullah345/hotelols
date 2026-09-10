'use client'

import { useChat } from '@ai-sdk/react'
import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2, LogIn, MapPin, Star } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatHotel {
  id: string
  name: string
  city: string
  cover_image?: string | null
  rating?: number
  review_count?: number
  description?: string
  min_price?: number | null
}

interface SearchResult {
  found: boolean
  city?: string
  hotels?: ChatHotel[]
}

interface BookingPrompt {
  action: 'require_login'
  hotel_id: string
  hotel_name: string
}

// ── Hotel card rendered inside the chat ─────────────────────────────────────

function HotelCard({ hotel, onSelect }: { hotel: ChatHotel; onSelect: (h: ChatHotel) => void }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden w-full max-w-[260px]">
      <div className="relative h-28 bg-gray-100">
        {hotel.cover_image ? (
          <Image src={hotel.cover_image} alt={hotel.name} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-indigo-50 text-indigo-300 text-3xl">🏨</div>
        )}
      </div>
      <div className="p-3">
        <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-1">{hotel.name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <MapPin className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-500">{hotel.city}</span>
        </div>
        {(hotel.rating ?? 0) > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium text-gray-700">{hotel.rating?.toFixed(1)}</span>
            {(hotel.review_count ?? 0) > 0 && (
              <span className="text-xs text-gray-400">({hotel.review_count})</span>
            )}
          </div>
        )}
        {hotel.min_price && (
          <p className="mt-1 text-xs font-semibold text-indigo-600">
            From Rs {hotel.min_price.toLocaleString()}/night
          </p>
        )}
        <button
          onClick={() => onSelect(hotel)}
          className="mt-2 w-full rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          Book this hotel
        </button>
      </div>
    </div>
  )
}

// ── Login / booking prompt ────────────────────────────────────────────────────

function BookingPromptCard({ hotel_id, hotel_name }: { hotel_id: string; hotel_name: string }) {
  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 w-full max-w-[280px]">
      <p className="text-sm font-semibold text-indigo-900 mb-1">Ready to book!</p>
      <p className="text-xs text-indigo-700 mb-3">
        Please log in to complete your booking for <span className="font-medium">{hotel_name}</span>.
      </p>
      <div className="flex flex-col gap-2">
        <Link
          href={`/login?redirect=/hotels/${hotel_id}`}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          <LogIn className="w-3.5 h-3.5" />
          Log in to book
        </Link>
        <Link
          href={`/signup?redirect=/hotels/${hotel_id}`}
          className="flex items-center justify-center gap-2 rounded-lg border border-indigo-300 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
        >
          Create free account
        </Link>
      </div>
    </div>
  )
}

// ── Main widget ───────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status } = useChat({
    messages: [
      {
        id: 'welcome',
        role: 'assistant' as const,
        parts: [
          {
            type: 'text' as const,
            text: "Salam! 👋 I'm BookQayam's AI assistant. Tell me which city you're looking for a hotel in, and I'll find the best options for you!\n\n(Roman Urdu mein bhi baat kar sakte hain — koi bhi city batayein!)",
          },
        ],
      },
    ],
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  // When user selects a hotel card to book → send a message
  const handleHotelSelect = (hotel: ChatHotel) => {
    sendMessage({ text: `I want to book ${hotel.name}` })
  }

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 shadow-lg hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95"
          aria-label="Open AI chat assistant"
        >
          <MessageCircle className="h-6 w-6 text-white" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
            AI
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-0 right-0 z-50 flex flex-col
          w-full sm:w-[380px] sm:bottom-6 sm:right-6
          h-[100dvh] sm:h-[560px]
          sm:rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white">

          {/* Header */}
          <div className="flex items-center justify-between bg-indigo-600 px-4 py-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <span className="text-base">🤖</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">BookQayam AI</p>
                <p className="text-[10px] text-indigo-200">Hotel booking assistant</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map(msg => {
              // Extract text parts and tool parts using any to avoid SDK type narrowing issues
              const allParts = msg.parts as unknown as { type: string; text?: string; toolName?: string; toolCallId?: string; state?: string; output?: unknown }[]
              const textParts = allParts.filter(p => p.type === 'text')
              const toolParts = allParts.filter(p => p.type === 'dynamic-tool' && p.state === 'output-available')
              const textContent = textParts.map(p => p.text ?? '').join('')
              const role = msg.role as string

              return (
                <div key={msg.id} className={`flex gap-2 ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {role === 'assistant' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm mt-0.5">
                      🤖
                    </div>
                  )}

                  <div className={`flex flex-col gap-2 max-w-[85%] ${role === 'user' ? 'items-end' : 'items-start'}`}>
                    {/* Text content */}
                    {textContent && (
                      <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
                        ${role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-sm'
                          : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-sm'
                        }`}>
                        {textContent}
                      </div>
                    )}

                    {/* Tool results */}
                    {toolParts.map((toolPart, idx) => {
                      const key = toolPart.toolCallId ?? idx

                      // Hotel search results → show cards
                      if (toolPart.toolName === 'search_hotels') {
                        const result = toolPart.output as SearchResult
                        if (!result.found || !result.hotels?.length) return null
                        return (
                          <div key={key} className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                            {result.hotels.map(hotel => (
                              <div key={hotel.id} className="shrink-0">
                                <HotelCard hotel={hotel} onSelect={handleHotelSelect} />
                              </div>
                            ))}
                          </div>
                        )
                      }

                      // Booking prompt → show login card
                      if (toolPart.toolName === 'select_hotel_to_book') {
                        const result = toolPart.output as BookingPrompt
                        if (result.action !== 'require_login') return null
                        return (
                          <BookingPromptCard
                            key={key}
                            hotel_id={result.hotel_id}
                            hotel_name={result.hotel_name}
                          />
                        )
                      }

                      return null
                    })}
                  </div>

                  {role === 'user' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold mt-0.5">
                      U
                    </div>
                  )}
                </div>
              )
            })}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-sm">🤖</div>
                <div className="rounded-2xl rounded-tl-sm bg-white shadow-sm border border-gray-100 px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Suggested prompts (only when no user messages yet) */}
          {messages.length === 1 && (
            <div className="flex gap-2 overflow-x-auto px-4 py-2 bg-gray-50 shrink-0 border-t border-gray-100">
              {[
                'Hotels in Lahore',
                'Islamabad hotel chahiye',
                'Murree mein hotel',
                'Karachi best hotels',
              ].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => {
                    sendMessage({ text: prompt })
                  }}
                  className="shrink-0 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-3 shrink-0">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="City batayein ya ask karein... / Ask in English"
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white transition-colors placeholder:text-gray-400"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
