import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fallbackProducts } from '@/lib/site'

export const dynamic = 'force-dynamic'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function slugifyCategory(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function normalizeCategoryRecord(category) {
  if (!category?.name && !category?.slug) return null
  const name = category?.name || category?.slug || ''
  const slug = category?.slug || slugifyCategory(name)
  if (!slug) return null
  return {
    id: category?.id || slug,
    name,
    slug,
    description: category?.description || null,
    sort_order: category?.sort_order ?? null,
    active: category?.active ?? true,
  }
}

function normalizeProduct(product, categoryMap = new Map()) {
  const mappedCategory = product?.category_id ? categoryMap.get(product.category_id) : null
  const joinedCategory = Array.isArray(product?.categories)
    ? normalizeCategoryRecord(product.categories[0])
    : normalizeCategoryRecord(product?.categories)
  const categoryRow = mappedCategory || joinedCategory || null

  const imageRows = Array.isArray(product?.product_images)
    ? [...product.product_images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    : []

  const images = imageRows
    .map((item) => ({
      id: item.id,
      image_url: item.image_url,
      alt_text: item.alt_text || product?.name || 'Producto',
      sort_order: item.sort_order ?? 0,
    }))
    .filter((item) => item.image_url)

  const categoryName = categoryRow?.name || null
  const categorySlug = categoryRow?.slug || null

  return {
    id: product.id,
    name: product.name,
    slug: product.slug || String(product.id),
    short_description: product.short_description || null,
    description: product.description || product.short_description || '',
    price: Number(product.price || 0),
    compare_at_price: product.compare_at_price == null ? null : Number(product.compare_at_price),
    originalPrice: product.compare_at_price == null ? null : Number(product.compare_at_price),
    sku: product.sku || null,
    stock: Number(product.stock ?? 0),
    featured: Boolean(product.featured),
    active: Boolean(product.active ?? true),
    category_id: product.category_id || categoryRow?.id || null,
    category: categoryName,
    category_slug: categorySlug,
    category_data: categoryRow
      ? {
          id: categoryRow.id,
          name: categoryRow.name,
          slug: categoryRow.slug,
        }
      : null,
    image: images[0]?.image_url || product?.image || product?.image_url || '',
    images,
    created_at: product.created_at || null,
  }
}

function buildFallback(categoryFilter) {
  const products = fallbackProducts.map((product) => ({
    ...product,
    slug: product.slug || String(product.id),
    short_description: product.short_description || product.description || '',
    compare_at_price: product.originalPrice ?? null,
    category_id: null,
    category_slug: slugifyCategory(product.category),
    category_data: product.category
      ? {
          id: null,
          name: product.category,
          slug: slugifyCategory(product.category),
        }
      : null,
    images: product.image
      ? [{ id: null, image_url: product.image, alt_text: product.name, sort_order: 0 }]
      : [],
    active: true,
    created_at: null,
  }))

  if (!categoryFilter) return products
  const value = slugifyCategory(categoryFilter)
  return products.filter((item) => item.category_slug === value)
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const categoryFilter = searchParams.get('category')?.trim()
  const supabase = getSupabaseClient()

  if (!supabase) {
    return NextResponse.json(
      {
        products: buildFallback(categoryFilter),
        categories: [],
        fallback: true,
        error: 'Supabase no configurado',
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  }

  try {
    const [categoriesResult, productsResult] = await Promise.all([
      supabase
        .from('categories')
        .select('id, name, slug, description, sort_order, active')
        .eq('active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      supabase
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
          image_url,
          categories ( id, name, slug, description, sort_order, active ),
          product_images ( id, image_url, alt_text, sort_order )
        `)
        .eq('active', true)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false }),
    ])

    if (categoriesResult.error) {
      return NextResponse.json(
        {
          products: buildFallback(categoryFilter),
          categories: [],
          fallback: true,
          error: categoriesResult.error.message,
        },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      )
    }

    if (productsResult.error) {
      return NextResponse.json(
        {
          products: buildFallback(categoryFilter),
          categories: (categoriesResult.data || []).map(normalizeCategoryRecord).filter(Boolean),
          fallback: true,
          error: productsResult.error.message,
        },
        { headers: { 'Cache-Control': 'no-store, max-age=0' } }
      )
    }

    const normalizedCategories = (categoriesResult.data || []).map(normalizeCategoryRecord).filter(Boolean)
    const categoryMap = new Map(normalizedCategories.map((category) => [category.id, category]))

    const normalizedProducts = Array.isArray(productsResult.data)
      ? productsResult.data.map((product) => normalizeProduct(product, categoryMap))
      : []

    const value = categoryFilter ? slugifyCategory(categoryFilter) : null
    const products = value
      ? normalizedProducts.filter((item) => item.category_slug === value)
      : normalizedProducts

    return NextResponse.json(
      {
        products,
        categories: normalizedCategories,
        fallback: false,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (error) {
    return NextResponse.json(
      {
        products: buildFallback(categoryFilter),
        categories: [],
        fallback: true,
        error: error?.message || 'No se pudieron obtener los productos',
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  }
}
