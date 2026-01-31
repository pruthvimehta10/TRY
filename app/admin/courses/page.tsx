'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Loader2, Video } from 'lucide-react'

interface Course {
    id: string
    title: string
    level: string
    total_students: number
    categories?: { name: string }
}

export default function AdminCoursesPage() {
    const supabase = createClient()
    const [courses, setCourses] = useState<Course[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchCourses()
    }, [])

    async function fetchCourses() {
        setLoading(true)
        const { data } = await supabase
            .from('courses')
            .select(`
                *,
                categories (name)
            `)
            .order('created_at', { ascending: false })

        if (data) {
            setCourses(data as Course[])
        }
        setLoading(false)
    }

    async function handleDeleteCourse(id: string) {
        if (!confirm('Are you sure you want to delete this course? This will permanently delete all topics, quizzes, and enrollments associated with this course.')) {
            return
        }

<<<<<<< Updated upstream
        try {
            console.log('Starting course deletion for:', id)

            // Call the API endpoint instead of direct Supabase deletion
            const response = await fetch(`/api/courses?id=${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete course')
            }

            console.log('Course deletion result:', result)

            // Remove from local state
=======
        // Use API route with Service Role to bypass RLS
        const res = await fetch(`/api/courses/${id}`, {
            method: 'DELETE'
        })

        if (!res.ok) {
            const err = await res.json()
            alert('Error deleting course: ' + (err.error || 'Unknown error'))
        } else {
>>>>>>> Stashed changes
            setCourses(courses.filter(c => c.id !== id))
            
            // Show success message
            alert('Course deleted successfully!')
            
        } catch (error: any) {
            console.error('Course deletion error:', error)
            
            // Provide detailed error message
            let errorMessage = 'Error deleting course: '
            
            if (error.message.includes('foreign key constraint')) {
                errorMessage += 'Foreign key constraint violation. Related data exists that cannot be automatically deleted.'
            } else if (error.message.includes('permission')) {
                errorMessage += 'You do not have permission to delete this course.'
            } else if (error.message.includes('does not exist')) {
                errorMessage += 'One of the required tables does not exist. Please check your database schema.'
            } else {
                errorMessage += error.message
            }
            
            alert(errorMessage + '\n\nCheck the browser console and server logs for detailed error information.')
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
                <Button asChild className="border-4 border-foreground bg-primary text-primary-foreground font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
                    <Link href="/admin/courses/new">
                        <Plus className="mr-2 h-4 w-4 stroke-[3px]" /> Add Course
                    </Link>
                </Button>
            </div>

            <div className="grid gap-6">
                <div className="border-4 border-foreground rounded-lg overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-background">
                    <Table>
                        <TableHeader className="bg-secondary/50 border-b-4 border-foreground">
                            <TableRow>
                                <TableHead className="font-black text-foreground">Title</TableHead>
                                <TableHead className="font-black text-foreground">Category</TableHead>
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
                                    <TableCell className="font-bold">
                                        {course.categories?.name ? (
                                            <Badge variant="outline" className="border-2 border-foreground">
                                                {course.categories.name}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground text-xs italic">Uncategorized</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-bold">{course.total_students || 0}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                asChild
                                                className="h-8 w-8 border-2 border-foreground bg-background text-foreground hover:bg-muted"
                                                title="Edit Course"
                                            >
                                                <Link href={`/admin/courses/${course.id}`}>
                                                    <Edit className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteCourse(course.id)}
                                                className="h-8 w-8 border-2 border-transparent hover:border-foreground hover:bg-destructive/10 hover:text-destructive"
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
