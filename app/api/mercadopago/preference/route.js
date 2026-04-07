import { NextResponse } from 'next/server'
import { MercadoPagoConfig, Preference } from 'mercadopago'
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
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)

    if (itemsError || !items?.length) {
      return NextResponse.json({ error: 'Items no encontrados' }, { status: 404 })
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json({ error: 'Falta MERCADOPAGO_ACCESS_TOKEN' }, { status: 500 })
    }

    const client = new MercadoPagoConfig({ accessToken })
    const preference = new Preference(client)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const result = await preference.create({
      body: {
        items: items.map((item) => ({
          id: item.product_id ?? item.id,
          title: item.product_name,
          quantity: item.quantity,
          unit_price: Number(item.unit_price),
          currency_id: 'ARS',
        })),
        external_reference: order.external_reference,
        back_urls: {
          success: `${siteUrl}/checkout/success`,
          failure: `${siteUrl}/checkout/failure`,
          pending: `${siteUrl}/checkout/pending`,
        },
        auto_return: 'approved',
        notification_url: `${siteUrl}/api/mercadopago/webhook`,
      },
    })

    await supabase.from('orders').update({ mp_preference_id: result.id }).eq('id', orderId)

    return NextResponse.json({
      ok: true,
      preferenceId: result.id,
      initPoint: result.init_point,
      init_point: result.init_point,
    })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Error creando preferencia' }, { status: 500 })
  }
}
