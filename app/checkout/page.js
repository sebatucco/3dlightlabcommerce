'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  MessageCircle,
  ShoppingBag,
  Truck,
  User,
} from 'lucide-react'
import Link from 'next/link'
import { useCart } from '@/lib/store'
import { formatPrice } from '@/lib/mercadopago'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import WhatsAppButton from '@/components/WhatsAppButton'
import CartDrawer from '@/components/CartDrawer'
import { siteConfig } from '@/lib/site'

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, total, clearCart } = useCart()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isLeavingCheckout, setIsLeavingCheckout] = useState(false)
  const [error, setError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('mercadopago')

  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    dni: '',
  })

  const [shippingData, setShippingData] = useState({
    street: '',
    number: '',
    floor: '',
    apartment: '',
    city: '',
    province: '',
    zipCode: '',
    notes: '',
  })

  useEffect(() => {
    if (!isLeavingCheckout && cart.length === 0) {
      router.push('/')
    }
  }, [cart, router, isLeavingCheckout])

  const handleCustomerSubmit = (e) => {
    e.preventDefault()
    setStep(2)
  }

  const handleShippingSubmit = (e) => {
    e.preventDefault()
    setStep(3)
  }

  const buildWhatsAppOrderMessage = (orderId) => {
    const lines = [
      'Hola! Quiero finalizar este pedido por WhatsApp.',
      '',
      `Pedido: ${orderId}`,
      `Cliente: ${customerData.name}`,
      `Email: ${customerData.email}`,
      `Teléfono: ${customerData.phone}`,
      '',
      'Productos:',
      ...cart.map((item) => `• ${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}`),
      '',
      `Total: ${formatPrice(total)}`,
      `Dirección: ${shippingData.street} ${shippingData.number}, ${shippingData.city}, ${shippingData.province}`,
    ]

    return encodeURIComponent(lines.join(String.fromCharCode(10)))
  }

  const handleFinalizePurchase = async () => {
    if (isLoading) return

    setIsLoading(true)
    setError('')

    try {
      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          customer: customerData,
          shipping: shippingData,
          paymentMethod,
        }),
      })

      const orderData = await orderResponse.json().catch(() => ({}))

      if (!orderResponse.ok) {
        throw new Error(orderData.error || 'No se pudo crear el pedido')
      }

      const order = orderData

      if (paymentMethod === 'mercadopago') {
        const preferenceResponse = await fetch('/api/mercadopago/preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cart.map((item) => ({
              title: item.name,
              quantity: item.quantity,
              unit_price: item.price,
            })),
            payer: {
              name: customerData.name,
              email: customerData.email,
            },
            orderId: order.id,
          }),
        })

        const prefData = await preferenceResponse.json().catch(() => ({}))

        if (!preferenceResponse.ok) {
          throw new Error(prefData.error || 'No se pudo iniciar el pago')
        }

        setIsLeavingCheckout(true)
        clearCart()
        window.location.href = prefData.initPoint || prefData.init_point
        return
      }

      if (paymentMethod === 'transfer') {
        setIsLeavingCheckout(true)
        clearCart()
        router.push(`/checkout/transfer?orderId=${order.id}`)
        return
      }

      if (paymentMethod === 'whatsapp') {
        window.open(
          `https://wa.me/${siteConfig.whatsappNumber}?text=${buildWhatsAppOrderMessage(order.id)}`,
          '_blank'
        )

        setIsLeavingCheckout(true)
        clearCart()
        router.push(`/checkout/pending?orderId=${order.id}`)
        return
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setError(err.message || 'Ocurrió un error inesperado')
    } finally {
      setIsLoading(false)
    }
  }

  if (cart.length === 0 && !isLeavingCheckout) return null

  const stepTitles = ['Datos', 'Envío', 'Pago']

  return (
    <main className="min-h-screen bg-[#f5efe3] text-[#143047]">
      <Header />
      <CartDrawer />
      <WhatsAppButton />

      <div className="container mx-auto px-4 pb-16 pt-32">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#5e89a6] hover:text-[#ef7d6b]">
              <ArrowLeft className="h-4 w-4" />
              Seguir comprando
            </Link>
            <h1 className="mt-3 font-display text-6xl uppercase leading-none text-[#143047]">Checkout</h1>
          </div>

          <div className="hidden rounded-full border border-[#d8cdb8] bg-white px-5 py-3 text-sm font-semibold text-[#4e6475] md:block">
            {cart.length} producto{cart.length > 1 ? 's' : ''} en tu pedido
          </div>
        </div>

        <div className="mb-8 grid gap-3 md:grid-cols-3">
          {stepTitles.map((title, index) => {
            const currentStep = index + 1
            const active = step === currentStep
            const completed = step > currentStep
            return (
              <div
                key={title}
                className={`rounded-3xl border px-5 py-4 ${active
                    ? 'border-[#143047] bg-white shadow-sm'
                    : completed
                      ? 'border-[#a7d9cb] bg-[#ecf8f4]'
                      : 'border-[#d8cdb8] bg-[#f8f3ea]'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${active
                        ? 'bg-[#143047] text-white'
                        : completed
                          ? 'bg-[#0f6d5f] text-white'
                          : 'bg-white text-[#143047]'
                      }`}
                  >
                    {completed ? <CheckCircle2 className="h-5 w-5" /> : currentStep}
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e89a6]">Paso {currentStep}</p>
                    <p className="text-lg font-extrabold text-[#143047]">{title}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            {step === 1 && (
              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleCustomerSubmit}
                className="rounded-[34px] border border-[#d8cdb8] bg-white p-8 shadow-[0_18px_50px_rgba(20,48,71,0.08)]"
              >
                <h2 className="flex items-center gap-2 text-2xl font-extrabold text-[#143047]">
                  <User className="h-5 w-5" />
                  Datos del cliente
                </h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {[
                    ['name', 'Nombre completo', 'text', 'Tu nombre'],
                    ['dni', 'DNI', 'text', '12345678'],
                    ['email', 'Email', 'email', 'tu@email.com'],
                    ['phone', 'Teléfono', 'tel', '+54 9 ...'],
                  ].map(([key, label, type, placeholder]) => (
                    <div key={key}>
                      <label className="mb-2 block text-sm font-semibold text-[#143047]">{label}</label>
                      <input
                        type={type}
                        required
                        value={customerData[key]}
                        onChange={(e) => setCustomerData({ ...customerData, [key]: e.target.value })}
                        className="w-full rounded-2xl border border-[#d8cdb8] bg-[#f8f3ea] px-4 py-3 outline-none transition focus:border-[#5e89a6]"
                        placeholder={placeholder}
                      />
                    </div>
                  ))}
                </div>
                <button className="mt-8 w-full rounded-full bg-[#143047] px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#214a69]">
                  Continuar al envío
                </button>
              </motion.form>
            )}

            {step === 2 && (
              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleShippingSubmit}
                className="rounded-[34px] border border-[#d8cdb8] bg-white p-8 shadow-[0_18px_50px_rgba(20,48,71,0.08)]"
              >
                <h2 className="flex items-center gap-2 text-2xl font-extrabold text-[#143047]">
                  <MapPin className="h-5 w-5" />
                  Dirección de envío
                </h2>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-[#143047]">Calle</label>
                    <input
                      type="text"
                      required
                      value={shippingData.street}
                      onChange={(e) => setShippingData({ ...shippingData, street: e.target.value })}
                      className="w-full rounded-2xl border border-[#d8cdb8] bg-[#f8f3ea] px-4 py-3 outline-none transition focus:border-[#5e89a6]"
                      placeholder="Nombre de la calle"
                    />
                  </div>
                  {[
                    ['number', 'Número'],
                    ['floor', 'Piso / depto'],
                    ['city', 'Ciudad'],
                    ['province', 'Provincia'],
                    ['zipCode', 'Código postal'],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="mb-2 block text-sm font-semibold text-[#143047]">{label}</label>
                      <input
                        type="text"
                        required={key !== 'floor'}
                        value={shippingData[key]}
                        onChange={(e) => setShippingData({ ...shippingData, [key]: e.target.value })}
                        className="w-full rounded-2xl border border-[#d8cdb8] bg-[#f8f3ea] px-4 py-3 outline-none transition focus:border-[#5e89a6]"
                      />
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-[#143047]">Notas</label>
                    <textarea
                      rows={4}
                      value={shippingData.notes}
                      onChange={(e) => setShippingData({ ...shippingData, notes: e.target.value })}
                      className="w-full rounded-2xl border border-[#d8cdb8] bg-[#f8f3ea] px-4 py-3 outline-none transition focus:border-[#5e89a6]"
                      placeholder="Referencia para entrega, horario, etc."
                    />
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-full border border-[#d8cdb8] px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-[#143047] transition hover:bg-[#f8f3ea]"
                  >
                    Volver
                  </button>
                  <button className="flex-1 rounded-full bg-[#143047] px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#214a69]">
                    Continuar al pago
                  </button>
                </div>
              </motion.form>
            )}

            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[34px] border border-[#d8cdb8] bg-white p-8 shadow-[0_18px_50px_rgba(20,48,71,0.08)]"
              >
                <h2 className="flex items-center gap-2 text-2xl font-extrabold text-[#143047]">
                  <CreditCard className="h-5 w-5" />
                  Elegí cómo cobrar
                </h2>

                <div className="mt-6 space-y-4">
                  {[
                    {
                      value: 'mercadopago',
                      title: 'Mercado Pago',
                      description: 'Cobro con tarjeta, saldo en cuenta y medios digitales.',
                      icon: CreditCard,
                    },
                    {
                      value: 'transfer',
                      title: 'Transferencia bancaria',
                      description: 'Genera el pedido y muestra los datos bancarios para acreditar.',
                      icon: Building2,
                    },
                    {
                      value: 'whatsapp',
                      title: 'Finalizar por WhatsApp',
                      description: 'Abre un mensaje con el resumen del pedido para cerrar la venta manualmente.',
                      icon: MessageCircle,
                    },
                  ].map((method) => {
                    const Icon = method.icon
                    const active = paymentMethod === method.value
                    return (
                      <label
                        key={method.value}
                        className={`flex cursor-pointer gap-4 rounded-3xl border p-5 transition ${active
                            ? 'border-[#143047] bg-[#eef4f8]'
                            : 'border-[#d8cdb8] bg-[#f8f3ea] hover:bg-white'
                          }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={active}
                          onChange={() => setPaymentMethod(method.value)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#143047]">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-extrabold text-[#143047]">{method.title}</p>
                              <p className="text-sm leading-6 text-[#4e6475]">{method.description}</p>
                            </div>
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>

                {paymentMethod === 'transfer' && (
                  <div className="mt-5 rounded-3xl border border-[#d8cdb8] bg-[#f8f3ea] p-5">
                    <h3 className="text-base font-extrabold text-[#143047]">
                      Vas a ver los datos bancarios en el siguiente paso
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-[#4e6475]">
                      Al continuar, generamos tu pedido y te mostramos el alias, CBU y titular
                      para que puedas hacer la transferencia. Después vas a poder enviarnos el
                      comprobante por WhatsApp.
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e89a6]">
                          Alias
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#143047]">
                          {siteConfig.bankInfo?.alias || 'No configurado'}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[#e6dcc8] bg-white p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#5e89a6]">
                          Titular
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#143047]">
                          {siteConfig.bankInfo?.titular || 'No configurado'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {error && <p className="mt-4 rounded-2xl bg-[#fff1ef] px-4 py-3 text-sm text-[#b44a42]">{error}</p>}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-full border border-[#d8cdb8] px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-[#143047] transition hover:bg-[#f8f3ea]"
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalizePurchase}
                    disabled={isLoading}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#143047] px-6 py-4 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#214a69] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {!isLoading && (
                      paymentMethod === 'transfer' ? (
                        <Building2 className="h-4 w-4" />
                      ) : paymentMethod === 'mercadopago' ? (
                        <CreditCard className="h-4 w-4" />
                      ) : (
                        <MessageCircle className="h-4 w-4" />
                      )
                    )}

                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}

                    {isLoading
                      ? paymentMethod === 'transfer'
                        ? 'Abriendo datos bancarios...'
                        : 'Procesando...'
                      : paymentMethod === 'mercadopago'
                        ? 'Ir a pagar con Mercado Pago'
                        : paymentMethod === 'transfer'
                          ? 'Ver datos bancarios'
                          : 'Finalizar por WhatsApp'}
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          <aside className="space-y-6">
            <div className="rounded-[34px] border border-[#d8cdb8] bg-white p-6 shadow-[0_18px_50px_rgba(20,48,71,0.08)]">
              <h3 className="flex items-center gap-2 text-xl font-extrabold text-[#143047]">
                <ShoppingBag className="h-5 w-5" />
                Resumen del pedido
              </h3>

              <div className="mt-5 space-y-4">
                {cart.map((item) => (
                  <div key={`${item.id}-${item.variant}`} className="flex gap-3 rounded-3xl bg-[#f8f3ea] p-3">
                    <div className="h-16 w-16 overflow-hidden rounded-2xl bg-white">
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold text-[#143047]">{item.name}</p>
                      <p className="text-sm text-[#4e6475]">Cantidad: {item.quantity}</p>
                      <p className="mt-1 text-sm font-semibold text-[#143047]">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t border-[#e6dcc8] pt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between text-[#4e6475]">
                  <span>Subtotal</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex items-center justify-between text-[#4e6475]">
                  <span>Envío</span>
                  <span>A coordinar</span>
                </div>
                <div className="flex items-center justify-between text-xl font-extrabold text-[#143047]">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[34px] bg-[#143047] p-6 text-white shadow-[0_18px_50px_rgba(20,48,71,0.18)]">
              <h3 className="text-xl font-extrabold">Tu tienda también vende por conversación</h3>
              <p className="mt-3 text-sm leading-7 text-[#dbe8f0]">
                Además del pago online, el checkout permite cerrar ventas por transferencia o derivarlas a WhatsApp sin perder el registro del pedido.
              </p>
              <div className="mt-5 space-y-3 text-sm text-[#dbe8f0]">
                <div className="flex items-center gap-3">
                  <Truck className="h-4 w-4 text-[#f2c14e]" />
                  <span>Datos de envío completos</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-[#f2c14e]" />
                  <span>Pedido guardado en el sistema</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Footer />
    </main>
  )
}