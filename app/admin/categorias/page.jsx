'use client'

import { useEffect, useMemo, useState } from 'react'
import { Power, RefreshCw, Search, Trash2 } from 'lucide-react'

const initialForm = {
    name: '',
    slug: '',
    description: '',
    sku_prefix: '',
    sort_order: 0,
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

function normalizeSkuPrefix(value) {
    return String(value || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 10)
}

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
}

export default function AdminCategoriasPage() {
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [form, setForm] = useState(initialForm)

    async function loadCategories() {
        try {
            setLoading(true)
            setError('')

            const response = await fetch('/api/admin/categories', { cache: 'no-store' })
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudieron obtener las categorías')
            }

            setCategories(Array.isArray(data) ? data : [])
        } catch (err) {
            setError(err.message || 'Error cargando categorías')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadCategories()
    }, [])

    function resetForm() {
        setForm(initialForm)
        setEditingId(null)
    }

    function selectCategory(category) {
        setEditingId(category.id)
        setForm({
            name: category.name || '',
            slug: category.slug || '',
            description: category.description || '',
            sku_prefix: category.sku_prefix || '',
            sort_order: Number(category.sort_order || 0),
            active: category.active !== false,
        })
    }

    async function submitForm(e) {
        e.preventDefault()

        try {
            setSaving(true)
            setError('')
            setMessage('')

            const payload = {
                name: String(form.name || '').trim(),
                slug: normalizeSlug(form.slug || form.name || ''),
                description: String(form.description || '').trim(),
                sku_prefix: normalizeSkuPrefix(form.sku_prefix || ''),
                sort_order: Number(form.sort_order || 0),
                active: form.active !== false,
            }

            if (!payload.name) {
                throw new Error('La categoría necesita nombre')
            }

            if (!payload.slug) {
                throw new Error('La categoría necesita slug válido')
            }

            const endpoint = editingId
                ? `/api/admin/categories/${editingId}`
                : '/api/admin/categories'

            const method = editingId ? 'PUT' : 'POST'

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const data = await response.json().catch(() => ({}))

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo guardar la categoría')
            }

            setMessage(editingId ? 'Categoría actualizada' : 'Categoría creada')
            resetForm()
            await loadCategories()
        } catch (err) {
            setError(err.message || 'Error guardando categoría')
        } finally {
            setSaving(false)
        }
    }

    async function toggleActive(category) {
        try {
            setError('')
            setMessage('')

            const response = await fetch(`/api/admin/categories/${category.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: category.name,
                    slug: category.slug,
                    description: category.description || '',
                    sku_prefix: category.sku_prefix || '',
                    sort_order: Number(category.sort_order || 0),
                    active: !category.active,
                }),
            })

            const data = await response.json().catch(() => ({}))

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo actualizar el estado')
            }

            setMessage(category.active ? 'Categoría desactivada' : 'Categoría activada')
            await loadCategories()
        } catch (err) {
            setError(err.message || 'Error actualizando estado')
        }
    }

    async function deleteCategory(category) {
        const ok = window.confirm(`¿Dar de baja la categoría "${category.name}"?`)
        if (!ok) return

        try {
            setError('')
            setMessage('')

            const response = await fetch(`/api/admin/categories/${category.id}`, {
                method: 'DELETE',
            })

            const data = await response.json().catch(() => ({}))

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo eliminar la categoría')
            }

            setMessage('Categoría dada de baja')
            if (editingId === category.id) {
                resetForm()
            }
            await loadCategories()
        } catch (err) {
            setError(err.message || 'Error eliminando categoría')
        }
    }

    const filteredCategories = useMemo(() => {
        const term = normalizeText(searchTerm)
        if (!term) return categories

        return categories.filter((category) => {
            const haystack = normalizeText(
                [category.name, category.slug, category.sku_prefix].filter(Boolean).join(' ')
            )
            return haystack.includes(term)
        })
    }, [categories, searchTerm])

    return (
        <main className="min-h-screen bg-[#f5efe3] text-[#143047]">
            <div className="container mx-auto px-4 py-10">
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5e89a6]">
                            Administración
                        </p>
                        <h1 className="mt-2 text-4xl font-extrabold">Categorías</h1>
                    </div>

                    <button
                        type="button"
                        onClick={loadCategories}
                        className="inline-flex items-center gap-2 rounded-full border border-[#d8cdb8] bg-white px-5 py-3 text-sm font-semibold text-[#143047] hover:bg-[#f8f3ea]"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Actualizar
                    </button>
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
                            placeholder="Filtrar por nombre o prefijo SKU"
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
                                    {editingId ? 'Editar categoría' : 'Agregar categoría'}
                                </h2>
                                <p className="mt-1 text-sm text-[#6d7e8b]">
                                    Completá el formulario para agregar una categoría nueva o seleccioná una existente para editarla.
                                </p>
                            </div>

                            <span className="rounded-full bg-[#f8f3ea] px-3 py-1 text-xs font-semibold text-[#143047]">
                                {editingId ? 'Modo edición' : 'Modo alta'}
                            </span>
                        </div>

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

                        <input
                            type="text"
                            placeholder="Prefijo SKU"
                            value={form.sku_prefix}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    sku_prefix: normalizeSkuPrefix(e.target.value),
                                }))
                            }
                            className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm uppercase outline-none"
                        />

                        <textarea
                            placeholder="Descripción"
                            value={form.description}
                            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                            className="min-h-[110px] w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
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
                                checked={form.active}
                                onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                            />
                            Activa
                        </label>

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="submit"
                                disabled={saving}
                                className="rounded-full bg-[#143047] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {editingId ? 'Guardar cambios' : 'Crear categoría'}
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
                                Cargando categorías…
                            </div>
                        ) : filteredCategories.length === 0 ? (
                            <div className="rounded-3xl border border-[#d8cdb8] bg-white p-6 text-sm text-[#6d7e8b]">
                                No hay categorías para los filtros aplicados.
                            </div>
                        ) : (
                            filteredCategories.map((category) => (
                                <div
                                    key={category.id}
                                    className="rounded-3xl border border-[#d8cdb8] bg-white p-5 shadow-sm"
                                >
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-lg font-bold text-[#143047]">{category.name}</p>
                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${category.active
                                                            ? 'bg-[#ecf8f4] text-[#0f6d5f]'
                                                            : 'bg-[#fff1ef] text-[#b44a42]'
                                                        }`}
                                                >
                                                    {category.active ? 'Activa' : 'Inactiva'}
                                                </span>
                                            </div>

                                            <p className="mt-2 text-sm text-[#4e6475]">Slug: {category.slug}</p>
                                            <p className="mt-1 text-sm text-[#4e6475]">
                                                Prefijo SKU: {category.sku_prefix || '—'}
                                            </p>
                                            <p className="mt-1 text-sm text-[#4e6475]">
                                                Orden: {category.sort_order ?? 0}
                                            </p>
                                            <p className="mt-2 text-sm text-[#6d7e8b]">
                                                {category.description || 'Sin descripción'}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => selectCategory(category)}
                                                className="rounded-full border border-[#d8cdb8] bg-white px-4 py-2 text-sm font-semibold text-[#143047]"
                                            >
                                                Editar
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => toggleActive(category)}
                                                className="inline-flex items-center gap-2 rounded-full border border-[#d8cdb8] bg-white px-4 py-2 text-sm font-semibold text-[#143047]"
                                            >
                                                <Power className="h-4 w-4" />
                                                {category.active ? 'Desactivar' : 'Activar'}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => deleteCategory(category)}
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