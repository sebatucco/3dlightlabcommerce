import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'

function normalizeSku(value) {
    return String(value || '')
        .trim()
        .toUpperCase()
}

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
        sku: normalizeSku(body?.sku || ''),
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

    const regex = new RegExp(`^${baseSku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d{3})$`)

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
      product_variant_option_values(
        option_id,
        option_value_id
      )
    `)
        .is('deleted_at', null)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
}

export async function POST(request) {
    const auth = await requireAdmin(request)
    if (!auth.authorized) return auth.response

    const body = await request.json().catch(() => ({}))
    const payload = buildPayload(body)
    const optionValues = normalizeOptionValues(body?.option_values)

    if (!payload.product_id) {
        return NextResponse.json({ error: 'Falta product_id' }, { status: 400 })
    }

    payload.sku = await generateVariantSku(supabase, payload.product_id)

    const supabase = createAdminSupabaseClient()

    // 1️⃣ crear variante
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

    // 2️⃣ guardar relación con opciones
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

    return NextResponse.json(variant, { status: 201 })
}