import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname

    // 0. Exclude public paths and dev tools
    if (
        path.startsWith('/_next') ||
        path.startsWith('/static') ||
        path.endsWith('.ico') ||
        path.match(/\.(svg|png|jpg|jpeg|gif|webp)$/) ||
        path.startsWith('/dev') || // Allow dev tools
        path.startsWith('/api/dev') // Allow dev API
    ) {
        return NextResponse.next()
    }

    // 1. Extract Token
    // Priority: Authorization Header > Cookie (fallback for dev convenience)
    let token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
        token = request.cookies.get('auth_token')?.value
    }

    if (!token) {
        console.log('Middleware: No token found for path:', path)
        return new NextResponse(
            JSON.stringify({ error: 'Authentication required' }),
            { status: 401, headers: { 'content-type': 'application/json' } }
        )
    }

    try {
        const secretStr = process.env.EXTERNAL_JWT_SECRET
        if (!secretStr) {
            console.error('CRITICAL: EXTERNAL_JWT_SECRET is not defined')
            return new NextResponse(
                JSON.stringify({ error: 'Server misconfiguration' }),
                { status: 500, headers: { 'content-type': 'application/json' } }
            )
        }

        const secret = new TextEncoder().encode(secretStr)
        // This verifies signature AND expiry (exp claim)
        const { payload } = await jwtVerify(token, secret)

        const userId = payload.sub as string
        const role = payload.role as string // "admin" | "client"

        // 2. Role Guard
        // Admin-only routes
        if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
            if (role !== 'admin') {
                console.log(`Middleware: Access denied to ${path} for role ${role}`)
                return new NextResponse(
                    JSON.stringify({ error: 'Forbidden: Admin access required' }),
                    { status: 403, headers: { 'content-type': 'application/json' } }
                )
            }
        }

        // Client routes (Dashboard, Courses, API)
        // Allow: role === "client" OR "admin"
        const isClientRoute = path.startsWith('/dashboard') || path.startsWith('/courses') || path.startsWith('/api')
        if (isClientRoute) {
            if (role !== 'client' && role !== 'admin') {
                console.log(`Middleware: Access denied to ${path} for role ${role}`)
                return new NextResponse(
                    JSON.stringify({ error: 'Forbidden: Client access required' }),
                    { status: 403, headers: { 'content-type': 'application/json' } }
                )
            }
        }

        // 3. Attach Headers
        // Forward verified claims via headers: x-user-id, x-user-role
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-user-id', userId || '')
        requestHeaders.set('x-user-role', role || '')

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        })

    } catch (error) {
        console.error('JWT Verification failed:', error)
        return new NextResponse(
            JSON.stringify({ error: 'Invalid or expired token' }),
            { status: 401, headers: { 'content-type': 'application/json' } }
        )
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
