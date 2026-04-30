import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-static'
export const revalidate = 3600

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tu-sitio.netlify.app'

  let products = []
  let categories = []

  try {
    const supabase = createAdminClient()

    const [productsRes, categoriesRes] = await Promise.all([
      supabase.from('products').select('id, slug, updated_at').eq('active', true),
      supabase.from('categories').select('id, slug').eq('active', true),
    ])

    if (productsRes.data) products = productsRes.data
    if (categoriesRes.data) categories = categoriesRes.data
  } catch {
    // Si falla la DB, devolvemos solo las páginas estáticas
  }

  const staticPages = [
    { path: '', priority: '1.0', changefreq: 'daily' },
    { path: '/#catalogo', priority: '0.9', changefreq: 'daily' },
    { path: '/#contacto', priority: '0.5', changefreq: 'monthly' },
    { path: '/#sobre', priority: '0.5', changefreq: 'monthly' },
  ]

  const productUrls = products.map((p) => ({
    path: `/producto/${p.slug || p.id}`,
    priority: '0.8',
    changefreq: 'weekly',
    lastmod: p.updated_at ? new Date(p.updated_at).toISOString() : new Date().toISOString(),
  }))

  const categoryUrls = categories.map((c) => ({
    path: `/?category=${c.slug}`,
    priority: '0.6',
    changefreq: 'weekly',
  }))

  const allUrls = [...staticPages, ...productUrls, ...categoryUrls]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allUrls
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.path}</loc>
    <lastmod>${page.lastmod || new Date().toISOString()}</lastmod>
    <changefreq>${page.changefreq || 'weekly'}</changefreq>
    <priority>${page.priority || '0.5'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
