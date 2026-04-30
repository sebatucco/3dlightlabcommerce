import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { rateLimits } from '@/lib/rate-limiter'
import { withApiObservability } from '@/lib/observability'

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

function validateCheckoutPayload(body) {
  const customer = body?.customer || {}
  const shipping = body?.shipping || {}
  const paymentMethod = body?.paymentMethod || body?.payment_method
  const shippingMethod = body?.shippingMethod || 'envio'

  const customer_name = normalizeString(customer.name)
  const customer_email = normalizeEmail(customer.email)
  const customer_phone = normalizePhone(customer.phone)
  const customer_dni = normalizeString(customer.dni)

  const payment_method = pickPaymentMethod(paymentMethod)
  const shipping_method = pickShippingMethod(shippingMethod)

  const shipping_street = normalizeString(shipping.street)
  const shipping_number = normalizeString(shipping.number)
  const shipping_floor = normalizeString(shipping.floor)
  const shipping_apartment = normalizeString(shipping.apartment)
  const shipping_city = normalizeString(shipping.city)
  const shipping_province = normalizeString(shipping.province)
  const shipping_postal_code = normalizeString(shipping.zipCode)
  const customer_notes = normalizeString(shipping.notes)

  if (!customer_name) return { error: 'Falta el nombre del cliente' }
  if (!customer_phone) return { error: 'Falta el teléfono del cliente' }
  if (!payment_method) return { error: 'Método de pago inválido' }
  if (!shipping_method) return { error: 'Método de envío inválido' }

  if (shipping_method === 'envio') {
    if (!shipping_street) return { error: 'Falta la calle de envío' }
    if (!shipping_number) return { error: 'Falta la numeración de envío' }
    if (!shipping_city) return { error: 'Falta la ciudad de envío' }
    if (!shipping_province) return { error: 'Falta la provincia de envío' }
  }

  const customer_last_name = customer_name.includes(' ')
    ? customer_name.split(' ').slice(1).join(' ').trim() || null
    : null

  const address =
    shipping_method === 'envio'
      ? [
        shipping_street,
        shipping_number,
        shipping_floor ? `Piso ${shipping_floor}` : null,
        shipping_apartment ? `Depto ${shipping_apartment}` : null,
        shipping_city,
        shipping_province,
        shipping_postal_code,
      ]
        .filter(Boolean)
        .join(', ')
      : null

  return {
    value: {
      customer_name,
      customer_last_name,
      customer_phone,
      customer_email: customer_email || null,
      customer_dni: customer_dni || null,
      shipping_method,
      payment_method,
      shipping_street: shipping_street || null,
      shipping_number: shipping_number || null,
      shipping_floor: shipping_floor || null,
      shipping_apartment: shipping_apartment || null,
      shipping_city: shipping_city || null,
      shipping_province: shipping_province || null,
      shipping_postal_code: shipping_postal_code || null,
      address,
      customer_notes: customer_notes || null,
      notes: customer_notes || null,
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
    const variant_id = normalizeString(item?.variant_id)
    const quantity = toPositiveInteger(item?.quantity)

    if (!product_id) {
      return { error: 'Hay un item sin product_id' }
    }

    if (!quantity) {
      return { error: `Cantidad inválida para el producto ${product_id}` }
    }

    normalized.push({ product_id, variant_id: variant_id || null, quantity })
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
    .select('id, name, slug, sku, price, compare_at_price, stock, active')
    .in('id', productIds)

  if (error) {
    return { error: error.message || 'No se pudieron obtener los productos' }
  }

  return { value: Array.isArray(data) ? data : [] }
}

async function fetchVariantsForOrder(supabase, variantIds) {
  if (!Array.isArray(variantIds) || variantIds.length === 0) {
    return { value: [] }
  }

  const { data, error } = await supabase
    .from('product_variants')
    .select(`
      id,
      product_id,
      name,
      sku,
      price,
      compare_at_price,
      stock,
      active,
      product_variant_option_values(
        id,
        option_id,
        option_value_id,
        product_options(id,name,slug),
        product_option_values(id,value,slug)
      )
    `)
    .in('id', variantIds)

  if (error) {
    return { error: error.message || 'No se pudieron obtener las variantes' }
  }

  return { value: Array.isArray(data) ? data : [] }
}

function buildValidatedItems(requestItems, dbProducts, dbVariants) {
  const dbMap = new Map(dbProducts.map((product) => [String(product.id), product]))
  const variantMap = new Map((dbVariants || []).map((variant) => [String(variant.id), variant]))
  const orderItems = []
  let total = 0

  for (const item of requestItems) {
    const product = dbMap.get(String(item.product_id))

    if (!product || product.active === false) {
      return { error: `El producto ${item.product_id} no está disponible` }
    }

    const quantity = Number(item.quantity)

    let stock = Number(product.stock ?? 0)
    let unitPrice = toSafeNumber(product.price)
    let variantId = null
    let variantName = null
    let selectedOptions = {}

    if (item.variant_id) {
      const variant = variantMap.get(String(item.variant_id))

      if (!variant || variant.active === false) {
        return { error: 'La variante seleccionada no está disponible' }
      }

      if (String(variant.product_id) !== String(product.id)) {
        return { error: `La variante no pertenece al producto ${product.name}` }
      }

      variantId = variant.id
      variantName = variant.name || variant.sku || null
      stock = Number(variant.stock ?? 0)
      unitPrice = toSafeNumber(variant.price)
      selectedOptions = {
        options: Array.isArray(variant.product_variant_option_values)
          ? variant.product_variant_option_values.map((row) => ({
            option_id: row.option_id,
            option_name: row.product_options?.name || null,
            option_slug: row.product_options?.slug || null,
            option_value_id: row.option_value_id,
            option_value: row.product_option_values?.value || null,
            option_value_slug: row.product_option_values?.slug || null,
          }))
          : [],
      }
    }

    if (quantity <= 0) {
      return { error: `Cantidad inválida para ${product.name}` }
    }

    if (stock < quantity) {
      const stockLabel = variantName
        ? `${product.name} · ${variantName}`
        : product.name
      return { error: `No hay stock suficiente para ${stockLabel}` }
    }

    const subtotal = unitPrice * quantity
    total += subtotal

    orderItems.push({
      product_id: product.id,
      variant_id: variantId,
      variant_name: variantName,
      selected_options: selectedOptions,
      quantity,
      unit_price: unitPrice,
      subtotal,
      product_name: product.name,
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
  return withApiObservability(request, '/api/orders', async () => {
    const rateLimit = await rateLimits.orders(request)
    if (rateLimit) {
      return NextResponse.json(rateLimit.body, {
        status: rateLimit.status,
        headers: rateLimit.headers,
      })
    }

    const body = await request.json().catch(() => null)

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const customerValidation = validateCheckoutPayload(body)
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
    const variantIds = [...new Set(requestItems.map((item) => item.variant_id).filter(Boolean))]
    const variantsResult = await fetchVariantsForOrder(supabase, variantIds)

    if (variantsResult.error) {
      return NextResponse.json({ error: variantsResult.error }, { status: 500 })
    }

    const dbVariants = variantsResult.value

    if (dbVariants.length !== variantIds.length) {
      return NextResponse.json({ error: 'Una o más variantes no existen' }, { status: 400 })
    }

    if (dbProducts.length !== productIds.length) {
      return NextResponse.json(
        { error: 'Uno o más productos no existen o no están disponibles' },
        { status: 400 }
      )
    }

    const validatedItemsResult = buildValidatedItems(requestItems, dbProducts, dbVariants)

    if (validatedItemsResult.error) {
      return NextResponse.json({ error: validatedItemsResult.error }, { status: 400 })
    }

    const { orderItems, total } = validatedItemsResult.value

    const orderPayload = {
      customer_name: customer.customer_name,
      customer_last_name: customer.customer_last_name,
      customer_phone: customer.customer_phone,
      customer_email: customer.customer_email,
      customer_dni: customer.customer_dni,
      shipping_method: customer.shipping_method,
      payment_method: customer.payment_method,
      shipping_street: customer.shipping_street,
      shipping_number: customer.shipping_number,
      shipping_floor: customer.shipping_floor,
      shipping_apartment: customer.shipping_apartment,
      shipping_city: customer.shipping_city,
      shipping_province: customer.shipping_province,
      shipping_postal_code: customer.shipping_postal_code,
      address: customer.address,
      customer_notes: customer.customer_notes,
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
      variant_id: item.variant_id,
      variant_name: item.variant_name,
      selected_options: item.selected_options,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal,
      product_name: item.product_name,
    }))

    const insertItemsResult = await insertOrderItems(supabase, itemsPayload)

    if (insertItemsResult.error) {
      return NextResponse.json({ error: insertItemsResult.error }, { status: 500 })
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
  })
}
