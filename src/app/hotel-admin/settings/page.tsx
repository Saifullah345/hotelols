'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, Save, MessageCircle, Copy, ExternalLink } from 'lucide-react'

export default function HotelSettingsPage() {
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const hotelForm = useForm()
  const waForm    = useForm()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single()
      if (!profile?.tenant_id) return
      setTenantId(profile.tenant_id)
      const { data } = await supabase.from('hotels').select('*').eq('id', profile.tenant_id).single()
      hotelForm.reset(data)
      waForm.reset({
        whatsapp_number:          data?.whatsapp_number ?? '',
        whatsapp_phone_number_id: data?.whatsapp_phone_number_id ?? '',
        whatsapp_access_token:    data?.whatsapp_access_token ?? '',
      })
      setLoading(false)
    })
  }, [hotelForm, waForm])

  const saveHotel = async (data: Record<string, unknown>) => {
    const supabase = createClient()
    const { error } = await supabase.from('hotels').update({
      name:           data.name,
      description:    data.description,
      phone:          data.phone,
      email:          data.email,
      address:        data.address,
      city:           data.city,
      country:        data.country,
      check_in_time:  data.check_in_time,
      check_out_time: data.check_out_time,
    }).eq('id', tenantId!)
    if (error) { toast.error(error.message); return }
    toast.success('Settings saved')
  }

  const saveWhatsApp = async (data: Record<string, unknown>) => {
    const supabase = createClient()
    const { error } = await supabase.from('hotels').update({
      whatsapp_number:          data.whatsapp_number || null,
      whatsapp_phone_number_id: data.whatsapp_phone_number_id || null,
      whatsapp_access_token:    data.whatsapp_access_token || null,
    }).eq('id', tenantId!)
    if (error) { toast.error(error.message); return }
    toast.success('WhatsApp settings saved')
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
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Hotel Settings</h2>
        <p className="text-gray-500 text-sm mt-1">Manage your hotel information and integrations</p>
      </div>

      {/* ── General Info ── */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2">General</h3>
        <form onSubmit={hotelForm.handleSubmit(saveHotel)} className="card p-6 space-y-5">
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

      {/* ── WhatsApp Business API ── */}
      <section className="space-y-4">
        <h3 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-green-600" /> WhatsApp Integration
        </h3>

        {/* Setup instructions */}
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

        {/* Webhook URL */}
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
