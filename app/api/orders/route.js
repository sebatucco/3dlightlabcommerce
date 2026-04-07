import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

function normalizePaymentMethod(value) {
  if (value === 'transfer') return 'transferencia'
  if (value === 'mercadopago' || value === 'transferencia' || value === 'whatsapp') return value
  return 'mercadopago'
}

function pickCustomerField(body, key) {
  return body?.[key] ?? body?.customer?.[key.replace('customer_', '')] ?? body?.customer?.[key] ?? ''
}

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()

    const customer_name = pickCustomerField(body, 'customer_name')
    const customer_phone = pickCustomerField(body, 'customer_phone')
    const customer_email = pickCustomerField(body, 'customer_email')
    const notes = body?.notes ?? body?.shipping?.notes ?? null
    const payment_method = normalizePaymentMethod(body?.payment_method ?? body?.paymentMethod)
    const rawItems = Array.isArray(body?.items) ? body.items : []
    const items = rawItems.map((item) => ({
      id: item.id,
      quantity: Number(item.quantity || 1),
    }))

    if (!customer_name || !customer_phone || !items.length) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const productIds = items.map((item) => item.id)

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id,name,price,stock,active')
      .in('id', productIds)

    if (productsError) {
      return NextResponse.json({ error: productsError.message }, { status: 500 })
    }

    const productMap = new Map((products || []).map((p) => [p.id, p]))

    let total = 0
    const orderItems = []

    for (const item of items) {
      const product = productMap.get(item.id)
      if (!product || !product.active) {
        return NextResponse.json({ error: 'Producto no disponible' }, { status: 400 })
      }

      if (typeof product.stock === 'number' && product.stock < item.quantity) {
        return NextResponse.json({ error: `Sin stock suficiente para ${product.name}` }, { status: 400 })
      }

      const unitPrice = Number(product.price)
      const subtotal = unitPrice * item.quantity
      total += subtotal

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        unit_price: unitPrice,
        quantity: item.quantity,
        subtotal,
      })
    }

    const external_reference = `ORDER-${Date.now()}`

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name,
        customer_phone,
        customer_email: customer_email || null,
        notes,
        payment_method,
        total,
        status: 'pending',
        external_reference,
      })
      .select('*')
      .single()

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems.map((item) => ({ ...item, order_id: order.id })))

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      id: order.id,
      orderId: order.id,
      external_reference,
      order,
    })
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 })
  }
}
