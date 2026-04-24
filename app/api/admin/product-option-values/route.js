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
    const option_id = String(body?.option_id || '').trim()
    const value = String(body?.value || '').trim()
    const slug = normalizeSlug(body?.slug || body?.value || '')

    return {
        option_id,
        value,
        slug,
        sort_order: Number(body?.sort_order || 0),
        active: body?.active !== false,
    }
}

export async function GET(request) {
    const auth = await requireAdmin(request)
    if (!auth.authorized) return auth.response

    try {
        const { searchParams } = new URL(request.url)
        const optionId = searchParams.get('option_id')

        const supabase = createAdminSupabaseClient()

        let query = supabase
            .from('product_option_values')
            .select('*')
            .is('deleted_at', null)
            .order('sort_order', { ascending: true })

        if (optionId) {
            query = query.eq('option_id', optionId)
        }

        const { data, error } = await query

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data || [])
    } catch (error) {
        return NextResponse.json(
            { error: error?.message || 'No se pudieron obtener los valores' },
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

        if (!payload.option_id) {
            return NextResponse.json({ error: 'Falta opción' }, { status: 400 })
        }

        if (!payload.value || !payload.slug) {
            return NextResponse.json({ error: 'Valor y slug son obligatorios' }, { status: 400 })
        }

        const supabase = createAdminSupabaseClient()

        const { data, error } = await supabase
            .from('product_option_values')
            .insert(payload)
            .select('*')
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data, { status: 201 })
    } catch (error) {
        return NextResponse.json(
            { error: error?.message || 'No se pudo crear el valor' },
            { status: 500 }
        )
    }
}