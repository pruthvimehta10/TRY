'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, Save, FileQuestion, Edit, Trash2, Loader2, Video } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LessonEditDialog } from '@/components/admin/lesson-edit-dialog'
import { ModuleManager } from '@/components/admin/module-manager'

interface Lesson {
    id: string
    title: string
    description?: string
    video_url?: string
    video_duration_seconds?: number
    order_index: number
    is_published: boolean
    quiz_questions: { count: number }[]
}

interface Course {
    id: string
    title: string
    description: string
    category: string
    level: string
    lessons: Lesson[]
}

export default function AdminCourseEditPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: courseId } = use(params)
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(false)
    const [course, setCourse] = useState<Course | null>(null)
    const [lessons, setLessons] = useState<Lesson[]>([])
    const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
    const [dialogOpen, setDialogOpen] = useState(false)

    // Form state
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [category, setCategory] = useState('')
    const [level, setLevel] = useState('')

    useEffect(() => {
        fetchCourse()
    }, [courseId])

    async function fetchCourse() {
        const { data } = await supabase
            .from('courses')
            .select(`
                *,
                lessons (
                    id,
                    title,
                    description,
                    video_url,
                    video_duration_seconds,
                    order_index,
                    is_published,
                    quiz_questions (count)
                )
            `)
            .eq('id', courseId)
            .single()

        if (data) {
            setCourse(data as Course)
            setTitle(data.title)
            setDescription(data.description || '')
            setCategory(data.category || '')
            setLevel(data.level || '')

            const sortedLessons = ((data.lessons || []) as Lesson[]).sort((a, b) => a.order_index - b.order_index)
            setLessons(sortedLessons)
        }
    }

    async function handleSaveCourse() {
        setLoading(true)
        const { error } = await supabase
            .from('courses')
            .update({
                title,
                description,
                category,
                level,
            })
            .eq('id', courseId)

        setLoading(false)

        if (error) {
            alert('Error saving course: ' + error.message)
        } else {
            alert('Course saved successfully!')
            router.refresh()
        }
    }

    async function handleDeleteLesson(lessonId: string) {
        if (!confirm('Are you sure you want to delete this lesson? This will also delete all associated quizzes.')) {
            return
        }

        const { error } = await supabase
            .from('lessons')
            .delete()
            .eq('id', lessonId)

        if (error) {
            alert('Error deleting lesson: ' + error.message)
        } else {
            fetchCourse()
        }
    }

    function openEditDialog(lesson: Lesson) {
        setEditingLesson(lesson)
        setDialogOpen(true)
    }

    if (!course) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" asChild className="pl-0 hover:bg-transparent -ml-2">
                    <Link href="/admin/courses" className="flex items-center gap-2 font-bold text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" /> Back to Courses
                    </Link>
                </Button>
            </div>

            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black tracking-tight text-foreground">Edit Course</h2>
                <Button
                    onClick={handleSaveCourse}
                    disabled={loading}
                    className="border-4 border-foreground bg-primary text-primary-foreground font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Main Info */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-4 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="font-black">Course Details</CardTitle>
                            <Button size="sm" variant="outline" asChild className="border-2 border-foreground font-bold">
                                <Link href={`/admin/courses/${courseId}/lessons/new`}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Lesson
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="font-bold">Title</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="border-2 border-foreground"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description" className="font-bold">Description</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="border-2 border-foreground min-h-[100px]"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-4 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="font-black">Lessons & Videos</CardTitle>
                            <Badge variant="outline" className="border-2 border-foreground font-bold">
                                {lessons.length} Lessons
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="font-black text-foreground">#</TableHead>
                                        <TableHead className="font-black text-foreground">Title</TableHead>
                                        <TableHead className="font-black text-foreground">Video</TableHead>
                                        <TableHead className="font-black text-foreground">Quiz</TableHead>
                                        <TableHead className="text-right font-black text-foreground">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lessons.map((lesson, idx) => (
                                        <TableRow key={lesson.id} className="font-medium">
                                            <TableCell>{idx + 1}</TableCell>
                                            <TableCell className="font-semibold">{lesson.title}</TableCell>
                                            <TableCell>
                                                {lesson.video_url ? (
                                                    <Badge variant="outline" className="border-2 border-foreground bg-blue-100 text-blue-800">
                                                        <Video className="h-3 w-3 mr-1" />
                                                        {lesson.video_duration_seconds ? `${Math.round(lesson.video_duration_seconds / 60)}m` : 'Video'}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">No video</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {lesson.quiz_questions && lesson.quiz_questions[0]?.count > 0 ? (
                                                    <Badge variant="outline" className="border-2 border-foreground bg-green-100 text-green-800">
                                                        {lesson.quiz_questions[0].count} Qs
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">No Quiz</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => openEditDialog(lesson)}
                                                        className="h-8 w-8"
                                                        title="Edit Lesson"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        asChild
                                                        className="h-8 w-8"
                                                        title="Manage Quiz"
                                                    >
                                                        <Link href={`/admin/courses/${courseId}/lessons/${lesson.id}/quiz`}>
                                                            <FileQuestion className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteLesson(lesson.id)}
                                                        className="h-8 w-8 hover:text-destructive"
                                                        title="Delete Lesson"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {lessons.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                No lessons yet. Click "Add Lesson" to get started.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Module Management */}
                    <div className="pt-6 border-t-8 border-foreground border-dashed">
                        <ModuleManager courseId={courseId} />
                    </div>
                </div>

                {/* Sidebar Settings */}
                <div className="space-y-6">
                    <Card className="border-4 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                        <CardHeader>
                            <CardTitle className="font-black">Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="font-bold">Category</Label>
                                <Input
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="border-2 border-foreground"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold">Level</Label>
                                <Input
                                    value={level}
                                    onChange={(e) => setLevel(e.target.value)}
                                    className="border-2 border-foreground"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-4 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-blue-50">
                        <CardHeader>
                            <CardTitle className="font-black text-sm">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button
                                asChild
                                variant="outline"
                                className="w-full border-2 border-foreground font-bold justify-start"
                            >
                                <Link href={`/admin/courses/${courseId}/lessons/new`}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Lesson
                                </Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="w-full border-2 border-foreground font-bold justify-start"
                            >
                                <Link href={`/courses/${courseId}`} target="_blank">
                                    <Video className="mr-2 h-4 w-4" /> Preview Course
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <LessonEditDialog
                lesson={editingLesson}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSuccess={fetchCourse}
            />
        </div>
    )
}
