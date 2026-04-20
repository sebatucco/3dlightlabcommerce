import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const ALLOWED_PAYMENT_METHODS = ['mercadopago', 'transferencia']
const ALLOWED_SHIPPING_METHODS = ['envio', 'retiro']
const MAX_ITEMS_PER_ORDER = 50

function normalizeString(value) {
  return String(value || '').trim()
}

function normalizeEmail(value) {
  return normalizeString(value).toLowerCase()
}

function normalizePhone(value) {
  return normalizeString(value)
}

function toPositiveInteger(value) {
  const num = Number(value)
  if (!Number.isInteger(num) || num <= 0) return null
  return num
}

function toSafeNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function pickPaymentMethod(value) {
  const method = normalizeString(value).toLowerCase()
  return ALLOWED_PAYMENT_METHODS.includes(method) ? method : null
}

function pickShippingMethod(value) {
  const method = normalizeString(value).toLowerCase()
  return ALLOWED_SHIPPING_METHODS.includes(method) ? method : null
}

function validateCustomerPayload(payload) {
  const customer_name = normalizeString(payload.customer_name)
  const customer_phone = normalizePhone(payload.customer_phone)
  const customer_email = normalizeEmail(payload.customer_email)
  const shipping_method = pickShippingMethod(payload.shipping_method)
  const payment_method = pickPaymentMethod(payload.payment_method)
  const address = normalizeString(payload.address)
  const notes = normalizeString(payload.notes)

  if (!customer_name) return { error: 'Falta el nombre del cliente' }
  if (!customer_phone) return { error: 'Falta el teléfono del cliente' }
  if (!shipping_method) return { error: 'Método de envío inválido' }
  if (!payment_method) return { error: 'Método de pago inválido' }
  if (shipping_method === 'envio' && !address) return { error: 'Falta la dirección de envío' }

  return {
    value: {
      customer_name,
      customer_phone,
      customer_email: customer_email || null,
      shipping_method,
      payment_method,
      address: address || null,
      notes: notes || null,
    },
  }
}

function validateRawItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'Debés enviar al menos un producto' }
  }

  if (items.length > MAX_ITEMS_PER_ORDER) {
    return { error: `No podés enviar más de ${MAX_ITEMS_PER_ORDER} items por pedido` }
  }

  const normalized = []

  for (const item of items) {
    const product_id = normalizeString(item?.product_id || item?.id)
    const quantity = toPositiveInteger(item?.quantity)

    if (!product_id) {
      return { error: 'Hay un item sin product_id' }
    }

    if (!quantity) {
      return { error: `Cantidad inválida para el producto ${product_id}` }
    }

    normalized.push({ product_id, quantity })
  }

  return { value: normalized }
}

function buildOrderExpiration(paymentMethod) {
  if (paymentMethod !== 'transferencia') return null
  return new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString()
}

async function fetchProductsForOrder(supabase, productIds) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, price, compare_at_price, stock, active')
    .in('id', productIds)

  if (error) {
    return { error: error.message || 'No se pudieron obtener los productos' }
  }

  return { value: Array.isArray(data) ? data : [] }
}

function buildValidatedItems(requestItems, dbProducts) {
  const dbMap = new Map(dbProducts.map((product) => [String(product.id), product]))
  const orderItems = []
  let total = 0

  for (const item of requestItems) {
    const product = dbMap.get(String(item.product_id))

    if (!product || product.active === false) {
      return { error: `El producto ${item.product_id} no está disponible` }
    }

    const quantity = Number(item.quantity)
    const stock = Number(product.stock ?? 0)
    const unitPrice = toSafeNumber(product.price)

    if (quantity <= 0) {
      return { error: `Cantidad inválida para ${product.name}` }
    }

    if (stock < quantity) {
      return { error: `No hay stock suficiente para ${product.name}` }
    }

    const subtotal = unitPrice * quantity
    total += subtotal

    orderItems.push({
      product_id: product.id,
      quantity,
      price: unitPrice,
      product_name: product.name,
      product_slug: product.slug || String(product.id),
    })
  }

  return {
    value: {
      orderItems,
      total,
    },
  }
}

async function insertOrder(supabase, payload) {
  const { data, error } = await supabase
    .from('orders')
    .insert(payload)
    .select('*')
    .single()

  if (error || !data) {
    return { error: error?.message || 'No se pudo crear la orden' }
  }

  return { value: data }
}

async function insertOrderItems(supabase, items) {
  const { error } = await supabase.from('order_items').insert(items)
  if (error) {
    return { error: error.message || 'No se pudieron guardar los items de la orden' }
  }

  return { value: true }
}

async function decrementStock(supabase, orderItems, dbProducts) {
  const dbMap = new Map(dbProducts.map((product) => [String(product.id), product]))

  for (const item of orderItems) {
    const product = dbMap.get(String(item.product_id))
    if (!product) {
      return { error: `No se encontró el producto ${item.product_id} al actualizar stock` }
    }

    const currentStock = Number(product.stock ?? 0)
    const nextStock = currentStock - Number(item.quantity)

    if (nextStock < 0) {
      return { error: `Stock inválido al actualizar ${product.name}` }
    }

    const { error } = await supabase
      .from('products')
      .update({ stock: nextStock })
      .eq('id', product.id)

    if (error) {
      return { error: error.message || `No se pudo actualizar stock de ${product.name}` }
    }
  }

  return { value: true }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null)

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const customerValidation = validateCustomerPayload(body)
    if (customerValidation.error) {
      return NextResponse.json({ error: customerValidation.error }, { status: 400 })
    }

    const itemsValidation = validateRawItems(body.items)
    if (itemsValidation.error) {
      return NextResponse.json({ error: itemsValidation.error }, { status: 400 })
    }

    const customer = customerValidation.value
    const requestItems = itemsValidation.value
    const supabase = createAdminClient()

    const productIds = [...new Set(requestItems.map((item) => item.product_id))]
    const productsResult = await fetchProductsForOrder(supabase, productIds)

    if (productsResult.error) {
      return NextResponse.json({ error: productsResult.error }, { status: 500 })
    }

    const dbProducts = productsResult.value

    if (dbProducts.length !== productIds.length) {
      return NextResponse.json(
        { error: 'Uno o más productos no existen o no están disponibles' },
        { status: 400 }
      )
    }

    const validatedItemsResult = buildValidatedItems(requestItems, dbProducts)

    if (validatedItemsResult.error) {
      return NextResponse.json({ error: validatedItemsResult.error }, { status: 400 })
    }

    const { orderItems, total } = validatedItemsResult.value

    const orderPayload = {
      customer_name: customer.customer_name,
      customer_phone: customer.customer_phone,
      customer_email: customer.customer_email,
      shipping_method: customer.shipping_method,
      payment_method: customer.payment_method,
      address: customer.address,
      notes: customer.notes,
      total,
      status: 'pending',
      shipping_status: 'pending',
      expires_at: buildOrderExpiration(customer.payment_method),
    }

    const insertedOrder = await insertOrder(supabase, orderPayload)

    if (insertedOrder.error) {
      return NextResponse.json({ error: insertedOrder.error }, { status: 500 })
    }

    const order = insertedOrder.value

    const itemsPayload = orderItems.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
      product_name: item.product_name,
      product_slug: item.product_slug,
    }))

    const insertItemsResult = await insertOrderItems(supabase, itemsPayload)

    if (insertItemsResult.error) {
      return NextResponse.json({ error: insertItemsResult.error }, { status: 500 })
    }

    const decrementStockResult = await decrementStock(supabase, orderItems, dbProducts)

    if (decrementStockResult.error) {
      return NextResponse.json({ error: decrementStockResult.error }, { status: 500 })
    }

    return NextResponse.json(
      {
        ok: true,
        order: {
          ...order,
          items: itemsPayload,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo crear la orden' },
      { status: 500 }
    )
  }
}