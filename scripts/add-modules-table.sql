-- Create modules table (if not exists)
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create topics table
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure lessons table has topic_id (Backwards compatibility)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='lessons' AND column_name='topic_id') THEN
    ALTER TABLE lessons ADD COLUMN topic_id UUID REFERENCES topics(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS (Redundant but safe)
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Drop restrictive policies if they exist (to recreate them correctly)
DROP POLICY IF EXISTS "Anyone can read modules for public courses" ON modules;
DROP POLICY IF EXISTS "Instructors can manage modules for their courses" ON modules;
DROP POLICY IF EXISTS "Anyone can read topics" ON topics;
DROP POLICY IF EXISTS "Instructors can manage topics" ON topics;
DROP POLICY IF EXISTS "Instructors can manage lessons" ON lessons;
DROP POLICY IF EXISTS "Anyone can read lessons" ON lessons;

-- Simplified RLS Policies for the Lab environment
-- These allow any authenticated user to manage content, which solves ownership mismatches in dev.

-- Modules
CREATE POLICY "Allow authenticated to manage modules" ON modules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Topics
CREATE POLICY "Allow authenticated to manage topics" ON topics
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Lessons (Adding missing policies)
CREATE POLICY "Allow anyone to read lessons" ON lessons
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated to manage lessons" ON lessons
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_topics_module_id ON topics(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_topic_id ON lessons(topic_id);
