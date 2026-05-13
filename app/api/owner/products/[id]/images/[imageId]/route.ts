import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'

interface RouteContext {
  params: { id: string; imageId: string }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdmin(currentUser)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await supabaseServerClient()

  const { data: image, error: imageError } = await supabase
    .from('product_images')
    .select('id, storage_path')
    .eq('id', params.imageId)
    .eq('product_id', params.id)
    .single()

  if (imageError || !image) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 })
  }

  if (image.storage_path) {
    await supabase.storage.from('product-images').remove([image.storage_path])
  }

  const { error: deleteError } = await supabase
    .from('product_images')
    .delete()
    .eq('id', params.imageId)

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 })
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
