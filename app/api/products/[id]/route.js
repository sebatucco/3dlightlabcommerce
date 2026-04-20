import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) return null

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function mapProduct(product) {
  if (!product) return null

  const mediaRows = Array.isArray(product.product_images)
    ? [...product.product_images].sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0))
    : []

  const productImages = mediaRows
    .map((item) => ({
      id: item?.id || null,
      image_url: item?.image_url || '',
      alt_text: item?.alt_text || product.name,
      sort_order: item?.sort_order ?? 0,
      media_type: item?.media_type || 'image',
      use_case: item?.use_case || null,
      is_primary: Boolean(item?.is_primary),
    }))
    .filter((item) => item.image_url)

  const detailImages = productImages.filter((item) => item.media_type === 'image')
  const firstImage = detailImages[0]?.image_url || ''

  return {
    id: product.id,
    slug: product.slug || String(product.id),
    name: product.name,
    shortDescription: product.short_description || null,
    short_description: product.short_description || null,
    description: product.description || product.short_description || '',
    price: Number(product.price || 0),
    originalPrice: product.compare_at_price == null ? null : Number(product.compare_at_price),
    compare_at_price: product.compare_at_price == null ? null : Number(product.compare_at_price),
    sku: product.sku || null,
    stock: Number(product.stock ?? 0),
    featured: Boolean(product.featured),
    active: Boolean(product.active ?? true),
    category: product.categories?.name || 'General',
    category_data: product.categories
      ? {
        id: product.categories.id,
        name: product.categories.name,
        slug: product.categories.slug,
      }
      : null,
    image: firstImage,
    images: detailImages.map((item) => item.image_url),
    product_images: productImages,
    createdAt: product.created_at || null,
  }
}

function responseNoStore(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}

async function fetchProductByField(supabase, field, value) {
  return supabase
    .from('products')
    .select(`
      id,
      category_id,
      name,
      slug,
      short_description,
      description,
      price,
      compare_at_price,
      sku,
      stock,
      featured,
      active,
      created_at,
      categories ( id, name, slug ),
      product_images ( id, image_url, alt_text, sort_order, media_type, use_case, is_primary )
    `)
    .eq(field, value)
    .eq('active', true)
    .maybeSingle()
}

export async function GET(_request, context) {
  const params = await context.params
  const id = params?.id

  if (!id) {
    return NextResponse.json({ error: 'ID no proporcionado' }, { status: 400 })
  }

  const supabase = getSupabaseClient()

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase no configurado' }, { status: 500 })
  }

  try {
    let response = await fetchProductByField(supabase, 'id', id)

    if ((!response.data || response.error) && typeof id === 'string') {
      response = await fetchProductByField(supabase, 'slug', id)
    }

    if (response.error) {
      return NextResponse.json(
        { error: response.error.message, details: response.error },
        { status: 500 }
      )
    }

    if (!response.data) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    return responseNoStore(mapProduct(response.data))
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo obtener el producto' },
      { status: 500 }
    )
  }
}