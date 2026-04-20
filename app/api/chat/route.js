import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const STORE_CONTEXT = `
Sos el asistente comercial de 3DLightLab, una tienda de lámparas y objetos decorativos impresos en 3D.
Tu objetivo es ayudar a potenciales clientes a comprar.

Reglas:
- Respondé en español.
- Sé cálido, claro y breve.
- No inventes precios, stock ni datos concretos.
- Si te paso productos encontrados en base de datos, usá SOLO esos datos para hablar de precios y stock.
- Si no hay coincidencias claras, decí que no encontraste una coincidencia exacta y sugerí consultar por WhatsApp.
- Respondé como un vendedor útil: recomendá opciones concretas cuando existan.
- Si el usuario pide recomendaciones, sugerí hasta 3 productos relevantes.
- No hables de política, medicina ni temas ajenos a la tienda.
`

const MAX_MESSAGE_LENGTH = 1200
const MAX_HISTORY_MESSAGES = 10
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 12

function getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !anonKey) return null

    return createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    })
}

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
}

function maybeProductQuestion(message) {
    const text = normalizeText(message)

    return (
        text.includes('precio') ||
        text.includes('stock') ||
        text.includes('cuesta') ||
        text.includes('sale') ||
        text.includes('tenes') ||
        text.includes('tienen') ||
        text.includes('disponible') ||
        text.includes('lampara') ||
        text.includes('producto') ||
        text.includes('recomendas') ||
        text.includes('recomiendes') ||
        text.includes('quiero') ||
        text.includes('busco')
    )
}

function buildSearchTerms(message) {
    const text = normalizeText(message)

    return text
        .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
        .split(/\s+/)
        .filter((word) => word.length >= 3)
        .slice(0, 10)
}

function getCatalogImage(product) {
    const media = Array.isArray(product?.product_images) ? [...product.product_images] : []
    media.sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0))

    const image =
        media.find((item) => item?.media_type === 'image' && item?.use_case === 'catalog') ||
        media.find((item) => item?.media_type === 'image' && item?.is_primary === true) ||
        media.find((item) => item?.media_type === 'image') ||
        null

    return image?.image_url || '/placeholder.jpg'
}

async function findRelevantProducts(message) {
    const supabase = getSupabaseClient()
    if (!supabase) return []

    const terms = buildSearchTerms(message)
    if (terms.length === 0) return []

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
      stock,
      featured,
      active,
      product_images (
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
        .limit(24)

    if (error || !Array.isArray(data)) return []

    return data
        .map((product) => {
            const haystack = normalizeText(
                `${product.name} ${product.slug || ''} ${product.short_description || ''} ${product.description || ''}`
            )

            let score = 0
            for (const term of terms) {
                if (haystack.includes(term)) score += 1
            }

            if (product.featured) score += 0.25

            return { product, score }
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(({ product }) => ({
            id: product.id,
            name: product.name,
            slug: product.slug || product.id,
            short_description: product.short_description || '',
            price: Number(product.price || 0),
            compare_at_price:
                product.compare_at_price == null ? null : Number(product.compare_at_price),
            stock: Number(product.stock ?? 0),
            image_url: getCatalogImage(product),
        }))
}

function buildProductContext(products) {
    if (!products.length) return ''

    const lines = products.map((product, index) => {
        return [
            `Producto ${index + 1}:`,
            `- Nombre: ${product.name}`,
            `- Slug: ${product.slug}`,
            `- Precio: ${product.price}`,
            `- Precio anterior: ${product.compare_at_price ?? 'sin dato'}`,
            `- Stock: ${product.stock}`,
            `- Descripción breve: ${product.short_description || 'sin dato'}`,
        ].join('\n')
    })

    return `\n\nProductos encontrados en base de datos:\n${lines.join('\n\n')}`
}

function buildInput(message, messages = [], productContext = '') {
    const conversation = Array.isArray(messages)
        ? messages
            .filter(
                (m) =>
                    m &&
                    typeof m.content === 'string' &&
                    (m.role === 'user' || m.role === 'assistant')
            )
            .slice(-MAX_HISTORY_MESSAGES)
            .map((m) => ({
                role: m.role,
                content: String(m.content).trim().slice(0, MAX_MESSAGE_LENGTH),
            }))
        : []

    return [
        {
            role: 'system',
            content: `${STORE_CONTEXT}${productContext}`,
        },
        ...conversation,
        {
            role: 'user',
            content: String(message).trim().slice(0, MAX_MESSAGE_LENGTH),
        },
    ]
}

async function callOpenAI(input) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
        throw new Error('Falta OPENAI_API_KEY')
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4.1-mini',
            input,
        }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
        const err = new Error(data?.error?.message || 'Error al consultar OpenAI')
        err.provider = 'openai'
        err.status = response.status
        err.code = data?.error?.code || null
        err.details = data
        throw err
    }

    const reply = data?.output_text?.trim()

    if (!reply) {
        const err = new Error('OpenAI no devolvió texto de respuesta')
        err.provider = 'openai'
        err.status = 500
        err.code = 'empty_response'
        err.details = data
        throw err
    }

    return {
        provider: 'openai',
        reply,
    }
}

async function callGroq(input) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
        throw new Error('Falta GROQ_API_KEY')
    }

    const messages = input.map((item) => ({
        role: item.role,
        content: item.content,
    }))

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages,
            temperature: 0.4,
        }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
        const err = new Error(data?.error?.message || 'Error al consultar Groq')
        err.provider = 'groq'
        err.status = response.status
        err.code = data?.error?.code || null
        err.details = data
        throw err
    }

    const content = data?.choices?.[0]?.message?.content
    const reply = typeof content === 'string' ? content.trim() : ''

    if (!reply) {
        const err = new Error('Groq no devolvió texto de respuesta')
        err.provider = 'groq'
        err.status = 500
        err.code = 'empty_response'
        err.details = data
        throw err
    }

    return {
        provider: 'groq',
        reply,
    }
}

function shouldFallbackToGroq(error) {
    const text = `${error?.message || ''} ${error?.code || ''}`.toLowerCase()

    return (
        error?.provider === 'openai' &&
        (
            text.includes('insufficient_quota') ||
            text.includes('quota') ||
            text.includes('billing') ||
            error?.status === 429
        )
    )
}

function getClientIp(req) {
    const forwardedFor = req.headers.get('x-forwarded-for')
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim()
    }

    const realIp = req.headers.get('x-real-ip')
    if (realIp) return realIp.trim()

    return 'unknown'
}

function getRateLimitStore() {
    if (!globalThis.__chatRateLimitStore) {
        globalThis.__chatRateLimitStore = new Map()
    }

    return globalThis.__chatRateLimitStore
}

function checkRateLimit(key) {
    const store = getRateLimitStore()
    const now = Date.now()
    const current = store.get(key)

    if (!current || current.resetAt <= now) {
        const next = {
            count: 1,
            resetAt: now + RATE_LIMIT_WINDOW_MS,
        }
        store.set(key, next)
        return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetAt: next.resetAt }
    }

    if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
        return { allowed: false, remaining: 0, resetAt: current.resetAt }
    }

    current.count += 1
    store.set(key, current)

    return {
        allowed: true,
        remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - current.count),
        resetAt: current.resetAt,
    }
}

export async function POST(req) {
    try {
        const ip = getClientIp(req)
        const rateLimit = checkRateLimit(ip)

        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Demasiadas consultas al chat. Intentá nuevamente en un minuto.' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
                    },
                }
            )
        }

        const { message, messages = [] } = await req.json()
        const cleanMessage = String(message || '').trim()

        if (!cleanMessage) {
            return NextResponse.json({ error: 'Falta message' }, { status: 400 })
        }

        if (cleanMessage.length > MAX_MESSAGE_LENGTH) {
            return NextResponse.json(
                { error: `El mensaje no puede superar ${MAX_MESSAGE_LENGTH} caracteres` },
                { status: 400 }
            )
        }

        let products = []

        if (maybeProductQuestion(cleanMessage)) {
            products = await findRelevantProducts(cleanMessage)
        }

        const productContext = buildProductContext(products)
        const input = buildInput(cleanMessage, messages, productContext)

        try {
            const result = await callOpenAI(input)
            return NextResponse.json({
                reply: result.reply,
                provider: result.provider,
                products,
            })
        } catch (openaiError) {
            if (!shouldFallbackToGroq(openaiError)) {
                throw openaiError
            }

            const groqResult = await callGroq(input)

            return NextResponse.json({
                reply: groqResult.reply,
                provider: groqResult.provider,
                fallback: true,
                products,
            })
        }
    } catch (error) {
        return NextResponse.json(
            {
                error: error?.message || 'Error interno del chat',
            },
            { status: 500 }
        )
    }
}