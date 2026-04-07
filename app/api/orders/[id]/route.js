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

export async function PUT(request, { params }) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  const supabase = getAdminClient()
  if (!supabase) return NextResponse.json({ error: 'Faltan credenciales de servidor' }, { status: 500 })

  const body = await request.json().catch(() => ({}))
  const updates = {}
  if (body.status) updates.status = body.status
  if (body.paymentStatus) updates.payment_status = body.paymentStatus

  const { data, error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
