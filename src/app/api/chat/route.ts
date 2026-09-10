import { openai } from '@ai-sdk/openai'
import { streamText, tool, convertToModelMessages, createUIMessageStreamResponse } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

const buildSystemPrompt = () => {
  const today = new Date().toISOString().slice(0, 10)

  return `You are BookQayam's friendly AI assistant for finding and booking hotels across Pakistan.
Today's date: ${today}

LANGUAGE: Detect the user's language and always reply in the same language:
- If they write in English → reply in English
- If they write in Roman Urdu → reply in Roman Urdu

YOUR CAPABILITIES:
1. Search hotels by city, budget, rating, guest count, and room type
2. Show hotel details, amenities, and date-specific room availability
3. Save hotels to the user's wishlist
4. Show the user's booking history
5. Guide users to book

BEHAVIOUR RULES:
- When a user asks for hotels → call search_hotels with all relevant filters extracted from their message
- CRITICAL: After search_hotels, hotel cards appear automatically. NEVER list hotel names in text. Reply with ONE short sentence only.
- When user says "show others / kuch aur / doosre dikhao" → call search_hotels with same city+filters AND pass exclude_ids from the previous result
- When user asks about a hotel's rooms, amenities, or details → call get_hotel_details
- When user says "save this hotel / wishlist mein daal do / save karo" → call save_hotel (requires login)
- When user says "meri bookings / my reservations / booking history" → call get_my_bookings (requires login)
- When user wants to book → call select_hotel_to_book
- Never invent hotel data

FILTER RULES (extract from message, pass to search_hotels):
- Budget: "3000 se kam / sasta / budget / cheap / affordable / Rs X se neeche" → max_price (PKR number)
- Rating: "4 star / top rated / best / highly rated / 4 se upar" → min_rating (1–5)
- Guests: "2 log / family of 4 / couple / 3 guests / 3 logon ke liye" → min_capacity (number)
- Room type: "Deluxe chahiye / Suite chahiye / Standard room" → room_type (string)
- Filters can combine: "Lahore mein 2 logon ke liye 5000 se kam deluxe room" → city + max_price + min_capacity + room_type

DATE PARSING (for get_hotel_details when user mentions dates):
- "kal" = tomorrow | "aaj" = today | "parson" = day after tomorrow
- "2 raat / 2 din / 2 nights" = 2 nights duration
- When user asks about availability for specific dates, pass check_in_date and check_out_date (YYYY-MM-DD) to get_hotel_details

ROMAN URDU REFERENCE:
"hotel chahiye" = need hotel | "kitna kiraya" = what's the price | "log/mehman" = guests | "sasta" = cheap | "save karo" = save | "meri bookings" = my bookings | "kal" = tomorrow | "raat" = nights`
}

export async function POST(req: Request) {
  const { messages } = await req.json()
  const supabase = await createClient()

  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: buildSystemPrompt(),
    messages: modelMessages,
    tools: {
      search_hotels: tool({
        description: 'Search hotels by city with optional budget, rating, guest count, and room type filters.',
        inputSchema: z.object({
          city: z.string().describe('City or area in Pakistan'),
          exclude_ids: z.array(z.string()).optional().describe('Hotel IDs already shown — exclude when user asks for alternatives'),
          max_price: z.number().optional().describe('Max price per night in PKR'),
          min_rating: z.number().min(1).max(5).optional().describe('Minimum hotel star rating'),
          min_capacity: z.number().optional().describe('Minimum room capacity (number of guests)'),
          room_type: z.string().optional().describe('Room type name to filter by, e.g. "Deluxe", "Suite", "Standard"'),
        }),
        execute: async ({ city, exclude_ids, max_price, min_rating, min_capacity, room_type }) => {
          type RoomBasic = { price_per_night: number; capacity: number; status: string; room_type: { name: string } | { name: string }[] | null }

          let query = supabase
            .from('hotels')
            .select(`id, name, city, address, cover_image, rating, review_count, description, rooms(price_per_night, capacity, status, room_type:room_types(name))`)
            .or(`city.ilike.%${city}%,name.ilike.%${city}%,address.ilike.%${city}%`)
            .eq('status', 'active')
            .limit(20)

          if (exclude_ids?.length) query = query.not('id', 'in', `(${exclude_ids.join(',')})`)
          if (min_rating) query = query.gte('rating', min_rating)

          const { data: hotels, error } = await query
          if (error || !hotels?.length) return { found: false, city, exhausted: (exclude_ids?.length ?? 0) > 0 }

          const filtered = hotels.filter(h => {
            const rooms = (h.rooms as RoomBasic[] | null) ?? []
            const available = rooms.filter(r => r.status === 'available')
            if (!available.length) return false

            return available.some(r => {
              const rtName = Array.isArray(r.room_type)
                ? r.room_type[0]?.name ?? ''
                : (r.room_type as { name: string } | null)?.name ?? ''
              return (
                (!max_price || r.price_per_night <= max_price) &&
                (!min_capacity || r.capacity >= min_capacity) &&
                (!room_type || rtName.toLowerCase().includes(room_type.toLowerCase()))
              )
            })
          })

          if (!filtered.length) return { found: false, city, no_match: true, exhausted: (exclude_ids?.length ?? 0) > 0 }

          return {
            found: true,
            city,
            hotels: filtered.slice(0, 5).map(h => {
              const rooms = (h.rooms as RoomBasic[] | null) ?? []
              const qualifying = rooms.filter(r => {
                const rtName = Array.isArray(r.room_type)
                  ? r.room_type[0]?.name ?? ''
                  : (r.room_type as { name: string } | null)?.name ?? ''
                return (
                  r.status === 'available' &&
                  (!max_price || r.price_per_night <= max_price) &&
                  (!min_capacity || r.capacity >= min_capacity) &&
                  (!room_type || rtName.toLowerCase().includes(room_type.toLowerCase()))
                )
              })
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
        description: 'Get full hotel details including amenities, rooms, and optionally date-specific availability.',
        inputSchema: z.object({
          hotel_id: z.string(),
          check_in_date: z.string().optional().describe('Check-in date YYYY-MM-DD — filters out rooms already booked'),
          check_out_date: z.string().optional().describe('Check-out date YYYY-MM-DD'),
        }),
        execute: async ({ hotel_id, check_in_date, check_out_date }) => {
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
          let availableRooms = (hotel.rooms as unknown as RoomRow[] | null)?.filter(r => r.status === 'available') ?? []

          // Filter by date availability
          if (check_in_date && check_out_date) {
            const { data: booked } = await supabase
              .from('bookings')
              .select('room_id, room_ids')
              .eq('hotel_id', hotel_id)
              .neq('status', 'cancelled')
              .lt('check_in', check_out_date)
              .gt('check_out', check_in_date)

            const bookedIds = new Set<string>()
            booked?.forEach(b => {
              if (b.room_id) bookedIds.add(b.room_id)
              ;(b.room_ids as string[] | null)?.forEach(id => bookedIds.add(id))
            })
            availableRooms = availableRooms.filter(r => !bookedIds.has(r.id))
          }

          return {
            found: true,
            check_in_date: check_in_date ?? null,
            check_out_date: check_out_date ?? null,
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
                return {
                  id: r.id,
                  name: r.name,
                  room_type: Array.isArray(rt) ? rt[0]?.name ?? null : (rt as { name: string } | null)?.name ?? null,
                  price_per_night: r.price_per_night,
                  capacity: r.capacity,
                }
              }),
            },
          }
        },
      }),

      save_hotel: tool({
        description: 'Save a hotel to the logged-in user\'s wishlist. Returns require_login if not authenticated.',
        inputSchema: z.object({
          hotel_id: z.string(),
          hotel_name: z.string(),
        }),
        execute: async ({ hotel_id, hotel_name }) => {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return { action: 'require_login', reason: 'save_hotel', hotel_id, hotel_name }

          const { error } = await supabase
            .from('saved_hotels')
            .upsert({ user_id: user.id, hotel_id }, { onConflict: 'user_id,hotel_id', ignoreDuplicates: true })

          if (error) return { success: false }
          return { success: true, hotel_name }
        },
      }),

      get_my_bookings: tool({
        description: 'Fetch the current user\'s booking history. Returns require_login if not authenticated.',
        inputSchema: z.object({}),
        execute: async () => {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return { action: 'require_login', reason: 'view_bookings' }

          const { data: bookings } = await supabase
            .from('bookings')
            .select(`
              id, check_in, check_out, guests, status, total_amount, created_at,
              hotel:hotels(id, name, city, cover_image),
              room:rooms(name, price_per_night)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5)

          if (!bookings?.length) return { found: false }
          return { found: true, bookings }
        },
      }),

      select_hotel_to_book: tool({
        description: 'Show a login/booking button when user wants to book a specific hotel.',
        inputSchema: z.object({
          hotel_id: z.string(),
          hotel_name: z.string(),
        }),
        execute: async ({ hotel_id, hotel_name }) => {
          return { action: 'require_login', hotel_id, hotel_name }
        },
      }),
    },
  })

  return createUIMessageStreamResponse({ stream: result.toUIMessageStream() })
}
