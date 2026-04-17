import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request, context) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  try {
    const params = await context.params
    const id = params?.id

    if (!id) {
      return NextResponse.json({ error: 'Falta id' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Error obteniendo orden' },
      { status: 500 }
    )
  }
}

export async function PATCH(request, context) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  try {
    const params = await context.params
    const id = params?.id

    if (!id) {
      return NextResponse.json({ error: 'Falta id' }, { status: 400 })
    }

    const body = await request.json()
    const supabase = createAdminClient()

    const allowedShippingStatuses = ['pending', 'preparing', 'shipped', 'delivered', 'cancelled']
    const allowedOrderStatuses = ['pending', 'approved', 'cancelled', 'rejected']

    const updates = {}

    if (body.status && allowedOrderStatuses.includes(body.status)) {
      updates.status = body.status
    }

    if (body.shipping_status && allowedShippingStatuses.includes(body.shipping_status)) {
      updates.shipping_status = body.shipping_status
    }

    if (body.status === 'approved') {
      updates.paid_at = new Date().toISOString()
    }

    if (body.status === 'cancelled') {
      updates.cancelled_at = new Date().toISOString()
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    const approvingTransfer =
      order.payment_method === 'transferencia' &&
      order.status !== 'approved' &&
      body.status === 'approved'

    if (approvingTransfer) {
      updates.expires_at = null
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, order: data })
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Error actualizando orden' },
      { status: 500 }
    )
  }
}