import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'
import { listOrders } from '@/lib/db/orders'
import { logger } from '@/lib/logger'
import { OwnerOrdersList } from '@/components/OwnerOrdersList'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Orders | Admin — Chateau Drug & Homecare',
}

interface OwnerOrdersPageProps {
  searchParams: { status?: string }
}

export default async function OwnerOrdersPage({ searchParams }: OwnerOrdersPageProps) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  if (!isAdmin(user)) {
    redirect('/products')
  }

  const serverSupabase = await supabaseServerClient()
  const { data: orders, error } = await listOrders(serverSupabase, searchParams.status)

  if (error) {
    logger.error('Error fetching orders:', error)
  }

  return <OwnerOrdersList orders={orders || []} selectedStatus={searchParams.status} />
}
