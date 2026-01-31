'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Loader2, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { use } from 'react'
import { QuizBuilder } from '@/components/admin/quiz-builder'

export default function NewTopicPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: courseId } = use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [videoUrl, setVideoUrl] = useState('')
    const [quizQuestions, setQuizQuestions] = useState<any[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        setUploadProgress(10)

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${crypto.randomUUID()}.${fileExt}`
            const filePath = `topic-videos/${fileName}`

            const { data, error } = await supabase.storage
                .from('videos')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (error) throw error

            setUploadProgress(80)

            const { data: { publicUrl } } = supabase.storage
                .from('videos')
                .getPublicUrl(filePath)

            setVideoUrl(publicUrl)
            setUploadProgress(100)

            setTimeout(() => {
                setUploading(false)
                setUploadProgress(0)
            }, 500)

        } catch (error: any) {
            alert('Upload failed: ' + error.message)
            setUploading(false)
            setUploadProgress(0)
        }
    }

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)

        const formData = new FormData(event.currentTarget)
        const title = formData.get('title') as string
        const description = formData.get('description') as string

        if (!videoUrl) {
            alert('Please upload a video file')
            setLoading(false)
            return
        }

        // 1. Get current max order to append to end
        const { data: existingTopics } = await supabase
            .from('topics')
            .select('order_index')
            .eq('course_id', courseId)
            .order('order_index', { ascending: false })
            .limit(1)

        const nextOrder = (existingTopics?.[0]?.order_index ?? -1) + 1

        // 2. Insert new topic
        const { data: newTopic, error: topicError } = await supabase.from('topics').insert({
            course_id: courseId,
            title,
            description,
            video_url: videoUrl,
            order_index: nextOrder,
        }).select().single()

        if (topicError && topicError.code === '42703') {
            alert('Error creating topic (Column mismatch?): ' + topicError.message)
        } else if (topicError) {
            alert('Error creating topic: ' + topicError.message)
        } else {
            // 3. Insert quiz questions if any
            if (quizQuestions.length > 0 && newTopic) {
                const questionsToInsert = quizQuestions.map((q, index) => ({
                    topic_id: newTopic.id,
                    question: q.question,
                    options: q.options,
                    correct_answer: q.correctAnswer,
                    question_order: index,
                    question_type: 'multiple_choice'
                }))

                const { error: quizError } = await supabase
                    .from('quiz_questions')
                    .insert(questionsToInsert)

                if (quizError) {
                    console.error('Error saving quiz questions:', quizError)
                    alert('Topic created but quiz questions failed to save: ' + quizError.message)
                }
            }

            router.push(`/admin/courses/${courseId}`)
            router.refresh()
        }
        setLoading(false)
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" asChild className="pl-0 hover:bg-transparent -ml-2">
                    <Link href={`/admin/courses/${courseId}`} className="flex items-center gap-2 font-bold text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" /> Back to Course
                    </Link>
                </Button>
            </div>

            <div>
                <h2 className="text-3xl font-black tracking-tight text-foreground">Add New Topic</h2>
                <p className="text-muted-foreground font-bold">
                    Add a video topic to your course.
                </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-8 border-4 border-foreground p-8 rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-background">
                <div className="space-y-2">
                    <Label htmlFor="title" className="font-bold text-foreground">Topic Title</Label>
                    <Input id="title" name="title" required placeholder="e.g. Introduction to React" className="border-2 border-foreground bg-background text-foreground placeholder:text-muted-foreground" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description" className="font-bold text-foreground">Description</Label>
                    <Textarea id="description" name="description" placeholder="Brief summary of what this topic covers..." className="border-2 border-foreground min-h-[100px] bg-background text-foreground placeholder:text-muted-foreground" />
                </div>

                <div className="space-y-3 bg-secondary/20 p-4 border-2 border-foreground rounded-xl">
                    <Label className="font-bold text-foreground flex items-center gap-2">
                        <Upload className="h-4 w-4" /> Video Upload
                    </Label>

                    <div className="space-y-3">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept="video/*"
                            className="hidden"
                        />
                        <Button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="w-full border-2 border-foreground bg-yellow-400 text-foreground font-black hover:bg-yellow-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
                        >
                            {uploading ? (
                                <><Loader2 className="animate-spin mr-2 h-4 w-4" /> UPLOADING {uploadProgress}%</>
                            ) : (
                                <><Upload className="mr-2 h-4 w-4 stroke-[3px]" /> UPLOAD FROM COMPUTER</>
                            )}
                        </Button>
                        {uploading && (
                            <div className="h-2 w-full bg-foreground/10 border border-foreground overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        )}
                        {videoUrl && !uploading && (
                            <div className="p-3 bg-green-500/20 border-2 border-green-500 rounded-lg">
                                <p className="text-sm font-bold text-green-600 dark:text-green-400">✅ Video uploaded successfully</p>
                            </div>
                        )}
                    </div>
                </div>

                <QuizBuilder onQuestionsChange={setQuizQuestions} />

                <div className="pt-4 flex justify-end gap-4">
                    <Button type="button" variant="ghost" asChild className="font-bold">
                        <Link href={`/admin/courses/${courseId}`}>Cancel</Link>
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="border-4 border-foreground bg-background text-foreground hover:bg-secondary font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Topic
                    </Button>
                </div>
            </form>
        </div>
    )
}
