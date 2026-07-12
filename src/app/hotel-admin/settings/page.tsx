'use client'

import { type ChangeEvent, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Save, MessageCircle, Copy, ExternalLink, ImagePlus } from 'lucide-react'
import { CURRENCIES } from '@/lib/currency'

export default function HotelSettingsPage() {
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hotelImages, setHotelImages] = useState<string[]>([])
  const [coverImage, setCoverImage] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const hotelForm = useForm()
  const waForm = useForm()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
      if (!profile?.tenant_id) return
      setTenantId(profile.tenant_id)
      const { data } = await supabase.from('hotels').select('*').eq('id', profile.tenant_id).single()
      hotelForm.reset(data)
      setHotelImages(((data?.images as string[]) ?? []).filter(Boolean))
      setCoverImage((data?.cover_image as string | undefined) ?? null)
      waForm.reset({
        whatsapp_number: data?.whatsapp_number ?? '',
        whatsapp_phone_number_id: data?.whatsapp_phone_number_id ?? '',
        whatsapp_access_token: data?.whatsapp_access_token ?? '',
      })
      setLoading(false)
    })
  }, [hotelForm, waForm])

  const saveHotel = async (data: Record<string, unknown>) => {
    const supabase = createClient()
    const latitude = data.latitude === '' || data.latitude == null ? null : Number(data.latitude)
    const longitude = data.longitude === '' || data.longitude == null ? null : Number(data.longitude)
    const { error } = await supabase.from('hotels').update({
      name: data.name,
      description: data.description,
      phone: data.phone,
      email: data.email,
      address: data.address,
      city: data.city,
      country: data.country,
      check_in_time: data.check_in_time,
      check_out_time: data.check_out_time,
      currency: data.currency,
      latitude,
      longitude,
      cover_image: coverImage,
      images: hotelImages,
    }).eq('id', tenantId!)
    if (error) { toast.error(error.message); return }
    toast.success('Settings saved')
  }

  const saveWhatsApp = async (data: Record<string, unknown>) => {
    const supabase = createClient()
    const { error } = await supabase.from('hotels').update({
      whatsapp_number: data.whatsapp_number || null,
      whatsapp_phone_number_id: data.whatsapp_phone_number_id || null,
      whatsapp_access_token: data.whatsapp_access_token || null,
    }).eq('id', tenantId!)
    if (error) { toast.error(error.message); return }
    toast.success('WhatsApp settings saved')
  }

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !tenantId) return

    setUploadingImage(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      const nextImages = [...hotelImages, dataUrl]
      const nextCover = coverImage ?? dataUrl

      const supabase = createClient()
      const { error } = await supabase.from('hotels').update({
        cover_image: nextCover,
        images: nextImages,
      }).eq('id', tenantId)

      if (error) {
        toast.error(error.message)
      } else {
        setCoverImage(nextCover)
        setHotelImages(nextImages)
        toast.success('Hotel image added')
      }
      setUploadingImage(false)
    }

    reader.readAsDataURL(file)
  }

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/whatsapp`
    : '/api/webhooks/whatsapp'

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl)
    toast.success('Webhook URL copied')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
    </div>
  )

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Hotel Settings</h2>
        <p className="text-gray-500 text-sm mt-1">Manage your hotel information, visuals and integrations</p>
      </div>

      <section className="space-y-4">
        <h3 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2">General</h3>
        <form onSubmit={hotelForm.handleSubmit(saveHotel)} className="card p-6 space-y-5">
          <div className="rounded-2xl border border-dashed border-primary-200 bg-primary-50/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">Hotel visuals</p>
                <p className="text-sm text-gray-500">Add a cover image or gallery photo for your hotel profile.</p>
              </div>
              <label className="btn-secondary flex cursor-pointer items-center gap-2">
                <ImagePlus className="h-4 w-4" />
                {uploadingImage ? 'Uploading...' : 'Add image'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {coverImage ? (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <img src={coverImage} alt="Hotel cover" className="h-32 w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-sm text-gray-500">
                  No cover image yet
                </div>
              )}
              <div className="space-y-2">
                {hotelImages.length > 0 ? hotelImages.map((image, index) => (
                  <div key={`${image}-${index}`} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2">
                    <img src={image} alt={`Hotel gallery ${index + 1}`} className="h-10 w-10 rounded-lg object-cover" />
                    <span className="text-sm text-gray-600">Gallery photo {index + 1}</span>
                  </div>
                )) : (
                  <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white text-sm text-gray-500">
                    Add photos to showcase your property
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Hotel Name</label>
              <input {...hotelForm.register('name')} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea {...hotelForm.register('description')} className="input resize-none h-24" />
            </div>
            <div>
              <label className="label">Email</label>
              <input {...hotelForm.register('email')} type="email" className="input" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input {...hotelForm.register('phone')} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Address</label>
              <input {...hotelForm.register('address')} className="input" />
            </div>
            <div>
              <label className="label">City</label>
              <input {...hotelForm.register('city')} className="input" />
            </div>
            <div>
              <label className="label">Country</label>
              <input {...hotelForm.register('country')} className="input" />
            </div>
            <div>
              <label className="label">Check-in Time</label>
              <input {...hotelForm.register('check_in_time')} type="time" className="input" />
            </div>
            <div>
              <label className="label">Check-out Time</label>
              <input {...hotelForm.register('check_out_time')} type="time" className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Currency</label>
              <select {...hotelForm.register('currency')} className="input">
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">All prices and revenue across the dashboard will display in this currency.</p>
            </div>

            <div>
              <label className="label">Latitude</label>
              <input {...hotelForm.register('latitude')} type="number" step="any" placeholder="31.5497" className="input" />
            </div>
            <div>
              <label className="label">Longitude</label>
              <input {...hotelForm.register('longitude')} type="number" step="any" placeholder="74.3436" className="input" />
            </div>
            <div className="md:col-span-2 -mt-2">
              <a
                href="https://www.google.com/maps"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary-600 underline"
              >
                Find your coordinates on Google Maps (right-click the pin → copy the numbers shown)
              </a>
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button
              type="submit"
              disabled={hotelForm.formState.isSubmitting}
              className="btn-primary flex items-center gap-2"
            >
              {hotelForm.formState.isSubmitting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <h3 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-green-600" /> WhatsApp Integration
        </h3>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm space-y-2">
          <p className="font-medium text-green-800">Setup via Meta WhatsApp Business Cloud API</p>
          <ol className="list-decimal list-inside space-y-1 text-green-700">
            <li>Go to Meta for Developers and create a WhatsApp Business app</li>
            <li>Add a WhatsApp product and get your Phone Number ID</li>
            <li>Generate a System User token with <code className="bg-green-100 px-1 rounded">whatsapp_business_messaging</code> permission</li>
            <li>Register the webhook URL below in your Meta app dashboard</li>
            <li>Use <strong>{process.env.NEXT_PUBLIC_WHATSAPP_VERIFY_TOKEN ?? 'your verify token'}</strong> as the verify token</li>
          </ol>
          <a
            href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-green-700 underline font-medium"
          >
            Meta Cloud API Docs <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div>
          <label className="label">Webhook URL <span className="text-gray-400 font-normal">(paste this in Meta dashboard)</span></label>
          <div className="flex gap-2">
            <input value={webhookUrl} readOnly className="input flex-1 bg-gray-50 font-mono text-sm text-gray-600" />
            <button type="button" onClick={copyWebhook} className="btn-secondary flex items-center gap-1.5 shrink-0">
              <Copy className="h-4 w-4" /> Copy
            </button>
          </div>
        </div>

        <form onSubmit={waForm.handleSubmit(saveWhatsApp)} className="card p-6 space-y-4">
          <div>
            <label className="label">WhatsApp Business Number <span className="text-gray-400 font-normal">(displayed to guests)</span></label>
            <input
              {...waForm.register('whatsapp_number')}
              className="input"
              placeholder="+1 555 000 0000"
            />
          </div>
          <div>
            <label className="label">Phone Number ID <span className="text-gray-400 font-normal">(from Meta dashboard)</span></label>
            <input
              {...waForm.register('whatsapp_phone_number_id')}
              className="input font-mono"
              placeholder="1234567890123456"
            />
          </div>
          <div>
            <label className="label">Access Token <span className="text-gray-400 font-normal">(system user token)</span></label>
            <input
              {...waForm.register('whatsapp_access_token')}
              type="password"
              className="input font-mono"
              placeholder="EAAxxxxxxxxx..."
            />
          </div>
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button
              type="submit"
              disabled={waForm.formState.isSubmitting}
              className="btn-primary flex items-center gap-2"
            >
              {waForm.formState.isSubmitting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Save className="h-4 w-4" />}
              Save WhatsApp Settings
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
