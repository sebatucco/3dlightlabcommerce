import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'

export async function PUT(request, { params }) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  const body = await request.json().catch(() => ({}))
  const updates = {
    product_id: body.product_id || null,
    image_url: String(body.image_url || '').trim(),
    alt_text: body.alt_text ? String(body.alt_text) : null,
    sort_order: Number(body.sort_order ?? 0),
  }

  if (!updates.product_id || !updates.image_url) {
    return NextResponse.json({ error: 'Producto e imagen son obligatorios' }, { status: 400 })
  }

  try {
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase.from('product_images').update(updates).eq('id', params.id).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  try {
    const supabase = createAdminSupabaseClient()
    const { error } = await supabase.from('product_images').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
