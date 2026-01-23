import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'
import { getOrderById, getOrderItems } from '@/lib/db/orders'
import { OrderDetail } from '@/components/OrderDetail'

interface OrderPageProps {
  params: { id: string }
  searchParams: { success?: string }
}

export default async function OrderPage({ params, searchParams }: OrderPageProps) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  const serverSupabase = await supabaseServerClient()
  const { data: order, error } = await getOrderById(serverSupabase, params.id)

  if (error || !order) {
    notFound()
  }

  // Check if user has access (own order or admin)
  if (!isAdmin(user.email) && order.user_id !== user.id) {
    redirect('/orders')
  }

  const { data: orderItems } = await getOrderItems(serverSupabase, order.id)

  return <OrderDetail order={order} orderItems={orderItems || []} showSuccess={searchParams.success === 'true'} />
}
