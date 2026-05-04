import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'

const ALLOWED_USE_CASES = ['catalog', 'detail', 'gallery', 'hero', 'carousel']

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

function normalizeUseCase(value) {
    const useCase = String(value || 'catalog').trim().toLowerCase()
    return ALLOWED_USE_CASES.includes(useCase) ? useCase : 'catalog'
}

function resolveBucket({ uploadScope, mediaType, useCase, variantId }) {
    if (uploadScope === 'global') {
        return 'site-media-images'
    }

    if (uploadScope === 'variant' || variantId) {
        return 'product-variant-images'
    }

    if (mediaType === 'model') {
        return 'product-models'
    }

    return 'product-images'
}

export async function POST(request) {
    const auth = await requireAdmin(request)
    if (!auth.authorized) return auth.response

    try {
        const formData = await request.formData()

        const file = formData.get('file')
        const mediaType = String(formData.get('media_type') || 'image').trim().toLowerCase()
        const productId = String(formData.get('product_id') || '').trim()
        const variantId = String(formData.get('variant_id') || '').trim()
        const uploadScope = String(formData.get('upload_scope') || 'base').trim().toLowerCase()
        const useCase = normalizeUseCase(formData.get('use_case'))

        if (!file || typeof file === 'string') {
            return NextResponse.json({ error: 'Archivo inválido' }, { status: 400 })
        }

        if (!['base', 'variant', 'global'].includes(uploadScope)) {
            return NextResponse.json({ error: 'upload_scope inválido' }, { status: 400 })
        }

        if (uploadScope !== 'global' && !productId) {
            return NextResponse.json({ error: 'Falta product_id' }, { status: 400 })
        }

        if (!['image', 'model'].includes(mediaType)) {
            return NextResponse.json({ error: 'Tipo de media inválido' }, { status: 400 })
        }

        if (uploadScope === 'variant' && !variantId) {
            return NextResponse.json(
                { error: 'Para imagen de variante tenés que seleccionar una variante' },
                { status: 400 }
            )
        }

        if (uploadScope === 'variant' && mediaType !== 'image') {
            return NextResponse.json(
                { error: 'Las variantes solo pueden tener imágenes, no modelos 3D' },
                { status: 400 }
            )
        }

        const bucket = resolveBucket({
            uploadScope,
            mediaType,
            useCase,
            variantId,
        })

        const supabase = createAdminSupabaseClient()

        if (variantId) {
            const { data: variant, error: variantError } = await supabase
                .from('product_variants')
                .select('id, product_id')
                .eq('id', variantId)
                .eq('product_id', productId)
                .is('deleted_at', null)
                .maybeSingle()

            if (variantError) {
                return NextResponse.json({ error: variantError.message }, { status: 500 })
            }

            if (!variant) {
                return NextResponse.json(
                    { error: 'La variante no existe o no pertenece al producto seleccionado' },
                    { status: 400 }
                )
            }
        }

        const fileName = safeFileName(file.name)

        const folder =
            uploadScope === 'global'
                ? `global/${useCase}`
                : uploadScope === 'variant' && variantId
                    ? `${productId}/variants/${variantId}`
                    : `${productId}/${useCase}`

        const path = `${folder}/${Date.now()}-${fileName}`

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
            product_id: productId,
            variant_id: variantId || null,
            media_type: mediaType,
            use_case: uploadScope === 'variant' ? 'detail' : useCase,
            upload_scope: uploadScope,
        })
    } catch (error) {
        return NextResponse.json(
            { error: error?.message || 'No se pudo subir el archivo' },
            { status: 500 }
        )
    }
}
