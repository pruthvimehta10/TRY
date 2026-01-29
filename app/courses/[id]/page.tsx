import { createClient } from '@/lib/supabase/server'
import { CoursePlayer } from '@/components/course-player'
import { redirect } from 'next/navigation'

export default async function CoursePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    // Fetch course with lessons directly
    const { data: course } = await supabase
        .from('courses')
        .select(`
            *,
            lessons (
                *,
                quiz_questions (
                    *,
                    quiz_options (*)
                )
            )
        `)
        .eq('id', id)
        .single()

    if (!course) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                <div className="text-center">
                    <h1 className="text-4xl font-black mb-4">404</h1>
                    <p className="text-xl">Course not found</p>
                </div>
            </div>
        )
    }

    // Verify labid from JWT matches course's lab_id
    const { headers } = await import('next/headers');
    const headersList = await headers();
    const userLabId = headersList.get('x-lab-id') || '';

    // If course has a lab_id, verify it matches the user's lab_id
    if (course.lab_id && course.lab_id !== userLabId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white text-foreground">
                <div className="text-center">
                    <h1 className="text-4xl font-black mb-4">Access Denied</h1>
                    <p className="text-xl">This course is not available for your lab.</p>
                </div>
            </div>
        )
    }

    // Process lessons to match CoursePlayer interface
    const lessons = (course.lessons || [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((lesson: any, index: number) => ({
            ...lesson,
            videoUrl: lesson.video_url,
            duration: lesson.duration || 10,
            completed: false, // In a real app, fetch 'lesson_completions'
            isLocked: index !== 0, // Unlock first lesson only for demo
            questions: (lesson.quiz_questions || [])
                .sort((a: any, b: any) => a.question_order - b.question_order)
                .map((q: any) => ({
                    id: q.id,
                    question: q.question_text,
                    correctAnswer: q.correct_answer_index,
                    options: (q.quiz_options || [])
                        .sort((a: any, b: any) => a.option_order - b.option_order)
                        .map((o: any) => o.option_text)
                }))
        }))

    // Note: To get options, we need a deeper join or a second query.
    // Supabase recursive query for options:
    /*
      lessons (
        ...,
        quiz_questions (
           ...,
           quiz_options (*)
        )
      )
    */

    // Let's refetch deeply if needed, or update the query above.
    // Updating the query above is better.

    return (
        <CoursePlayer
            courseTitle={course.title}
            lessons={lessons}
            initialLessonId={lessons[0]?.id || ''}
        />
    )
}
