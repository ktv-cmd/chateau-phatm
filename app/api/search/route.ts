import { NextResponse } from 'next/server'
import { searchProducts } from '@/lib/search/search'

const MIN_QUERY_LENGTH = 2
const MAX_QUERY_LENGTH = 80
const MAX_LIMIT = 50
const MAX_PAGE = 20

function invalid(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const rawQuery = searchParams.get('q') || ''
  const query = rawQuery.trim()

  if (!query || query.length < MIN_QUERY_LENGTH) {
    return invalid('Query too short.')
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return invalid('Query too long.')
  }

  const limitParam = searchParams.get('limit')
  const pageParam = searchParams.get('page')
  const limit = limitParam ? Number(limitParam) : 20
  const page = pageParam ? Number(pageParam) : 1
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return invalid('Invalid limit.')
  }
  if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) {
    return invalid('Invalid page.')
  }

  const category = searchParams.get('category') || undefined
  const inStockOnly = searchParams.get('inStock') === 'true'
  const ageGroup = searchParams.get('ageGroup') || undefined
  if (category && category.length > 80) {
    return invalid('Invalid category.')
  }
  if (ageGroup && ageGroup.length > 20) {
    return invalid('Invalid age group.')
  }

  const includeDebug = searchParams.get('debug') === 'true'
  const includeSuggestions = searchParams.get('suggest') !== 'false'

  const results = await searchProducts(
    query,
    { category, inStockOnly, ageGroup },
    { page, limit, includeSuggestions, includeDebug }
  )

  return NextResponse.json(results)
}
