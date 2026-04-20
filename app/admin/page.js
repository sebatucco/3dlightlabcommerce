'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, FolderTree, Image as ImageIcon, LogOut, Mail, Package, ShoppingCart } from 'lucide-react'

const initialCategory = { name: '', slug: '', description: '', sort_order: 0, active: true }
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
const initialImage = { product_id: '', image_url: '', alt_text: '', sort_order: 0 }

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

  function resetProductForm() {
    setProductForm(initialProduct)
    setEditingProductId(null)
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

  async function submitCategory(event) {
    event.preventDefault()
    setSaving(true)

    try {
      const endpoint = editingCategoryId ? `/api/admin/categories/${editingCategoryId}` : '/api/admin/categories'
      const method = editingCategoryId ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm),
      })

      if (await handleUnauthorized(response)) return

      const data = await response.json().catch(() => ({}))
      if (!response.ok) return flash(data.error || 'No se pudo guardar la categoría')

      resetCategoryForm()
      flash('Categoría guardada')
      await loadAll()
    } catch {
      flash('No se pudo guardar la categoría')
    } finally {
      setSaving(false)
    }
  }

  async function submitProduct(event) {
    event.preventDefault()
    setSaving(true)

    try {
      const endpoint = editingProductId ? `/api/admin/products/${editingProductId}` : '/api/admin/products'
      const method = editingProductId ? 'PUT' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm),
      })

      if (await handleUnauthorized(response)) return

      const data = await response.json().catch(() => ({}))
      if (!response.ok) return flash(data.error || 'No se pudo guardar el producto')

      resetProductForm()
      flash('Producto guardado')
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
    () => categories.map((item) => ({ id: item.id, label: item.name })),
    [categories]
  )

  const productOptions = useMemo(
    () => products.map((item) => ({ id: item.id, label: item.name })),
    [products]
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
              subtitle="Creá, editá y desactivá categorías para el catálogo."
            >
              <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
                <form onSubmit={submitCategory} className="space-y-4 rounded-3xl bg-[#f8f3ea] p-5">
                  <input
                    className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                    placeholder="Nombre"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  />
                  <input
                    className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                    placeholder="Slug"
                    value={categoryForm.slug}
                    onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  />
                  <textarea
                    className="min-h-[100px] w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                    placeholder="Descripción"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  />
                  <input
                    type="number"
                    className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                    placeholder="Orden"
                    value={categoryForm.sort_order}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, sort_order: Number(e.target.value) })
                    }
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={categoryForm.active}
                      onChange={(e) => setCategoryForm({ ...categoryForm, active: e.target.checked })}
                    />
                    Activa
                  </label>
                  <div className="flex gap-3">
                    <button
                      disabled={saving}
                      className="rounded-full bg-[#143047] px-5 py-3 text-sm font-semibold text-white"
                    >
                      {editingCategoryId ? 'Actualizar' : 'Crear'}
                    </button>
                    {editingCategoryId ? (
                      <button
                        type="button"
                        onClick={resetCategoryForm}
                        className="rounded-full border border-[#d8cdb8] px-5 py-3 text-sm font-semibold"
                      >
                        Cancelar
                      </button>
                    ) : null}
                  </div>
                </form>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-[#5e89a6]">
                        <th className="pb-3">Nombre</th>
                        <th className="pb-3">Slug</th>
                        <th className="pb-3">Orden</th>
                        <th className="pb-3">Estado</th>
                        <th className="pb-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category) => (
                        <tr key={category.id} className="border-t border-[#efe6d5]">
                          <td className="py-3 font-semibold">{category.name}</td>
                          <td className="py-3">{category.slug}</td>
                          <td className="py-3">{category.sort_order}</td>
                          <td className="py-3">{category.active ? 'Activa' : 'Inactiva'}</td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingCategoryId(category.id)
                                  setCategoryForm({
                                    ...category,
                                    description: category.description || '',
                                  })
                                }}
                                className="rounded-full border border-[#d8cdb8] px-3 py-1"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() =>
                                  deleteRow(`/api/admin/categories/${category.id}`, 'la categoría')
                                }
                                className="rounded-full border border-[#efc0b8] px-3 py-1 text-[#b34f42]"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </SectionCard>
          )}

          {activeTab === 'products' && (
            <SectionCard
              title="ABM de productos"
              subtitle="Administrá precios, stock, categoría y visibilidad del catálogo."
            >
              <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
                <form onSubmit={submitProduct} className="space-y-4 rounded-3xl bg-[#f8f3ea] p-5">
                  <select
                    className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                    value={productForm.category_id}
                    onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                  >
                    <option value="">Sin categoría</option>
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </select>

                  <input
                    className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                    placeholder="Nombre"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  />
                  <input
                    className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                    placeholder="Slug"
                    value={productForm.slug}
                    onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })}
                  />
                  <input
                    className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                    placeholder="Descripción corta"
                    value={productForm.short_description}
                    onChange={(e) =>
                      setProductForm({ ...productForm, short_description: e.target.value })
                    }
                  />
                  <textarea
                    className="min-h-[110px] w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                    placeholder="Descripción completa"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="number"
                      className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                      placeholder="Precio"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                    />
                    <input
                      type="number"
                      className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                      placeholder="Precio tachado"
                      value={productForm.compare_at_price}
                      onChange={(e) =>
                        setProductForm({ ...productForm, compare_at_price: e.target.value })
                      }
                    />
                    <input
                      className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                      placeholder="SKU"
                      value={productForm.sku}
                      onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    />
                    <input
                      type="number"
                      className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                      placeholder="Stock"
                      value={productForm.stock}
                      onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                    />
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={productForm.featured}
                        onChange={(e) =>
                          setProductForm({ ...productForm, featured: e.target.checked })
                        }
                      />
                      Destacado
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={productForm.active}
                        onChange={(e) => setProductForm({ ...productForm, active: e.target.checked })}
                      />
                      Activo
                    </label>
                  </div>
                  <div className="flex gap-3">
                    <button
                      disabled={saving}
                      className="rounded-full bg-[#143047] px-5 py-3 text-sm font-semibold text-white"
                    >
                      {editingProductId ? 'Actualizar' : 'Crear'}
                    </button>
                    {editingProductId ? (
                      <button
                        type="button"
                        onClick={resetProductForm}
                        className="rounded-full border border-[#d8cdb8] px-5 py-3 text-sm font-semibold"
                      >
                        Cancelar
                      </button>
                    ) : null}
                  </div>
                </form>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-[#5e89a6]">
                        <th className="pb-3">Producto</th>
                        <th className="pb-3">Categoría</th>
                        <th className="pb-3">Precio</th>
                        <th className="pb-3">Stock</th>
                        <th className="pb-3">Estado</th>
                        <th className="pb-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product.id} className="border-t border-[#efe6d5] align-top">
                          <td className="py-3">
                            <p className="font-semibold">{product.name}</p>
                            <p className="text-xs text-[#6d7e8b]">{product.slug}</p>
                          </td>
                          <td className="py-3">{product.categories?.name || '—'}</td>
                          <td className="py-3">$ {Number(product.price || 0).toLocaleString('es-AR')}</td>
                          <td className="py-3">{product.stock}</td>
                          <td className="py-3">
                            {product.active ? 'Activo' : 'Inactivo'} {product.featured ? '· Destacado' : ''}
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => {
                                  setProductForm({
                                    category_id: product.category_id || '',
                                    name: product.name || '',
                                    slug: product.slug || '',
                                    short_description: product.short_description || '',
                                    description: product.description || '',
                                    price: Number(product.price || 0),
                                    compare_at_price: product.compare_at_price ?? '',
                                    sku: product.sku || '',
                                    stock: Number(product.stock || 0),
                                    featured: Boolean(product.featured),
                                    active: Boolean(product.active),
                                  })
                                  setEditingProductId(product.id)
                                }}
                                className="rounded-full border border-[#d8cdb8] px-3 py-1"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => deleteRow(`/api/admin/products/${product.id}`, 'el producto')}
                                className="rounded-full border border-[#efc0b8] px-3 py-1 text-[#b34f42]"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </SectionCard>
          )}

          {activeTab === 'images' && (
            <SectionCard
              title="ABM de imágenes"
              subtitle="Asociá múltiples imágenes por producto con orden y texto alternativo."
            >
              <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
                <form onSubmit={submitImage} className="space-y-4 rounded-3xl bg-[#f8f3ea] p-5">
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
                  <input
                    className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                    placeholder="URL de imagen"
                    value={imageForm.image_url}
                    onChange={(e) => setImageForm({ ...imageForm, image_url: e.target.value })}
                  />
                  <input
                    className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                    placeholder="Texto alternativo"
                    value={imageForm.alt_text}
                    onChange={(e) => setImageForm({ ...imageForm, alt_text: e.target.value })}
                  />
                  <input
                    type="number"
                    className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3"
                    placeholder="Orden"
                    value={imageForm.sort_order}
                    onChange={(e) => setImageForm({ ...imageForm, sort_order: Number(e.target.value) })}
                  />
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
                  {images.map((image) => (
                    <div
                      key={image.id}
                      className="flex flex-col gap-4 rounded-3xl border border-[#efe6d5] bg-white p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <img
                          src={image.image_url}
                          alt={image.alt_text || 'Imagen'}
                          className="h-20 w-20 rounded-2xl object-cover"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-[#143047]">{image.products?.name || 'Producto'}</p>
                          <p className="truncate text-sm text-[#4e6475]">{image.image_url}</p>
                          <p className="text-xs text-[#6d7e8b]">
                            Alt: {image.alt_text || '—'} · Orden: {image.sort_order}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingImageId(image.id)
                            setImageForm({
                              product_id: image.product_id,
                              image_url: image.image_url || '',
                              alt_text: image.alt_text || '',
                              sort_order: image.sort_order || 0,
                            })
                          }}
                          className="rounded-full border border-[#d8cdb8] px-3 py-1 text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteRow(`/api/admin/product-images/${image.id}`, 'la imagen')}
                          className="rounded-full border border-[#efc0b8] px-3 py-1 text-sm text-[#b34f42]"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
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