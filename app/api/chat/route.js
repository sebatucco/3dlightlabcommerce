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

function getSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key =
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) return null
    return createClient(url, key, { auth: { persistSession: false } })
}

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
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
                `${product.name} ${product.short_description || ''} ${product.description || ''}`
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
            .slice(-10)
        : []

    return [
        {
            role: 'system',
            content: `${STORE_CONTEXT}${productContext}`,
        },
        ...conversation.map((m) => ({
            role: m.role,
            content: m.content,
        })),
        {
            role: 'user',
            content: String(message).trim(),
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

export async function POST(req) {
    try {
        const { message, messages = [] } = await req.json()

        if (!message || !String(message).trim()) {
            return NextResponse.json({ error: 'Falta message' }, { status: 400 })
        }

        let products = []

        if (maybeProductQuestion(message)) {
            products = await findRelevantProducts(message)
        }

        const productContext = buildProductContext(products)
        const input = buildInput(message, messages, productContext)

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