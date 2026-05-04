import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 120

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function GET() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ items: [], error: 'Supabase no configurado' }, { status: 200 })
  }

  try {
    const { data, error } = await supabase
      .from('site_media')
      .select('id, image_url, alt_text, title, subtitle, use_case, sort_order, active')
      .eq('active', true)
      .in('use_case', ['gallery', 'hero'])
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ items: [], error: error.message }, { status: 200 })
    }

    return NextResponse.json({ items: data || [] }, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    return NextResponse.json({ items: [], error: error?.message || 'No se pudo obtener media' }, { status: 200 })
  }
}
