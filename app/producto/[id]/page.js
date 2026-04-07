'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, MessageCircle, Minus, Plus, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { useCart } from '@/lib/store'
import { formatPrice } from '@/lib/mercadopago'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CartDrawer from '@/components/CartDrawer'
import WhatsAppButton from '@/components/WhatsAppButton'
import ProductCard from '@/components/ProductCard'
import { siteConfig } from '@/lib/site'

export default function ProductPage() {
  const params = useParams()
  const { addToCart, setIsOpen } = useCart()
  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [currentImage, setCurrentImage] = useState(0)

  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await fetch(`/api/products/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setProduct(data)
          if (data.variants?.length) setSelectedVariant(data.variants[0])

          const relatedResponse = await fetch(`/api/products?category=${data.category}`)
          if (relatedResponse.ok) {
            const relatedData = await relatedResponse.json()
            setRelatedProducts((relatedData.products || []).filter((item) => item.id !== data.id).slice(0, 3))
          }
          return
        }
      } catch (error) {
        console.error('Error fetching product:', error)
      }

      setProduct(null)
      setRelatedProducts([])
      setLoading(false)
    }

    fetchProduct().finally(() => setLoading(false))
  }, [params.id])

  const handleAddToCart = () => {
    if (!product) return
    addToCart(product, selectedVariant, quantity)
    setIsOpen(true)
  }

  const handleWhatsApp = () => {
    if (!product) return
    const message = `Hola! Me interesa ${product.name}${selectedVariant ? ` (${selectedVariant})` : ''} - ${formatPrice(product.price)}`
    window.open(`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`, '_blank')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 pb-16 pt-32">
          <div className="animate-pulse rounded-2xl border border-border bg-card p-8">
            <div className="grid gap-10 lg:grid-cols-2">
              <div className="aspect-square rounded-xl bg-[hsl(var(--bone))]" />
              <div className="space-y-4">
                <div className="h-5 w-24 rounded bg-[hsl(var(--bone))]" />
                <div className="h-12 w-3/4 rounded bg-[hsl(var(--bone))]" />
                <div className="h-6 w-32 rounded bg-[hsl(var(--bone))]" />
                <div className="h-32 rounded bg-[hsl(var(--bone))]" />
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 pb-16 pt-32 text-center">
          <h1 className="text-2xl font-medium text-foreground">Producto no encontrado</h1>
          <Link href="/" className="mt-4 inline-block text-muted-foreground hover:text-foreground">
            Volver al inicio
          </Link>
        </div>
      </main>
    )
  }

  const images = product.images?.length ? product.images : [product.image]

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <CartDrawer />
      <WhatsAppButton />

      <div className="container mx-auto px-4 pb-16 pt-32">
        <Link href="/#catalogo" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Volver al catálogo
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_0.95fr]">
          <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[hsl(var(--bone))]">
                <img src={images[currentImage]} alt={product.name} className="h-4/5 w-4/5 object-contain" />
              </div>
            </div>
            {images.length > 1 && (
              <div className="flex gap-3">
                {images.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    onClick={() => setCurrentImage(index)}
                    className={`flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border ${
                      currentImage === index ? 'border-foreground bg-background' : 'border-border bg-card'
                    }`}
                  >
                    <img src={image} alt="Miniatura" className="h-4/5 w-4/5 object-contain" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            {product.category && <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">{product.category}</p>}
            <h1 className="mt-2 text-4xl font-semibold text-foreground md:text-5xl">{product.name}</h1>
            <div className="mt-4 flex items-end gap-3">
              <p className="text-3xl font-semibold text-foreground">{formatPrice(product.price)}</p>
              {product.originalPrice && product.originalPrice > product.price && (
                <p className="pb-1 text-lg text-muted-foreground line-through">{formatPrice(product.originalPrice)}</p>
              )}
            </div>
            <p className="mt-5 text-base leading-8 text-muted-foreground">{product.description}</p>

            {product.variants?.length > 0 && (
              <div className="mt-8">
                <p className="text-sm font-semibold text-foreground">Variante</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant}
                      onClick={() => setSelectedVariant(variant)}
                      className={`rounded-full px-4 py-2 text-sm ${
                        selectedVariant === variant
                          ? 'bg-foreground text-primary-foreground'
                          : 'border border-border bg-secondary/40 text-foreground'
                      }`}
                    >
                      {variant}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center gap-2">
              <button
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-accent"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-lg font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity((value) => value + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-accent"
              >
                <Plus className="h-4 w-4" />
              </button>
              <span className="ml-3 rounded-full bg-[hsl(var(--bone))] px-4 py-2 text-sm font-medium text-foreground">
                Stock: {product.stock ?? 0}
              </span>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-foreground px-6 py-4 text-sm font-medium tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ShoppingCart className="h-4 w-4" />
                Agregar al carrito
              </button>
              <button
                onClick={handleWhatsApp}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border px-6 py-4 text-sm font-medium tracking-wide text-foreground transition-colors hover:bg-accent"
              >
                <MessageCircle className="h-4 w-4" />
                Consultar
              </button>
            </div>
          </motion.div>
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-20">
            <h2 className="text-4xl font-bold text-foreground md:text-5xl">También te puede gustar</h2>
            <div className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {relatedProducts.map((item, index) => (
                <ProductCard key={item.id} product={item} index={index} />
              ))}
            </div>
          </section>
        )}
      </div>

      <Footer />
    </main>
  )
}
