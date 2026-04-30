import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 300

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function normalizeCategory(category) {
  if (!category?.name && !category?.slug) return null
  const name = category?.name || category?.slug || ''
  const slug = category?.slug || String(name)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  return {
    id: category?.id || slug,
    name,
    slug,
    description: category?.description || null,
    sort_order: category?.sort_order ?? null,
    active: category?.active ?? true,
    created_at: category?.created_at || null,
  }
}

export async function GET() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json(
      { categories: [], error: 'Supabase no configurado' },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    )
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, description, sort_order, active, created_at')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json(
        { categories: [], error: error.message },
        { status: 500, headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
      )
    }

    return NextResponse.json(
      { categories: (data || []).map(normalizeCategory).filter(Boolean) },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    )
  } catch (error) {
    return NextResponse.json(
      { categories: [], error: error?.message || 'No se pudieron obtener las categorías' },
      { status: 500, headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    )
  }
}
