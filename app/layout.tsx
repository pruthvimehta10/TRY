import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/ui/themeProvider'
import { UserProvider } from '@/components/user-provider'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'RIIDL - Learn at Your Pace',
  description: 'Professional online learning platform with video courses, interactive quizzes, and comprehensive course management',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Read headers (server-side only)
  const { headers } = await import('next/headers');
  const headersList = await headers();
  const username = headersList.get('x-user-name') || '';
  const labId = headersList.get('x-lab-id') || '';
  const role = headersList.get('x-user-role') || '';

  const user = username ? { username, labId, role } : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <UserProvider user={user}>
          {children}
          <Analytics />
        </UserProvider>
      </body>
    </html>
  )
}
