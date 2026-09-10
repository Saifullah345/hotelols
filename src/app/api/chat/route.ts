import { openai } from '@ai-sdk/openai'
import { streamText, tool, convertToModelMessages, createUIMessageStreamResponse } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

// Nearest cities lookup (km) for fallback when no hotels found
const NEARBY: Record<string, { city: string; km: number }[]> = {
  sargodha:    [{ city: 'Faisalabad', km: 100 }, { city: 'Gujrat', km: 130 }, { city: 'Lahore', km: 175 }],
  gujranwala:  [{ city: 'Gujrat', km: 50 }, { city: 'Lahore', km: 60 }, { city: 'Sialkot', km: 65 }],
  sialkot:     [{ city: 'Gujranwala', km: 65 }, { city: 'Lahore', km: 120 }],
  gujrat:      [{ city: 'Gujranwala', km: 50 }, { city: 'Lahore', km: 130 }, { city: 'Jhelum', km: 60 }],
  jhelum:      [{ city: 'Rawalpindi', km: 100 }, { city: 'Gujrat', km: 60 }],
  attock:      [{ city: 'Rawalpindi', km: 70 }, { city: 'Islamabad', km: 80 }],
  multan:      [{ city: 'Bahawalpur', km: 80 }, { city: 'Faisalabad', km: 240 }],
  bahawalpur:  [{ city: 'Multan', km: 80 }, { city: 'Rahim Yar Khan', km: 165 }],
  peshawar:    [{ city: 'Islamabad', km: 170 }, { city: 'Abbottabad', km: 160 }],
  abbottabad:  [{ city: 'Murree', km: 100 }, { city: 'Mansehra', km: 50 }, { city: 'Islamabad', km: 120 }],
  mansehra:    [{ city: 'Abbottabad', km: 50 }, { city: 'Islamabad', km: 160 }],
  swat:        [{ city: 'Peshawar', km: 160 }, { city: 'Abbottabad', km: 180 }],
  murree:      [{ city: 'Rawalpindi', km: 60 }, { city: 'Islamabad', km: 70 }],
  rawalpindi:  [{ city: 'Islamabad', km: 15 }, { city: 'Murree', km: 60 }, { city: 'Attock', km: 70 }],
  islamabad:   [{ city: 'Rawalpindi', km: 15 }, { city: 'Murree', km: 60 }, { city: 'Lahore', km: 375 }],
  lahore:      [{ city: 'Islamabad', km: 375 }, { city: 'Faisalabad', km: 130 }, { city: 'Gujranwala', km: 60 }],
  faisalabad:  [{ city: 'Lahore', km: 130 }, { city: 'Sargodha', km: 100 }, { city: 'Multan', km: 240 }],
  karachi:     [{ city: 'Hyderabad', km: 160 }, { city: 'Thatta', km: 100 }],
  hyderabad:   [{ city: 'Karachi', km: 160 }, { city: 'Sukkur', km: 390 }],
  sukkur:      [{ city: 'Hyderabad', km: 390 }, { city: 'Multan', km: 430 }],
  quetta:      [{ city: 'Hub', km: 100 }, { city: 'Islamabad', km: 1100 }],
}

function getNearbyCities(city: string): { city: string; km: number }[] {
  const key = city.toLowerCase().trim()
  return NEARBY[key] ?? []
}

const buildSystemPrompt = () => {
  const today = new Date().toISOString().slice(0, 10)

  return `You are BookQayam's friendly AI assistant for finding and booking hotels across Pakistan.
Today's date: ${today}

LANGUAGE: Detect the user's language and always reply in the same language (English or Roman Urdu).

YOUR CAPABILITIES:
1. Search hotels by city, budget, rating, guest count, room type
2. Show hotel details with date-based room availability
3. Compare two hotels side-by-side
4. Start an in-chat booking flow (select room + dates)
5. Save hotels to wishlist
6. Show booking history

BEHAVIOUR RULES:
- When user asks for hotels → call search_hotels with all relevant filters
- CRITICAL: After search_hotels, cards appear automatically. Reply with ONE short sentence only. NEVER list hotel names in text.
- When user says "others / kuch aur / doosre" → call search_hotels again with same city+filters AND exclude_ids from previous result
- When user says "in dono mein konsa better / compare karo" about two hotels they've seen → call compare_hotels with both hotel IDs from previous search results
- When user says "book karna hai" and is logged in, or you want to start booking → call start_in_chat_booking (handles auth check)
- When user asks about a specific hotel's rooms/amenities/facilities → call get_hotel_details
- When user says "save karo / wishlist" → call save_hotel
- When user says "meri bookings / booking history" → call get_my_bookings
- When no hotels found, nearby city chips appear in the UI automatically — just say "No hotels found in [city]" in your text, the UI handles suggestions

FILTER RULES (extract from message):
- Budget: "3000 se kam / sasta / affordable / Rs X se neeche" → max_price
- Rating: "4 star / top rated / 4 se upar" → min_rating
- Guests: "2 log / family / couple / 3 guests" → min_capacity
- Room type: "Deluxe / Suite / Standard chahiye" → room_type
- Dates: "kal se 2 raat / aaj se 3 din" → check_in_date + check_out_date in get_hotel_details

ROMAN URDU: hotel chahiye=need hotel | sasta=cheap | log=guests | save karo=save | meri bookings=my bookings | kal=tomorrow | raat=nights | compare=compare

PLATFORM KNOWLEDGE — answer these questions directly without calling any tool:

Q: What is BookQayam?
A: BookQayam is Pakistan's hotel booking platform. Customers can search, compare, and book hotels across Pakistan. Hotel owners can list their property and manage bookings through a dedicated dashboard.

Q: How do I create an account / register?
A: Go to bookqayam.com/register — it's free. You just need your name, email, and a password. After signing up you can book hotels, save favourites, and view your booking history.

Q: How do I book a hotel?
A: Tell me which city you're visiting and I'll show you available hotels. Pick one, select a room and dates, and proceed to checkout. You need to be logged in to confirm a booking.

Q: Can I book without an account?
A: No — you need to create a free account to confirm a booking. This keeps your reservation and payment details secure.

Q: How do I list my hotel on BookQayam?
A: Hotel owners can register at /register, then request a Hotel Admin account. Once approved, you get a full dashboard to add rooms, set prices, manage bookings, and track revenue. Subscription plans are available.

Q: What plans are available for hotels?
A: BookQayam offers subscription plans for hotel owners with features like online booking, housekeeping management, guest reviews, advanced reports, and multi-property support. Visit the pricing page or contact support for current rates.

Q: What cities does BookQayam cover?
A: We cover all major cities across Pakistan — Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta, Murree, Abbottabad, and many more. Just ask me for any city!

Q: How do I cancel a booking?
A: Log in and go to your Bookings page (/bookings). Find the reservation and select Cancel. Cancellation policies vary by hotel — check the hotel's policy before booking.

Q: Is it safe to book on BookQayam?
A: Yes — all payments are processed securely. Bookings are confirmed directly with verified hotel properties. You'll receive confirmation details after booking.

Q: How do I contact support?
A: You can reach BookQayam support through the website's contact page, or email support@bookqayam.com. For urgent help you can also message us on WhatsApp (number on the website).

Q: I forgot my password. How do I reset it?
A: Go to /login and click "Forgot password". Enter your email and you'll receive a reset link.

Q: How do I view my past bookings?
A: Just ask me "meri bookings dikhao" or go to /bookings after logging in.

When answering platform questions: be concise (2–3 sentences), friendly, and helpful. If you don't know something specific (like exact pricing), say you'll direct them to the right page.`
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
        description: 'Search hotels in a Pakistani city with optional filters. Returns nearby city suggestions when nothing found.',
        inputSchema: z.object({
          city: z.string(),
          exclude_ids: z.array(z.string()).optional(),
          max_price: z.number().optional(),
          min_rating: z.number().min(1).max(5).optional(),
          min_capacity: z.number().optional(),
          room_type: z.string().optional(),
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

          const nearby = getNearbyCities(city)

          if (error || !hotels?.length) {
            return { found: false, city, nearby, exhausted: (exclude_ids?.length ?? 0) > 0 }
          }

          const filterRoom = (r: RoomBasic) => {
            const rtName = Array.isArray(r.room_type) ? r.room_type[0]?.name ?? '' : (r.room_type as { name: string } | null)?.name ?? ''
            return (
              r.status !== 'maintenance' &&
              (!max_price || r.price_per_night <= max_price) &&
              (!min_capacity || r.capacity >= min_capacity) &&
              (!room_type || rtName.toLowerCase().includes(room_type.toLowerCase()))
            )
          }

          const filtered = hotels.filter(h => ((h.rooms as RoomBasic[] | null) ?? []).some(filterRoom))

          if (!filtered.length) return { found: false, city, nearby, no_match: true, exhausted: (exclude_ids?.length ?? 0) > 0 }

          return {
            found: true,
            city,
            nearby: [],
            hotels: filtered.slice(0, 5).map(h => {
              const rooms = (h.rooms as RoomBasic[] | null) ?? []
              const prices = rooms.filter(filterRoom).map(r => r.price_per_night).filter(Boolean)
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

      compare_hotels: tool({
        description: 'Compare two hotels side-by-side. Call when user asks "konsa better hai" about two hotels they\'ve seen.',
        inputSchema: z.object({
          hotel_id_1: z.string(),
          hotel_id_2: z.string(),
        }),
        execute: async ({ hotel_id_1, hotel_id_2 }) => {
          type HRow = { id: string; name: string; city: string; cover_image: string | null; rating: number | null; review_count: number | null; description: string | null; amenities: string[] | null; rooms: { price_per_night: number; status: string }[] | null }
          const [r1, r2] = await Promise.all([
            supabase.from('hotels').select('id, name, city, cover_image, rating, review_count, description, amenities, rooms(price_per_night, status)').eq('id', hotel_id_1).single(),
            supabase.from('hotels').select('id, name, city, cover_image, rating, review_count, description, amenities, rooms(price_per_night, status)').eq('id', hotel_id_2).single(),
          ])
          if (!r1.data || !r2.data) return { found: false }

          const summarise = (h: HRow) => {
            const prices = (h.rooms ?? []).filter(r => r.status === 'available').map(r => r.price_per_night).filter(Boolean)
            return {
              id: h.id,
              name: h.name,
              city: h.city,
              cover_image: h.cover_image,
              rating: h.rating ?? 0,
              review_count: h.review_count ?? 0,
              description: (h.description ?? '').slice(0, 100),
              amenities: (h.amenities as string[] | null) ?? [],
              min_price: prices.length ? Math.min(...prices) : null,
            }
          }

          return { found: true, hotels: [summarise(r1.data as HRow), summarise(r2.data as HRow)] }
        },
      }),

      start_in_chat_booking: tool({
        description: 'Start an in-chat booking wizard for a hotel — shows room picker + date picker. Returns require_login if not authenticated.',
        inputSchema: z.object({
          hotel_id: z.string(),
          hotel_name: z.string(),
        }),
        execute: async ({ hotel_id, hotel_name }) => {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return { action: 'require_login', hotel_id, hotel_name }

          const { data: hotel } = await supabase
            .from('hotels')
            .select('id, name, city, cover_image, rooms(id, name, price_per_night, capacity, status, room_type:room_types(name))')
            .eq('id', hotel_id)
            .single()

          if (!hotel) return { found: false }

          type RoomRow = { id: string; name: string; price_per_night: number; capacity: number; status: string; room_type: { name: string }[] | null }
          const rooms = (hotel.rooms as unknown as RoomRow[] | null)?.filter(r => r.status === 'available') ?? []

          return {
            found: true,
            hotel: { id: hotel.id, name: hotel.name, city: hotel.city, cover_image: hotel.cover_image },
            available_rooms: rooms.map(r => ({
              id: r.id,
              name: r.name,
              room_type: r.room_type?.[0]?.name ?? null,
              price_per_night: r.price_per_night,
              capacity: r.capacity,
            })),
          }
        },
      }),

      get_hotel_details: tool({
        description: 'Get full hotel details, amenities, and optionally date-filtered room availability.',
        inputSchema: z.object({
          hotel_id: z.string(),
          check_in_date: z.string().optional(),
          check_out_date: z.string().optional(),
        }),
        execute: async ({ hotel_id, check_in_date, check_out_date }) => {
          const { data: hotel } = await supabase
            .from('hotels')
            .select(`id, name, city, cover_image, rating, review_count, description, address, amenities, check_in_time, check_out_time, phone, email, rooms(id, name, price_per_night, capacity, status, room_type:room_types(name))`)
            .eq('id', hotel_id)
            .single()

          if (!hotel) return { found: false }

          type RoomRow = { id: string; name: string; price_per_night: number; capacity: number; status: string; room_type: { name: string }[] | { name: string } | null }
          let availableRooms = (hotel.rooms as unknown as RoomRow[] | null)?.filter(r => r.status === 'available') ?? []

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
        description: 'Save a hotel to the logged-in user\'s wishlist.',
        inputSchema: z.object({ hotel_id: z.string(), hotel_name: z.string() }),
        execute: async ({ hotel_id, hotel_name }) => {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return { action: 'require_login', reason: 'save_hotel', hotel_id, hotel_name }
          const { error } = await supabase.from('saved_hotels').upsert({ user_id: user.id, hotel_id }, { onConflict: 'user_id,hotel_id', ignoreDuplicates: true })
          return error ? { success: false } : { success: true, hotel_name }
        },
      }),

      get_my_bookings: tool({
        description: 'Fetch the current user\'s recent booking history.',
        inputSchema: z.object({}),
        execute: async () => {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return { action: 'require_login', reason: 'view_bookings' }
          const { data: bookings } = await supabase
            .from('bookings')
            .select('id, check_in, check_out, guests, status, total_amount, created_at, hotel:hotels(id, name, city, cover_image), room:rooms(name, price_per_night)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5)
          if (!bookings?.length) return { found: false }
          return { found: true, bookings }
        },
      }),

      select_hotel_to_book: tool({
        description: 'Show a login/booking prompt for a hotel.',
        inputSchema: z.object({ hotel_id: z.string(), hotel_name: z.string() }),
        execute: async ({ hotel_id, hotel_name }) => ({ action: 'require_login', hotel_id, hotel_name }),
      }),
    },
  })

  return createUIMessageStreamResponse({ stream: result.toUIMessageStream() })
}
