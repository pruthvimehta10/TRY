import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/navbar'
import { ActivityHeatmap } from '@/components/dashboard/activity-heatmap'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GraduationCap, CheckCircle2, Target, Clock, Laptop } from 'lucide-react'
import { headers } from 'next/headers'

export default async function DashboardPage() {
    const supabase = await createClient()
    const headerList = await headers()
    const username = headerList.get('x-user-name')
    const labid = headerList.get('x-lab-id')

    // In a real app, we'd use the user ID from auth. 
    // For this dashboard, we'll use the anonymous/cookie session user or filter by labid.
    // However, the middleware passes user info in headers. We can fetch the user profile.
    const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('email', username) // Assuming username in header is email for now, or use x-user-id if added
        .single()

    const userId = userProfile?.id

    // 1. Fetch Stats
    const { count: enrolledCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

    const { count: completedLessonsCount } = await supabase
        .from('lesson_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

    const { data: quizScores } = await supabase
        .from('quiz_scores')
        .select('score')
        .eq('user_id', userId)

    const avgAccuracy = quizScores && quizScores.length > 0
        ? Math.round(quizScores.reduce((acc, curr) => acc + curr.score, 0) / quizScores.length)
        : 0

    const { data: completedLessons } = await supabase
        .from('lesson_completions')
        .select(`
            lesson_id,
            lessons (duration)
        `)
        .eq('user_id', userId)

    const totalTimeSpent = (completedLessons as any[])?.reduce((acc, curr) => acc + (curr.lessons?.duration || 0), 0) || 0

    // 2. Fetch Heatmap Data
    // Combine lesson completions and quiz attempts by date
    const { data: lessonActivity } = await supabase
        .from('lesson_completions')
        .select('completed_at')
        .eq('user_id', userId)

    const { data: quizActivity } = await supabase
        .from('quiz_scores')
        .select('attempted_at')
        .eq('user_id', userId)

    const activityMap: Record<string, number> = {}

    lessonActivity?.forEach(a => {
        const d = a.completed_at.split('T')[0]
        activityMap[d] = (activityMap[d] || 0) + 1
    })

    quizActivity?.forEach(a => {
        const d = a.attempted_at.split('T')[0]
        activityMap[d] = (activityMap[d] || 0) + 1
    })

    const heatmapData = Object.entries(activityMap).map(([date, count]) => ({ date, count }))

    const stats = [
        {
            title: 'Enrolled Courses',
            value: enrolledCount || 0,
            icon: GraduationCap,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10'
        },
        {
            title: 'Lessons Completed',
            value: completedLessonsCount || 0,
            icon: CheckCircle2,
            color: 'text-green-500',
            bg: 'bg-green-500/10'
        },
        {
            title: 'Avg. Accuracy',
            value: `${avgAccuracy}%`,
            icon: Target,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10'
        },
        {
            title: 'Learning Time',
            value: `${totalTimeSpent}m`,
            icon: Clock,
            color: 'text-orange-500',
            bg: 'bg-orange-500/10'
        }
    ]

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                <div className="flex flex-col space-y-2">
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
                        <Laptop className="h-8 w-8 text-primary" />
                        My Learning Dashboard
                    </h1>
                    <p className="text-muted-foreground font-bold">
                        Welcome back, <span className="text-foreground">{username || 'Learner'}</span>! Here&apos;s your progress overview.
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat, i) => (
                        <Card key={i} className="border-4 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <CardTitle className="text-sm font-black uppercase tracking-wider text-muted-foreground">
                                    {stat.title}
                                </CardTitle>
                                <div className={`${stat.bg} p-2 rounded-xl border-2 border-foreground`}>
                                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black">{stat.value}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Activity Heatmap */}
                <Card className="border-4 border-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-card overflow-hidden">
                    <CardHeader className="border-b-4 border-foreground bg-muted/30">
                        <CardTitle className="font-black flex items-center gap-2">
                            Learning Streak & Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <ActivityHeatmap data={heatmapData} />
                    </CardContent>
                </Card>

                {/* Recent Courses / Progress (Future expansion) */}
                <div className="grid gap-8 md:grid-cols-2">
                    {/* Add more sections here if needed */}
                </div>
            </main>
        </div>
    )
}
