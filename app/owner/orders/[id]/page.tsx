import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'
import { getCustomerEmail } from '@/lib/db/owner'
import { getOrderById, getOrderItems } from '@/lib/db/orders'
import { OwnerOrderDetail } from '@/components/OwnerOrderDetail'
import { OrderStatusHistory } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface OwnerOrderPageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: OwnerOrderPageProps): Promise<Metadata> {
  return { title: `Order #${params.id.slice(0, 8)} | Admin — Chateau Drug & Homecare` }
}

export default async function OwnerOrderPage({ params }: OwnerOrderPageProps) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  if (!isAdmin(user)) {
    redirect('/products')
  }

  const serverSupabase = await supabaseServerClient()
  const { data: order, error } = await getOrderById(serverSupabase, params.id)

  if (error || !order) {
    notFound()
  }

  const [{ data: orderItems }, { data: customerEmail }, { data: history }] = await Promise.all([
    getOrderItems(serverSupabase, order.id),
    getCustomerEmail(serverSupabase, order.user_id),
    serverSupabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', order.id)
      .order('updated_at', { ascending: false }),
  ])

  return (
    <OwnerOrderDetail
      order={order}
      orderItems={orderItems || []}
      customerEmail={customerEmail || ''}
      statusHistory={(history as OrderStatusHistory[]) || []}
    />
  )
}
