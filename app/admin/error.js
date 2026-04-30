'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function AdminError({ error, reset }) {
  useEffect(() => {
    console.error('Admin error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5efe3] px-4">
      <div className="w-full max-w-xl rounded-3xl border border-[#e6dcc8] bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e89a6]">Panel interno</p>
        <h1 className="mt-3 text-3xl font-extrabold text-[#143047]">No pudimos cargar el panel</h1>
        <p className="mt-3 text-sm text-[#4e6475]">
          Ocurrió un error inesperado en administración.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => reset()}
            className="rounded-full bg-[#143047] px-6 py-3 text-sm font-semibold text-white"
          >
            Reintentar
          </button>
          <Link
            href="/admin"
            className="rounded-full border border-[#d8cdb8] px-6 py-3 text-sm font-semibold text-[#143047]"
          >
            Volver al dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
