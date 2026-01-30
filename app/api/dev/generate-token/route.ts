import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'

export async function POST(request: NextRequest) {
    // Allow in development OR if explicitly enabled
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ALLOW_DEV_TOOLS !== 'true') {
        return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    try {
        const { role, sub } = await request.json()

        if (role !== 'admin' && role !== 'client') {
            return NextResponse.json({ error: 'Invalid role. Must be admin or client' }, { status: 400 })
        }

        const secret = process.env.EXTERNAL_JWT_SECRET || 'test-secret-key-change-in-production'
        const secretKey = new TextEncoder().encode(secret)

        const token = await new SignJWT({
            sub: sub || `test_${role}_id`,
            role: role,
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(secretKey)

        return NextResponse.json({ token })
    } catch (error) {
        console.error('Token generation error:', error)
        return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 })
    }
}
