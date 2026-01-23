import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'
import { getCustomerEmail } from '@/lib/db/owner'
import { getOrderById, getOrderItems } from '@/lib/db/orders'
import { OwnerOrderDetail } from '@/components/OwnerOrderDetail'

export const dynamic = 'force-dynamic'

interface OwnerOrderPageProps {
  params: { id: string }
}

export default async function OwnerOrderPage({ params }: OwnerOrderPageProps) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  if (!isAdmin(user.email)) {
    redirect('/products')
  }

  const serverSupabase = await supabaseServerClient()
  const { data: order, error } = await getOrderById(serverSupabase, params.id)

  if (error || !order) {
    notFound()
  }

  const { data: orderItems } = await getOrderItems(serverSupabase, order.id)
  const { data: customerEmail } = await getCustomerEmail(serverSupabase, order.user_id)

  return (
    <OwnerOrderDetail
      order={order}
      orderItems={orderItems || []}
      customerEmail={customerEmail || ''}
    />
  )
}
