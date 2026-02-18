'use client'

import { useState } from 'react'
import { supabaseClient } from '@/lib/db/supabaseClient'

interface Product {
  id: string
  name: string
  brand: string | null
  image_url: string | null
  base_product_name?: string | null
  variant_size?: string | null
}

export default function ProductImageManager({ products }: { products: Product[] }) {
  const [search, setSearch] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  const filteredProducts = products.filter(p => 
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )
  
  async function updateImage(productId: string, imageUrl: string) {
    if (!imageUrl.trim()) return
    
    setUpdating(productId)
    
    const { error } = await supabaseClient
      .from('products')
      .update({ image_url: imageUrl.trim() })
      .eq('id', productId)
    
    if (error) {
      alert('Failed to update image: ' + error.message)
    } else {
      setSuccessMessage('Image updated successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
      window.location.reload()
    }
    
    setUpdating(null)
  }
  
  function openGoogleImages(productName: string) {
    const query = productName.split(' ').slice(0, 5).join(' ')
    window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`, '_blank')
  }
  
  // Group products by brand for easier management
  const topBrands = ['TYLENOL', 'ADVIL', 'MOTRIN', 'MUCINEX', 'NEOSPORIN']
  const priorityProducts = filteredProducts.filter(p => 
    topBrands.some(brand => p.name.toUpperCase().includes(brand))
  )
  const otherProducts = filteredProducts.filter(p => 
    !topBrands.some(brand => p.name.toUpperCase().includes(brand))
  )
  
  return (
    <div>
      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {successMessage}
        </div>
      )}
      
      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="input w-full max-w-md"
        />
      </div>
      
      {/* Priority Products */}
      {priorityProducts.length > 0 && !search && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Priority Brands (Top Sellers)</h2>
          <div className="space-y-4">
            {priorityProducts.map(product => (
              <ProductImageRow
                key={product.id}
                product={product}
                onUpdate={updateImage}
                onSearch={openGoogleImages}
                updating={updating === product.id}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* All Products */}
      <div>
        <h2 className="text-2xl font-bold mb-4">
          {search ? 'Search Results' : 'All Products'} ({filteredProducts.length})
        </h2>
        <div className="space-y-4">
          {(search ? filteredProducts : otherProducts).slice(0, 50).map(product => (
            <ProductImageRow
              key={product.id}
              product={product}
              onUpdate={updateImage}
              onSearch={openGoogleImages}
              updating={updating === product.id}
            />
          ))}
        </div>
        
        {filteredProducts.length > 50 && (
          <p className="mt-4 text-gray-600">
            Showing first 50 products. Use search to find specific products.
          </p>
        )}
      </div>
    </div>
  )
}

function ProductImageRow({ 
  product, 
  onUpdate, 
  onSearch, 
  updating 
}: { 
  product: Product
  onUpdate: (id: string, url: string) => void
  onSearch: (name: string) => void
  updating: boolean
}) {
  const [imageUrl, setImageUrl] = useState(product.image_url || '')
  const isUnsplash = imageUrl.includes('unsplash') || imageUrl.includes('placeholder')
  
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Product Info */}
        <div>
          <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
          {product.brand && (
            <p className="text-sm text-gray-600 mb-2">Brand: {product.brand}</p>
          )}
          
          {/* Current Image Preview */}
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1">Current Image:</p>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.name}
                className="h-24 w-24 object-cover rounded border"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100?text=Error'
                }}
              />
            ) : (
              <div className="h-24 w-24 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                No image
              </div>
            )}
            {isUnsplash && (
              <p className="text-xs text-orange-600 mt-1">⚠️ Generic stock photo</p>
            )}
          </div>
        </div>
        
        {/* Right: Image URL Input */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Image URL:</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/product-image.jpg"
              className="input w-full text-sm"
              disabled={updating}
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => onSearch(product.name)}
              className="btn-secondary text-sm flex-1"
              type="button"
            >
              🔍 Search Google
            </button>
            
            <button
              onClick={() => onUpdate(product.id, imageUrl)}
              disabled={updating || imageUrl === product.image_url}
              className="btn-primary text-sm flex-1"
              type="button"
            >
              {updating ? 'Updating...' : 'Update'}
            </button>
          </div>
          
          <p className="text-xs text-gray-500">
            Tip: Search Google Images, right-click image → &quot;Copy image address&quot;
          </p>
        </div>
      </div>
    </div>
  )
}
