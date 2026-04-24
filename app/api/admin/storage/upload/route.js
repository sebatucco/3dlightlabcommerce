import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'

const BUCKETS = {
    image: 'product-images',
    model: 'product-models',
}

function safeFileName(value) {
    const raw = String(value || 'archivo')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/(^-|-$)/g, '')

    return raw || 'archivo'
}

export async function POST(request) {
    const auth = await requireAdmin(request)
    if (!auth.authorized) return auth.response

    try {
        const formData = await request.formData()
        const file = formData.get('file')
        const mediaType = String(formData.get('media_type') || 'image').trim().toLowerCase()
        const productId = String(formData.get('product_id') || 'general').trim()

        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'Archivo inválido' }, { status: 400 })
        }

        const bucket = BUCKETS[mediaType]

        if (!bucket) {
            return NextResponse.json({ error: 'Tipo de media inválido' }, { status: 400 })
        }

        const supabase = createAdminSupabaseClient()
        const fileName = safeFileName(file.name)
        const path = `${productId}/${Date.now()}-${fileName}`

        const { error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type || undefined,
            })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const { data } = supabase.storage.from(bucket).getPublicUrl(path)

        return NextResponse.json({
            ok: true,
            bucket,
            path,
            publicUrl: data.publicUrl,
        })
    } catch (error) {
        return NextResponse.json(
            { error: error?.message || 'No se pudo subir el archivo' },
            { status: 500 }
        )
    }
}