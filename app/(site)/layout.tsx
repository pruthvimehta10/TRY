import { ThemeProvider } from '@/components/ui/themeProvider'
import { Navbar } from '@/components/navbar'

export default function SiteLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            storageKey="client-theme"
            disableTransitionOnChange
        >
            {/* Navbar is strictly for client side, admin has its own sidebar */}
            {/* The Navbar component itself might need adjustment if it was in global layout before, but it wasn't. It was imported in page.tsx. */}
            {/* Wait, Navbar was NOT in global layout? Let me check where Navbar is used. */}
            {/* Navbar was in individual pages like app/page.tsx and app/dashboard/page.tsx. */}
            {/* So I don't necessarily need to put it here unless I want it on all site pages. */}
            {/* For now, I'm just wrapping in ThemeProvider. */}
            {children}
        </ThemeProvider>
    )
}
