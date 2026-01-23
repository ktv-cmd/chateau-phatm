import { redirect } from 'next/navigation'
import { getCurrentUser, getCustomerProfile } from '@/lib/auth-server'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'
import { getCartItemsWithProducts } from '@/lib/db/cart'
import { CheckoutForm } from '@/components/CheckoutForm'

export default async function CheckoutPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
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
