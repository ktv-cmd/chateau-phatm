import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'
import ProductImageManager from '@/components/ProductImageManager'

export default async function ProductImagesPage() {
  const user = await getCurrentUser()
  
  if (!user || user.email !== 'admin@chateau-demo.com') {
    redirect('/login')
  }
  
  const supabase = await supabaseServerClient()
  
  // Get all products
  const { data: products } = await supabase
    .from('products')
    .select('id, name, brand, image_url, base_product_name, variant_size')
    .order('name')
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Product Image Manager</h1>
      <p className="text-gray-600 mb-8">
        Quickly add or update product images. Search Google Images for each product,
        copy the image URL, and paste it below.
      </p>

      <div className="mb-8">
        <a
          href="/owner/products/images/import"
          className="inline-flex items-center rounded bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          Bulk Import Images (CSV)
        </a>
      </div>
      
      <ProductImageManager products={products || []} />
    </div>
  )
}
