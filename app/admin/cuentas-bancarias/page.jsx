'use client'

import { useEffect, useState } from 'react'
import {
    Building2,
    Check,
    Edit3,
    Plus,
    Power,
    PowerOff,
    RefreshCw,
    Trash2,
    X,
} from 'lucide-react'

const ACCOUNT_TYPES = [
    { value: 'cuenta_corriente', label: 'Cuenta Corriente' },
    { value: 'caja_ahorro', label: 'Caja de Ahorro' },
    { value: 'cuenta_virtual', label: 'Cuenta Virtual / CVU' },
]

function Badge({ children, variant = 'default' }) {
    const styles = {
        default: 'bg-[#f3efe7] text-[#143047] border-[#e4d8c5]',
        success: 'bg-[#ecf8f4] text-[#0f6d5f] border-[#bfe7d9]',
        warning: 'bg-[#fff7e8] text-[#9a6700] border-[#f0d9a7]',
        danger: 'bg-[#fff1ef] text-[#b44a42] border-[#f2c7c2]',
    }

    return (
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${styles[variant] || styles.default}`}>
            {children}
        </span>
    )
}

const emptyForm = {
    bank_name: '',
    holder_name: '',
    cbu: '',
    alias: '',
    cuit: '',
    account_type: 'cuenta_corriente',
    sort_order: 0,
}

export default function AdminCuentasBancariasPage() {
    const [accounts, setAccounts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [form, setForm] = useState({ ...emptyForm })
    const [saving, setSaving] = useState(false)
    const [togglingId, setTogglingId] = useState(null)
    const [deletingId, setDeletingId] = useState(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState(null)

    const loadAccounts = async () => {
        try {
            setError('')
            setLoading(true)

            const response = await fetch('/api/admin/bank-accounts', { cache: 'no-store' })
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudieron cargar las cuentas')
            }

            setAccounts(Array.isArray(data) ? data : [])
        } catch (err) {
            setError(err.message || 'Error cargando cuentas bancarias')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadAccounts()
    }, [])

    const showSuccessMessage = (message) => {
        setSuccess(message)
        setTimeout(() => setSuccess(''), 3000)
    }

    const handleOpenCreate = () => {
        setEditingId(null)
        setForm({ ...emptyForm })
        setShowForm(true)
    }

    const handleOpenEdit = (account) => {
        setEditingId(account.id)
        setForm({
            bank_name: account.bank_name || '',
            holder_name: account.holder_name || '',
            cbu: account.cbu || '',
            alias: account.alias || '',
            cuit: account.cuit || '',
            account_type: account.account_type || 'cuenta_corriente',
            sort_order: account.sort_order ?? 0,
        })
        setShowForm(true)
    }

    const handleCloseForm = () => {
        setShowForm(false)
        setEditingId(null)
        setForm({ ...emptyForm })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (saving) return

        setSaving(true)
        setError('')

        try {
            const url = editingId
                ? `/api/admin/bank-accounts/${editingId}`
                : '/api/admin/bank-accounts'

            const method = editingId ? 'PATCH' : 'POST'

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo guardar la cuenta')
            }

            handleCloseForm()
            await loadAccounts()
            showSuccessMessage(editingId ? 'Cuenta actualizada correctamente' : 'Cuenta creada correctamente')
        } catch (err) {
            setError(err.message || 'Error guardando cuenta bancaria')
        } finally {
            setSaving(false)
        }
    }

    const handleToggleActive = async (account) => {
        try {
            setTogglingId(account.id)
            setError('')

            const response = await fetch(`/api/admin/bank-accounts/${account.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !account.active }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo cambiar el estado')
            }

            await loadAccounts()
            showSuccessMessage(
                account.active
                    ? 'Cuenta desactivada — ya no se mostrará en el checkout'
                    : 'Cuenta activada — se mostrará en el checkout'
            )
        } catch (err) {
            setError(err.message || 'Error cambiando estado')
        } finally {
            setTogglingId(null)
        }
    }

    const handleDelete = async (accountId) => {
        try {
            setDeletingId(accountId)
            setError('')

            const response = await fetch(`/api/admin/bank-accounts/${accountId}`, {
                method: 'DELETE',
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo eliminar la cuenta')
            }

            setConfirmDeleteId(null)
            await loadAccounts()
            showSuccessMessage('Cuenta eliminada correctamente')
        } catch (err) {
            setError(err.message || 'Error eliminando cuenta')
        } finally {
            setDeletingId(null)
        }
    }

    const handleFieldChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }))
    }

    return (
        <main className="min-h-screen bg-[#f5efe3] text-[#143047]">
            <div className="container mx-auto px-4 py-10">
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5e89a6]">
                            Administración
                        </p>
                        <h1 className="mt-2 text-4xl font-extrabold">Cuentas Bancarias</h1>
                        <p className="mt-2 text-sm text-[#4e6475]">
                            Gestioná las cuentas bancarias que se muestran en el checkout para transferencias.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={loadAccounts}
                            className="inline-flex items-center gap-2 rounded-full border border-[#d8cdb8] bg-white px-5 py-3 text-sm font-semibold text-[#143047] hover:bg-[#f8f3ea]"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Actualizar
                        </button>

                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 rounded-full bg-[#143047] px-5 py-3 text-sm font-semibold text-white hover:bg-[#214a69]"
                        >
                            <Plus className="h-4 w-4" />
                            Nueva cuenta
                        </button>
                    </div>
                </div>

                {error ? (
                    <div className="mb-6 rounded-3xl border border-[#f2c7c2] bg-[#fff1ef] px-5 py-4 text-sm text-[#b44a42]">
                        {error}
                    </div>
                ) : null}

                {success ? (
                    <div className="mb-6 rounded-3xl border border-[#bfe7d9] bg-[#ecf8f4] px-5 py-4 text-sm text-[#0f6d5f]">
                        <Check className="mr-2 inline h-4 w-4" />
                        {success}
                    </div>
                ) : null}

                {/* Form modal */}
                {showForm ? (
                    <div className="mb-8 rounded-[34px] border border-[#d8cdb8] bg-white p-6 shadow-[0_18px_50px_rgba(20,48,71,0.08)]">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="flex items-center gap-2 text-2xl font-extrabold text-[#143047]">
                                <Building2 className="h-5 w-5" />
                                {editingId ? 'Editar cuenta bancaria' : 'Nueva cuenta bancaria'}
                            </h2>

                            <button
                                type="button"
                                onClick={handleCloseForm}
                                className="rounded-full border border-[#d8cdb8] p-2 text-[#6d7e8b] hover:bg-[#f8f3ea]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-[#143047]">
                                        Nombre del banco *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.bank_name}
                                        onChange={(e) => handleFieldChange('bank_name', e.target.value)}
                                        className="w-full rounded-2xl border border-[#d8cdb8] bg-[#f8f3ea] px-4 py-3 text-sm outline-none transition focus:border-[#5e89a6]"
                                        placeholder="Ej: Banco Galicia"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-[#143047]">
                                        Titular *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.holder_name}
                                        onChange={(e) => handleFieldChange('holder_name', e.target.value)}
                                        className="w-full rounded-2xl border border-[#d8cdb8] bg-[#f8f3ea] px-4 py-3 text-sm outline-none transition focus:border-[#5e89a6]"
                                        placeholder="Nombre del titular"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-[#143047]">
                                        CBU / CVU *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={form.cbu}
                                        onChange={(e) => handleFieldChange('cbu', e.target.value)}
                                        className="w-full rounded-2xl border border-[#d8cdb8] bg-[#f8f3ea] px-4 py-3 text-sm outline-none transition focus:border-[#5e89a6]"
                                        placeholder="0000000000000000000000"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-[#143047]">
                                        Alias
                                    </label>
                                    <input
                                        type="text"
                                        value={form.alias}
                                        onChange={(e) => handleFieldChange('alias', e.target.value)}
                                        className="w-full rounded-2xl border border-[#d8cdb8] bg-[#f8f3ea] px-4 py-3 text-sm outline-none transition focus:border-[#5e89a6]"
                                        placeholder="MI.ALIAS.MP"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-[#143047]">
                                        CUIT
                                    </label>
                                    <input
                                        type="text"
                                        value={form.cuit}
                                        onChange={(e) => handleFieldChange('cuit', e.target.value)}
                                        className="w-full rounded-2xl border border-[#d8cdb8] bg-[#f8f3ea] px-4 py-3 text-sm outline-none transition focus:border-[#5e89a6]"
                                        placeholder="20-12345678-9"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-[#143047]">
                                        Tipo de cuenta
                                    </label>
                                    <select
                                        value={form.account_type}
                                        onChange={(e) => handleFieldChange('account_type', e.target.value)}
                                        className="w-full rounded-2xl border border-[#d8cdb8] bg-[#f8f3ea] px-4 py-3 text-sm outline-none transition focus:border-[#5e89a6]"
                                    >
                                        {ACCOUNT_TYPES.map((type) => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-[#143047]">
                                        Orden de visualización
                                    </label>
                                    <input
                                        type="number"
                                        value={form.sort_order}
                                        onChange={(e) => handleFieldChange('sort_order', Number(e.target.value) || 0)}
                                        className="w-full rounded-2xl border border-[#d8cdb8] bg-[#f8f3ea] px-4 py-3 text-sm outline-none transition focus:border-[#5e89a6]"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleCloseForm}
                                    className="rounded-full border border-[#d8cdb8] px-6 py-3 text-sm font-semibold text-[#143047] hover:bg-[#f8f3ea]"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 rounded-full bg-[#143047] px-6 py-3 text-sm font-semibold text-white hover:bg-[#214a69] disabled:opacity-60"
                                >
                                    {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear cuenta'}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : null}

                {/* Accounts list */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="rounded-3xl border border-[#d8cdb8] bg-white p-6 shadow-sm">
                            <p className="text-sm text-[#4e6475]">Cargando cuentas bancarias…</p>
                        </div>
                    ) : accounts.length === 0 ? (
                        <div className="rounded-3xl border border-[#d8cdb8] bg-white p-8 text-center shadow-sm">
                            <Building2 className="mx-auto h-12 w-12 text-[#b4a895]" />
                            <p className="mt-4 text-lg font-bold text-[#143047]">
                                No hay cuentas bancarias cargadas
                            </p>
                            <p className="mt-2 text-sm text-[#4e6475]">
                                Creá tu primera cuenta para que los clientes puedan pagar por transferencia.
                            </p>
                            <button
                                type="button"
                                onClick={handleOpenCreate}
                                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#143047] px-6 py-3 text-sm font-semibold text-white hover:bg-[#214a69]"
                            >
                                <Plus className="h-4 w-4" />
                                Crear cuenta bancaria
                            </button>
                        </div>
                    ) : (
                        accounts.map((account) => (
                            <div
                                key={account.id}
                                className={`rounded-3xl border p-5 shadow-sm transition ${
                                    account.active
                                        ? 'border-[#d8cdb8] bg-white'
                                        : 'border-[#e4d8c5] bg-[#faf6ee] opacity-75'
                                }`}
                            >
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-lg font-bold text-[#143047]">
                                                {account.bank_name}
                                            </p>
                                            <Badge variant={account.active ? 'success' : 'danger'}>
                                                {account.active ? 'Activa' : 'Inactiva'}
                                            </Badge>
                                            <Badge>
                                                {ACCOUNT_TYPES.find((t) => t.value === account.account_type)?.label || account.account_type}
                                            </Badge>
                                        </div>

                                        <div className="mt-3 grid gap-2 text-sm text-[#4e6475] sm:grid-cols-2 lg:grid-cols-3">
                                            <p>
                                                <span className="font-semibold text-[#143047]">Titular:</span>{' '}
                                                {account.holder_name}
                                            </p>
                                            <p>
                                                <span className="font-semibold text-[#143047]">CBU:</span>{' '}
                                                {account.cbu}
                                            </p>
                                            {account.alias ? (
                                                <p>
                                                    <span className="font-semibold text-[#143047]">Alias:</span>{' '}
                                                    {account.alias}
                                                </p>
                                            ) : null}
                                            {account.cuit ? (
                                                <p>
                                                    <span className="font-semibold text-[#143047]">CUIT:</span>{' '}
                                                    {account.cuit}
                                                </p>
                                            ) : null}
                                        </div>

                                        <p className="mt-2 text-xs text-[#6d7e8b]">
                                            Orden: {account.sort_order} · Creada: {account.created_at ? new Date(account.created_at).toLocaleDateString('es-AR') : '—'}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleActive(account)}
                                            disabled={togglingId === account.id}
                                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition disabled:opacity-60 ${
                                                account.active
                                                    ? 'border border-[#f0d9a7] bg-[#fff7e8] text-[#9a6700] hover:bg-[#fff1d6]'
                                                    : 'border border-[#bfe7d9] bg-[#ecf8f4] text-[#0f6d5f] hover:bg-[#ddf3ec]'
                                            }`}
                                            title={account.active ? 'Desactivar cuenta' : 'Activar cuenta'}
                                        >
                                            {account.active ? (
                                                <>
                                                    <PowerOff className="h-3.5 w-3.5" />
                                                    Desactivar
                                                </>
                                            ) : (
                                                <>
                                                    <Power className="h-3.5 w-3.5" />
                                                    Activar
                                                </>
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleOpenEdit(account)}
                                            className="inline-flex items-center gap-2 rounded-full border border-[#d8cdb8] bg-white px-4 py-2 text-xs font-semibold text-[#143047] hover:bg-[#f8f3ea]"
                                        >
                                            <Edit3 className="h-3.5 w-3.5" />
                                            Editar
                                        </button>

                                        {confirmDeleteId === account.id ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold text-[#b44a42]">¿Eliminar?</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(account.id)}
                                                    disabled={deletingId === account.id}
                                                    className="inline-flex items-center gap-1 rounded-full bg-[#b44a42] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                                                >
                                                    {deletingId === account.id ? 'Eliminando...' : 'Sí, eliminar'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    className="rounded-full border border-[#d8cdb8] px-3 py-1.5 text-xs font-semibold text-[#143047]"
                                                >
                                                    No
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setConfirmDeleteId(account.id)}
                                                className="inline-flex items-center gap-2 rounded-full border border-[#f2c7c2] bg-[#fff1ef] px-4 py-2 text-xs font-semibold text-[#b44a42] hover:bg-[#fee6e3]"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Eliminar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </main>
    )
}
