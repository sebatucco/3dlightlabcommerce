import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim()
  )
}

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
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
    stock,
    featured,
    active,
  }
}

async function resolveId(context) {
  const params = await context?.params
  return String(params?.id || '').trim()
}

async function validateCategory(supabase, categoryId) {
  if (!categoryId) return { ok: true }

  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) return { ok: false, error: error.message, status: 500 }
  if (!data) return { ok: false, error: 'La categoría seleccionada no existe', status: 400 }

  return { ok: true }
}

export async function PUT(request, context) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  const id = await resolveId(context)

  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'ID de producto inválido' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const updates = buildPayload(body)

  if (!updates.name || !updates.slug) {
    return NextResponse.json(
      { error: 'Nombre y slug son obligatorios' },
      { status: 400 }
    )
  }

  if (updates.price < 0) {
    return NextResponse.json({ error: 'El precio no puede ser negativo' }, { status: 400 })
  }

  if (updates.compare_at_price != null && updates.compare_at_price < 0) {
    return NextResponse.json(
      { error: 'El precio tachado no puede ser negativo' },
      { status: 400 }
    )
  }

  try {
    const supabase = createAdminSupabaseClient()

    const { data: existing, error: existingError } = await supabase
      .from('products')
      .select('id, deleted_at')
      .eq('id', id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    if (!existing || existing.deleted_at) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    const categoryValidation = await validateCategory(supabase, updates.category_id)
    if (!categoryValidation.ok) {
      return NextResponse.json(
        { error: categoryValidation.error },
        { status: categoryValidation.status }
      )
    }

    const { data: slugRow, error: slugError } = await supabase
      .from('products')
      .select('id')
      .eq('slug', updates.slug)
      .neq('id', id)
      .is('deleted_at', null)
      .maybeSingle()

    if (slugError) {
      return NextResponse.json({ error: slugError.message }, { status: 500 })
    }

    if (slugRow) {
      return NextResponse.json(
        { error: 'Ya existe otro producto con ese slug' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo actualizar el producto' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, context) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  const id = await resolveId(context)

  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'ID de producto inválido' }, { status: 400 })
  }

  try {
    const supabase = createAdminSupabaseClient()

    const { data: existing, error: existingError } = await supabase
      .from('products')
      .select('id, deleted_at')
      .eq('id', id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    if (!existing || existing.deleted_at) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    const { error } = await supabase
      .from('products')
      .update({
        active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('deleted_at', null)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo eliminar el producto' },
      { status: 500 }
    )
  }
}