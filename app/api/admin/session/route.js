import { NextResponse } from 'next/server'
import {
  clearAdminCookie,
  getAdminPayloadFromRequest,
  validateAdminPayload,
} from '@/lib/admin-auth'

export const runtime = 'nodejs'

export async function GET(request) {
  try {
    const payload = getAdminPayloadFromRequest(request)

    if (!payload) {
      return NextResponse.json(
        { error: 'No autorizado' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store, max-age=0',
          },
        }
      )
    }

    const validated = await validateAdminPayload(payload)

    if (!validated) {
      const response = NextResponse.json(
        { error: 'No autorizado' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store, max-age=0',
          },
        }
      )

      clearAdminCookie(response)
      return response
    }

    return NextResponse.json(
      {
        ok: true,
        admin: {
          id: validated.userId,
          email: validated.email,
          role: validated.role,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'No se pudo validar la sesión admin' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  }
}