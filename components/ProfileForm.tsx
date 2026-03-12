'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/db/supabaseClient'
import { upsertCustomerProfile } from '@/lib/db/profiles'
import { logger } from '@/lib/logger'
import { CustomerProfile } from '@/lib/types'

interface ProfileFormProps {
  profile: CustomerProfile | null
  showWelcome?: boolean
}

export function ProfileForm({ profile, showWelcome = false }: ProfileFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const errorSummaryRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState({
    firstName: profile?.first_name || '',
    lastName: profile?.last_name || '',
    phone: profile?.phone || '',
    addressLine1: profile?.address_line1 || '',
    addressLine2: profile?.address_line2 || '',
    city: profile?.city || '',
    state: profile?.state || '',
    zip: profile?.zip || '',
    notes: profile?.notes || ''
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setSuccess(false)

    setIsSaving(true)

    try {
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (!user) {
        setIsSaving(false)
        router.push('/login')
        return
      }

      const { error } = await upsertCustomerProfile(
        supabaseClient,
        user.id,
        {
          first_name: formData.firstName || null,
          last_name: formData.lastName || null,
          phone: formData.phone || null,
          address_line1: formData.addressLine1 || null,
          address_line2: formData.addressLine2 || null,
          city: formData.city || null,
          state: formData.state || null,
          zip: formData.zip || null,
          notes: formData.notes || null,
          updated_at: new Date().toISOString()
        },
        Boolean(profile)
      )

      if (error) throw error

      setSuccess(true)
      router.refresh()
    } catch (error) {
      logger.error('Profile update error:', error)
      setErrors({ submit: 'An error occurred. Please try again.' })
      setTimeout(() => errorSummaryRef.current?.focus(), 0)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="page py-10">
      <div className="max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-6">My Profile</h1>

        {showWelcome && (
          <div
            className="bg-primary-50 border border-primary-200 text-primary-900 px-6 py-4 rounded-lg mb-6"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start">
              <svg className="h-6 w-6 text-primary-600 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <div>
                <h2 className="font-semibold text-lg mb-1">Welcome to Chateau Drug & Homecare!</h2>
                <p className="text-sm">
                  Complete your profile to make ordering faster and easier. Add your contact information and delivery address below.
                </p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div
            className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4"
            role="alert"
            aria-live="polite"
          >
            Profile updated successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
          {errors.submit && (
            <div
              ref={errorSummaryRef}
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded"
              role="alert"
              aria-live="assertive"
              tabIndex={-1}
            >
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="label">First Name</label>
              <input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="label">Last Name</label>
              <input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="label">Phone Number</label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="addressLine1" className="label">Address Line 1</label>
            <input
              id="addressLine1"
              type="text"
              value={formData.addressLine1}
              onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="addressLine2" className="label">Address Line 2</label>
            <input
              id="addressLine2"
              type="text"
              value={formData.addressLine2}
              onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
              className="input"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label htmlFor="city" className="label">City</label>
              <input
                id="city"
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="state" className="label">State</label>
              <input
                id="state"
                type="text"
                maxLength={2}
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="zip" className="label">ZIP Code</label>
            <input
              id="zip"
              type="text"
              value={formData.zip}
              onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="notes" className="label">Notes</label>
            <textarea
              id="notes"
              rows={4}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary w-full"
            aria-describedby={isSaving ? 'saving-text' : undefined}
          >
            {isSaving ? (
              <>
                <span className="sr-only" id="saving-text">Saving profile, please wait</span>
                Saving...
              </>
            ) : (
              'Save Profile'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
