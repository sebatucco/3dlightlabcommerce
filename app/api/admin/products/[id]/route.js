import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'

export async function PUT(request, { params }) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  const body = await request.json().catch(() => ({}))
  const updates = {
    category_id: body.category_id || null,
    name: String(body.name || '').trim(),
    slug: String(body.slug || '').trim(),
    short_description: body.short_description ? String(body.short_description) : null,
    description: body.description ? String(body.description) : null,
    price: Number(body.price ?? 0),
    compare_at_price: body.compare_at_price === '' || body.compare_at_price == null ? null : Number(body.compare_at_price),
    sku: body.sku ? String(body.sku) : null,
    stock: Number(body.stock ?? 0),
    featured: Boolean(body.featured),
    active: body.active !== false,
  }

  if (!updates.name || !updates.slug) {
    return NextResponse.json({ error: 'Nombre y slug son obligatorios' }, { status: 400 })
  }

  try {
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase.from('products').update(updates).eq('id', params.id).select('*').single()
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
    const { error } = await supabase.from('products').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
