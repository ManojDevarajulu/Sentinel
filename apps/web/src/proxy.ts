import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require authentication
const PROTECTED_ROUTES = ['/dashboard', '/profile']

// Routes that logged-in users should NOT access (redirect to dashboard)
const AUTH_ROUTES = ['/login']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Read the Supabase session from the cookie set by the Supabase client
  // Cookie names follow the pattern: sb-<project-ref>-auth-token
  const hasSession = request.cookies.getAll().some(
    (cookie) => cookie.name.includes('sb-') && cookie.name.includes('-auth-token')
  )

  // Redirect unauthenticated users trying to access protected routes
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route))
  if (isProtected && !hasSession) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from login page → dashboard
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))
  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
