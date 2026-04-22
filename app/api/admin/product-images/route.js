import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'

const ALLOWED_MEDIA_TYPES = ['image', 'model']
const ALLOWED_USE_CASES = ['catalog', 'detail', 'gallery', 'hero']

function normalizeMediaType(value) {
  const mediaType = String(value || 'image').trim().toLowerCase()
  return ALLOWED_MEDIA_TYPES.includes(mediaType) ? mediaType : 'image'
}

function normalizeUseCase(value) {
  const useCase = String(value || '').trim().toLowerCase()
  return ALLOWED_USE_CASES.includes(useCase) ? useCase : null
}

function buildPayload(body) {
  return {
    product_id: String(body?.product_id || '').trim() || null,
    image_url: String(body?.image_url || '').trim(),
    alt_text: body?.alt_text ? String(body.alt_text).trim() : null,
    sort_order: Number.isFinite(Number(body?.sort_order)) ? Number(body.sort_order) : 0,
    media_type: normalizeMediaType(body?.media_type),
    use_case: normalizeUseCase(body?.use_case),
    is_primary: Boolean(body?.is_primary),
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

async function unsetOtherPrimaryMedia(supabase, payload, currentId = null) {
  if (!payload.is_primary) return { ok: true }

  let query = supabase
    .from('product_images')
    .update({ is_primary: false })
    .eq('product_id', payload.product_id)
    .eq('media_type', payload.media_type)

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
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('product_images')
      .select(`
        *,
        products(id,name,slug)
      `)
      .order('created_at', { ascending: false })

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
        products(id,name,slug)
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