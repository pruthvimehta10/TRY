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

    // 1. Fetch course details first (without join to avoid FK error)
    const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single()

    if (courseError) {
        console.error("Error fetching course:", courseError);
    }

    if (!course) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                <div className="text-center">
                    <h1 className="text-4xl font-black mb-4">404</h1>
                    <p className="text-xl">Course not found</p>
                    {courseError && (
                        <pre className="text-left bg-gray-100 p-4 rounded mt-4 text-xs text-red-500 overflow-auto max-w-lg mx-auto">
                            DEBUG INFO:
                            ID: {id}
                            Error: {JSON.stringify(courseError, null, 2)}
                        </pre>
                    )}
                </div>
            </div>
        )
    }

    // 2. Fetch topics separately
    // We try to fetch deeply rooted questions too. 
    // If this fails due to topics -> quiz_questions FK missing (unlikely?), we might need another split.
    // Assuming only courses -> topics FK is missing based on error 'courses' and 'topics'.
    const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select(`
            *,

            quiz_questions:quiz_questions!quiz_questions_topic_id_fkey (
                *,
                quiz_options (*)
            )
        `)
        .eq('course_id', id)
        .order('order_index')

    if (topicsError) {
        console.error("Error fetching topics:", topicsError)
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

    // Process topics to match CoursePlayer interface
    const topics = (topicsData || [])
        .map((topic: any, index: number) => ({
            ...topic,
            videoUrl: topic_url_safe(topic),
            duration: topic.duration || 10,
            completed: false, // In a real app, fetch 'topic_completions'
            isLocked: index !== 0, // Unlock first topic only for demo
            questions: (topic.quiz_questions || [])
                .sort((a: any, b: any) => a.question_order - b.question_order)
                .map((q: any) => {
                    // Helper to get options from relationship or fallback column
                    let options = (q.quiz_options || [])
                        .sort((a: any, b: any) => a.option_order - b.option_order)
                        .map((o: any) => o.option_text)

                    // Fallback to 'options' column if relation is empty (legacy data support)
                    if (options.length === 0 && q.options && Array.isArray(q.options)) {
                        options = q.options.map((o: any) => typeof o === 'string' ? o : (o.text || o.option_text || ''))
                    }

                    // Helper to get correct answer index
                    let correctAnswer = (q.quiz_options || [])
                        .findIndex((o: any) => o.is_correct)

                    // Fallback to 'correct_answer' column
                    if (correctAnswer === -1 && q.correct_answer !== undefined && q.correct_answer !== null) {
                        correctAnswer = q.correct_answer
                    }

                    // Fallback for question text (if schema differs)
                    const questionText = q.question_text || q.question || "Untitled Question"

                    return {
                        id: q.id,
                        question: questionText,
                        correctAnswer: correctAnswer >= 0 ? correctAnswer : 0,
                        options
                    }
                }),
        }));

    return (
        <CoursePlayer
            courseTitle={course.title}
            topics={topics}
            initialTopicId={topics[0]?.id || ''}
        />
    )
}

function topic_url_safe(topic: any) {
    if (topic.video_url) return topic.video_url
    return ""
}
