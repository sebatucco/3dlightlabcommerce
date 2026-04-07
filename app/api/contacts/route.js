import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  const supabase = getAdminClient()
  if (!supabase) return NextResponse.json([])
  try {
    const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false })
    if (error) return NextResponse.json([])
    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const payload = {
    name: body.name || '',
    email: body.email || '',
    phone: body.phone || '',
    reason: body.reason || '',
    product: body.product || '',
    message: body.message || '',
  }

  const supabase = getAdminClient()
  if (!supabase) return NextResponse.json({ ok: true, offline: true })

  try {
    const { error } = await supabase.from('contacts').insert(payload)
    if (error) {
      return NextResponse.json({ ok: true, warning: error.message })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true, offline: true })
  }
}