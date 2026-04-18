'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock3, PackageCheck, RefreshCw, Truck, XCircle } from 'lucide-react'
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

export default function AdminPedidosPage() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [selectedOrderLoading, setSelectedOrderLoading] = useState(false)
    const [updatingId, setUpdatingId] = useState(null)
    const [error, setError] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [paymentFilter, setPaymentFilter] = useState('all')


    const loadOrders = async () => {
        try {
            setError('')
            setLoading(true)

            const response = await fetch('/api/orders', { cache: 'no-store' })
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
                body: JSON.stringify({
                    status: 'approved',
                }),
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
                body: JSON.stringify({
                    shipping_status: shippingStatus,
                }),
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
        return enrichedOrders.filter((order) => {
            const statusMatch = statusFilter === 'all' || order.status === statusFilter
            const paymentMatch = paymentFilter === 'all' || order.payment_method === paymentFilter
            return statusMatch && paymentMatch
        })
    }, [enrichedOrders, statusFilter, paymentFilter])

    const metrics = useMemo(() => {
        const pendingCount = enrichedOrders.filter((o) => o.status === 'pending').length
        const approvedCount = enrichedOrders.filter((o) => o.status === 'approved').length
        const expiredTransfers = enrichedOrders.filter((o) => o.isExpired).length
        const totalRevenue = enrichedOrders
            .filter((o) => o.status === 'approved')
            .reduce((acc, o) => acc + Number(o.total || 0), 0)

        return {
            pendingCount,
            approvedCount,
            expiredTransfers,
            totalRevenue,
        }
    }, [enrichedOrders])

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

                <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-3xl border border-[#d8cdb8] bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e89a6]">
                            Pedidos pendientes
                        </p>
                        <p className="mt-2 text-3xl font-extrabold text-[#143047]">{metrics.pendingCount}</p>
                    </div>

                    <div className="rounded-3xl border border-[#d8cdb8] bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e89a6]">
                            Pedidos aprobados
                        </p>
                        <p className="mt-2 text-3xl font-extrabold text-[#143047]">{metrics.approvedCount}</p>
                    </div>

                    <div className="rounded-3xl border border-[#d8cdb8] bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e89a6]">
                            Transferencias vencidas
                        </p>
                        <p className="mt-2 text-3xl font-extrabold text-[#143047]">{metrics.expiredTransfers}</p>
                    </div>

                    <div className="rounded-3xl border border-[#d8cdb8] bg-white p-5 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e89a6]">
                            Total vendido
                        </p>
                        <p className="mt-2 text-3xl font-extrabold text-[#143047]">
                            {formatPrice(metrics.totalRevenue)}
                        </p>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                    <section className="rounded-[34px] border border-[#d8cdb8] bg-white p-6 shadow-[0_18px_50px_rgba(20,48,71,0.08)]">

                        <h2 className="text-2xl font-extrabold">Listado</h2>

                        <div className="mt-6 grid gap-3 md:grid-cols-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="rounded-2xl border border-[#d8cdb8] bg-[#f8f3ea] px-4 py-3 text-sm text-[#143047] outline-none"
                            >
                                <option value="all">Todos los estados</option>
                                <option value="pending">Pendientes</option>
                                <option value="approved">Aprobados</option>
                                <option value="cancelled">Cancelados</option>
                                <option value="rejected">Rechazados</option>
                            </select>

                            <select
                                value={paymentFilter}
                                onChange={(e) => setPaymentFilter(e.target.value)}
                                className="rounded-2xl border border-[#d8cdb8] bg-[#f8f3ea] px-4 py-3 text-sm text-[#143047] outline-none"
                            >
                                <option value="all">Todos los medios de pago</option>
                                <option value="mercadopago">Mercado Pago</option>
                                <option value="transferencia">Transferencia</option>
                                <option value="whatsapp">WhatsApp</option>
                            </select>
                        </div>

                        {loading ? (
                            <div className="mt-6 text-sm text-[#4e6475]">Cargando pedidos...</div>
                        ) : enrichedOrders.length === 0 ? (
                            <div className="mt-6 text-sm text-[#4e6475]">No hay pedidos todavía.</div>
                        ) : (
                            <div className="mt-6 space-y-4">
                                {enrichedOrders.map((order) => (
                                    <button
                                        key={order.id}
                                        type="button"
                                        onClick={() => handleSelectOrder(order)}
                                        className={`w-full rounded-3xl border p-5 text-left transition ${selectedOrder?.id === order.id
                                            ? 'border-[#143047] bg-[#eef4f8]'
                                            : 'border-[#e4d8c5] bg-[#fcfaf6] hover:bg-white'
                                            }`}
                                    >
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="space-y-2">
                                                <p className="text-sm font-bold uppercase tracking-[0.12em] text-[#5e89a6]">
                                                    Pedido
                                                </p>
                                                <p className="font-extrabold">{order.id}</p>
                                                <p className="text-sm text-[#4e6475]">
                                                    {order.customer_name || 'Sin nombre'} · {order.customer_phone || 'Sin teléfono'}
                                                </p>
                                                <p className="text-sm text-[#4e6475]">
                                                    {formatDate(order.created_at)}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <Badge variant={getOrderStatusVariant(order.status)}>
                                                    {order.status || 'pending'}
                                                </Badge>

                                                <Badge variant={getShippingStatusVariant(order.shipping_status)}>
                                                    envío: {order.shipping_status || 'pending'}
                                                </Badge>

                                                <Badge variant="info">
                                                    {order.payment_method || '—'}
                                                </Badge>

                                                {order.shipping_free ? (
                                                    <Badge variant="success">envío gratis</Badge>
                                                ) : (
                                                    <Badge>envío pago</Badge>
                                                )}

                                                {order.isExpired ? (
                                                    <Badge variant="danger">vencido</Badge>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#4e6475]">
                                            <span>Total: {formatPrice(order.total)}</span>
                                            <span>Envío: {formatPrice(order.shipping_cost || 0)}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>

                    <aside className="rounded-[34px] border border-[#d8cdb8] bg-white p-6 shadow-[0_18px_50px_rgba(20,48,71,0.08)]">
                        <h2 className="text-2xl font-extrabold">Detalle</h2>

                        {!selectedOrder ? (
                            <div className="mt-6 text-sm text-[#4e6475]">
                                Seleccioná un pedido para ver el detalle.
                            </div>
                        ) : selectedOrderLoading ? (
                            <div className="mt-6 text-sm text-[#4e6475]">
                                Cargando detalle...
                            </div>
                        ) : (
                            <div className="mt-6 space-y-6">
                                <div className="rounded-3xl bg-[#f8f3ea] p-5">
                                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e89a6]">
                                        Pedido
                                    </p>
                                    <p className="mt-2 break-all text-sm font-bold">{selectedOrder.id}</p>
                                </div>

                                <div className="grid gap-4">
                                    <div className="rounded-3xl border border-[#e4d8c5] p-5">
                                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e89a6]">
                                            Cliente
                                        </p>
                                        <p className="mt-2 text-sm font-semibold">{selectedOrder.customer_name || '—'}</p>
                                        <p className="mt-1 text-sm text-[#4e6475]">{selectedOrder.customer_phone || '—'}</p>
                                        <p className="mt-1 text-sm text-[#4e6475]">{selectedOrder.customer_email || '—'}</p>
                                    </div>

                                    <div className="rounded-3xl border border-[#e4d8c5] p-5">
                                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e89a6]">
                                            Pago
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Badge variant={getOrderStatusVariant(selectedOrder.status)}>
                                                {selectedOrder.status || 'pending'}
                                            </Badge>
                                            <Badge variant="info">
                                                {selectedOrder.payment_method || '—'}
                                            </Badge>
                                        </div>

                                        <div className="mt-4 space-y-2 text-sm text-[#4e6475]">
                                            <p>Total: {formatPrice(selectedOrder.total)}</p>
                                            <p>Creado: {formatDate(selectedOrder.created_at)}</p>
                                            <p>Pagado: {formatDate(selectedOrder.paid_at)}</p>
                                            <p>Vence: {formatDate(selectedOrder.expires_at)}</p>
                                        </div>

                                        {selectedOrder.payment_method === 'transferencia' && selectedOrder.status === 'pending' ? (
                                            <button
                                                type="button"
                                                onClick={() => handleApproveTransfer(selectedOrder)}
                                                disabled={updatingId === selectedOrder.id}
                                                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#143047] px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white hover:bg-[#214a69] disabled:opacity-60"
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                                {updatingId === selectedOrder.id ? 'Procesando...' : 'Aprobar transferencia'}
                                            </button>
                                        ) : null}

                                        {selectedOrder.payment_method === 'transferencia' && selectedOrder.status === 'pending' ? (
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    try {
                                                        setUpdatingId(selectedOrder.id)
                                                        setError('')

                                                        const response = await fetch(`/api/orders/${selectedOrder.id}`, {
                                                            method: 'PATCH',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                status: 'cancelled',
                                                            }),
                                                        })

                                                        const data = await response.json()

                                                        if (!response.ok) {
                                                            throw new Error(data?.error || 'No se pudo cancelar la transferencia')
                                                        }

                                                        await loadOrders()
                                                        await loadOrderDetail(selectedOrder.id)
                                                    } catch (err) {
                                                        setError(err.message || 'Error cancelando transferencia')
                                                    } finally {
                                                        setUpdatingId(null)
                                                    }
                                                }}
                                                disabled={updatingId === selectedOrder.id}
                                                className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#f2c7c2] bg-[#fff1ef] px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-[#b44a42] hover:bg-[#ffe7e3] disabled:opacity-60"
                                            >
                                                <XCircle className="h-4 w-4" />
                                                {updatingId === selectedOrder.id ? 'Procesando...' : 'Cancelar transferencia'}
                                            </button>
                                        ) : null}
                                    </div>

                                    <div className="rounded-3xl border border-[#e4d8c5] p-5">
                                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e89a6]">
                                            Envío
                                        </p>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <Badge variant={getShippingStatusVariant(selectedOrder.shipping_status)}>
                                                {selectedOrder.shipping_status || 'pending'}
                                            </Badge>

                                            {selectedOrder.shipping_free ? (
                                                <Badge variant="success">sin cargo</Badge>
                                            ) : (
                                                <Badge>con cargo</Badge>
                                            )}
                                        </div>

                                        <div className="mt-4 space-y-2 text-sm text-[#4e6475]">
                                            <p>Método: {selectedOrder.shipping_method || '—'}</p>
                                            <p>Costo: {formatPrice(selectedOrder.shipping_cost || 0)}</p>
                                            <p>
                                                Dirección: {selectedOrder.shipping_street || '—'} {selectedOrder.shipping_number || ''}
                                            </p>
                                            <p>
                                                {selectedOrder.shipping_city || '—'}, {selectedOrder.shipping_province || '—'}
                                            </p>
                                        </div>

                                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                            {[
                                                { value: 'pending', label: 'Pendiente', icon: Clock3 },
                                                { value: 'preparing', label: 'Preparando', icon: PackageCheck },
                                                { value: 'shipped', label: 'Enviado', icon: Truck },
                                                { value: 'delivered', label: 'Entregado', icon: CheckCircle2 },
                                                { value: 'cancelled', label: 'Cancelado', icon: XCircle },
                                            ].map((option) => {
                                                const Icon = option.icon
                                                return (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        disabled={updatingId === selectedOrder.id}
                                                        onClick={() => handleShippingStatusChange(selectedOrder, option.value)}
                                                        className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d8cdb8] px-4 py-3 text-sm font-semibold text-[#143047] hover:bg-[#f8f3ea] disabled:opacity-60"
                                                    >
                                                        <Icon className="h-4 w-4" />
                                                        {option.label}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    <div className="rounded-3xl border border-[#e4d8c5] p-5">
                                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e89a6]">
                                            Items
                                        </p>

                                        <div className="mt-4 space-y-3">
                                            {(selectedOrder.order_items || []).map((item) => (
                                                <div key={`${item.order_id}-${item.product_id}`} className="rounded-2xl bg-[#f8f3ea] p-4">
                                                    <p className="font-semibold">{item.product_name}</p>
                                                    <div className="mt-1 text-sm text-[#4e6475]">
                                                        <p>Cantidad: {item.quantity}</p>
                                                        <p>Unitario: {formatPrice(item.unit_price)}</p>
                                                        <p>Subtotal: {formatPrice(item.subtotal)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </main>
    )
}