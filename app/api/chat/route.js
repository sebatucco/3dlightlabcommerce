import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'

function normalize(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
}

function extractPhone(text) {
    const match = String(text || '').match(/(\+?\d[\d\s().-]{7,}\d)/)
    return match ? match[1].trim() : ''
}

function extractEmail(text) {
    const match = String(text || '').match(/[^\s@]+@[^\s@]+\.[^\s@]+/)
    return match ? match[0].trim().toLowerCase() : ''
}

function detectIntent(message) {
    const text = normalize(message)

    if (
        text.includes('transferencia') ||
        text.includes('cbu') ||
        text.includes('alias') ||
        text.includes('cuenta bancaria') ||
        text.includes('como pago')
    ) {
        return 'bank_accounts'
    }

    if (
        text.includes('pedido') ||
        text.includes('orden') ||
        text.includes('estado') ||
        text.includes('seguimiento')
    ) {
        return 'order_status'
    }

    if (
        text.includes('asesor') ||
        text.includes('contact') ||
        text.includes('presupuesto') ||
        text.includes('me interesa') ||
        text.includes('quiero comprar') ||
        text.includes('hablar') ||
        text.includes('whatsapp')
    ) {
        return 'lead'
    }

    if (
        text.includes('producto') ||
        text.includes('lampara') ||
        text.includes('lámpara') ||
        text.includes('catalogo') ||
        text.includes('catálogo') ||
        text.includes('precio') ||
        text.includes('stock')
    ) {
        return 'products'
    }

    if (
        text.includes('comprar') ||
        text.includes('lo quiero') ||
        text.includes('me interesa') ||
        text.includes('como lo compro') ||
        text.includes('cómo lo compro')
    ) {
        return 'buy'
    }

    if (
        text.includes('como compro') ||
        text.includes('cómo compro') ||
        text.includes('como comprar') ||
        text.includes('cómo comprar') ||
        text.includes('forma de pago') ||
        text.includes('como pago') ||
        text.includes('cómo pago') ||
        text.includes('pago') ||
        text.includes('envio') ||
        text.includes('envío')
    ) {
        return 'checkout_help'
    }

    return 'general'
}

async function searchProducts(supabase, message) {
    const rawMessage = String(message || '').trim()
    const text = normalize(rawMessage)

    const { data, error } = await supabase
        .from('products')
        .select(`
      id,
      name,
      slug,
      short_description,
      description,
      price,
      compare_at_price,
      sku,
      stock,
      active,
      featured,
      categories(id,name,slug),
      product_images(id,image_url,alt_text,sort_order,media_type,use_case,is_primary)
    `)
        .is('deleted_at', null)
        .eq('active', true)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false })

    if (error || !Array.isArray(data)) {
        return []
    }

    const products = data.map((product) => {
        const productName = normalize(product.name)
        const productSlug = normalize(product.slug)
        const productSku = normalize(product.sku)
        const categoryName = normalize(product.categories?.name)
        const shortDescription = normalize(product.short_description)
        const description = normalize(product.description)

        let score = 0

        if (productName === text) score += 100
        if (productSlug === text) score += 90
        if (productSku === text) score += 90

        if (productName.includes(text)) score += 70
        if (text.includes(productName)) score += 65

        if (productSlug.includes(text)) score += 50
        if (productSku.includes(text)) score += 50
        if (categoryName.includes(text)) score += 25
        if (shortDescription.includes(text)) score += 15
        if (description.includes(text)) score += 10

        const words = text.split(/\s+/).filter((word) => word.length >= 3)

        for (const word of words) {
            if (productName.includes(word)) score += 12
            if (productSlug.includes(word)) score += 8
            if (productSku.includes(word)) score += 8
            if (categoryName.includes(word)) score += 5
            if (shortDescription.includes(word)) score += 3
            if (description.includes(word)) score += 2
        }

        return { ...product, _score: score }
    })

    const matched = products
        .filter((product) => product._score > 0)
        .sort((a, b) => b._score - a._score)

    const best = matched[0]

    if (best && best._score >= 70) {
        return [normalizeProductForChat(best)]
    }

    if (matched.length > 0) {
        return matched.slice(0, 4).map(normalizeProductForChat)
    }

    return products.slice(0, 4).map(normalizeProductForChat)
}

function extractOrderReference(text) {
    const raw = String(text || '').trim()

    const refMatch =
        raw.match(/pedido\s*[:#-]?\s*([a-zA-Z0-9-]+)/i) ||
        raw.match(/orden\s*[:#-]?\s*([a-zA-Z0-9-]+)/i) ||
        raw.match(/referencia\s*[:#-]?\s*([a-zA-Z0-9-]+)/i)

    return refMatch ? refMatch[1].trim() : ''
}

function extractDni(text) {
    const match = String(text || '').match(/\b\d{7,8}\b/)
    return match ? match[0] : ''
}

function formatOrderStatus(status) {
    const labels = {
        pending: 'pendiente',
        approved: 'aprobado',
        cancelled: 'cancelado',
        rejected: 'rechazado',
    }

    return labels[status] || status || 'sin estado'
}

function formatShippingStatus(status) {
    const labels = {
        pending: 'pendiente',
        preparing: 'en preparación',
        shipped: 'enviado',
        delivered: 'entregado',
        cancelled: 'cancelado',
    }

    return labels[status] || status || 'sin estado'
}

function formatMoney(value) {
    return `$ ${Number(value || 0).toLocaleString('es-AR')}`
}

async function findOrderStatus(supabase, message) {
    const reference = extractOrderReference(message)
    const dni = extractDni(message)
    const phone = extractPhone(message)

    if (!reference) {
        return {
            found: false,
            reply:
                'Para consultar tu pedido necesito el número o referencia. Por ejemplo: “Pedido ABC123, DNI 12345678”.',
        }
    }

    if (!dni && !phone) {
        return {
            found: false,
            reply:
                'Por seguridad, además del número de pedido necesito tu DNI o teléfono. Ejemplo: “Pedido ABC123, DNI 12345678”.',
        }
    }

    let query = supabase
        .from('orders')
        .select(`
      id,
      external_reference,
      customer_name,
      customer_phone,
      customer_dni,
      total,
      status,
      payment_method,
      shipping_method,
      shipping_status,
      created_at,
      paid_at,
      cancelled_at
    `)
        .eq('external_reference', reference)
        .maybeSingle()

    const { data, error } = await query

    if (error || !data) {
        return {
            found: false,
            reply:
                'No encontré un pedido con esa referencia. Revisá el número o escribinos por WhatsApp para ayudarte.',
        }
    }

    const dniMatches = dni && String(data.customer_dni || '') === dni
    const phoneDigits = String(phone || '').replace(/\D/g, '')
    const dbPhoneDigits = String(data.customer_phone || '').replace(/\D/g, '')
    const phoneMatches = phoneDigits && dbPhoneDigits.endsWith(phoneDigits.slice(-8))

    if (!dniMatches && !phoneMatches) {
        return {
            found: false,
            reply:
                'Encontré la referencia, pero el DNI o teléfono no coincide con el pedido. Por seguridad no puedo mostrar el estado.',
        }
    }

    return {
        found: true,
        reply: [
            `Encontré tu pedido ${data.external_reference}.`,
            `Estado del pago: ${formatOrderStatus(data.status)}.`,
            `Estado del envío: ${formatShippingStatus(data.shipping_status)}.`,
            `Método de pago: ${data.payment_method || '—'}.`,
            `Método de entrega: ${data.shipping_method || '—'}.`,
            `Total: ${formatMoney(data.total)}.`,
            data.status === 'approved' ? 'El pago ya figura aprobado.' : null,
            data.status === 'pending' ? 'El pedido todavía está pendiente de confirmación.' : null,
            data.status === 'cancelled' ? 'El pedido figura cancelado.' : null,
        ]
            .filter(Boolean)
            .join('\n'),
    }
}

async function getActiveBankAccounts(supabase) {
    const { data, error } = await supabase
        .from('bank_accounts')
        .select('bank_name, holder_name, cbu, alias, cuit, account_type, sort_order')
        .eq('active', true)
        .eq('deleted', false)
        .order('sort_order', { ascending: true })

    if (error) return []
    return Array.isArray(data) ? data : []
}

async function saveLead(supabase, message) {
    const phone = extractPhone(message)
    const email = extractEmail(message)

    const payload = {
        name: 'Lead desde chatbot',
        email: email || null,
        phone: phone || null,
        reason: 'chatbot',
        product: null,
        message: String(message || '').trim(),
    }

    const { error } = await supabase.from('contacts').insert(payload)

    return !error
}

function normalizeProductForChat(product) {
    const image =
        product.product_images?.find(
            (item) => item.media_type === 'image' && item.is_primary
        )?.image_url ||
        product.product_images?.find(
            (item) => item.media_type === 'image'
        )?.image_url ||
        product.image ||
        ''

    return {
        ...product,
        image,
        image_url: image,
        url: product.slug ? `/producto/${product.slug}` : `/producto/${product.id}`,
        product_url: product.slug ? `/producto/${product.slug}` : `/producto/${product.id}`,
    }
}
function formatPrice(value) {
    return `$ ${Number(value || 0).toLocaleString('es-AR')}`
}

function getLastProductFromMessages(messages) {
    if (!Array.isArray(messages)) return null

    for (let i = messages.length - 1; i >= 0; i--) {
        const item = messages[i]

        if (Array.isArray(item?.products) && item.products.length > 0) {
            return item.products[0]
        }
    }

    return null
}

function buildProductResponse(products) {
    if (!products.length) {
        return {
            reply:
                'No encontré productos exactos con esa búsqueda, pero puedo ayudarte a elegir una lámpara según el ambiente, tamaño o estilo que buscás.',
            products: [],
        }
    }

    if (products.length === 1) {
        const product = products[0]
        const stock = Number(product.stock || 0)
        const hasStock = stock > 0

        return {
            reply: [
                `Sí, tenemos ${product.name}.`,
                product.price != null ? `Precio: ${formatPrice(product.price)}.` : null,
                product.compare_at_price
                    ? `Antes: ${formatPrice(product.compare_at_price)}.`
                    : null,
                `Stock: ${hasStock ? `${stock} unidad${stock === 1 ? '' : 'es'} disponible${stock === 1 ? '' : 's'}` : 'sin stock disponible por ahora'}.`,
                product.short_description ? product.short_description : null,
                hasStock
                    ? 'Podés abrir el producto desde la tarjeta para ver más detalles o avanzar con la compra.'
                    : 'Si querés, podés dejarnos tu consulta y te avisamos cuando vuelva a estar disponible.',
            ]
                .filter(Boolean)
                .join('\n'),
            products: [product],
        }
    }

    const summary = products
        .slice(0, 3)
        .map((product) => {
            const stock = Number(product.stock || 0)
            return `• ${product.name} — ${formatPrice(product.price)} — ${stock > 0 ? `stock ${stock}` : 'sin stock'
                }`
        })
        .join('\n')

    return {
        reply:
            `Encontré estas opciones que pueden interesarte:\n\n${summary}\n\nAbrí una tarjeta para ver el detalle o escribime el nombre exacto del producto para enfocarme en uno solo.`,
        products,
    }
}

function buildBankResponse(accounts) {
    if (!accounts.length) {
        return 'Por el momento no hay cuentas bancarias activas para mostrar. Podés escribirnos por WhatsApp y te pasamos los datos de pago.'
    }

    const lines = accounts.map((account, index) => {
        return [
            `Cuenta ${index + 1}`,
            `Banco: ${account.bank_name}`,
            `Titular: ${account.holder_name}`,
            account.alias ? `Alias: ${account.alias}` : null,
            account.cbu ? `CBU/CVU: ${account.cbu}` : null,
            account.cuit ? `CUIT: ${account.cuit}` : null,
        ]
            .filter(Boolean)
            .join('\n')
    })

    return `Podés pagar por transferencia a estas cuentas activas:\n\n${lines.join('\n\n')}\n\nDespués de transferir, guardá el comprobante para enviarlo o cargarlo en el pedido.`
}

async function interpretWithAI(message) {

    if (intent === 'general') {
        const ai = await interpretWithAI(message)

        if (ai?.intent && ai.intent !== 'general') {
            intent = ai.intent
            aiQuery = ai.query || message
            source = 'ai' // 👈 ACA SABÉS QUE USÓ IA
        }
    }


    // 1. Intentar con GROQ (rápido)
    try {
        if (process.env.GROQ_API_KEY) {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama3-70b-8192',
                    temperature: 0.1,
                    messages: [
                        {
                            role: 'system',
                            content:
                                'Sos un clasificador para un ecommerce de lámparas. Devolvé SOLO JSON válido con: {"intent":"products|buy|bank_accounts|order_status|checkout_help|lead|general","query":"texto limpio"}',
                        },
                        { role: 'user', content: message },
                    ],
                }),
            })

            const data = await res.json()
            const content = data?.choices?.[0]?.message?.content

            if (content) return JSON.parse(content)
        }
    } catch { }

    // 2. Fallback a OpenAI
    try {
        if (process.env.OPENAI_API_KEY) {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0.1,
                    messages: [
                        {
                            role: 'system',
                            content:
                                'Sos un clasificador para un ecommerce. Devolvé SOLO JSON válido con: {"intent":"products|buy|bank_accounts|order_status|checkout_help|lead|general","query":"texto limpio"}',
                        },
                        { role: 'user', content: message },
                    ],
                }),
            })

            const data = await res.json()
            const content = data?.choices?.[0]?.message?.content

            if (content) return JSON.parse(content)
        }
    } catch { }

    return null
}

export async function POST(request) {
    try {
        const body = await request.json().catch(() => ({}))
        const message = String(body?.message || '').trim()
        const messages = Array.isArray(body?.messages) ? body.messages : []
        const lastProduct = getLastProductFromMessages(messages)
        const supabase = createAdminSupabaseClient()
        let intent = detectIntent(message)
        let aiQuery = message

        let source = 'local'

        // solo si tu lógica no entiende bien
        if (intent === 'general') {
            const ai = await interpretWithAI(message)

            if (ai?.intent && ai.intent !== 'general') {
                intent = ai.intent
                aiQuery = ai.query || message
            }
        }

        console.log('CHAT →', source)

        if (!message) {
            return NextResponse.json(
                {
                    reply: 'Escribime tu consulta y te ayudo con productos, pagos o pedidos.',
                    products: [],
                },
                { status: 200 }
            )
        }


        if (intent === 'products') {
            const products = await searchProducts(supabase, aiQuery)
            const response = buildProductResponse(products)

            return NextResponse.json({
                reply: response.reply,
                products: response.products,
            })
        }

        if (intent === 'bank_accounts') {
            const accounts = await getActiveBankAccounts(supabase)

            return NextResponse.json({
                reply: buildBankResponse(accounts),
                products: [],
            })
        }

        if (intent === 'order_status') {
            const orderResult = await findOrderStatus(supabase, message)

            return NextResponse.json({
                reply: orderResult.reply,
                products: [],
            })
        }

        if (intent === 'buy') {
            const products = await searchProducts(supabase, message)

            if (!products.length) {
                return NextResponse.json({
                    reply:
                        'Puedo ayudarte a encontrar el producto que buscás. Decime el nombre o describime qué necesitás.',
                    products: [],
                })
            }

            return NextResponse.json({
                reply:
                    'Perfecto, podés comprar este producto directamente desde la tienda. Si querés te guío con el pago o envío.',
                products,
            })
        }

        if (intent === 'lead') {
            const saved = await saveLead(supabase, message)

            return NextResponse.json({
                reply: saved
                    ? 'Perfecto, dejé registrada tu consulta. Si querés una respuesta más rápida, también podés escribirnos por WhatsApp desde el botón del sitio.'
                    : 'Puedo ayudarte. Pasame tu nombre y WhatsApp o escribinos directamente por el botón de WhatsApp.',
                products: [],
            })
        }

        if (intent === 'checkout_help') {
            if (lastProduct) {
                return NextResponse.json({
                    reply:
                        `Para comprar ${lastProduct.name}, abrí la tarjeta del producto y entrá al detalle.\n\n` +
                        'Desde ahí podés:\n' +
                        '1. Agregarlo al carrito\n' +
                        '2. Ir al checkout\n' +
                        '3. Elegir Mercado Pago o transferencia bancaria\n\n' +
                        'Si elegís transferencia, el sistema te muestra las cuentas activas para pagar.',
                    products: [lastProduct],
                })
            }

            return NextResponse.json({
                reply:
                    'Podés comprar directamente desde la tienda:\n\n' +
                    '1. Abrí el producto que te interesa\n' +
                    '2. Agregalo al carrito\n' +
                    '3. Elegí forma de pago:\n' +
                    '• Tarjeta / Mercado Pago\n' +
                    '• Transferencia bancaria\n\n' +
                    'También podés consultar por envío o pedirme ayuda para elegir un producto.',
                products: [],
            })
        }

        return NextResponse.json({
            reply:
                'Hola, soy el asistente de 3DLightLab. Puedo ayudarte a buscar productos, consultar formas de pago, ver datos de transferencia, consultar el estado de un pedido o dejar registrada una consulta comercial. ¿Qué estás buscando?',
            products: [],
        })
    } catch (error) {
        return NextResponse.json(
            {
                reply:
                    'Hubo un problema procesando tu consulta. Podés escribirnos por WhatsApp y te ayudamos personalmente.',
                products: [],
                error: error?.message || 'Error en chat',
            },
            { status: 200 }
        )
    }
}