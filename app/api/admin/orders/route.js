import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  try {
    const supabase = createAdminSupabaseClient()

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        created_at,
        external_reference,
        customer_name,
        customer_last_name,
        customer_phone,
        customer_email,
        customer_dni,
        total,
        status,
        payment_method,
        shipping_status,
        expires_at,
        paid_at,
        cancelled_at
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [], {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'No se pudieron obtener los pedidos' },
      { status: 500 }
    )
  }
}