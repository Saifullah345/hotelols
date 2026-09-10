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
- When a user mentions a city or asks for hotels → ALWAYS call search_hotels tool first before replying
- CRITICAL: After search_hotels runs, hotel cards appear in the UI automatically. NEVER list hotel names, prices, ratings, or descriptions in your text. Your text reply must be ONE short sentence only, e.g. "Found 5 hotels in Lahore! 👆 Swipe the cards above to explore." Do not mention any hotel by name in your text.
- When the user says "show others", "different hotels", "not these", "suggest alternatives", "kuch aur", "doosre hotels", "inke ilawa" or similar → call search_hotels again with the SAME city AND pass exclude_ids containing every hotel 'id' from the previous search_hotels tool result, so we show fresh hotels.
- When the user asks about a specific hotel's rooms, amenities, facilities, check-in time, price, or says "tell me more", "details dikhao", "rooms kya hain", "facilities kya hain" → call get_hotel_details with that hotel's ID from the previous search_hotels result. Show the result as a card — do NOT describe it in text.
- When user says they want to book a specific hotel → call select_hotel_to_book
- Never invent hotel names, prices, or details
- If no hotels found (or all are excluded) → apologise and say there are no more options in that city, suggest nearby cities like Rawalpindi, Murree, Faisalabad, etc.

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
        description: 'Search for hotels in a Pakistani city or area. Call this whenever the user mentions a city or asks for hotels. When the user asks for different/other hotels, pass exclude_ids with the IDs already shown.',
        inputSchema: z.object({
          city: z.string().describe('City or area name in Pakistan, e.g. Lahore, Islamabad, Karachi, Murree'),
          exclude_ids: z.array(z.string()).optional().describe('Hotel IDs already shown to the user — exclude these to show fresh results when user asks for alternatives'),
        }),
        execute: async ({ city, exclude_ids }: { city: string; exclude_ids?: string[] }) => {
          let query = supabase
            .from('hotels')
            .select(`
              id, name, city, cover_image, rating, review_count, description,
              rooms ( price_per_night )
            `)
            .or(`city.ilike.%${city}%,name.ilike.%${city}%,address.ilike.%${city}%`)
            .eq('status', 'active')
            .limit(5)

          if (exclude_ids?.length) {
            query = query.not('id', 'in', `(${exclude_ids.join(',')})`)
          }

          const { data: hotels, error } = await query

          if (error || !hotels?.length) {
            return { found: false, city, exhausted: (exclude_ids?.length ?? 0) > 0 }
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
        description: 'Get full details (amenities, check-in/out times, contact, available rooms) for a specific hotel. Call when the user asks about rooms, facilities, amenities, or says "tell me more" about a hotel.',
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
