'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminLoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })

      console.log('LOGIN DATA', data)
      console.log('SIGN IN ERROR', signInError)

      if (signInError || !data.session?.access_token) {
        setError(signInError?.message || 'No se pudo iniciar sesión en Supabase')
        return
      }

      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: data.session.access_token }),
      })

      const payload = await response.json().catch(() => ({}))

      console.log('ADMIN LOGIN STATUS', response.status)
      console.log('ADMIN LOGIN PAYLOAD', payload)

      if (!response.ok) {
        await supabase.auth.signOut()
        setError(payload.error || 'Tu usuario no tiene permisos de administrador')
        return
      }

      router.replace('/admin')
      router.refresh()
    } catch (err) {
      console.error('LOGIN ERROR:', err)
      setError('Ocurrió un error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f5efe3] px-4 py-10 text-[#143047]">
      <div className="mx-auto max-w-md rounded-[28px] border border-[#d8cdb8] bg-white p-8 shadow-[0_20px_45px_rgba(20,48,71,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5e89a6]">Panel interno</p>
        <h1 className="mt-3 font-display text-5xl uppercase leading-none">Acceso admin</h1>
        <p className="mt-4 text-sm leading-6 text-[#4e6475]">
          Ingresá con tu usuario de Supabase Auth. Sólo los perfiles con rol <strong>admin</strong> pueden entrar.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold">Email corporativo</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 outline-none transition focus:border-[#5e89a6]"
              placeholder="admin@tuempresa.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">Contraseña</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-2xl border border-[#d8cdb8] px-4 py-3 outline-none transition focus:border-[#5e89a6]"
              placeholder="••••••••"
            />
          </div>

          {error ? <p className="rounded-2xl bg-[#fff1ef] px-4 py-3 text-sm text-[#b34f42]">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#143047] px-5 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-[#214a69] disabled:opacity-60"
          >
            {loading ? 'Ingresando...' : 'Entrar al panel'}
          </button>
        </form>
      </div>
    </main>
  )
}
