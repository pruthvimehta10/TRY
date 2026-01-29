import { createClient } from '@supabase/supabase-js'
import { withAuthFlow, AuthenticatedRequest } from '@/lib/auth-middleware'

async function handler(request: AuthenticatedRequest) {
  try {
    const body = await request.json()
    const { title, description, level } = body

    // Use service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    const { data, error } = await supabase
      .from('courses')
      .insert({
        title,
        description,
        level,
        instructor_id: request.user!.sub, // Use authenticated user's ID
        is_published: true,
      })
      .select()
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json({ success: true, data }, { status: 201 })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export const POST = (req: AuthenticatedRequest) => withAuthFlow('admin', handler)(req)
