import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { withAuthFlow, AuthenticatedRequest } from '@/lib/auth-middleware'

// Initialize Supabase client with SERVICE_ROLE for admin writes
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

async function handler(req: AuthenticatedRequest) {
  try {
    const { topicId, quizTitle } = await req.json()

    if (!topicId || !quizTitle?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Fetch topic to get course_id
    const { data: topic, error: topicErr } = await supabaseAdmin
      .from('topics')
      .select('course_id')
      .eq('id', topicId)
      .single()

    if (topicErr || !topic) throw topicErr || new Error('Topic not found')

    // Determine next quiz order_index within the topic
    const { data: last, error: lastErr } = await supabaseAdmin
      .from('quiz_questions')
      .select('question_order')
      .eq('topic_id', topicId)
      .order('question_order', { ascending: false })
      .limit(1)

    if (lastErr) throw lastErr

    const nextOrder = (last && last.length > 0)
      ? (last[0].question_order + 1)
      : 0

    const { data: quizData, error: quizErr } = await supabaseAdmin
      .from('quiz_questions')
      .insert({
        course_id: topic.course_id,
        topic_id: topicId,
        question_text: quizTitle.trim(),
        question_order: nextOrder,
        question_type: 'multiple_choice',
      })
      .select()
      .single()

    if (quizErr || !quizData) throw quizErr || new Error('Failed to create quiz question')

    return NextResponse.json({ quizId: quizData.id })
  } catch (error: any) {
    console.error('[API POST /api/admin/lessons/quiz]', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = (req: AuthenticatedRequest) => 
  withAuthFlow('admin', handler)(req)
