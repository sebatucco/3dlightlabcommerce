import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'

function isValidUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(value || '').trim()
    )
}

function normalizeSlug(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
}

async function resolveId(context) {
    const params = await context?.params
    return String(params?.id || '').trim()
}

function buildPayload(body) {
    const value = String(body?.value || '').trim()
    const slug = normalizeSlug(body?.slug || body?.value || '')

    return {
        value,
        slug,
        sort_order: Number(body?.sort_order || 0),
        active: body?.active !== false,
    }
}

export async function PUT(request, context) {
    const auth = await requireAdmin(request)
    if (!auth.authorized) return auth.response

    const id = await resolveId(context)

    if (!isValidUuid(id)) {
        return NextResponse.json({ error: 'ID de valor inválido' }, { status: 400 })
    }

    try {
        const body = await request.json().catch(() => ({}))
        const payload = buildPayload(body)

        if (!payload.value || !payload.slug) {
            return NextResponse.json({ error: 'Valor y slug son obligatorios' }, { status: 400 })
        }

        const supabase = createAdminSupabaseClient()

        const { data, error } = await supabase
            .from('product_option_values')
            .update(payload)
            .eq('id', id)
            .is('deleted_at', null)
            .select('*')
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json(
            { error: error?.message || 'No se pudo actualizar el valor' },
            { status: 500 }
        )
    }
}

export async function DELETE(request, context) {
    const auth = await requireAdmin(request)
    if (!auth.authorized) return auth.response

    const id = await resolveId(context)

    if (!isValidUuid(id)) {
        return NextResponse.json({ error: 'ID de valor inválido' }, { status: 400 })
    }

    try {
        const supabase = createAdminSupabaseClient()

        const { error } = await supabase
            .from('product_option_values')
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
            { error: error?.message || 'No se pudo eliminar el valor' },
            { status: 500 }
        )
    }
}