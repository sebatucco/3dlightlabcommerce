'use client'

import { useEffect, useMemo, useState } from 'react'
import { Power, RefreshCw, Search, Trash2 } from 'lucide-react'

const initialForm = {
    category_id: '',
    name: '',
    slug: '',
    short_description: '',
    description: '',
    price: 0,
    compare_at_price: '',
    sku: '',
    stock: 0,
    featured: false,
    active: true,
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

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
}

function formatMoney(value) {
    return `$ ${Number(value || 0).toLocaleString('es-AR')}`
}

export default function AdminProductosPage() {
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [form, setForm] = useState(initialForm)

    async function loadData() {
        try {
            setLoading(true)
            setError('')

            const [productsRes, categoriesRes] = await Promise.all([
                fetch('/api/admin/products', { cache: 'no-store' }),
                fetch('/api/admin/categories', { cache: 'no-store' }),
            ])

            const productsData = await productsRes.json().catch(() => [])
            const categoriesData = await categoriesRes.json().catch(() => [])

            if (!productsRes.ok) {
                throw new Error(productsData?.error || 'No se pudieron obtener los productos')
            }

            if (!categoriesRes.ok) {
                throw new Error(categoriesData?.error || 'No se pudieron obtener las categorías')
            }

            setProducts(Array.isArray(productsData) ? productsData : [])
            setCategories(Array.isArray(categoriesData) ? categoriesData : [])
        } catch (err) {
            setError(err.message || 'Error cargando productos')
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

    function selectProduct(product) {
        setEditingId(product.id)
        setForm({
            category_id: product.category_id || '',
            name: product.name || '',
            slug: product.slug || '',
            short_description: product.short_description || '',
            description: product.description || '',
            price: Number(product.price || 0),
            compare_at_price: product.compare_at_price == null ? '' : Number(product.compare_at_price),
            sku: product.sku || '',
            stock: Number(product.stock || 0),
            featured: Boolean(product.featured),
            active: Boolean(product.active),
        })
    }

    async function submitForm(e) {
        e.preventDefault()

        try {
            setSaving(true)
            setError('')
            setMessage('')

            const payload = {
                category_id: form.category_id || null,
                name: String(form.name || '').trim(),
                slug: normalizeSlug(form.slug || form.name || ''),
                short_description: String(form.short_description || '').trim(),
                description: String(form.description || '').trim(),
                price: Number(form.price || 0),
                compare_at_price:
                    form.compare_at_price === '' || form.compare_at_price == null
                        ? null
                        : Number(form.compare_at_price),
                sku: String(form.sku || '').trim().toUpperCase(),
                stock: Number(form.stock || 0),
                featured: form.featured === true,
                active: form.active !== false,
            }

            if (!payload.name) {
                throw new Error('El producto necesita nombre')
            }

            if (!payload.slug) {
                throw new Error('El producto necesita slug válido')
            }

            const endpoint = editingId
                ? `/api/admin/products/${editingId}`
                : '/api/admin/products'

            const method = editingId ? 'PUT' : 'POST'

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const data = await response.json().catch(() => ({}))

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo guardar el producto')
            }

            setMessage(editingId ? 'Producto actualizado' : 'Producto creado')
            resetForm()
            await loadData()
        } catch (err) {
            setError(err.message || 'Error guardando producto')
        } finally {
            setSaving(false)
        }
    }

    async function toggleActive(product) {
        try {
            setError('')
            setMessage('')

            const response = await fetch(`/api/admin/products/${product.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category_id: product.category_id || null,
                    name: product.name || '',
                    slug: product.slug || '',
                    short_description: product.short_description || '',
                    description: product.description || '',
                    price: Number(product.price || 0),
                    compare_at_price: product.compare_at_price,
                    sku: product.sku || '',
                    stock: Number(product.stock || 0),
                    featured: Boolean(product.featured),
                    active: !product.active,
                }),
            })

            const data = await response.json().catch(() => ({}))

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo actualizar el estado')
            }

            setMessage(product.active ? 'Producto desactivado' : 'Producto activado')
            await loadData()
        } catch (err) {
            setError(err.message || 'Error actualizando estado')
        }
    }

    async function deleteProduct(product) {
        const ok = window.confirm(`¿Dar de baja el producto "${product.name}"?`)
        if (!ok) return

        try {
            setError('')
            setMessage('')

            const response = await fetch(`/api/admin/products/${product.id}`, {
                method: 'DELETE',
            })

            const data = await response.json().catch(() => ({}))

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo eliminar el producto')
            }

            setMessage('Producto dado de baja')
            if (editingId === product.id) {
                resetForm()
            }
            await loadData()
        } catch (err) {
            setError(err.message || 'Error eliminando producto')
        }
    }

    const filteredProducts = useMemo(() => {
        const term = normalizeText(searchTerm)
        if (!term) return products

        return products.filter((product) => {
            const haystack = normalizeText(
                [
                    product.name,
                    product.slug,
                    product.sku,
                    product.categories?.name,
                ]
                    .filter(Boolean)
                    .join(' ')
            )
            return haystack.includes(term)
        })
    }, [products, searchTerm])

    return (
        <main className="min-h-screen bg-[#f5efe3] text-[#143047]">
            <div className="container mx-auto px-4 py-10">
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5e89a6]">
                            Administración
                        </p>
                        <h1 className="mt-2 text-4xl font-extrabold">Productos</h1>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => (window.location.href = '/admin')}
                            className="inline-flex items-center gap-2 rounded-full border border-[#d8cdb8] bg-white px-5 py-3 text-sm font-semibold text-[#143047] hover:bg-[#f8f3ea]"
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

                <div className="mb-6 rounded-3xl border border-[#d8cdb8] bg-white p-5 shadow-sm">
                    <label className="flex items-center gap-3 rounded-2xl border border-[#e7dbc7] bg-[#faf6ee] px-4 py-3">
                        <Search className="h-4 w-4 text-[#5e89a6]" />
                        <input
                            type="text"
                            placeholder="Filtrar por nombre o SKU"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-transparent text-sm outline-none"
                        />
                    </label>
                </div>

                <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                    <form
                        onSubmit={submitForm}
                        className="space-y-4 rounded-3xl border border-[#d8cdb8] bg-white p-6 shadow-sm"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-bold text-[#143047]">
                                    {editingId ? 'Editar producto' : 'Agregar producto'}
                                </h2>
                                <p className="mt-1 text-sm text-[#6d7e8b]">
                                    Completá el formulario para agregar un producto nuevo o seleccioná uno existente para editarlo.
                                </p>
                            </div>

                            <span className="rounded-full bg-[#f8f3ea] px-3 py-1 text-xs font-semibold text-[#143047]">
                                {editingId ? 'Modo edición' : 'Modo alta'}
                            </span>
                        </div>

                        <select
                            value={form.category_id}
                            onChange={(e) => setForm((prev) => ({ ...prev, category_id: e.target.value }))}
                            className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                        >
                            <option value="">Sin categoría</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>

                        <input
                            type="text"
                            placeholder="Nombre"
                            value={form.name}
                            onChange={(e) =>
                                setForm((prev) => {
                                    const nextName = e.target.value
                                    const shouldAutofillSlug =
                                        !prev.slug || prev.slug === normalizeSlug(prev.name || '')
                                    return {
                                        ...prev,
                                        name: nextName,
                                        slug: shouldAutofillSlug ? normalizeSlug(nextName) : prev.slug,
                                    }
                                })
                            }
                            className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                        />

                        <input
                            type="text"
                            placeholder="Slug"
                            value={form.slug}
                            onChange={(e) =>
                                setForm((prev) => ({ ...prev, slug: normalizeSlug(e.target.value) }))
                            }
                            className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                        />

                        <div className="rounded-2xl border border-[#d8cdb8] bg-[#faf6ee] px-4 py-3 text-sm">
                            {editingId ? (
                                <>
                                    <span className="block text-xs text-[#6d7e8b]">SKU</span>
                                    <span className="font-semibold text-[#143047]">
                                        {form.sku || '—'}
                                    </span>
                                </>
                            ) : (
                                <span className="text-[#6d7e8b]">
                                    El SKU se generará automáticamente al crear el producto
                                </span>
                            )}
                        </div>

                        <input
                            type="text"
                            placeholder="Descripción corta"
                            value={form.short_description}
                            onChange={(e) =>
                                setForm((prev) => ({ ...prev, short_description: e.target.value }))
                            }
                            className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                        />

                        <textarea
                            placeholder="Descripción completa"
                            value={form.description}
                            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                            className="min-h-[110px] w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                        />

                        <div className="grid gap-3 sm:grid-cols-2">
                            <input
                                type="number"
                                placeholder="Precio"
                                value={form.price}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, price: Number(e.target.value || 0) }))
                                }
                                className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                            />

                            <input
                                type="number"
                                placeholder="Precio tachado"
                                value={form.compare_at_price}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, compare_at_price: e.target.value }))
                                }
                                className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                            />

                            <input
                                type="number"
                                placeholder="Stock"
                                value={form.stock}
                                onChange={(e) =>
                                    setForm((prev) => ({ ...prev, stock: Number(e.target.value || 0) }))
                                }
                                className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                            />
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-[#143047]">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={form.featured}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, featured: e.target.checked }))
                                    }
                                />
                                Destacado
                            </label>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={form.active}
                                    onChange={(e) =>
                                        setForm((prev) => ({ ...prev, active: e.target.checked }))
                                    }
                                />
                                Activo
                            </label>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="submit"
                                disabled={saving}
                                className="rounded-full bg-[#143047] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {editingId ? 'Guardar cambios' : 'Crear producto'}
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
                                Cargando productos…
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="rounded-3xl border border-[#d8cdb8] bg-white p-6 text-sm text-[#6d7e8b]">
                                No hay productos para los filtros aplicados.
                            </div>
                        ) : (
                            filteredProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className="rounded-3xl border border-[#d8cdb8] bg-white p-5 shadow-sm"
                                >
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-lg font-bold text-[#143047]">{product.name}</p>
                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${product.active
                                                        ? 'bg-[#ecf8f4] text-[#0f6d5f]'
                                                        : 'bg-[#fff1ef] text-[#b44a42]'
                                                        }`}
                                                >
                                                    {product.active ? 'Activo' : 'Inactivo'}
                                                </span>

                                                {product.featured ? (
                                                    <span className="rounded-full bg-[#eef4f8] px-3 py-1 text-xs font-semibold text-[#143047]">
                                                        Destacado
                                                    </span>
                                                ) : null}
                                            </div>

                                            <p className="mt-2 text-sm text-[#4e6475]">SKU: {product.sku || '—'}</p>
                                            <p className="mt-1 text-sm text-[#4e6475]">
                                                Categoría: {product.categories?.name || 'Sin categoría'}
                                            </p>
                                            <p className="mt-1 text-sm text-[#4e6475]">
                                                Precio: {formatMoney(product.price)}
                                            </p>
                                            <p className="mt-1 text-sm text-[#4e6475]">Stock: {product.stock ?? 0}</p>
                                            <p className="mt-2 text-sm text-[#6d7e8b]">
                                                {product.short_description || 'Sin descripción corta'}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => selectProduct(product)}
                                                className="rounded-full border border-[#d8cdb8] bg-white px-4 py-2 text-sm font-semibold text-[#143047]"
                                            >
                                                Editar
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => toggleActive(product)}
                                                className="inline-flex items-center gap-2 rounded-full border border-[#d8cdb8] bg-white px-4 py-2 text-sm font-semibold text-[#143047]"
                                            >
                                                <Power className="h-4 w-4" />
                                                {product.active ? 'Desactivar' : 'Activar'}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => deleteProduct(product)}
                                                className="inline-flex items-center gap-2 rounded-full border border-[#efc0b8] bg-white px-4 py-2 text-sm font-semibold text-[#b44a42]"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Baja lógica
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