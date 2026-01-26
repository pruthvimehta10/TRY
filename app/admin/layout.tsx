import { ThemeProvider } from '@/components/ui/themeProvider'
import { AdminSidebar } from '@/components/admin/admin-sidebar'

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            storageKey="admin-theme"
            disableTransitionOnChange
        >
            <div className="flex min-h-screen bg-secondary/20 transition-colors duration-300">
                <AdminSidebar />
                <main className="flex-1 p-8 overflow-y-auto">
                    <div className="mx-auto max-w-6xl">
                        {children}
                    </div>
                </main>
            </div>
        </ThemeProvider>
    )
}
