'use client'

import { useEffect, useMemo, useState } from 'react'
import { Landmark, Power, RefreshCw, Trash2 } from 'lucide-react'

const initialForm = {
    bank_name: '',
    holder_name: '',
    cbu: '',
    alias: '',
    cuit: '',
    account_type: 'cuenta_corriente',
    sort_order: 0,
}

export default function AdminBankAccountsPage() {
    const [accounts, setAccounts] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [form, setForm] = useState(initialForm)

    async function loadAccounts() {
        try {
            setLoading(true)
            setError('')

            const response = await fetch('/api/admin/bank-accounts', { cache: 'no-store' })
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudieron obtener las cuentas bancarias')
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

    function resetForm() {
        setForm(initialForm)
        setEditingId(null)
    }

    function selectAccount(account) {
        setEditingId(account.id)
        setForm({
            bank_name: account.bank_name || '',
            holder_name: account.holder_name || '',
            cbu: account.cbu || '',
            alias: account.alias || '',
            cuit: account.cuit || '',
            account_type: account.account_type || 'cuenta_corriente',
            sort_order: Number(account.sort_order || 0),
        })
    }

    async function submitForm(e) {
        e.preventDefault()

        try {
            setSaving(true)
            setError('')
            setMessage('')

            const endpoint = editingId
                ? `/api/admin/bank-accounts/${editingId}`
                : '/api/admin/bank-accounts'

            const method = editingId ? 'PATCH' : 'POST'

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo guardar la cuenta bancaria')
            }

            setMessage(editingId ? 'Cuenta bancaria actualizada' : 'Cuenta bancaria creada')
            resetForm()
            await loadAccounts()
        } catch (err) {
            setError(err.message || 'Error guardando cuenta bancaria')
        } finally {
            setSaving(false)
        }
    }

    async function toggleActive(account) {
        try {
            setError('')
            setMessage('')

            const response = await fetch(`/api/admin/bank-accounts/${account.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !account.active }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo actualizar el estado')
            }

            setMessage(account.active ? 'Cuenta desactivada' : 'Cuenta activada')
            await loadAccounts()
        } catch (err) {
            setError(err.message || 'Error actualizando estado')
        }
    }

    async function deleteAccount(account) {
        const ok = window.confirm(`¿Dar de baja la cuenta "${account.bank_name}"?`)
        if (!ok) return

        try {
            setError('')
            setMessage('')

            const response = await fetch(`/api/admin/bank-accounts/${account.id}`, {
                method: 'DELETE',
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data?.error || 'No se pudo eliminar la cuenta')
            }

            setMessage('Cuenta bancaria dada de baja')
            if (editingId === account.id) {
                resetForm()
            }
            await loadAccounts()
        } catch (err) {
            setError(err.message || 'Error eliminando cuenta bancaria')
        }
    }

    return (
        <main className="min-h-screen bg-[#f5efe3] text-[#143047]">
            <div className="container mx-auto px-4 py-10">
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5e89a6]">
                            Administración
                        </p>
                        <h1 className="mt-2 text-4xl font-extrabold">Cuentas bancarias</h1>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => (window.location.href = '/admin')}
                            className="inline-flex items-center gap-2 rounded-full border border-[#d8cdb8] bg-white px-5 py-3 text-sm font-semibold text-[#143047] hover:bg-[#f8f3ea]"
                        >
                            ← Volver
                        </button>

                        <button
                            type="button"
                            onClick={loadAccounts}
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

                <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                    <form onSubmit={submitForm} className="space-y-4 rounded-3xl border border-[#d8cdb8] bg-white p-6 shadow-sm">
                        <div>
                            <h2 className="text-xl font-bold text-[#143047]">
                                {editingId ? 'Editar cuenta bancaria' : 'Nueva cuenta bancaria'}
                            </h2>
                            <p className="mt-1 text-sm text-[#6d7e8b]">
                                Cargá una o varias cuentas y activá solo las que querés mostrar.
                            </p>
                        </div>

                        <input
                            type="text"
                            placeholder="Banco"
                            value={form.bank_name}
                            onChange={(e) => setForm((prev) => ({ ...prev, bank_name: e.target.value }))}
                            className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                        />

                        <input
                            type="text"
                            placeholder="Titular"
                            value={form.holder_name}
                            onChange={(e) => setForm((prev) => ({ ...prev, holder_name: e.target.value }))}
                            className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                        />

                        <input
                            type="text"
                            placeholder="CBU / CVU"
                            value={form.cbu}
                            onChange={(e) => setForm((prev) => ({ ...prev, cbu: e.target.value }))}
                            className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                        />

                        <input
                            type="text"
                            placeholder="Alias"
                            value={form.alias}
                            onChange={(e) => setForm((prev) => ({ ...prev, alias: e.target.value }))}
                            className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                        />

                        <input
                            type="text"
                            placeholder="CUIT"
                            value={form.cuit}
                            onChange={(e) => setForm((prev) => ({ ...prev, cuit: e.target.value }))}
                            className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                        />

                        <select
                            value={form.account_type}
                            onChange={(e) => setForm((prev) => ({ ...prev, account_type: e.target.value }))}
                            className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                        >
                            <option value="cuenta_corriente">Cuenta corriente</option>
                            <option value="caja_ahorro">Caja de ahorro</option>
                            <option value="cuenta_virtual">Cuenta virtual</option>
                        </select>

                        <input
                            type="number"
                            placeholder="Orden"
                            value={form.sort_order}
                            onChange={(e) => setForm((prev) => ({ ...prev, sort_order: Number(e.target.value || 0) }))}
                            className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 text-sm outline-none"
                        />

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="submit"
                                disabled={saving}
                                className="rounded-full bg-[#143047] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {editingId ? 'Guardar cambios' : 'Crear cuenta'}
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
                                Cargando cuentas bancarias…
                            </div>
                        ) : accounts.length === 0 ? (
                            <div className="rounded-3xl border border-[#d8cdb8] bg-white p-6 text-sm text-[#6d7e8b]">
                                No hay cuentas bancarias cargadas.
                            </div>
                        ) : (
                            accounts.map((account) => (
                                <div
                                    key={account.id}
                                    className="rounded-3xl border border-[#d8cdb8] bg-white p-5 shadow-sm"
                                >
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-lg font-bold text-[#143047]">{account.bank_name}</p>
                                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${account.active
                                                        ? 'bg-[#ecf8f4] text-[#0f6d5f]'
                                                        : 'bg-[#fff1ef] text-[#b44a42]'
                                                    }`}>
                                                    {account.active ? 'Activa' : 'Inactiva'}
                                                </span>
                                            </div>

                                            <p className="mt-2 text-sm text-[#4e6475]">
                                                Titular: {account.holder_name}
                                            </p>
                                            <p className="mt-1 text-sm text-[#4e6475]">
                                                CBU/CVU: {account.cbu}
                                            </p>
                                            <p className="mt-1 text-sm text-[#4e6475]">
                                                Alias: {account.alias || '—'}
                                            </p>
                                            <p className="mt-1 text-sm text-[#4e6475]">
                                                CUIT: {account.cuit || '—'}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => selectAccount(account)}
                                                className="rounded-full border border-[#d8cdb8] bg-white px-4 py-2 text-sm font-semibold text-[#143047]"
                                            >
                                                Editar
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => toggleActive(account)}
                                                className="inline-flex items-center gap-2 rounded-full border border-[#d8cdb8] bg-white px-4 py-2 text-sm font-semibold text-[#143047]"
                                            >
                                                <Power className="h-4 w-4" />
                                                {account.active ? 'Desactivar' : 'Activar'}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => deleteAccount(account)}
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
