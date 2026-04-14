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

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: normalizedStatus,
        mp_payment_id: String(paymentInfo.id),
      })
      .eq('external_reference', externalReference)

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