import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'

function toSafeNumber(value, fallback = null) {
    if (value === '' || value == null) return fallback
    const num = Number(value)
    return Number.isFinite(num) ? num : fallback
}

function toSafeInteger(value, fallback = 0) {
    const num = Number(value)
    return Number.isInteger(num) ? num : fallback
}

function buildPayload(body) {
    return {
        product_id: String(body?.product_id || '').trim(),
        name: body?.name ? String(body.name).trim() : null,
        price: toSafeNumber(body?.price, null),
        compare_at_price: toSafeNumber(body?.compare_at_price, null),
        stock: Math.max(0, toSafeInteger(body?.stock, 0)),
        active: body?.active !== false,
    }
}

function normalizeOptionValues(values) {
    if (!Array.isArray(values)) return []

    return values
        .map((item) => ({
            option_id: String(item?.option_id || '').trim(),
            option_value_id: String(item?.option_value_id || '').trim(),
        }))
        .filter((item) => item.option_id && item.option_value_id)
}

function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function generateVariantSku(supabase, productId) {
    const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, sku')
        .eq('id', productId)
        .is('deleted_at', null)
        .maybeSingle()

    if (productError) {
        throw new Error(productError.message)
    }

    if (!product) {
        throw new Error('Producto no encontrado')
    }

    const baseSku = String(product.sku || '').trim().toUpperCase()

    if (!baseSku) {
        throw new Error('El producto base no tiene SKU')
    }

    const { data: variants, error: variantsError } = await supabase
        .from('product_variants')
        .select('sku')
        .eq('product_id', productId)

    if (variantsError) {
        throw new Error(variantsError.message)
    }

    const regex = new RegExp(`^${escapeRegExp(baseSku)}-(\\d{3})$`, 'i')

    const maxNumber = (variants || []).reduce((max, row) => {
        const match = String(row.sku || '').match(regex)
        const number = match ? Number(match[1]) : 0
        return Math.max(max, number)
    }, 0)

    return `${baseSku}-${String(maxNumber + 1).padStart(3, '0')}`
}

export async function GET(request) {
    const auth = await requireAdmin(request)
    if (!auth.authorized) return auth.response

    const supabase = createAdminSupabaseClient()

    const { data, error } = await supabase
        .from('product_variants')
        .select(`
      *,
      products(id,name,slug,sku),
      product_variant_option_values(
        id,
        option_id,
        option_value_id,
        product_options(id,name,slug),
        product_option_values(id,value,slug)
      )
    `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [], {
        headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
}

export async function POST(request) {
    const auth = await requireAdmin(request)
    if (!auth.authorized) return auth.response

    try {
        const body = await request.json().catch(() => ({}))
        const payload = buildPayload(body)
        const optionValues = normalizeOptionValues(body?.option_values)

        if (!payload.product_id) {
            return NextResponse.json({ error: 'Falta product_id' }, { status: 400 })
        }

        if (payload.price != null && payload.price < 0) {
            return NextResponse.json({ error: 'El precio no puede ser negativo' }, { status: 400 })
        }

        if (payload.compare_at_price != null && payload.compare_at_price < 0) {
            return NextResponse.json(
                { error: 'El precio tachado no puede ser negativo' },
                { status: 400 }
            )
        }

        const supabase = createAdminSupabaseClient()

        payload.sku = await generateVariantSku(supabase, payload.product_id)

        const { data: variant, error } = await supabase
            .from('product_variants')
            .insert({
                ...payload,
                deleted_at: null,
            })
            .select('*')
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        if (optionValues.length > 0) {
            const rows = optionValues.map((item) => ({
                variant_id: variant.id,
                option_id: item.option_id,
                option_value_id: item.option_value_id,
            }))

            const { error: optError } = await supabase
                .from('product_variant_option_values')
                .insert(rows)

            if (optError) {
                return NextResponse.json({ error: optError.message }, { status: 500 })
            }
        }

        const { data: fullVariant, error: fullError } = await supabase
            .from('product_variants')
            .select(`
        *,
        products(id,name,slug,sku),
        product_variant_option_values(
          id,
          option_id,
          option_value_id,
          product_options(id,name,slug),
          product_option_values(id,value,slug)
        )
      `)
            .eq('id', variant.id)
            .single()

        if (fullError) {
            return NextResponse.json(variant, { status: 201 })
        }

        return NextResponse.json(fullVariant, { status: 201 })
    } catch (error) {
        return NextResponse.json(
            { error: error?.message || 'No se pudo crear la variante' },
            { status: 500 }
        )
    }
}