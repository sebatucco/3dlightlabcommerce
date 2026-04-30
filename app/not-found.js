import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5efe3] px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5e89a6]">Página no encontrada</p>
      <h1 className="mt-4 font-display text-8xl font-extrabold text-[#143047]">404</h1>
      <p className="mt-4 max-w-md text-base text-[#4e6475]">
        La página que buscás no existe o fue movida. Volvé al inicio para seguir explorando nuestros productos.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-[#143047] px-8 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#214a69]"
      >
        Volver al catálogo
      </Link>
    </div>
  )
}
