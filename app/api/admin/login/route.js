import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { setAdminCookie } from '@/lib/admin-auth'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'
import { rateLimits } from '@/lib/rate-limiter'
import { withApiObservability } from '@/lib/observability'

export const runtime = 'nodejs'

function getAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Faltan variables de Supabase')
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function POST(request) {
  return withApiObservability(request, '/api/admin/login', async () => {
    const rateLimit = await rateLimits.strict(request)
    if (rateLimit) {
      return NextResponse.json(rateLimit.body, {
        status: rateLimit.status,
        headers: rateLimit.headers,
      })
    }

    const body = await request.json().catch(() => ({}))
    const accessToken = String(body?.access_token || '').trim()

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Falta access token de Supabase Auth' },
        { status: 400 }
      )
    }

    const authClient = getAuthClient()
    const { data: authData, error: authError } = await authClient.auth.getUser(accessToken)

    if (authError || !authData?.user?.id) {
      return NextResponse.json(
        { error: 'Sesión inválida en Supabase Auth' },
        { status: 401 }
      )
    }

    const supabase = createAdminSupabaseClient()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id,email,role,is_active')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message || 'No se pudo validar el perfil admin' },
        { status: 500 }
      )
    }

    if (!profile || profile.is_active === false || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Tu usuario no tiene permisos de administrador' },
        { status: 403 }
      )
    }

    const response = NextResponse.json(
      {
        ok: true,
        admin: {
          id: profile.id,
          email: profile.email || authData.user.email || '',
          role: profile.role,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )

    return setAdminCookie(response, {
      userId: profile.id,
      email: profile.email || authData.user.email || '',
      role: profile.role,
    })
  })
}
