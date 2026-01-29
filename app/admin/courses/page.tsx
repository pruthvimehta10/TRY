'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getJWTFromClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Loader2 } from 'lucide-react'

interface Course {
    id: string
    title: string
    level: string
    total_students: number
    topics?: { count: number }[]
}

export default function AdminCoursesPage() {
    const supabase = createClient()
    const [courses, setCourses] = useState<Course[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)

    useEffect(() => {
        fetchCourses()
    }, [])

    async function fetchCourses() {
        setLoading(true)
        const { data } = await supabase
            .from('courses')
            .select('*, topics(count)')
            .order('created_at', { ascending: false })

        if (data) {
            setCourses(data as Course[])
        }
        setLoading(false)
    }

    async function handleDeleteCourse(id: string) {
        if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) return

        try {
            const token = getJWTFromClient()
            const res = await fetch(`/api/admin/courses/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            })

            const result = await res.json()

            if (!res.ok) {
                alert('Error deleting course: ' + result.error)
            } else {
                setCourses(courses.filter(c => c.id !== id))
                alert('Course deleted successfully')
            }
        } catch (error: any) {
            alert('Error deleting course: ' + error.message)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-foreground uppercase">Course Management</h2>
                    <p className="text-muted-foreground font-bold italic">
                        Manage your courses and learning content here.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button asChild className="border-4 border-foreground bg-primary text-primary-foreground font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                        <Link href="/admin/courses/new">
                            <Plus className="mr-2 h-4 w-4 stroke-[3px]" /> Add Course
                        </Link>
                    </Button>
                    <Button asChild className="border-4 border-foreground bg-secondary text-foreground font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:text-white dark:bg-secondary dark:text-foreground dark:hover:text-white transition-all">
                        <Link href="/admin/topics">
                            <Plus className="mr-2 h-4 w-4 stroke-[3px]" /> Manage Topics
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid gap-6">
                <div className="border-4 border-foreground rounded-lg overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-background">
                    <Table>
                        <TableHeader className="bg-secondary/50 border-b-4 border-foreground">
                            <TableRow>
                                <TableHead className="font-black text-foreground">Title</TableHead>
                                <TableHead className="font-black text-foreground">Topics</TableHead>
                                <TableHead className="font-black text-foreground">Students</TableHead>
                                <TableHead className="text-right font-black text-foreground">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {courses.map((course) => (
                                <TableRow
                                    key={course.id}
                                    className="font-medium border-b-2 border-border/50 last:border-0 hover:bg-muted/50 transition-colors"
                                >
                                    <TableCell className="font-bold">{course.title}</TableCell>
                                    <TableCell className="font-bold">{course.topics?.[0]?.count || 0}</TableCell>
                                    <TableCell className="font-bold">{course.total_students || 0}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteCourse(course.id)}
                                                className="h-8 w-8 text-destructive hover:text-white hover:bg-destructive dark:text-destructive dark:hover:bg-destructive dark:hover:text-white"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
