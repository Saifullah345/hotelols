'use client'

import { type ChangeEvent, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Loader2, Save, MessageCircle, Copy, ExternalLink, ImagePlus, Trash2,
  AlertTriangle, Plus, X as XIcon, ShoppingBag, Building2, UserCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { CURRENCIES, formatCurrency } from '@/lib/currency'
import PhoneInput from '@/components/ui/PhoneInput'
import { CountrySelect, CitySelect } from '@/components/ui/CountryCitySelect'

const fi = 'w-full px-3.5 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-transparent placeholder:text-gray-300 transition-shadow'
const lbl = 'block text-[10px] font-bold text-gray-400 uppercase tracking-[0.08em] mb-1.5'

export default function HotelSettingsPage() {
  const router = useRouter()

  // Hotel state
  const [tenantId,      setTenantId]      = useState<string | null>(null)
  const [hotelName,     setHotelName]     = useState('')
  const [loading,       setLoading]       = useState(true)
  const [hotelImages,   setHotelImages]   = useState<string[]>([])
  const [coverImage,    setCoverImage]    = useState<string | null>(null)
  const [uploadingImage,setUploadingImage]= useState(false)
  const [countryCode,   setCountryCode]   = useState('')
  const [extraServices, setExtraServices] = useState<{
    id: string; name: string; description: string
    price: number; per: 'flat' | 'per_night' | 'per_person'
  }[]>([])
  const [newSvc,  setNewSvc]  = useState({ name: '', description: '', price: '', per: 'flat' as 'flat' | 'per_night' | 'per_person' })
  const [savingSvc, setSavingSvc] = useState(false)

  // My Account state
  const [userId,          setUserId]          = useState<string | null>(null)
  const [userEmail,       setUserEmail]       = useState('')
  const [userRole,        setUserRole]        = useState('')
  const [displayName,     setDisplayName]     = useState('')
  const [newPassword,     setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingAccount,   setSavingAccount]   = useState(false)

  // Danger zone
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting,      setDeleting]      = useState(false)

  const hotelForm = useForm()
  const waForm    = useForm()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      setUserEmail(user.email ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, full_name, role')
        .eq('id', user.id)
        .single()
      if (!profile?.tenant_id) return
      setTenantId(profile.tenant_id)
      setDisplayName((profile.full_name as string) ?? '')
      setUserRole((profile.role as string) ?? '')

      const { data } = await supabase.from('hotels').select('*').eq('id', profile.tenant_id).single()
      hotelForm.reset(data)
      setHotelName((data?.name as string) ?? '')
      setHotelImages(((data?.images as string[]) ?? []).filter(Boolean))
      setCoverImage((data?.cover_image as string | undefined) ?? null)
      waForm.reset({
        whatsapp_number:           data?.whatsapp_number          ?? '',
        whatsapp_phone_number_id:  data?.whatsapp_phone_number_id ?? '',
        whatsapp_access_token:     data?.whatsapp_access_token    ?? '',
      })
      if (data?.country) {
        const { Country } = await import('country-state-city')
        const match = Country.getAllCountries().find(c => c.name === data.country)
        if (match) setCountryCode(match.isoCode as string)
      }
      setExtraServices((data?.extra_services as typeof extraServices) ?? [])
      setLoading(false)
    })
  }, [hotelForm, waForm])

  // ── Hotel Profile ────────────────────────────────────────────────────
  const saveHotel = async (data: Record<string, unknown>) => {
    const supabase  = createClient()
    const latitude  = data.latitude  == null || data.latitude  === '' ? null : Number(data.latitude)
    const longitude = data.longitude == null || data.longitude === '' ? null : Number(data.longitude)
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
      currency:       data.currency,
      website:        data.website    || null,
      tax_rate:       data.tax_rate   ? Number(data.tax_rate) : 0,
      latitude,
      longitude,
      cover_image:    coverImage,
      images:         hotelImages,
    }).eq('id', tenantId!)
    if (error) { toast.error(error.message); return }
    toast.success('Profile saved')
  }

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !tenantId) return
    setUploadingImage(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl  = reader.result as string
      const nextImgs = [...hotelImages, dataUrl]
      const nextCover = coverImage ?? dataUrl
      const supabase = createClient()
      const { error } = await supabase.from('hotels').update({ cover_image: nextCover, images: nextImgs }).eq('id', tenantId)
      if (error) toast.error(error.message)
      else { setCoverImage(nextCover); setHotelImages(nextImgs); toast.success('Image added') }
      setUploadingImage(false)
    }
    reader.readAsDataURL(file)
  }

  // ── My Account ───────────────────────────────────────────────────────
  const saveAccount = async () => {
    if (newPassword && newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    setSavingAccount(true)
    const supabase = createClient()
    const { error: pe } = await supabase.from('profiles').update({ full_name: displayName.trim() }).eq('id', userId!)
    if (pe) { toast.error(pe.message); setSavingAccount(false); return }
    if (newPassword) {
      const { error: we } = await supabase.auth.updateUser({ password: newPassword })
      if (we) { toast.error(we.message); setSavingAccount(false); return }
      setNewPassword(''); setConfirmPassword('')
    }
    setSavingAccount(false)
    toast.success('Account updated')
  }

  // ── WhatsApp ─────────────────────────────────────────────────────────
  const saveWhatsApp = async (data: Record<string, unknown>) => {
    const supabase = createClient()
    const { error } = await supabase.from('hotels').update({
      whatsapp_number:          data.whatsapp_number          || null,
      whatsapp_phone_number_id: data.whatsapp_phone_number_id || null,
      whatsapp_access_token:    data.whatsapp_access_token    || null,
    }).eq('id', tenantId!)
    if (error) { toast.error(error.message); return }
    toast.success('WhatsApp settings saved')
  }

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/whatsapp`
    : '/api/webhooks/whatsapp'
  const copyWebhook = () => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied') }

  // ── Danger Zone ──────────────────────────────────────────────────────
  const deleteHotel = async () => {
    setDeleting(true)
    const res  = await fetch('/api/admin/delete-hotel', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm_name: deleteConfirm }) })
    const json = await res.json()
    setDeleting(false)
    if (!res.ok) { toast.error(json.error ?? 'Failed to delete hotel'); return }
    toast.success('Hotel deleted'); router.push('/login')
  }

  // ── Extra Services ────────────────────────────────────────────────────
  const addService = () => {
    const name  = newSvc.name.trim()
    const price = parseFloat(newSvc.price)
    if (!name)                       { toast.error('Enter a service name'); return }
    if (isNaN(price) || price <= 0)  { toast.error('Enter a valid price'); return }
    setExtraServices(prev => [...prev, { id: crypto.randomUUID(), name, description: newSvc.description.trim(), price, per: newSvc.per }])
    setNewSvc({ name: '', description: '', price: '', per: 'flat' })
  }
  const removeService    = (id: string) => setExtraServices(prev => prev.filter(s => s.id !== id))
  const saveExtraServices = async () => {
    if (!tenantId) return
    setSavingSvc(true)
    const supabase = createClient()
    const { error } = await supabase.from('hotels').update({ extra_services: extraServices }).eq('id', tenantId)
    setSavingSvc(false)
    if (error) { toast.error(error.message); return }
    toast.success('Extra services saved')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
    </div>
  )

  return (
    <div className="space-y-8">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Hotel profile &amp; preferences</p>
      </div>

      {/* ── Two-column main area ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">

        {/* ── Left: Hotel Profile ── */}
        <form onSubmit={hotelForm.handleSubmit(saveHotel)} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">

          <div className="flex items-center gap-3 pb-1">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Hotel Profile</h3>
              <p className="text-xs text-gray-400 mt-0.5">Used on invoices and guest communications.</p>
            </div>
          </div>

          {/* Core fields */}
          <div className="space-y-4">
            <div>
              <label className={lbl}>Hotel Name</label>
              <input {...hotelForm.register('name')} className={fi} />
            </div>
            <div>
              <label className={lbl}>Tagline</label>
              <input {...hotelForm.register('description')} className={fi} placeholder="Where every stay becomes a story" />
            </div>
            <div>
              <label className={lbl}>Address</label>
              <input {...hotelForm.register('address')} className={fi} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Phone</label>
                <PhoneInput
                  value={(hotelForm.watch('phone') as string) ?? ''}
                  onChange={v => hotelForm.setValue('phone', v)}
                />
              </div>
              <div>
                <label className={lbl}>Email</label>
                <input {...hotelForm.register('email')} type="email" className={fi} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Website</label>
                <input {...hotelForm.register('website')} className={fi} placeholder="www.example.com" />
              </div>
              <div>
                <label className={lbl}>Currency</label>
                <select {...hotelForm.register('currency')} className={fi}>
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Check-in Time</label>
                <input {...hotelForm.register('check_in_time')} type="time" className={fi} />
              </div>
              <div>
                <label className={lbl}>Check-out Time</label>
                <input {...hotelForm.register('check_out_time')} type="time" className={fi} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Tax Rate (%)</label>
                <input {...hotelForm.register('tax_rate')} type="number" min={0} max={100} step={0.01} className={fi} placeholder="10" />
              </div>
            </div>
          </div>

          {/* Location fields */}
          <div className="border-t border-gray-100 pt-4 space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.08em]">Location</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Country</label>
                <CountrySelect
                  value={countryCode}
                  onChange={(isoCode, name) => {
                    setCountryCode(isoCode)
                    hotelForm.setValue('country', name)
                    hotelForm.setValue('city', '')
                  }}
                />
              </div>
              <div>
                <label className={lbl}>City</label>
                <CitySelect
                  countryCode={countryCode}
                  value={(hotelForm.watch('city') as string) ?? ''}
                  onChange={name => hotelForm.setValue('city', name)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Latitude</label>
                <input {...hotelForm.register('latitude')} type="number" step="any" placeholder="31.5497" className={fi} />
              </div>
              <div>
                <label className={lbl}>Longitude</label>
                <input {...hotelForm.register('longitude')} type="number" step="any" placeholder="74.3436" className={fi} />
              </div>
            </div>
            <a
              href="https://www.google.com/maps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-amber-600 underline"
            >
              Find coordinates on Google Maps →
            </a>
          </div>

          {/* Cover image */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-700">Cover Image</p>
                <p className="text-xs text-gray-400">Shown on the public hotel page.</p>
              </div>
              <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                <ImagePlus className="h-4 w-4" />
                {uploadingImage ? 'Uploading…' : 'Upload'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            {coverImage ? (
              <div className="rounded-xl overflow-hidden border border-gray-100 h-36">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverImage} alt="Hotel cover" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="h-24 rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-400">
                No cover image yet
              </div>
            )}
          </div>

          {/* Save */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={hotelForm.formState.isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors shadow-sm"
            >
              {hotelForm.formState.isSubmitting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Save className="h-4 w-4" />}
              Save Profile
            </button>
          </div>
        </form>

        {/* ── Right column ── */}
        <div className="space-y-4">

          {/* My Account */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <UserCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">My Account</h3>
                <p className="text-xs text-gray-400">Signed in as {userEmail}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <label className={lbl}>Display Name</label>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className={fi}
                />
              </div>
              <div>
                <label className={lbl}>Role</label>
                <input
                  value={userRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  readOnly
                  className={`${fi} bg-gray-50 text-gray-500 cursor-default`}
                />
              </div>
              <div>
                <label className={lbl}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep"
                  className={fi}
                />
              </div>
              <div>
                <label className={lbl}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className={fi}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={saveAccount}
              disabled={savingAccount}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold text-sm transition-colors shadow-sm"
            >
              {savingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Account
            </button>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50/50 rounded-2xl border border-red-100 p-5">
            <div className="flex items-center gap-2.5 mb-1">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h3 className="font-bold text-red-600">Danger Zone</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Permanently removes your hotel and all its data — rooms, bookings, payments, and staff. This cannot be undone.
            </p>
            <input
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={`Type "${hotelName}" to confirm`}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-300 placeholder:text-gray-300 mb-3"
            />
            <button
              type="button"
              onClick={deleteHotel}
              disabled={deleting || deleteConfirm.trim().toLowerCase() !== hotelName.trim().toLowerCase()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deleting ? 'Deleting…' : 'Delete Hotel'}
            </button>
          </div>

        </div>
      </div>

      {/* ── WhatsApp Integration ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <MessageCircle className="h-5 w-5 text-green-600" />
          <h3 className="text-base font-bold text-gray-900">WhatsApp Integration</h3>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm space-y-2">
          <p className="font-medium text-green-800">Setup via Meta WhatsApp Business Cloud API</p>
          <ol className="list-decimal list-inside space-y-1 text-green-700">
            <li>Go to Meta for Developers and create a WhatsApp Business app</li>
            <li>Add a WhatsApp product and get your Phone Number ID</li>
            <li>Generate a System User token with <code className="bg-green-100 px-1 rounded">whatsapp_business_messaging</code> permission</li>
            <li>Register the webhook URL below in your Meta app dashboard</li>
            <li>Use <strong>{process.env.NEXT_PUBLIC_WHATSAPP_VERIFY_TOKEN ?? 'your verify token'}</strong> as the verify token</li>
          </ol>
          <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-green-700 underline font-medium">
            Meta Cloud API Docs <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">
            Webhook URL <span className="font-normal text-gray-400">(paste this in Meta dashboard)</span>
          </label>
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
            <input {...waForm.register('whatsapp_number')} className="input" placeholder="+1 555 000 0000" />
          </div>
          <div>
            <label className="label">Phone Number ID <span className="text-gray-400 font-normal">(from Meta dashboard)</span></label>
            <input {...waForm.register('whatsapp_phone_number_id')} className="input font-mono" placeholder="1234567890123456" />
          </div>
          <div>
            <label className="label">Access Token <span className="text-gray-400 font-normal">(system user token)</span></label>
            <input {...waForm.register('whatsapp_access_token')} type="password" className="input font-mono" placeholder="EAAxxxxxxxxx..." />
          </div>
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button type="submit" disabled={waForm.formState.isSubmitting} className="btn-primary flex items-center gap-2">
              {waForm.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save WhatsApp Settings
            </button>
          </div>
        </form>
      </section>

      {/* ── Extra Services ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <ShoppingBag className="h-5 w-5 text-indigo-500" />
          <h3 className="text-base font-bold text-gray-900">Extra Services</h3>
        </div>
        <p className="text-sm text-gray-500">
          Add optional paid services that guests can select when booking (e.g. Breakfast, Airport Transfer, Extra Bed).
        </p>

        {extraServices.length > 0 && (
          <div className="card divide-y divide-gray-100">
            {extraServices.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                  {s.description && <p className="text-xs text-gray-400 mt-0.5">{s.description}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(s.price, hotelForm.watch('currency') || 'PKR')}</p>
                  <p className="text-xs text-gray-400">
                    {s.per === 'flat' ? 'per stay' : s.per === 'per_night' ? 'per night' : 'per person'}
                  </p>
                </div>
                <button type="button" onClick={() => removeService(s.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors ml-1">
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="card p-4 space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.08em]">Add a Service</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Name</label>
              <input value={newSvc.name} onChange={e => setNewSvc(p => ({ ...p, name: e.target.value }))} className="input" placeholder="e.g. Breakfast, Airport Transfer" />
            </div>
            <div>
              <label className="label">Description <span className="text-gray-400 font-normal">(optional)</span></label>
              <input value={newSvc.description} onChange={e => setNewSvc(p => ({ ...p, description: e.target.value }))} className="input" placeholder="Short description for guests" />
            </div>
            <div>
              <label className="label">Price</label>
              <input type="number" min={0} value={newSvc.price} onChange={e => setNewSvc(p => ({ ...p, price: e.target.value }))} className="input" placeholder="500" />
            </div>
            <div>
              <label className="label">Charge per</label>
              <select value={newSvc.per} onChange={e => setNewSvc(p => ({ ...p, per: e.target.value as typeof newSvc.per }))} className="input">
                <option value="flat">Per Stay (flat fee)</option>
                <option value="per_night">Per Night</option>
                <option value="per_person">Per Person</option>
              </select>
            </div>
          </div>
          <button type="button" onClick={addService} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors">
            <Plus className="h-4 w-4" /> Add to List
          </button>
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={saveExtraServices} disabled={savingSvc} className="btn-primary flex items-center gap-2">
            {savingSvc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Extra Services
          </button>
        </div>
      </section>

    </div>
  )
}
