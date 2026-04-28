import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'

const ALLOWED_MEDIA_TYPES = ['image', 'model']
const ALLOWED_USE_CASES = ['catalog', 'detail', 'gallery', 'hero']
const ALLOWED_BUCKETS = ['product-images', 'product-models', 'product-variant-images']

function normalizeMediaType(value) {
  const mediaType = String(value || 'image').trim().toLowerCase()
  return ALLOWED_MEDIA_TYPES.includes(mediaType) ? mediaType : 'image'
}

function normalizeUseCase(value) {
  const useCase = String(value || '').trim().toLowerCase()
  return ALLOWED_USE_CASES.includes(useCase) ? useCase : null
}

function normalizeBucket(value, mediaType, variantId) {
  const bucket = String(value || '').trim()

  if (ALLOWED_BUCKETS.includes(bucket)) return bucket

  if (mediaType === 'model') return 'product-models'
  if (variantId) return 'product-variant-images'

  return 'product-images'
}

function buildPayload(body) {
  const product_id = String(body?.product_id || '').trim() || null
  const variant_id = String(body?.variant_id || '').trim() || null
  const media_type = normalizeMediaType(body?.media_type)

  return {
    product_id,
    variant_id,
    image_url: String(body?.image_url || '').trim(),
    alt_text: body?.alt_text ? String(body.alt_text).trim() : null,
    sort_order: Number.isFinite(Number(body?.sort_order)) ? Number(body.sort_order) : 0,
    media_type,
    use_case: normalizeUseCase(body?.use_case),
    is_primary: Boolean(body?.is_primary),
    bucket: normalizeBucket(body?.bucket, media_type, variant_id),
  }
}

async function validateProduct(supabase, productId) {
  if (!productId) {
    return { ok: false, error: 'Debés seleccionar un producto', status: 400 }
  }

  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) return { ok: false, error: error.message, status: 500 }
  if (!data) return { ok: false, error: 'El producto seleccionado no existe', status: 400 }

  return { ok: true }
}

async function validateVariant(supabase, productId, variantId) {
  if (!variantId) return { ok: true }

  const { data, error } = await supabase
    .from('product_variants')
    .select('id, product_id')
    .eq('id', variantId)
    .eq('product_id', productId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) return { ok: false, error: error.message, status: 500 }
  if (!data) {
    return {
      ok: false,
      error: 'La variante seleccionada no existe o no pertenece al producto',
      status: 400,
    }
  }

  return { ok: true }
}

async function unsetOtherPrimaryMedia(supabase, payload, currentId = null) {
  if (!payload.is_primary) return { ok: true }

  let query = supabase
    .from('product_images')
    .update({ is_primary: false })
    .eq('product_id', payload.product_id)
    .eq('media_type', payload.media_type)

  if (payload.variant_id) {
    query = query.eq('variant_id', payload.variant_id)
  } else {
    query = query.is('variant_id', null)
  }

  if (payload.use_case) {
    query = query.eq('use_case', payload.use_case)
  } else {
    query = query.is('use_case', null)
  }

  if (currentId) {
    query = query.neq('id', currentId)
  }

  const { error } = await query
  if (error) return { ok: false, error: error.message, status: 500 }

  return { ok: true }
}

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')
    const variantId = searchParams.get('variant_id')

    const supabase = createAdminSupabaseClient()

    let query = supabase
      .from('product_images')
      .select(`
        *,
        products(id,name,slug),
        product_variants(id,sku,name)
      `)
      .order('created_at', { ascending: false })

    if (productId) {
      query = query.eq('product_id', productId)
    }

    if (variantId) {
      query = query.eq('variant_id', variantId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [], {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo obtener la media del catálogo' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  const body = await request.json().catch(() => ({}))
  const payload = buildPayload(body)

  if (!payload.product_id || !payload.image_url) {
    return NextResponse.json(
      { error: 'Producto y archivo/URL son obligatorios' },
      { status: 400 }
    )
  }

  try {
    const supabase = createAdminSupabaseClient()

    const productValidation = await validateProduct(supabase, payload.product_id)
    if (!productValidation.ok) {
      return NextResponse.json(
        { error: productValidation.error },
        { status: productValidation.status }
      )
    }

    const variantValidation = await validateVariant(
      supabase,
      payload.product_id,
      payload.variant_id
    )
    if (!variantValidation.ok) {
      return NextResponse.json(
        { error: variantValidation.error },
        { status: variantValidation.status }
      )
    }

    const primaryValidation = await unsetOtherPrimaryMedia(supabase, payload)
    if (!primaryValidation.ok) {
      return NextResponse.json(
        { error: primaryValidation.error },
        { status: primaryValidation.status }
      )
    }

    const { data, error } = await supabase
      .from('product_images')
      .insert(payload)
      .select(`
        *,
        products(id,name,slug),
        product_variants(id,sku,name)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo crear la media del producto' },
      { status: 500 }
    )
  }
}