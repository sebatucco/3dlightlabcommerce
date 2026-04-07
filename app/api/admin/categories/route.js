import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  try {
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase.from('categories').select('*').order('sort_order').order('name')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [], { headers: { 'Cache-Control': 'no-store, max-age=0' } })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  const body = await request.json().catch(() => ({}))
  const payload = {
    name: String(body.name || '').trim(),
    slug: String(body.slug || '').trim(),
    description: body.description ? String(body.description) : null,
    sort_order: Number(body.sort_order ?? 0),
    active: body.active !== false,
  }

  if (!payload.name || !payload.slug) {
    return NextResponse.json({ error: 'Nombre y slug son obligatorios' }, { status: 400 })
  }

  try {
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase.from('categories').insert(payload).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
