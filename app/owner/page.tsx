import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'
import { getOwnerStats } from '@/lib/db/owner'
import { OwnerDashboard } from '@/components/OwnerDashboard'

export default async function OwnerPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  if (!isAdmin(user.email)) {
    redirect('/products')
  }

  const serverSupabase = await supabaseServerClient()
  const stats = await getOwnerStats(serverSupabase)

  return <OwnerDashboard stats={stats} />
}
