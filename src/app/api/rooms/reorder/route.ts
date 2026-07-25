import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { updates } = await req.json() as { updates: { id: string; sort_order: number }[] }
  if (!Array.isArray(updates) || !updates.length) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Update each room's sort_order individually (Supabase doesn't support batch updates easily)
  const errors: string[] = []
  for (const { id, sort_order } of updates) {
    const { error } = await supabase
      .from('rooms')
      .update({ sort_order })
      .eq('id', id)
    if (error) errors.push(id)
  }

  if (errors.length) return NextResponse.json({ error: 'Some updates failed', errors }, { status: 500 })
  return NextResponse.json({ ok: true })
}
