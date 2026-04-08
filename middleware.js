import { NextResponse } from 'next/server'

const ADMIN_SESSION_COOKIE = 'dtup_admin_session'

export function middleware(request) {
  const { pathname } = request.nextUrl
  if (!pathname.startsWith('/admin')) return NextResponse.next()

  const hasSessionCookie = Boolean(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)

  if (pathname.startsWith('/admin/login')) {
    if (hasSessionCookie) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return NextResponse.next()
  }

  if (!hasSessionCookie) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = { matcher: ['/admin/:path*'] }
