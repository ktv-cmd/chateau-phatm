'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SearchAutocomplete } from '@/components/SearchAutocomplete'

export function LandingSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')

  function submit(nextQuery?: string) {
    const query = (nextQuery ?? q).trim()
    if (!query) {
      router.push('/products')
      return
    }
    router.push(`/products?search=${encodeURIComponent(query)}`)
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className="flex flex-col sm:flex-row gap-3"
      role="search"
    >
      <label htmlFor="landing-search" className="sr-only">
        Search products
      </label>
      <SearchAutocomplete
        id="landing-search"
        value={q}
        onChange={setQ}
        onSubmit={submit}
        placeholder="Search products, brands, or categories…"
        ariaLabel="Search products"
      />
      <button type="submit" className="btn-primary px-5">
        Search
      </button>
    </form>
  )
}

