import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicPaths = ['/login', '/register', '/']

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Cookie-dən token yoxla
  const authToken = request.cookies.get('sb-auth-token')

  const isPublic = publicPaths.includes(pathname)

  // Korunan səhifəyə giriş - redirect login-ə
  if (!isPublic && !authToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Login/register-dən çıxış - dashboard-a yönəlt
  if (isPublic && authToken && pathname !== '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
