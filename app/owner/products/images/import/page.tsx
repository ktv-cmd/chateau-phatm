import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'
import ProductImageCsvImport from '@/components/ProductImageCsvImport'

export default async function ProductImageImportPage() {
  const user = await getCurrentUser()

  if (!user || user.email !== 'admin@chateau-demo.com') {
    redirect('/login')
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Bulk Image Import</h1>
        <p className="text-gray-600 mt-2">
          Upload a CSV to update product image URLs in bulk. Matches by SKU first, then by exact name.
        </p>
      </div>

      <ProductImageCsvImport />
    </div>
  )
}
