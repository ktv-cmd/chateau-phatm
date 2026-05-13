import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'
import { listOrdersForUser } from '@/lib/db/orders'
import { logger } from '@/lib/logger'
import { OrdersList } from '@/components/OrdersList'

export const metadata: Metadata = {
  title: 'My Orders | Chateau Drug & Homecare',
}

export default async function OrdersPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login?redirectedFrom=/orders')
  }

  if (isAdmin(user)) {
    redirect('/owner/orders')
  }

  const serverSupabase = await supabaseServerClient()
  const { data: orders, error } = await listOrdersForUser(serverSupabase, user.id)

  if (error) {
    logger.error('Error fetching orders:', error)
  }

  return <OrdersList orders={orders || []} isOwner={false} />
}
