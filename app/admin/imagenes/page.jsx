'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, Search, Trash2, Upload } from 'lucide-react'

const initialForm = {
    upload_scope: 'base',
    product_id: '',
    variant_id: '',
    image_url: '',
    alt_text: '',
    sort_order: 0,
    media_type: 'image',
    use_case: 'catalog',
    bucket: '',
    is_primary: false,
}

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
}

function getFileName(value) {
    const raw = String(value || '').trim()
    if (!raw) return ''
    const clean = raw.split('?')[0].split('#')[0]
    return clean.split('/').pop() || raw
}

function resolvePreviewUrl(value) {
    const raw = String(value || '').trim()
    if (!raw) return ''
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw
    if (raw.startsWith('/')) return raw
    return `/${raw}`
}

export default function AdminImagenesPage() {
    const [images, setImages] = useState([])
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [typeFilter, setTypeFilter] = useState('all')
    const [useCaseFilter, setUseCaseFilter] = useState('all')
    const [form, setForm] = useState(initialForm)
    const [variants, setVariants] = useState([])
    const [variantSearch, setVariantSearch] = useState('')
    const variantOptions = useMemo(() => {
        return variants.map((variant) => ({
            id: variant.id,
            product_id: variant.product_id,
            label: `${variant.name || variant.sku || 'Variante'}${variant.sku ? ` · ${variant.sku}` : ''}`,
        }))
    }, [variants])

    const filteredVariantOptions = useMemo(() => {
        const term = normalizeText(variantSearch)

        return variantOptions
            .filter((variant) => variant.product_id === form.product_id)
            .filter((variant) => {
                if (!term) return true
                return normalizeText(variant.label).includes(term)
            })
    }, [variantOptions, form.product_id, variantSearch])


    async function loadData() {
        try {
            setLoading(true)
            setError('')

            const [imagesRes, productsRes, variantsRes] = await Promise.all([
                fetch('/api/admin/product-images', { cache: 'no-store' }),
                fetch('/api/admin/products', { cache: 'no-store' }),
                fetch('/api/admin/product-variants', { cache: 'no-store' }),
            ])

            const imagesData = await imagesRes.json().catch(() => [])
            const productsData = await productsRes.json().catch(() => [])
            const variantsData = await variantsRes.json().catch(() => [])

            if (!imagesRes.ok) {
                throw new Error(imagesData?.error || 'No se pudo cargar la media')
            }

            if (!productsRes.ok) {
                throw new Error(productsData?.error || 'No se pudieron cargar los productos')
            }
            if (!variantsRes.ok) {
                throw new Error(variantsData?.error || 'No se pudieron cargar las variantes')
            }

            setImages(Array.isArray(imagesData) ? imagesData : [])
            setProducts(Array.isArray(productsData) ? productsData : [])
            setVariants(Array.isArray(variantsData) ? variantsData : [])

        } catch (err) {
            setError(err.message || 'Error cargando imágenes')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    function resetForm() {
        setForm(initialForm)
        setEditingId(null)
    }

    function selectImage(image) {
        setEditingId(image.id)
        setForm({
            upload_scope: image.variant_id ? 'variant' : 'base',
            product_id: image.product_id || '',
            variant_id: image.variant_id || '',
            image_url: image.image_url || '',
            alt_text: image.alt_text || '',
            sort_order: Number(image.sort_order || 0),
            media_type: image.media_type || 'image',
            use_case: image.variant_id ? 'detail' : image.use_case || 'catalog',
            is_primary: Boolean(image.is_primary),
        })
    }

    async function uploadFile(file) {
        if (!file) return

        if (!form.product_id) {
            setError('Seleccioná un producto antes de subir el archivo')
            return
        }

        try {
            if (form.upload_scope === 'variant' && !form.variant_id) {
                setError('Seleccioná una variante antes de subir la imagen')
                return
            }

            if (form.upload_scope === 'variant' && form.media_type !== 'image') {
                setError('Las variantes solo pueden tener imágenes')
                return
            }

            setUploading(true)
            setError('')
            setMessage('')

            const uploadScope = form.upload_scope === 'variant' ? 'variant' : 'base'
            const useCase = uploadScope === 'variant' ? 'detail' : form.use_case
            const mediaType = uploadScope === 'variant' ? 'image' : form.media_type

            const uploadForm = new FormData()
            uploadForm.append('file', file)
            uploadForm.append('media_type', mediaType)
            uploadForm.append('product_id', form.product_id)
            uploadForm.append('use_case', useCase)
            uploadForm.append('upload_scope', uploadScope)

            if (uploadScope === 'variant') {
                uploadForm.append('variant_id', form.variant_id)
            }

            const response = await fetch('/api/admin/storage/upload', {
                method: 'POST',
                body: uploadForm,
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo subir el archivo')
            }

            setForm((prev) => ({
                ...prev,
                image_url: data.publicUrl,
                alt_text: prev.alt_text || getFileName(data.publicUrl),
                bucket: data.bucket || prev.bucket,
                use_case: data.use_case || useCase,
                media_type: data.media_type || mediaType,
                variant_id: data.variant_id || prev.variant_id,
            }))

            setMessage(`Archivo subido correctamente${data.bucket ? ` a ${data.bucket}` : ''}`)
        } catch (err) {
            setError(err.message || 'Error subiendo archivo')
        } finally {
            setUploading(false)
        }
    }

    async function submitForm(e) {
        e.preventDefault()

        try {
            setSaving(true)
            setError('')
            setMessage('')

            const payload = {
                product_id: form.product_id,
                variant_id: form.upload_scope === 'variant' ? form.variant_id : null,
                image_url: String(form.image_url || '').trim(),
                alt_text: String(form.alt_text || '').trim(),
                sort_order: Number(form.sort_order || 0),
                media_type: form.upload_scope === 'variant' ? 'image' : form.media_type,
                use_case: form.upload_scope === 'variant' ? 'detail' : form.use_case || null,
                is_primary: Boolean(form.is_primary),
                bucket:
                    form.upload_scope === 'variant'
                        ? 'product-variant-images'
                        : form.bucket || (
                            form.media_type === 'model'
                                ? 'product-models'
                                : form.use_case === 'gallery'
                                    ? 'product-gallery-images'
                                    : form.use_case === 'hero'
                                        ? 'product-hero-images'
                                        : 'product-images'
                        ),
            }

            if (!payload.product_id) {
                throw new Error('Seleccioná un producto')
            }

            if (!payload.image_url) {
                throw new Error('Subí un archivo o pegá una URL')
            }

            const endpoint = editingId
                ? `/api/admin/product-images/${editingId}`
                : '/api/admin/product-images'

            const method = editingId ? 'PUT' : 'POST'

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const data = await response.json().catch(() => ({}))

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo guardar la media')
            }

            setMessage(editingId ? 'Media actualizada' : 'Media creada')
            resetForm()
            await loadData()
        } catch (err) {
            setError(err.message || 'Error guardando media')
        } finally {
            setSaving(false)
        }
    }

    async function deleteImage(image) {
        const ok = window.confirm(`¿Eliminar "${getFileName(image.image_url)}"?`)
        if (!ok) return

        try {
            setError('')
            setMessage('')

            const response = await fetch(`/api/admin/product-images/${image.id}`, {
                method: 'DELETE',
            })

            const data = await response.json().catch(() => ({}))

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo eliminar la media')
            }

            setMessage('Media eliminada')
            if (editingId === image.id) resetForm()
            await loadData()
        } catch (err) {
            setError(err.message || 'Error eliminando media')
        }
    }

    const filteredImages = useMemo(() => {
        const term = normalizeText(searchTerm)

        return images.filter((image) => {
            const typeOk = typeFilter === 'all' || image.media_type === typeFilter
            const useOk = useCaseFilter === 'all' || image.use_case === useCaseFilter

            if (!term) return typeOk && useOk

            const haystack = normalizeText(
                [
                    image.products?.name,
                    image.products?.slug,
                    image.alt_text,
                    image.image_url,
                    image.media_type,
                    image.use_case,
                ]
                    .filter(Boolean)
                    .join(' ')
            )

            return typeOk && useOk && haystack.includes(term)
        })
    }, [images, searchTerm, typeFilter, useCaseFilter])

    return (
        <main className="min-h-screen bg-[#f5efe3] text-[#143047]">
            <div className="container mx-auto px-4 py-10">
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5e89a6]">
                            Administración
                        </p>
                        <h1 className="mt-2 text-4xl font-extrabold">Imágenes y modelos</h1>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => (window.location.href = '/admin')}
                            className="rounded-full border border-[#d8cdb8] bg-white px-5 py-3 text-sm font-semibold text-[#143047] hover:bg-[#f8f3ea]"
                        >
                            ← Volver
                        </button>

                        <button
                            type="button"
                            onClick={loadData}
                            className="inline-flex items-center gap-2 rounded-full border border-[#d8cdb8] bg-white px-5 py-3 text-sm font-semibold text-[#143047] hover:bg-[#f8f3ea]"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Actualizar
                        </button>
                    </div>
                </div>

                {error ? (
                    <div className="mb-6 rounded-3xl border border-[#f2c7c2] bg-[#fff1ef] px-5 py-4 text-sm text-[#b44a42]">
                        {error}
                    </div>
                ) : null}

                {message ? (
                    <div className="mb-6 rounded-3xl border border-[#bfe7d9] bg-[#ecf8f4] px-5 py-4 text-sm text-[#0f6d5f]">
                        {message}
                    </div>
                ) : null}

                <div className="mb-6 grid gap-4 rounded-3xl border border-[#d8cdb8] bg-white p-5 shadow-sm lg:grid-cols-[1.2fr_repeat(2,minmax(0,1fr))]">
                    <label className="flex items-center gap-3 rounded-2xl border border-[#e7dbc7] bg-[#faf6ee] px-4 py-3">
                        <Search className="h-4 w-4 text-[#5e89a6]" />
                        <input
                            type="text"
                            placeholder="Filtrar por producto, archivo o texto alternativo"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-transparent text-sm outline-none"
                        />
                    </label>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="rounded-2xl border border-[#e7dbc7] bg-[#faf6ee] px-4 py-3 text-sm outline-none"
                    >
                        <option value="all">Todos los tipos</option>
                        <option value="image">Imágenes</option>
                        <option value="model">Modelos 3D</option>
                    </select>

                    <select
                        value={useCaseFilter}
                        onChange={(e) => setUseCaseFilter(e.target.value)}
                        className="rounded-2xl border border-[#e7dbc7] bg-[#faf6ee] px-4 py-3 text-sm outline-none"
                    >
                        <option value="all">Todos los usos</option>
                        <option value="catalog">Catalog</option>
                        <option value="detail">Detail</option>
                        <option value="gallery">Gallery</option>
                        <option value="hero">Hero</option>
                    </select>
                </div>

                <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                    <form
                        onSubmit={submitForm}
                        className="space-y-4 rounded-3xl border border-[#d8cdb8] bg-white p-6 shadow-sm"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-bold text-[#143047]">
                                    {editingId ? 'Editar media' : 'Agregar media'}
                                </h2>
                                <p className="mt-1 text-sm text-[#6d7e8b]">
                                    Subí imágenes al bucket product-images y modelos 3D al bucket product-models.
                                </p>
                            </div>

                            <span className="rounded-full bg-[#f8f3ea] px-3 py-1 text-xs font-semibold text-[#143047]">
                                {editingId ? 'Modo edición' : 'Modo alta'}
                            </span>
                        </div>

                        <select
                            value={form.product_id}
                            onChange={(e) => {
                                setVariantSearch('')
                                setForm((prev) => ({
                                    ...prev,
                                    product_id: e.target.value,
                                    variant_id: '',
                                    image_url: '',
                                    bucket: '',
                                }))
                            }}
                            className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                        >
                            <option value="">Seleccioná un producto</option>
                            {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                    {product.name} {product.sku ? `· ${product.sku}` : ''}
                                </option>
                            ))}
                        </select>

                        {form.upload_scope === 'variant' ? (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={variantSearch}
                                    onChange={(e) => setVariantSearch(e.target.value)}
                                    placeholder="Buscar variante por SKU o nombre"
                                    disabled={!form.product_id}
                                    className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none disabled:bg-[#f3efe6] disabled:text-[#8d7b68]"
                                />

                                <select
                                    value={form.variant_id}
                                    onChange={(e) => {
                                        const variantId = e.target.value
                                        setForm((prev) => ({
                                            ...prev,
                                            variant_id: variantId,
                                            media_type: 'image',
                                            use_case: 'detail',
                                            image_url: '',
                                            bucket: '',
                                        }))
                                    }}
                                    disabled={!form.product_id}
                                    className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none disabled:bg-[#f3efe6] disabled:text-[#8d7b68]"
                                >
                                    <option value="">Seleccioná una variante</option>
                                    {filteredVariantOptions.map((variant) => (
                                        <option key={variant.id} value={variant.id}>
                                            {variant.label}
                                        </option>
                                    ))}
                                </select>

                                <p className="text-xs text-[#6d7e8b]">
                                    {filteredVariantOptions.length} variante(s) encontradas para este producto.
                                </p>
                            </div>
                        ) : null}

                        <div className="grid gap-3 sm:grid-cols-2">
                            <select
                                value={form.upload_scope === 'variant' ? 'image' : form.media_type}
                                disabled={form.upload_scope === 'variant'}
                                onChange={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        media_type: e.target.value,
                                        image_url: '',
                                        bucket: '',
                                    }))
                                }
                                className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none disabled:bg-[#f3efe6] disabled:text-[#8d7b68]"
                            >
                                {form.upload_scope === 'variant' ? (
                                    <option value="image">Imagen</option>
                                ) : (
                                    <>
                                        <option value="image">Imagen</option>
                                        <option value="model">Modelo 3D</option>
                                    </>
                                )}
                            </select>

                            <select
                                value={form.upload_scope === 'variant' ? 'detail' : form.use_case}
                                disabled={form.upload_scope === 'variant'}
                                onChange={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        use_case: e.target.value,
                                        image_url: '',
                                        bucket: '',
                                    }))
                                }
                                className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none disabled:bg-[#f3efe6] disabled:text-[#8d7b68]"
                            >
                                {form.upload_scope === 'variant' ? (
                                    <option value="detail">Detail</option>
                                ) : (
                                    <>
                                        <option value="catalog">Catalog</option>
                                        <option value="gallery">Gallery</option>
                                        <option value="hero">Hero</option>
                                    </>
                                )}
                            </select>
                        </div>

                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[#d8cdb8] bg-[#faf6ee] px-4 py-5 text-sm font-semibold text-[#143047]">
                            <Upload className="h-4 w-4" />
                            {uploading ? 'Subiendo...' : form.media_type === 'model' ? 'Subir modelo 3D' : 'Subir imagen'}
                            <input
                                type="file"
                                className="hidden"
                                accept={form.media_type === 'model' ? '.glb,.gltf,model/gltf-binary,model/gltf+json' : 'image/*'}
                                onChange={(e) => uploadFile(e.target.files?.[0])}
                                disabled={uploading}
                            />
                        </label>

                        <input
                            type="text"
                            placeholder="URL generada o URL manual"
                            value={form.image_url}
                            onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
                            className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                        />

                        {form.image_url ? (
                            <div className="rounded-2xl bg-[#faf6ee] p-3 text-xs text-[#6d7e8b]">
                                Archivo: {getFileName(form.image_url)}
                            </div>
                        ) : null}

                        <input
                            type="text"
                            placeholder="Texto alternativo"
                            value={form.alt_text}
                            onChange={(e) => setForm((prev) => ({ ...prev, alt_text: e.target.value }))}
                            className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                        />

                        <input
                            type="number"
                            placeholder="Orden"
                            value={form.sort_order}
                            onChange={(e) =>
                                setForm((prev) => ({ ...prev, sort_order: Number(e.target.value || 0) }))
                            }
                            className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                        />

                        <label className="flex items-center gap-2 text-sm text-[#143047]">
                            <input
                                type="checkbox"
                                checked={form.is_primary}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, is_primary: e.target.checked }))
                                }
                            />
                            Principal para ese producto/tipo/uso
                        </label>

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="submit"
                                disabled={saving || uploading}
                                className="rounded-full bg-[#143047] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {editingId ? 'Guardar cambios' : 'Crear media'}
                            </button>

                            <button
                                type="button"
                                onClick={resetForm}
                                className="rounded-full border border-[#d8cdb8] bg-white px-5 py-3 text-sm font-semibold text-[#143047]"
                            >
                                Limpiar
                            </button>
                        </div>
                    </form>

                    <div className="space-y-4">
                        {loading ? (
                            <div className="rounded-3xl border border-[#d8cdb8] bg-white p-6 text-sm text-[#6d7e8b]">
                                Cargando media…
                            </div>
                        ) : filteredImages.length === 0 ? (
                            <div className="rounded-3xl border border-[#d8cdb8] bg-white p-6 text-sm text-[#6d7e8b]">
                                No hay media para los filtros aplicados.
                            </div>
                        ) : (
                            filteredImages.map((image) => (
                                <div
                                    key={image.id}
                                    className="rounded-3xl border border-[#d8cdb8] bg-white p-5 shadow-sm"
                                >
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div className="flex min-w-0 gap-4">
                                            {image.media_type === 'image' ? (
                                                <img
                                                    src={resolvePreviewUrl(image.image_url)}
                                                    alt={image.alt_text || 'Imagen'}
                                                    className="h-20 w-20 flex-shrink-0 rounded-2xl object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-[#faf6ee] text-xs font-bold text-[#6d7e8b]">
                                                    3D
                                                </div>
                                            )}

                                            <div className="min-w-0">
                                                <p className="font-bold text-[#143047]">
                                                    {image.products?.name || 'Producto'}
                                                </p>
                                                <p className="mt-1 text-xs font-semibold text-[#5e89a6]">
                                                    {image.variant_id
                                                        ? `Variante: ${image.product_variants?.name || image.product_variants?.sku || image.variant_id}`
                                                        : 'Imagen base del producto'}
                                                </p>
                                                <p className="mt-1 text-sm text-[#4e6475]">
                                                    Archivo: {getFileName(image.image_url) || '—'}
                                                </p>
                                                <p className="mt-1 text-xs text-[#6d7e8b]">
                                                    Tipo: {image.media_type} · Uso: {image.use_case || '—'} · Orden: {image.sort_order}
                                                </p>
                                                <p className="mt-1 text-xs text-[#6d7e8b]">
                                                    Alt: {image.alt_text || '—'}
                                                </p>
                                                {image.is_primary ? (
                                                    <span className="mt-2 inline-flex rounded-full bg-[#ecf8f4] px-3 py-1 text-xs font-semibold text-[#0f6d5f]">
                                                        Principal
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => selectImage(image)}
                                                className="rounded-full border border-[#d8cdb8] bg-white px-4 py-2 text-sm font-semibold text-[#143047]"
                                            >
                                                Editar
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => deleteImage(image)}
                                                className="inline-flex items-center gap-2 rounded-full border border-[#efc0b8] bg-white px-4 py-2 text-sm font-semibold text-[#b44a42]"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </main>
    )
}
