import { createClient } from '@supabase/supabase-js'
import { CoursePlayer } from '@/components/course-player'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

// Use Service Role Key to ensure we can fetch data regardless of RLS state, 
// then we implement manual access control logic.
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function CoursePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    // 1. Fetch course details
    const { data: course, error: courseError } = await supabase
        .from('courses')
        .select(`
            *,
            course_labs (lab_id)
        `)
        .eq('id', id)
        .single()

    if (courseError || !course) {
        console.error("Error fetching course:", courseError);
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                <div className="text-center">
                    <h1 className="text-4xl font-black mb-4">404</h1>
                    <p className="text-xl">Course not found</p>
                </div>
            </div>
        )
    }

    // 2. Access Control (Lab ID Check)
    const headersList = await headers();
    const userLabId = headersList.get('x-lab-id');

    if (userLabId) {
        // If the user belongs to a lab, verify the course is assigned to that lab OR is public?
        // Logic: specific lab users should only see courses assigned to their lab.
        // The course might be in multiple labs.
        const assignedLabIds = (course.course_labs || []).map((cl: any) => cl.lab_id);
        const isAssigned = assignedLabIds.includes(userLabId);

        // Fallback: If course has legacy lab_id column match
        const isLegacyMatch = course.lab_id && course.lab_id === userLabId;

        if (!isAssigned && !isLegacyMatch) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-white text-foreground">
                    <div className="text-center">
                        <h1 className="text-4xl font-black mb-4">Access Denied</h1>
                        <p className="text-xl">This course is not available for your lab ({userLabId}).</p>
                    </div>
                </div>
            )
        }
    }

    // 3. Fetch Topics (renamed from lessons)
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
        // We continue, possibly showing empty course
    }

    // 4. Process topics for player
    const topics = (topicsData || [])
        .map((topic: any, index: number) => ({
            ...topic,
            // Handle mismatched field names if any (DB topics might have video_url or similar)
            videoUrl: topic.video_url || "",
            duration: topic.video_duration_seconds ? Math.round(topic.video_duration_seconds / 60) : (topic.duration || 10),
            completed: false, // In a real app, fetch completions
            isLocked: index !== 0,
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
