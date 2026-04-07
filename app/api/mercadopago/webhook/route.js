import { NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req) {
  try {
    const url = new URL(req.url)
    const type = url.searchParams.get('type') || url.searchParams.get('topic')
    const body = await req.json().catch(() => null)

    if (type !== 'payment' || !body?.data?.id) {
      return NextResponse.json({ ok: true })
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json({ error: 'Falta MERCADOPAGO_ACCESS_TOKEN' }, { status: 500 })
    }

    const client = new MercadoPagoConfig({ accessToken })
    const payment = new Payment(client)
    const paymentInfo = await payment.get({ id: body.data.id })

    const externalReference = paymentInfo.external_reference
    const status = paymentInfo.status

    const normalizedStatus =
      status === 'approved'
        ? 'approved'
        : status === 'pending' || status === 'in_process'
          ? 'pending'
          : 'rejected'

    const supabase = createAdminClient()

    await supabase
      .from('orders')
      .update({
        status: normalizedStatus,
        mp_payment_id: String(paymentInfo.id),
      })
      .eq('external_reference', externalReference)

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Webhook error' }, { status: 500 })
  }
}
