"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Layers, Loader2, GripVertical, ChevronDown, ChevronRight, Video, FileQuestion, Save, X, ExternalLink, Send, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { QuizEditDialog } from '@/components/admin/quiz-edit-dialog'

interface Lesson {
    id: string
    topic_id: string
    title: string
    description?: string
    video_url?: string
    video_duration_seconds?: number
    order_index: number
    hasQuiz?: boolean
    quiz_questions?: { count: number }[]
}

interface Topic {
    id: string
    module_id: string
    title: string
    description?: string
    order_index: number
    lessons: Lesson[]
}

interface Module {
    id: string
    course_id: string
    title: string
    description?: string
    order_index: number
    topics: Topic[]
}

// Local draft types
interface DraftLesson {
    tempId: string
    title: string
    type: 'video' | 'quiz'
    video_url?: string
}

interface DraftTopic {
    tempId: string
    title: string
    lessons: DraftLesson[]
}

interface ModuleManagerProps {
    courseId: string
}

export function ModuleManager({ courseId }: ModuleManagerProps) {
    const supabase = createClient()
    const [modules, setModules] = useState<Module[]>([])
    const [loading, setLoading] = useState(false)
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})
    const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({})

    // --- Draft State ---
    const [isDrafting, setIsDrafting] = useState(false)
    const [draftTitle, setDraftTitle] = useState('')
    const [draftTopics, setDraftTopics] = useState<DraftTopic[]>([])
    const [isSavingDraft, setIsSavingDraft] = useState(false)

    // --- Drafting States (Topic in Existing Module) ---
    const [draftingTopicModuleId, setDraftingTopicModuleId] = useState<string | null>(null)
    const [draftTopicTitle, setDraftTopicTitle] = useState('')
    const [isSavingTopic, setIsSavingTopic] = useState(false)

    // --- Progressive Addition (Lessons to Existing Topic) ---
    const [addingLessonToTopicId, setAddingLessonToTopicId] = useState<{ id: string, type: 'video' | 'quiz' } | null>(null)
    const [newLessonTitle, setNewLessonTitle] = useState('')
    const [isSavingNewLesson, setIsSavingNewLesson] = useState(false)

    // --- Professional Deletion State ---
    const [confirmDelete, setConfirmDelete] = useState<{ id: string, type: 'module' | 'topic' | 'lesson' } | null>(null)

    // --- Video Upload State ---
    const [uploadingLessonId, setUploadingLessonId] = useState<string | null>(null)
    const fileInputRefs = useRef<Record<string, HTMLInputElement>>({})

    // --- Quiz Dialog State ---
    const [editingQuizLesson, setEditingQuizLesson] = useState<{ id: string, title: string, course_id: string } | null>(null)
    const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false)

    useEffect(() => {
        fetchData()
    }, [courseId])

    async function fetchData() {
        setLoading(true)
        const { data, error } = await supabase
            .from('modules')
            .select(`
                *,
                topics (
                    *,
                    lessons (
                        *,
                        quiz_questions (count)
                    )
                )
            `)
            .eq('course_id', courseId)
            .order('order_index', { ascending: true })

        if (data) {
            const sortedData = (data as any[]).map(m => ({
                ...m,
                topics: (m.topics || []).sort((a: any, b: any) => a.order_index - b.order_index).map((t: any) => ({
                    ...t,
                    lessons: (t.lessons || []).sort((a: any, b: any) => a.order_index - b.order_index).map((l: any) => ({
                        ...l,
                        hasQuiz: l.quiz_questions?.[0]?.count > 0
                    }))
                }))
            }))
            setModules(sortedData as Module[])
        }
        setLoading(false)
    }

    // --- Draft Builder Logic ---
    const resetDraft = () => {
        setDraftTitle('')
        setDraftTopics([])
        setIsDrafting(false)
    }

    const addDraftTopic = () => {
        setDraftTopics([...draftTopics, { tempId: crypto.randomUUID(), title: 'New Topic', lessons: [] }])
    }

    const updateDraftTopic = (tempId: string, title: string) => {
        setDraftTopics(draftTopics.map(t => t.tempId === tempId ? { ...t, title } : t))
    }

    const removeDraftTopic = (tempId: string) => {
        setDraftTopics(draftTopics.filter(t => t.tempId !== tempId))
    }

    const addDraftLesson = (topicTempId: string, type: 'video' | 'quiz') => {
        setDraftTopics(draftTopics.map(t => t.tempId === topicTempId ? {
            ...t,
            lessons: [...t.lessons, { tempId: crypto.randomUUID(), title: `New ${type === 'video' ? 'Video' : 'Quiz'}`, type }]
        } : t))
    }

    const updateDraftLesson = (topicTempId: string, lessonTempId: string, title: string) => {
        setDraftTopics(draftTopics.map(t => t.tempId === topicTempId ? {
            ...t,
            lessons: t.lessons.map(l => l.tempId === lessonTempId ? { ...l, title } : l)
        } : t))
    }

    const removeDraftLesson = (topicTempId: string, lessonTempId: string) => {
        setDraftTopics(draftTopics.map(t => t.tempId === topicTempId ? {
            ...t,
            lessons: t.lessons.filter(l => l.tempId !== lessonTempId)
        } : t))
    }


    const handleSaveDraft = async () => {
        if (!draftTitle.trim()) return
        setIsSavingDraft(true)

        try {
            // 1. Save Module
            const { data: moduleData, error: mErr } = await supabase
                .from('modules')
                .insert({ course_id: courseId, title: draftTitle, order_index: modules.length })
                .select().single()

            if (mErr) throw mErr

            // 2. Save Topics
            for (let i = 0; i < draftTopics.length; i++) {
                const topic = draftTopics[i]
                const { data: topicData, error: tErr } = await supabase
                    .from('topics')
                    .insert({ module_id: moduleData.id, title: topic.title, order_index: i })
                    .select().single()

                if (tErr) throw tErr

                // 3. Save Lessons
                if (topic.lessons.length > 0) {
                    const lessonsToInsert = topic.lessons.map((l, lIdx) => ({
                        topic_id: topicData.id,
                        course_id: courseId,
                        title: l.title,
                        order_index: lIdx,
                        video_url: l.type === 'video' ? '' : null
                    }))
                    const { error: lErr } = await supabase.from('lessons').insert(lessonsToInsert)
                    if (lErr) throw lErr
                }
            }

            await fetchData()
            setExpandedModules(prev => ({ ...prev, [moduleData.id]: true }))
            resetDraft()
        } catch (err: any) {
            console.error('Persistence failed:', err)
            alert('Failed to save module structure: ' + err.message)
        } finally {
            setIsSavingDraft(false)
        }
    }

    // --- Existing Structure Actions (Persistent) ---
    async function handleStartAddTopic(moduleId: string) {
        setDraftingTopicModuleId(moduleId)
        setDraftTopicTitle('New Topic Name')
        setExpandedModules(prev => ({ ...prev, [moduleId]: true }))
    }

    async function handleConfirmAddTopic(moduleId: string) {
        if (!draftTopicTitle.trim()) return
        setIsSavingTopic(true)

        const order_index = (modules.find(m => m.id === moduleId)?.topics.length || 0)
        const { data, error } = await supabase
            .from('topics')
            .insert({ module_id: moduleId, title: draftTopicTitle, order_index })
            .select().single()

        if (data) {
            await fetchData()
            setDraftingTopicModuleId(null)
            setExpandedTopics(prev => ({ ...prev, [data.id]: true }))
        }
        setIsSavingTopic(false)
    }

    async function handleStartAddLesson(topicId: string, type: 'video' | 'quiz') {
        setAddingLessonToTopicId({ id: topicId, type })
        setNewLessonTitle(`New ${type === 'video' ? 'Video' : 'Quiz'}`)
        setExpandedTopics(prev => ({ ...prev, [topicId]: true }))
    }

    async function handleConfirmAddLesson(topicId: string, moduleId: string) {
        if (!newLessonTitle.trim() || !addingLessonToTopicId) return
        setIsSavingNewLesson(true)

        const mIdx = modules.findIndex(m => m.id === moduleId)
        const tIdx = modules[mIdx].topics.findIndex(t => t.id === topicId)
        const order_index = (modules[mIdx].topics[tIdx].lessons?.length || 0)

        const { data, error } = await supabase
            .from('lessons')
            .insert({
                topic_id: topicId,
                course_id: courseId,
                title: newLessonTitle,
                order_index,
                video_url: addingLessonToTopicId.type === 'video' ? '' : null
            })
            .select().single()

        if (data) {
            await fetchData()
            // If it's a video lesson, trigger file picker immediately
            if (addingLessonToTopicId.type === 'video' && data.id) {
                setTimeout(() => {
                    fileInputRefs.current[data.id]?.click()
                }, 100)
            }
            // If it's a quiz lesson, open quiz dialog
            if (addingLessonToTopicId.type === 'quiz' && data.id) {
                setEditingQuizLesson({ id: data.id, title: data.title, course_id: courseId })
                setIsQuizDialogOpen(true)
            }
            setAddingLessonToTopicId(null)
            setNewLessonTitle('')
        }
        setIsSavingNewLesson(false)
    }

    async function handleVideoUpload(lessonId: string, file: File) {
        setUploadingLessonId(lessonId)
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

            const { data: { publicUrl } } = supabase.storage
                .from('videos')
                .getPublicUrl(filePath)

            const { error: updateError } = await supabase
                .from('lessons')
                .update({ video_url: publicUrl })
                .eq('id', lessonId)

            if (updateError) throw updateError

            await fetchData()
        } catch (err: any) {
            alert('Upload failed: ' + err.message)
        } finally {
            setUploadingLessonId(null)
        }
    }

    async function handleDeleteModule(id: string) {
        await supabase.from('modules').delete().eq('id', id)
        setModules(modules.filter(m => m.id !== id))
        setConfirmDelete(null)
    }

    async function handleDeleteTopic(topicId: string) {
        await supabase.from('topics').delete().eq('id', topicId)
        await fetchData()
        setConfirmDelete(null)
    }

    async function handleDeleteLesson(lessonId: string) {
        await supabase.from('lessons').delete().eq('id', lessonId)
        await fetchData()
        setConfirmDelete(null)
    }

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="bg-yellow-400 p-2 border-4 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <Layers className="h-6 w-6 text-foreground" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Curriculum Builder</h3>
            </div>

            {/* --- Advanced Module Builder (Creation Card) --- */}
            <Card className={cn(
                "border-4 border-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all",
                isDrafting ? "bg-white dark:bg-slate-900" : "bg-secondary/30"
            )}>
                <CardHeader className="bg-foreground text-background p-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        {isDrafting ? "Drafting New Module" : "Quick Add Module"}
                    </CardTitle>
                    {isDrafting && (
                        <Button variant="ghost" size="sm" onClick={resetDraft} className="text-background hover:text-red-400 font-black">
                            <X className="h-4 w-4 mr-1" /> CANCEL
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <Input
                                placeholder="Module Title (e.g. Master React Hooks)"
                                value={draftTitle}
                                onChange={(e) => {
                                    setDraftTitle(e.target.value)
                                    if (!isDrafting && e.target.value) setIsDrafting(true)
                                }}
                                className="border-4 border-foreground bg-background font-black h-12 text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus-visible:ring-0"
                            />
                            {!isDrafting && (
                                <Button onClick={() => setIsDrafting(true)} className="h-12 border-4 border-foreground bg-primary text-primary-foreground font-black px-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    START CONFIG
                                </Button>
                            )}
                        </div>

                        {/* --- Drafting Area --- */}
                        {isDrafting && (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <div className="border-t-4 border-dashed border-foreground pt-4 flex items-center justify-between">
                                    <Label className="font-black uppercase text-xs opacity-60">Module Blueprint</Label>
                                    <Button size="sm" onClick={addDraftTopic} className="bg-yellow-300 text-foreground border-2 border-foreground font-black hover:bg-yellow-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        <Plus className="h-4 w-4 mr-1" /> ADD TOPIC
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {draftTopics.map((t) => (
                                        <div key={t.tempId} className="ml-4 border-4 border-foreground bg-slate-50 dark:bg-slate-800 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative">
                                            <Button size="icon" variant="ghost" onClick={() => removeDraftTopic(t.tempId)} className="absolute -top-3 -right-3 bg-red-400 text-white rounded-full h-6 w-6 border-2 border-foreground hover:bg-red-500">
                                                <X className="h-3 w-3" />
                                            </Button>
                                            <Input
                                                value={t.title}
                                                onChange={(e) => updateDraftTopic(t.tempId, e.target.value)}
                                                className="border-2 border-foreground bg-background font-bold h-10 mb-4"
                                            />
                                            <div className="space-y-2">
                                                {t.lessons.map((l) => (
                                                    <div key={l.tempId} className="ml-6 flex items-center gap-2">
                                                        <div className="p-1 bg-secondary border-2 border-foreground h-8 w-8 flex items-center justify-center shrink-0">
                                                            {l.type === 'video' ? <Video className="h-4 w-4" /> : <FileQuestion className="h-4 w-4" />}
                                                        </div>
                                                        <Input
                                                            value={l.title}
                                                            onChange={(e) => updateDraftLesson(t.tempId, l.tempId, e.target.value)}
                                                            className="h-8 border-2 border-foreground text-xs font-bold flex-1"
                                                        />
                                                        <Button size="icon" variant="ghost" onClick={() => removeDraftLesson(t.tempId, l.tempId)} className="h-8 w-8 text-destructive hover:scale-110">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                <div className="ml-6 flex gap-2 pt-2">
                                                    <Button size="sm" variant="outline" onClick={() => addDraftLesson(t.tempId, 'video')} className="text-[10px] font-black border-2 border-foreground h-7">
                                                        + VIDEO
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => addDraftLesson(t.tempId, 'quiz')} className="text-[10px] font-black border-2 border-foreground h-7">
                                                        + QUIZ
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    onClick={handleSaveDraft}
                                    disabled={isSavingDraft || !draftTitle.trim()}
                                    className="w-full h-14 border-4 border-foreground bg-green-400 text-foreground font-black text-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all mt-4"
                                >
                                    {isSavingDraft ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2 h-5 w-5" />}
                                    PUBLISH FULL MODULE
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* --- Existing Modules List --- */}
            <div className="space-y-6">
                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                ) : modules.length > 0 ? (
                    modules.map((module, mIdx) => (
                        <div key={module.id} className="border-4 border-foreground bg-background shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] group overflow-hidden">
                            {/* Module Header */}
                            <div className="flex items-center bg-cyan-500 text-white p-4 border-b-4 border-foreground relative">
                                <button onClick={() => setExpandedModules({ ...expandedModules, [module.id]: !expandedModules[module.id] })} className="mr-3 hover:scale-125 transition-transform">
                                    {expandedModules[module.id] ? <ChevronDown className="h-6 w-6 stroke-[3px]" /> : <ChevronRight className="h-6 w-6 stroke-[3px]" />}
                                </button>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-foreground text-background font-black px-2 py-0.5 text-xs">MODULE {mIdx + 1}</span>
                                    </div>
                                    <h4 className="font-black text-xl uppercase tracking-tight leading-tight">{module.title}</h4>
                                </div>

                                {confirmDelete?.id === module.id ? (
                                    <div className="flex items-center gap-2 animate-in zoom-in-95 duration-200">
                                        <div className="flex items-center bg-white border-2 border-foreground p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                            <span className="text-[10px] font-black uppercase text-red-600 px-2">Permanently Delete?</span>
                                            <Button size="sm" onClick={() => handleDeleteModule(module.id)} className="bg-red-500 text-white border-2 border-foreground font-black h-7 hover:bg-red-600">SURE</Button>
                                            <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(null)} className="h-7 w-7 border-2 border-foreground ml-1 text-foreground"><X className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" onClick={() => handleStartAddTopic(module.id)} className="bg-yellow-300 text-foreground border-2 border-foreground font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                            + TOPIC
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => setConfirmDelete({ id: module.id, type: 'module' })} className="text-white hover:bg-red-500 border-2 border-transparent hover:border-foreground h-9 w-9">
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            {expandedModules[module.id] && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 space-y-6">

                                    {/* Inline Topic Builder */}
                                    {draftingTopicModuleId === module.id && (
                                        <div className="ml-6 border-4 border-foreground bg-yellow-100 dark:bg-yellow-900/20 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-left-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <h5 className="font-black text-xs uppercase opacity-60">New Topic</h5>
                                                <Button size="icon" variant="ghost" onClick={() => setDraftingTopicModuleId(null)} className="h-6 w-6 text-foreground"><X className="h-4 w-4" /></Button>
                                            </div>
                                            <div className="flex gap-2 relative">
                                                <Input
                                                    autoFocus
                                                    value={draftTopicTitle}
                                                    onChange={(e) => setDraftTopicTitle(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleConfirmAddTopic(module.id)}
                                                    className="border-2 border-foreground bg-background font-bold h-10 flex-1 focus-visible:ring-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                                />
                                                <Button onClick={() => handleConfirmAddTopic(module.id)} disabled={isSavingTopic} className="bg-foreground text-background font-black h-10 border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-none transition-all">
                                                    {isSavingTopic ? <Loader2 className="animate-spin h-4 w-4" /> : 'SAVE'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {module.topics?.length > 0 ? module.topics.map((topic, tIdx) => (
                                        <div key={topic.id} className="ml-6 space-y-3">
                                            {/* Topic Header */}
                                            <div className="flex items-center gap-3 pb-2 border-b-2 border-foreground/10">
                                                <button onClick={() => setExpandedTopics({ ...expandedTopics, [topic.id]: !expandedTopics[topic.id] })} className="hover:scale-110">
                                                    {expandedTopics[topic.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                </button>
                                                <h5 className="font-black text-sm uppercase flex-1 opacity-70">Topic {tIdx + 1}: {topic.title}</h5>

                                                {confirmDelete?.id === topic.id ? (
                                                    <div className="flex items-center gap-1 animate-in slide-in-from-right-2 duration-200">
                                                        <div className="flex items-center bg-white border-2 border-foreground p-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase font-black">
                                                            <span className="text-[9px] px-1 text-red-600">Delete Topic?</span>
                                                            <Button size="sm" onClick={() => handleDeleteTopic(topic.id)} className="h-6 px-2 bg-red-500 text-white text-[10px] border-2 border-foreground">YES</Button>
                                                            <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(null)} className="h-6 w-6 text-foreground"><X className="h-3 w-3" /></Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-1 text-foreground">
                                                        <Button size="icon" variant="ghost" onClick={() => handleStartAddLesson(topic.id, 'video')} className="h-7 w-7 border-2 border-foreground/10 hover:border-foreground hover:bg-yellow-100"><Video className="h-3 w-3" /></Button>
                                                        <Button size="icon" variant="ghost" onClick={() => handleStartAddLesson(topic.id, 'quiz')} className="h-7 w-7 border-2 border-foreground/10 hover:border-foreground hover:bg-blue-100"><FileQuestion className="h-3 w-3" /></Button>
                                                        <Button size="icon" variant="ghost" onClick={() => setConfirmDelete({ id: topic.id, type: 'topic' })} className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="h-3.5 w-3.5" /></Button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Nested Lessons */}
                                            {expandedTopics[topic.id] && (
                                                <div className="ml-6 space-y-2">
                                                    {topic.lessons?.length > 0 && topic.lessons.map((lesson) => (
                                                        <div key={lesson.id} className="flex items-center gap-3 p-2 bg-background border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                            <div className="p-1 bg-secondary/40 border-2 border-foreground">
                                                                {lesson.video_url !== null ? <Video className="h-3.5 w-3.5 text-foreground" /> : <FileQuestion className="h-3.5 w-3.5 text-foreground" />}
                                                            </div>
                                                            <p className="flex-1 font-bold text-xs uppercase text-foreground">{lesson.title}</p>

                                                            {confirmDelete?.id === lesson.id ? (
                                                                <div className="flex items-center gap-1 animate-in slide-in-from-right-2">
                                                                    <div className="flex items-center bg-white border-2 border-foreground p-0.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-black">
                                                                        <span className="text-[8px] uppercase px-1 text-red-600">DELETE?</span>
                                                                        <Button size="sm" onClick={() => handleDeleteLesson(lesson.id)} className="h-6 px-2 bg-red-500 text-white text-[10px] border-2 border-foreground">YES</Button>
                                                                        <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(null)} className="h-6 w-6 text-foreground"><X className="h-3 w-3" /></Button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex gap-1">
                                                                    {lesson.video_url !== null && (
                                                                        <>
                                                                            <input
                                                                                type="file"
                                                                                accept="video/*"
                                                                                className="hidden"
                                                                                ref={(el) => {
                                                                                    if (el) fileInputRefs.current[lesson.id] = el
                                                                                }}
                                                                                onChange={(e) => {
                                                                                    const file = e.target.files?.[0]
                                                                                    if (file) {
                                                                                        handleVideoUpload(lesson.id, file)
                                                                                    }
                                                                                    // Reset input so same file can be selected again
                                                                                    e.target.value = ''
                                                                                }}
                                                                            />
                                                                            <Button 
                                                                                size="icon" 
                                                                                variant="ghost" 
                                                                                onClick={() => fileInputRefs.current[lesson.id]?.click()} 
                                                                                disabled={uploadingLessonId === lesson.id}
                                                                                className={cn(
                                                                                    "h-7 w-7 border border-transparent hover:border-foreground",
                                                                                    lesson.video_url ? "hover:bg-green-100 text-green-600" : "hover:bg-yellow-100 text-yellow-600"
                                                                                )}
                                                                            >
                                                                                {uploadingLessonId === lesson.id ? (
                                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                                ) : (
                                                                                    <Upload className="h-3.5 w-3.5" />
                                                                                )}
                                                                            </Button>
                                                                        </>
                                                                    )}
                                                                    {lesson.video_url === null && (
                                                                        <Button 
                                                                            size="icon" 
                                                                            variant="ghost" 
                                                                            onClick={() => {
                                                                                setEditingQuizLesson({ 
                                                                                    id: lesson.id, 
                                                                                    title: lesson.title, 
                                                                                    course_id: courseId 
                                                                                })
                                                                                setIsQuizDialogOpen(true)
                                                                            }}
                                                                            className={cn(
                                                                                "h-7 w-7 border border-transparent hover:border-foreground",
                                                                                lesson.hasQuiz ? "hover:bg-green-100 text-green-600" : "hover:bg-blue-100 text-blue-600"
                                                                            )}
                                                                            title={lesson.hasQuiz ? "Edit Quiz" : "Create Quiz"}
                                                                        >
                                                                            <FileQuestion className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    )}
                                                                    {lesson.video_url === null && (
                                                                        <Button 
                                                                            size="icon" 
                                                                            variant="ghost" 
                                                                            onClick={() => {
                                                                                setEditingQuizLesson({ 
                                                                                    id: lesson.id, 
                                                                                    title: lesson.title, 
                                                                                    course_id: courseId 
                                                                                })
                                                                                setIsQuizDialogOpen(true)
                                                                            }}
                                                                            className={cn(
                                                                                "h-7 w-7 border border-transparent hover:border-foreground",
                                                                                lesson.hasQuiz ? "hover:bg-green-100 text-green-600" : "hover:bg-blue-100 text-blue-600"
                                                                            )}
                                                                            title={lesson.hasQuiz ? "Edit Quiz" : "Create Quiz"}
                                                                        >
                                                                            <FileQuestion className="h-3.5 w-3.5" />
                                                                        </Button>
                                                                    )}
                                                                    <Button size="icon" variant="ghost" onClick={() => setConfirmDelete({ id: lesson.id, type: 'lesson' })} className="h-7 w-7 text-red-500/50 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-foreground">
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}

                                                    {/* Inline Lesson Builder for Existing Topic */}
                                                    {addingLessonToTopicId?.id === topic.id && (
                                                        <div className="flex items-center gap-2 p-2 bg-accent/10 border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-top-1">
                                                            <div className="p-1.5 bg-background border-2 border-foreground">
                                                                {addingLessonToTopicId.type === 'video' ? <Video className="h-4 w-4" /> : <FileQuestion className="h-4 w-4" />}
                                                            </div>
                                                            <Input
                                                                autoFocus
                                                                value={newLessonTitle}
                                                                onChange={(e) => setNewLessonTitle(e.target.value)}
                                                                onKeyDown={(e) => e.key === 'Enter' && handleConfirmAddLesson(topic.id, module.id)}
                                                                className="h-10 border-2 border-foreground bg-background font-bold text-sm flex-1 focus-visible:ring-0"
                                                            />
                                                            <div className="flex gap-1">
                                                                <Button size="icon" variant="ghost" onClick={() => handleConfirmAddLesson(topic.id, module.id)} disabled={isSavingNewLesson} className="h-10 w-10 text-green-600 hover:scale-110 border-2 border-transparent hover:border-foreground">
                                                                    {isSavingNewLesson ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                                                </Button>
                                                                <Button size="icon" variant="ghost" onClick={() => setAddingLessonToTopicId(null)} className="h-10 w-10 text-destructive border-2 border-transparent hover:border-foreground">
                                                                    <X className="h-5 w-5" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {(!topic.lessons || topic.lessons.length === 0) && !addingLessonToTopicId && (
                                                        <p className="text-[10px] font-black opacity-30 italic ml-4">NO CONTENT IN TOPIC</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )) : (
                                        <div className="text-center py-6">
                                            <p className="font-black text-xs uppercase opacity-30 italic">No topics yet. Start by adding one! ☝️</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="border-4 border-dashed border-foreground p-16 text-center opacity-30 tracking-tighter">
                        <p className="font-black text-2xl uppercase italic">Your curriculum starts with the first module.</p>
                    </div>
                )}
            </div>

            <QuizEditDialog
                lesson={editingQuizLesson}
                open={isQuizDialogOpen}
                onOpenChange={setIsQuizDialogOpen}
                onSuccess={fetchData}
            />
        </div>
    )
}
