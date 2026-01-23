import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.string().min(1),
  price_display: z.string().min(1),
  price_cents: z.number().int().nullable().optional(),
  sale_price_cents: z.number().int().nullable().optional(),
  inventory_qty: z.number().int().nullable().optional(),
  in_stock: z.boolean().optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
})

export async function POST(request: Request) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdmin(currentUser.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = createProductSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const supabase = await supabaseServerClient()
  const { data, error } = await supabase
    .from('products')
    .insert({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
