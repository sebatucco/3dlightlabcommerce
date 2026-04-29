export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')
    const variantId = searchParams.get('variant_id')
    const baseOnly = searchParams.get('base_only') === 'true'

    const supabase = createAdminSupabaseClient()

    let query = supabase
      .from('product_images')
      .select(`
        *,
        products(id,name,slug),
        product_variants(id,sku,name)
      `)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (productId) {
      query = query.eq('product_id', productId)
    }

    if (baseOnly) {
      query = query.is('variant_id', null)
    } else if (variantId) {
      query = query.eq('variant_id', variantId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [], {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo obtener la media del catálogo' },
      { status: 500 }
    )
  }
}