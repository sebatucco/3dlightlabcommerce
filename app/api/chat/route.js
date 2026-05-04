import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'
import { rateLimits } from '@/lib/rate-limiter'
import { withApiObservability, logError } from '@/lib/observability'

export const dynamic = 'force-dynamic'

function normalize(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function formatPrice(value) {
    return `$ ${Number(value || 0).toLocaleString('es-AR')}`
}

function hasLampIntent(message) {
    const text = normalize(message)

    return (
        text.includes('lampar') ||
        text.includes('lamp') ||
        text.includes('velador') ||
        text.includes('luz') ||
        text.includes('luces') ||
        text.includes('iluminacion') ||
        text.includes('destacado') ||
        text.includes('stock') ||
        text.includes('stook') ||
        text.includes('existencia') ||
        text.includes('comprar') ||
        text.includes('producto')
    )
}

function hasStockIntent(message) {
    const text = normalize(message)

    return (
        text.includes('stock') ||
        text.includes('stook') ||
        text.includes('hay stock') ||
        text.includes('tenes stock') ||
        text.includes('tienen stock') ||
        text.includes('disponible') ||
        text.includes('disponibilidad') ||
        text.includes('existencia') ||
        text.includes('queda')
    )
}

function hasBuyIntent(message) {
    const text = normalize(message)

    return (
        text.includes('comprar') ||
        text.includes('quiero') ||
        text.includes('lo llevo') ||
        text.includes('la llevo') ||
        text.includes('pagar') ||
        text.includes('checkout')
    )
}

function hasPaymentIntent(message) {
    const text = normalize(message)

    return (
        text.includes('transferencia') ||
        text.includes('mercado pago') ||
        text.includes('mercadopago') ||
        text.includes('alias') ||
        text.includes('cbu') ||
        text.includes('tarjeta')
    )
}

function getCatalogImage(product) {
    const images = Array.isArray(product?.product_images)
        ? product.product_images
        : []

    const sorted = [...images].sort(
        (a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0)
    )

    const image =
        sorted.find((item) => item?.use_case === 'catalog') ||
        sorted.find((item) => item?.is_primary) ||
        sorted[0]

    return image?.image_url || product?.image_url || ''
}

function parseAIJson(content) {
    const json = String(content || '').match(/\{[\s\S]*\}/)?.[0]
    if (!json) return null

    try {
        return JSON.parse(json)
    } catch {
        return null
    }
}

function hasMaterialIntent(message) {
    const text = normalize(message)

    return (
        text.includes('material') ||
        text.includes('madera') ||
        text.includes('plastico') ||
        text.includes('pla') ||
        text.includes('petg') ||
        text.includes('resina') ||
        text.includes('impres') ||
        text.includes('3d')
    )
}

async function callGroqAI(message) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return null

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
                temperature: 0.2,
                messages: [
                    {
                        role: 'system',
                        content: `
Sos un asistente vendedor para un ecommerce de lámparas.
Devolvé SOLO JSON válido:
{
  "intent": "products|stock|featured|buy|payment|materials|general",
  "query": "producto principal limpio",
  "answer": "respuesta breve"
}
No inventes productos, precios ni stock.
            `.trim(),
                    },
                    {
                        role: 'user',
                        content: message,
                    },
                ],
            }),
        })

        const data = await res.json().catch(() => null)

        if (!res.ok) {
            console.log('GROQ ERROR:', res.status, data)
            return null
        }

        const content = data?.choices?.[0]?.message?.content || ''
        console.log('IA RAW GROQ:', content)
        return parseAIJson(content)
    } catch (error) {
        console.log('GROQ FETCH ERROR:', error?.message)
        return null
    }
}

function isOpenAIEnabled() {
    const value = String(process.env.OPENAI_FALLBACK_ENABLED ?? 'true').toLowerCase()
    return !['0', 'false', 'off', 'no'].includes(value)
}

async function callOpenAIFallback(message) {
    if (!isOpenAIEnabled()) return null

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) return null

    try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                temperature: 0.2,
                messages: [
                    {
                        role: 'system',
                        content: `
Sos un asistente vendedor para un ecommerce de lámparas.
Devolvé SOLO JSON válido:
{
  "intent": "products|stock|featured|buy|payment|materials|general",
  "query": "producto principal limpio",
  "answer": "respuesta breve"
}
No inventes productos, precios ni stock.
            `.trim(),
                    },
                    {
                        role: 'user',
                        content: message,
                    },
                ],
            }),
        })

        const data = await res.json().catch(() => null)
        if (!res.ok) {
            console.log('OPENAI ERROR:', res.status, data)
            return null
        }

        const content = data?.choices?.[0]?.message?.content || ''
        console.log('IA RAW OPENAI:', content)
        return parseAIJson(content)
    } catch (error) {
        console.log('OPENAI FETCH ERROR:', error?.message)
        return null
    }
}

async function callAI(message) {
    const groq = await callGroqAI(message)
    if (groq) return { data: groq, source: 'groq' }

    const openai = await callOpenAIFallback(message)
    if (openai) return { data: openai, source: 'openai' }

    return { data: null, source: 'local' }
}

async function getProducts(supabase) {
    const { data, error } = await supabase
        .from('products')
        .select(`
      id,
      category_id,
      name,
      slug,
      short_description,
      description,
      price,
      compare_at_price,
      sku,
      stock,
      featured,
      active,
      image_url,
      deleted_at,
      categories(id,name,slug),
      product_images(
        id,
        image_url,
        alt_text,
        sort_order,
        media_type,
        use_case,
        is_primary
      )
    `)
        .eq('active', true)
        .is('deleted_at', null)
        .limit(200)

    if (error) {
        console.log('PRODUCTS ERROR:', error.message)
        return []
    }

    return (data || []).map((product) => {
        const image = getCatalogImage(product)

        return {
            ...product,
            image_url: image,
            image,
            catalog_image_url: image,
            category: product?.categories?.name || null,
        }
    })
}

function searchProducts(products, query, message, intent) {
    const textQuery = normalize(`${query || ''} ${message || ''}`)

    let results = products
        .map((product) => {
            const text = normalize([
                product.name,
                product.slug,
                product.sku,
                product.short_description,
                product.description,
                product.category,
            ].filter(Boolean).join(' '))

            let score = 0

            if (text.includes('lampar')) score += 5
            if (text.includes('lamp')) score += 5
            if (text.includes('velador')) score += 5

            for (const word of textQuery.split(' ')) {
                if (word && text.includes(word)) score += 3
            }

            if (product.featured) score += 2
            if (Number(product.stock || 0) > 0) score += 1

            return { ...product, _score: score }
        })
        .filter((product) => product._score > 0)
        .sort((a, b) => b._score - a._score)

    if (intent === 'featured') {
        results = products
            .filter((product) => product.featured || Number(product.stock || 0) > 0)
            .map((product) => ({ ...product, _score: product.featured ? 10 : 1 }))
            .sort((a, b) => b._score - a._score)
    }

    if (intent === 'stock') {
        const tokens = textQuery
            .split(' ')
            .map((word) => word.trim())
            .filter((word) => word.length >= 3)

        const genericWords = new Set([
            'hay', 'con', 'sin', 'stock', 'stook', 'tenes', 'tienen', 'queda', 'quedan', 'disponible',
            'disponibilidad', 'lampara', 'lamparas', 'velador', 'veladores', 'luz', 'luces', 'producto',
        ])

        const specificTokens = tokens.filter((word) => !genericWords.has(word))

        if (specificTokens.length > 0) {
            results = results.filter((product) => Number(product.stock || 0) > 0)
        }

        if (!results.length || specificTokens.length === 0) {
            results = products
                .filter((product) => Number(product.stock || 0) > 0)
                .map((product) => ({ ...product, _score: product.featured ? 10 : 1 }))
                .sort((a, b) => b._score - a._score)
        }
    }

    if (!results.length && hasLampIntent(message)) {
        results = products
            .filter((product) => Number(product.stock || 0) > 0)
            .map((product) => ({ ...product, _score: product.featured ? 10 : 1 }))
            .sort((a, b) => b._score - a._score)
    }

    return results.slice(0, 6)
}

function buildReply(products, intent) {
    if (!products.length) {
        return {
            reply:
                'No encontré productos disponibles para esa búsqueda. Probá con “lámpara”, “velador” o contame qué ambiente querés iluminar.',
            products: [],
        }
    }

    if (intent === 'buy') {
        return {
            reply:
                'Perfecto, te guío para comprar: 1) abrí un producto, 2) elegí variante y cantidad, 3) tocá "Agregar al carrito", 4) andá a checkout y elegí el pago. Te dejo opciones para empezar ahora.',
            products,
        }
    }

    if (intent === 'stock') {
        return {
            reply:
                'Sí, estas opciones figuran con stock disponible. Abrí una tarjeta, elegí variante y te acompaño hasta completar la compra.',
            products,
        }
    }

    if (intent === 'materials') {
        return {
            reply:
                'Trabajamos lámparas impresas en 3D con terminaciones decorativas según modelo/variante. Si querés, te muestro opciones con stock para recomendarte la más adecuada según uso (dormitorio, living o escritorio).',
            products,
        }
    }

    if (intent === 'featured') {
        return {
            reply:
                'Te muestro productos destacados/recomendados. Si alguno te gusta, abrí la tarjeta y podés avanzar al checkout.',
            products,
        }
    }

    const resumen = products
        .slice(0, 3)
        .map((p) => `• ${p.name} — ${formatPrice(p.price)} — stock ${p.stock}`)
        .join('\n')

    return {
        reply:
            `Sí, encontré estas opciones:\n\n${resumen}\n\nSi querés comprar, abrí una tarjeta, elegí variante/cantidad y avanzá al checkout. Si preferís, te recomiendo una según tu ambiente.`,
        products,
    }
}

async function getPaymentReply(supabase) {
    const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('active', true)
        .limit(10)

    if (error || !data?.length) {
        return 'Podés pagar desde el checkout. Según la configuración disponible, vas a poder elegir Mercado Pago o transferencia.'
    }

    const accounts = data
        .map((account) => {
            const alias = account.alias ? `Alias: ${account.alias}` : null
            const cbu = account.cbu ? `CBU/CVU: ${account.cbu}` : null
            const holder = account.holder_name ? `Titular: ${account.holder_name}` : null

            return [account.bank_name, alias, cbu, holder].filter(Boolean).join(' — ')
        })
        .join('\n')

    return `Podés pagar por transferencia:\n\n${accounts}\n\nTambién podés avanzar desde el checkout si querés usar otra forma de pago.`
}

export async function POST(request) {
  return withApiObservability(request, '/api/chat', async () => {
    const rateLimit = await rateLimits.chat(request)
    if (rateLimit) {
      return NextResponse.json(rateLimit.body, {
        status: rateLimit.status,
        headers: rateLimit.headers,
      })
    }

    try {
      const body = await request.json().catch(() => ({}))
        const message = String(body?.message || '').trim()

        if (!message) {
            return NextResponse.json({
                reply: 'Escribime qué lámpara o producto de iluminación estás buscando.',
                products: [],
            })
        }

        const supabase = createAdminSupabaseClient()

        const aiResult = await callAI(message)
        const ai = aiResult?.data
        const aiSource = aiResult?.source || 'local'

        let intent = ai?.intent || 'general'
        let query = ai?.query || message

        if (hasPaymentIntent(message)) intent = 'payment'
        else if (hasMaterialIntent(message)) intent = 'materials'
        else if (hasBuyIntent(message)) intent = 'buy'
        else if (hasStockIntent(message)) intent = 'stock'
        else if (normalize(message).includes('destacado')) intent = 'featured'
        else if (hasLampIntent(message)) intent = 'products'

        if (intent === 'payment') {
            const reply = await getPaymentReply(supabase)

            return NextResponse.json({
                reply,
                products: [],
                debug: {
                    source: aiSource,
                    intent,
                    query,
                    hasGroq: Boolean(process.env.GROQ_API_KEY),
                    hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
                    openAIFallbackEnabled: isOpenAIEnabled(),
                },
            })
        }

        if (intent === 'products' || intent === 'buy' || intent === 'stock' || intent === 'featured' || intent === 'materials') {
            const allProducts = await getProducts(supabase)
            const products = searchProducts(allProducts, query, message, intent)
            const response = buildReply(products, intent)

            return NextResponse.json({
                reply: response.reply,
                products: response.products,
                debug: {
                    source: aiSource,
                    intent,
                    query,
                    productsCount: products.length,
                    totalProducts: allProducts.length,
                    hasGroq: Boolean(process.env.GROQ_API_KEY),
                    hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
                    openAIFallbackEnabled: isOpenAIEnabled(),
                },
            })
        }

        return NextResponse.json({
            reply:
                'Puedo ayudarte a concretar tu compra: elegir productos, revisar stock, consultar materiales y avanzar al checkout paso a paso. ¿Qué lámpara estás buscando?',
            products: [],
            debug: {
                source: aiSource,
                intent,
                query,
                hasGroq: Boolean(process.env.GROQ_API_KEY),
                hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
                openAIFallbackEnabled: isOpenAIEnabled(),
            },
        })
    } catch (error) {
      logError('chat.request.error', {
        error: error?.message || 'Unknown error',
      })

      return NextResponse.json({
        reply: 'Hubo un problema procesando tu consulta.',
        products: [],
        error: process.env.NODE_ENV === 'development' ? error?.message : String(error?.message || error),
      }, { status: 200 })
    }
  })
}

