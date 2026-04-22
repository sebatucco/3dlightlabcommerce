'use client'

import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Building2, Copy, Check, Home, MessageCircle } from 'lucide-react'
import { useState, Suspense, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import WhatsAppButton from '@/components/WhatsAppButton'
import CartDrawer from '@/components/CartDrawer'
import { siteConfig } from '@/lib/site'
import { useCart } from '@/lib/store'

function TransferContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [copied, setCopied] = useState(null)
  const { clearCart } = useCart()
  const [bankAccounts, setBankAccounts] = useState([])
  const [bankLoading, setBankLoading] = useState(true)

  useEffect(() => {
    clearCart()
  }, [clearCart])

  useEffect(() => {
    async function loadBankAccounts() {
      try {
        const res = await fetch('/api/bank-accounts', { cache: 'no-store' })
        const data = await res.json()
        const accounts = Array.isArray(data?.accounts) ? data.accounts : []
        setBankAccounts(accounts)
      } catch {
        setBankAccounts([])
      } finally {
        setBankLoading(false)
      }
    }
    loadBankAccounts()
  }, [])

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(field)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error('No se pudo copiar:', error)
    }
  }

  // Fallback to siteConfig.bankInfo if no dynamic accounts
  const useFallback = !bankLoading && bankAccounts.length === 0 && siteConfig.bankInfo
  const fallbackAccount = useFallback
    ? {
        bank_name: siteConfig.bankInfo.banco || '',
        holder_name: siteConfig.bankInfo.titular || '',
        cbu: siteConfig.bankInfo.cbu || '',
        alias: siteConfig.bankInfo.alias || '',
        cuit: siteConfig.bankInfo.cuit || '',
      }
    : null

  const accountsToShow = bankAccounts.length > 0 ? bankAccounts : (fallbackAccount ? [fallbackAccount] : [])

  return (
    <main className="min-h-screen bg-[#f5efe3] text-[#143047]">
      <Header />
      <CartDrawer />
      <WhatsAppButton />

      <div className="container mx-auto px-4 pb-16 pt-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-2xl"
        >
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#eef4f8] text-[#143047]">
              <Building2 className="h-10 w-10" />
            </div>
            <h1 className="mt-6 font-display text-6xl uppercase leading-none text-[#143047]">
              Transferencia
            </h1>
            <p className="mt-4 text-base leading-7 text-[#4e6475]">
              Realizá la transferencia y luego enviá el comprobante por WhatsApp para confirmar el pedido.
            </p>
          </div>

          {orderId && (
            <div className="mt-6 rounded-3xl border border-[#d8cdb8] bg-white p-4 text-center shadow-sm">
              <p className="text-sm uppercase tracking-[0.16em] text-[#5e89a6]">
                Número de pedido
              </p>
              <p className="mt-2 text-lg font-extrabold text-[#143047]">{orderId}</p>
            </div>
          )}

          {bankLoading ? (
            <div className="mt-6 flex items-center justify-center rounded-[34px] border border-[#d8cdb8] bg-white p-10 shadow-sm">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5e89a6] border-t-transparent" />
            </div>
          ) : accountsToShow.length === 0 ? (
            <div className="mt-6 rounded-[34px] border border-[#d8cdb8] bg-white p-8 text-center shadow-sm">
              <p className="text-lg font-bold text-[#143047]">No hay cuentas bancarias configuradas</p>
              <p className="mt-2 text-sm text-[#4e6475]">
                Por favor, contactanos por WhatsApp para coordinar el pago.
              </p>
            </div>
          ) : (
            accountsToShow.map((account, index) => {
              const accountFields = [
                account.bank_name ? { label: 'Banco', value: account.bank_name } : null,
                { label: 'Titular', value: account.holder_name },
                { label: 'CBU', value: account.cbu },
                account.alias ? { label: 'Alias', value: account.alias } : null,
                account.cuit ? { label: 'CUIT', value: account.cuit } : null,
              ].filter(Boolean)

              return (
                <div
                  key={account.id || `account-${index}`}
                  className="mt-6 rounded-[34px] border border-[#d8cdb8] bg-white p-6 shadow-[0_18px_50px_rgba(20,48,71,0.08)]"
                >
                  <h2 className="text-2xl font-extrabold text-[#143047]">
                    {accountsToShow.length > 1
                      ? `${account.bank_name || 'Cuenta bancaria'}`
                      : 'Datos bancarios'}
                  </h2>
                  <div className="mt-6 space-y-4">
                    {accountFields.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-4 rounded-3xl bg-[#f8f3ea] p-4"
                      >
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e89a6]">
                            {item.label}
                          </p>
                          <p className="mt-1 font-semibold text-[#143047]">{item.value}</p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(item.value, `${index}-${item.label}`)}
                          className="rounded-full border border-[#d8cdb8] p-3 text-[#143047] hover:bg-white"
                        >
                          {copied === `${index}-${item.label}` ? (
                            <Check className="h-4 w-4 text-[#0f6d5f]" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}

          <div className="mt-6 rounded-[34px] bg-[#143047] p-6 text-white shadow-[0_18px_50px_rgba(20,48,71,0.18)]">
            <h2 className="text-2xl font-extrabold">Pasos</h2>
            <ol className="mt-4 space-y-3 text-sm leading-7 text-[#dbe8f0]">
              <li>1. Transferí el importe correspondiente.</li>
              <li>2. Usá el número de pedido como referencia.</li>
              <li>3. Mandanos el comprobante por WhatsApp.</li>
              <li>4. Confirmamos el pago y continuamos con el pedido.</li>
            </ol>
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <a
              href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(
                `Hola! Envío el comprobante de transferencia del pedido ${orderId || ''}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#22c55e] px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#16a34a]"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar comprobante
            </a>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d8cdb8] bg-white px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-[#143047] transition hover:bg-[#eef4f8]"
            >
              <Home className="h-4 w-4" />
              Volver al inicio
            </Link>
          </div>
        </motion.div>
      </div>

      <Footer />
    </main>
  )
}

export default function TransferPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5efe3]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5e89a6] border-t-transparent" />
        </div>
      }
    >
      <TransferContent />
    </Suspense>
  )
}