import { createClient } from '@supabase/supabase-js'

let browserClient = null

function getPublicEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  }
}

export function getSupabaseBrowserClient() {
  const { url, anonKey } = getPublicEnv()
  if (!url || !anonKey) return null
  if (!browserClient) {
    browserClient = createClient(url, anonKey)
  }
  return browserClient
}

export const supabase = new Proxy({}, {
  get(_target, prop) {
    const client = getSupabaseBrowserClient()
    if (!client) {
      throw new Error('Supabase no está configurado. Definí NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.')
    }
    const value = client[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})

function normalizeProduct(product) {
  if (!product) return product

  const images = Array.isArray(product.product_images)
    ? [...product.product_images]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((item) => item.image_url)
        .filter(Boolean)
    : []

  return {
    ...product,
    category: product.categories?.name || product.category || 'General',
    image: images[0] || product.image || product.image_url || '',
    images,
    price: Number(product.price || 0),
    compare_at_price: product.compare_at_price ? Number(product.compare_at_price) : null,
    stock: Number(product.stock ?? 0),
  }
}

export async function getProducts(category = null) {
  const client = getSupabaseBrowserClient()
  if (!client) return { data: [], error: null }

  let query = client
    .from('products')
    .select(`
      id,
      category_id,
      name,
      slug,
      short_description,
      description,
      price,
      compare_at_price,
      sku,
      stock,
      featured,
      active,
      created_at,
      category,
      image,
      image_url,
      categories ( id, name, slug ),
      product_images ( image_url, sort_order )
    `)
    .eq('active', true)

  if (category && category !== 'Todos') {
    query = query.or(`category.eq.${category},categories.name.eq.${category},categories.slug.eq.${category}`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  return { data: Array.isArray(data) ? data.map(normalizeProduct) : data, error }
}

export async function getProductById(id) {
  const client = getSupabaseBrowserClient()
  if (!client) return { data: null, error: null }

  let { data, error } = await client
    .from('products')
    .select(`
      id,
      category_id,
      name,
      slug,
      short_description,
      description,
      price,
      compare_at_price,
      sku,
      stock,
      featured,
      active,
      created_at,
      category,
      image,
      image_url,
      categories ( id, name, slug ),
      product_images ( image_url, sort_order )
    `)
    .eq('id', id)
    .maybeSingle()

  if (!data && !error) {
    const bySlug = await client
      .from('products')
      .select(`
        id,
        category_id,
        name,
        slug,
        short_description,
        description,
        price,
        compare_at_price,
        sku,
        stock,
        featured,
        active,
        created_at,
        category,
        image,
        image_url,
        categories ( id, name, slug ),
        product_images ( image_url, sort_order )
      `)
      .eq('slug', id)
      .maybeSingle()
    data = bySlug.data
    error = bySlug.error
  }

  return { data: normalizeProduct(data), error }
}

export async function getCategories() {
  const client = getSupabaseBrowserClient()
  if (!client) return { data: [], error: null }
  const { data, error } = await client.from('categories').select('*').eq('active', true).order('sort_order')
  return { data, error }
}

export async function createOrder(orderData) {
  const client = getSupabaseBrowserClient()
  if (!client) return { data: null, error: new Error('Supabase no configurado') }
  const { data, error } = await client.from('orders').insert([orderData]).select().single()
  return { data, error }
}

export async function updateOrderPayment(orderId, paymentData) {
  const client = getSupabaseBrowserClient()
  if (!client) return { data: null, error: new Error('Supabase no configurado') }
  const { data, error } = await client.from('orders').update(paymentData).eq('id', orderId).select().single()
  return { data, error }
}

export async function createContact(contactData) {
  const client = getSupabaseBrowserClient()
  if (!client) return { data: null, error: new Error('Supabase no configurado') }
  const { data, error } = await client.from('contacts').insert([contactData]).select().single()
  return { data, error }
}

export async function getTestimonials() {
  const client = getSupabaseBrowserClient()
  if (!client) return { data: [], error: null }
  const { data, error } = await client.from('testimonials').select('*').eq('active', true).order('created_at', { ascending: false })
  return { data, error }
}

export async function getBanners() {
  const client = getSupabaseBrowserClient()
  if (!client) return { data: [], error: null }
  const { data, error } = await client.from('banners').select('*').eq('active', true).order('order')
  return { data, error }
}
