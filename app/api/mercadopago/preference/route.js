import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function getMercadoPagoAccessToken() {
  return (
    process.env.MERCADOPAGO_ACCESS_TOKEN ||
    process.env.MERCADO_PAGO_ACCESS_TOKEN ||
    ''
  ).trim()
}

function getBaseUrl(request) {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    ''

  if (envUrl) {
    return envUrl.replace(/\/$/, '')
  }

  const url = new URL(request.url)
  return `${url.protocol}//${url.host}`
}

async function getOrderWithItems(supabase, orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        id,
        product_id,
        quantity,
        price,
        product_name,
        product_slug
      )
    `)
    .eq('id', orderId)
    .single()

  if (error || !data) {
    return { error: 'Orden no encontrada' }
  }

  return { value: data }
}

function validateBody(body) {
  const orderId = String(body?.order_id || body?.orderId || '').trim()

  if (!orderId) {
    return { error: 'Falta order_id' }
  }

  return { value: { orderId } }
}

function buildPreferenceItems(order) {
  const items = Array.isArray(order.order_items) ? order.order_items : []

  if (items.length === 0) {
    return { error: 'La orden no tiene items para pagar' }
  }

  const preferenceItems = items.map((item) => {
    const title = item.product_name || `Producto ${item.product_id}`
    const quantity = Number(item.quantity ?? 0)
    const unit_price = Number(item.price ?? 0)

    return {
      id: String(item.product_id || item.id || title),
      title,
      quantity,
      unit_price,
      currency_id: 'ARS',
    }
  })

  const invalidItem = preferenceItems.find(
    (item) =>
      !item.title ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0 ||
      !Number.isFinite(item.unit_price) ||
      item.unit_price < 0
  )

  if (invalidItem) {
    return { error: 'La orden contiene items inválidos para crear la preferencia' }
  }

  return { value: preferenceItems }
}

function buildPreferencePayload(order, items, baseUrl) {
  const externalReference = order.external_reference || order.id

  return {
    external_reference: String(externalReference),
    items,
    payer: {
      name: order.customer_name || undefined,
      email: order.customer_email || undefined,
    },
    metadata: {
      order_id: order.id,
      external_reference: String(externalReference),
      customer_phone: order.customer_phone || '',
      shipping_method: order.shipping_method || '',
    },
    back_urls: {
      success: `${baseUrl}/checkout/success?order=${order.id}`,
      failure: `${baseUrl}/checkout/failure?order=${order.id}`,
      pending: `${baseUrl}/checkout/pending?order=${order.id}`,
    },
    auto_return: 'approved',
    notification_url: `${baseUrl}/api/mercadopago/webhook`,
    statement_descriptor: '3DLIGHTLAB',
  }
}

async function createPreference(accessToken, payload) {
  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    return {
      error: data?.message || data?.error || 'No se pudo crear la preferencia en Mercado Pago',
      details: data,
      status: response.status,
    }
  }

  return { value: data }
}

async function persistExternalReferenceIfNeeded(supabase, order) {
  if (order.external_reference) {
    return { value: order.external_reference }
  }

  const generated = String(order.id)

  const { error } = await supabase
    .from('orders')
    .update({ external_reference: generated })
    .eq('id', order.id)

  if (error) {
    return { error: 'No se pudo guardar external_reference en la orden' }
  }

  return { value: generated }
}

export async function POST(request) {
  try {
    const accessToken = getMercadoPagoAccessToken()

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Falta MERCADOPAGO_ACCESS_TOKEN' },
        { status: 500 }
      )
    }

    const body = await request.json().catch(() => null)

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const validation = validateBody(body)
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { orderId } = validation.value
    const supabase = createAdminClient()

    const orderResult = await getOrderWithItems(supabase, orderId)
    if (orderResult.error) {
      return NextResponse.json({ error: orderResult.error }, { status: 404 })
    }

    const order = orderResult.value

    if (order.status === 'approved') {
      return NextResponse.json(
        { error: 'La orden ya se encuentra aprobada' },
        { status: 400 }
      )
    }

    const externalReferenceResult = await persistExternalReferenceIfNeeded(supabase, order)
    if (externalReferenceResult.error) {
      return NextResponse.json({ error: externalReferenceResult.error }, { status: 500 })
    }

    const normalizedOrder = {
      ...order,
      external_reference: externalReferenceResult.value,
    }

    const itemsResult = buildPreferenceItems(normalizedOrder)
    if (itemsResult.error) {
      return NextResponse.json({ error: itemsResult.error }, { status: 400 })
    }

    const baseUrl = getBaseUrl(request)
    const preferencePayload = buildPreferencePayload(normalizedOrder, itemsResult.value, baseUrl)

    const preferenceResult = await createPreference(accessToken, preferencePayload)
    if (preferenceResult.error) {
      return NextResponse.json(
        {
          error: preferenceResult.error,
          details: preferenceResult.details,
        },
        { status: preferenceResult.status || 500 }
      )
    }

    const preference = preferenceResult.value

    return NextResponse.json({
      ok: true,
      preference_id: preference.id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point || null,
      external_reference: normalizedOrder.external_reference,
      order_id: normalizedOrder.id,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo crear la preferencia' },
      { status: 500 }
    )
  }
}