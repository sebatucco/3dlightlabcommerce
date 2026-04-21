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

function normalizeSkuPrefix(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
}

function buildPayload(body) {
  const name = String(body?.name || '').trim()
  const slug = normalizeSlug(body?.slug || body?.name || '')
  const description = body?.description ? String(body.description).trim() : null
  const sort_order = Number.isFinite(Number(body?.sort_order)) ? Number(body.sort_order) : 0
  const active = body?.active !== false
  const sku_prefix = normalizeSkuPrefix(body?.sku_prefix || '') || null

  return {
    name,
    slug,
    description,
    sort_order,
    active,
    sku_prefix,
  }
}

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  try {
    const supabase = createAdminSupabaseClient()

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [], {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'No se pudieron obtener las categorías' },
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

  try {
    const supabase = createAdminSupabaseClient()

    const { data: existingSlug, error: slugError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', payload.slug)
      .is('deleted_at', null)
      .maybeSingle()

    if (slugError) {
      return NextResponse.json({ error: slugError.message }, { status: 500 })
    }

    if (existingSlug) {
      return NextResponse.json(
        { error: 'Ya existe una categoría con ese slug' },
        { status: 400 }
      )
    }

    if (payload.sku_prefix) {
      const { data: existingPrefix, error: prefixError } = await supabase
        .from('categories')
        .select('id')
        .eq('sku_prefix', payload.sku_prefix)
        .is('deleted_at', null)
        .maybeSingle()

      if (prefixError) {
        return NextResponse.json({ error: prefixError.message }, { status: 500 })
      }

      if (existingPrefix) {
        return NextResponse.json(
          { error: 'Ya existe una categoría con ese prefijo SKU' },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabase
      .from('categories')
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
      { error: error?.message || 'No se pudo crear la categoría' },
      { status: 500 }
    )
  }
}