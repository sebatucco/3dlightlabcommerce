import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function normalizeSku(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toSafeNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function toSafeInteger(value, fallback = 0) {
  const num = Number(value)
  return Number.isInteger(num) ? num : fallback
}

function buildPayload(body) {
  const category_id = String(body?.category_id || '').trim() || null
  const name = String(body?.name || '').trim()
  const slug = normalizeSlug(body?.slug || body?.name || '')
  const short_description = body?.short_description
    ? String(body.short_description).trim()
    : null
  const description = body?.description ? String(body.description).trim() : null
  const price = toSafeNumber(body?.price, 0)
  const compare_at_price =
    body?.compare_at_price === '' || body?.compare_at_price == null
      ? null
      : toSafeNumber(body.compare_at_price, 0)
  const stock = Math.max(0, toSafeInteger(body?.stock, 0))
  const featured = Boolean(body?.featured)
  const active = body?.active !== false

  return {
    category_id,
    name,
    slug,
    short_description,
    description,
    price,
    compare_at_price,
    sku: null,
    stock,
    featured,
    active,
  }
}

async function validateCategory(supabase, categoryId) {
  if (!categoryId) return { ok: true, category: null }

  const { data, error } = await supabase
    .from('categories')
    .select('id, sku_prefix')
    .eq('id', categoryId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) return { ok: false, error: error.message, status: 500 }
  if (!data) return { ok: false, error: 'La categoría seleccionada no existe', status: 400 }

  return { ok: true, category: data }
}

async function generateProductSku(supabase, category) {
  const prefix = normalizeSku(category?.sku_prefix || 'PRD') || 'PRD'
  const regex = new RegExp(`^${escapeRegExp(prefix)}-(\\d{5})$`, 'i')

  const { data, error } = await supabase
    .from('products')
    .select('sku')
    .ilike('sku', `${prefix}-%`)

  if (error) {
    throw new Error(error.message)
  }

  const maxNumber = (data || []).reduce((max, row) => {
    const match = String(row.sku || '').match(regex)
    const number = match ? Number(match[1]) : 0
    return Math.max(max, number)
  }, 0)

  return `${prefix}-${String(maxNumber + 1).padStart(5, '0')}`
}

async function ensureUniqueProductSku(supabase, sku) {
  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('sku', sku)
    .maybeSingle()

  if (error) return { ok: false, error: error.message, status: 500 }
  if (data) return { ok: false, error: 'Ya existe un producto con ese SKU', status: 400 }

  return { ok: true }
}

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  try {
    const supabase = createAdminSupabaseClient()

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        categories(id,name,slug,sku_prefix),
        product_images(id,image_url,alt_text,sort_order,media_type,use_case,is_primary)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [], {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'No se pudieron obtener los productos' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  const body = await request.json().catch(() => ({}))
  const payload = buildPayload(body)

  if (!payload.name || !payload.slug) {
    return NextResponse.json(
      { error: 'Nombre y slug son obligatorios' },
      { status: 400 }
    )
  }

  if (payload.price < 0) {
    return NextResponse.json({ error: 'El precio no puede ser negativo' }, { status: 400 })
  }

  if (payload.compare_at_price != null && payload.compare_at_price < 0) {
    return NextResponse.json(
      { error: 'El precio tachado no puede ser negativo' },
      { status: 400 }
    )
  }

  try {
    const supabase = createAdminSupabaseClient()

    const categoryValidation = await validateCategory(supabase, payload.category_id)
    if (!categoryValidation.ok) {
      return NextResponse.json(
        { error: categoryValidation.error },
        { status: categoryValidation.status }
      )
    }

    payload.sku = await generateProductSku(supabase, categoryValidation.category)

    const skuValidation = await ensureUniqueProductSku(supabase, payload.sku)
    if (!skuValidation.ok) {
      return NextResponse.json(
        { error: skuValidation.error },
        { status: skuValidation.status }
      )
    }

    const { data: slugRow, error: slugError } = await supabase
      .from('products')
      .select('id')
      .eq('slug', payload.slug)
      .is('deleted_at', null)
      .maybeSingle()

    if (slugError) {
      return NextResponse.json({ error: slugError.message }, { status: 500 })
    }

    if (slugRow) {
      return NextResponse.json(
        { error: 'Ya existe un producto con ese slug' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        ...payload,
        deleted_at: null,
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo crear el producto' },
      { status: 500 }
    )
  }
}