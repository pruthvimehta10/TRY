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

// Renamed interface to match component
interface QuizBuilderProps {
    lesson: {
        id: string
        title: string
        course_id: string
    } | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

// Renamed function from QuizEditDialog to QuizBuilder
export function QuizBuilder({ lesson, open, onOpenChange, onSuccess }: QuizBuilderProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(false)
    const [questions, setQuestions] = useState<QuizQuestion[]>([])

    // --- Form State for the "Next" Question ---
    const [questionText, setQuestionText] = useState('')
    const [options, setOptions] = useState([
        { text: '', correct: true },
        { text: '', correct: false },
        { text: '', correct: false },
        { text: '', correct: false },
    ])

    useEffect(() => {
        if (open && lesson) {
            fetchQuestions()
        }
    }, [open, lesson])

    async function fetchQuestions() {
        if (!lesson) return
        setFetching(true)
        const { data } = await supabase
            .from('quiz_questions')
            .select(`
                *,
                quiz_options (*)
            `)
            .eq('lesson_id', lesson.id)
            .order('question_order')

        if (data) {
            setQuestions(data as any)
        }
        setFetching(false)
    }

    async function handleAddQuestion(e: React.FormEvent) {
        e.preventDefault()
        if (!lesson) return
        setLoading(true)

        // 1. Calculate Order
        const nextOrder = questions.length > 0
            ? Math.max(...questions.map(q => q.question_order)) + 1
            : 0

        // 2. Insert Question
        const { data: qData, error: qError } = await supabase
            .from('quiz_questions')
            .insert({
                lesson_id: lesson.id,
                course_id: lesson.course_id,
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

        // 3. Insert Options
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
            // --- SUCCESS: RESET FORM FOR NEXT QUESTION ---
            setQuestionText('') // Clear question
            setOptions([        // Reset options to default blanks
                { text: '', correct: true },
                { text: '', correct: false },
                { text: '', correct: false },
                { text: '', correct: false },
            ])
            // Refresh the list on the left immediately
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

    if (!lesson) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Main Dialog Container */}
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col border-4 border-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-background">

                <DialogHeader className="px-1">
                    <DialogTitle className="font-black text-2xl uppercase tracking-tighter flex items-center gap-2 text-foreground">
                        <FileQuestion className="h-6 w-6" />
                        Quiz Builder: {lesson.title}
                    </DialogTitle>
                </DialogHeader>

                {/* Content Grid: Left (List) & Right (Form) */}
                <div className="grid gap-6 md:grid-cols-2 pt-4 overflow-hidden h-full">

                    {/* LEFT SIDE: Question List */}
                    <div className="flex flex-col h-full overflow-hidden space-y-2">
                        <Label className="font-black uppercase text-xs text-foreground">
                            Existing Questions ({questions.length})
                        </Label>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-4">
                            {fetching ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : questions.length === 0 ? (
                                <div className="p-6 border-4 border-dashed border-foreground/20 text-center text-muted-foreground rounded-lg">
                                    <p className="text-xs font-black uppercase">No questions yet</p>
                                    <p className="text-[10px] mt-1">Fill out the form to add one →</p>
                                </div>
                            ) : (
                                questions.map((q, i) => (
                                    <Card key={q.id} className="border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-card">
                                        <CardHeader className="flex flex-row items-start justify-between py-2 px-3 space-y-0">
                                            <CardTitle className="text-xs font-black text-foreground leading-tight mt-1">
                                                <span className="text-muted-foreground mr-1">#{i + 1}</span>
                                                {q.question_text}
                                            </CardTitle>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => deleteQuestion(q.id)}
                                                className="h-6 w-6 p-0 -mr-2 text-muted-foreground hover:text-destructive hover:bg-transparent"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="py-2 px-3 pt-0">
                                            <ul className="space-y-1 text-[10px]">
                                                {q.quiz_options?.sort((a, b) => a.option_order - b.option_order).map(opt => (
                                                    <li key={opt.id} className={cn(
                                                        "font-bold pl-2 border-l-2",
                                                        opt.is_correct
                                                            ? "border-green-500 text-green-700 dark:text-green-400"
                                                            : "border-transparent text-muted-foreground"
                                                    )}>
                                                        {opt.option_text} {opt.is_correct && "✓"}
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>

                    {/* RIGHT SIDE: Add Question Form */}
                    <div className="flex flex-col h-full overflow-y-auto pr-1">
                        <Label className="font-black uppercase text-xs text-foreground mb-2">Add New Question</Label>
                        <Card className="border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-card mb-4">
                            <CardContent className="p-4 space-y-4">
                                <form onSubmit={handleAddQuestion} className="space-y-4">
                                    {/* Question Input */}
                                    <div className="space-y-2">
                                        <Label htmlFor="qtext" className="font-black uppercase text-[10px] px-1 bg-foreground text-background inline-block">
                                            Question Text
                                        </Label>
                                        <Input
                                            id="qtext"
                                            value={questionText}
                                            onChange={e => setQuestionText(e.target.value)}
                                            required
                                            placeholder="e.g. What is React?"
                                            className="border-2 border-foreground bg-background text-foreground placeholder:text-muted-foreground font-bold text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:ring-0 focus:translate-x-px focus:translate-y-px focus:shadow-none transition-all"
                                        />
                                    </div>

                                    {/* Options Inputs */}
                                    <div className="space-y-2">
                                        <Label className="font-black uppercase text-[10px] px-1 bg-foreground text-background inline-block">
                                            Options (Select correct answer)
                                        </Label>
                                        <RadioGroup
                                            value={options.findIndex(o => o.correct).toString()}
                                            onValueChange={(val) => setCorrectOption(parseInt(val))}
                                        >
                                            {options.map((opt, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <RadioGroupItem
                                                        value={idx.toString()}
                                                        id={`opt-${idx}`}
                                                        // Ensure visible in dark mode
                                                        className="border-2 border-foreground text-foreground bg-transparent"
                                                    />
                                                    <Input
                                                        value={opt.text}
                                                        onChange={e => updateOptionText(idx, e.target.value)}
                                                        required
                                                        placeholder={`Option ${idx + 1}`}
                                                        className={cn(
                                                            "border-2 border-foreground flex-1 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-background text-foreground placeholder:text-muted-foreground transition-all",
                                                            opt.correct
                                                                ? 'bg-green-500/10 border-green-600 ring-2 ring-green-600/20'
                                                                : ''
                                                        )}
                                                    />
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    </div>

                                    {/* Submit Button */}
                                    <Button
                                        type="submit"
                                        disabled={loading}
                                        // Always Black Text for contrast against Yellow
                                        className="w-full border-2 border-foreground bg-yellow-400 text-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                                    >
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                                        ADD & NEXT
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <DialogFooter className="pt-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="font-black border-2 border-transparent hover:border-foreground text-foreground"
                    >
                        DONE / CLOSE
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}