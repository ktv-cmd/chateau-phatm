import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'
import { getCartItemsWithProducts } from '@/lib/db/cart'
import { logger } from '@/lib/logger'
import { CartView } from '@/components/CartView'

export const metadata: Metadata = {
  title: 'Shopping Cart | Chateau Drug & Homecare',
}

export default async function CartPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?redirectedFrom=/cart')
  }
  if (isAdmin(user)) {
    redirect('/owner')
  }

  const serverSupabase = await supabaseServerClient()
  const { data: cartItems, error } = await getCartItemsWithProducts(serverSupabase, user.id)

  if (error) {
    logger.error('Error fetching cart:', error)
  }

  return <CartView cartItems={cartItems || []} />
}
