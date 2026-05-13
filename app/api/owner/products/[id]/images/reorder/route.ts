import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'

const reorderSchema = z.object({
  images: z.array(
    z.object({
      id: z.string().uuid(),
      sort_order: z.number().int(),
    })
  ),
})

interface RouteContext {
  params: { id: string }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdmin(currentUser)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = reorderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const supabase = await supabaseServerClient()

  const updates = parsed.data.images.map((image) =>
    supabase
      .from('product_images')
      .update({ sort_order: image.sort_order })
      .eq('id', image.id)
      .eq('product_id', params.id)
  )
  const results = await Promise.all(updates)
  if (results.some((result) => result.error)) {
    return NextResponse.json({ error: 'Failed to reorder images' }, { status: 500 })
  }

  const { data: firstImage } = await supabase
    .from('product_images')
    .select('url')
    .eq('product_id', params.id)
    .order('sort_order')
    .limit(1)
    .maybeSingle()

  await supabase
    .from('products')
    .update({ image_url: firstImage?.url || null })
    .eq('id', params.id)

  return NextResponse.json({ success: true })
}
