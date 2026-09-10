import { openai } from '@ai-sdk/openai'
import { streamText, tool, convertToModelMessages, createUIMessageStreamResponse } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

const SYSTEM_PROMPT = `You are BookQayam's friendly AI assistant for finding and booking hotels across Pakistan.

LANGUAGE: Detect the user's language and always reply in the same language:
- If they write in English → reply in English
- If they write in Roman Urdu (Urdu written in English letters like "hotel chahiye", "book karna hai", "Lahore mein hotel") → reply in Roman Urdu

YOUR CAPABILITIES:
1. Search hotels by city or area in Pakistan
2. Show hotel details and room prices
3. Help users pick the right hotel
4. Guide users to book (they must be logged in to complete a booking)

BEHAVIOUR RULES:
- When a user mentions a city or says they need a hotel → call search_hotels immediately
- Show a brief summary of results, not a long list
- When user selects a specific hotel and wants to book → call select_hotel_to_book (this shows them a login/booking button)
- Never invent hotel names, prices, or details — only use data from tool results
- Be warm, concise, and helpful
- If no hotels found → apologise and suggest nearby cities

ROMAN URDU PHRASES YOU MAY SEE:
"hotel chahiye / dhundh raha hoon" = need a hotel
"book karna hai / booking chahiye" = want to book
"kitna kiraya / price kya hai" = what is the price
"mehman / log" = guests
"kamra / room" = room
"check in / check out" = check in / check out dates
"yahan / wahan" = here / there
"shukriya / theek hai" = thank you / okay`

export async function POST(req: Request) {
  const { messages } = await req.json()
  const supabase = await createClient()

  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    tools: {
      search_hotels: tool({
        description: 'Search for hotels in a Pakistani city or area. Call this whenever the user mentions a city or asks for hotels.',
        inputSchema: z.object({
          city: z.string().describe('City or area name in Pakistan, e.g. Lahore, Islamabad, Karachi, Murree'),
        }),
        execute: async ({ city }: { city: string }) => {
          const { data: hotels, error } = await supabase
            .from('hotels')
            .select(`
              id, name, city, cover_image, rating, review_count, description,
              rooms ( price_per_night )
            `)
            .or(`city.ilike.%${city}%,name.ilike.%${city}%,address.ilike.%${city}%`)
            .eq('status', 'active')
            .limit(5)

          if (error || !hotels?.length) {
            return { found: false, city }
          }

          return {
            found: true,
            city,
            hotels: hotels.map(h => {
              const prices = (h.rooms as { price_per_night: number }[] | null)
                ?.map(r => r.price_per_night)
                .filter(Boolean) ?? []
              return {
                id: h.id,
                name: h.name,
                city: h.city,
                cover_image: h.cover_image,
                rating: h.rating ?? 0,
                review_count: h.review_count ?? 0,
                description: (h.description ?? '').slice(0, 120),
                min_price: prices.length ? Math.min(...prices) : null,
              }
            }),
          }
        },
      }),

      get_hotel_details: tool({
        description: 'Get full details and available rooms for a specific hotel when the user asks for more info.',
        inputSchema: z.object({
          hotel_id: z.string(),
        }),
        execute: async ({ hotel_id }: { hotel_id: string }) => {
          const { data: hotel } = await supabase
            .from('hotels')
            .select(`
              id, name, city, cover_image, rating, review_count, description, address,
              rooms ( id, name, price_per_night, capacity, status )
            `)
            .eq('id', hotel_id)
            .single()

          if (!hotel) return { found: false }

          const availableRooms = (hotel.rooms as { id: string; name: string; price_per_night: number; capacity: number; status: string }[] | null)
            ?.filter(r => r.status === 'available') ?? []

          return {
            found: true,
            hotel: {
              id: hotel.id,
              name: hotel.name,
              city: hotel.city,
              cover_image: hotel.cover_image,
              rating: hotel.rating,
              review_count: hotel.review_count,
              description: hotel.description,
              address: hotel.address,
              available_rooms: availableRooms.map(r => ({
                id: r.id,
                name: r.name,
                price_per_night: r.price_per_night,
                capacity: r.capacity,
              })),
            },
          }
        },
      }),

      select_hotel_to_book: tool({
        description: 'Call this when the user wants to book a specific hotel. It shows a login/booking button in the chat.',
        inputSchema: z.object({
          hotel_id: z.string().describe('The hotel ID from search results'),
          hotel_name: z.string().describe('The hotel name to show in the prompt'),
        }),
        execute: async ({ hotel_id, hotel_name }: { hotel_id: string; hotel_name: string }) => {
          return { action: 'require_login', hotel_id, hotel_name }
        },
      }),
    },
  })

  return createUIMessageStreamResponse({ stream: result.toUIMessageStream() })
}
