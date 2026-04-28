import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'

// =====================
// NORMALIZACIÓN
// =====================
function normalize(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9ñ\s-]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function singularize(word) {
    const value = normalize(word)

    if (value.endsWith('es') && value.length > 4) return value.slice(0, -2)
    if (value.endsWith('s') && value.length > 3) return value.slice(0, -1)

    return value
}

const STOP_WORDS = new Set([
    'tenes',
    'tienes',
    'tienen',
    'tenian',
    'hay',
    'venden',
    'vendes',
    'vender',
    'venda',
    'quiero',
    'queria',
    'busco',
    'buscando',
    'necesito',
    'necesitaria',
    'me',
    'un',
    'una',
    'unos',
    'unas',
    'el',
    'la',
    'los',
    'las',
    'de',
    'del',
    'para',
    'por',
    'con',
    'en',
    'y',
    'o',
    'que',
    'algo',
    'algun',
    'alguna',
    'alguno',
    'stock',
    'disponible',
    'disponibles',
    'precio',
    'precios',
    'cuanto',
    'cuanto',
    'cuesta',
    'sale',
    'vale',
    'comprar',
    'producto',
    'productos',
    'tenes?',
    'tienes?',
])

function cleanProductQuery(message) {
    const words = normalize(message)
        .split(' ')
        .map(singularize)
        .filter((word) => word && !STOP_WORDS.has(word))

    return [...new Set(words)].join(' ')
}

function extractTerms(value) {
    return cleanProductQuery(value)
        .split(' ')
        .map(singularize)
        .filter(Boolean)
}

function formatPrice(value) {
    return `$ ${Number(value || 0).toLocaleString('es-AR')}`
}

function getCatalogImageUrl(product) {
    const media = Array.isArray(product?.product_images)
        ? product.product_images
        : []

    const sortedMedia = [...media].sort(
        (a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0)
    )

    const catalogImage =
        sortedMedia.find(
            (item) => item?.media_type === 'image' && item?.use_case === 'catalog'
        ) ||
        sortedMedia.find(
            (item) => item?.media_type === 'image' && item?.is_primary === true
        ) ||
        sortedMedia.find(
            (item) => item?.media_type === 'image'
        )

    return (
        catalogImage?.image_url ||
        product?.image_url ||
        product?.image ||
        null
    )
}

function normalizeProductForChat(product) {
    const catalogImageUrl = getCatalogImageUrl(product)

    return {
        ...product,
        image_url: catalogImageUrl,
        image: catalogImageUrl,
        catalog_image_url: catalogImageUrl,
    }
}

// =====================
// IA: GROQ + OPENAI
// =====================
function safeParseAIJson(content) {
    try {
        const clean = String(content || '').match(/\{[\s\S]*\}/)?.[0]
        return clean ? JSON.parse(clean) : null
    } catch {
        return null
    }
}

async function callAI(provider, message) {
    const isGroq = provider === 'groq'
    const apiKey = isGroq ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY

    if (!apiKey) return null

    const url = isGroq
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions'

    const model = isGroq
        ? process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
        : process.env.OPENAI_MODEL || 'gpt-4o-mini'

    const body = {
        model,
        temperature: 0.1,
        messages: [
            {
                role: 'system',
                content: `
Sos un clasificador para un ecommerce argentino de lámparas, iluminación, decoración y productos impresos en 3D.

Devolvé SOLO JSON válido con esta forma exacta:
{
  "intent": "products|buy|variant_question|bank_accounts|order_status|checkout_help|lead|general",
  "query": "texto limpio para buscar producto",
  "variant_terms": ["color", "material", "medida", "estilo", "otra variante"],
  "answer": "respuesta breve si corresponde"
}

Reglas:
- Si preguntan "tienes lampara", "tenés lámparas", "hay veladores", "venden lámparas", usá intent "products".
- Si preguntan por color, material, tamaño, modelo, terminación o cualquier variante, usá "variant_question".
- Si quieren comprar, reservar, pagar o avanzar, usá "buy".
- En "query" dejá solo el producto principal. Ejemplo: "tenes lampara negra de madera" => query "lampara", variant_terms ["negra","madera"].
- Si no entendés pero parece pregunta sobre lámparas, iluminación, materiales, colores, uso o decoración, usá "general" y respondé amable sin inventar stock.
        `.trim(),
            },
            {
                role: 'user',
                content: message,
            },
        ],
    }

    if (!isGroq) {
        body.response_format = { type: 'json_object' }
    }

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
        console.log(`${provider.toUpperCase()} ERROR:`, res.status, data)
        return null
    }

    const content = data?.choices?.[0]?.message?.content
    console.log(`IA RAW ${provider.toUpperCase()}:`, content)

    return safeParseAIJson(content)
}

async function interpretWithAI(message) {
    try {
        const groq = await callAI('groq', message)
        if (groq?.intent) return { ...groq, source: 'groq' }
    } catch (error) {
        console.log('GROQ ERROR:', error?.message)
    }

    try {
        const openai = await callAI('openai', message)
        if (openai?.intent) return { ...openai, source: 'openai' }
    } catch (error) {
        console.log('OPENAI ERROR:', error?.message)
    }

    return null
}

// =====================
// INTENT LOCAL
// =====================
function detectLocalIntent(message) {
    const text = normalize(message)

    if (
        text.includes('transferencia') ||
        text.includes('cbu') ||
        text.includes('alias') ||
        text.includes('banco')
    ) {
        return 'bank_accounts'
    }

    if (
        text.includes('pedido') ||
        text.includes('orden') ||
        text.includes('seguimiento') ||
        text.includes('envio') ||
        text.includes('envío')
    ) {
        return 'order_status'
    }

    if (
        text.includes('comprar') ||
        text.includes('lo quiero') ||
        text.includes('la quiero') ||
        text.includes('lo llevo') ||
        text.includes('la llevo') ||
        text.includes('agregar al carrito') ||
        text.includes('pagar')
    ) {
        return 'buy'
    }

    if (
        text.includes('color') ||
        text.includes('colores') ||
        text.includes('material') ||
        text.includes('materiales') ||
        text.includes('medida') ||
        text.includes('medidas') ||
        text.includes('tamano') ||
        text.includes('tamaño') ||
        text.includes('variante') ||
        text.includes('variantes') ||
        text.includes('negro') ||
        text.includes('negra') ||
        text.includes('blanco') ||
        text.includes('blanca') ||
        text.includes('madera') ||
        text.includes('plastico') ||
        text.includes('plástico')
    ) {
        return 'variant_question'
    }

    if (
        text.includes('precio') ||
        text.includes('stock') ||
        text.includes('hay') ||
        text.includes('tenes') ||
        text.includes('tienes') ||
        text.includes('venden') ||
        text.includes('vendes') ||
        text.includes('lampara') ||
        text.includes('lamparas') ||
        text.includes('velador') ||
        text.includes('luz') ||
        text.includes('luces') ||
        text.includes('iluminacion')
    ) {
        return 'products'
    }

    return 'general'
}

// =====================
// CONSULTAS SUPABASE
// =====================
async function getProducts(supabase) {
    const fullSelect = `
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
      categories ( id, name, slug ),
      product_images (
        id,
        image_url,
        alt_text,
        sort_order,
        media_type,
        use_case,
        is_primary
      )
    `

    const { data, error } = await supabase
        .from('products')
        .select(fullSelect)
        .eq('active', true)
        .is('deleted_at', null)
        .limit(200)

    if (error) {
        console.log('PRODUCTS ERROR:', error.message)
        return []
    }

    return (data || []).map((product) => {
        const media = Array.isArray(product.product_images)
            ? product.product_images
            : []

        const sorted = [...media].sort(
            (a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0)
        )

        const image =
            sorted.find(i => i.use_case === 'catalog') ||
            sorted.find(i => i.is_primary) ||
            sorted[0]

        return {
            ...product,
            image_url: image?.image_url || null
        }
    })
}

async function getVariantsForProducts(supabase, productIds) {
    if (!Array.isArray(productIds) || productIds.length === 0) return []

    const fullSelect = `
    id,
    product_id,
    sku,
    name,
    price,
    compare_at_price,
    stock,
    active,
    deleted_at,
    product_variant_option_values(
      id,
      option_id,
      option_value_id,
      product_options(id,name,slug),
      product_option_values(id,value,slug)
    )
  `

    let result = await supabase
        .from('product_variants')
        .select(fullSelect)
        .in('product_id', productIds)
        .eq('active', true)
        .is('deleted_at', null)
        .limit(500)

    if (result.error) {
        console.log('VARIANTS FULL SELECT ERROR:', result.error.message)

        result = await supabase
            .from('product_variants')
            .select('*')
            .in('product_id', productIds)
            .limit(500)
    }

    if (result.error) {
        console.log('VARIANTS ERROR:', result.error.message)
        return []
    }

    return result.data || []
}

function getVariantLabels(variant) {
    const rows = variant?.product_variant_option_values || []

    return rows
        .map((row) => {
            const optionName =
                row?.product_options?.name ||
                row?.product_options?.slug ||
                ''

            const optionValue =
                row?.product_option_values?.value ||
                row?.product_option_values?.slug ||
                ''

            if (!optionName && !optionValue) return null
            if (!optionName) return optionValue
            if (!optionValue) return optionName

            return `${optionName}: ${optionValue}`
        })
        .filter(Boolean)
}

function variantSearchText(variant) {
    const labels = getVariantLabels(variant).join(' ')

    return normalize([
        variant?.sku,
        variant?.name,
        labels,
    ].filter(Boolean).join(' '))
}

function productSearchText(product) {
    return normalize([
        product?.name,
        product?.slug,
        product?.sku,
        product?.short_description,
        product?.description,
        product?.category,
        product?.categories?.name,
        product?.categories?.slug,
    ].filter(Boolean).join(' '))
}

function attachVariants(products, variants) {
    const byProductId = new Map()

    for (const variant of variants) {
        if (!byProductId.has(variant.product_id)) {
            byProductId.set(variant.product_id, [])
        }

        byProductId.get(variant.product_id).push({
            ...variant,
            option_labels: getVariantLabels(variant),
            search_text: variantSearchText(variant),
        })
    }

    return products.map((product) => {
        const normalizedProduct = normalizeProductForChat(product)

        return {
            ...normalizedProduct,
            category: product?.categories?.name || product?.category || null,
            variants: byProductId.get(product.id) || [],
        }
    })
}

// =====================
// SCORING DE BÚSQUEDA
// =====================
function scoreProduct(product, productTerms, variantTerms) {
    const name = normalize(product?.name)
    const text = productSearchText(product)
    const allTerms = [...productTerms, ...variantTerms].map(singularize)

    let score = 0

    for (const term of productTerms) {
        if (!term) continue

        if (name.includes(term)) score += 14
        if (text.includes(term)) score += 6
    }

    for (const term of variantTerms) {
        if (!term) continue

        if (text.includes(term)) score += 3
    }

    const matchedVariants = []

    for (const variant of product.variants || []) {
        const variantText = variant.search_text || variantSearchText(variant)
        let variantScore = 0

        for (const term of allTerms) {
            if (term && variantText.includes(term)) {
                variantScore += 8
            }
        }

        if (variantScore > 0) {
            matchedVariants.push({
                ...variant,
                _score: variantScore,
            })

            score += variantScore
        }
    }

    if (Number(product?.stock || 0) > 0) score += 1
    if (product?.featured) score += 1

    return {
        score,
        matchedVariants: matchedVariants.sort((a, b) => b._score - a._score),
    }
}

async function searchProducts(supabase, rawQuery, rawVariantTerms = []) {
    const productsBase = await getProducts(supabase)
    const productIds = productsBase.map((product) => product.id).filter(Boolean)
    const variants = await getVariantsForProducts(supabase, productIds)
    const products = attachVariants(productsBase, variants)

    const productTerms = extractTerms(rawQuery)
    const variantTerms = Array.isArray(rawVariantTerms)
        ? rawVariantTerms.flatMap((term) => extractTerms(term))
        : extractTerms(rawVariantTerms)

    const finalProductTerms = productTerms.length > 0 ? productTerms : extractTerms(rawVariantTerms)

    if (finalProductTerms.length === 0 && variantTerms.length === 0) {
        return []
    }

    return products
        .map((product) => {
            const result = scoreProduct(product, finalProductTerms, variantTerms)

            return {
                ...product,
                matched_variants: result.matchedVariants,
                _score: result.score,
            }
        })
        .filter((product) => product._score > 0)
        .sort((a, b) => b._score - a._score)
        .slice(0, 6)
}

// =====================
// RESPUESTAS
// =====================
function summarizeVariants(product) {
    const variants = product.matched_variants?.length
        ? product.matched_variants
        : product.variants || []

    if (!variants.length) return null

    const visible = variants.slice(0, 4).map((variant) => {
        const labels = variant.option_labels?.length
            ? variant.option_labels.join(', ')
            : variant.name || variant.sku || 'Variante'

        const price = variant.price != null
            ? formatPrice(variant.price)
            : product.price != null
                ? formatPrice(product.price)
                : null

        const stock = Number(variant.stock || 0)

        return `  - ${labels}${price ? ` — ${price}` : ''} — ${stock > 0 ? `stock ${stock}` : 'sin stock'}`
    })

    return visible.join('\n')
}

function buildProductResponse(products, intent = 'products', query = '', variantTerms = []) {
    if (!Array.isArray(products) || products.length === 0) {
        return {
            reply:
                `No encontré productos para "${query}". ` +
                'Podés probar con otro nombre, color, material, ambiente o uso. Por ejemplo: “lámpara negra”, “velador blanco” o “lámpara de escritorio”.',
            products: [],
        }
    }

    if (products.length === 1) {
        const product = products[0]
        const stock = Number(product.stock || 0)
        const variantsText = summarizeVariants(product)

        const lines = [
            intent === 'buy'
                ? `Perfecto, encontré una opción para avanzar con la compra: ${product.name}.`
                : `Sí, tenemos esta opción: ${product.name}.`,
            product.price != null ? `Precio base: ${formatPrice(product.price)}.` : null,
            product.compare_at_price ? `Antes: ${formatPrice(product.compare_at_price)}.` : null,
            stock > 0 ? `Stock general: ${stock}.` : null,
            product.short_description || null,
            variantsText ? `Variantes disponibles o relacionadas:\n${variantsText}` : null,
            intent === 'buy'
                ? 'Abrí la tarjeta del producto para elegir variante, revisar stock y avanzar al carrito.'
                : 'Si te gusta, puedo ayudarte a elegir color, material o variante antes de comprar.',
        ]

        return {
            reply: lines.filter(Boolean).join('\n'),
            products: [product],
        }
    }

    const summary = products
        .slice(0, 4)
        .map((product) => {
            const stock = Number(product.stock || 0)
            const variantsText = summarizeVariants(product)

            return [
                `• ${product.name} — ${product.price != null ? formatPrice(product.price) : 'consultar precio'} — ${stock > 0 ? `stock ${stock}` : 'ver variantes'}`,
                variantsText ? variantsText : null,
            ].filter(Boolean).join('\n')
        })
        .join('\n\n')

    return {
        reply:
            `Sí, encontré estas opciones:\n\n${summary}\n\n` +
            'Decime cuál te gusta y te ayudo a elegir variante, color, material o avanzar con la compra.',
        products,
    }
}

async function buildGeneralAIAnswer(message) {
    const ai = await interpretWithAI(
        `Respondé como asistente vendedor de ecommerce de lámparas e iluminación. No inventes stock ni precios. Pregunta del cliente: ${message}`
    )

    if (ai?.answer) return ai.answer

    return null
}

async function getBankAccountsResponse(supabase) {
    const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('active', true)
        .limit(10)

    if (error || !data?.length) {
        return 'Podés pagar por transferencia bancaria. Si querés avanzar, escribinos y te pasamos los datos de pago.'
    }

    const accounts = data
        .map((account) => {
            const alias = account.alias ? `Alias: ${account.alias}` : null
            const cbu = account.cbu ? `CBU/CVU: ${account.cbu}` : null
            const holder = account.holder_name ? `Titular: ${account.holder_name}` : null

            return [account.bank_name, alias, cbu, holder].filter(Boolean).join(' — ')
        })
        .join('\n')

    return `Estas son las cuentas disponibles para transferencia:\n\n${accounts}`
}

// =====================
// POST
// =====================
export async function POST(request) {
    try {
        const body = await request.json().catch(() => ({}))
        const message = String(body?.message || '').trim()

        if (!message) {
            return NextResponse.json({
                reply: 'Escribime qué producto estás buscando y te ayudo.',
                products: [],
            })
        }

        const supabase = createAdminSupabaseClient()

        const localIntent = detectLocalIntent(message)
        const localQuery = cleanProductQuery(message)

        const ai = await interpretWithAI(message)

        const aiIntent = ai?.intent || null
        const intent =
            aiIntent && aiIntent !== 'general'
                ? aiIntent
                : localIntent

        const aiQuery = cleanProductQuery(ai?.query || '') || localQuery || message

        const variantTerms = Array.isArray(ai?.variant_terms)
            ? ai.variant_terms
            : []

        const source = ai?.source || 'local'

        console.log('CHAT →', {
            source,
            intent,
            aiQuery,
            variantTerms,
            localIntent,
            localQuery,
            hasGroq: Boolean(process.env.GROQ_API_KEY),
            hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
        })

        if (
            intent === 'products' ||
            intent === 'buy' ||
            intent === 'variant_question'
        ) {
            const products = await searchProducts(
                supabase,
                aiQuery || message,
                variantTerms.length ? variantTerms : extractTerms(message)
            )

            const response = buildProductResponse(
                products,
                intent,
                aiQuery || message,
                variantTerms
            )

            return NextResponse.json({
                reply: response.reply,
                products: response.products,
                debug: {
                    source,
                    intent,
                    aiQuery,
                    variantTerms,
                    localIntent,
                    localQuery,
                    hasGroq: Boolean(process.env.GROQ_API_KEY),
                    hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
                },
            })
        }

        if (intent === 'bank_accounts') {
            const reply = await getBankAccountsResponse(supabase)

            return NextResponse.json({
                reply,
                products: [],
                debug: { source, intent, aiQuery },
            })
        }

        if (intent === 'order_status') {
            return NextResponse.json({
                reply:
                    'Para revisar un pedido, pasame el número de orden o el email con el que hiciste la compra.',
                products: [],
                debug: { source, intent, aiQuery },
            })
        }

        if (intent === 'checkout_help') {
            return NextResponse.json({
                reply:
                    'Para comprar, elegí el producto, seleccioná la variante si corresponde, agregalo al carrito y seguí el checkout. También puedo ayudarte a encontrar el producto correcto.',
                products: [],
                debug: { source, intent, aiQuery },
            })
        }

        const aiAnswer = ai?.answer || await buildGeneralAIAnswer(message)

        return NextResponse.json({
            reply:
                aiAnswer ||
                'Hola, soy el asistente de 3DLightLab. Puedo ayudarte a encontrar lámparas, colores, materiales, variantes, precios, stock y formas de pago. ¿Qué estás buscando?',
            products: [],
            debug: {
                source,
                intent,
                aiQuery,
                localIntent,
                localQuery,
                hasGroq: Boolean(process.env.GROQ_API_KEY),
                hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
            },
        })
    } catch (error) {
        console.log('ERROR CHAT:', error)

        return NextResponse.json({
            reply: 'Hubo un problema procesando tu consulta.',
            products: [],
            error: process.env.NODE_ENV === 'development' ? error?.message : undefined,
        })
    }
}