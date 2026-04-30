import { NextResponse } from 'next/server'

const ADMIN_SESSION_COOKIE = 'dtup_admin_session'

const securityHeaders = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-XSS-Protection': '0',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

export function proxy(request) {
  const { pathname } = request.nextUrl
  const requestId =
    request.headers.get('x-request-id') ||
    `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  if (pathname.startsWith('/admin')) {
    const hasSessionCookie = Boolean(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)

    if (pathname.startsWith('/admin/login')) {
      if (hasSessionCookie) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    } else if (!hasSessionCookie) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value)
  }
  response.headers.set('x-request-id', requestId)

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
