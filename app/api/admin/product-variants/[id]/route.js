import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'

function isValidUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(value || '').trim()
    )
}

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

async function resolveId(context) {
    const params = await context?.params
    return String(params?.id || '').trim()
}

function buildPayload(body) {
    const sku = normalizeSku(body?.sku || '')
    const name = body?.name ? String(body.name).trim() : null

    return {
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

export async function PUT(request, context) {
    const auth = await requireAdmin(request)
    if (!auth.authorized) return auth.response

    const id = await resolveId(context)

    if (!isValidUuid(id)) {
        return NextResponse.json({ error: 'ID de variante inválido' }, { status: 400 })
    }

    try {
        const body = await request.json().catch(() => ({}))
        const payload = buildPayload(body)
        const optionValues = normalizeOptionValues(body?.option_values)

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

        const { data: existing, error: existingError } = await supabase
            .from('product_variants')
            .select('id, deleted_at')
            .eq('id', id)
            .maybeSingle()

        if (existingError) {
            return NextResponse.json({ error: existingError.message }, { status: 500 })
        }

        if (!existing || existing.deleted_at) {
            return NextResponse.json({ error: 'Variante no encontrada' }, { status: 404 })
        }

        const { data: skuRow, error: skuError } = await supabase
            .from('product_variants')
            .select('id')
            .eq('sku', payload.sku)
            .neq('id', id)
            .is('deleted_at', null)
            .maybeSingle()

        if (skuError) {
            return NextResponse.json({ error: skuError.message }, { status: 500 })
        }

        if (skuRow) {
            return NextResponse.json({ error: 'Ya existe otra variante con ese SKU' }, { status: 400 })
        }

        const { error } = await supabase
            .from('product_variants')
            .update(payload)
            .eq('id', id)
            .is('deleted_at', null)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const optionsResult = await replaceVariantOptionValues(supabase, id, optionValues)

        if (!optionsResult.ok) {
            return NextResponse.json({ error: optionsResult.error }, { status: 500 })
        }

        const { data, error: fullError } = await supabase
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
            .eq('id', id)
            .single()

        if (fullError) {
            return NextResponse.json({ ok: true })
        }

        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json(
            { error: error?.message || 'No se pudo actualizar la variante' },
            { status: 500 }
        )
    }
}

export async function DELETE(request, context) {
    const auth = await requireAdmin(request)
    if (!auth.authorized) return auth.response

    const id = await resolveId(context)

    if (!isValidUuid(id)) {
        return NextResponse.json({ error: 'ID de variante inválido' }, { status: 400 })
    }

    try {
        const supabase = createAdminSupabaseClient()

        const { data: existing, error: existingError } = await supabase
            .from('product_variants')
            .select('id, deleted_at')
            .eq('id', id)
            .maybeSingle()

        if (existingError) {
            return NextResponse.json({ error: existingError.message }, { status: 500 })
        }

        if (!existing || existing.deleted_at) {
            return NextResponse.json({ error: 'Variante no encontrada' }, { status: 404 })
        }

        const { error } = await supabase
            .from('product_variants')
            .update({
                active: false,
                deleted_at: new Date().toISOString(),
            })
            .eq('id', id)
            .is('deleted_at', null)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ ok: true })
    } catch (error) {
        return NextResponse.json(
            { error: error?.message || 'No se pudo eliminar la variante' },
            { status: 500 }
        )
    }
}