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

function buildPayload(body) {
  const name = String(body?.name || '').trim()
  const slug = normalizeSlug(body?.slug || body?.name || '')
  const description = body?.description ? String(body.description).trim() : null
  const sort_order = Number.isFinite(Number(body?.sort_order)) ? Number(body.sort_order) : 0
  const active = body?.active !== false

  return {
    name,
    slug,
    description,
    sort_order,
    active,
  }
}

async function resolveId(context) {
  const params = await context?.params
  return String(params?.id || '').trim()
}

export async function PUT(request, context) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  const id = await resolveId(context)

  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'ID de categoría inválido' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const updates = buildPayload(body)

  if (!updates.name || !updates.slug) {
    return NextResponse.json(
      { error: 'Nombre y slug son obligatorios' },
      { status: 400 }
    )
  }

  try {
    const supabase = createAdminSupabaseClient()

    const { data: existing, error: existingError } = await supabase
      .from('categories')
      .select('id, deleted_at')
      .eq('id', id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    if (!existing || existing.deleted_at) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
    }

    const { data: slugRow, error: slugError } = await supabase
      .from('categories')
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
        { error: 'Ya existe otra categoría con ese slug' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('categories')
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
      { error: error?.message || 'No se pudo actualizar la categoría' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, context) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  const id = await resolveId(context)

  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'ID de categoría inválido' }, { status: 400 })
  }

  try {
    const supabase = createAdminSupabaseClient()

    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, name, deleted_at')
      .eq('id', id)
      .maybeSingle()

    if (categoryError) {
      return NextResponse.json({ error: categoryError.message }, { status: 500 })
    }

    if (!category || category.deleted_at) {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
    }

    const { error: detachProductsError } = await supabase
      .from('products')
      .update({ category_id: null })
      .eq('category_id', id)

    if (detachProductsError) {
      return NextResponse.json(
        {
          error:
            detachProductsError.message ||
            'No se pudieron desacoplar los productos de la categoría',
        },
        { status: 500 }
      )
    }

    const { error: softDeleteError } = await supabase
      .from('categories')
      .update({
        active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('deleted_at', null)

    if (softDeleteError) {
      return NextResponse.json({ error: softDeleteError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo eliminar la categoría' },
      { status: 500 }
    )
  }
}