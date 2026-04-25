'use client'

import { useEffect, useMemo, useState } from 'react'
import { Power, RefreshCw, Search, Trash2 } from 'lucide-react'

const initialOptionForm = {
    name: '',
    slug: '',
    required: false,
    visible_on_product: true,
    visible_on_order: true,
    sort_order: 0,
    active: true,
}

const initialValueForm = {
    option_id: '',
    value: '',
    slug: '',
    sort_order: 0,
    active: true,
}

const initialVariantForm = {
    sku: '',
    name: '',
    price: '',
    compare_at_price: '',
    stock: 0,
    active: true,
    option_values: [],
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
    if (value == null || value === '') return '—'
    return `$ ${Number(value || 0).toLocaleString('es-AR')}`
}

function optionValueLabel(row) {
    const optionName = row?.product_options?.name || 'Opción'
    const value = row?.product_option_values?.value || 'Valor'
    return `${optionName}: ${value}`
}

export default function AdminVariantesPage() {
    const [products, setProducts] = useState([])
    const [selectedProductId, setSelectedProductId] = useState('')
    const [options, setOptions] = useState([])
    const [values, setValues] = useState([])
    const [variants, setVariants] = useState([])

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')

    const [optionForm, setOptionForm] = useState(initialOptionForm)
    const [valueForm, setValueForm] = useState(initialValueForm)
    const [variantForm, setVariantForm] = useState(initialVariantForm)

    const [editingOptionId, setEditingOptionId] = useState(null)
    const [editingValueId, setEditingValueId] = useState(null)
    const [editingVariantId, setEditingVariantId] = useState(null)

    const [variantSearch, setVariantSearch] = useState('')

    const selectedProduct = useMemo(
        () => products.find((product) => product.id === selectedProductId) || null,
        [products, selectedProductId]
    )

    async function loadProducts() {
        const response = await fetch('/api/admin/products', { cache: 'no-store' })
        const data = await response.json().catch(() => [])

        if (!response.ok) {
            throw new Error(data?.error || 'No se pudieron obtener los productos')
        }

        setProducts(Array.isArray(data) ? data : [])

        if (!selectedProductId && Array.isArray(data) && data.length > 0) {
            setSelectedProductId(data[0].id)
        }
    }

    async function loadProductConfig(productId) {
        if (!productId) {
            setOptions([])
            setValues([])
            setVariants([])
            return
        }

        const [optionsRes, variantsRes] = await Promise.all([
            fetch(`/api/admin/product-options?product_id=${productId}`, { cache: 'no-store' }),
            fetch(`/api/admin/product-variants?product_id=${productId}`, { cache: 'no-store' }),
        ])

        const optionsData = await optionsRes.json().catch(() => [])
        const variantsData = await variantsRes.json().catch(() => [])

        if (!optionsRes.ok) {
            throw new Error(optionsData?.error || 'No se pudieron obtener las opciones')
        }

        if (!variantsRes.ok) {
            throw new Error(variantsData?.error || 'No se pudieron obtener las variantes')
        }

        const normalizedOptions = Array.isArray(optionsData) ? optionsData : []
        setOptions(normalizedOptions)
        setVariants(Array.isArray(variantsData) ? variantsData : [])

        const allValues = normalizedOptions.flatMap((option) =>
            Array.isArray(option.product_option_values)
                ? option.product_option_values.map((value) => ({
                    ...value,
                    option_name: option.name,
                    option_slug: option.slug,
                }))
                : []
        )

        setValues(allValues)
    }

    async function loadAll(productId = selectedProductId) {
        try {
            setLoading(true)
            setError('')
            await loadProducts()
            if (productId) {
                await loadProductConfig(productId)
            }
        } catch (err) {
            setError(err.message || 'Error cargando variantes')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadAll()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (selectedProductId) {
            loadProductConfig(selectedProductId).catch((err) =>
                setError(err.message || 'Error cargando configuración del producto')
            )
            resetForms(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProductId])

    function resetForms(clearMessage = true) {
        setOptionForm(initialOptionForm)
        setValueForm(initialValueForm)
        setVariantForm(initialVariantForm)
        setEditingOptionId(null)
        setEditingValueId(null)
        setEditingVariantId(null)
        if (clearMessage) {
            setError('')
            setMessage('')
        }
    }

    function resetOptionForm() {
        setOptionForm(initialOptionForm)
        setEditingOptionId(null)
    }

    function resetValueForm() {
        setValueForm(initialValueForm)
        setEditingValueId(null)
    }

    function resetVariantForm() {
        setVariantForm(initialVariantForm)
        setEditingVariantId(null)
    }

    function selectOption(option) {
        setEditingOptionId(option.id)
        setOptionForm({
            name: option.name || '',
            slug: option.slug || '',
            required: Boolean(option.required),
            visible_on_product: option.visible_on_product !== false,
            visible_on_order: option.visible_on_order !== false,
            sort_order: Number(option.sort_order || 0),
            active: option.active !== false,
        })
    }

    function selectValue(value) {
        setEditingValueId(value.id)
        setValueForm({
            option_id: value.option_id || '',
            value: value.value || '',
            slug: value.slug || '',
            sort_order: Number(value.sort_order || 0),
            active: value.active !== false,
        })
    }

    function selectVariant(variant) {
        setEditingVariantId(variant.id)

        const selectedOptionValues = Array.isArray(variant.product_variant_option_values)
            ? variant.product_variant_option_values.map((row) => ({
                option_id: row.option_id,
                option_value_id: row.option_value_id,
            }))
            : []

        setVariantForm({
            sku: variant.sku || '',
            name: variant.name || '',
            price: variant.price == null ? '' : Number(variant.price),
            compare_at_price: variant.compare_at_price == null ? '' : Number(variant.compare_at_price),
            stock: Number(variant.stock || 0),
            active: variant.active !== false,
            option_values: selectedOptionValues,
        })
    }

    async function submitOption(event) {
        event.preventDefault()

        try {
            setSaving(true)
            setError('')
            setMessage('')

            if (!selectedProductId) throw new Error('Seleccioná un producto')

            const payload = {
                product_id: selectedProductId,
                name: String(optionForm.name || '').trim(),
                slug: normalizeSlug(optionForm.slug || optionForm.name || ''),
                required: Boolean(optionForm.required),
                visible_on_product: optionForm.visible_on_product !== false,
                visible_on_order: optionForm.visible_on_order !== false,
                sort_order: Number(optionForm.sort_order || 0),
                active: optionForm.active !== false,
            }

            const endpoint = editingOptionId
                ? `/api/admin/product-options/${editingOptionId}`
                : '/api/admin/product-options'

            const method = editingOptionId ? 'PUT' : 'POST'

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(data?.error || 'No se pudo guardar la opción')

            setMessage(editingOptionId ? 'Opción actualizada' : 'Opción creada')
            resetOptionForm()
            await loadProductConfig(selectedProductId)
        } catch (err) {
            setError(err.message || 'Error guardando opción')
        } finally {
            setSaving(false)
        }
    }

    async function submitValue(event) {
        event.preventDefault()

        try {
            setSaving(true)
            setError('')
            setMessage('')

            const payload = {
                option_id: valueForm.option_id,
                value: String(valueForm.value || '').trim(),
                slug: normalizeSlug(valueForm.slug || valueForm.value || ''),
                sort_order: Number(valueForm.sort_order || 0),
                active: valueForm.active !== false,
            }

            const endpoint = editingValueId
                ? `/api/admin/product-option-values/${editingValueId}`
                : '/api/admin/product-option-values'

            const method = editingValueId ? 'PUT' : 'POST'

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(data?.error || 'No se pudo guardar el valor')

            setMessage(editingValueId ? 'Valor actualizado' : 'Valor creado')
            resetValueForm()
            await loadProductConfig(selectedProductId)
        } catch (err) {
            setError(err.message || 'Error guardando valor')
        } finally {
            setSaving(false)
        }
    }

    async function submitVariant(event) {
        event.preventDefault()

        try {
            setSaving(true)
            setError('')
            setMessage('')

            if (!selectedProductId) throw new Error('Seleccioná un producto')

            const payload = {
                product_id: selectedProductId,
                sku: String(variantForm.sku || '').trim().toUpperCase(),
                name: String(variantForm.name || '').trim() || null,
                price: variantForm.price === '' ? null : Number(variantForm.price),
                compare_at_price:
                    variantForm.compare_at_price === '' ? null : Number(variantForm.compare_at_price),
                stock: Number(variantForm.stock || 0),
                active: variantForm.active !== false,
                option_values: variantForm.option_values,
            }

            const endpoint = editingVariantId
                ? `/api/admin/product-variants/${editingVariantId}`
                : '/api/admin/product-variants'

            const method = editingVariantId ? 'PUT' : 'POST'

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const data = await response.json().catch(() => ({}))
            if (!response.ok) throw new Error(data?.error || 'No se pudo guardar la variante')

            setMessage(editingVariantId ? 'Variante actualizada' : 'Variante creada')
            resetVariantForm()
            await loadProductConfig(selectedProductId)
        } catch (err) {
            setError(err.message || 'Error guardando variante')
        } finally {
            setSaving(false)
        }
    }

    async function deleteRow(url, label, afterDelete) {
        const ok = window.confirm(`¿Dar de baja ${label}?`)
        if (!ok) return

        try {
            setError('')
            setMessage('')

            const response = await fetch(url, { method: 'DELETE' })
            const data = await response.json().catch(() => ({}))

            if (!response.ok) throw new Error(data?.error || 'No se pudo eliminar')

            setMessage('Baja lógica realizada')
            afterDelete?.()
            await loadProductConfig(selectedProductId)
        } catch (err) {
            setError(err.message || 'Error eliminando')
        }
    }

    function setVariantOptionValue(optionId, valueId) {
        setVariantForm((prev) => {
            const withoutOption = prev.option_values.filter((item) => item.option_id !== optionId)

            if (!valueId) {
                return {
                    ...prev,
                    option_values: withoutOption,
                }
            }

            return {
                ...prev,
                option_values: [
                    ...withoutOption,
                    {
                        option_id: optionId,
                        option_value_id: valueId,
                    },
                ],
            }
        })
    }

    function getSelectedValueForOption(optionId) {
        const found = variantForm.option_values.find((item) => item.option_id === optionId)
        return found?.option_value_id || ''
    }

    const filteredVariants = useMemo(() => {
        const term = normalizeText(variantSearch)
        if (!term) return variants

        return variants.filter((variant) => {
            const optionsLabel = Array.isArray(variant.product_variant_option_values)
                ? variant.product_variant_option_values.map(optionValueLabel).join(' ')
                : ''

            const haystack = normalizeText([variant.sku, variant.name, optionsLabel].join(' '))
            return haystack.includes(term)
        })
    }, [variants, variantSearch])

    return (
        <main className="min-h-screen bg-[#f5efe3] text-[#143047]">
            <div className="container mx-auto px-4 py-10">
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5e89a6]">
                            Administración
                        </p>
                        <h1 className="mt-2 text-4xl font-extrabold">Variantes de productos</h1>
                        <p className="mt-2 max-w-2xl text-sm text-[#6d7e8b]">
                            Configurá opciones como color, talle, material o tipo de luz y creá variantes con SKU,
                            stock y precio propio.
                        </p>
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
                            onClick={() => loadAll(selectedProductId)}
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
                    <label className="mb-2 block text-sm font-semibold text-[#143047]">
                        Producto a configurar
                    </label>
                    <select
                        value={selectedProductId}
                        onChange={(event) => setSelectedProductId(event.target.value)}
                        className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                    >
                        <option value="">Seleccioná un producto</option>
                        {products.map((product) => (
                            <option key={product.id} value={product.id}>
                                {product.name} {product.sku ? `· ${product.sku}` : ''}
                            </option>
                        ))}
                    </select>

                    {selectedProduct ? (
                        <p className="mt-3 text-sm text-[#6d7e8b]">
                            Producto seleccionado: <b>{selectedProduct.name}</b>
                        </p>
                    ) : null}
                </div>

                {loading ? (
                    <div className="rounded-3xl border border-[#d8cdb8] bg-white p-6 text-sm text-[#6d7e8b]">
                        Cargando configuración…
                    </div>
                ) : !selectedProductId ? (
                    <div className="rounded-3xl border border-[#d8cdb8] bg-white p-6 text-sm text-[#6d7e8b]">
                        Seleccioná un producto para configurar sus variantes.
                    </div>
                ) : (
                    <div className="space-y-8">
                        <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                            <form
                                onSubmit={submitOption}
                                className="space-y-4 rounded-3xl border border-[#d8cdb8] bg-white p-6 shadow-sm"
                            >
                                <div>
                                    <h2 className="text-xl font-bold">
                                        {editingOptionId ? 'Editar opción' : 'Agregar opción'}
                                    </h2>
                                    <p className="mt-1 text-sm text-[#6d7e8b]">
                                        Ejemplo: Color, Talle, Material, Tipo de luz.
                                    </p>
                                </div>

                                <input
                                    type="text"
                                    placeholder="Nombre de opción"
                                    value={optionForm.name}
                                    onChange={(event) =>
                                        setOptionForm((prev) => ({
                                            ...prev,
                                            name: event.target.value,
                                            slug:
                                                !prev.slug || prev.slug === normalizeSlug(prev.name)
                                                    ? normalizeSlug(event.target.value)
                                                    : prev.slug,
                                        }))
                                    }
                                    className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                                />

                                <input
                                    type="text"
                                    placeholder="Slug"
                                    value={optionForm.slug}
                                    onChange={(event) =>
                                        setOptionForm((prev) => ({
                                            ...prev,
                                            slug: normalizeSlug(event.target.value),
                                        }))
                                    }
                                    className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                                />

                                <input
                                    type="number"
                                    placeholder="Orden"
                                    value={optionForm.sort_order}
                                    onChange={(event) =>
                                        setOptionForm((prev) => ({
                                            ...prev,
                                            sort_order: Number(event.target.value || 0),
                                        }))
                                    }
                                    className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                                />

                                <div className="grid gap-2 text-sm">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={optionForm.required}
                                            onChange={(event) =>
                                                setOptionForm((prev) => ({
                                                    ...prev,
                                                    required: event.target.checked,
                                                }))
                                            }
                                        />
                                        Obligatoria
                                    </label>

                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={optionForm.visible_on_product}
                                            onChange={(event) =>
                                                setOptionForm((prev) => ({
                                                    ...prev,
                                                    visible_on_product: event.target.checked,
                                                }))
                                            }
                                        />
                                        Visible en producto
                                    </label>

                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={optionForm.visible_on_order}
                                            onChange={(event) =>
                                                setOptionForm((prev) => ({
                                                    ...prev,
                                                    visible_on_order: event.target.checked,
                                                }))
                                            }
                                        />
                                        Visible en pedido
                                    </label>

                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={optionForm.active}
                                            onChange={(event) =>
                                                setOptionForm((prev) => ({
                                                    ...prev,
                                                    active: event.target.checked,
                                                }))
                                            }
                                        />
                                        Activa
                                    </label>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        disabled={saving}
                                        className="rounded-full bg-[#143047] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                                    >
                                        {editingOptionId ? 'Guardar opción' : 'Crear opción'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={resetOptionForm}
                                        className="rounded-full border border-[#d8cdb8] bg-white px-5 py-3 text-sm font-semibold"
                                    >
                                        Limpiar
                                    </button>
                                </div>
                            </form>

                            <div className="space-y-3">
                                {options.length === 0 ? (
                                    <div className="rounded-3xl border border-[#d8cdb8] bg-white p-6 text-sm text-[#6d7e8b]">
                                        Todavía no hay opciones para este producto.
                                    </div>
                                ) : (
                                    options.map((option) => (
                                        <div key={option.id} className="rounded-3xl border border-[#d8cdb8] bg-white p-5">
                                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                                <div>
                                                    <p className="text-lg font-bold">{option.name}</p>
                                                    <p className="mt-1 text-sm text-[#6d7e8b]">Slug: {option.slug}</p>
                                                    <p className="mt-1 text-xs text-[#6d7e8b]">
                                                        {option.required ? 'Obligatoria' : 'Opcional'} · Producto:{' '}
                                                        {option.visible_on_product ? 'visible' : 'oculta'} · Pedido:{' '}
                                                        {option.visible_on_order ? 'visible' : 'oculta'}
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => selectOption(option)}
                                                        className="rounded-full border border-[#d8cdb8] px-4 py-2 text-sm font-semibold"
                                                    >
                                                        Editar
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            deleteRow(
                                                                `/api/admin/product-options/${option.id}`,
                                                                `la opción "${option.name}"`,
                                                                resetOptionForm
                                                            )
                                                        }
                                                        className="inline-flex items-center gap-2 rounded-full border border-[#efc0b8] px-4 py-2 text-sm font-semibold text-[#b34f42]"
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
                        </section>

                        <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                            <form
                                onSubmit={submitValue}
                                className="space-y-4 rounded-3xl border border-[#d8cdb8] bg-white p-6 shadow-sm"
                            >
                                <div>
                                    <h2 className="text-xl font-bold">
                                        {editingValueId ? 'Editar valor' : 'Agregar valor'}
                                    </h2>
                                    <p className="mt-1 text-sm text-[#6d7e8b]">
                                        Ejemplo: Blanco, Negro, PLA, PETG, S, M, L.
                                    </p>
                                </div>

                                <select
                                    value={valueForm.option_id}
                                    onChange={(event) =>
                                        setValueForm((prev) => ({
                                            ...prev,
                                            option_id: event.target.value,
                                        }))
                                    }
                                    className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                                >
                                    <option value="">Seleccioná una opción</option>
                                    {options.map((option) => (
                                        <option key={option.id} value={option.id}>
                                            {option.name}
                                        </option>
                                    ))}
                                </select>

                                <input
                                    type="text"
                                    placeholder="Valor"
                                    value={valueForm.value}
                                    onChange={(event) =>
                                        setValueForm((prev) => ({
                                            ...prev,
                                            value: event.target.value,
                                            slug:
                                                !prev.slug || prev.slug === normalizeSlug(prev.value)
                                                    ? normalizeSlug(event.target.value)
                                                    : prev.slug,
                                        }))
                                    }
                                    className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                                />

                                <input
                                    type="text"
                                    placeholder="Slug"
                                    value={valueForm.slug}
                                    onChange={(event) =>
                                        setValueForm((prev) => ({
                                            ...prev,
                                            slug: normalizeSlug(event.target.value),
                                        }))
                                    }
                                    className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                                />

                                <input
                                    type="number"
                                    placeholder="Orden"
                                    value={valueForm.sort_order}
                                    onChange={(event) =>
                                        setValueForm((prev) => ({
                                            ...prev,
                                            sort_order: Number(event.target.value || 0),
                                        }))
                                    }
                                    className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                                />

                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={valueForm.active}
                                        onChange={(event) =>
                                            setValueForm((prev) => ({
                                                ...prev,
                                                active: event.target.checked,
                                            }))
                                        }
                                    />
                                    Activo
                                </label>

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        disabled={saving}
                                        className="rounded-full bg-[#143047] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                                    >
                                        {editingValueId ? 'Guardar valor' : 'Crear valor'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={resetValueForm}
                                        className="rounded-full border border-[#d8cdb8] bg-white px-5 py-3 text-sm font-semibold"
                                    >
                                        Limpiar
                                    </button>
                                </div>
                            </form>

                            <div className="space-y-3">
                                {values.length === 0 ? (
                                    <div className="rounded-3xl border border-[#d8cdb8] bg-white p-6 text-sm text-[#6d7e8b]">
                                        Todavía no hay valores para este producto.
                                    </div>
                                ) : (
                                    values.map((value) => (
                                        <div key={value.id} className="rounded-3xl border border-[#d8cdb8] bg-white p-5">
                                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                                <div>
                                                    <p className="text-lg font-bold">{value.value}</p>
                                                    <p className="mt-1 text-sm text-[#6d7e8b]">
                                                        Opción: {value.option_name || '—'}
                                                    </p>
                                                    <p className="mt-1 text-xs text-[#6d7e8b]">Slug: {value.slug}</p>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => selectValue(value)}
                                                        className="rounded-full border border-[#d8cdb8] px-4 py-2 text-sm font-semibold"
                                                    >
                                                        Editar
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            deleteRow(
                                                                `/api/admin/product-option-values/${value.id}`,
                                                                `el valor "${value.value}"`,
                                                                resetValueForm
                                                            )
                                                        }
                                                        className="inline-flex items-center gap-2 rounded-full border border-[#efc0b8] px-4 py-2 text-sm font-semibold text-[#b34f42]"
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
                        </section>

                        <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                            <form
                                onSubmit={submitVariant}
                                className="space-y-4 rounded-3xl border border-[#d8cdb8] bg-white p-6 shadow-sm"
                            >
                                <div>
                                    <h2 className="text-xl font-bold">
                                        {editingVariantId ? 'Editar variante' : 'Agregar variante'}
                                    </h2>
                                    <p className="mt-1 text-sm text-[#6d7e8b]">
                                        Combinación vendible con SKU, stock y precio propio.
                                    </p>
                                </div>

                                <input
                                    type="text"
                                    placeholder="SKU de variante"
                                    value={variantForm.sku}
                                    onChange={(event) =>
                                        setVariantForm((prev) => ({
                                            ...prev,
                                            sku: event.target.value.toUpperCase(),
                                        }))
                                    }
                                    className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm uppercase outline-none"
                                />

                                <input
                                    type="text"
                                    placeholder="Nombre opcional de variante"
                                    value={variantForm.name}
                                    onChange={(event) =>
                                        setVariantForm((prev) => ({
                                            ...prev,
                                            name: event.target.value,
                                        }))
                                    }
                                    className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                                />

                                {options.map((option) => (
                                    <select
                                        key={option.id}
                                        value={getSelectedValueForOption(option.id)}
                                        onChange={(event) => setVariantOptionValue(option.id, event.target.value)}
                                        className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                                    >
                                        <option value="">
                                            {option.required ? `Seleccioná ${option.name}` : `${option.name} opcional`}
                                        </option>
                                        {values
                                            .filter((value) => value.option_id === option.id && value.active !== false)
                                            .map((value) => (
                                                <option key={value.id} value={value.id}>
                                                    {value.value}
                                                </option>
                                            ))}
                                    </select>
                                ))}

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <input
                                        type="number"
                                        placeholder="Precio"
                                        value={variantForm.price}
                                        onChange={(event) =>
                                            setVariantForm((prev) => ({
                                                ...prev,
                                                price: event.target.value,
                                            }))
                                        }
                                        className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                                    />

                                    <input
                                        type="number"
                                        placeholder="Precio tachado"
                                        value={variantForm.compare_at_price}
                                        onChange={(event) =>
                                            setVariantForm((prev) => ({
                                                ...prev,
                                                compare_at_price: event.target.value,
                                            }))
                                        }
                                        className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                                    />

                                    <input
                                        type="number"
                                        placeholder="Stock"
                                        value={variantForm.stock}
                                        onChange={(event) =>
                                            setVariantForm((prev) => ({
                                                ...prev,
                                                stock: Number(event.target.value || 0),
                                            }))
                                        }
                                        className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                                    />
                                </div>

                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={variantForm.active}
                                        onChange={(event) =>
                                            setVariantForm((prev) => ({
                                                ...prev,
                                                active: event.target.checked,
                                            }))
                                        }
                                    />
                                    Activa
                                </label>

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        disabled={saving}
                                        className="rounded-full bg-[#143047] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                                    >
                                        {editingVariantId ? 'Guardar variante' : 'Crear variante'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={resetVariantForm}
                                        className="rounded-full border border-[#d8cdb8] bg-white px-5 py-3 text-sm font-semibold"
                                    >
                                        Limpiar
                                    </button>
                                </div>
                            </form>

                            <div className="space-y-4">
                                <label className="flex items-center gap-3 rounded-2xl border border-[#e7dbc7] bg-white px-4 py-3">
                                    <Search className="h-4 w-4 text-[#5e89a6]" />
                                    <input
                                        type="text"
                                        placeholder="Filtrar variantes por SKU, nombre u opción"
                                        value={variantSearch}
                                        onChange={(event) => setVariantSearch(event.target.value)}
                                        className="w-full bg-transparent text-sm outline-none"
                                    />
                                </label>

                                {filteredVariants.length === 0 ? (
                                    <div className="rounded-3xl border border-[#d8cdb8] bg-white p-6 text-sm text-[#6d7e8b]">
                                        Todavía no hay variantes para este producto.
                                    </div>
                                ) : (
                                    filteredVariants.map((variant) => {
                                        const optionsLabel = Array.isArray(variant.product_variant_option_values)
                                            ? variant.product_variant_option_values.map(optionValueLabel).join(' · ')
                                            : ''

                                        return (
                                            <div key={variant.id} className="rounded-3xl border border-[#d8cdb8] bg-white p-5">
                                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-lg font-bold">{variant.sku}</p>
                                                            <span
                                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${variant.active
                                                                        ? 'bg-[#ecf8f4] text-[#0f6d5f]'
                                                                        : 'bg-[#fff1ef] text-[#b44a42]'
                                                                    }`}
                                                            >
                                                                {variant.active ? 'Activa' : 'Inactiva'}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-sm text-[#4e6475]">
                                                            {variant.name || optionsLabel || 'Sin nombre'}
                                                        </p>
                                                        <p className="mt-1 text-sm text-[#6d7e8b]">
                                                            Precio: {formatMoney(variant.price)} · Stock: {variant.stock ?? 0}
                                                        </p>
                                                        <p className="mt-1 text-xs text-[#6d7e8b]">
                                                            {optionsLabel || 'Sin opciones asociadas'}
                                                        </p>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => selectVariant(variant)}
                                                            className="rounded-full border border-[#d8cdb8] px-4 py-2 text-sm font-semibold"
                                                        >
                                                            Editar
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                deleteRow(
                                                                    `/api/admin/product-variants/${variant.id}`,
                                                                    `la variante "${variant.sku}"`,
                                                                    resetVariantForm
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-2 rounded-full border border-[#efc0b8] px-4 py-2 text-sm font-semibold text-[#b34f42]"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            Baja lógica
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </main>
    )
}