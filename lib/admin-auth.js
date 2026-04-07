
import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export const ADMIN_SESSION_COOKIE = 'dtup_admin_session'

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'change-this-secret'
}

function toBase64Url(value) {
  return Buffer.from(value).toString('base64url')
}

function fromBase64Url(value) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function sign(data) {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('base64url')
}

export function createAdminSession({ userId, email, role = 'admin' }) {
  const payload = {
    userId,
    email,
    role,
    exp: Date.now() + 1000 * 60 * 60 * 12,
  }
  const data = toBase64Url(JSON.stringify(payload))
  const signature = sign(data)
  return `${data}.${signature}`
}

export function verifyAdminSession(token) {
  if (!token || !token.includes('.')) return null
  const [data, signature] = token.split('.')
  if (!data || !signature) return null

  const expected = sign(data)
  const sigBuffer = Buffer.from(signature)
  const expBuffer = Buffer.from(expected)
  if (sigBuffer.length !== expBuffer.length) return null
  if (!crypto.timingSafeEqual(sigBuffer, expBuffer)) return null

  try {
    const payload = JSON.parse(fromBase64Url(data))
    if (!payload?.email || !payload?.exp || payload.exp < Date.now()) return null
    if (payload.role !== 'admin') return null
    return payload
  } catch {
    return null
  }
}

export function getAdminPayloadFromRequest(request) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value
  return verifyAdminSession(token)
}

export async function validateAdminPayload(payload) {
  if (!payload?.userId) return null
  try {
    const supabase = createAdminSupabaseClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id,email,role,is_active')
      .eq('id', payload.userId)
      .maybeSingle()

    if (error || !profile) return null
    if (profile.is_active === false || profile.role !== 'admin') return null

    return {
      userId: profile.id,
      email: profile.email || payload.email,
      role: profile.role,
    }
  } catch {
    return null
  }
}

export async function requireAdmin(request) {
  const payload = getAdminPayloadFromRequest(request)
  if (!payload) {
    return { authorized: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }
  }

  const validated = await validateAdminPayload(payload)
  if (!validated) {
    const response = NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    clearAdminCookie(response)
    return { authorized: false, response }
  }

  return { authorized: true, payload: validated }
}

export function setAdminCookie(response, sessionPayload) {
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSession(sessionPayload), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  })
  return response
}

export function clearAdminCookie(response) {
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  return response
}
