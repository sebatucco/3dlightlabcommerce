import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function normalizePaymentStatus(status) {
  if (status === 'approved') return 'approved'
  if (status === 'pending' || status === 'in_process') return 'pending'
  if (status === 'authorized') return 'pending'
  if (status === 'in_mediation') return 'pending'
  return 'rejected'
}

function extractWebhookType(url) {
  return url.searchParams.get('type') || url.searchParams.get('topic') || ''
}

function extractPaymentId(body, url) {
  const directId = body?.data?.id
  if (directId) return String(directId).trim()

  const resourceId = body?.resource?.split('/').pop()
  if (resourceId) return String(resourceId).trim()

  const queryId = url.searchParams.get('id')
  if (queryId) return String(queryId).trim()

  return ''
}

function getMercadoPagoAccessToken() {
  return (
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
    process.env.MERCADO_PAGO_ACCESS_TOKEN ||
    ''
  ).trim()
}

async function fetchMercadoPagoPayment(paymentId, accessToken) {
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  const rawText = await response.text()

  let paymentInfo = null
  try {
    paymentInfo = rawText ? JSON.parse(rawText) : null
  } catch {
    return {
      error: NextResponse.json(
        {
          error: 'Mercado Pago devolvió una respuesta no válida al consultar el pago',
          status: response.status,
          raw: rawText,
        },
        { status: 500 }
      ),
    }
  }

  if (!response.ok || !paymentInfo) {
    return {
      error: NextResponse.json(
        {
          error: 'No se pudo consultar el pago en Mercado Pago',
          status: response.status,
          response: paymentInfo,
        },
        { status: 500 }
      ),
    }
  }

  return { value: paymentInfo }
}

async function getOrderByExternalReference(supabase, externalReference) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('external_reference', externalReference)
    .single()

  if (error || !data) {
    return {
      error: NextResponse.json(
        { error: 'No se encontró la orden asociada al pago' },
        { status: 404 }
      ),
    }
  }

  return { value: data }
}

async function getOrderItems(supabase, orderId) {
  const { data, error } = await supabase
    .from('order_items')
    .select('product_id, quantity, product_name')
    .eq('order_id', orderId)

  if (error) {
    return {
      error: NextResponse.json(
        { error: error.message || 'No se pudieron obtener los items del pedido' },
        { status: 500 }
      ),
    }
  }

  return { value: Array.isArray(data) ? data : [] }
}

async function decreaseStockForApprovedPayment(supabase, order) {
  const itemsResult = await getOrderItems(supabase, order.id)
  if (itemsResult.error) return itemsResult

  for (const item of itemsResult.value) {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, stock, name')
      .eq('id', item.product_id)
      .single()

    if (productError || !product) {
      return {
        error: NextResponse.json(
          {
            error: `No se encontró el producto asociado al item ${item.product_name || item.product_id}`,
          },
          { status: 500 }
        ),
      }
    }

    const currentStock = Number(product.stock ?? 0)
    const quantity = Number(item.quantity ?? 0)

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return {
        error: NextResponse.json(
          {
            error: `Cantidad inválida en item del pedido para ${item.product_name || item.product_id}`,
          },
          { status: 500 }
        ),
      }
    }

    const nextStock = Math.max(0, currentStock - quantity)

    const { error: stockUpdateError } = await supabase
      .from('products')
      .update({ stock: nextStock })
      .eq('id', product.id)

    if (stockUpdateError) {
      return {
        error: NextResponse.json(
          {
            error: `No se pudo actualizar stock para ${product.name}`,
            details: stockUpdateError.message,
          },
          { status: 500 }
        ),
      }
    }
  }

  return { value: true }
}

async function updateOrderFromPayment(supabase, order, paymentInfo, normalizedStatus) {
  const updatePayload = {
    status: normalizedStatus,
    mp_payment_id: String(paymentInfo.id),
  }

  if (normalizedStatus === 'approved' && !order.paid_at) {
    updatePayload.paid_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', order.id)

  if (error) {
    return {
      error: NextResponse.json(
        { error: error.message || 'No se pudo actualizar la orden' },
        { status: 500 }
      ),
    }
  }

  return { value: true }
}

async function handleWebhook(req) {
  try {
    const url = new URL(req.url)
    const type = extractWebhookType(url)
    const body = await req.json().catch(() => null)
    const paymentId = extractPaymentId(body, url)

    if (type !== 'payment' || !paymentId) {
      return NextResponse.json({ ok: true })
    }

    const accessToken = getMercadoPagoAccessToken()

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Falta MERCADOPAGO_ACCESS_TOKEN' },
        { status: 500 }
      )
    }

    const paymentResult = await fetchMercadoPagoPayment(paymentId, accessToken)
    if (paymentResult.error) return paymentResult.error

    const paymentInfo = paymentResult.value
    const externalReference = String(paymentInfo.external_reference || '').trim()

    if (!externalReference) {
      return NextResponse.json(
        { error: 'El pago no tiene external_reference' },
        { status: 400 }
      )
    }

    const normalizedStatus = normalizePaymentStatus(paymentInfo.status)
    const supabase = createAdminClient()

    const orderResult = await getOrderByExternalReference(supabase, externalReference)
    if (orderResult.error) return orderResult.error

    const order = orderResult.value
    const wasAlreadyApproved = order.status === 'approved'
    const samePaymentAlreadyLinked =
      String(order.mp_payment_id || '') === String(paymentInfo.id || '')

    if (normalizedStatus === 'approved' && !wasAlreadyApproved) {
      const stockResult = await decreaseStockForApprovedPayment(supabase, order)
      if (stockResult.error) return stockResult.error
    }

    if (wasAlreadyApproved && samePaymentAlreadyLinked && normalizedStatus === 'approved') {
      return NextResponse.json({ ok: true, skipped: true })
    }

    const updateResult = await updateOrderFromPayment(
      supabase,
      order,
      paymentInfo,
      normalizedStatus
    )

    if (updateResult.error) return updateResult.error

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