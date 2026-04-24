import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'

function normalizeSlug(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
}

function buildPayload(body) {
    const name = String(body?.name || '').trim()
    const slug = normalizeSlug(body?.slug || body?.name || '')
    const product_id = String(body?.product_id || '').trim()

    return {
        product_id,
        name,
        slug,
        required: Boolean(body?.required),
        visible_on_product: body?.visible_on_product !== false,
        visible_on_order: body?.visible_on_order !== false,
        sort_order: Number(body?.sort_order || 0),
        active: body?.active !== false,
    }
}

export async function GET(request) {
    const auth = await requireAdmin(request)
    if (!auth.authorized) return auth.response

    try {
        const { searchParams } = new URL(request.url)
        const productId = searchParams.get('product_id')

        const supabase = createAdminSupabaseClient()

        let query = supabase
            .from('product_options')
            .select(`
        *,
        product_option_values(*)
      `)
            .is('deleted_at', null)
            .order('sort_order', { ascending: true })

        if (productId) {
            query = query.eq('product_id', productId)
        }

        const { data, error } = await query

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data || [])
    } catch (error) {
        return NextResponse.json(
            { error: error?.message || 'No se pudieron obtener las opciones' },
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

        if (!payload.product_id) {
            return NextResponse.json({ error: 'Falta producto' }, { status: 400 })
        }

        if (!payload.name || !payload.slug) {
            return NextResponse.json({ error: 'Nombre y slug son obligatorios' }, { status: 400 })
        }

        const supabase = createAdminSupabaseClient()

        const { data, error } = await supabase
            .from('product_options')
            .insert(payload)
            .select('*')
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data, { status: 201 })
    } catch (error) {
        return NextResponse.json(
            { error: error?.message || 'No se pudo crear la opción' },
            { status: 500 }
        )
    }
}