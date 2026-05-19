import { UserRole } from '@/types'

const rolePermissions: Record<UserRole, string[]> = {
  super_admin: ['*'],
  hotel_admin: [
    'rooms:read', 'rooms:write', 'rooms:delete',
    'bookings:read', 'bookings:write', 'bookings:delete',
    'staff:read', 'staff:write', 'staff:delete',
    'reports:read',
    'hotel:read', 'hotel:write',
    'payments:read',
    'reviews:read',
  ],
  staff: [
    'rooms:read', 'rooms:write',
    'bookings:read', 'bookings:write',
    'payments:read',
  ],
  customer: [
    'hotels:read',
    'bookings:read', 'bookings:create',
    'payments:create',
    'reviews:write',
    'profile:read', 'profile:write',
  ],
}

export function hasPermission(role: UserRole, permission: string): boolean {
  const perms = rolePermissions[role]
  if (!perms) return false
  if (perms.includes('*')) return true
  if (perms.includes(permission)) return true
  const [resource] = permission.split(':')
  return perms.includes(`${resource}:*`)
}

export function canAccess(role: UserRole, permissions: string[]): boolean {
  return permissions.every(p => hasPermission(role, p))
}
