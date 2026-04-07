import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function firstImage(product) {
  if (product?.product_images?.length) {
    const sorted = [...product.product_images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    return sorted[0]?.image_url || ''
  }
  return product?.image || product?.image_url || ''
}

function mapProduct(product) {
  if (!product) return product

  const images = Array.isArray(product.product_images)
    ? [...product.product_images]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((item) => item.image_url)
        .filter(Boolean)
    : Array.isArray(product.images)
      ? product.images
      : []

  return {
    id: product.id,
    categoryId: product.category_id || product.categories?.id || null,
    name: product.name,
    slug: product.slug,
    shortDescription: product.short_description || null,
    description: product.description || product.short_description || '',
    price: Number(product.price || 0),
    originalPrice: product.compare_at_price ? Number(product.compare_at_price) : null,
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

export async function GET(_request, { params }) {
  const id = params.id
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
        categories ( id, name, slug ),
        product_images ( image_url, sort_order )
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
          categories ( id, name, slug ),
          product_images ( image_url, sort_order )
        `)
        .eq('slug', id)
        .eq('active', true)
        .maybeSingle()
    }

    if (response.error) {
      return NextResponse.json({ error: response.error.message }, { status: 500 })
    }

    if (!response.data) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    return NextResponse.json(mapProduct(response.data), { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error) {
    return NextResponse.json({ error: 'No se pudo obtener el producto' }, { status: 500 })
  }
}
