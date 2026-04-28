import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'

const ALLOWED_MEDIA_TYPES = ['image', 'model']
const ALLOWED_USE_CASES = ['catalog', 'detail', 'gallery', 'hero']
const ALLOWED_BUCKETS = ['product-images', 'product-models', 'product-variant-images']

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim()
  )
}

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

async function resolveId(context) {
  const params = await context?.params
  return String(params?.id || '').trim()
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

export async function PUT(request, context) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  const id = await resolveId(context)

  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'ID de media inválido' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const updates = buildPayload(body)

  if (!updates.product_id || !updates.image_url) {
    return NextResponse.json(
      { error: 'Producto y archivo/URL son obligatorios' },
      { status: 400 }
    )
  }

  try {
    const supabase = createAdminSupabaseClient()

    const { data: existing, error: existingError } = await supabase
      .from('product_images')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json({ error: 'Media no encontrada' }, { status: 404 })
    }

    const productValidation = await validateProduct(supabase, updates.product_id)
    if (!productValidation.ok) {
      return NextResponse.json(
        { error: productValidation.error },
        { status: productValidation.status }
      )
    }

    const variantValidation = await validateVariant(
      supabase,
      updates.product_id,
      updates.variant_id
    )
    if (!variantValidation.ok) {
      return NextResponse.json(
        { error: variantValidation.error },
        { status: variantValidation.status }
      )
    }

    const primaryValidation = await unsetOtherPrimaryMedia(supabase, updates, id)
    if (!primaryValidation.ok) {
      return NextResponse.json(
        { error: primaryValidation.error },
        { status: primaryValidation.status }
      )
    }

    const { data, error } = await supabase
      .from('product_images')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        products(id,name,slug),
        product_variants(id,sku,name)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo actualizar la media del producto' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, context) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  const id = await resolveId(context)

  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'ID de media inválido' }, { status: 400 })
  }

  try {
    const supabase = createAdminSupabaseClient()

    const { data: existing, error: existingError } = await supabase
      .from('product_images')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json({ error: 'Media no encontrada' }, { status: 404 })
    }

    const { error } = await supabase
      .from('product_images')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo eliminar la media del producto' },
      { status: 500 }
    )
  }
}