'use client'

import { motion } from 'framer-motion'
import { Clock, Home, ShoppingBag, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import WhatsAppButton from '@/components/WhatsAppButton'
import CartDrawer from '@/components/CartDrawer'
import { siteConfig } from '@/lib/site'

export default function PendingPage() {
  return (
    <main className="min-h-screen bg-[#f5efe3] text-[#143047]">
      <Header />
      <CartDrawer />
      <WhatsAppButton />
      <div className="container mx-auto px-4 pb-16 pt-32">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-xl text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#fff9e9] text-[#c28a06]">
            <Clock className="h-12 w-12" />
          </div>
          <h1 className="mt-8 font-display text-6xl uppercase leading-none text-[#143047]">Pago pendiente</h1>
          <p className="mt-4 text-base leading-7 text-[#4e6475]">
            El pedido quedó generado. Si elegiste WhatsApp o un medio que demora en acreditar, podés seguir la conversación o esperar la confirmación.
          </p>

          <div className="mt-6 rounded-[34px] bg-white p-6 text-left shadow-[0_18px_50px_rgba(20,48,71,0.08)]">
            <h2 className="text-xl font-extrabold text-[#143047]">Mientras tanto</h2>
            <ul className="mt-4 space-y-2 text-sm leading-7 text-[#4e6475]">
              <li>• Guardá el comprobante si ya pagaste.</li>
              <li>• Podés escribir por WhatsApp para acelerar la gestión.</li>
              <li>• El pedido sigue registrado en el sistema.</li>
            </ul>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#143047] px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#214a69]">
              <Home className="h-4 w-4" />
              Volver al inicio
            </Link>
            <a
              href={`https://wa.me/${siteConfig.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#22c55e] px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#16a34a]"
            >
              <MessageCircle className="h-4 w-4" />
              Abrir WhatsApp
            </a>
            <Link href="/#productos" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d8cdb8] bg-white px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-[#143047] transition hover:bg-[#eef4f8]">
              <ShoppingBag className="h-4 w-4" />
              Seguir comprando
            </Link>
          </div>
        </motion.div>
      </div>
      <Footer />
    </main>
  )
}
