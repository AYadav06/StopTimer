import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'timer_session'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public paths: login page and auth API.
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Protect everything else (dashboard + sessions/days APIs).
  const isProtected =
    pathname === '/' ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/api/sessions') ||
    pathname.startsWith('/api/days') ||
    pathname.startsWith('/api/me')

  if (isProtected) {
    const token = request.cookies.get(SESSION_COOKIE)?.value
    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
      }
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)'],
}
