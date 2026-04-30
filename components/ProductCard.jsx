'use client'

import { ShoppingCart, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { formatPrice } from '@/lib/mercadopago'
import { siteConfig } from '@/lib/site'

function getCatalogImage(product) {
  const media = Array.isArray(product?.product_images) ? product.product_images : []

  const sortedMedia = [...media].sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0))

  const catalogImage =
    sortedMedia.find(
      (item) => item?.media_type === 'image' && item?.use_case === 'catalog'
    ) ||
    sortedMedia.find(
      (item) => item?.media_type === 'image' && item?.is_primary === true
    ) ||
    sortedMedia.find(
      (item) => item?.media_type === 'image'
    )

  return catalogImage?.image_url || product?.image || product?.image_url || '/placeholder.jpg'
}

function getCategoryLabel(product) {
  return (
    product?.category_data?.name ||
    product?.category ||
    ''
  )
}

export default function ProductCard({ product }) {
  const imageSrc = getCatalogImage(product)
  const categoryLabel = getCategoryLabel(product)
  const detailHref = `/producto/${product.slug || product.id}`

  const handleWhatsApp = (event) => {
    event.preventDefault()
    event.stopPropagation()
    const message = `Hola! Me interesa este producto: ${product.name} - ${formatPrice(product.price)}`
    window.open(
      `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`,
      '_blank'
    )
  }

  return (
    <div className="h-full">
      <Link href={detailHref} className="block h-full">
        <article className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[#e7dccd] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
          <div className="relative h-56 w-full overflow-hidden bg-[#f7f1e8]">
            <img
              src={imageSrc}
              alt={product.name}
              className="h-full w-full object-cover transition duration-300 hover:scale-105"
            />

            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              {product.featured ? (
                <span className="rounded-full bg-[#143047] px-3 py-1 text-xs font-semibold text-white">
                  Destacado
                </span>
              ) : null}

            </div>
          </div>

          <div className="flex flex-1 flex-col p-5">
            {categoryLabel ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d7b68]">
                {categoryLabel}
              </p>
            ) : null}

            <h3 className="mt-2 min-h-[56px] text-lg font-semibold leading-tight text-[#143047]">
              {product.name}
            </h3>

            <p className="mt-2 line-clamp-2 min-h-[48px] text-sm leading-6 text-[#6b7280]">
              {product.short_description || product.description}
            </p>

            <div className="mt-auto flex gap-3 pt-5">
              <span
                className="flex-1 rounded-full bg-[#143047] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#214a69]"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Ver detalle
                </span>
              </span>

              <button
                onClick={handleWhatsApp}
                className="inline-flex items-center justify-center rounded-full border border-[#d8cdb8] px-4 py-3 text-[#143047] transition hover:bg-[#f7f1e8]"
                aria-label={`Consultar ${product.name} por WhatsApp`}
              >
                <MessageCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        </article>
      </Link>
    </div>
  )
}
