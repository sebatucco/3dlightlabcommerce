import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'

const ALLOWED_USE_CASES = ['gallery', 'hero', 'carousel']

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim())
}

function normalizeUseCase(value) {
  const useCase = String(value || '').trim().toLowerCase()
  return ALLOWED_USE_CASES.includes(useCase) ? useCase : null
}

function buildPayload(body) {
  return {
    image_url: String(body?.image_url || '').trim(),
    alt_text: String(body?.alt_text || '').trim() || null,
    title: String(body?.title || '').trim() || null,
    subtitle: String(body?.subtitle || '').trim() || null,
    use_case: normalizeUseCase(body?.use_case),
    sort_order: Number.isFinite(Number(body?.sort_order)) ? Number(body.sort_order) : 0,
    bucket: 'site-media-images',
    active: body?.active !== false,
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
  if (!isValidUuid(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  try {
    const body = await request.json().catch(() => ({}))
    const payload = buildPayload(body)

    if (!payload.image_url) {
      return NextResponse.json({ error: 'Subí un archivo o pegá una URL' }, { status: 400 })
    }

    if (!payload.use_case) {
      return NextResponse.json({ error: 'Seleccioná un uso válido (gallery, hero o carousel)' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('site_media')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'No se pudo actualizar media global' }, { status: 500 })
  }
}

export async function DELETE(request, context) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  const id = await resolveId(context)
  if (!isValidUuid(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  try {
    const supabase = createAdminSupabaseClient()
    const { error } = await supabase.from('site_media').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'No se pudo eliminar media global' }, { status: 500 })
  }
}
