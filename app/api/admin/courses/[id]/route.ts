import { createClient } from '@supabase/supabase-js'
import { withAuthFlow, AuthenticatedRequest } from '@/lib/auth-middleware'

async function handler(
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params

    // Use service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // 1. Get all topics for this course
    const { data: topics } = await supabase
      .from('topics')
      .select('id')
      .eq('course_id', courseId)

    const topicIds = topics?.map(t => t.id) || []

    if (topicIds.length > 0) {
      // 2. Get all quiz questions for these topics
      const { data: questions } = await supabase
        .from('quiz_questions')
        .select('id')
        .in('topic_id', topicIds)

      const questionIds = questions?.map(q => q.id) || []

      // 3. Delete quiz options
      if (questionIds.length > 0) {
        await supabase
          .from('quiz_options')
          .delete()
          .in('question_id', questionIds)

        // 4. Delete quiz questions
        await supabase
          .from('quiz_questions')
          .delete()
          .in('id', questionIds)
      }

      // 5. Delete topics (topics now contain lesson data)
      await supabase
        .from('topics')
        .delete()
        .in('id', topicIds)
    }

    // 8. Delete the course
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId)

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json({ success: true }, { status: 200 })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export const DELETE = (req: AuthenticatedRequest, params: any) => 
  withAuthFlow('admin', (r) => handler(r, params))(req)
