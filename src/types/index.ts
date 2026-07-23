export type UserRole = 'super_admin' | 'hotel_admin' | 'staff' | 'customer'
export type RoomStatus = 'available' | 'booked' | 'maintenance' | 'cleaning'
export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'
export type BookingSource = 'online' | 'whatsapp' | 'phone' | 'walk_in'
export type HotelStatus = 'active' | 'suspended' | 'pending'
export type PlanName = 'basic' | 'pro' | 'enterprise'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type PaymentMethod = 'online' | 'offline' | 'cash' | 'card_pos' | 'bank_transfer' | 'cheque' | 'other'
export type WhatsAppBotState = 'idle' | 'awaiting_checkin' | 'awaiting_checkout' | 'awaiting_room' | 'confirming'
export type ConversationStatus = 'open' | 'resolved'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  tenant_id: string | null
  avatar_url?: string
  phone?: string
  country?: string
  city?: string
  address?: string
  created_at: string
  updated_at: string
}

export interface Plan {
  id: string
  name: PlanName
  max_rooms: number
  max_staff: number
  price_monthly: number
  price_yearly: number
  features: string[]
  is_active: boolean
  created_at: string
}

export interface Hotel {
  id: string
  name: string
  slug: string
  description?: string
  address: string
  city: string
  country: string
  phone: string
  email: string
  images: string[]
  cover_image?: string
  rating: number
  review_count: number
  owner_id: string
  plan_id: string
  status: HotelStatus
  check_in_time: string
  check_out_time: string
  amenities: string[]
  latitude?: number
  longitude?: number
  whatsapp_number?: string
  whatsapp_phone_number_id?: string
  whatsapp_access_token?: string
  created_at: string
  updated_at: string
  plan?: Plan
  owner?: Profile
}

export interface RoomType {
  id: string
  hotel_id: string
  name: string
  description: string
  max_adults: number
  max_children: number
  capacity: number
  amenities: string[]
  images: string[]
  created_at: string
}

export interface Room {
  id: string
  hotel_id: string
  room_type_id: string
  room_number: string
  floor: number
  price_per_night: number
  status: RoomStatus
  max_adults: number
  max_children: number
  capacity: number
  amenities: string[]
  images: string[]
  notes?: string
  created_at: string
  updated_at: string
  room_type?: RoomType
}

export interface Booking {
  id: string
  hotel_id: string
  room_id: string
  user_id: string | null
  check_in: string
  check_out: string
  guests: number
  adults: number
  children: number
  status: BookingStatus
  source: BookingSource
  guest_name?: string
  guest_phone?: string
  total_amount: number
  special_requests?: string
  cancellation_reason?: string
  created_at: string
  updated_at: string
  room?: Room
  user?: Profile
  hotel?: Hotel
  payment?: Payment
}

export interface WhatsAppConversation {
  id: string
  hotel_id: string
  guest_phone: string
  guest_name?: string
  wa_contact_id: string
  booking_id?: string
  status: ConversationStatus
  bot_state: WhatsAppBotState
  bot_context: Record<string, unknown>
  last_message_at: string
  created_at: string
  booking?: Booking
  messages?: WhatsAppMessage[]
}

export interface WhatsAppMessage {
  id: string
  conversation_id: string
  hotel_id: string
  direction: 'inbound' | 'outbound'
  content: string
  message_type: 'text' | 'template' | 'image' | 'document'
  wa_message_id?: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  created_at: string
}

export interface Payment {
  id: string
  booking_id: string
  hotel_id: string
  user_id: string
  amount: number
  currency: string
  status: PaymentStatus
  payment_method: PaymentMethod
  stripe_payment_intent_id?: string
  stripe_session_id?: string
  invoice_number?: string
  paid_at?: string
  created_at: string
}

export interface Staff {
  id: string
  hotel_id: string
  user_id: string
  department: string
  position: string
  permissions: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  user?: Profile
}

export interface Review {
  id: string
  hotel_id: string
  booking_id: string
  user_id: string
  rating: number
  comment: string
  is_published: boolean
  created_at: string
  user?: Profile
}

export interface Notification {
  id: string
  user_id: string
  hotel_id?: string
  title: string
  message: string
  type: 'booking' | 'payment' | 'system' | 'staff'
  read: boolean
  data?: Record<string, unknown>
  created_at: string
}

export interface DashboardStats {
  total_bookings: number
  total_revenue: number
  occupancy_rate: number
  total_rooms: number
  available_rooms: number
  pending_bookings: number
  checked_in_today: number
  checking_out_today: number
  revenue_this_month: number
  revenue_last_month: number
}

export interface SuperAdminStats {
  total_hotels: number
  active_hotels: number
  suspended_hotels: number
  total_users: number
  total_revenue: number
  hotels_by_plan: Record<PlanName, number>
}
