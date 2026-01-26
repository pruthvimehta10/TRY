-- Create modules table
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read modules for public courses" ON modules
  FOR SELECT USING (true);

CREATE POLICY "Instructors can manage modules for their courses" ON modules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = modules.course_id
      AND courses.instructor_id = auth.uid()
    )
  );

-- Create index
CREATE INDEX idx_modules_course_id ON modules(course_id);
