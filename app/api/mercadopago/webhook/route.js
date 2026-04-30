import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { withApiObservability } from '@/lib/observability'

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

function getClientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for') || ''
  const realIp = req.headers.get('x-real-ip') || ''
  const ip = (forwarded.split(',')[0] || realIp || '').trim()
  return ip
}

function isWebhookIpAllowed(req) {
  const rawAllowlist = String(process.env.MERCADOPAGO_WEBHOOK_IP_ALLOWLIST || '').trim()
  if (!rawAllowlist) return true

  const ip = getClientIp(req)
  if (!ip) return false

  const allowlist = rawAllowlist
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  return allowlist.includes(ip)
}

function isWebhookTokenValid(req) {
  const secret = String(process.env.MERCADOPAGO_WEBHOOK_SECRET || '').trim()
  if (!secret) return true

  const url = new URL(req.url)
  const tokenFromQuery = String(url.searchParams.get('token') || '').trim()
  const tokenFromHeader = String(req.headers.get('x-webhook-token') || '').trim()

  return tokenFromQuery === secret || tokenFromHeader === secret
}

async function verifyWebhookSignature(req, rawBody) {
  const secret = String(process.env.MERCADOPAGO_WEBHOOK_SECRET || '').trim()
  if (!secret) return true

  const signatureHeader = req.headers.get('x-signature') || ''
  if (!signatureHeader) return false

  const crypto = await import('crypto')
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(rawBody, 'utf8')
  const computedSignature = hmac.digest('hex')

  return signatureHeader === computedSignature
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

async function restoreStockForRejectedPayment(supabase, order) {
  const itemsResult = await getOrderItems(supabase, order.id)
  if (itemsResult.error) return itemsResult

  for (const item of itemsResult.value) {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, stock, name')
      .eq('id', item.product_id)
      .single()

    if (productError || !product) continue

    const currentStock = Number(product.stock ?? 0)
    const quantity = Number(item.quantity ?? 0)

    if (!Number.isFinite(quantity) || quantity <= 0) continue

    const { error: stockUpdateError } = await supabase
      .from('products')
      .update({ stock: currentStock + quantity })
      .eq('id', product.id)

    if (stockUpdateError) {
      return {
        error: NextResponse.json(
          { error: `No se pudo restaurar stock para ${product.name}` },
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
    if (!isWebhookIpAllowed(req)) {
      return NextResponse.json({ error: 'IP no permitida para webhook' }, { status: 403 })
    }

    if (!isWebhookTokenValid(req)) {
      return NextResponse.json({ error: 'Webhook token inválido' }, { status: 401 })
    }

    const rawBody = await req.text().catch(() => '')
    const signatureValid = await verifyWebhookSignature(req, rawBody)
    if (!signatureValid) {
      return NextResponse.json({ error: 'Firma de webhook inválida' }, { status: 401 })
    }

    const url = new URL(req.url)
    const type = extractWebhookType(url)
    const body = rawBody ? JSON.parse(rawBody) : null
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

    if (normalizedStatus === 'rejected' && wasAlreadyApproved) {
      const restoreResult = await restoreStockForRejectedPayment(supabase, order)
      if (restoreResult.error) return restoreResult.error
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
  return withApiObservability(req, '/api/mercadopago/webhook[POST]', async () => handleWebhook(req))
}

export async function GET(req) {
  return withApiObservability(req, '/api/mercadopago/webhook[GET]', async () => handleWebhook(req))
}
