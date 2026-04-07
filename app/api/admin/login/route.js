import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { setAdminCookie } from '@/lib/admin-auth'
import { createAdminSupabaseClient } from '@/lib/admin-supabase'

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const accessToken = String(body.access_token || '')

  if (!accessToken) {
    return NextResponse.json({ error: 'Falta access token de Supabase Auth' }, { status: 400 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Faltan variables de Supabase' }, { status: 500 })
  }

  const authClient = createClient(url, anonKey)
  const { data: authData, error: authError } = await authClient.auth.getUser(accessToken)

  if (authError || !authData?.user) {
    return NextResponse.json({ error: 'Sesión inválida en Supabase Auth' }, { status: 401 })
  }

  try {
    const supabase = createAdminSupabaseClient()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id,email,role,is_active')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (!profile || profile.is_active === false || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Tu usuario no tiene permisos de administrador' }, { status: 403 })
    }

    const response = NextResponse.json({ ok: true, email: profile.email, role: profile.role })
    return setAdminCookie(response, {
      userId: profile.id,
      email: profile.email || authData.user.email,
      role: profile.role,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'No se pudo iniciar sesión' }, { status: 500 })
  }
}
