import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

function normalizePaymentStatus(status) {
  if (status === 'approved') return 'approved'
  if (status === 'pending' || status === 'in_process') return 'pending'
  if (status === 'authorized') return 'pending'
  if (status === 'in_mediation') return 'pending'
  return 'rejected'
}

async function handleWebhook(req) {
  try {
    const url = new URL(req.url)
    const type = url.searchParams.get('type') || url.searchParams.get('topic')

    const body = await req.json().catch(() => null)

    const paymentId =
      body?.data?.id ||
      body?.resource?.split('/').pop() ||
      url.searchParams.get('id')

    if (type !== 'payment' || !paymentId) {
      return NextResponse.json({ ok: true })
    }

    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Falta MERCADOPAGO_ACCESS_TOKEN' },
        { status: 500 }
      )
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    const rawText = await mpResponse.text()

    let paymentInfo = null
    try {
      paymentInfo = rawText ? JSON.parse(rawText) : null
    } catch {
      return NextResponse.json(
        {
          error: 'Mercado Pago devolvió una respuesta no válida al consultar el pago',
          status: mpResponse.status,
          raw: rawText,
        },
        { status: 500 }
      )
    }

    if (!mpResponse.ok || !paymentInfo) {
      return NextResponse.json(
        {
          error: 'No se pudo consultar el pago en Mercado Pago',
          status: mpResponse.status,
          response: paymentInfo,
        },
        { status: 500 }
      )
    }

    const externalReference = paymentInfo.external_reference
    const status = paymentInfo.status
    const normalizedStatus = normalizePaymentStatus(status)

    if (!externalReference) {
      return NextResponse.json(
        { error: 'El pago no tiene external_reference' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('external_reference', externalReference)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'No se encontró la orden asociada al pago' },
        { status: 404 }
      )
    }

    const wasAlreadyApproved = order.status === 'approved'

    if (normalizedStatus === 'approved' && !wasAlreadyApproved) {
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity, product_name')
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
          .select('id, stock, name')
          .eq('id', item.product_id)
          .single()

        if (productError || !product) {
          return NextResponse.json(
            {
              error: `No se encontró el producto asociado al item ${item.product_name || item.product_id}`,
            },
            { status: 500 }
          )
        }

        const currentStock = Number(product.stock ?? 0)
        const quantity = Number(item.quantity ?? 0)
        const newStock = Math.max(0, currentStock - quantity)

        const { error: stockUpdateError } = await supabase
          .from('products')
          .update({ stock: newStock })
          .eq('id', product.id)

        if (stockUpdateError) {
          return NextResponse.json(
            {
              error: `No se pudo actualizar stock para ${product.name}`,
              details: stockUpdateError.message,
            },
            { status: 500 }
          )
        }
      }
    }

    const updatePayload = {
      status: normalizedStatus,
      mp_payment_id: String(paymentInfo.id),
    }

    if (normalizedStatus === 'approved' && !order.paid_at) {
      updatePayload.paid_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', order.id)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'No se pudo actualizar la orden' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Webhook error' },
      { status: 500 }
    )
  }
}

export async function POST(req) {
  return handleWebhook(req)
}

export async function GET(req) {
  return handleWebhook(req)
}