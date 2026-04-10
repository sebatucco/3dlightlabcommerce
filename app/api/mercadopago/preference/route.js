import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req) {
  try {
    const { orderId } = await req.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Falta orderId' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Orden no encontrada', details: orderError },
        { status: 404 }
      )
    }

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)

    if (itemsError || !items?.length) {
      return NextResponse.json(
        { error: 'Items no encontrados', details: itemsError },
        { status: 404 }
      )
    }

    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Falta MERCADOPAGO_ACCESS_TOKEN' },
        { status: 500 }
      )
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const body = {
      items: items.map((item) => ({
        id: String(item.product_id ?? item.id),
        title: item.product_name || 'Producto',
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        currency_id: 'ARS',
      })),
      external_reference: order.external_reference || order.id,
      back_urls: {
        success: `${siteUrl}/checkout/success`,
        failure: `${siteUrl}/checkout/failure`,
        pending: `${siteUrl}/checkout/pending`,
      },
      auto_return: 'approved',
    }

    if (!siteUrl.includes('localhost')) {
      body.notification_url = `${siteUrl}/api/mercadopago/webhook`
    }

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const rawText = await mpResponse.text()

    let result = null
    try {
      result = rawText ? JSON.parse(rawText) : null
    } catch {
      return NextResponse.json(
        {
          error: 'Mercado Pago devolvió una respuesta no válida',
          status: mpResponse.status,
          raw: rawText,
        },
        { status: 500 }
      )
    }

    if (!mpResponse.ok) {
      return NextResponse.json(
        {
          error: 'Error creando preferencia en Mercado Pago',
          status: mpResponse.status,
          response: result,
        },
        { status: 500 }
      )
    }

    await supabase
      .from('orders')
      .update({ mp_preference_id: result.id })
      .eq('id', orderId)

    return NextResponse.json({
      ok: true,
      preferenceId: result.id,
      initPoint: result.init_point,
      init_point: result.init_point,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error?.message || 'Error creando preferencia',
      },
      { status: 500 }
    )
  }
}