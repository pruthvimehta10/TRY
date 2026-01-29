import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Loader2, Upload, Video as VideoIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface LessonEditDialogProps {
    lesson: {
        id: string
        title: string
        description?: string
        video_url?: string
        video_duration_seconds?: number
    } | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function LessonEditDialog({ lesson, open, onOpenChange, onSuccess }: LessonEditDialogProps) {
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [videoUrl, setVideoUrl] = useState('')
    const [topicId, setTopicId] = useState(lesson?.topic_id || '')
    const [courses, setCourses] = useState<{ id: string, title: string }[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const supabase = createClient()

    useEffect(() => {
        if (lesson?.video_url) {
            setVideoUrl(lesson.video_url)
        } else {
            setVideoUrl('')
        }
        if (lesson?.topic_id) {
            setTopicId(lesson.topic_id)
        }
        fetchCourses()
    }, [lesson])

    async function fetchCourses() {
        const { data } = await supabase.from('courses').select('id, title').order('title')
        if (data) setCourses(data)
    }

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        setUploadProgress(10)

        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${crypto.randomUUID()}.${fileExt}`
            const filePath = `lesson-videos/${fileName}`

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

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!lesson) return

        setLoading(true)
        const formData = new FormData(e.currentTarget)

        const { error } = await supabase
            .from('lessons')
            .update({
                title: formData.get('title') as string,
                description: formData.get('description') as string,
                video_url: videoUrl,
                topic_id: topicId,
            })
            .eq('id', lesson.id)

        setLoading(false)

        if (error) {
            alert('Error updating lesson: ' + error.message)
        } else {
            onSuccess()
            onOpenChange(false)
        }
    }

    if (!lesson) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px] border-4 border-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-background">
                <DialogHeader>
                    <DialogTitle className="font-black text-2xl uppercase tracking-tighter">Edit Lesson</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-title" className="font-black uppercase text-xs">Lesson Title</Label>
                        <Input
                            id="edit-title"
                            name="title"
                            defaultValue={lesson.title}
                            required
                            className="border-2 border-foreground bg-background font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-description" className="font-black uppercase text-xs">Description</Label>
                        <Textarea
                            id="edit-description"
                            name="description"
                            defaultValue={lesson.description || ''}
                            className="border-2 border-foreground min-h-[80px] font-medium shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-course" className="font-black uppercase text-xs">Course</Label>
                        <select
                            id="edit-course"
                            name="topic_id"
                            value={courseId}
                            onChange={e => setCourseId(e.target.value)}
                            className="border-2 border-foreground font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] w-full p-2 rounded"
                            required
                        >
                            <option value="" disabled>Select course</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-3 bg-secondary/10 p-4 border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <Label className="font-black uppercase text-xs flex items-center gap-2">
                            <VideoIcon className="h-4 w-4" /> Video Upload
                        </Label>
                        <div className="space-y-3">
                            <div className="relative">
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
                                        <><Upload className="mr-2 h-4 w-4 stroke-[3px]" /> UPLOAD VIDEO</>
                                    )}
                                </Button>
                                {uploading && (
                                    <div className="mt-2 h-2 w-full bg-foreground/10 border border-foreground overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                )}
                                {videoUrl && !uploading && (
                                    <div className="mt-2">
                                        <video src={videoUrl} controls className="w-full max-h-48 border-2 border-foreground" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="font-black border-2 border-transparent hover:border-foreground"
                        >
                            CANCEL
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || uploading}
                            className="border-4 border-foreground bg-primary text-primary-foreground font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin text-background" />}
                            SAVE CHANGES
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
