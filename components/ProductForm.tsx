'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Product } from '@/lib/types'
import { supabaseClient } from '@/lib/db/supabaseClient'
import { createProduct, updateProduct } from '@/lib/db/products'
import { logger } from '@/lib/logger'

interface ProductFormProps {
  product: Product | null
  categories: string[]
  onSuccess: () => void
}

export function ProductForm({ product, categories, onSuccess }: ProductFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    name: product?.name || '',
    brand: product?.brand || '',
    category: product?.category || categories[0] || '',
    description: product?.description || '',
    image_url: product?.image_url || '',
    price_display: product?.price_display || '',
    in_stock: product?.in_stock ?? true,
    sku: product?.sku || ''
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    // Validation
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.category.trim()) newErrors.category = 'Category is required'
    if (!formData.price_display.trim()) newErrors.price_display = 'Price is required'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSaving(true)

    try {
      if (product) {
        const { error } = await updateProduct(supabaseClient, product.id, {
          name: formData.name,
          brand: formData.brand || null,
          category: formData.category,
          description: formData.description || null,
          image_url: formData.image_url || null,
          price_display: formData.price_display,
          in_stock: formData.in_stock,
          sku: formData.sku || null,
          updated_at: new Date().toISOString()
        })

        if (error) throw error
      } else {
        const { error } = await createProduct(supabaseClient, {
          name: formData.name,
          brand: formData.brand || null,
          category: formData.category,
          description: formData.description || null,
          image_url: formData.image_url || null,
          price_display: formData.price_display,
          in_stock: formData.in_stock,
          sku: formData.sku || null
        })

        if (error) throw error
      }

      onSuccess()
      router.refresh()
    } catch (error) {
      logger.error('Product save error:', error)
      setErrors({ submit: 'An error occurred. Please try again.' })
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {errors.submit && (
        <div
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded"
          role="alert"
          aria-live="assertive"
        >
          {errors.submit}
        </div>
      )}

      <div>
        <label htmlFor="name" className="label">
          Product Name <span className="text-red-600" aria-label="required">*</span>
        </label>
        <input
          id="name"
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={errors.name ? 'input-error' : 'input'}
          aria-describedby={errors.name ? 'name-error' : undefined}
          aria-invalid={errors.name ? 'true' : 'false'}
        />
        {errors.name && (
          <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="brand" className="label">Brand (Optional)</label>
        <input
          id="brand"
          type="text"
          value={formData.brand}
          onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
          className="input"
        />
      </div>

      <div>
        <label htmlFor="category" className="label">
          Category <span className="text-red-600" aria-label="required">*</span>
        </label>
        <input
          id="category"
          type="text"
          required
          list="categories"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className={errors.category ? 'input-error' : 'input'}
          aria-describedby={errors.category ? 'category-error' : undefined}
          aria-invalid={errors.category ? 'true' : 'false'}
        />
        <datalist id="categories">
          {categories.map((cat) => (
            <option key={cat} value={cat} />
          ))}
        </datalist>
        {errors.category && (
          <p id="category-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.category}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="label">Description (Optional)</label>
        <textarea
          id="description"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="input"
        />
      </div>

      <div>
        <label htmlFor="image_url" className="label">Image URL (Optional)</label>
        <input
          id="image_url"
          type="url"
          value={formData.image_url}
          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
          className="input"
        />
      </div>

      <div>
        <label htmlFor="price_display" className="label">
          Price <span className="text-red-600" aria-label="required">*</span>
        </label>
        <input
          id="price_display"
          type="text"
          required
          placeholder="e.g., $9.99 or Call"
          value={formData.price_display}
          onChange={(e) => setFormData({ ...formData, price_display: e.target.value })}
          className={errors.price_display ? 'input-error' : 'input'}
          aria-describedby={errors.price_display ? 'price-error' : undefined}
          aria-invalid={errors.price_display ? 'true' : 'false'}
        />
        {errors.price_display && (
          <p id="price-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.price_display}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="sku" className="label">SKU (Optional)</label>
        <input
          id="sku"
          type="text"
          value={formData.sku}
          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
          className="input"
        />
      </div>

      <div className="flex items-center">
        <input
          id="in_stock"
          type="checkbox"
          checked={formData.in_stock}
          onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
        <label htmlFor="in_stock" className="ml-2 label mb-0">
          In Stock
        </label>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSaving}
          className="btn-primary flex-1"
          aria-describedby={isSaving ? 'saving-text' : undefined}
        >
          {isSaving ? (
            <>
              <span className="sr-only" id="saving-text">Saving product, please wait</span>
              Saving...
            </>
          ) : (
            product ? 'Update Product' : 'Add Product'
          )}
        </button>
      </div>
    </form>
  )
}
