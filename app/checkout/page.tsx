import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser, getCustomerProfile } from '@/lib/auth-server'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'
import { getCartItemsWithProducts } from '@/lib/db/cart'
import { CheckoutForm } from '@/components/CheckoutForm'

export const metadata: Metadata = {
  title: 'Checkout | Chateau Drug & Homecare',
}

export default async function CheckoutPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?redirectedFrom=/checkout')
  }

  const serverSupabase = await supabaseServerClient()

  const { data: cartItems } = await getCartItemsWithProducts(serverSupabase, user.id)

  if (!cartItems || cartItems.length === 0) {
    redirect('/cart')
  }

  // Get customer profile
  const profile = await getCustomerProfile(user.id)

  return <CheckoutForm cartItems={cartItems} profile={profile} />
}
