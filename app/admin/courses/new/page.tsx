'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function NewCoursePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const supabase = createClient()

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)

        const formData = new FormData(event.currentTarget)
        const title = formData.get('title') as string
        const description = formData.get('description') as string
        const level = formData.get('level') as string

        try {
            const res = await fetch('/api/admin/courses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, level }),
            })

            const result = await res.json()

            if (!res.ok) {
                alert('Error creating course: ' + result.error)
            } else {
                // Redirect to courses page with cache bust
                router.push('/courses?_t=' + Date.now())
            }
        } catch (error: any) {
            alert('Error creating course: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" asChild className="pl-0 hover:bg-transparent -ml-2">
                    <Link href="/admin/courses" className="flex items-center gap-2 font-bold text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" /> Back to Courses
                    </Link>
                </Button>
            </div>

            <div>
                <h2 className="text-3xl font-black tracking-tight text-foreground">Create New Course</h2>
                <p className="text-muted-foreground font-bold">
                    Fill in the details to create a new course.
                </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-8 border-4 border-foreground p-8 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-background">
                <div className="space-y-2">
                    <Label htmlFor="title" className="font-bold">Course Title</Label>
                    <Input id="title" name="title" required placeholder="e.g. Advanced React Patterns" className="border-2 border-foreground" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description" className="font-bold">Description</Label>
                    <Textarea id="description" name="description" placeholder="Brief description of the course..." className="border-2 border-foreground min-h-[100px]" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="level" className="font-bold">Level</Label>
                    <Select name="level" required defaultValue="Beginner">
                        <SelectTrigger className="border-2 border-foreground">
                            <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Beginner">Beginner</SelectItem>
                            <SelectItem value="Intermediate">Intermediate</SelectItem>
                            <SelectItem value="Advanced">Advanced</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="pt-4 flex justify-end gap-4">
                    <Button type="button" variant="ghost" asChild className="font-bold">
                        <Link href="/admin/courses">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={loading} className="border-4 border-foreground bg-primary text-primary-foreground font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Course
                    </Button>
                </div>
            </form>
        </div>
    )
}
