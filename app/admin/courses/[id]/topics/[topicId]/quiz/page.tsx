'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Question {
    id: string
    question_text: string
    question_order: number
    quiz_options: { id: string, option_text: string, is_correct: boolean }[]
}

export default function ManageQuizPage({ params }: { params: Promise<{ id: string, topicId: string }> }) {
    const { id: courseId, topicId } = use(params)
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)
    const [questions, setQuestions] = useState<Question[]>([])

    // Form state for new question
    const [questionText, setQuestionText] = useState('')
    const [options, setOptions] = useState([
        { text: '', correct: true },
        { text: '', correct: false },
        { text: '', correct: false },
        { text: '', correct: false },
    ])

    useEffect(() => {
        fetchQuestions()
    }, [topicId])

    async function fetchQuestions() {
        setFetching(true)
        const { data } = await supabase
            .from('quiz_questions')
            .select(`
                *,
                quiz_options (*)
            `)
            .eq('topic_id', topicId)
            .order('question_order')

        if (data) {
            setQuestions(data as any)
        }
        setFetching(false)
    }

    async function handleAddQuestion(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)

        // 1. Get next order
        const nextOrder = questions.length > 0
            ? Math.max(...questions.map(q => q.question_order)) + 1
            : 0

        // 2. Insert Question
        const { data: qData, error: qError } = await supabase
            .from('quiz_questions')
            .insert({
                topic_id: topicId,
                course_id: courseId,
                question_text: questionText,
                question_order: nextOrder, // consistent naming
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

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" asChild className="pl-0 hover:bg-transparent -ml-2">
                    <Link href={`/admin/courses/${courseId}`} className="flex items-center gap-2 font-bold text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" /> Back to Course
                    </Link>
                </Button>
            </div>

            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-foreground">Manage Quiz</h2>
                    <p className="text-muted-foreground font-bold">
                        Add and edit questions for this topic.
                    </p>
                </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                {/* Left: Existing Questions List */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">Existing Questions ({questions.length})</h3>
                    {fetching ? (
                        <div className="text-muted-foreground">Loading...</div>
                    ) : questions.length === 0 ? (
                        <div className="p-8 border-4 border-dashed border-foreground/20 rounded-xl text-center text-muted-foreground">
                            No questions yet. Add one on the right.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {questions.map((q, i) => (
                                <Card key={q.id} className="border-4 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                    <CardHeader className="flex flex-row items-center justify-between py-3">
                                        <CardTitle className="text-base font-black">
                                            {i + 1}. {q.question_text}
                                        </CardTitle>
                                        <Button variant="ghost" size="sm" onClick={() => deleteQuestion(q.id)} className="text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="py-3 pt-0">
                                        <ul className="list-disc list-inside text-sm text-muted-foreground pl-2">
                                            {q.quiz_options?.map(opt => (
                                                <li key={opt.id} className={opt.is_correct ? "font-bold text-green-600" : ""}>
                                                    {opt.option_text} {opt.is_correct && "(Correct)"}
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
                <div className="space-y-6">
                    <h3 className="text-xl font-bold">Add New Question</h3>
                    <Card className="border-4 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-card">
                        <CardContent className="p-6 space-y-4">
                            <form onSubmit={handleAddQuestion} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="qtext" className="font-bold">Question Text</Label>
                                    <Input
                                        id="qtext"
                                        value={questionText}
                                        onChange={e => setQuestionText(e.target.value)}
                                        required
                                        placeholder="e.g. What is a component?"
                                        className="border-2 border-foreground"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label className="font-bold">Options (Select the correct one)</Label>
                                    <RadioGroup value={options.findIndex(o => o.correct).toString()} onValueChange={(val) => setCorrectOption(parseInt(val))}>
                                        {options.map((opt, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <RadioGroupItem value={idx.toString()} id={`opt-${idx}`} className="border-2 border-foreground text-primary" />
                                                <Input
                                                    value={opt.text}
                                                    onChange={e => updateOptionText(idx, e.target.value)}
                                                    required
                                                    placeholder={`Option ${idx + 1}`}
                                                    className={cn(
                                                        "border-2 border-foreground flex-1 font-bold",
                                                        opt.correct ? 'bg-green-500/10 border-green-600 ring-2 ring-green-600/20 text-foreground' : 'bg-background text-foreground'
                                                    )}
                                                />
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>

                                <Button type="submit" disabled={loading} className="w-full border-4 border-foreground bg-primary text-primary-foreground font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Add Question
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
