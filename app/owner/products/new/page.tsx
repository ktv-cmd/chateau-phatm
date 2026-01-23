import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'
import { listProductCategories } from '@/lib/db/products'
import { OwnerProductEditor } from '@/components/OwnerProductEditor'

export default async function NewProductPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  if (!isAdmin(user.email)) {
    redirect('/products')
  }

  const supabase = await supabaseServerClient()
  const { data: categories } = await listProductCategories(supabase)

  return (
    <div className="page py-10">
      <div className="page-content">
        <OwnerProductEditor categories={categories} images={[]} />
      </div>
    </div>
  )
}
