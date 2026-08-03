import { cookies } from 'next/headers'

export const ROLE_COOKIE   = 'bq_role'
export const TENANT_COOKIE = 'bq_tenant'

export const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 30,
} as const

export async function getActiveSession() {
  const store = await cookies()
  return {
    role:     store.get(ROLE_COOKIE)?.value   ?? null,
    tenantId: store.get(TENANT_COOKIE)?.value ?? null,
  }
}
