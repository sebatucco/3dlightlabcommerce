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
    const product_id = String(body?.product_id || '').trim()
    const sku = normalizeSku(body?.sku || '')
    const name = body?.name ? String(body.name).trim() : null

    return {
        product_id,
        sku,
        name,
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

async function validateProduct(supabase, productId) {
    const { data, error } = await supabase
        .from('products')
        .select('id')
        .eq('id', productId)
        .is('deleted_at', null)
        .maybeSingle()

    if (error) return { ok: false, error: error.message, status: 500 }
    if (!data) return { ok: false, error: 'Producto no encontrado', status: 400 }

    return { ok: true }
}

async function replaceVariantOptionValues(supabase, variantId, optionValues) {
    const { error: deleteError } = await supabase
        .from('product_variant_option_values')
        .delete()
        .eq('variant_id', variantId)

    if (deleteError) {
        return { ok: false, error: deleteError.message }
    }

    if (optionValues.length === 0) {
        return { ok: true }
    }

    const rows = optionValues.map((item) => ({
        variant_id: variantId,
        option_id: item.option_id,
        option_value_id: item.option_value_id,
    }))

    const { error: insertError } = await supabase
        .from('product_variant_option_values')
        .insert(rows)

    if (insertError) {
        return { ok: false, error: insertError.message }
    }

    return { ok: true }
}

export async function GET(request) {
    const auth = await requireAdmin(request)
    if (!auth.authorized) return auth.response

    try {
        const { searchParams } = new URL(request.url)
        const productId = searchParams.get('product_id')

        const supabase = createAdminSupabaseClient()

        let query = supabase
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

        if (productId) {
            query = query.eq('product_id', productId)
        }

        const { data, error } = await query

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data || [], {
            headers: { 'Cache-Control': 'no-store, max-age=0' },
        })
    } catch (error) {
        return NextResponse.json(
            { error: error?.message || 'No se pudieron obtener las variantes' },
            { status: 500 }
        )
    }
}

export async function POST(request) {
    const auth = await requireAdmin(request)
    if (!auth.authorized) return auth.response

    try {
        const body = await request.json().catch(() => ({}))
        const payload = buildPayload(body)
        const optionValues = normalizeOptionValues(body?.option_values)

        if (!payload.product_id) {
            return NextResponse.json({ error: 'Falta producto' }, { status: 400 })
        }

        if (!payload.sku) {
            return NextResponse.json({ error: 'El SKU de la variante es obligatorio' }, { status: 400 })
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

        const productValidation = await validateProduct(supabase, payload.product_id)
        if (!productValidation.ok) {
            return NextResponse.json(
                { error: productValidation.error },
                { status: productValidation.status }
            )
        }

        const { data: skuRow, error: skuError } = await supabase
            .from('product_variants')
            .select('id')
            .eq('sku', payload.sku)
            .is('deleted_at', null)
            .maybeSingle()

        if (skuError) {
            return NextResponse.json({ error: skuError.message }, { status: 500 })
        }

        if (skuRow) {
            return NextResponse.json({ error: 'Ya existe una variante con ese SKU' }, { status: 400 })
        }

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

        const optionsResult = await replaceVariantOptionValues(
            supabase,
            variant.id,
            optionValues
        )

        if (!optionsResult.ok) {
            return NextResponse.json({ error: optionsResult.error }, { status: 500 })
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