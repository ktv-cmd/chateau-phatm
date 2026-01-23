'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function LandingSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const query = q.trim()
    if (!query) {
      router.push('/products')
      return
    }
    router.push(`/products?search=${encodeURIComponent(query)}`)
  }

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3" aria-label="Search products">
      <label htmlFor="landing-search" className="sr-only">
        Search products
      </label>
      <input
        id="landing-search"
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search products, brands, or categories…"
        className="input flex-1"
      />
      <button type="submit" className="btn-primary px-5">
        Search
      </button>
    </form>
  )
}

