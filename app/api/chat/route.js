import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'

const EMPTY_IMAGE =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
      <rect width="100%" height="100%" fill="#f7f1e8"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial" font-size="24" fill="#8d7b68">Sin imagen</text>
    </svg>
  `)

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
    'tenes', 'tienes', 'tienen', 'hay', 'venden', 'vendes', 'quiero',
    'busco', 'necesito', 'me', 'un', 'una', 'unos', 'unas', 'el',
    'la', 'los', 'las', 'de', 'del', 'para', 'por', 'con', 'en',
    'y', 'o', 'que', 'algo', 'algun', 'alguna', 'precio', 'precios',
    'cuanto', 'cuesta', 'sale', 'vale', 'comprar', 'producto', 'productos'
])

function cleanTerms(value) {
    return normalize(value)
        .split(' ')
        .map(singularize)
        .filter((word) => word && !STOP_WORDS.has(word))
}

function formatPrice(value) {
    return `$ ${Number(value || 0).toLocaleString('es-AR')}`
}

function safeParseAIJson(content) {
    try {
        const clean = String(content || '').match(/\{[\s\S]*\}/)?.[0]
        return clean ? JSON.parse(clean) : null
    } catch {
        return null
    }
}

async function callAI(provider, message, productContext = '') {
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
        temperature: 0.25,
        messages: [
            {
                role: 'system',
                content: `
Sos un asistente vendedor para un ecommerce argentino de lámparas, iluminación, decoración y productos impresos en 3D.

Respondé SOLO JSON válido con esta forma:
{
  "intent": "products|buy|variant_question|bank_accounts|order_status|checkout_help|lead|general",
  "query": "producto principal limpio",
  "variant_terms": ["color", "material", "medida", "estilo"],
  "answer": "respuesta breve y vendedora"
}

Reglas:
- Si preguntan "tenés lámpara", "tienes lampara", "hay veladores", "venden luces", intent = "products".
- Si mencionan color, material, tamaño, modelo, terminación o variante, intent = "variant_question".
- Si dicen "quiero comprar", "lo quiero", "me gusta ese", "lo llevo", intent = "buy".
- En query poné solo el producto principal. Ejemplo: "tenes lampara negra de madera" => query "lampara", variant_terms ["negra","madera"].
- No inventes stock, precio ni productos.
- Si hay contexto de productos, usalo para vender mejor.
- Si no hay productos, pedí más detalle de estilo, ambiente, color o uso.
${productContext ? `\nProductos reales disponibles:\n${productContext}` : ''}
        `.trim(),
            },
            { role: 'user', content: message },
        ],
    }

    if (!isGroq) {
        body.response_format = { type: 'json_object' }
    }

    try {
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
    } catch (error) {
        console.log(`${provider.toUpperCase()} FETCH ERROR:`, error?.message)
        return null
    }
}

async function interpretWithAI(message, productContext = '') {
    const groq = await callAI('groq', message, productContext)
    if (groq?.intent) return { ...groq, source: 'groq' }

    const openai = await callAI('openai', message, productContext)
    if (openai?.intent) return { ...openai, source: 'openai' }

    return null
}

function detectLocalIntent(message) {
    const text = normalize(message)

    if (text.includes('transferencia') || text.includes('cbu') || text.includes('alias') || text.includes('banco')) {
        return 'bank_accounts'
    }

    if (text.includes('pedido') || text.includes('orden') || text.includes('seguimiento') || text.includes('envio')) {
        return 'order_status'
    }

    if (
        text.includes('comprar') ||
        text.includes('lo quiero') ||
        text.includes('la quiero') ||
        text.includes('lo llevo') ||
        text.includes('la llevo') ||
        text.includes('pagar') ||
        text.includes('agregar al carrito')
    ) {
        return 'buy'
    }

    if (
        text.includes('color') ||
        text.includes('colores') ||
        text.includes('material') ||
        text.includes('materiales') ||
        text.includes('medida') ||
        text.includes('tamano') ||
        text.includes('tamaño') ||
        text.includes('variante') ||
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
        text.includes('lampara') ||
        text.includes('lamparas') ||
        text.includes('velador') ||
        text.includes('luz') ||
        text.includes('luces') ||
        text.includes('iluminacion') ||
        text.includes('precio') ||
        text.includes('stock') ||
        text.includes('hay') ||
        text.includes('tenes') ||
        text.includes('tienes') ||
        text.includes('venden')
    ) {
        return 'products'
    }

    return 'general'
}

function getCatalogImage(product) {
    const media = Array.isArray(product?.product_images) ? product.product_images : []

    const sorted = [...media].sort(
        (a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0)
    )

    const image =
        sorted.find((item) => item?.media_type === 'image' && item?.use_case === 'catalog') ||
        sorted.find((item) => item?.media_type === 'image' && item?.is_primary === true) ||
        sorted.find((item) => item?.media_type === 'image') ||
        sorted.find((item) => item?.image_url)

    return image?.image_url || product?.image_url || product?.image || EMPTY_IMAGE
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
            image: image,
            catalog_image_url: image,
            category: product?.categories?.name || null,
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
            const optionName = row?.product_options?.name || row?.product_options?.slug || ''
            const optionValue = row?.product_option_values?.value || row?.product_option_values?.slug || ''

            if (!optionName && !optionValue) return null
            if (!optionName) return optionValue
            if (!optionValue) return optionName

            return `${optionName}: ${optionValue}`
        })
        .filter(Boolean)
}

function variantSearchText(variant) {
    return normalize([
        variant?.sku,
        variant?.name,
        getVariantLabels(variant).join(' '),
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

    return products.map((product) => ({
        ...product,
        variants: byProductId.get(product.id) || [],
    }))
}

function scoreProduct(product, productTerms, variantTerms) {
    const name = normalize(product?.name)
    const text = productSearchText(product)
    const allTerms = [...productTerms, ...variantTerms].map(singularize)

    let score = 0
    const matchedVariants = []

    for (const term of productTerms) {
        if (!term) continue
        if (name.includes(term)) score += 14
        if (text.includes(term)) score += 6
    }

    for (const term of variantTerms) {
        if (!term) continue
        if (text.includes(term)) score += 3
    }

    for (const variant of product.variants || []) {
        const variantText = variant.search_text || variantSearchText(variant)
        let variantScore = 0

        for (const term of allTerms) {
            if (term && variantText.includes(term)) {
                variantScore += 8
            }
        }

        if (variantScore > 0) {
            matchedVariants.push({ ...variant, _score: variantScore })
            score += variantScore
        }
    }

    if (Number(product?.stock || 0) > 0) score += 1
    if (product?.featured) score += 2

    return {
        score,
        matchedVariants: matchedVariants.sort((a, b) => b._score - a._score),
    }
}

function isGenericLampSearch(terms) {
    return terms.some((term) =>
        [
            'lampara',
            'lamparas',
            'velador',
            'veladores',
            'luz',
            'luces',
            'iluminacion',
            'decoracion',
            'mesa',
            'escritorio',
        ].includes(term)
    )
}

async function searchProducts(supabase, rawQuery, rawVariantTerms = []) {
    const productsBase = await getProducts(supabase)
    const productIds = productsBase.map((product) => product.id).filter(Boolean)
    const variants = await getVariantsForProducts(supabase, productIds)
    const products = attachVariants(productsBase, variants)

    const productTerms = cleanTerms(rawQuery)
    const variantTerms = Array.isArray(rawVariantTerms)
        ? rawVariantTerms.flatMap((term) => cleanTerms(term))
        : cleanTerms(rawVariantTerms)

    const allTerms = [...productTerms, ...variantTerms]

    const scoredProducts = products
        .map((product) => {
            const result = scoreProduct(product, productTerms, variantTerms)

            return {
                ...product,
                matched_variants: result.matchedVariants,
                _score: result.score,
            }
        })
        .filter((product) => product._score > 0)
        .sort((a, b) => b._score - a._score)

    if (scoredProducts.length > 0) return scoredProducts.slice(0, 6)

    if (isGenericLampSearch(allTerms)) {
        return products
            .filter((product) => Number(product?.stock || 0) > 0)
            .sort((a, b) => {
                if (a.featured && !b.featured) return -1
                if (!a.featured && b.featured) return 1
                return Number(b.stock || 0) - Number(a.stock || 0)
            })
            .slice(0, 6)
    }

    return []
}

function summarizeVariants(product) {
    const variants = product.matched_variants?.length
        ? product.matched_variants
        : product.variants || []

    if (!variants.length) return null

    return variants.slice(0, 4).map((variant) => {
        const labels = variant.option_labels?.length
            ? variant.option_labels.join(', ')
            : variant.name || variant.sku || 'Variante'

        const price = variant.price != null
            ? formatPrice(variant.price)
            : product.price != null
                ? formatPrice(product.price)
                : null

        const stock = Number(variant.stock || 0)

        return `- ${labels}${price ? ` — ${price}` : ''} — ${stock > 0 ? `stock ${stock}` : 'sin stock'}`
    }).join('\n')
}

function productsContext(products) {
    return products.slice(0, 6).map((product) => {
        const variants = summarizeVariants(product)

        return [
            `${product.name}`,
            `precio: ${formatPrice(product.price)}`,
            `stock: ${Number(product.stock || 0)}`,
            product.short_description ? `detalle: ${product.short_description}` : null,
            variants ? `variantes:\n${variants}` : null,
        ].filter(Boolean).join('\n')
    }).join('\n\n')
}

function buildFallbackProductResponse(products, intent = 'products', query = '') {
    if (!Array.isArray(products) || products.length === 0) {
        return {
            reply:
                `No encontré productos para "${query}". ` +
                'Contame qué estilo, ambiente, color o material buscás y te ayudo a encontrar una opción.',
            products: [],
        }
    }

    if (products.length === 1) {
        const product = products[0]
        const variantsText = summarizeVariants(product)
        const stock = Number(product.stock || 0)

        return {
            reply: [
                intent === 'buy'
                    ? `Perfecto, encontré esta opción para comprar: ${product.name}.`
                    : `Sí, tenemos esta opción: ${product.name}.`,
                `Precio: ${formatPrice(product.price)}.`,
                stock > 0 ? `Stock disponible: ${stock}.` : 'Por ahora figura sin stock general, revisá variantes disponibles.',
                product.short_description || null,
                variantsText ? `Variantes disponibles:\n${variantsText}` : null,
                'Abrí la tarjeta del producto para ver el detalle y avanzar con la compra.',
            ].filter(Boolean).join('\n'),
            products: [product],
        }
    }

    const summary = products.slice(0, 4).map((product) => {
        const stock = Number(product.stock || 0)
        const variantsText = summarizeVariants(product)

        return [
            `• ${product.name} — ${formatPrice(product.price)} — ${stock > 0 ? `stock ${stock}` : 'ver variantes'}`,
            variantsText ? variantsText : null,
        ].filter(Boolean).join('\n')
    }).join('\n\n')

    return {
        reply:
            `Sí, encontré estas opciones:\n\n${summary}\n\n` +
            'Decime cuál te gusta y te ayudo a elegir color, material, variante o avanzar con la compra.',
        products,
    }
}

async function buildAIProductResponse(message, products, intent, source) {
    const context = productsContext(products)

    const ai = await interpretWithAI(
        `
Cliente: ${message}

Armá una respuesta breve, vendedora y útil.
No inventes productos, precios ni stock.
Usá solo estos productos reales:
${context}
    `.trim(),
        context
    )

    if (ai?.answer) {
        return {
            reply: ai.answer,
            products,
            source: ai.source || source,
        }
    }

    const fallback = buildFallbackProductResponse(products, intent, message)

    return {
        ...fallback,
        source,
    }
}

async function getBankAccountsResponse(supabase) {
    const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('active', true)
        .limit(10)

    if (error || !data?.length) {
        return 'Podés pagar por transferencia bancaria. Si querés avanzar, te indicamos los datos de pago al finalizar la compra.'
    }

    return data.map((account) => {
        const alias = account.alias ? `Alias: ${account.alias}` : null
        const cbu = account.cbu ? `CBU/CVU: ${account.cbu}` : null
        const holder = account.holder_name ? `Titular: ${account.holder_name}` : null
        return [account.bank_name, alias, cbu, holder].filter(Boolean).join(' — ')
    }).join('\n')
}

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
        const localQuery = cleanTerms(message).join(' ')

        const ai = await interpretWithAI(message)

        const intent =
            ai?.intent && ai.intent !== 'general'
                ? ai.intent
                : localIntent

        const aiQuery =
            cleanTerms(ai?.query || '').join(' ') ||
            localQuery ||
            message

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

        if (intent === 'products' || intent === 'buy' || intent === 'variant_question') {
            const products = await searchProducts(
                supabase,
                aiQuery || message,
                variantTerms.length ? variantTerms : cleanTerms(message)
            )

            const response = await buildAIProductResponse(message, products, intent, source)

            return NextResponse.json({
                reply: response.reply,
                products: response.products,
                debug: {
                    source: response.source || source,
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
                reply: 'Para revisar un pedido, pasame el número de orden o el email con el que hiciste la compra.',
                products: [],
                debug: { source, intent, aiQuery },
            })
        }

        if (intent === 'checkout_help') {
            return NextResponse.json({
                reply: 'Para comprar, elegí el producto, seleccioná la variante si corresponde, agregalo al carrito y seguí el checkout. También puedo ayudarte a encontrar la lámpara ideal.',
                products: [],
                debug: { source, intent, aiQuery },
            })
        }

        const generalAI = await interpretWithAI(
            `Respondé como asistente vendedor de ecommerce de lámparas. No inventes stock ni precios. Pregunta: ${message}`
        )

        return NextResponse.json({
            reply:
                generalAI?.answer ||
                ai?.answer ||
                'Hola, soy el asistente de 3DLightLab. Puedo ayudarte a encontrar lámparas, colores, materiales, variantes, precios, stock y formas de pago. ¿Qué estás buscando?',
            products: [],
            debug: {
                source: generalAI?.source || source,
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