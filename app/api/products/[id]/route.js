import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return null

  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
  })
}

function firstImage(product) {
  if (product?.product_images?.length) {
    const sorted = [...product.product_images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    return sorted[0]?.image_url || ''
  }

  return product?.image || product?.image_url || ''
}

function mapProduct(product) {
  if (!product) return null

  const images = Array.isArray(product.product_images)
    ? [...product.product_images]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((item) => item.image_url)
        .filter(Boolean)
    : Array.isArray(product.images)
      ? product.images.filter(Boolean)
      : []

  return {
    id: product.id,
    slug: product.slug || product.id,
    name: product.name,
    shortDescription: product.short_description || null,
    description: product.description || product.short_description || '',
    price: Number(product.price || 0),
    originalPrice: product.compare_at_price ? Number(product.compare_at_price) : null,
    compare_at_price: product.compare_at_price ? Number(product.compare_at_price) : null,
    sku: product.sku || null,
    stock: Number(product.stock ?? 0),
    featured: Boolean(product.featured),
    active: Boolean(product.active ?? true),
    category: product.categories?.name || product.category || 'General',
    image: firstImage(product),
    images: images.length ? images : [firstImage(product)].filter(Boolean),
    createdAt: product.created_at || null,
  }
}

export const dynamic = 'force-dynamic'

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
    let response = await supabase
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
        category,
        image,
        image_url,
        categories ( id, name, slug ),
        product_images ( id, image_url, alt_text, sort_order )
      `)
      .eq('id', id)
      .eq('active', true)
      .maybeSingle()

    if ((!response.data || response.error) && typeof id === 'string') {
      response = await supabase
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
          category,
          image,
          image_url,
          categories ( id, name, slug ),
          product_images ( id, image_url, alt_text, sort_order )
        `)
        .eq('slug', id)
        .eq('active', true)
        .maybeSingle()
    }

    if (response.error) {
      return NextResponse.json({ error: response.error.message, details: response.error }, { status: 500 })
    }

    if (!response.data) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    return NextResponse.json(mapProduct(response.data), {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'No se pudo obtener el producto' }, { status: 500 })
  }
}
