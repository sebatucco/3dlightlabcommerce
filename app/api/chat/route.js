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

// ---------- SAFE PARSE ----------
function safeParseAIJson(content) {
    try {
        const clean = String(content || '').match(/\{[\s\S]*\}/)?.[0]
        return clean ? JSON.parse(clean) : null
    } catch {
        return null
    }
}

// ---------- IA ----------
async function interpretWithAI(message) {
    // GROQ
    try {
        if (process.env.GROQ_API_KEY) {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    temperature: 0.1,
                    messages: [
                        {
                            role: 'system',
                            content:
                                'Sos un clasificador para un ecommerce. Devolvé SOLO JSON con: {"intent":"products|buy|bank_accounts|order_status|checkout_help|lead|general","query":"texto limpio"}',
                        },
                        { role: 'user', content: message },
                    ],
                }),
            })

            const data = await res.json()
            const content = data?.choices?.[0]?.message?.content

            console.log('IA RAW GROQ:', content)

            const parsed = safeParseAIJson(content)
            if (parsed) return parsed
        }
    } catch (e) {
        console.log('GROQ ERROR:', e?.message)
    }

    // OPENAI fallback
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
                                'Sos un clasificador para ecommerce. Devolvé SOLO JSON con: {"intent":"products|buy|bank_accounts|order_status|checkout_help|lead|general","query":"texto limpio"}',
                        },
                        { role: 'user', content: message },
                    ],
                }),
            })

            const data = await res.json()
            const content = data?.choices?.[0]?.message?.content

            console.log('IA RAW OPENAI:', content)

            const parsed = safeParseAIJson(content)
            if (parsed) return parsed
        }
    } catch (e) {
        console.log('OPENAI ERROR:', e?.message)
    }

    return null
}

// ---------- INTENT LOCAL ----------
function detectIntent(message) {
    const text = normalize(message)

    if (text.includes('transferencia') || text.includes('cbu')) return 'bank_accounts'
    if (text.includes('pedido') || text.includes('orden')) return 'order_status'
    if (text.includes('comprar') || text.includes('lo quiero')) return 'buy'
    if (text.includes('precio') || text.includes('lampara')) return 'products'

    return 'general'
}

// ---------- PRODUCTS ----------
async function searchProducts(supabase, query) {
    const { data } = await supabase
        .from('products')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(4)

    return data || []
}

function formatPrice(value) {
    return `$ ${Number(value || 0).toLocaleString('es-AR')}`
}

function buildProductResponse(products, intent = 'products') {
    if (!Array.isArray(products) || products.length === 0) {
        return {
            reply:
                'No encontré un producto exacto con esa búsqueda. Podés probar con otro nombre o contarme qué estilo, ambiente o uso estás buscando.',
            products: [],
        }
    }

    if (products.length === 1) {
        const product = products[0]
        const stock = Number(product.stock || 0)
        const hasStock = stock > 0

        return {
            reply: [
                intent === 'buy'
                    ? `Perfecto, este producto puede ser una buena opción para comprar: ${product.name}.`
                    : `Encontré este producto: ${product.name}.`,
                product.price != null ? `Precio: ${formatPrice(product.price)}.` : null,
                product.compare_at_price ? `Antes: ${formatPrice(product.compare_at_price)}.` : null,
                `Stock: ${hasStock
                    ? `${stock} unidad${stock === 1 ? '' : 'es'} disponible${stock === 1 ? '' : 's'}`
                    : 'sin stock disponible por ahora'
                }.`,
                product.short_description || null,
                hasStock
                    ? 'Podés abrir la tarjeta para ver el detalle y avanzar con la compra.'
                    : 'Si querés, dejá tu consulta y te avisamos cuando vuelva a estar disponible.',
            ]
                .filter(Boolean)
                .join('\n'),
            products: [product],
        }
    }

    const summary = products
        .slice(0, 4)
        .map((product) => {
            const stock = Number(product.stock || 0)
            return `• ${product.name} — ${formatPrice(product.price)} — ${stock > 0 ? `stock ${stock}` : 'sin stock'
                }`
        })
        .join('\n')

    return {
        reply:
            `Encontré estas opciones que pueden interesarte:\n\n${summary}\n\n` +
            'Abrí una tarjeta para ver el detalle o escribime el nombre del producto que más te interesa.',
        products,
    }
}

// ---------- POST ----------
export async function POST(request) {
    try {
        const body = await request.json()
        const message = body?.message || ''

        const supabase = createAdminSupabaseClient()

        let intent = detectIntent(message)
        let aiQuery = message
        let source = 'local'

        // IA solo si no entiende
        if (intent === 'general') {
            const ai = await interpretWithAI(message)

            if (ai?.intent && ai.intent !== 'general') {
                intent = ai.intent
                aiQuery = ai.query || message
                source = 'ai'
            }
        }

        console.log('CHAT →', source, '| intent:', intent)

        // ---------- PRODUCTS ----------
        if (intent === 'products' || intent === 'buy') {
            const products = await searchProducts(supabase, aiQuery)
            const response = buildProductResponse(products, intent)

            return NextResponse.json({
                reply: response.reply,
                products: response.products,
                debug: { source, intent, aiQuery },
            })
        }

        // ---------- DEFAULT ----------
        return NextResponse.json({
            reply:
                'Hola, soy el asistente de 3DLightLab. ¿Qué estás buscando?',
            products: [],
            debug: { source, intent, aiQuery },
        })
    } catch (error) {
        console.log('ERROR CHAT:', error)

        return NextResponse.json({
            reply: 'Hubo un problema procesando tu consulta.',
            products: [],
        })
    }
}