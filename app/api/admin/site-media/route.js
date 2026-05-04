import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'

const ALLOWED_USE_CASES = ['gallery', 'hero', 'carousel']

function isMissingSiteMediaTable(error) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes("relation 'site_media' does not exist") || message.includes('could not find the table')
}

function normalizeUseCase(value) {
  const useCase = String(value || '').trim().toLowerCase()
  return ALLOWED_USE_CASES.includes(useCase) ? useCase : null
}

function buildPayload(body) {
  const use_case = normalizeUseCase(body?.use_case)

  return {
    image_url: String(body?.image_url || '').trim(),
    alt_text: String(body?.alt_text || '').trim() || null,
    title: String(body?.title || '').trim() || null,
    subtitle: String(body?.subtitle || '').trim() || null,
    use_case,
    sort_order: Number.isFinite(Number(body?.sort_order)) ? Number(body.sort_order) : 0,
    bucket: String(body?.bucket || '').trim() || 'site-media-images',
    active: body?.active !== false,
  }
}

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  try {
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('site_media')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      if (isMissingSiteMediaTable(error)) {
        return NextResponse.json([], { headers: { 'Cache-Control': 'no-store, max-age=0' } })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data || [], { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'No se pudo cargar media global' }, { status: 500 })
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  try {
    const body = await request.json().catch(() => ({}))
    const payload = buildPayload(body)

    if (!payload.image_url) {
      return NextResponse.json({ error: 'Subí un archivo o pegá una URL' }, { status: 400 })
    }

    if (!payload.use_case) {
      return NextResponse.json({ error: 'Seleccioná un uso válido (gallery, hero o carousel)' }, { status: 400 })
    }

    if (payload.bucket !== 'site-media-images') {
      payload.bucket = 'site-media-images'
    }

    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase.from('site_media').insert(payload).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'No se pudo crear media global' }, { status: 500 })
  }
}
