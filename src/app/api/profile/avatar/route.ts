import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

const BUCKET = 'avatars'
const MAX_BYTES = 2 * 1024 * 1024   // 2 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/gif':  'gif',
}

/**
 * Uploads run through the server with the service-role client rather than
 * straight from the browser: the path is then chosen here, so a signed-in user
 * can only ever write inside their own folderand the bucket needs no storage
 * policies of its own.
 */
async function ensureBucket(admin: Awaited<ReturnType<typeof createAdminClient>>) {
  const { data } = await admin.storage.getBucket(BUCKET)
  if (data) return
  // Public: an avatar is shown next to the guest's name all over the appand a
  // signed URL would expire mid-session.
  await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: [...ALLOWED],
  })
}

/** Old photos would otherwise pile up in the bucket, one per upload. */
async function removeExisting(admin: Awaited<ReturnType<typeof createAdminClient>>, userId: string) {
  const { data: files } = await admin.storage.from(BUCKET).list(userId)
  if (files?.length) {
    await admin.storage.from(BUCKET).remove(files.map(f => `${userId}/${f.name}`))
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No image was uploaded' }, { status: 400 })
  }
  if (!ALLOWED.includes(file.type as typeof ALLOWED[number])) {
    return NextResponse.json({ error: 'Use a JPG, PNG, WEBP or GIF image' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image must be 2 MB or smaller' }, { status: 400 })
  }

  const admin = await createAdminClient()
  await ensureBucket(admin)
  await removeExisting(admin, user.id)

  // Timestamped name so a replaced photo isn't served from a stale CDN cache.
  const path = `${user.id}/${Date.now()}.${EXT[file.type] ?? 'jpg'}`
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path)

  const { error: profileError } = await admin
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ url: publicUrl })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = await createAdminClient()
  await removeExisting(admin, user.id)

  const { error } = await admin.from('profiles').update({ avatar_url: null }).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
