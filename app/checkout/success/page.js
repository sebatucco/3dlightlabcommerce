'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle, Home, ShoppingBag, Package } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import WhatsAppButton from '@/components/WhatsAppButton'
import CartDrawer from '@/components/CartDrawer'

function SuccessContent() {
  const searchParams = useSearchParams()
  const [orderId, setOrderId] = useState(null)

  useEffect(() => {
    const externalReference = searchParams.get('external_reference')
    if (externalReference) setOrderId(externalReference)
  }, [searchParams])

  return (
    <main className="min-h-screen bg-[#f5efe3] text-[#143047]">
      <Header />
      <CartDrawer />
      <WhatsAppButton />
      <div className="container mx-auto px-4 pb-16 pt-32">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto max-w-xl text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#ecf8f4] text-[#0f6d5f]">
            <CheckCircle className="h-12 w-12" />
          </div>
          <h1 className="mt-8 font-display text-6xl uppercase leading-none text-[#143047]">Pago exitoso</h1>
          <p className="mt-4 text-base leading-7 text-[#4e6475]">
            El pedido quedó confirmado. Ahora podés seguir comprando o volver al inicio.
          </p>

          {orderId && (
            <div className="mt-6 rounded-3xl border border-[#d8cdb8] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e89a6]">Número de pedido</p>
              <p className="mt-2 text-lg font-extrabold text-[#143047]">{orderId}</p>
            </div>
          )}

          <div className="mt-6 rounded-[34px] bg-white p-6 text-left shadow-[0_18px_50px_rgba(20,48,71,0.08)]">
            <h2 className="flex items-center gap-2 text-xl font-extrabold text-[#143047]">
              <Package className="h-5 w-5" />
              Próximos pasos
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[#4e6475]">
              <li>• Preparar el pedido.</li>
              <li>• Coordinar envío o retiro.</li>
              <li>• Notificar al cliente sobre el despacho.</li>
            </ul>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#143047] px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#214a69]">
              <Home className="h-4 w-4" />
              Volver al inicio
            </Link>
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

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5efe3]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5e89a6] border-t-transparent" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}
