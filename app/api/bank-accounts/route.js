import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 300

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function normalizeBankAccount(row) {
  if (!row) return null
  return {
    id: row.id,
    bank_name: row.bank_name || '',
    holder_name: row.holder_name || '',
    cbu: row.cbu || '',
    alias: row.alias || '',
    cuit: row.cuit || '',
    account_type: row.account_type || 'cuenta_corriente',
    sort_order: row.sort_order ?? 0,
  }
}

export async function GET() {
  const supabase = getSupabaseClient()

  if (!supabase) {
    return NextResponse.json(
      { accounts: [], error: 'Supabase no configurado' },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    )
  }

  try {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('id, bank_name, holder_name, cbu, alias, cuit, account_type, sort_order')
      .eq('active', true)
      .eq('deleted', false)
      .order('sort_order', { ascending: true })
      .order('bank_name', { ascending: true })

    if (error) {
      return NextResponse.json(
        { accounts: [], error: error.message },
        { status: 500, headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
      )
    }

    return NextResponse.json(
      { accounts: (data || []).map(normalizeBankAccount).filter(Boolean) },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    )
  } catch (error) {
    return NextResponse.json(
      { accounts: [], error: error?.message || 'No se pudieron obtener las cuentas bancarias' },
      { status: 500, headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    )
  }
}
