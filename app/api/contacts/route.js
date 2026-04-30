import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin-auth'
import { rateLimits } from '@/lib/rate-limiter'
import { withApiObservability } from '@/lib/observability'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_NAME_LENGTH = 120
const MAX_EMAIL_LENGTH = 180
const MAX_PHONE_LENGTH = 40
const MAX_REASON_LENGTH = 120
const MAX_PRODUCT_LENGTH = 160
const MAX_MESSAGE_LENGTH = 2000

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) return null

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function normalizeString(value, maxLength = 255) {
  return String(value || '').trim().slice(0, maxLength)
}

function normalizeEmail(value) {
  return normalizeString(value, MAX_EMAIL_LENGTH).toLowerCase()
}

function normalizePhone(value) {
  return normalizeString(value, MAX_PHONE_LENGTH)
}

function isValidEmail(email) {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validateContactPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Body inválido' }
  }

  const name = normalizeString(body.name, MAX_NAME_LENGTH)
  const email = normalizeEmail(body.email)
  const phone = normalizePhone(body.phone)
  const reason = normalizeString(body.reason, MAX_REASON_LENGTH)
  const product = normalizeString(body.product, MAX_PRODUCT_LENGTH)
  const message = normalizeString(body.message, MAX_MESSAGE_LENGTH)

  if (!name) {
    return { error: 'Falta el nombre' }
  }

  if (!email) {
    return { error: 'Falta el email' }
  }

  if (!isValidEmail(email)) {
    return { error: 'El email no es válido' }
  }

  if (!message) {
    return { error: 'Falta el mensaje' }
  }

  return {
    value: {
      name,
      email,
      phone: phone || '',
      reason: reason || '',
      product: product || '',
      message,
    },
  }
}

function responseNoStore(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}

export async function GET(request) {
  return withApiObservability(request, '/api/contacts[GET]', async () => {
    const auth = await requireAdmin(request)
    if (!auth.authorized) return auth.response

  const supabase = getAdminClient()

  if (!supabase) {
    return responseNoStore({ error: 'Supabase no configurado' }, 500)
  }

    try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return responseNoStore(
        { error: error.message || 'No se pudieron obtener los contactos' },
        500
      )
    }

    return responseNoStore(Array.isArray(data) ? data : [])
    } catch (error) {
      return responseNoStore(
        { error: error?.message || 'No se pudieron obtener los contactos' },
        500
      )
    }
  })
}

export async function POST(request) {
  return withApiObservability(request, '/api/contacts[POST]', async () => {
    const rateLimit = await rateLimits.contact(request)
    if (rateLimit) {
      return responseNoStore(rateLimit.body, rateLimit.status)
    }

  const body = await request.json().catch(() => null)
  const validation = validateContactPayload(body)

  if (validation.error) {
    return responseNoStore({ error: validation.error }, 400)
  }

  const supabase = getAdminClient()

  if (!supabase) {
    return responseNoStore({ error: 'Supabase no configurado' }, 500)
  }

    try {
    const payload = validation.value

    const { data, error } = await supabase
      .from('contacts')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      return responseNoStore(
        { error: error.message || 'No se pudo guardar el contacto' },
        500
      )
    }

    return responseNoStore(
      {
        ok: true,
        contact: data,
      },
      201
    )
    } catch (error) {
      return responseNoStore(
        { error: error?.message || 'No se pudo guardar el contacto' },
        500
      )
    }
  })
}
