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
    const { selectedCourseId, topicTitle, description, videoTitle, videoUrl, quizzes } = await req.json()

    if (!selectedCourseId || !topicTitle?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Determine next topic order_index within the course
    const { data: lastTopic, error: lastTopicErr } = await supabaseAdmin
      .from('topics')
      .select('order_index')
      .eq('course_id', selectedCourseId)
      .order('order_index', { ascending: false })
      .limit(1)

    if (lastTopicErr) throw lastTopicErr

    const nextOrder = (lastTopic && lastTopic.length > 0)
      ? (lastTopic[0].order_index + 1)
      : 0

    // 1. Create topic with video data
    const { data: topicData, error: topicErr } = await supabaseAdmin
      .from('topics')
      .insert({
        course_id: selectedCourseId,
        title: topicTitle.trim(),
        description,
        video_url: videoUrl || null,
        video_title: videoTitle || null,
        order_index: nextOrder,
      })
      .select()
      .single()

    if (topicErr || !topicData) throw topicErr || new Error('Failed to create topic')

    // 2. Add quizzes if provided
    if (quizzes && Array.isArray(quizzes) && quizzes.length > 0) {
      const questionsToInsert = quizzes.map((quiz, idx) => ({
        course_id: selectedCourseId,
        topic_id: topicData.id,
        question_text: quiz.title || `Question ${idx + 1}`,
        question_order: idx,
        question_type: 'multiple_choice',
      }))

      const { data: questionsData, error: questionsErr } = await supabaseAdmin
        .from('quiz_questions')
        .insert(questionsToInsert)
        .select()

      if (questionsErr) throw questionsErr

      // Add options for each question
      if (questionsData && questionsData.length > 0) {
        const optionsToInsert: any[] = []
        questionsData.forEach((q, idx) => {
          const quiz = quizzes[idx]
          if (quiz.options && Array.isArray(quiz.options)) {
            quiz.options.forEach((option: any, optIdx: number) => {
              optionsToInsert.push({
                question_id: q.id,
                option_text: option.text || `Option ${optIdx + 1}`,
                is_correct: option.isCorrect || false,
                option_order: optIdx,
              })
            })
          }
        })

        if (optionsToInsert.length > 0) {
          const { error: optionsErr } = await supabaseAdmin.from('quiz_options').insert(optionsToInsert)
          if (optionsErr) throw optionsErr
        }
      }
    }

    return NextResponse.json({ topicId: topicData.id, courseId: selectedCourseId })
  } catch (error: any) {
    console.error('[API POST /api/admin/topics]', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = (req: AuthenticatedRequest) => 
  withAuthFlow('admin', handler)(req)
