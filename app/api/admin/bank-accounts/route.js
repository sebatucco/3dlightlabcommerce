import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_BANK_NAME = 120
const MAX_HOLDER_NAME = 160
const MAX_CBU = 60
const MAX_ALIAS = 80
const MAX_CUIT = 30
const ALLOWED_ACCOUNT_TYPES = ['cuenta_corriente', 'caja_ahorro', 'cuenta_virtual']

function normalizeString(value, maxLength = 255) {
  return String(value || '').trim().slice(0, maxLength)
}

function validateBankAccountPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Body inválido' }
  }

  const bank_name = normalizeString(body.bank_name, MAX_BANK_NAME)
  const holder_name = normalizeString(body.holder_name, MAX_HOLDER_NAME)
  const cbu = normalizeString(body.cbu, MAX_CBU)
  const alias = normalizeString(body.alias, MAX_ALIAS)
  const cuit = normalizeString(body.cuit, MAX_CUIT)
  const account_type = ALLOWED_ACCOUNT_TYPES.includes(body.account_type)
    ? body.account_type
    : 'cuenta_corriente'
  const sort_order = Number.isInteger(Number(body.sort_order))
    ? Number(body.sort_order)
    : 0

  if (!bank_name) return { error: 'Falta el nombre del banco' }
  if (!holder_name) return { error: 'Falta el nombre del titular' }
  if (!cbu) return { error: 'Falta el CBU/CVU' }

  return {
    value: {
      bank_name,
      holder_name,
      cbu,
      alias: alias || null,
      cuit: cuit || null,
      account_type,
      sort_order,
    },
  }
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
    active: Boolean(row.active),
    deleted: Boolean(row.deleted),
    sort_order: row.sort_order ?? 0,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  }
}

export async function GET(request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  try {
    const supabase = createAdminSupabaseClient()

    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('deleted', false)
      .order('sort_order', { ascending: true })
      .order('bank_name', { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: error.message || 'No se pudieron obtener las cuentas bancarias' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      (data || []).map(normalizeBankAccount).filter(Boolean)
    )
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Error obteniendo cuentas bancarias' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  try {
    const body = await request.json().catch(() => null)
    const validation = validateBankAccountPayload(body)

    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    const { data, error } = await supabase
      .from('bank_accounts')
      .insert({
        ...validation.value,
        active: true,
        deleted: false,
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message || 'No se pudo crear la cuenta bancaria' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { ok: true, account: normalizeBankAccount(data) },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Error creando cuenta bancaria' },
      { status: 500 }
    )
  }
}
