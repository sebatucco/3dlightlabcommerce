import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'

function canApproveTransfer(order, nextStatus) {
  return (
    order?.payment_method === 'transferencia' &&
    order?.status !== 'approved' &&
    nextStatus === 'approved'
  )
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

    const allowedOrderStatuses = ['pending', 'approved', 'cancelled', 'rejected']
    const allowedShippingStatuses = ['pending', 'preparing', 'shipped', 'delivered', 'cancelled']

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    const updates = {}

    if (body.status) {
      if (!allowedOrderStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Estado de orden inválido' }, { status: 400 })
      }

      updates.status = body.status

      if (body.status === 'approved') {
        updates.paid_at = new Date().toISOString()
      }

      if (body.status === 'cancelled') {
        updates.cancelled_at = new Date().toISOString()
      }
    }

    if (body.shipping_status) {
      if (!allowedShippingStatuses.includes(body.shipping_status)) {
        return NextResponse.json({ error: 'Estado de envío inválido' }, { status: 400 })
      }

      updates.shipping_status = body.shipping_status
    }

    // Si aprobás una transferencia manualmente:
    // - no se descuenta stock otra vez
    // - solo se marca pagada
    // - se limpia el vencimiento
    if (canApproveTransfer(order, body.status)) {
      updates.expires_at = null
    }

    // Si cancelás manualmente una transferencia pendiente y todavía no estaba aprobada,
    // devolvemos stock.
    const cancellingReservedTransfer =
      order.payment_method === 'transferencia' &&
      order.status === 'pending' &&
      body.status === 'cancelled'

    if (cancellingReservedTransfer) {
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity')
        .eq('order_id', order.id)

      if (itemsError) {
        return NextResponse.json(
          { error: itemsError.message || 'No se pudieron obtener los items del pedido' },
          { status: 500 }
        )
      }

      for (const item of orderItems || []) {
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('id, stock')
          .eq('id', item.product_id)
          .single()

        if (productError || !product) {
          return NextResponse.json(
            { error: 'No se pudo restaurar stock de un producto del pedido' },
            { status: 500 }
          )
        }

        const currentStock = Number(product.stock ?? 0)
        const quantity = Number(item.quantity ?? 0)

        const { error: stockError } = await supabase
          .from('products')
          .update({ stock: currentStock + quantity })
          .eq('id', product.id)

        if (stockError) {
          return NextResponse.json(
            { error: stockError.message || 'No se pudo restaurar el stock' },
            { status: 500 }
          )
        }
      }
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
        order_items (*)
      `)
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