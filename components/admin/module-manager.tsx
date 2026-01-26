"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, Layers, Loader2, GripVertical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Module {
    id: string
    title: string
    description: string
    order_index: number
}

interface ModuleManagerProps {
    courseId: string
}

export function ModuleManager({ courseId }: ModuleManagerProps) {
    const supabase = createClient()
    const [modules, setModules] = useState<Module[]>([])
    const [loading, setLoading] = useState(false)
    const [creating, setCreating] = useState(false)

    // New module form
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')

    useEffect(() => {
        fetchModules()
    }, [courseId])

    async function fetchModules() {
        setLoading(true)
        const { data, error } = await supabase
            .from('modules')
            .select('*')
            .eq('course_id', courseId)
            .order('order_index', { ascending: true })

        if (data) {
            setModules(data as Module[])
        }
        setLoading(false)
    }

    async function handleAddModule() {
        if (!title.trim()) return

        setCreating(true)
        const { data, error } = await supabase
            .from('modules')
            .insert({
                course_id: courseId,
                title,
                description,
                order_index: modules.length
            })
            .select()
            .single()

        setCreating(false)

        if (error) {
            console.error('Error creating module:', error)
            alert('Failed to create module. Did you run the SQL migration?')
        } else if (data) {
            setModules([...modules, data as Module])
            setTitle('')
            setDescription('')
        }
    }

    async function handleDeleteModule(id: string) {
        if (!confirm('Are you sure you want to delete this module?')) return

        const { error } = await supabase
            .from('modules')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting module:', error)
        } else {
            setModules(modules.filter(m => m.id !== id))
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-3">
                <div className="bg-yellow-400 p-2 border-4 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <Layers className="h-6 w-6 text-foreground" />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Course Modules</h3>
            </div>

            {/* Create Module Card */}
            <Card className="border-4 border-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-pink-50 overflow-hidden transform hover:-translate-x-1 hover:-translate-y-1 transition-transform">
                <CardHeader className="bg-foreground text-white p-4">
                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        Create New Module
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="module-title" className="font-black uppercase text-xs">Module Name</Label>
                        <Input
                            id="module-title"
                            placeholder="e.g. Getting Started with React"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="border-4 border-foreground bg-white font-bold h-12 focus-visible:ring-0 focus-visible:border-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="module-desc" className="font-black uppercase text-xs">Description</Label>
                        <Textarea
                            id="module-desc"
                            placeholder="What will students learn in this module?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="border-4 border-foreground bg-white font-bold min-h-[100px] focus-visible:ring-0 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        />
                    </div>
                    <Button
                        onClick={handleAddModule}
                        disabled={creating || !title.trim()}
                        className="w-full h-14 border-4 border-foreground bg-green-400 text-foreground font-black text-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all"
                    >
                        {creating ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2 h-6 w-6 stroke-[3px]" />}
                        ADD MODULE
                    </Button>
                </CardContent>
            </Card>

            {/* Modules List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : modules.length > 0 ? (
                    modules.map((module, index) => (
                        <div
                            key={module.id}
                            className="group flex flex-col md:flex-row items-stretch border-4 border-foreground bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all hover:bg-slate-50"
                        >
                            <div className="bg-cyan-300 border-b-4 md:border-b-0 md:border-r-4 border-foreground p-4 flex items-center justify-center min-w-[60px]">
                                <span className="font-black text-2xl">{index + 1}</span>
                            </div>
                            <div className="flex-1 p-4 space-y-1">
                                <h4 className="font-black text-xl uppercase leading-tight">{module.title}</h4>
                                {module.description && (
                                    <p className="text-sm font-bold text-muted-foreground line-clamp-2">
                                        {module.description}
                                    </p>
                                )}
                            </div>
                            <div className="bg-slate-100 border-t-4 md:border-t-0 md:border-l-4 border-foreground p-2 flex md:flex-col justify-center items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteModule(module.id)}
                                    className="h-10 w-10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors border-2 border-transparent hover:border-foreground shadow-sm"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                                <div className="hidden md:flex h-10 w-10 items-center justify-center border-2 border-foreground bg-white cursor-grab active:cursor-grabbing">
                                    <GripVertical className="h-5 w-5" />
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="border-4 border-dashed border-foreground rounded-none p-12 text-center bg-slate-50">
                        <p className="font-black text-muted-foreground uppercase tracking-widest italic">
                            No modules yet. Bang one out above! ☝️
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
