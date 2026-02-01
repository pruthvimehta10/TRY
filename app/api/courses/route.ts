import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Use Service Role Key to bypass RLS for Admin actions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    // Use Service Role to fetch, but we might want to respect RLS for public? 
    // Actually, this route seems to be used for general lists? 
    // If it's used by Admin, Service Role is good. 
    // If used by client, we filter by is_published.
    // Let's stick to Service Role query but with standard filters.

    let query = supabase
      .from('courses')
      .select('*')
      .eq('is_published', true)

    if (category) {
      // join not needed for simple column filter if we had it, but we need to filter by category relation?
      // simple implementation for now
      // query = query.eq('category_id', category) 
    }

    const { data: courses, error } = await query
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(courses)
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: User ID missing from headers' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { title, description, category_id } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('courses')
      .insert({
        title,
        description,
        category_id: category_id || null,
        instructor_id: userId,
        is_published: true
      })
      .select()
      .single()

    if (error) {
      console.error('Create course error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get('id')

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    console.log('Deleting course:', courseId)

    // Since CASCADE DELETE is enabled in Supabase, we only need to delete the course
    // The database will automatically handle deleting:
    // - All lessons associated with this course
    // - All quiz questions associated with those lessons
    // - All enrollments associated with this course
    const { error: courseError } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId)

    if (courseError) {
      console.error('Error deleting course:', courseError)
      return NextResponse.json(
        { error: 'Failed to delete course', details: courseError.message },
        { status: 400 }
      )
    }

    console.log('Course and all related data deleted successfully')
    return NextResponse.json({
      success: true,
      message: 'Course deleted successfully'
    })

  } catch (error: any) {
    console.error('Unexpected error during course deletion:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}