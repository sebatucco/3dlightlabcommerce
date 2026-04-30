'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5efe3] px-4 text-center">
      <h2 className="text-3xl font-extrabold text-[#143047]">Algo salió mal</h2>
      <p className="mt-3 max-w-md text-sm text-[#4e6475]">
        Ocurrió un error inesperado. Podés intentar de nuevo o volver al inicio.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => reset()}
          className="rounded-full border border-[#d8cdb8] bg-white px-6 py-3 text-sm font-semibold text-[#143047]"
        >
          Intentar de nuevo
        </button>
        <Link
          href="/"
          className="rounded-full bg-[#143047] px-6 py-3 text-sm font-semibold text-white"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
