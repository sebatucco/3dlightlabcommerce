
import { NextResponse } from 'next/server'
import { getAdminPayloadFromRequest, validateAdminPayload, clearAdminCookie } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const payload = getAdminPayloadFromRequest(request)
  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const valid = await validateAdminPayload(payload)
  if (!valid) {
    const response = NextResponse.json({ authenticated: false }, { status: 401 })
    return clearAdminCookie(response)
  }

  return NextResponse.json({ authenticated: true, admin: { email: valid.email, role: valid.role } })
}
