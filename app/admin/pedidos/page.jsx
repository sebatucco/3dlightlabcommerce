'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, RefreshCw, Search } from 'lucide-react'
import { formatPrice } from '@/lib/mercadopago'

function Badge({ children, variant = 'default' }) {
    const styles = {
        default: 'bg-[#f3efe7] text-[#143047] border-[#e4d8c5]',
        success: 'bg-[#ecf8f4] text-[#0f6d5f] border-[#bfe7d9]',
        warning: 'bg-[#fff7e8] text-[#9a6700] border-[#f0d9a7]',
        danger: 'bg-[#fff1ef] text-[#b44a42] border-[#f2c7c2]',
        info: 'bg-[#eef4f8] text-[#2d5d7b] border-[#c8dceb]',
    }

    return (
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles[variant] || styles.default}`}>
            {children}
        </span>
    )
}

function getOrderStatusVariant(status) {
    if (status === 'approved') return 'success'
    if (status === 'pending') return 'warning'
    if (status === 'cancelled' || status === 'rejected') return 'danger'
    return 'default'
}

function getShippingStatusVariant(status) {
    if (status === 'delivered') return 'success'
    if (status === 'shipped') return 'info'
    if (status === 'preparing') return 'warning'
    if (status === 'cancelled') return 'danger'
    return 'default'
}

function formatDate(value) {
    if (!value) return '—'
    try {
        return new Date(value).toLocaleString('es-AR')
    } catch {
        return value
    }
}

function normalizeText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
}

export default function AdminPedidosPage() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [selectedOrderLoading, setSelectedOrderLoading] = useState(false)
    const [updatingId, setUpdatingId] = useState(null)
    const [error, setError] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [paymentFilter, setPaymentFilter] = useState('all')
    const [shippingFilter, setShippingFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')

    const loadOrders = async () => {
        try {
            setError('')
            setLoading(true)

            const response = await fetch('/api/admin/orders', { cache: 'no-store' })
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudieron cargar los pedidos')
            }

            setOrders(Array.isArray(data) ? data : [])
        } catch (err) {
            setError(err.message || 'Error cargando pedidos')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadOrders()
    }, [])

    const loadOrderDetail = async (orderId) => {
        try {
            setSelectedOrderLoading(true)

            const response = await fetch(`/api/orders/${orderId}`, { cache: 'no-store' })
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo cargar el detalle')
            }

            setSelectedOrder(data)
        } catch (err) {
            setError(err.message || 'Error cargando el detalle')
        } finally {
            setSelectedOrderLoading(false)
        }
    }

    const handleSelectOrder = async (order) => {
        setSelectedOrder(order)
        await loadOrderDetail(order.id)
    }

    const handleApproveTransfer = async (order) => {
        try {
            setUpdatingId(order.id)
            setError('')

            const response = await fetch(`/api/orders/${order.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'approved' }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo aprobar la transferencia')
            }

            await loadOrders()

            if (selectedOrder?.id === order.id) {
                await loadOrderDetail(order.id)
            }
        } catch (err) {
            setError(err.message || 'Error aprobando transferencia')
        } finally {
            setUpdatingId(null)
        }
    }

    const handleShippingStatusChange = async (order, shippingStatus) => {
        try {
            setUpdatingId(order.id)
            setError('')

            const response = await fetch(`/api/orders/${order.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shipping_status: shippingStatus }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo actualizar el envío')
            }

            await loadOrders()

            if (selectedOrder?.id === order.id) {
                await loadOrderDetail(order.id)
            }
        } catch (err) {
            setError(err.message || 'Error actualizando envío')
        } finally {
            setUpdatingId(null)
        }
    }

    const enrichedOrders = useMemo(() => {
        return orders.map((order) => {
            const isExpired =
                order.status === 'pending' &&
                order.payment_method === 'transferencia' &&
                order.expires_at &&
                new Date(order.expires_at) < new Date()

            return { ...order, isExpired }
        })
    }, [orders])

    const filteredOrders = useMemo(() => {
        const term = normalizeText(searchTerm)

        return enrichedOrders.filter((order) => {
            const statusMatch = statusFilter === 'all' || order.status === statusFilter
            const paymentMatch = paymentFilter === 'all' || order.payment_method === paymentFilter
            const shippingMatch = shippingFilter === 'all' || order.shipping_status === shippingFilter

            if (!term) {
                return statusMatch && paymentMatch && shippingMatch
            }

            const haystack = normalizeText([
                order.customer_name,
                order.customer_last_name,
                order.customer_phone,
                order.customer_email,
                order.customer_dni,
                order.external_reference,
            ]
                .filter(Boolean)
                .join(' '))

            return statusMatch && paymentMatch && shippingMatch && haystack.includes(term)
        })
    }, [enrichedOrders, statusFilter, paymentFilter, shippingFilter, searchTerm])

    return (
        <main className="min-h-screen bg-[#f5efe3] text-[#143047]">
            <div className="container mx-auto px-4 py-10">
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5e89a6]">
                            Administración
                        </p>
                        <h1 className="mt-2 text-4xl font-extrabold">Pedidos</h1>
                    </div>

                    <button
                        type="button"
                        onClick={loadOrders}
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

                <div className="mb-6 grid gap-4 rounded-3xl border border-[#d8cdb8] bg-white p-5 shadow-sm lg:grid-cols-[1.2fr_repeat(3,minmax(0,1fr))]">
                    <label className="flex items-center gap-3 rounded-2xl border border-[#e7dbc7] bg-[#faf6ee] px-4 py-3">
                        <Search className="h-4 w-4 text-[#5e89a6]" />
                        <input
                            type="text"
                            placeholder="Buscar por DNI, apellido, nombre, email o referencia"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-transparent text-sm outline-none"
                        />
                    </label>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-2xl border border-[#e7dbc7] bg-[#faf6ee] px-4 py-3 text-sm outline-none"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="pending">Pendiente</option>
                        <option value="approved">Aprobado</option>
                        <option value="cancelled">Cancelado</option>
                        <option value="rejected">Rechazado</option>
                    </select>

                    <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className="rounded-2xl border border-[#e7dbc7] bg-[#faf6ee] px-4 py-3 text-sm outline-none"
                    >
                        <option value="all">Todos los pagos</option>
                        <option value="mercadopago">Mercado Pago</option>
                        <option value="transferencia">Transferencia</option>
                        <option value="whatsapp">WhatsApp</option>
                    </select>

                    <select
                        value={shippingFilter}
                        onChange={(e) => setShippingFilter(e.target.value)}
                        className="rounded-2xl border border-[#e7dbc7] bg-[#faf6ee] px-4 py-3 text-sm outline-none"
                    >
                        <option value="all">Todos los envíos</option>
                        <option value="pending">Pendiente</option>
                        <option value="preparing">Preparando</option>
                        <option value="shipped">Enviado</option>
                        <option value="delivered">Entregado</option>
                        <option value="cancelled">Cancelado</option>
                    </select>
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)]">
                    <div className="space-y-4">
                        {loading ? (
                            <div className="rounded-3xl border border-[#d8cdb8] bg-white p-6 shadow-sm">
                                <p className="text-sm text-[#4e6475]">Cargando pedidos…</p>
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="rounded-3xl border border-[#d8cdb8] bg-white p-6 shadow-sm">
                                <p className="text-sm text-[#4e6475]">No hay pedidos para los filtros aplicados.</p>
                            </div>
                        ) : (
                            filteredOrders.map((order) => {
                                const isSelected = selectedOrder?.id === order.id
                                const canApprove =
                                    order.payment_method === 'transferencia' &&
                                    order.status === 'pending' &&
                                    !order.isExpired

                                return (
                                    <button
                                        key={order.id}
                                        type="button"
                                        onClick={() => handleSelectOrder(order)}
                                        className={`w-full rounded-3xl border p-5 text-left shadow-sm transition ${isSelected
                                            ? 'border-[#143047] bg-[#eef4f8]'
                                            : 'border-[#d8cdb8] bg-white hover:bg-[#faf6ee]'
                                            }`}
                                    >
                                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-lg font-bold text-[#143047]">{order.customer_name}</p>
                                                    <Badge variant={getOrderStatusVariant(order.status)}>
                                                        {order.status}
                                                    </Badge>
                                                    <Badge variant={getShippingStatusVariant(order.shipping_status)}>
                                                        {order.shipping_status || 'pending'}
                                                    </Badge>
                                                </div>

                                                <p className="mt-2 text-sm text-[#4e6475]">
                                                    {order.customer_phone} · {order.customer_email || 'sin email'}
                                                </p>

                                                <p className="mt-1 text-xs text-[#6d7e8b]">
                                                    DNI: {order.customer_dni || '—'} · Pago: {order.payment_method || '—'}
                                                </p>

                                                <p className="mt-1 text-xs text-[#6d7e8b]">
                                                    Ref: {order.external_reference || order.id}
                                                </p>

                                                {order.isExpired ? (
                                                    <p className="mt-2 text-xs font-semibold text-[#b44a42]">
                                                        Transferencia vencida
                                                    </p>
                                                ) : null}
                                            </div>

                                            <div className="flex flex-col items-start gap-3 md:items-end">
                                                <p className="text-xl font-extrabold text-[#143047]">
                                                    {formatPrice(Number(order.total || 0))}
                                                </p>

                                                {canApprove ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleApproveTransfer(order)
                                                        }}
                                                        disabled={updatingId === order.id}
                                                        className="inline-flex items-center gap-2 rounded-full bg-[#143047] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        Aprobar transferencia
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })
                        )}
                    </div>

                    <div className="rounded-3xl border border-[#d8cdb8] bg-white p-6 shadow-sm">
                        {!selectedOrder ? (
                            <div className="flex h-full min-h-[320px] items-center justify-center text-center text-sm text-[#6d7e8b]">
                                Seleccioná un pedido para ver el detalle completo.
                            </div>
                        ) : selectedOrderLoading ? (
                            <div className="flex h-full min-h-[320px] items-center justify-center text-center text-sm text-[#6d7e8b]">
                                Cargando detalle…
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="text-2xl font-extrabold text-[#143047]">
                                            Pedido {selectedOrder.external_reference || selectedOrder.id}
                                        </h2>
                                        <Badge variant={getOrderStatusVariant(selectedOrder.status)}>
                                            {selectedOrder.status}
                                        </Badge>
                                        <Badge variant={getShippingStatusVariant(selectedOrder.shipping_status)}>
                                            {selectedOrder.shipping_status || 'pending'}
                                        </Badge>
                                    </div>
                                    <p className="mt-2 text-sm text-[#6d7e8b]">
                                        Creado: {formatDate(selectedOrder.created_at)}
                                    </p>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="rounded-2xl bg-[#faf6ee] p-4">
                                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e89a6]">
                                            Cliente
                                        </p>
                                        <div className="mt-3 space-y-2 text-sm text-[#143047]">
                                            <p><b>Nombre:</b> {selectedOrder.customer_name || '—'}</p>
                                            <p><b>Apellido:</b> {selectedOrder.customer_last_name || '—'}</p>
                                            <p><b>DNI:</b> {selectedOrder.customer_dni || '—'}</p>
                                            <p><b>Teléfono:</b> {selectedOrder.customer_phone || '—'}</p>
                                            <p><b>Email:</b> {selectedOrder.customer_email || '—'}</p>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl bg-[#faf6ee] p-4">
                                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e89a6]">
                                            Entrega
                                        </p>
                                        <div className="mt-3 space-y-2 text-sm text-[#143047]">
                                            <p><b>Método:</b> {selectedOrder.shipping_method || '—'}</p>
                                            <p><b>Dirección:</b> {selectedOrder.address || '—'}</p>
                                            <p><b>Calle:</b> {selectedOrder.shipping_street || '—'} {selectedOrder.shipping_number || ''}</p>
                                            <p><b>Piso/Depto:</b> {[selectedOrder.shipping_floor, selectedOrder.shipping_apartment].filter(Boolean).join(' / ') || '—'}</p>
                                            <p><b>Ciudad:</b> {selectedOrder.shipping_city || '—'}</p>
                                            <p><b>Provincia:</b> {selectedOrder.shipping_province || '—'}</p>
                                            <p><b>CP:</b> {selectedOrder.shipping_postal_code || '—'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-[#faf6ee] p-4">
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e89a6]">
                                        Pago
                                    </p>
                                    <div className="mt-3 space-y-2 text-sm text-[#143047]">
                                        <p><b>Método:</b> {selectedOrder.payment_method || '—'}</p>
                                        <p><b>Total:</b> {formatPrice(Number(selectedOrder.total || 0))}</p>
                                        <p><b>Pagado:</b> {formatDate(selectedOrder.paid_at)}</p>
                                        <p><b>Vence:</b> {formatDate(selectedOrder.expires_at)}</p>
                                        <p><b>Cancelado:</b> {formatDate(selectedOrder.cancelled_at)}</p>
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-[#faf6ee] p-4">
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e89a6]">
                                        Items
                                    </p>
                                    <div className="mt-3 space-y-3">
                                        {(selectedOrder.order_items || []).length === 0 ? (
                                            <p className="text-sm text-[#6d7e8b]">No hay items cargados.</p>
                                        ) : (
                                            selectedOrder.order_items.map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="rounded-2xl border border-[#e7dbc7] bg-white px-4 py-3 text-sm"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <p className="font-semibold text-[#143047]">
                                                                {item.products?.name || item.product_name || 'Producto'}
                                                            </p>
                                                            <p className="mt-1 text-xs text-[#6d7e8b]">
                                                                SKU: {item.products?.sku || '—'}
                                                            </p>
                                                        </div>

                                                        <div className="text-right">
                                                            <p className="font-semibold text-[#143047]">
                                                                {formatPrice(Number(item.unit_price || 0))}
                                                            </p>
                                                            <p className="mt-1 text-xs text-[#6d7e8b]">
                                                                Cantidad: {item.quantity}
                                                            </p>

                                                            {/* opcional pero MUY recomendado */}
                                                            <p className="mt-1 text-xs text-[#6d7e8b]">
                                                                Subtotal: {formatPrice(Number(item.subtotal || 0))}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-2xl bg-[#faf6ee] p-4">
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e89a6]">
                                        Notas
                                    </p>
                                    <p className="mt-3 text-sm text-[#143047]">
                                        {selectedOrder.customer_notes || selectedOrder.notes || 'Sin notas del cliente.'}
                                    </p>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    {selectedOrder.payment_method === 'transferencia' ? (
                                        <button
                                            type="button"
                                            onClick={() => handleApproveTransfer(selectedOrder)}
                                            disabled={
                                                updatingId === selectedOrder.id ||
                                                selectedOrder.status !== 'pending'
                                            }
                                            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#143047] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                            Aprobar transferencia
                                        </button>
                                    ) : (
                                        <div className="rounded-full border border-[#d8cdb8] px-5 py-3 text-center text-sm text-[#6d7e8b]">
                                            Este pedido no requiere aprobación manual de pago.
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2">
                                        {['pending', 'preparing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                                            <button
                                                key={status}
                                                type="button"
                                                onClick={() => handleShippingStatusChange(selectedOrder, status)}
                                                disabled={updatingId === selectedOrder.id}
                                                className={`rounded-full px-4 py-2 text-xs font-semibold ${selectedOrder.shipping_status === status
                                                    ? 'bg-[#143047] text-white'
                                                    : 'border border-[#d8cdb8] bg-white text-[#143047]'
                                                    } disabled:opacity-50`}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    )
}