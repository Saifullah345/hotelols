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
1. Search hotels by city, budget, rating, and guest count
2. Show hotel details, amenities, and room availability
3. Help users pick the right hotel
4. Guide users to book (they must be logged in to complete a booking)

BEHAVIOUR RULES:
- When a user mentions a city or asks for hotels → ALWAYS call search_hotels first
- CRITICAL: After search_hotels runs, hotel cards appear in the UI automatically. NEVER list hotel names, prices, ratings, or descriptions in your text. Reply with ONE short sentence only, e.g. "Found 4 hotels in Lahore under Rs 3,000! 👆 Swipe to explore." Do not mention any hotel by name.
- When user says "show others", "different hotels", "kuch aur", "doosre dikhao", "inke ilawa" → call search_hotels again with the SAME city and the same filters, AND pass exclude_ids with every hotel 'id' from the previous result.
- When user asks about a hotel's rooms, amenities, facilities, or says "tell me more / details dikhao / rooms kya hain" → call get_hotel_details with that hotel's ID.
- When user wants to book a specific hotel → call select_hotel_to_book.
- Never invent hotel names, prices, or details.
- If no hotels found → apologise and suggest nearby cities.

FILTER RULES — extract from user message and pass to search_hotels:
- Budget / max price: "3000 se kam", "budget hotel", "cheap", "Rs 5000 se neeche", "affordable" → pass max_price (number in PKR, e.g. 3000)
- Rating: "4 star", "top rated", "best hotel", "4 se upar", "highly rated" → pass min_rating (e.g. 4)
- Guests / capacity: "2 log hain", "family of 4", "couple", "3 guests", "3 log" → pass min_capacity (number of people, e.g. 2)
- Filters combine: "Lahore mein 2 logon ke liye 5000 se kam hotel" → city=Lahore, max_price=5000, min_capacity=2
- When re-searching (exclude_ids), keep the same filters as before.

ROMAN URDU PHRASES:
"hotel chahiye" = need a hotel | "kitna kiraya" = what is the price | "log / mehman" = guests | "sasta" = cheap/budget | "star wala" = rated hotel | "aur dikhao" = show more`

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
        description: 'Search hotels in a Pakistani city with optional budget, rating, and guest filters.',
        inputSchema: z.object({
          city: z.string().describe('City or area in Pakistan, e.g. Lahore, Islamabad, Karachi, Murree'),
          exclude_ids: z.array(z.string()).optional().describe('Hotel IDs already shown — exclude when user asks for alternatives'),
          max_price: z.number().optional().describe('Maximum price per night in PKR (e.g. 3000)'),
          min_rating: z.number().min(1).max(5).optional().describe('Minimum hotel rating, e.g. 4 for 4-star+'),
          min_capacity: z.number().optional().describe('Minimum guests a room must accommodate, e.g. 2 for a couple'),
        }),
        execute: async ({
          city,
          exclude_ids,
          max_price,
          min_rating,
          min_capacity,
        }: {
          city: string
          exclude_ids?: string[]
          max_price?: number
          min_rating?: number
          min_capacity?: number
        }) => {
          type RoomBasic = { price_per_night: number; capacity: number }

          let query = supabase
            .from('hotels')
            .select(`id, name, city, address, cover_image, rating, review_count, description, rooms(price_per_night, capacity)`)
            .or(`city.ilike.%${city}%,name.ilike.%${city}%,address.ilike.%${city}%`)
            .eq('status', 'active')
            .limit(15) // fetch extra so JS filtering still returns enough

          if (exclude_ids?.length) query = query.not('id', 'in', `(${exclude_ids.join(',')})`)
          if (min_rating) query = query.gte('rating', min_rating)

          const { data: hotels, error } = await query

          if (error || !hotels?.length) {
            return { found: false, city, exhausted: (exclude_ids?.length ?? 0) > 0 }
          }

          // JS-side filters for price and capacity (based on what rooms are available)
          let filtered = hotels.filter(h => {
            const rooms = (h.rooms as RoomBasic[] | null) ?? []
            if (!rooms.length) return false
            const qualifying = rooms.filter(r =>
              (!max_price || r.price_per_night <= max_price) &&
              (!min_capacity || r.capacity >= min_capacity)
            )
            return qualifying.length > 0
          })

          if (!filtered.length) {
            return { found: false, city, no_match: true, exhausted: (exclude_ids?.length ?? 0) > 0 }
          }

          return {
            found: true,
            city,
            hotels: filtered.slice(0, 5).map(h => {
              const rooms = (h.rooms as RoomBasic[] | null) ?? []
              const qualifying = rooms.filter(r =>
                (!max_price || r.price_per_night <= max_price) &&
                (!min_capacity || r.capacity >= min_capacity)
              )
              const prices = qualifying.map(r => r.price_per_night).filter(Boolean)
              return {
                id: h.id,
                name: h.name,
                city: h.city,
                address: h.address ?? '',
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
        description: 'Get full details (amenities, check-in/out times, contact, available rooms) for a specific hotel.',
        inputSchema: z.object({
          hotel_id: z.string().describe('The hotel ID from search results'),
        }),
        execute: async ({ hotel_id }: { hotel_id: string }) => {
          const { data: hotel } = await supabase
            .from('hotels')
            .select(`
              id, name, city, cover_image, rating, review_count, description, address,
              amenities, check_in_time, check_out_time, phone, email,
              rooms ( id, name, price_per_night, capacity, status, room_type:room_types(name) )
            `)
            .eq('id', hotel_id)
            .single()

          if (!hotel) return { found: false }

          type RoomRow = { id: string; name: string; price_per_night: number; capacity: number; status: string; room_type: { name: string }[] | { name: string } | null }
          const availableRooms = (hotel.rooms as unknown as RoomRow[] | null)?.filter(r => r.status === 'available') ?? []

          return {
            found: true,
            hotel: {
              id: hotel.id,
              name: hotel.name,
              city: hotel.city,
              cover_image: hotel.cover_image,
              rating: hotel.rating ?? 0,
              review_count: hotel.review_count ?? 0,
              description: hotel.description ?? '',
              address: hotel.address ?? '',
              amenities: (hotel.amenities as string[] | null) ?? [],
              check_in_time: hotel.check_in_time ?? null,
              check_out_time: hotel.check_out_time ?? null,
              phone: hotel.phone ?? null,
              email: hotel.email ?? null,
              available_rooms: availableRooms.map(r => {
                const rt = r.room_type
                const roomTypeName = Array.isArray(rt) ? rt[0]?.name ?? null : (rt as { name: string } | null)?.name ?? null
                return {
                  id: r.id,
                  name: r.name,
                  room_type: roomTypeName,
                  price_per_night: r.price_per_night,
                  capacity: r.capacity,
                }
              }),
            },
          }
        },
      }),

      select_hotel_to_book: tool({
        description: 'Call this when the user wants to book a specific hotel.',
        inputSchema: z.object({
          hotel_id: z.string().describe('The hotel ID from search results'),
          hotel_name: z.string().describe('The hotel name to show in the booking prompt'),
        }),
        execute: async ({ hotel_id, hotel_name }: { hotel_id: string; hotel_name: string }) => {
          return { action: 'require_login', hotel_id, hotel_name }
        },
      }),
    },
  })

  return createUIMessageStreamResponse({ stream: result.toUIMessageStream() })
}
