'use client'

import { useChat } from '@ai-sdk/react'
import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader2, LogIn, MapPin, Star, BedDouble } from 'lucide-react'
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

// ── Hotel card ───────────────────────────────────────────────────────────────

function HotelCard({ hotel, onSelect }: { hotel: ChatHotel; onSelect: (h: ChatHotel) => void }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-md w-full group">
      {/* Image */}
      <div className="relative h-36 bg-indigo-50">
        {hotel.cover_image ? (
          <Image
            src={hotel.cover_image}
            alt={hotel.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="340px"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-50 to-indigo-100 text-5xl">
            🏨
          </div>
        )}
        {/* Price badge */}
        {hotel.min_price && (
          <div className="absolute bottom-2 right-2 rounded-xl bg-white/95 backdrop-blur-sm px-2.5 py-1 shadow-md">
            <span className="text-xs font-bold text-indigo-700">Rs {hotel.min_price.toLocaleString()}</span>
            <span className="text-[10px] text-gray-400">/night</span>
          </div>
        )}
        {/* Rating badge */}
        {(hotel.rating ?? 0) > 0 && (
          <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-white/95 backdrop-blur-sm px-2 py-0.5 shadow">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold text-gray-800">{hotel.rating?.toFixed(1)}</span>
            {(hotel.review_count ?? 0) > 0 && (
              <span className="text-[10px] text-gray-400">({hotel.review_count})</span>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="font-bold text-gray-900 text-sm leading-snug line-clamp-1">{hotel.name}</p>
        <div className="flex items-center gap-1 mt-0.5 mb-2">
          <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
          <span className="text-xs text-gray-500">{hotel.city}</span>
        </div>
        {hotel.description && (
          <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed mb-2">{hotel.description}</p>
        )}
        <button
          onClick={() => onSelect(hotel)}
          className="w-full rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <BedDouble className="w-3.5 h-3.5" />
          Book this hotel
        </button>
      </div>
    </div>
  )
}

// ── Login prompt ─────────────────────────────────────────────────────────────

function BookingPromptCard({ hotel_id, hotel_name }: { hotel_id: string; hotel_name: string }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white w-full">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-base">🏨</div>
          <p className="text-sm font-bold text-indigo-900">Ready to book!</p>
        </div>
        <p className="text-xs text-indigo-700 leading-relaxed">
          Please log in to complete your booking for{' '}
          <span className="font-semibold">{hotel_name}</span>.
        </p>
      </div>
      <div className="flex flex-col gap-2 px-4 pb-4">
        <Link
          href={`/login?redirect=/hotels/${hotel_id}`}
          className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
        >
          <LogIn className="w-3.5 h-3.5" />
          Log in to book
        </Link>
        <Link
          href={`/signup?redirect=/hotels/${hotel_id}`}
          className="flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white py-2.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
        >
          Create free account
        </Link>
      </div>
    </div>
  )
}

// ── Typing dots ───────────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-sm shrink-0">🤖</div>
      <div className="rounded-2xl rounded-tl-sm bg-white shadow-sm border border-gray-100 px-4 py-3 flex items-center gap-1">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
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
            text: "Salam! 👋 I'm BookQayam's AI assistant.\n\nTell me which city you're looking for a hotel in and I'll show you the best options!\n\n(Roman Urdu mein bhi baat kar sakte hain — koi bhi city batayein!)",
          },
        ],
      },
    ],
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

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
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 shadow-xl hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95"
          aria-label="Open AI chat assistant"
        >
          <MessageCircle className="h-6 w-6 text-white" />
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white shadow">
            AI
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-0 right-0 z-50 flex flex-col w-full sm:w-[400px] sm:bottom-6 sm:right-6 h-[100dvh] sm:h-[600px] sm:rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white">

          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg">🤖</div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">BookQayam AI</p>
                <p className="text-[10px] text-indigo-200">Online — hotel booking assistant</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1.5 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-3 bg-gray-50/80">
            {messages.map(msg => {
              const allParts = msg.parts as unknown as { type: string; text?: string; toolName?: string; toolCallId?: string; state?: string; output?: unknown }[]
              const textParts = allParts.filter(p => p.type === 'text')
              const toolParts = allParts.filter(p => p.type === 'dynamic-tool' && p.state === 'output-available')
              const textContent = textParts.map(p => p.text ?? '').join('')
              const role = msg.role as string

              return (
                <div key={msg.id} className={`flex gap-2 ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {role === 'assistant' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm mt-1">
                      🤖
                    </div>
                  )}

                  <div className={`flex flex-col gap-2 ${role === 'user' ? 'items-end max-w-[80%]' : 'items-start w-full max-w-[88%]'}`}>
                    {/* Text bubble — only show if there's text AND no tool results (avoids duplication) */}
                    {textContent && toolParts.length === 0 && (
                      <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
                        ${role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-sm shadow-sm'
                          : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-sm'
                        }`}>
                        {textContent}
                      </div>
                    )}
                    {/* When tool results present, show a short text bubble if AI also sent text */}
                    {textContent && toolParts.length > 0 && (
                      <div className="rounded-2xl rounded-tl-sm bg-white text-gray-800 shadow-sm border border-gray-100 px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
                        {textContent}
                      </div>
                    )}

                    {/* Tool results */}
                    {toolParts.map((toolPart, idx) => {
                      const key = toolPart.toolCallId ?? idx

                      if (toolPart.toolName === 'search_hotels') {
                        const result = toolPart.output as SearchResult
                        if (!result.found || !result.hotels?.length) return null
                        return (
                          <div key={key} className="w-full space-y-2.5">
                            {result.hotels.map(hotel => (
                              <HotelCard key={hotel.id} hotel={hotel} onSelect={handleHotelSelect} />
                            ))}
                          </div>
                        )
                      }

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
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold mt-1">
                      U
                    </div>
                  )}
                </div>
              )
            })}

            {isLoading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Suggested prompts */}
          {messages.length === 1 && (
            <div className="px-3 py-2 bg-white border-t border-gray-100 shrink-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Quick searches</p>
              <div className="flex flex-wrap gap-1.5">
                {['Hotels in Lahore', 'Islamabad hotel chahiye', 'Murree mein hotel', 'Karachi best hotels'].map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage({ text: prompt })}
                    className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-2 border-t border-gray-100 bg-white px-3 py-3 shrink-0">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="City batayein ya English mein puchein..."
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:bg-white transition-colors placeholder:text-gray-400"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
