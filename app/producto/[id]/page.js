'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, MessageCircle, Minus, Plus, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/lib/store'
import { formatPrice } from '@/lib/mercadopago'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CartDrawer from '@/components/CartDrawer'
import WhatsAppButton from '@/components/WhatsAppButton'
import ProductCard from '@/components/ProductCard'
import { siteConfig } from '@/lib/site'

function normalizeQuantity(value, stock) {
  const safeStock = Number.isFinite(Number(stock)) ? Math.max(0, Number(stock)) : 0
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 1

  if (safeStock === 0) return 1
  return Math.max(1, Math.min(safeValue, safeStock))
}

export default function ProductPage() {
  const params = useParams()
  const productId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const { addToCart, setIsOpen } = useCart()

  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [currentImage, setCurrentImage] = useState(0)
  const [viewMode, setViewMode] = useState('image')
  const [modelViewerReady, setModelViewerReady] = useState(false)
  const [addingToCart, setAddingToCart] = useState(false)

  useEffect(() => {
    if (viewMode !== '3d') return
    if (typeof window === 'undefined') return
    if (customElements.get('model-viewer')) {
      setModelViewerReady(true)
      return
    }

    let active = true

    import('@google/model-viewer')
      .then(() => {
        if (active) setModelViewerReady(true)
      })
      .catch(() => {
        if (active) setModelViewerReady(false)
      })

    return () => {
      active = false
    }
  }, [viewMode])

  useEffect(() => {
    if (!productId) return

    const controller = new AbortController()

    async function fetchProduct() {
      try {
        setLoading(true)
        setPageError('')
        setProduct(null)
        setRelatedProducts([])

        const response = await fetch(`/api/products/${productId}`, {
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!response.ok) {
          setProduct(null)
          setRelatedProducts([])
          setPageError('No pudimos cargar este producto.')
          return
        }

        const data = await response.json().catch(() => null)

        if (!data) {
          setProduct(null)
          setRelatedProducts([])
          setPageError('No pudimos cargar este producto.')
          return
        }

        setProduct(data)

        if (Array.isArray(data.variants) && data.variants.length > 0) {
          setSelectedVariant(data.variants[0])
        } else {
          setSelectedVariant(null)
        }

        const relatedCategory = data.category_slug || data.category || ''
        if (!relatedCategory) return

        const relatedResponse = await fetch(
          `/api/products?category=${encodeURIComponent(relatedCategory)}`,
          {
            cache: 'no-store',
            signal: controller.signal,
          }
        )

        if (!relatedResponse.ok) {
          setRelatedProducts([])
          return
        }

        const relatedData = await relatedResponse.json().catch(() => ({}))
        const relatedItems = Array.isArray(relatedData?.products) ? relatedData.products : []

        setRelatedProducts(
          relatedItems.filter((item) => item.id !== data.id).slice(0, 3)
        )
      } catch (error) {
        if (error?.name === 'AbortError') return
        setProduct(null)
        setRelatedProducts([])
        setPageError('No pudimos cargar este producto.')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()

    return () => controller.abort()
  }, [productId])

  const media = useMemo(() => {
    if (!Array.isArray(product?.product_images)) return []

    return [...product.product_images].sort(
      (a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0)
    )
  }, [product])

  const detailImages = useMemo(() => {
    const detail = media.filter(
      (item) => item?.media_type === 'image' && item?.use_case === 'detail'
    )

    if (detail.length > 0) return detail

    const catalog = media.filter(
      (item) => item?.media_type === 'image' && item?.use_case === 'catalog'
    )

    if (catalog.length > 0) return catalog

    const primary = media.filter(
      (item) => item?.media_type === 'image' && item?.is_primary === true
    )

    if (primary.length > 0) return primary

    return media.filter((item) => item?.media_type === 'image')
  }, [media])

  const model3D = useMemo(() => {
    return (
      media.find((item) => item?.media_type === 'model' && item?.use_case === 'detail') ||
      media.find((item) => item?.media_type === 'model') ||
      null
    )
  }, [media])

  const fallbackImages = useMemo(() => {
    if (Array.isArray(product?.images) && product.images.length > 0) {
      return product.images.map((image, index) => ({
        id: `fallback-${index}`,
        image_url: image,
        alt_text: product?.name || 'Producto',
      }))
    }

    if (product?.image || product?.image_url) {
      return [
        {
          id: 'fallback-main',
          image_url: product.image || product.image_url,
          alt_text: product?.name || 'Producto',
        },
      ]
    }

    return []
  }, [product])

  const imagesToShow = detailImages.length > 0 ? detailImages : fallbackImages
  const selectedImage = imagesToShow[currentImage]?.image_url || '/placeholder.jpg'
  const stock = Number(product?.stock ?? 0)
  const outOfStock = stock <= 0

  useEffect(() => {
    setCurrentImage(0)
    setViewMode('image')
    setModelViewerReady(false)
  }, [product?.id])

  useEffect(() => {
    setQuantity((prev) => normalizeQuantity(prev, stock))
  }, [stock])

  const handleAddToCart = async () => {
    if (!product || outOfStock) return

    setAddingToCart(true)
    try {
      addToCart(product, selectedVariant, normalizeQuantity(quantity, stock))
      setIsOpen(true)
    } finally {
      setAddingToCart(false)
    }
  }

  const handleWhatsApp = () => {
    if (!product) return

    const safeQuantity = normalizeQuantity(quantity, stock)
    const message = `Hola! Me interesa ${product.name}${selectedVariant ? ` (${selectedVariant})` : ''} - ${formatPrice(product.price)}. Cantidad: ${safeQuantity}`

    window.open(
      `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`,
      '_blank'
    )
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
          <p className="mt-3 text-sm text-muted-foreground">
            {pageError || 'No encontramos el producto que buscás.'}
          </p>
          <Link href="/" className="mt-4 inline-block text-muted-foreground hover:text-foreground">
            Volver al inicio
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <CartDrawer />
      <WhatsAppButton />

      <div className="container mx-auto px-4 pb-16 pt-32">
        <Link
          href="/#catalogo"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al catálogo
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[hsl(var(--bone))]">
                {viewMode === '3d' && model3D ? (
                  modelViewerReady ? (
                    <model-viewer
                      src={model3D.image_url}
                      alt={model3D.alt_text || product.name}
                      auto-rotate
                      camera-controls
                      disable-zoom
                      interaction-prompt="none"
                      shadow-intensity="0"
                      exposure="1"
                      environment-image="neutral"
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'transparent',
                        '--poster-color': 'transparent',
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                      Cargando visor 3D…
                    </div>
                  )
                ) : (
                  <div className="relative h-4/5 w-4/5">
                    <Image
                      src={selectedImage}
                      alt={imagesToShow[currentImage]?.alt_text || product.name}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-contain"
                      priority
                    />
                  </div>
                )}
              </div>
            </div>

            {(imagesToShow.length > 1 || model3D) && (
              <div className="flex flex-wrap gap-3">
                {imagesToShow.map((image, index) => (
                  <button
                    key={`${image.image_url}-${index}`}
                    onClick={() => {
                      setCurrentImage(index)
                      setViewMode('image')
                    }}
                    className={`relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border ${viewMode === 'image' && currentImage === index
                        ? 'border-foreground bg-background'
                        : 'border-border bg-card'
                      }`}
                    type="button"
                  >
                    <div className="relative h-4/5 w-4/5">
                      <Image
                        src={image.image_url}
                        alt={image.alt_text || 'Miniatura'}
                        fill
                        sizes="80px"
                        className="object-contain"
                      />
                    </div>
                  </button>
                ))}

                {model3D && (
                  <button
                    type="button"
                    onClick={() => setViewMode('3d')}
                    className={`flex h-20 w-20 items-center justify-center rounded-xl border px-2 text-center text-xs font-medium ${viewMode === '3d'
                        ? 'border-foreground bg-background text-foreground'
                        : 'border-border bg-card text-muted-foreground'
                      }`}
                  >
                    Ver 3D
                  </button>
                )}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-2xl border border-border bg-card p-8 shadow-sm"
          >
            {product.category && (
              <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
                {product.category}
              </p>
            )}

            <h1 className="mt-2 text-4xl font-semibold text-foreground md:text-5xl">
              {product.name}
            </h1>

            <div className="mt-4 flex items-end gap-3">
              <p className="text-3xl font-semibold text-foreground">
                {formatPrice(product.price)}
              </p>
              {product.originalPrice && product.originalPrice > product.price && (
                <p className="pb-1 text-lg text-muted-foreground line-through">
                  {formatPrice(product.originalPrice)}
                </p>
              )}
            </div>

            <p className="mt-5 text-base leading-8 text-muted-foreground">
              {product.description}
            </p>

            {Array.isArray(product.variants) && product.variants.length > 0 && (
              <div className="mt-8">
                <p className="text-sm font-semibold text-foreground">Variante</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant}
                      onClick={() => setSelectedVariant(variant)}
                      className={`rounded-full px-4 py-2 text-sm ${selectedVariant === variant
                          ? 'bg-foreground text-primary-foreground'
                          : 'border border-border bg-secondary/40 text-foreground'
                        }`}
                      type="button"
                    >
                      {variant}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center gap-2">
              <button
                onClick={() => setQuantity((value) => normalizeQuantity(value - 1, stock))}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-accent"
                type="button"
                disabled={outOfStock}
              >
                <Minus className="h-4 w-4" />
              </button>

              <span className="w-8 text-center text-lg font-medium">{quantity}</span>

              <button
                onClick={() => setQuantity((value) => normalizeQuantity(value + 1, stock))}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-accent"
                type="button"
                disabled={outOfStock}
              >
                <Plus className="h-4 w-4" />
              </button>

              <span className="ml-3 rounded-full bg-[hsl(var(--bone))] px-4 py-2 text-sm font-medium text-foreground">
                Stock: {stock}
              </span>
            </div>

            {outOfStock ? (
              <p className="mt-4 rounded-2xl bg-[#fff1ef] px-4 py-3 text-sm text-[#b34f42]">
                Este producto está sin stock por el momento.
              </p>
            ) : null}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleAddToCart}
                disabled={outOfStock || addingToCart}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-foreground px-6 py-4 text-sm font-medium tracking-wide text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
              >
                <ShoppingCart className="h-4 w-4" />
                {addingToCart ? 'Agregando...' : 'Agregar al carrito'}
              </button>

              <button
                onClick={handleWhatsApp}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border px-6 py-4 text-sm font-medium tracking-wide text-foreground transition-colors hover:bg-accent"
                type="button"
              >
                <MessageCircle className="h-4 w-4" />
                Consultar
              </button>
            </div>
          </motion.div>
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-20">
            <h2 className="text-4xl font-bold text-foreground md:text-5xl">
              También te puede gustar
            </h2>
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