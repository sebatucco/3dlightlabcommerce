import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

const FREE_SHIPPING_MIN_ITEMS = 3
const DEFAULT_SHIPPING_COST = 0

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
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(req) {
  const supabase = createAdminClient()

  try {
    const body = await req.json()

    const customer_name = pickCustomerField(body, 'customer_name')
    const customer_phone = pickCustomerField(body, 'customer_phone')
    const customer_email = pickCustomerField(body, 'customer_email')
    const notes = body?.notes ?? body?.shipping?.notes ?? null
    const payment_method = normalizePaymentMethod(body?.payment_method ?? body?.paymentMethod)

    const shipping = body?.shipping || {}

    const rawItems = Array.isArray(body?.items) ? body.items : []
    const items = rawItems.map((item) => ({
      id: item.id,
      quantity: Number(item.quantity || 1),
    }))

    if (!customer_name || !customer_phone || !items.length) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

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
    let totalItems = 0
    const orderItems = []
    const stockUpdates = []

    for (const item of items) {
      const product = productMap.get(item.id)

      if (!product || !product.active) {
        return NextResponse.json({ error: 'Producto no disponible' }, { status: 400 })
      }

      const currentStock = Number(product.stock ?? 0)

      if (currentStock < item.quantity) {
        return NextResponse.json(
          { error: `Sin stock suficiente para ${product.name}` },
          { status: 400 }
        )
      }

      const unitPrice = Number(product.price)
      const subtotal = unitPrice * item.quantity
      total += subtotal
      totalItems += item.quantity

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        unit_price: unitPrice,
        quantity: item.quantity,
        subtotal,
      })

      if (payment_method === 'transferencia') {
        stockUpdates.push({
          product_id: product.id,
          new_stock: currentStock - item.quantity,
        })
      }
    }

    const shipping_free = totalItems >= FREE_SHIPPING_MIN_ITEMS
    const shipping_cost = shipping_free ? 0 : DEFAULT_SHIPPING_COST
    const shipping_method = shipping_free ? 'free_shipping' : 'standard'
    const shipping_status = 'pending'

    const external_reference = `ORDER-${Date.now()}`
    const expires_at =
      payment_method === 'transferencia'
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : null

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
        expires_at,

        shipping_cost,
        shipping_free,
        shipping_method,
        shipping_status,

        shipping_street: shipping.street || null,
        shipping_number: shipping.number || null,
        shipping_floor: shipping.floor || null,
        shipping_apartment: shipping.apartment || null,
        shipping_city: shipping.city || null,
        shipping_province: shipping.province || null,
        shipping_zip_code: shipping.zipCode || null,
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
      await supabase.from('orders').delete().eq('id', order.id)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    if (payment_method === 'transferencia') {
      for (const update of stockUpdates) {
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock: update.new_stock })
          .eq('id', update.product_id)

        if (stockError) {
          return NextResponse.json(
            {
              error: 'La orden fue creada, pero no se pudo reservar stock para un producto.',
              details: stockError.message,
              orderId: order.id,
            },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json({
      ok: true,
      id: order.id,
      orderId: order.id,
      external_reference,
      shipping_free,
      shipping_cost,
      order,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Error interno' },
      { status: 500 }
    )
  }
}