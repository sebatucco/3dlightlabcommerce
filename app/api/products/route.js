import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fallbackProducts } from '@/lib/site'

export const dynamic = 'force-dynamic'
export const revalidate = 300

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

function slugifyCategory(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

  const mediaRows = Array.isArray(product?.product_images)
    ? [...product.product_images].sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0))
    : []

  const productImages = mediaRows
    .map((item) => ({
      id: item?.id || null,
      image_url: item?.image_url || '',
      alt_text: item?.alt_text || product?.name || 'Producto',
      sort_order: item?.sort_order ?? 0,
      media_type: item?.media_type || 'image',
      use_case: item?.use_case || null,
      is_primary: Boolean(item?.is_primary),
    }))
    .filter((item) => item.image_url)

  const catalogImage =
    productImages.find((item) => item.media_type === 'image' && item.use_case === 'catalog') ||
    productImages.find((item) => item.media_type === 'image' && item.is_primary === true) ||
    productImages.find((item) => item.media_type === 'image') ||
    null

  const categoryName = categoryRow?.name || null
  const categorySlug = categoryRow?.slug || null

  return {
    id: product.id,
    name: product.name,
    slug: product.slug || String(product.id),
    short_description: product.short_description || null,
    description: product.description || '',
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
    image: catalogImage?.image_url || '',
    product_images: productImages,
    images: productImages
      .filter((item) => item.media_type === 'image')
      .map((item) => ({
        id: item.id,
        image_url: item.image_url,
        alt_text: item.alt_text,
        sort_order: item.sort_order,
      })),
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
    product_images: product.image
      ? [
        {
          id: null,
          image_url: product.image,
          alt_text: product.name,
          sort_order: 0,
          media_type: 'image',
          use_case: 'catalog',
          is_primary: true,
        },
      ]
      : [],
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

function responseCached(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  })
}

function responseNoStore(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const rawCategoryFilter = searchParams.get('category')
  const categoryFilter = rawCategoryFilter ? rawCategoryFilter.trim() : ''
  const supabase = getSupabaseClient()

  if (!supabase) {
    return responseNoStore({
      products: buildFallback(categoryFilter),
      categories: [],
      fallback: true,
      error: 'Supabase no configurado',
    })
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
          categories ( id, name, slug, description, sort_order, active ),
          product_images ( id, image_url, alt_text, sort_order, media_type, use_case, is_primary )
        `)
        .eq('active', true)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false }),
    ])

    if (categoriesResult.error) {
      return responseNoStore({
        products: buildFallback(categoryFilter),
        categories: [],
        fallback: true,
        error: categoriesResult.error.message,
      })
    }

    if (productsResult.error) {
      return responseNoStore({
        products: buildFallback(categoryFilter),
        categories: (categoriesResult.data || []).map(normalizeCategoryRecord).filter(Boolean),
        fallback: true,
        error: productsResult.error.message,
      })
    }

    const normalizedCategories = (categoriesResult.data || [])
      .map(normalizeCategoryRecord)
      .filter(Boolean)

    const categoryMap = new Map(normalizedCategories.map((category) => [category.id, category]))

    const normalizedProducts = Array.isArray(productsResult.data)
      ? productsResult.data.map((product) => normalizeProduct(product, categoryMap))
      : []

    const normalizedFilter = categoryFilter ? slugifyCategory(categoryFilter) : null

    const products = normalizedFilter
      ? normalizedProducts.filter((item) => item.category_slug === normalizedFilter)
      : normalizedProducts

    return responseCached({
      products,
      categories: normalizedCategories,
      fallback: false,
    })
  } catch (error) {
    return responseNoStore({
      products: buildFallback(categoryFilter),
      categories: [],
      fallback: true,
      error: error?.message || 'No se pudieron obtener los productos',
    })
  }
}
