import { siteConfig } from '@/lib/site'
import ProductClient from './ProductClient'

export async function generateMetadata({ params }) {
  const productId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tu-sitio.netlify.app'

  if (!productId) {
    return { title: 'Producto no encontrado' }
  }

  try {
    const res = await fetch(`${baseUrl}/api/products/${productId}`, {
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      return { title: 'Producto no encontrado' }
    }

    const product = await res.json().catch(() => null)
    if (!product) return { title: 'Producto no encontrado' }

    const images = Array.isArray(product.product_images)
      ? product.product_images.filter((img) => img?.media_type === 'image')
      : []

    const primaryImage =
      images.find((img) => img?.is_primary) ||
      images.find((img) => img?.use_case === 'catalog') ||
      images[0]

    const ogImages = primaryImage
      ? [{ url: primaryImage.image_url, width: 1200, height: 630, alt: product.name }]
      : [{ url: '/logo.png', width: 1200, height: 630, alt: siteConfig.brandName }]

    return {
      title: `${product.name} | ${siteConfig.brandName}`,
      description: product.short_description || product.description?.slice(0, 160) || `Mirá ${product.name} en ${siteConfig.brandName}`,
      openGraph: {
        title: `${product.name} | ${siteConfig.brandName}`,
        description: product.short_description || product.description?.slice(0, 160) || '',
        type: 'product',
        images: ogImages,
        price: {
          amount: String(product.price || 0),
          currency: 'ARS',
        },
        availability: product.stock > 0 ? 'instock' : 'outofstock',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${product.name} | ${siteConfig.brandName}`,
        description: product.short_description || product.description?.slice(0, 160) || '',
        images: ogImages.map((img) => img.url),
      },
      alternates: {
        canonical: `${baseUrl}/producto/${product.slug || productId}`,
      },
    }
  } catch {
    return { title: '3D Light Lab' }
  }
}

export default async function ProductPageServer({ params }) {
  const productId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tu-sitio.netlify.app'

  let jsonLd = null
  try {
    const res = await fetch(`${baseUrl}/api/products/${productId}`, {
      next: { revalidate: 300 },
    })
    if (res.ok) {
      const product = await res.json().catch(() => null)
      if (product) {
        const images = Array.isArray(product.product_images)
          ? product.product_images.filter((img) => img?.media_type === 'image').map((img) => img.image_url)
          : []

        jsonLd = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: product.short_description || product.description || '',
          image: images.length > 0 ? images : ['/logo.png'],
          sku: product.sku || undefined,
          brand: { '@type': 'Brand', name: siteConfig.brandName },
          offers: {
            '@type': 'Offer',
            url: `${baseUrl}/producto/${product.slug || productId}`,
            priceCurrency: 'ARS',
            price: String(product.price || 0),
            availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            itemCondition: 'https://schema.org/NewCondition',
          },
        })
      }
    }
  } catch {
    // Ignorar errores de JSON-LD
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}
      <ProductClient params={params} />
    </>
  )
}
