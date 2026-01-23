import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'
import { listOrdersForUser } from '@/lib/db/orders'
import { logger } from '@/lib/logger'
import { OrdersList } from '@/components/OrdersList'

export default async function OrdersPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  if (isAdmin(user.email)) {
    redirect('/owner/orders')
  }

  const serverSupabase = await supabaseServerClient()
  const { data: orders, error } = await listOrdersForUser(serverSupabase, user.id)

  if (error) {
    logger.error('Error fetching orders:', error)
  }

  return <OrdersList orders={orders || []} isOwner={false} />
}
