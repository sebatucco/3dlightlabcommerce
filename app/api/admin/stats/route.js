import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  const empty = {
    totalRevenue: 0,
    approvedRevenue: 0,
    pendingOrders: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCategories: 0,
    totalContacts: 0,
    newContacts: 0,
  }

  try {
    const supabase = createAdminSupabaseClient()
    const [productsRes, categoriesRes, ordersRes, contactsRes] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('categories').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id,total,status', { count: 'exact' }),
      supabase.from('contacts').select('id,created_at', { count: 'exact' }).limit(1000),
    ])

    const orders = ordersRes.data || []
    const contacts = contactsRes.data || []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return NextResponse.json({
      totalRevenue: orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      approvedRevenue: orders.filter((order) => ['approved', 'confirmed'].includes(order.status)).reduce((sum, order) => sum + Number(order.total || 0), 0),
      pendingOrders: orders.filter((order) => order.status === 'pending').length,
      totalOrders: ordersRes.count || orders.length,
      totalProducts: productsRes.count || 0,
      totalCategories: categoriesRes.count || 0,
      totalContacts: contactsRes.count || contacts.length,
      newContacts: contacts.filter((contact) => new Date(contact.created_at) >= today).length,
    })
  } catch {
    return NextResponse.json(empty)
  }
}
