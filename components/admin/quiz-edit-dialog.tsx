import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Loader2, Plus, Trash2, FileQuestion } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

interface QuizQuestion {
    id: string
    question_text: string
    question_order: number
    quiz_options: { id: string, option_text: string, is_correct: boolean, option_order: number }[]
}

interface QuizEditDialogProps {
    topic: {
        id: string
        title: string
        course_id?: string
    } | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function QuizEditDialog({ topic, open, onOpenChange, onSuccess }: QuizEditDialogProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(false)
    const [questions, setQuestions] = useState<QuizQuestion[]>([])

    // Form state for new question
    const [questionText, setQuestionText] = useState('')
    const [options, setOptions] = useState([
        { text: '', correct: true },
        { text: '', correct: false },
        { text: '', correct: false },
        { text: '', correct: false },
    ])

    useEffect(() => {
        if (open && topic) {
            fetchQuestions()
        }
    }, [open, topic])

    async function fetchQuestions() {
        if (!topic) return
        setFetching(true)
        const { data } = await supabase
            .from('quiz_questions')
            .select(`
                *,
                quiz_options (*)
            `)
            .eq('topic_id', topic.id)
            .order('question_order')

        if (data) {
            setQuestions(data as any)
        }
        setFetching(false)
    }

    async function handleAddQuestion(e: React.FormEvent) {
        e.preventDefault()
        if (!topic) return
        setLoading(true)

        // Get course_id if not already available
        let courseId = topic.course_id
        if (!courseId) {
            const { data } = await supabase
                .from('topics')
                .select('course_id')
                .eq('id', topic.id)
                .single()
            courseId = data?.course_id
        }

        // 1. Get next order
        const nextOrder = questions.length > 0
            ? Math.max(...questions.map(q => q.question_order)) + 1
            : 0

        // 2. Insert Question
        const { data: qData, error: qError } = await supabase
            .from('quiz_questions')
            .insert({
                course_id: courseId,
                topic_id: topic.id,
                question_text: questionText,
                question_order: nextOrder,
                question_type: 'multiple_choice'
            })
            .select()
            .single()

        if (qError) {
            alert('Error creating question: ' + qError.message)
            setLoading(false)
            return
        }

        // 2. Insert Options
        const optionsToInsert = options.map((opt, idx) => ({
            question_id: qData.id,
            option_text: opt.text,
            is_correct: opt.correct,
            option_order: idx
        }))

        const { error: oError } = await supabase
            .from('quiz_options')
            .insert(optionsToInsert)

        if (oError) {
            alert('Error creating options: ' + oError.message)
        } else {
            // Reset form
            setQuestionText('')
            setOptions([
                { text: '', correct: true },
                { text: '', correct: false },
                { text: '', correct: false },
                { text: '', correct: false },
            ])
            fetchQuestions()
        }
        setLoading(false)
    }

    async function deleteQuestion(id: string) {
        if (!confirm('Are you sure you want to delete this question?')) return
        await supabase.from('quiz_questions').delete().eq('id', id)
        fetchQuestions()
    }

    const updateOptionText = (idx: number, text: string) => {
        const newOpts = [...options]
        newOpts[idx].text = text
        setOptions(newOpts)
    }

    const setCorrectOption = (idx: number) => {
        const newOpts = options.map((opt, i) => ({ ...opt, correct: i === idx }))
        setOptions(newOpts)
    }

    if (!topic) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto border-4 border-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-background">
                <DialogHeader>
                    <DialogTitle className="font-black text-2xl uppercase tracking-tighter flex items-center gap-2">
                        <FileQuestion className="h-6 w-6" />
                        Quiz Builder: {topic.title}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 md:grid-cols-2 pt-4">
                    {/* Left: Existing Questions List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="font-black uppercase text-xs">Questions ({questions.length})</Label>
                        </div>
                        {fetching ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                        ) : questions.length === 0 ? (
                            <div className="p-6 border-4 border-dashed border-foreground/20 text-center text-muted-foreground">
                                <p className="text-xs font-black uppercase">No questions yet</p>
                                <p className="text-[10px] mt-1">Add one on the right →</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[500px] overflow-y-auto">
                                {questions.map((q, i) => (
                                    <Card key={q.id} className="border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        <CardHeader className="flex flex-row items-center justify-between py-2 px-3">
                                            <CardTitle className="text-xs font-black">
                                                {i + 1}. {q.question_text}
                                            </CardTitle>
                                            <Button 
                                                size="sm"
                                                onClick={() => deleteQuestion(q.id)}
                                                className="h-6 w-6 p-0 text-white bg-destructive hover:bg-destructive/90 dark:text-white dark:bg-destructive dark:hover:bg-destructive/80"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="py-2 px-3 pt-0">
                                            <ul className="space-y-1 text-[10px]">
                                                {q.quiz_options?.sort((a, b) => a.option_order - b.option_order).map(opt => (
                                                    <li key={opt.id} className={cn(
                                                        "font-bold pl-2",
                                                        opt.is_correct ? "text-green-600" : "text-muted-foreground"
                                                    )}>
                                                        • {opt.option_text} {opt.is_correct && "✓"}
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Add New Question Form */}
                    <div className="space-y-4">
                        <Label className="font-black uppercase text-xs">Add New Question</Label>
                        <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
                            <CardContent className="p-4 space-y-4">
                                <form onSubmit={handleAddQuestion} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="qtext" className="font-black uppercase text-xs">Question Text</Label>
                                        <Input
                                            id="qtext"
                                            value={questionText}
                                            onChange={e => setQuestionText(e.target.value)}
                                            required
                                            placeholder="e.g. What is a component?"
                                            className="border-2 border-foreground bg-background font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-black uppercase text-xs">Options (Select the correct one)</Label>
                                        <RadioGroup 
                                            value={options.findIndex(o => o.correct).toString()} 
                                            onValueChange={(val) => setCorrectOption(parseInt(val))}
                                        >
                                            {options.map((opt, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <RadioGroupItem 
                                                        value={idx.toString()} 
                                                        id={`opt-${idx}`} 
                                                        className="border-2 border-foreground" 
                                                    />
                                                    <Input
                                                        value={opt.text}
                                                        onChange={e => updateOptionText(idx, e.target.value)}
                                                        required
                                                        placeholder={`Option ${idx + 1}`}
                                                        className={cn(
                                                            "border-2 border-foreground flex-1 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                                                            opt.correct ? 'bg-green-100 border-green-600' : ''
                                                        )}
                                                    />
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    </div>

                                    <Button 
                                        type="submit" 
                                        disabled={loading} 
                                        className="w-full border-2 border-foreground bg-yellow-400 text-foreground font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                                    >
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        <Plus className="mr-2 h-4 w-4" />
                                        ADD QUESTION
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-4">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="font-black border-2 border-transparent hover:border-foreground"
                    >
                        CLOSE
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
