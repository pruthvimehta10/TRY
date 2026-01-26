'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Loader2, X } from 'lucide-react'
import { ModuleManager } from '@/components/admin/module-manager'

interface Course {
    id: string
    title: string
    category: string
    level: string
    total_students: number
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
            .select('*')
            .order('created_at', { ascending: false })

        if (data) {
            setCourses(data as Course[])
        }
        setLoading(false)
    }

    async function handleDeleteCourse(id: string) {
        if (!confirm('Are you sure you want to delete this course?')) return

        const { error } = await supabase
            .from('courses')
            .delete()
            .eq('id', id)

        if (error) {
            alert('Error deleting course: ' + error.message)
        } else {
            setCourses(courses.filter(c => c.id !== id))
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
                    <h2 className="text-3xl font-black tracking-tight text-foreground uppercase">Course Lab</h2>
                    <p className="text-muted-foreground font-bold italic">
                        Assemble your knowledge modules here.
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
                                <TableHead className="font-black text-foreground">Level</TableHead>
                                <TableHead className="font-black text-foreground">Students</TableHead>
                                <TableHead className="text-right font-black text-foreground">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {courses.map((course) => (
                                <TableRow
                                    key={course.id}
                                    className={`font-medium border-b-2 border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${selectedCourseId === course.id ? 'bg-yellow-50' : ''}`}
                                >
                                    <TableCell className="font-bold">{course.title}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="border-2 border-foreground font-black bg-white uppercase text-[10px]">
                                            {course.category}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-bold">{course.level}</TableCell>
                                    <TableCell className="font-bold">{course.total_students || 0}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {/* Usable Edit Button: Toggles Module Manager */}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectedCourseId(selectedCourseId === course.id ? null : course.id)}
                                                className={`border-2 border-foreground font-black transition-all ${selectedCourseId === course.id ? 'bg-foreground text-white' : 'bg-white text-foreground hover:bg-slate-100'}`}
                                            >
                                                {selectedCourseId === course.id ? <X className="mr-1 h-3 w-3" /> : <Edit className="mr-1 h-3 w-3" />}
                                                {selectedCourseId === course.id ? 'CLOSE' : 'MODULARIZE'}
                                            </Button>

                                            <Button variant="ghost" size="icon" asChild className="h-8 w-8 border-2 border-transparent hover:border-foreground hover:bg-primary/10">
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

                {/* Inline Module Manager */}
                {selectedCourseId && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="mb-4 flex items-center justify-between bg-foreground text-white p-3 border-4 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <h3 className="font-black uppercase tracking-tighter">Managing Modules for: <span className="text-yellow-400">{courses.find(c => c.id === selectedCourseId)?.title}</span></h3>
                            <Button size="sm" variant="ghost" onClick={() => setSelectedCourseId(null)} className="text-white hover:text-yellow-400 font-black">
                                <X className="h-4 w-4 mr-1" /> EXIT
                            </Button>
                        </div>
                        <div className="p-6 bg-slate-50 border-4 border-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                            <ModuleManager courseId={selectedCourseId} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
