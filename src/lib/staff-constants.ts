export const DEPARTMENTS = ['Front Desk', 'Housekeeping', 'Management', 'Security', 'Food & Beverage', 'Maintenance', 'Spa & Wellness', 'Concierge']

export const SHIFTS = [
  { value: 'Morning', label: 'Morning (7AM–3PM)' },
  { value: 'Evening', label: 'Evening (3PM–11PM)' },
  { value: 'Night',   label: 'Night (11PM–7AM)'  },
] as const

export type ShiftValue = typeof SHIFTS[number]['value']

export const STAFF_PERMISSIONS = [
  'rooms:read', 'rooms:write',
  'bookings:read', 'bookings:write',
  'payments:read', 'checkin:manage',
] as const

export type StaffStatus = 'active' | 'on_leave' | 'inactive'
