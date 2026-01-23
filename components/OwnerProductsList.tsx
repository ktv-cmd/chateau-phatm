'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Product } from '@/lib/types'

interface OwnerProductsListProps {
  products: Product[]
  categories: string[]
  selectedCategory?: string
  searchQuery?: string
  activeFilter?: string
}

export function OwnerProductsList({
  products: initialProducts,
  categories,
  selectedCategory,
  searchQuery,
  activeFilter
}: OwnerProductsListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [products] = useState(initialProducts)
  const [search, setSearch] = useState(searchQuery || '')
  const [activeStatus, setActiveStatus] = useState(activeFilter || '')

  function handleEdit(product: Product) {
    router.push(`/owner/products/${product.id}`)
  }

  function handleAdd() {
    router.push('/owner/products/new')
  }

  async function handleDelete(productId: string) {
    if (!confirm('Are you sure you want to delete this product?')) return

    const response = await fetch(`/api/owner/products/${productId}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      alert('Failed to delete product. Please try again.')
      return
    }

    router.refresh()
  }

  async function handleToggleActive(product: Product, isActive: boolean) {
    const response = await fetch(`/api/owner/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    })
    if (!response.ok) {
      alert('Failed to update product. Please try again.')
      return
    }
    router.refresh()
  }

  async function handleToggleStock(product: Product, inStock: boolean) {
    const response = await fetch(`/api/owner/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ in_stock: inStock }),
    })
    if (!response.ok) {
      alert('Failed to update product. Please try again.')
      return
    }
    router.refresh()
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (search) {
      params.set('search', search)
    } else {
      params.delete('search')
    }
    router.push(`/owner/products?${params.toString()}`)
  }

  function handleCategoryChange(category: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (category) {
      params.set('category', category)
    } else {
      params.delete('category')
    }
    router.push(`/owner/products?${params.toString()}`)
  }

  function handleActiveFilterChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('active', value)
    } else {
      params.delete('active')
    }
    router.push(`/owner/products?${params.toString()}`)
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Products</h1>
          <button
            onClick={handleAdd}
            className="btn-primary"
            aria-label="Add new product"
          >
            Add Product
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-4">
            <label htmlFor="search" className="sr-only">Search products</label>
            <input
              id="search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="input flex-1"
              aria-label="Search products"
            />
            <button type="submit" className="btn-primary">
              Search
            </button>
          </form>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="category-filter" className="label">Filter by Category</label>
              <select
                id="category-filter"
                value={selectedCategory || ''}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="input"
                aria-label="Filter products by category"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="active-filter" className="label">Filter by Status</label>
              <select
                id="active-filter"
                value={activeStatus}
                onChange={(e) => {
                  setActiveStatus(e.target.value)
                  handleActiveFilterChange(e.target.value)
                }}
                className="input"
                aria-label="Filter products by active status"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="card overflow-x-auto">
          <table className="w-full" aria-label="Products table">
            <caption className="sr-only">List of all products</caption>
            <thead>
              <tr className="border-b">
                <th scope="col" className="text-left py-3 px-4">Photo</th>
                <th scope="col" className="text-left py-3 px-4">Title</th>
                <th scope="col" className="text-left py-3 px-4">Category</th>
                <th scope="col" className="text-left py-3 px-4">Price</th>
                <th scope="col" className="text-left py-3 px-4">Inventory</th>
                <th scope="col" className="text-left py-3 px-4">Active</th>
                <th scope="col" className="text-left py-3 px-4">Updated</th>
                <th scope="col" className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-12 w-12 rounded object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                        No image
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-semibold">{product.name}</td>
                  <td className="py-3 px-4">{product.category}</td>
                  <td className="py-3 px-4">{product.price_display}</td>
                  <td className="py-3 px-4">
                    {typeof product.inventory_qty === 'number'
                      ? product.inventory_qty
                      : product.in_stock
                        ? 'In Stock'
                        : 'Out of Stock'}
                  </td>
                  <td className="py-3 px-4">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={product.is_active ?? true}
                        onChange={(e) => handleToggleActive(product, e.target.checked)}
                      />
                      <span className="text-sm">
                        {product.is_active ?? true ? 'Active' : 'Inactive'}
                      </span>
                    </label>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(product.updated_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="btn-secondary text-sm"
                        aria-label={`Edit ${product.name}`}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="btn-danger text-sm"
                        aria-label={`Delete ${product.name}`}
                        type="button"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleToggleStock(product, !product.in_stock)}
                        className="btn-secondary text-sm"
                        type="button"
                      >
                        {product.in_stock ? 'Mark Out' : 'Mark In'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {products.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-gray-600 text-lg">No products found.</p>
          </div>
        )}

      </div>
    </div>
  )
}
