'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, FolderTree, Image as ImageIcon, LogOut, Mail, Package, ShoppingCart } from 'lucide-react'

const initialCategory = { name: '', slug: '', description: '', sort_order: 0, active: true, sku_prefix: '' }
const initialProduct = {
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
const initialImage = {
  product_id: '',
  image_url: '',
  alt_text: '',
  sort_order: 0,
  media_type: 'image',
  use_case: 'catalog',
  is_primary: false,
}
function SectionCard({ title, subtitle, children, action }) {
  return (
    <section className="rounded-[28px] border border-[#d8cdb8] bg-white p-6 shadow-[0_14px_35px_rgba(20,48,71,0.06)]">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#143047]">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-[#4e6475]">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
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

function normalizeSkuPrefix(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim()
  )
}

function toSafeNumber(value, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function toSafeInteger(value, fallback = 0) {
  const num = Number(value)
  return Number.isInteger(num) ? num : fallback
}

export default function AdminPage() {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState('dashboard')
  const [session, setSession] = useState(null)
  const [stats, setStats] = useState(null)
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [images, setImages] = useState([])
  const [orders, setOrders] = useState([])
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [categoryForm, setCategoryForm] = useState(initialCategory)
  const [productForm, setProductForm] = useState(initialProduct)
  const [imageForm, setImageForm] = useState(initialImage)

  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editingProductId, setEditingProductId] = useState(null)
  const [editingImageId, setEditingImageId] = useState(null)

  useEffect(() => {
    loadAll()
  }, [])

  function flash(text) {
    setMessage(text)
    if (typeof window !== 'undefined') {
      window.clearTimeout(window.__adminFlashTimer)
      window.__adminFlashTimer = window.setTimeout(() => setMessage(''), 2600)
    }
  }

  function resetCategoryForm() {
    setCategoryForm(initialCategory)
    setEditingCategoryId(null)
  }

  function selectCategory(category) {
    setEditingCategoryId(category.id)
    setCategoryForm({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      sort_order: Number(category.sort_order || 0),
      active: Boolean(category.active),
      sku_prefix: category.sku_prefix || '',
    })
  }

  function resetProductForm() {
    setProductForm(initialProduct)
    setEditingProductId(null)
  }

  function selectProduct(product) {
    setEditingProductId(product.id)
    setProductForm({
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

  function resetImageForm() {
    setImageForm(initialImage)
    setEditingImageId(null)
  }

  async function handleUnauthorized(response) {
    if (response.status === 401) {
      router.replace('/admin/login')
      return true
    }
    return false
  }

  async function loadAll() {
    try {
      setLoading(true)

      const [sessionRes, statsRes, categoriesRes, productsRes, imagesRes, ordersRes, contactsRes] = await Promise.all([
        fetch('/api/admin/session', { cache: 'no-store' }),
        fetch('/api/admin/stats', { cache: 'no-store' }),
        fetch('/api/admin/categories', { cache: 'no-store' }),
        fetch('/api/admin/products', { cache: 'no-store' }),
        fetch('/api/admin/product-images', { cache: 'no-store' }),
        fetch('/api/admin/orders', { cache: 'no-store' }),
        fetch('/api/admin/contacts', { cache: 'no-store' }),
      ])

      if (await handleUnauthorized(sessionRes)) return

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json()
        setSession(sessionData.admin)
      } else {
        router.replace('/admin/login')
        return
      }

      if (statsRes.ok) setStats(await statsRes.json())
      if (categoriesRes.ok) setCategories(await categoriesRes.json())
      if (productsRes.ok) setProducts(await productsRes.json())
      if (imagesRes.ok) setImages(await imagesRes.json())
      if (ordersRes.ok) setOrders(await ordersRes.json())
      if (contactsRes.ok) setContacts(await contactsRes.json())
    } catch {
      flash('No se pudo cargar el panel admin')
    } finally {
      setLoading(false)
    }
  }

  function validateCategoryForm() {
    const name = String(categoryForm.name || '').trim()
    const slug = normalizeSlug(categoryForm.slug || categoryForm.name || '')
    const sku_prefix = normalizeSkuPrefix(categoryForm.sku_prefix || '')

    if (!name) {
      flash('La categoría necesita nombre')
      return null
    }

    if (!slug) {
      flash('La categoría necesita slug válido')
      return null
    }

    return {
      name,
      slug,
      description: String(categoryForm.description || '').trim(),
      sort_order: Number.isFinite(Number(categoryForm.sort_order)) ? Number(categoryForm.sort_order) : 0,
      active: categoryForm.active !== false,
      sku_prefix: sku_prefix || null,
    }
  }

  function validateProductForm() {
    const name = String(productForm.name || '').trim()
    const slug = normalizeSlug(productForm.slug || productForm.name || '')
    const short_description = String(productForm.short_description || '').trim()
    const description = String(productForm.description || '').trim()
    const price = toSafeNumber(productForm.price, 0)
    const compare_at_price =
      productForm.compare_at_price === '' || productForm.compare_at_price == null
        ? ''
        : toSafeNumber(productForm.compare_at_price, 0)
    const stock = Math.max(0, toSafeInteger(productForm.stock, 0))
    const category_id = String(productForm.category_id || '').trim() || null

    if (!name) {
      flash('El producto necesita nombre')
      return null
    }

    if (!slug) {
      flash('El producto necesita slug válido')
      return null
    }

    if (price < 0) {
      flash('El precio no puede ser negativo')
      return null
    }

    if (compare_at_price !== '' && Number(compare_at_price) < 0) {
      flash('El precio tachado no puede ser negativo')
      return null
    }

    return {
      category_id,
      name,
      slug,
      short_description,
      description,
      price,
      compare_at_price,
      stock,
      featured: Boolean(productForm.featured),
      active: productForm.active !== false,
    }
  }

  async function submitCategory(event) {
    event.preventDefault()
    if (saving) return

    const payload = validateCategoryForm()
    if (!payload) return

    setSaving(true)

    try {
      const endpoint = editingCategoryId ? `/api/admin/categories/${editingCategoryId}` : '/api/admin/categories'
      const method = editingCategoryId ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (await handleUnauthorized(response)) return

      const data = await response.json().catch(() => ({}))
      if (!response.ok) return flash(data.error || 'No se pudo guardar la categoría')

      resetCategoryForm()
      flash(editingCategoryId ? 'Categoría actualizada' : 'Categoría creada')
      await loadAll()
    } catch {
      flash('No se pudo guardar la categoría')
    } finally {
      setSaving(false)
    }
  }

  async function submitProduct(event) {
    event.preventDefault()
    if (saving) return

    const payload = validateProductForm()
    if (!payload) return

    setSaving(true)

    try {
      const endpoint = editingProductId ? `/api/admin/products/${editingProductId}` : '/api/admin/products'
      const method = editingProductId ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (await handleUnauthorized(response)) return

      const data = await response.json().catch(() => ({}))
      if (!response.ok) return flash(data.error || 'No se pudo guardar el producto')

      resetProductForm()
      flash(editingProductId ? 'Producto actualizado' : 'Producto creado')
      await loadAll()
    } catch {
      flash('No se pudo guardar el producto')
    } finally {
      setSaving(false)
    }
  }

  async function submitImage(event) {
    event.preventDefault()
    setSaving(true)

    try {
      const endpoint = editingImageId ? `/api/admin/product-images/${editingImageId}` : '/api/admin/product-images'
      const method = editingImageId ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(imageForm),
      })

      if (await handleUnauthorized(response)) return

      const data = await response.json().catch(() => ({}))
      if (!response.ok) return flash(data.error || 'No se pudo guardar la imagen')

      resetImageForm()
      flash('Imagen guardada')
      await loadAll()
    } catch {
      flash('No se pudo guardar la imagen')
    } finally {
      setSaving(false)
    }
  }

  async function deleteCategory(category) {
    const id = String(category?.id || editingCategoryId || '').trim()

    if (!isValidUuid(id)) {
      flash('La categoría no tiene un id válido')
      return
    }

    const categoryName = category?.name || categoryForm.name || 'sin nombre'
    const confirmText = `¿Dar de baja la categoría "${categoryName}"?`
    if (!window.confirm(confirmText)) return

    try {
      const response = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })

      if (await handleUnauthorized(response)) return

      const data = await response.json().catch(() => ({}))
      if (!response.ok) return flash(data.error || 'No se pudo eliminar la categoría')

      if (editingCategoryId === id) {
        resetCategoryForm()
      }

      flash('Categoría dada de baja')
      await loadAll()
    } catch {
      flash('No se pudo eliminar la categoría')
    }
  }

  async function deleteProduct(product) {
    const id = String(product?.id || editingProductId || '').trim()

    if (!isValidUuid(id)) {
      flash('El producto no tiene un id válido')
      return
    }

    const productName = product?.name || productForm.name || 'sin nombre'
    const confirmText = `¿Dar de baja el producto "${productName}"?`
    if (!window.confirm(confirmText)) return

    try {
      const response = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })

      if (await handleUnauthorized(response)) return

      const data = await response.json().catch(() => ({}))
      if (!response.ok) return flash(data.error || 'No se pudo eliminar el producto')

      if (editingProductId === id) {
        resetProductForm()
      }

      flash('Producto dado de baja')
      await loadAll()
    } catch {
      flash('No se pudo eliminar el producto')
    }
  }

  async function deleteRow(url, label) {
    if (!window.confirm(`¿Eliminar ${label}?`)) return

    try {
      const response = await fetch(url, { method: 'DELETE' })

      if (await handleUnauthorized(response)) return

      const data = await response.json().catch(() => ({}))
      if (!response.ok) return flash(data.error || 'No se pudo eliminar')

      flash('Eliminado correctamente')
      await loadAll()
    } catch {
      flash('No se pudo eliminar')
    }
  }

  async function updateOrder(id, status) {
    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (await handleUnauthorized(response)) return

      const data = await response.json().catch(() => ({}))
      if (!response.ok) return flash(data.error || 'No se pudo actualizar el pedido')

      flash('Pedido actualizado')
      await loadAll()
    } catch {
      flash('No se pudo actualizar el pedido')
    }
  }

  async function logout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } finally {
      window.location.href = '/admin/login'
    }
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'categories', label: 'Categorías', icon: FolderTree },
    { id: 'products', label: 'Productos', icon: Package },
    { id: 'images', label: 'Imágenes', icon: ImageIcon },
    { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
    { id: 'contacts', label: 'Contactos', icon: Mail },
  ]

  const categoryOptions = useMemo(
    () => categories.map((item) => ({ id: item.id, label: item.name, sku_prefix: item.sku_prefix || null })),
    [categories]
  )

  const productOptions = useMemo(
    () => products.map((item) => ({ id: item.id, label: item.name })),
    [products]
  )

  const selectedCategory = useMemo(
    () => categories.find((item) => item.id === editingCategoryId) || null,
    [categories, editingCategoryId]
  )

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === editingProductId) || null,
    [products, editingProductId]
  )

  const selectedProductCategory = useMemo(
    () => categoryOptions.find((item) => item.id === productForm.category_id) || null,
    [categoryOptions, productForm.category_id]
  )

  if (loading) {
    return <main className="min-h-screen bg-[#f5efe3] p-10 text-[#143047]">Cargando panel...</main>
  }

  return (
    <main className="min-h-screen bg-[#f5efe3] text-[#143047]">
      <div className="mx-auto grid min-h-screen max-w-[1500px] gap-6 px-4 py-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-[28px] border border-[#d8cdb8] bg-white p-6 shadow-[0_14px_35px_rgba(20,48,71,0.06)]">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5e89a6]">Panel interno</p>
          <h1 className="mt-3 font-display text-5xl uppercase leading-none">3DLightLab Commerce</h1>
          <p className="mt-3 text-sm text-[#4e6475]">{session?.email || 'Administrador'}</p>

          <div className="mt-8 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${activeTab === tab.id
                  ? 'bg-[#143047] text-white'
                  : 'bg-[#f8f3ea] text-[#143047] hover:bg-[#eef4f8]'
                  }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <a
              href="/"
              className="rounded-full border border-[#d8cdb8] px-4 py-3 text-center text-sm font-semibold"
            >
              Ver tienda
            </a>
            <button
              onClick={logout}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#143047] px-4 py-3 text-sm font-semibold text-white"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        <div className="space-y-6 pb-10">
          {message ? (
            <div className="rounded-2xl bg-[#ecf8f4] px-5 py-3 text-sm font-medium text-[#0f6d5f]">
              {message}
            </div>
          ) : null}

          {activeTab === 'dashboard' && (
            <SectionCard title="Resumen" subtitle="Métricas generales del negocio y del catálogo.">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ['Ventas totales', `$ ${Number(stats?.totalRevenue || 0).toLocaleString('es-AR')}`],
                  ['Ventas aprobadas', `$ ${Number(stats?.approvedRevenue || 0).toLocaleString('es-AR')}`],
                  ['Pedidos', String(stats?.totalOrders || 0)],
                  ['Pendientes', String(stats?.pendingOrders || 0)],
                  ['Productos', String(stats?.totalProducts || 0)],
                  ['Categorías', String(stats?.totalCategories || 0)],
                  ['Contactos', String(stats?.totalContacts || 0)],
                  ['Nuevos hoy', String(stats?.newContacts || 0)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-3xl bg-[#f8f3ea] p-5">
                    <p className="text-sm font-semibold text-[#5e89a6]">{label}</p>
                    <p className="mt-2 text-3xl font-extrabold text-[#143047]">{value}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {activeTab === 'categories' && (
            <SectionCard
              title="ABM de categorías"
              subtitle="Seleccioná una categoría para editarla desde el formulario o creá una nueva."
            >
              <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
                <form onSubmit={submitCategory} className="space-y-4 rounded-3xl bg-[#f8f3ea] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-[#143047]">
                        {editingCategoryId ? 'Editar categoría' : 'Nueva categoría'}
                      </h3>
                      <p className="text-xs text-[#6d7e8b]">
                        {editingCategoryId
                          ? 'Estás editando la categoría seleccionada.'
                          : 'Completá los datos para crear una categoría.'}
                      </p>
                    </div>

                    {editingCategoryId ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#143047]">
                        Seleccionada
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#143047]">Nombre</label>
                    <input
                      className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                      placeholder="Ej: Lámparas de mesa"
                      value={categoryForm.name}
                      onChange={(e) =>
                        setCategoryForm((prev) => {
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
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#143047]">Slug</label>
                    <input
                      className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                      placeholder="Ej: lamparas-de-mesa"
                      value={categoryForm.slug}
                      onChange={(e) =>
                        setCategoryForm({ ...categoryForm, slug: normalizeSlug(e.target.value) })
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#143047]">Prefijo SKU</label>
                    <input
                      className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 uppercase"
                      placeholder="Ej: LMS"
                      value={categoryForm.sku_prefix}
                      onChange={(e) =>
                        setCategoryForm({ ...categoryForm, sku_prefix: normalizeSkuPrefix(e.target.value) })
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#143047]">Descripción</label>
                    <textarea
                      className="min-h-[100px] w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                      placeholder="Descripción opcional de la categoría"
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#143047]">Orden</label>
                    <input
                      type="number"
                      className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                      placeholder="0"
                      value={categoryForm.sort_order}
                      onChange={(e) =>
                        setCategoryForm({ ...categoryForm, sort_order: Number(e.target.value || 0) })
                      }
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={categoryForm.active}
                      onChange={(e) => setCategoryForm({ ...categoryForm, active: e.target.checked })}
                    />
                    Activa
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <button
                      disabled={saving}
                      className="rounded-full bg-[#143047] px-5 py-3 text-sm font-semibold text-white"
                    >
                      {editingCategoryId ? 'Guardar cambios' : 'Crear categoría'}
                    </button>

                    <button
                      type="button"
                      onClick={resetCategoryForm}
                      className="rounded-full border border-[#d8cdb8] px-5 py-3 text-sm font-semibold"
                    >
                      Limpiar
                    </button>

                    {editingCategoryId ? (
                      <button
                        type="button"
                        onClick={() => deleteCategory(selectedCategory)}
                        className="rounded-full border border-[#efc0b8] px-5 py-3 text-sm font-semibold text-[#b34f42]"
                      >
                        Dar de baja
                      </button>
                    ) : null}
                  </div>
                </form>

                <div className="space-y-3">
                  {categories.length === 0 ? (
                    <div className="rounded-3xl border border-[#efe6d5] bg-white p-6 text-center text-[#6d7e8b]">
                      No hay categorías activas para administrar.
                    </div>
                  ) : (
                    categories.map((category) => {
                      const isSelected = editingCategoryId === category.id

                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => selectCategory(category)}
                          className={`w-full rounded-3xl border p-4 text-left transition ${isSelected
                            ? 'border-[#143047] bg-[#eef4f8]'
                            : 'border-[#efe6d5] bg-white hover:bg-[#faf7f0]'
                            }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="font-semibold text-[#143047]">{category.name}</p>
                              <p className="mt-1 text-sm text-[#4e6475]">{category.slug}</p>
                              {category.sku_prefix ? (
                                <p className="mt-1 text-xs text-[#6d7e8b]">SKU: {category.sku_prefix}</p>
                              ) : null}
                              {category.description ? (
                                <p className="mt-2 text-xs leading-5 text-[#6d7e8b]">
                                  {category.description}
                                </p>
                              ) : null}
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <span className="rounded-full bg-[#f8f3ea] px-3 py-1 text-xs font-semibold text-[#143047]">
                                Orden {category.sort_order}
                              </span>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${category.active
                                  ? 'bg-[#ecf8f4] text-[#0f6d5f]'
                                  : 'bg-[#fff1ef] text-[#b34f42]'
                                  }`}
                              >
                                {category.active ? 'Activa' : 'Inactiva'}
                              </span>
                            </div>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </SectionCard>
          )}

          {activeTab === 'products' && (
            <SectionCard
              title="ABM de productos"
              subtitle="El SKU se genera automáticamente. Seleccioná un producto para editarlo desde el formulario."
            >
              <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
                <form onSubmit={submitProduct} className="space-y-4 rounded-3xl bg-[#f8f3ea] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-[#143047]">
                        {editingProductId ? 'Editar producto' : 'Nuevo producto'}
                      </h3>
                      <p className="text-xs text-[#6d7e8b]">
                        {editingProductId
                          ? 'Estás editando el producto seleccionado.'
                          : 'Completá los datos para crear un producto.'}
                      </p>
                    </div>

                    {editingProductId ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#143047]">
                        Seleccionado
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#143047]">Categoría</label>
                    <select
                      className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                      value={productForm.category_id}
                      onChange={(e) =>
                        setProductForm({ ...productForm, category_id: e.target.value })
                      }
                    >
                      <option value="">Sin categoría</option>
                      {categoryOptions.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.label}{category.sku_prefix ? ` · ${category.sku_prefix}` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-[#6d7e8b]">
                      {selectedProductCategory?.sku_prefix
                        ? `El SKU nuevo usará el prefijo ${selectedProductCategory.sku_prefix}.`
                        : 'Si no tiene categoría, se usará el prefijo general PRD.'}
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#143047]">Nombre</label>
                    <input
                      className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                      placeholder="Nombre"
                      value={productForm.name}
                      onChange={(e) =>
                        setProductForm((prev) => {
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
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#143047]">Slug</label>
                    <input
                      className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                      placeholder="Slug"
                      value={productForm.slug}
                      onChange={(e) =>
                        setProductForm({ ...productForm, slug: normalizeSlug(e.target.value) })
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#143047]">SKU</label>
                    <input
                      className="w-full rounded-2xl border border-[#d8cdb8] bg-[#f3efe6] px-4 py-3 text-[#6d7e8b]"
                      value={
                        editingProductId
                          ? productForm.sku || 'Se generó automáticamente'
                          : 'Se generará automáticamente al crear'
                      }
                      readOnly
                    />
                    <p className="mt-1 text-xs text-[#6d7e8b]">
                      El SKU se asigna automáticamente según la categoría.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#143047]">Descripción corta</label>
                    <input
                      className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                      placeholder="Descripción corta"
                      value={productForm.short_description}
                      onChange={(e) =>
                        setProductForm({ ...productForm, short_description: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#143047]">Descripción completa</label>
                    <textarea
                      className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 min-h-[100px]"
                      placeholder="Descripción completa"
                      value={productForm.description}
                      onChange={(e) =>
                        setProductForm({ ...productForm, description: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#143047]">Precio</label>
                      <div className="flex items-center border rounded-2xl border-[#d8cdb8] bg-white">
                        <span className="px-3 text-[#6d7e8b]">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-3 outline-none"
                          placeholder="Precio"
                          value={productForm.price}
                          onChange={(e) =>
                            setProductForm({ ...productForm, price: toSafeNumber(e.target.value, 0) })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#143047]">Precio tachado</label>
                      <div className="flex items-center border rounded-2xl border-[#d8cdb8] bg-white">
                        <span className="px-3 text-[#6d7e8b]">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-3 outline-none"
                          placeholder="Precio tachado"
                          value={productForm.compare_at_price}
                          onChange={(e) =>
                            setProductForm({ ...productForm, compare_at_price: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#143047]">Stock</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                      placeholder="Stock"
                      value={productForm.stock}
                      onChange={(e) =>
                        setProductForm({ ...productForm, stock: Math.max(0, toSafeInteger(e.target.value, 0)) })
                      }
                    />
                  </div>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={productForm.featured}
                        onChange={(e) =>
                          setProductForm({ ...productForm, featured: e.target.checked })
                        }
                      />
                      Destacado
                    </label>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={productForm.active}
                        onChange={(e) =>
                          setProductForm({ ...productForm, active: e.target.checked })
                        }
                      />
                      Activo
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      className="rounded-full bg-[#143047] px-5 py-3 text-sm font-semibold text-white"
                    >
                      {editingProductId ? 'Guardar cambios' : 'Crear producto'}
                    </button>

                    <button
                      type="button"
                      onClick={resetProductForm}
                      className="rounded-full border border-[#d8cdb8] px-5 py-3 text-sm font-semibold"
                    >
                      Limpiar
                    </button>

                    {editingProductId ? (
                      <button
                        type="button"
                        onClick={() => deleteProduct(selectedProduct)}
                        className="rounded-full border border-[#efc0b8] px-5 py-3 text-sm font-semibold text-[#b34f42]"
                      >
                        Dar de baja
                      </button>
                    ) : null}
                  </div>
                </form>

                <div className="space-y-3">
                  {products.length === 0 ? (
                    <div className="rounded-3xl border border-[#efe6d5] bg-white p-6 text-center text-[#6d7e8b]">
                      No hay productos activos para administrar.
                    </div>
                  ) : (
                    products.map((p) => {
                      const isSelected = editingProductId === p.id

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selectProduct(p)}
                          className={`w-full rounded-3xl border p-4 text-left transition ${isSelected
                            ? 'border-[#143047] bg-[#eef4f8]'
                            : 'border-[#efe6d5] bg-white hover:bg-[#faf7f0]'
                            }`}
                        >
                          <div className="flex justify-between gap-4">
                            <div className="min-w-0">
                              <p className="font-semibold text-[#143047]">{p.name}</p>
                              <p className="text-sm text-[#4e6475]">{p.slug}</p>
                              {p.sku ? (
                                <p className="mt-1 text-xs text-[#6d7e8b]">SKU: {p.sku}</p>
                              ) : null}
                              {p.categories?.name ? (
                                <p className="mt-1 text-xs text-[#6d7e8b]">Categoría: {p.categories.name}</p>
                              ) : (
                                <p className="mt-1 text-xs text-[#6d7e8b]">Sin categoría</p>
                              )}
                            </div>

                            <div className="text-right">
                              <p className="font-semibold text-[#143047]">$ {Number(p.price || 0).toLocaleString('es-AR')}</p>
                              <p className="text-xs text-[#6d7e8b]">Stock {p.stock}</p>
                              <p className="text-xs text-[#6d7e8b]">{p.active ? 'Activo' : 'Inactivo'}</p>
                            </div>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </SectionCard>
          )}

          {activeTab === 'images' && (
            <SectionCard
              title="ABM de media"
              subtitle="Administrá imágenes y modelos 3D por producto, con tipo, uso y prioridad."
            >
              <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
                <form onSubmit={submitImage} className="space-y-4 rounded-3xl bg-[#f8f3ea] p-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#143047]">Producto</label>
                    <select
                      className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                      value={imageForm.product_id}
                      onChange={(e) => setImageForm({ ...imageForm, product_id: e.target.value })}
                    >
                      <option value="">Seleccioná un producto</option>
                      {productOptions.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#143047]">URL o path del archivo</label>
                    <input
                      className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                      placeholder="Ej: /products/images/archivo.jpg o URL de Supabase Storage"
                      value={imageForm.image_url}
                      onChange={(e) => setImageForm({ ...imageForm, image_url: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#143047]">Texto alternativo</label>
                    <input
                      className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                      placeholder="Texto alternativo"
                      value={imageForm.alt_text}
                      onChange={(e) => setImageForm({ ...imageForm, alt_text: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#143047]">Tipo</label>
                      <select
                        className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                        value={imageForm.media_type}
                        onChange={(e) => setImageForm({ ...imageForm, media_type: e.target.value })}
                      >
                        <option value="image">Imagen</option>
                        <option value="model">Modelo 3D</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#143047]">Uso</label>
                      <select
                        className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                        value={imageForm.use_case}
                        onChange={(e) => setImageForm({ ...imageForm, use_case: e.target.value })}
                      >
                        <option value="catalog">Catalog</option>
                        <option value="detail">Detail</option>
                        <option value="gallery">Gallery</option>
                        <option value="hero">Hero</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#143047]">Orden</label>
                    <input
                      type="number"
                      className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                      placeholder="0"
                      value={imageForm.sort_order}
                      onChange={(e) =>
                        setImageForm({ ...imageForm, sort_order: Number(e.target.value || 0) })
                      }
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={imageForm.is_primary}
                      onChange={(e) => setImageForm({ ...imageForm, is_primary: e.target.checked })}
                    />
                    Marcar como principal para ese tipo/uso
                  </label>

                  <div className="flex gap-3">
                    <button
                      disabled={saving}
                      className="rounded-full bg-[#143047] px-5 py-3 text-sm font-semibold text-white"
                    >
                      {editingImageId ? 'Actualizar' : 'Crear'}
                    </button>

                    {editingImageId ? (
                      <button
                        type="button"
                        onClick={resetImageForm}
                        className="rounded-full border border-[#d8cdb8] px-5 py-3 text-sm font-semibold"
                      >
                        Cancelar
                      </button>
                    ) : null}
                  </div>
                </form>

                <div className="space-y-3">
                  {images.length === 0 ? (
                    <div className="rounded-3xl border border-[#efe6d5] bg-white p-6 text-center text-[#6d7e8b]">
                      No hay media cargada todavía.
                    </div>
                  ) : (
                    images.map((image) => (
                      <div
                        key={image.id}
                        className="flex flex-col gap-4 rounded-3xl border border-[#efe6d5] bg-white p-4"
                      >
                        <div className="flex items-start gap-4">
                          {image.media_type === 'image' ? (
                            <img
                              src={image.image_url}
                              alt={image.alt_text || 'Imagen'}
                              className="h-20 w-20 rounded-2xl object-cover"
                            />
                          ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#f3efe6] text-xs font-semibold text-[#6d7e8b]">
                              3D
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[#143047]">{image.products?.name || 'Producto'}</p>
                            <p className="truncate text-sm text-[#4e6475]">{image.image_url}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                              <span className="rounded-full bg-[#f8f3ea] px-3 py-1 text-[#143047]">
                                {image.media_type}
                              </span>
                              <span className="rounded-full bg-[#f8f3ea] px-3 py-1 text-[#143047]">
                                {image.use_case || 'sin use_case'}
                              </span>
                              <span className="rounded-full bg-[#f8f3ea] px-3 py-1 text-[#143047]">
                                Orden {image.sort_order}
                              </span>
                              {image.is_primary ? (
                                <span className="rounded-full bg-[#ecf8f4] px-3 py-1 text-[#0f6d5f]">
                                  Principal
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-xs text-[#6d7e8b]">
                              Alt: {image.alt_text || '—'}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingImageId(image.id)
                              setImageForm({
                                product_id: image.product_id || '',
                                image_url: image.image_url || '',
                                alt_text: image.alt_text || '',
                                sort_order: Number(image.sort_order || 0),
                                media_type: image.media_type || 'image',
                                use_case: image.use_case || 'catalog',
                                is_primary: Boolean(image.is_primary),
                              })
                            }}
                            className="rounded-full border border-[#d8cdb8] px-3 py-1 text-sm"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => deleteRow(`/api/admin/product-images/${image.id}`, 'la media')}
                            className="rounded-full border border-[#efc0b8] px-3 py-1 text-sm text-[#b34f42]"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </SectionCard>
          )}

          {activeTab === 'orders' && (
            <SectionCard title="Pedidos" subtitle="Seguimiento de estado y control del checkout.">
              <div className="space-y-4">
                {orders.length === 0 ? (
                  <p className="text-sm text-[#4e6475]">Todavía no hay pedidos registrados.</p>
                ) : null}

                {orders.map((order) => (
                  <div key={order.id} className="rounded-3xl border border-[#efe6d5] bg-white p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-[#143047]">{order.customer_name}</p>
                        <p className="text-sm text-[#4e6475]">
                          {order.customer_phone} · {order.customer_email || 'sin email'}
                        </p>
                        <p className="mt-1 text-xs text-[#6d7e8b]">
                          {order.external_reference || order.id}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 md:items-end">
                        <p className="text-lg font-extrabold">
                          $ {Number(order.total || 0).toLocaleString('es-AR')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {['pending', 'approved', 'cancelled'].map((status) => (
                            <button
                              key={status}
                              onClick={() => updateOrder(order.id, status)}
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${order.status === status
                                ? 'bg-[#143047] text-white'
                                : 'border border-[#d8cdb8]'
                                }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {activeTab === 'contacts' && (
            <SectionCard
              title="Contactos"
              subtitle="Consultas recibidas desde el formulario público."
            >
              <div className="space-y-4">
                {contacts.length === 0 ? (
                  <p className="text-sm text-[#4e6475]">Todavía no hay consultas registradas.</p>
                ) : null}

                {contacts.map((contact) => (
                  <div key={contact.id} className="rounded-3xl border border-[#efe6d5] bg-white p-5">
                    <p className="font-semibold text-[#143047]">{contact.name || 'Sin nombre'}</p>
                    <p className="mt-1 text-sm text-[#4e6475]">
                      {contact.email || 'sin email'} · {contact.phone || 'sin teléfono'}
                    </p>
                    <p className="mt-2 text-sm text-[#4e6475]">
                      Motivo: {contact.reason || '—'} · Producto: {contact.product || '—'}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[#143047]">
                      {contact.message || 'Sin mensaje.'}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </main>
  )
}