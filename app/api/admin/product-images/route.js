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

function resolveBucket({ bucket, media_type, use_case, variant_id }) {
  const incoming = String(bucket || '').trim()
  if (incoming) return incoming

  if (variant_id) return 'product-variant-images'
  if (media_type === 'model') return 'product-models'

  return 'product-images'
}

function buildPayload(body) {
  const product_id = String(body?.product_id || '').trim()
  const variant_id = String(body?.variant_id || '').trim() || null
  const media_type = normalizeMediaType(body?.media_type)
  const use_case = normalizeUseCase(body?.use_case)

  return {
    product_id,
    variant_id,
    image_url: String(body?.image_url || '').trim(),
    alt_text: body?.alt_text ? String(body.alt_text).trim() : null,
    sort_order: Number.isFinite(Number(body?.sort_order)) ? Number(body.sort_order) : 0,
    media_type,
    use_case,
    is_primary: Boolean(body?.is_primary),
    bucket: resolveBucket({
      bucket: body?.bucket,
      media_type,
      use_case,
      variant_id,
    }),
  }
}

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')
    const variantId = searchParams.get('variant_id')
    const baseOnly = searchParams.get('base_only') === 'true'

    const supabase = createAdminSupabaseClient()

    let query = supabase
      .from('product_images')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (productId) query = query.eq('product_id', productId)

    if (baseOnly) {
      query = query.is('variant_id', null)
    } else if (variantId) {
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

  try {
    const body = await request.json().catch(() => ({}))
    const payload = buildPayload(body)

    if (!payload.product_id) {
      return NextResponse.json({ error: 'Seleccioná un producto' }, { status: 400 })
    }

    if (!payload.image_url) {
      return NextResponse.json({ error: 'Subí un archivo o pegá una URL' }, { status: 400 })
    }

    if (payload.variant_id && payload.use_case !== 'detail') {
      payload.use_case = 'detail'
    }

    if (!payload.variant_id && ['gallery', 'hero'].includes(payload.use_case || '')) {
      return NextResponse.json(
        { error: 'Las imágenes Gallery/Hero ahora son globales. Usá la opción "Imagen global (homepage)".' },
        { status: 400 }
      )
    }

    if (payload.variant_id) {
      payload.media_type = 'image'
      payload.bucket = 'product-variant-images'
    }

    const supabase = createAdminSupabaseClient()

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('id', payload.product_id)
      .is('deleted_at', null)
      .maybeSingle()

    if (productError) {
      return NextResponse.json({ error: productError.message }, { status: 500 })
    }

    if (!product) {
      return NextResponse.json({ error: 'El producto no existe' }, { status: 400 })
    }

    if (payload.variant_id) {
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .select('id, product_id')
        .eq('id', payload.variant_id)
        .eq('product_id', payload.product_id)
        .is('deleted_at', null)
        .maybeSingle()

      if (variantError) {
        return NextResponse.json({ error: variantError.message }, { status: 500 })
      }

      if (!variant) {
        return NextResponse.json(
          { error: 'La variante no existe o no pertenece al producto' },
          { status: 400 }
        )
      }
    }

    if (payload.is_primary) {
      let primaryQuery = supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', payload.product_id)
        .eq('media_type', payload.media_type)

      if (payload.variant_id) {
        primaryQuery = primaryQuery.eq('variant_id', payload.variant_id)
      } else {
        primaryQuery = primaryQuery.is('variant_id', null)
      }

      if (payload.use_case) {
        primaryQuery = primaryQuery.eq('use_case', payload.use_case)
      } else {
        primaryQuery = primaryQuery.is('use_case', null)
      }

      const { error: primaryError } = await primaryQuery

      if (primaryError) {
        return NextResponse.json({ error: primaryError.message }, { status: 500 })
      }
    }

    const { data, error } = await supabase
      .from('product_images')
      .insert(payload)
      .select('*')
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
