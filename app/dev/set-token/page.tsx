'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle } from 'lucide-react'

export default function SetTokenPage() {
    const router = useRouter()

    // Block access in production for security
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ALLOW_DEV_TOOLS !== 'true') {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                    <h1 className="text-4xl font-black text-foreground mb-4">🔒 Access Denied</h1>
                    <p className="text-lg font-semibold text-foreground/70 mb-4">
                        This development tool is not available in production.
                    </p>
                    <p className="text-sm text-foreground/50">
                        If you need to access this page, set NEXT_PUBLIC_ALLOW_DEV_TOOLS=true in your environment variables.
                    </p>
                </div>
            </div>
        )
    }

    const [token, setToken] = useState('')
    const [currentRole, setCurrentRole] = useState<string | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleSetToken = () => {
        if (!token.trim()) {
            setMessage({ type: 'error', text: 'Please enter a token' })
            return
        }

        try {
            // Set the cookie - redundant now as per spec but kept for old flows if any
            // The prompt says Authorization header is source of truth.
            // But for local dev via browser, we often need cookies or local storage.
            // Middleware reads 'auth_token' cookie as fallback.
            document.cookie = `auth_token=${token.trim()}; path=/; max-age=86400`

            // Also set in localStorage for client-side API calls if needed
            localStorage.setItem('auth_token', token.trim())

            setMessage({ type: 'success', text: 'Token set successfully! Redirecting...' })

            // Redirect based on role
            setTimeout(() => {
                const target = (currentRole === 'admin') ? '/admin' : '/dashboard'
                console.log('Redirecting to:', target)
                router.push(target)
            }, 500)
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to set token' })
        }
    }

    const handleClearToken = () => {
        document.cookie = 'auth_token=; path=/; max-age=0'
        localStorage.removeItem('auth_token')
        setToken('')
        setMessage({ type: 'success', text: 'Token cleared!' })
    }

    const generateTestToken = async (role: string) => {
        try {
            const response = await fetch('/api/dev/generate-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role })
            })

            if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || 'Failed to generate token')
            }

            const data = await response.json()
            setToken(data.token)
            setCurrentRole(role)
            setMessage({ type: 'success', text: `Generated ${role} token. Click "Set Token" to apply.` })
        } catch (error) {
            console.error(error)
            setMessage({ type: 'error', text: 'Failed to generate token. Make sure dev mode is enabled.' })
        }
    }

    return (
        <div className="min-h-screen bg-white p-8">
            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <h1 className="text-4xl font-black text-foreground mb-2">🔧 Dev Token Manager</h1>
                    <p className="text-muted-foreground font-semibold">
                        Set JWT tokens for testing authentication in development
                    </p>
                </div>

                <Card className="border-4 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <CardHeader>
                        <CardTitle className="font-black">Quick Generate</CardTitle>
                        <CardDescription className="font-semibold">
                            Generate and set a test token with RBAC roles
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex gap-2 flex-wrap">
                            <Button
                                onClick={() => generateTestToken('admin')}
                                className="border-4 border-foreground bg-primary text-primary-foreground font-black"
                            >
                                Generate Admin Token
                            </Button>
                            <Button
                                onClick={() => generateTestToken('client')}
                                className="border-4 border-foreground bg-secondary text-secondary-foreground font-black"
                            >
                                Generate Client Token
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-4 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <CardHeader>
                        <CardTitle className="font-black">Manual Token Entry</CardTitle>
                        <CardDescription className="font-semibold">
                            Paste a JWT token from the command line or external source
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            placeholder="Paste your JWT token here..."
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            className="font-mono text-sm border-4 border-foreground min-h-[120px]"
                        />

                        <div className="flex gap-2">
                            <Button
                                onClick={handleSetToken}
                                className="border-4 border-foreground bg-primary text-primary-foreground font-black"
                            >
                                Set Token
                            </Button>
                            <Button
                                onClick={handleClearToken}
                                variant="outline"
                                className="border-4 border-foreground font-black"
                            >
                                Clear Token
                            </Button>
                        </div>

                        {message && (
                            <Alert className={`border-4 border-foreground ${message.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
                                {message.type === 'success' ? (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                )}
                                <AlertDescription className="font-semibold">
                                    {message.text}
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                <div className="border-4 border-foreground bg-yellow-50 p-4">
                    <p className="font-black text-foreground mb-2">⚠️ Development Only</p>
                    <p className="text-sm font-semibold text-foreground/80">
                        This page should only be accessible in development. Make sure to remove or protect it in production!
                    </p>
                </div>
            </div>
        </div>
    )
}
