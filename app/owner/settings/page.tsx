import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { OwnerSettings } from '@/components/OwnerSettings'

export default async function OwnerSettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!isAdmin(user.email)) redirect('/products')

  return (
    <div className="page">
      <section className="page-content py-10">
        <div className="flex justify-end mb-2">
          <Link href="/owner" className="text-sm font-medium text-primary-700 hover:text-primary-800">
            Back to dashboard
          </Link>
        </div>
        <OwnerSettings email={user.email!} />
      </section>
    </div>
  )
}
