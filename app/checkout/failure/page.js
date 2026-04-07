'use client'

import { motion } from 'framer-motion'
import { XCircle, Home, RefreshCw, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import WhatsAppButton from '@/components/WhatsAppButton'
import CartDrawer from '@/components/CartDrawer'
import { siteConfig } from '@/lib/site'

export default function FailurePage() {
  return (
    <main className="min-h-screen bg-[#f5efe3] text-[#143047]">
      <Header />
      <CartDrawer />
      <WhatsAppButton />
      <div className="container mx-auto px-4 pb-16 pt-32">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-xl text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#fff1ef] text-[#b44a42]">
            <XCircle className="h-12 w-12" />
          </div>
          <h1 className="mt-8 font-display text-6xl uppercase leading-none text-[#143047]">Pago no completado</h1>
          <p className="mt-4 text-base leading-7 text-[#4e6475]">
            No se realizó el cargo. Podés volver a intentarlo o pedir asistencia.
          </p>

          <div className="mt-6 rounded-[34px] bg-white p-6 text-left shadow-[0_18px_50px_rgba(20,48,71,0.08)]">
            <h2 className="text-xl font-extrabold text-[#143047]">Posibles causas</h2>
            <ul className="mt-4 space-y-2 text-sm leading-7 text-[#4e6475]">
              <li>• Fondos insuficientes.</li>
              <li>• Datos del medio de pago incorrectos.</li>
              <li>• La operación fue rechazada por el emisor.</li>
            </ul>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="/checkout" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#143047] px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#214a69]">
              <RefreshCw className="h-4 w-4" />
              Intentar de nuevo
            </Link>
            <a
              href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent('Hola! Tuve un problema al pagar y necesito ayuda.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#22c55e] px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#16a34a]"
            >
              <MessageCircle className="h-4 w-4" />
              Pedir ayuda
            </a>
          </div>

          <Link href="/" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#5e89a6] hover:text-[#ef7d6b]">
            <Home className="h-4 w-4" />
            Volver al inicio
          </Link>
        </motion.div>
      </div>
      <Footer />
    </main>
  )
}
