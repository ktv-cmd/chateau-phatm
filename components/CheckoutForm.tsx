'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/db/supabaseClient'
import { clearCart } from '@/lib/db/cart'
import { createOrder, createOrderItems } from '@/lib/db/orders'
import { upsertCustomerProfile } from '@/lib/db/profiles'
import { logger } from '@/lib/logger'
import { CartItem, CustomerProfile } from '@/lib/types'

interface CheckoutFormProps {
  cartItems: (CartItem & { product?: any })[]
  profile: CustomerProfile | null
}

export function CheckoutForm({ cartItems: initialCartItems, profile: initialProfile }: CheckoutFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const errorSummaryRef = useRef<HTMLDivElement>(null)

  const savedAddress = {
    line1: initialProfile?.address_line1 || '',
    line2: initialProfile?.address_line2 || '',
    city: initialProfile?.city || '',
    state: initialProfile?.state || '',
    zip: initialProfile?.zip || ''
  }
  const hasSavedAddress = Boolean(
    savedAddress.line1 && savedAddress.city && savedAddress.state && savedAddress.zip
  )

  const [addressMode, setAddressMode] = useState<'saved' | 'new'>(
    hasSavedAddress ? 'saved' : 'new'
  )
  const [formData, setFormData] = useState({
    firstName: initialProfile?.first_name || '',
    lastName: initialProfile?.last_name || '',
    phone: initialProfile?.phone || '',
    addressLine1: initialProfile?.address_line1 || '',
    addressLine2: initialProfile?.address_line2 || '',
    city: initialProfile?.city || '',
    state: initialProfile?.state || '',
    zip: initialProfile?.zip || '',
    notes: ''
  })

  useEffect(() => {
    if (addressMode === 'saved' && hasSavedAddress) {
      setFormData((prev) => ({
        ...prev,
        addressLine1: savedAddress.line1,
        addressLine2: savedAddress.line2,
        city: savedAddress.city,
        state: savedAddress.state,
        zip: savedAddress.zip
      }))
    }
    if (addressMode === 'new' && hasSavedAddress) {
      setFormData((prev) => ({
        ...prev,
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        zip: ''
      }))
    }
  }, [
    addressMode,
    hasSavedAddress,
    savedAddress.line1,
    savedAddress.line2,
    savedAddress.city,
    savedAddress.state,
    savedAddress.zip
  ])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    // Validation
    const newErrors: Record<string, string> = {}
    if (initialCartItems.length === 0) {
      newErrors.submit = 'Your cart is empty. Please add items before checkout.'
    }
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
    if (!formData.addressLine1.trim()) newErrors.addressLine1 = 'Address line 1 is required'
    if (!formData.city.trim()) newErrors.city = 'City is required'
    if (!formData.state.trim()) newErrors.state = 'State is required'
    if (!formData.zip.trim()) newErrors.zip = 'ZIP code is required'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setTimeout(() => errorSummaryRef.current?.focus(), 0)
      return
    }

    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (!user) {
        setIsSubmitting(false)
        router.push('/login')
        return
      }

      // Update or create customer profile
      await upsertCustomerProfile(
        supabaseClient,
        user.id,
        {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            address_line1: formData.addressLine1,
            address_line2: formData.addressLine2 || null,
            city: formData.city,
            state: formData.state,
            zip: formData.zip,
            notes: formData.notes || null,
            updated_at: new Date().toISOString()
        },
        Boolean(initialProfile)
      )

      // Create order
      const totalItems = initialCartItems.reduce((sum, item) => sum + item.qty, 0)

      const { data: order, error: orderError } = await createOrder(supabaseClient, {
          user_id: user.id,
          status: 'NEW',
          delivery_address_snapshot: {
            line1: formData.addressLine1,
            line2: formData.addressLine2 || undefined,
            city: formData.city,
            state: formData.state,
            zip: formData.zip
          },
          phone_snapshot: formData.phone,
          notes: formData.notes || null,
          total_items: totalItems
        })

      if (orderError || !order) {
        throw new Error('Failed to create order')
      }

      // Create order items
      const orderItems = initialCartItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name_snapshot: item.product?.name || 'Product',
        product_sku_snapshot: item.product?.sku || null,
        price_display_snapshot: item.product?.price_display || 'Call',
        qty: item.qty
      }))

      const { error: itemsError } = await createOrderItems(supabaseClient, orderItems)

      if (itemsError) {
        throw new Error('Failed to create order items')
      }

      // Clear cart
      const { error: clearError } = await clearCart(supabaseClient, user.id)
      if (clearError) {
        throw new Error('Failed to clear cart')
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cart:updated'))
      }

      // Send to Google Sheets
      // Redirect to order confirmation
      router.push(`/orders/${order.id}?success=true`)
    } catch (error) {
      logger.error('Checkout error:', error)
      setErrors({ submit: 'An error occurred. Please try again.' })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid gap-8">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Delivery Information</h2>
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Payment is handled by the pharmacy after order review.
              </p>
            </div>
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
                  <label htmlFor="firstName" className="label">
                    First Name <span className="text-red-600" aria-label="required">*</span>
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    required
                    aria-required="true"
                    autoComplete="given-name"
                    value={formData.firstName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                    className={errors.firstName ? 'input-error' : 'input'}
                    aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                    aria-invalid={errors.firstName ? 'true' : 'false'}
                  />
                  {errors.firstName && (
                    <p id="firstName-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="lastName" className="label">
                    Last Name <span className="text-red-600" aria-label="required">*</span>
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    required
                    aria-required="true"
                    autoComplete="family-name"
                    value={formData.lastName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                    className={errors.lastName ? 'input-error' : 'input'}
                    aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                    aria-invalid={errors.lastName ? 'true' : 'false'}
                  />
                  {errors.lastName && (
                    <p id="lastName-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="label">
                  Phone Number <span className="text-red-600" aria-label="required">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  aria-required="true"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className={errors.phone ? 'input-error' : 'input'}
                  aria-describedby={errors.phone ? 'phone-error' : undefined}
                  aria-invalid={errors.phone ? 'true' : 'false'}
                />
                {errors.phone && (
                  <p id="phone-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.phone}
                  </p>
                )}
              </div>

              <fieldset className="space-y-3">
                <legend className="label">Delivery Address</legend>
                {hasSavedAddress && (
                  <label className="flex items-start gap-3 rounded-xl border border-gray-200/60 bg-white/70 p-3">
                    <input
                      type="radio"
                      name="addressMode"
                      value="saved"
                      checked={addressMode === 'saved'}
                      onChange={() => setAddressMode('saved')}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-gray-900">Use saved address</span>
                      <span className="block text-sm text-gray-600">
                        {savedAddress.line1}
                        {savedAddress.line2 ? `, ${savedAddress.line2}` : ''},{' '}
                        {savedAddress.city}, {savedAddress.state} {savedAddress.zip}
                      </span>
                    </span>
                  </label>
                )}
                <label className="flex items-start gap-3 rounded-xl border border-gray-200/60 bg-white/70 p-3">
                  <input
                    type="radio"
                    name="addressMode"
                    value="new"
                    checked={addressMode === 'new'}
                    onChange={() => setAddressMode('new')}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-gray-900">Use a new address</span>
                    <span className="block text-sm text-gray-600">Enter a different delivery address.</span>
                  </span>
                </label>
                {!hasSavedAddress && (
                  <p className="text-xs text-gray-500">
                    No saved address yet. Your first order will save one for next time.
                  </p>
                )}

                <div>
                  <label htmlFor="addressLine1" className="label">
                    Address Line 1 <span className="text-red-600" aria-label="required">*</span>
                  </label>
                  <input
                    id="addressLine1"
                    type="text"
                    required
                    aria-required="true"
                    autoComplete="street-address"
                    value={formData.addressLine1}
                    onChange={(e) => setFormData((prev) => ({ ...prev, addressLine1: e.target.value }))}
                    disabled={addressMode === 'saved' && hasSavedAddress}
                    className={errors.addressLine1 ? 'input-error' : 'input'}
                    aria-describedby={errors.addressLine1 ? 'addressLine1-error' : undefined}
                    aria-invalid={errors.addressLine1 ? 'true' : 'false'}
                  />
                  {errors.addressLine1 && (
                    <p id="addressLine1-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.addressLine1}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="addressLine2" className="label">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    id="addressLine2"
                    type="text"
                    autoComplete="address-line2"
                    value={formData.addressLine2}
                    onChange={(e) => setFormData((prev) => ({ ...prev, addressLine2: e.target.value }))}
                    disabled={addressMode === 'saved' && hasSavedAddress}
                    className="input"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label htmlFor="city" className="label">
                      City <span className="text-red-600" aria-label="required">*</span>
                    </label>
                    <input
                      id="city"
                      type="text"
                      required
                      aria-required="true"
                      autoComplete="address-level2"
                      value={formData.city}
                      onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                      disabled={addressMode === 'saved' && hasSavedAddress}
                      className={errors.city ? 'input-error' : 'input'}
                      aria-describedby={errors.city ? 'city-error' : undefined}
                      aria-invalid={errors.city ? 'true' : 'false'}
                    />
                    {errors.city && (
                      <p id="city-error" className="mt-1 text-sm text-red-600" role="alert">
                        {errors.city}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="state" className="label">
                      State <span className="text-red-600" aria-label="required">*</span>
                    </label>
                    <input
                      id="state"
                      type="text"
                      required
                      aria-required="true"
                      maxLength={2}
                      autoComplete="address-level1"
                      value={formData.state}
                      onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value.toUpperCase() }))}
                      disabled={addressMode === 'saved' && hasSavedAddress}
                      className={errors.state ? 'input-error' : 'input'}
                      aria-describedby={errors.state ? 'state-error' : undefined}
                      aria-invalid={errors.state ? 'true' : 'false'}
                      aria-label="State (2-letter abbreviation)"
                    />
                    {errors.state && (
                      <p id="state-error" className="mt-1 text-sm text-red-600" role="alert">
                        {errors.state}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="zip" className="label">
                    ZIP Code <span className="text-red-600" aria-label="required">*</span>
                  </label>
                  <input
                    id="zip"
                    type="text"
                    required
                    aria-required="true"
                    autoComplete="postal-code"
                    value={formData.zip}
                    onChange={(e) => setFormData((prev) => ({ ...prev, zip: e.target.value }))}
                    disabled={addressMode === 'saved' && hasSavedAddress}
                    className={errors.zip ? 'input-error' : 'input'}
                    aria-describedby={errors.zip ? 'zip-error' : undefined}
                    aria-invalid={errors.zip ? 'true' : 'false'}
                  />
                  {errors.zip && (
                    <p id="zip-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.zip}
                    </p>
                  )}
                </div>
              </fieldset>

              <div>
                <label htmlFor="notes" className="label">
                  Order Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="input"
                  aria-describedby="notes-help"
                />
                <p id="notes-help" className="mt-1 text-sm text-gray-500">
                  Any special instructions or notes for your order
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full text-lg py-3"
                aria-describedby={isSubmitting ? 'submitting-text' : undefined}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="sr-only" id="submitting-text">Submitting order, please wait</span>
                    <span aria-live="polite">Placing Order...</span>
                  </>
                ) : (
                  'Place Order'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
