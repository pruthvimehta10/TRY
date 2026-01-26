import { createClient } from '@/lib/supabase/server'
import { OverviewStats } from '@/components/admin/overview-stats'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminDashboard() {
    const supabase = await createClient()

    // Fetch real counts
    const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

    const { count: courseCount } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })

    const { count: enrollmentCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })

    // Calculate revenue based on enrollments
    const revenue = (enrollmentCount || 0) * 49.99

    // Fetch recent activities (enrollments)
    const { data: recentActivities } = await supabase
        .from('enrollments')
        .select(`
            id,
            enrolled_at,
            users (full_name, email),
            courses (title)
        `)
        .order('enrolled_at', { ascending: false })
        .limit(5)

    const activities = (recentActivities as any[]) || []

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-black tracking-tight text-foreground">Dashboard</h2>
                <p className="text-muted-foreground font-bold">
                    Overview of your platform's performance.
                </p>
            </div>

            <OverviewStats
                totalUsers={userCount || 0}
                totalCourses={courseCount || 0}
                totalEnrollments={enrollmentCount || 0}
                totalRevenue={Math.round(revenue)}
            />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 border-4 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <CardHeader>
                        <CardTitle className="font-black">Enrollment Trends</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground font-bold">
                            Chart Placeholder (Recharts integration required)
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3 border-4 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <CardHeader>
                        <CardTitle className="font-black">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {activities.length > 0 ? (
                                activities.map((activity) => (
                                    <div key={activity.id} className="flex items-center gap-4 border-b-2 border-border/50 last:border-0 last:pb-0">
                                        <div className="h-9 w-9 rounded-full bg-primary/20 border-2 border-foreground flex items-center justify-center font-bold">
                                            {activity.users?.full_name?.charAt(0) || activity.users?.email?.charAt(0) || 'U'}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold leading-none">
                                                {activity.users?.full_name || activity.users?.email || 'Anonymous'} enrolled in{' '}
                                                <span className="text-primary">{activity.courses?.title}</span>
                                            </p>
                                            <p className="text-xs text-muted-foreground font-semibold">
                                                {new Date(activity.enrolled_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground font-bold">
                                    No recent activity found.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
