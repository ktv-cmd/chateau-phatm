import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { isAdmin } from '@/lib/roles'
import { supabaseServerClient } from '@/lib/db/supabaseServerClient'

interface RouteContext {
  params: { id: string }
}

export async function POST(request: Request, { params }: RouteContext) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isAdmin(currentUser.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 })
  }

  const supabase = await supabaseServerClient()

  const sanitized = file.name.replace(/[^\w.-]+/g, '-')
  const storagePath = `products/${params.id}/${Date.now()}-${sanitized}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(storagePath, buffer, { contentType: file.type })

  if (uploadError) {
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
  }

  const { data: publicUrl } = supabase.storage
    .from('product-images')
    .getPublicUrl(storagePath)

  const { data: lastImage } = await supabase
    .from('product_images')
    .select('sort_order')
    .eq('product_id', params.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (lastImage?.sort_order ?? -1) + 1

  const { data: insertedImage, error: insertError } = await supabase
    .from('product_images')
    .insert({
      product_id: params.id,
      url: publicUrl.publicUrl,
      storage_path: storagePath,
      sort_order: nextOrder,
    })
    .select('*')
    .single()

  if (insertError) {
    return NextResponse.json({ error: 'Failed to save image' }, { status: 500 })
  }

  await supabase
    .from('products')
    .update({ image_url: publicUrl.publicUrl })
    .eq('id', params.id)
    .is('image_url', null)

  return NextResponse.json({ image: insertedImage })
}
