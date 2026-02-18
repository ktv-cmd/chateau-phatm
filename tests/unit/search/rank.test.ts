import { describe, expect, it } from 'vitest'
import { rankProducts, scoreProduct } from '@/lib/search/rank'
import { SearchResultItem } from '@/lib/search/types'

describe('rankProducts', () => {
  const base: SearchResultItem = {
    id: '1',
    name: 'Pain Relief',
    brand: 'Generic',
    category: 'Pain Relief',
    description: 'Pain reliever and fever reducer',
    in_stock: true
  }

  it('ranks exact brand match above description-only match', () => {
    const items: SearchResultItem[] = [
      { ...base, id: 'desc', name: 'Relief Capsules', description: 'tylenol-like formula', brand: 'Store' },
      { ...base, id: 'brand', name: 'Tylenol Extra Strength', brand: 'Tylenol' }
    ]
    const ranked = rankProducts(items, 'tylenol')
    expect(ranked[0].id).toBe('brand')
  })

  it('boosts in-stock items over out-of-stock', () => {
    const inStock = { ...base, id: 'in', name: 'Advil', brand: 'Advil', in_stock: true }
    const outStock = { ...base, id: 'out', name: 'Advil', brand: 'Advil', in_stock: false }
    const ranked = rankProducts([outStock, inStock], 'advil')
    expect(ranked[0].id).toBe('in')
  })

  it('applies age mismatch penalty', () => {
    const kidsProduct = {
      ...base,
      id: 'kids',
      name: "Children's Pain Relief",
      brand: 'Tylenol',
      age_group: 'kids'
    }
    const adultProduct = {
      ...base,
      id: 'adult',
      name: 'Adult Pain Relief',
      brand: 'Tylenol',
      age_group: 'adult'
    }
    const kidsScore = scoreProduct(kidsProduct, 'adult tylenol')
    const adultScore = scoreProduct(adultProduct, 'adult tylenol')
    expect(adultScore).toBeGreaterThan(kidsScore)
  })
})
