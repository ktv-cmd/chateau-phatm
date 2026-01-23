'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Product, ProductImage } from '@/lib/types'
import { logger } from '@/lib/logger'

interface OwnerProductEditorProps {
  product?: Product | null
  categories: string[]
  images: ProductImage[]
}

function parseCents(value: string) {
  const normalized = value.replace(/[^0-9.]/g, '')
  if (!normalized) return null
  const parsed = Number.parseFloat(normalized)
  if (Number.isNaN(parsed)) return null
  return Math.round(parsed * 100)
}

export function OwnerProductEditor({ product, categories, images }: OwnerProductEditorProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [imageList, setImageList] = useState(images)

  useEffect(() => {
    setImageList(images)
  }, [images])

  const initialPrice = useMemo(() => {
    if (typeof product?.price_cents === 'number') {
      return (product.price_cents / 100).toFixed(2)
    }
    if (product?.price_display) {
      const parsed = parseCents(product.price_display)
      return parsed ? (parsed / 100).toFixed(2) : ''
    }
    return ''
  }, [product?.price_cents, product?.price_display])

  const initialSalePrice = useMemo(() => {
    if (typeof product?.sale_price_cents === 'number') {
      return (product.sale_price_cents / 100).toFixed(2)
    }
    return ''
  }, [product?.sale_price_cents])

  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    category: product?.category || categories[0] || '',
    price: initialPrice,
    salePrice: initialSalePrice,
    inventoryQty: product?.inventory_qty?.toString() || '',
    inStock: product?.in_stock ?? true,
    isActive: product?.is_active ?? true,
    isFeatured: product?.is_featured ?? false,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const form = e.currentTarget as HTMLFormElement
    const formValues = new FormData(form)
    const nameValue = (formData.name || String(formValues.get('name') || '')).trim()
    const descriptionValue = formData.description || String(formValues.get('description') || '')
    const categoryValue = (formData.category || String(formValues.get('category') || '')).trim()
    const inventoryQtyValue = formData.inventoryQty || String(formValues.get('inventoryQty') || '')
    const priceValue = formData.price || String(formValues.get('price') || '')
    const salePriceValue = formData.salePrice || String(formValues.get('salePrice') || '')

    if (!nameValue) {
      setError('Title is required.')
      return
    }
    if (!categoryValue) {
      setError('Category is required.')
      return
    }

    const priceCents = parseCents(priceValue)
    if (priceCents === null) {
      setError('Price is required.')
      return
    }

    const salePriceCents = parseCents(salePriceValue)
    const inventoryQty = inventoryQtyValue ? Number.parseInt(inventoryQtyValue, 10) : null
    const computedInStock =
      Number.isInteger(inventoryQty) ? (inventoryQty as number) > 0 : formData.inStock

    const payload = {
      name: nameValue,
      description: descriptionValue.trim() || null,
      category: categoryValue,
      price_cents: priceCents,
      price_display: `$${(priceCents / 100).toFixed(2)}`,
      sale_price_cents: salePriceCents,
      inventory_qty: inventoryQty,
      in_stock: computedInStock,
      is_active: formData.isActive,
      is_featured: formData.isFeatured,
    }

    try {
      setIsSaving(true)
      const response = await fetch(
        product ? `/api/owner/products/${product.id}` : '/api/owner/products',
        {
          method: product ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to save product.')
      }
      const data = await response.json().catch(() => null)
      setSuccess('Saved successfully.')
      if (!product && data?.id) {
        router.push(`/owner/products/${data.id}`)
      } else {
        router.refresh()
      }
    } catch (err) {
      logger.error('Owner product save error:', err)
      setError('Unable to save product. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!product || !files?.length) return
    setUploading(true)
    setError(null)
    try {
      const uploads = Array.from(files).map(async (file) => {
        const body = new FormData()
        body.append('file', file)
        const response = await fetch(`/api/owner/products/${product.id}/images`, {
          method: 'POST',
          body,
        })
        if (!response.ok) {
          const data = await response.json().catch(() => null)
          throw new Error(data?.error || 'Failed to upload image.')
        }
      })
      await Promise.all(uploads)
      router.refresh()
    } catch (err) {
      logger.error('Image upload error:', err)
      setError('Unable to upload image. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteImage(imageId: string) {
    if (!product) return
    const response = await fetch(`/api/owner/products/${product.id}/images/${imageId}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      setError('Unable to remove image. Please try again.')
      return
    }
    router.refresh()
  }

  async function handleReorder(imageId: string, direction: 'up' | 'down') {
    if (!product) return
    const index = imageList.findIndex((img) => img.id === imageId)
    if (index < 0) return
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= imageList.length) return

    const updated = [...imageList]
    const [moved] = updated.splice(index, 1)
    updated.splice(newIndex, 0, moved)
    setImageList(updated)

    const payload = updated.map((img, idx) => ({ id: img.id, sort_order: idx }))
    const response = await fetch(`/api/owner/products/${product.id}/images/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ images: payload }),
    })
    if (!response.ok) {
      setError('Unable to reorder images. Please try again.')
      return
    }
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="card space-y-5" noValidate>
        <div>
          <h1 className="text-2xl font-bold">{product ? 'Edit Product' : 'New Product'}</h1>
          <p className="text-sm text-gray-600">Update the details that customers will see.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded" role="alert">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded" role="status">
            {success}
          </div>
        )}

        <div>
          <label htmlFor="name" className="label">Title</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            className="input"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="label">Description</label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            className="input"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="category" className="label">Category</label>
            <input
              id="category"
              name="category"
              type="text"
              list="categories"
              value={formData.category}
              onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
              className="input"
              required
            />
            <datalist id="categories">
              {categories.map((cat) => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="inventoryQty" className="label">Inventory Qty</label>
            <input
              id="inventoryQty"
              name="inventoryQty"
              type="number"
              min="0"
              value={formData.inventoryQty}
              onChange={(e) => setFormData((prev) => ({ ...prev, inventoryQty: e.target.value }))}
              className="input"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="price" className="label">Price</label>
            <input
              id="price"
              name="price"
              type="text"
              value={formData.price}
              onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
              className="input"
              placeholder="19.99"
              required
            />
          </div>
          <div>
            <label htmlFor="salePrice" className="label">Sale Price (Optional)</label>
            <input
              id="salePrice"
              name="salePrice"
              type="text"
              value={formData.salePrice}
              onChange={(e) => setFormData((prev) => ({ ...prev, salePrice: e.target.value }))}
              className="input"
              placeholder="14.99"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.inStock}
              onChange={(e) => setFormData((prev) => ({ ...prev, inStock: e.target.checked }))}
            />
            <span className="text-sm">In Stock</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            <span className="text-sm">Active</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isFeatured}
              onChange={(e) => setFormData((prev) => ({ ...prev, isFeatured: e.target.checked }))}
            />
            <span className="text-sm">Featured</span>
          </label>
        </div>

        <button type="submit" className="btn-primary" disabled={isSaving}>
          {isSaving ? 'Saving...' : product ? 'Save Changes' : 'Create Product'}
        </button>
      </form>

      <div className="card space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Product Images</h2>
          <p className="text-sm text-gray-600">Upload, remove, or reorder images.</p>
        </div>
        {!product && (
          <div className="text-sm text-gray-600">
            Save the product first to enable image uploads.
          </div>
        )}
        {product && (
          <>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading}
              onChange={(e) => handleUpload(e.target.files)}
            />
            <div className="grid gap-4 md:grid-cols-3">
              {imageList.map((image, idx) => (
                <div key={image.id} className="border rounded-lg p-3 space-y-2">
                  <img src={image.url} alt={`Product image ${idx + 1}`} className="h-40 w-full object-cover rounded" />
                  <div className="flex items-center justify-between text-sm">
                    <span>#{idx + 1}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        onClick={() => handleReorder(image.id, 'up')}
                        disabled={idx === 0}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        onClick={() => handleReorder(image.id, 'down')}
                        disabled={idx === imageList.length - 1}
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        className="btn-danger text-xs"
                        onClick={() => handleDeleteImage(image.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {imageList.length === 0 && (
                <div className="text-sm text-gray-600">No images yet.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
