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

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim()
  )
}

async function resolveId(context) {
  const params = await context?.params
  return String(params?.id || '').trim()
}

export async function PATCH(request, context) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  try {
    const id = await resolveId(context)

    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const body = await request.json().catch(() => null)

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    // Check account exists and is not deleted
    const { data: existing, error: findError } = await supabase
      .from('bank_accounts')
      .select('id, deleted')
      .eq('id', id)
      .eq('deleted', false)
      .single()

    if (findError || !existing) {
      return NextResponse.json({ error: 'Cuenta bancaria no encontrada' }, { status: 404 })
    }

    const updates = {}

    // Toggle active
    if (typeof body.active === 'boolean') {
      updates.active = body.active
    }

    // Edit fields
    if (body.bank_name !== undefined) {
      const bank_name = normalizeString(body.bank_name, MAX_BANK_NAME)
      if (!bank_name) return NextResponse.json({ error: 'Falta el nombre del banco' }, { status: 400 })
      updates.bank_name = bank_name
    }

    if (body.holder_name !== undefined) {
      const holder_name = normalizeString(body.holder_name, MAX_HOLDER_NAME)
      if (!holder_name) return NextResponse.json({ error: 'Falta el nombre del titular' }, { status: 400 })
      updates.holder_name = holder_name
    }

    if (body.cbu !== undefined) {
      const cbu = normalizeString(body.cbu, MAX_CBU)
      if (!cbu) return NextResponse.json({ error: 'Falta el CBU/CVU' }, { status: 400 })
      updates.cbu = cbu
    }

    if (body.alias !== undefined) {
      updates.alias = normalizeString(body.alias, MAX_ALIAS) || null
    }

    if (body.cuit !== undefined) {
      updates.cuit = normalizeString(body.cuit, MAX_CUIT) || null
    }

    if (body.account_type !== undefined) {
      updates.account_type = ALLOWED_ACCOUNT_TYPES.includes(body.account_type)
        ? body.account_type
        : 'cuenta_corriente'
    }

    if (body.sort_order !== undefined && Number.isInteger(Number(body.sort_order))) {
      updates.sort_order = Number(body.sort_order)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No hay cambios para aplicar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('bank_accounts')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'No se pudo actualizar la cuenta bancaria' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, account: data })
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Error actualizando cuenta bancaria' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, context) {
  const auth = await requireAdmin(request)
  if (!auth.authorized) return auth.response

  try {
    const id = await resolveId(context)

    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    // Soft delete: mark as deleted and inactive
    const { data, error } = await supabase
      .from('bank_accounts')
      .update({ deleted: true, active: false })
      .eq('id', id)
      .eq('deleted', false)
      .select('id')
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Cuenta bancaria no encontrada o ya eliminada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Error eliminando cuenta bancaria' },
      { status: 500 }
    )
  }
}
