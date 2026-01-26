'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, Users, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const sidebarItems = [
    {
        title: 'Dashboard',
        href: '/admin',
        icon: LayoutDashboard,
    },
    {
        title: 'Courses',
        href: '/admin/courses',
        icon: BookOpen,
    },
    {
        title: 'Users',
        href: '/admin/users',
        icon: Users,
    },
    {
        title: 'Settings',
        href: '/admin/settings',
        icon: Settings,
    },
]

import { ThemeToggle } from '@/components/admin/theme-toggle'

export function AdminSidebar() {
    const pathname = usePathname()

    return (
        <div className="flex h-full w-64 flex-col border-r-4 border-foreground bg-background text-foreground">
            <div className="flex h-16 items-center justify-between border-b-4 border-foreground px-6">
                <Link href="/" className="flex items-center gap-2 font-black text-xl tracking-tighter">
                    <span className="bg-foreground text-background px-2 py-1 rounded-sm">Edu</span>Admin
                </Link>
                <div onClick={(e) => e.stopPropagation()}>
                    <ThemeToggle />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto py-6">
                <nav className="grid items-start px-4 text-sm font-medium">
                    {sidebarItems.map((item, index) => (
                        <Link
                            key={index}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-3 font-bold transition-all hover:translate-x-1 hover:bg-secondary border-2 border-transparent",
                                pathname === item.href ? "bg-secondary border-foreground" : "hover:text-foreground"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            {item.title}
                        </Link>
                    ))}
                </nav>
            </div>
            <div className="mt-auto border-t-4 border-foreground p-4">
                <Button variant="ghost" className="w-full justify-start gap-3 font-bold hover:bg-destructive/10 hover:text-destructive">
                    <LogOut className="h-5 w-5" />
                    Sign Out
                </Button>
            </div>
        </div>
    )
}
