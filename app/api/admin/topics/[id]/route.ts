import { createClient } from '@supabase/supabase-js'
import { withAuthFlow, AuthenticatedRequest } from '@/lib/auth-middleware'

async function handler(
  request: AuthenticatedRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: topicId } = await params

    // Use service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // 1. Get all quiz questions for this topic
    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('id')
      .eq('topic_id', topicId)

    const questionIds = questions?.map(q => q.id) || []

    // 2. Delete quiz options
    if (questionIds.length > 0) {
      await supabase
        .from('quiz_options')
        .delete()
        .in('question_id', questionIds)

      // 3. Delete quiz questions
      await supabase
        .from('quiz_questions')
        .delete()
        .in('id', questionIds)
    }

    // 4. Delete the topic itself
    const { error } = await supabase
      .from('topics')
      .delete()
      .eq('id', topicId)

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
