import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'
import { getProductById, listProductCategories } from '@/lib/db/products'
import { listProductImages } from '@/lib/db/productImages'
import { OwnerProductEditor } from '@/components/OwnerProductEditor'

interface OwnerProductPageProps {
  params: { id: string }
}

export default async function OwnerProductPage({ params }: OwnerProductPageProps) {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  if (!isAdmin(user.email)) {
    redirect('/products')
  }

  const supabase = await supabaseServerClient()
  const { data: product, error } = await getProductById(supabase, params.id)
  if (error || !product) {
    notFound()
  }

  const { data: categories } = await listProductCategories(supabase)
  const { data: images } = await listProductImages(supabase, params.id)

  return (
    <div className="page py-10">
      <div className="page-content">
        <OwnerProductEditor product={product} categories={categories} images={images} />
      </div>
    </div>
  )
}
