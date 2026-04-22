import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'

const ALLOWED_ORDER_STATUSES = ['pending', 'approved', 'cancelled', 'rejected']
const ALLOWED_SHIPPING_STATUSES = ['pending', 'preparing', 'shipped', 'delivered', 'cancelled']

function canApproveTransfer(order, nextStatus) {
  return (
    order?.payment_method === 'transferencia' &&
    order?.status !== 'approved' &&
    nextStatus === 'approved'
  )
}

function shouldRestoreStockOnCancel(order, nextStatus) {
  return (
    order?.payment_method === 'transferencia' &&
    order?.status === 'pending' &&
    nextStatus === 'cancelled'
  )
}

async function getOrderOrNull(supabase, id) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data
}

async function restoreReservedStockForOrder(supabase, orderId) {
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', orderId)

  if (itemsError) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: itemsError.message || 'No se pudieron obtener los items del pedido' },
        { status: 500 }
      ),
    }
  }

  for (const item of orderItems || []) {
    const quantity = Number(item?.quantity ?? 0)

    if (!item?.product_id || quantity <= 0) continue

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, stock')
      .eq('id', item.product_id)
      .single()

    if (productError || !product) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'No se pudo restaurar stock de un producto del pedido' },
          { status: 500 }
        ),
      }
    }

    const currentStock = Number(product.stock ?? 0)

    const { error: stockError } = await supabase
      .from('products')
      .update({ stock: currentStock + quantity })
      .eq('id', product.id)

    if (stockError) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: stockError.message || 'No se pudo restaurar el stock' },
          { status: 500 }
        ),
      }
    }
  }

  return { ok: true }
}

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
        order_items(
          id,
          order_id,
          product_id,
          quantity,
          price,
          product_name,
          product_slug,
          products(
            id,
            name,
            slug,
            sku
          )
        )
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

    const body = await request.json().catch(() => null)

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const nextStatus = body.status ? String(body.status).trim() : ''
    const nextShippingStatus = body.shipping_status ? String(body.shipping_status).trim() : ''

    if (!nextStatus && !nextShippingStatus) {
      return NextResponse.json({ error: 'No hay cambios para aplicar' }, { status: 400 })
    }

    if (nextStatus && !ALLOWED_ORDER_STATUSES.includes(nextStatus)) {
      return NextResponse.json({ error: 'Estado de orden inválido' }, { status: 400 })
    }

    if (nextShippingStatus && !ALLOWED_SHIPPING_STATUSES.includes(nextShippingStatus)) {
      return NextResponse.json({ error: 'Estado de envío inválido' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const order = await getOrderOrNull(supabase, id)

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    const updates = {}

    if (nextStatus && nextStatus !== order.status) {
      updates.status = nextStatus

      if (nextStatus === 'approved' && !order.paid_at) {
        updates.paid_at = new Date().toISOString()
      }

      if (nextStatus === 'cancelled' && !order.cancelled_at) {
        updates.cancelled_at = new Date().toISOString()
      }
    }

    if (nextShippingStatus && nextShippingStatus !== order.shipping_status) {
      updates.shipping_status = nextShippingStatus
    }

    if (canApproveTransfer(order, nextStatus)) {
      updates.expires_at = null
    }

    if (shouldRestoreStockOnCancel(order, nextStatus)) {
      const restored = await restoreReservedStockForOrder(supabase, order.id)
      if (!restored.ok) return restored.response
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay cambios para aplicar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        order_items(
          id,
          order_id,
          product_id,
          quantity,
          price,
          product_name,
          product_slug,
          products(
            id,
            name,
            slug,
            sku
          )
        )
      `)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'No se pudo actualizar la orden' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, order: data })
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Error actualizando orden' },
      { status: 500 }
    )
  }
}