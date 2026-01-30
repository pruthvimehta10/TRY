import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export async function GET(request: NextRequest) {
    try {
        // 1. Get token from header or cookie
        const authHeader = request.headers.get('authorization')
        let token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null

        if (!token) {
            token = request.cookies.get('auth_token')?.value || null
        }

        if (!token) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // 2. Verify Token
        const secretStr = process.env.EXTERNAL_JWT_SECRET
        if (!secretStr) {
            return NextResponse.json({ error: 'Internal configuration error' }, { status: 500 })
        }

        const secret = new TextEncoder().encode(secretStr)
        const { payload } = await jwtVerify(token, secret)

        // 3. Return payload
        return NextResponse.json({
            authenticated: true,
            user: {
                userId: payload.sub,
                role: payload.role,
            },
            claims: payload // Return full payload for debugging/inspection
        })

    } catch (error: any) {
        console.error('Auth check failed:', error)
        return NextResponse.json({
            authenticated: false,
            error: error.message || 'Invalid token'
        }, { status: 401 })
    }
}
