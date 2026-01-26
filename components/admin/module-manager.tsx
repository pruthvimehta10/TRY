"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Layers, Loader2, GripVertical, ChevronDown, ChevronRight, Video, FileQuestion, Save, X, Edit, ExternalLink, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LessonEditDialog } from '@/components/admin/lesson-edit-dialog'
import Link from 'next/link'

interface Lesson {
    id: string
    topic_id: string
    title: string
    description?: string
    video_url?: string
    video_duration_seconds?: number
    order_index: number
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

    // --- Inline Drafting (Topic in Existing Module) ---
    const [draftingTopicModuleId, setDraftingTopicModuleId] = useState<string | null>(null)
    const [draftTopicTitle, setDraftTopicTitle] = useState('')
    const [draftTopicLessons, setDraftTopicLessons] = useState<DraftLesson[]>([])
    const [isSavingInlineTopic, setIsSavingInlineTopic] = useState(false)

    // --- Edit Dialog State ---
    const [editingLesson, setEditingLesson] = useState<any | null>(null)
    const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false)

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

    const resetInlineTopic = () => {
        setDraftingTopicModuleId(null)
        setDraftTopicTitle('')
        setDraftTopicLessons([])
        setIsSavingInlineTopic(false)
    }

    const handleSaveInlineTopic = async () => {
        if (!draftTopicTitle.trim() || !draftingTopicModuleId) return
        setIsSavingInlineTopic(true)

        try {
            // 1. Save Topic
            const order_index = (modules.find(m => m.id === draftingTopicModuleId)?.topics.length || 0)
            const { data: topicData, error: tErr } = await supabase
                .from('topics')
                .insert({ module_id: draftingTopicModuleId, title: draftTopicTitle, order_index })
                .select().single()

            if (tErr) throw tErr

            // 2. Save Lessons
            if (draftTopicLessons.length > 0) {
                const lessonsToInsert = draftTopicLessons.map((l, lIdx) => ({
                    topic_id: topicData.id,
                    course_id: courseId,
                    title: l.title,
                    order_index: lIdx,
                    video_url: l.type === 'video' ? '' : null
                }))
                const { error: lErr } = await supabase.from('lessons').insert(lessonsToInsert)
                if (lErr) throw lErr
            }

            await fetchData()
            setExpandedModules(prev => ({ ...prev, [draftingTopicModuleId]: true }))
            setExpandedTopics(prev => ({ ...prev, [topicData.id]: true }))
            resetInlineTopic()
        } catch (err: any) {
            console.error('Inline topic save failed:', err)
            alert('Failed to save topic: ' + err.message)
        } finally {
            setIsSavingInlineTopic(false)
        }
    }

    // --- Existing Structure Actions (Persistent) ---
    async function handleAddTopicPersistent(moduleId: string) {
        setDraftingTopicModuleId(moduleId)
        setDraftTopicTitle('New Topic')
        setDraftTopicLessons([])
        setExpandedModules(prev => ({ ...prev, [moduleId]: true }))
    }

    async function handleAddLessonPersistent(topicId: string, moduleId: string, type: 'video' | 'quiz') {
        const title = prompt(`Enter ${type === 'video' ? 'Video' : 'Quiz'} Title:`)
        if (!title) return
        const mIdx = modules.findIndex(m => m.id === moduleId)
        const tIdx = modules[mIdx].topics.findIndex(t => t.id === topicId)
        const order_index = modules[mIdx].topics[tIdx].lessons.length
        const { data, error } = await supabase.from('lessons').insert({ topic_id: topicId, course_id: courseId, title, order_index, video_url: type === 'video' ? '' : null }).select().single()
        if (data) {
            await fetchData()
            if (type === 'video') { setEditingLesson(data); setIsLessonDialogOpen(true); }
        }
    }

    async function handleDeleteModule(id: string) {
        if (confirm('Delete module and everything inside?')) {
            await supabase.from('modules').delete().eq('id', id)
            setModules(modules.filter(m => m.id !== id))
        }
    }

    async function handleDeleteTopic(topicId: string) {
        if (confirm('Delete topic and lessons?')) {
            await supabase.from('topics').delete().eq('id', topicId)
            await fetchData()
        }
    }

    async function handleDeleteLesson(lessonId: string) {
        if (confirm('Delete lesson?')) {
            await supabase.from('lessons').delete().eq('id', lessonId)
            await fetchData()
        }
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
                                                        <div className="p-1 bg-secondary border-2 border-foreground">
                                                            {l.type === 'video' ? <Video className="h-3 w-3" /> : <FileQuestion className="h-3 w-3" />}
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
                            <div className="flex items-center bg-cyan-500 text-white p-4 border-b-4 border-foreground">
                                <button onClick={() => setExpandedModules({ ...expandedModules, [module.id]: !expandedModules[module.id] })} className="mr-3 hover:scale-125 transition-transform">
                                    {expandedModules[module.id] ? <ChevronDown className="h-6 w-6 stroke-[3px]" /> : <ChevronRight className="h-6 w-6 stroke-[3px]" />}
                                </button>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-foreground text-background font-black px-2 py-0.5 text-xs">MODULE {mIdx + 1}</span>
                                    </div>
                                    <h4 className="font-black text-xl uppercase tracking-tight leading-tight">{module.title}</h4>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" onClick={() => handleAddTopicPersistent(module.id)} className="bg-yellow-300 text-foreground border-2 border-foreground font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                        + TOPIC
                                    </Button>
                                    <Button size="icon" variant="ghost" onClick={() => handleDeleteModule(module.id)} className="text-white hover:bg-red-500 border-2 border-transparent hover:border-foreground h-9 w-9">
                                        <Trash2 className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Content */}
                            {expandedModules[module.id] && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 space-y-6">
                                    {/* Inline Topic Builder */}
                                    {draftingTopicModuleId === module.id && (
                                        <div className="ml-6 border-4 border-foreground bg-yellow-100 dark:bg-yellow-900/20 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-in slide-in-from-left-2">
                                            <div className="flex items-center justify-between mb-4">
                                                <h5 className="font-black text-xs uppercase opacity-60">Drafting New Topic</h5>
                                                <Button size="icon" variant="ghost" onClick={resetInlineTopic} className="h-6 w-6 text-foreground"><X className="h-4 w-4" /></Button>
                                            </div>
                                            <Input
                                                value={draftTopicTitle}
                                                onChange={(e) => setDraftTopicTitle(e.target.value)}
                                                placeholder="Topic Title..."
                                                className="border-2 border-foreground bg-background font-bold mb-4"
                                            />
                                            <div className="space-y-2 mb-4">
                                                {draftTopicLessons.map((l, lIdx) => (
                                                    <div key={l.tempId} className="ml-4 flex items-center gap-2">
                                                        <div className="p-1 bg-white border-2 border-foreground">
                                                            {l.type === 'video' ? <Video className="h-3 w-3" /> : <FileQuestion className="h-3 w-3" />}
                                                        </div>
                                                        <Input
                                                            value={l.title}
                                                            onChange={(e) => setDraftTopicLessons(draftTopicLessons.map(dl => dl.tempId === l.tempId ? { ...dl, title: e.target.value } : dl))}
                                                            className="h-8 border-2 border-foreground text-xs font-bold flex-1 bg-background"
                                                        />
                                                        <Button size="icon" variant="ghost" onClick={() => setDraftTopicLessons(draftTopicLessons.filter(dl => dl.tempId !== l.tempId))} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                                    </div>
                                                ))}
                                                <div className="ml-4 flex gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => setDraftTopicLessons([...draftTopicLessons, { tempId: crypto.randomUUID(), title: 'New Video', type: 'video' }])} className="text-[10px] font-black border-2 border-foreground h-7">+ VIDEO</Button>
                                                    <Button size="sm" variant="outline" onClick={() => setDraftTopicLessons([...draftTopicLessons, { tempId: crypto.randomUUID(), title: 'New Quiz', type: 'quiz' }])} className="text-[10px] font-black border-2 border-foreground h-7">+ QUIZ</Button>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={handleSaveInlineTopic}
                                                disabled={isSavingInlineTopic || !draftTopicTitle.trim()}
                                                className="w-full border-4 border-foreground bg-foreground text-background font-black py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                            >
                                                {isSavingInlineTopic ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                                SAVE TOPIC
                                            </Button>
                                        </div>
                                    )}

                                    {module.topics.length > 0 ? module.topics.map((topic, tIdx) => (
                                        <div key={topic.id} className="ml-6 space-y-3">
                                            {/* Topic Header */}
                                            <div className="flex items-center gap-3 pb-2 border-b-2 border-foreground/10">
                                                <button onClick={() => setExpandedTopics({ ...expandedTopics, [topic.id]: !expandedTopics[topic.id] })} className="hover:scale-110">
                                                    {expandedTopics[topic.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                </button>
                                                <h5 className="font-black text-sm uppercase flex-1 opacity-70">Topic {tIdx + 1}: {topic.title}</h5>
                                                <div className="flex gap-1">
                                                    <Button size="icon" variant="ghost" onClick={() => handleAddLessonPersistent(topic.id, module.id, 'video')} className="h-7 w-7 border border-foreground/20 hover:border-foreground"><Video className="h-3 w-3" /></Button>
                                                    <Button size="icon" variant="ghost" onClick={() => handleAddLessonPersistent(topic.id, module.id, 'quiz')} className="h-7 w-7 border border-foreground/20 hover:border-foreground"><FileQuestion className="h-3 w-3" /></Button>
                                                    <Button size="icon" variant="ghost" onClick={() => handleDeleteTopic(topic.id)} className="h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="h-3 w-3" /></Button>
                                                </div>
                                            </div>

                                            {/* Nested Lessons */}
                                            {expandedTopics[topic.id] && (
                                                <div className="ml-6 space-y-2">
                                                    {topic.lessons.length > 0 ? topic.lessons.map((lesson) => (
                                                        <div key={lesson.id} className="flex items-center gap-3 p-2 bg-background border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                            <div className="p-1 bg-secondary/40 border-2 border-foreground">
                                                                {lesson.video_url !== null ? <Video className="h-3.5 w-3.5" /> : <FileQuestion className="h-3.5 w-3.5" />}
                                                            </div>
                                                            <p className="flex-1 font-bold text-xs uppercase">{lesson.title}</p>
                                                            <div className="flex gap-1">
                                                                <Button size="icon" variant="ghost" onClick={() => { setEditingLesson(lesson); setIsLessonDialogOpen(true); }} className="h-7 w-7 hover:bg-blue-100"><Edit className="h-3.5 w-3.5" /></Button>
                                                                <Button size="icon" variant="ghost" onClick={() => handleDeleteLesson(lesson.id)} className="h-7 w-7 text-destructive hover:bg-red-100"><Trash2 className="h-3.5 w-3.5" /></Button>
                                                            </div>
                                                        </div>
                                                    )) : (
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

            <LessonEditDialog
                lesson={editingLesson}
                open={isLessonDialogOpen}
                onOpenChange={setIsLessonDialogOpen}
                onSuccess={fetchData}
            />
        </div>
    )
}
