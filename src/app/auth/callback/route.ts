import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const roleRedirects: Record<string, string> = {
  super_admin: '/super-admin/dashboard',
  hotel_admin: '/hotel-admin/dashboard',
  staff: '/staff/dashboard',
  customer: '/customer/hotels',
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Honour an explicit ?next=, otherwise send the user to their role's home.
      if (next) return NextResponse.redirect(`${origin}${next}`)

      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = user
        ? await supabase.from('profiles').select('role').eq('id', user.id).single()
        : { data: null }
      const dest = profile?.role ? roleRedirects[profile.role] ?? '/' : '/'
      return NextResponse.redirect(`${origin}${dest}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`)
}
