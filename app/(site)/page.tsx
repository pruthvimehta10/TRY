import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Navbar } from '@/components/navbar'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = await createClient()

  const { data: featuredCourses, error } = await supabase
    .from('courses')
    .select('*')
    .eq('is_published', true)
    .limit(3)

  if (error) console.error('Supabase Error:', error)
  const courses = featuredCourses || []

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section id="courses" className="max-w-7xl mx-auto px-4 py-12 border-t-4 border-foreground">
        <div className="space-y-8">
          <div className="space-y-2">
            <h2 className="text-4xl sm:text-5xl font-black text-foreground">Featured Courses</h2>
            <p className="text-lg font-semibold text-foreground">
              Start with these popular courses and develop in-demand skills
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.length > 0 ? (
              courses.map((course) => (
                <div
                  key={course.id}
                  className="group flex flex-col overflow-hidden rounded-3xl bg-card shadow-lg transition-all hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="aspect-video w-full relative bg-muted/20 flex items-center justify-center">
                    {course.thumbnail_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <BookOpen className="h-12 w-12 text-muted-foreground/30" />
                    )}

                    <div className="absolute top-4 left-4">
                      <span className="backdrop-blur-md bg-background/80 text-foreground border border-border/10 px-3 py-1 text-xs font-bold rounded-full shadow-sm">
                        {course.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold leading-tight mb-2 text-card-foreground line-clamp-1">
                        {course.title}
                      </h3>
                      <p className="text-sm font-medium text-muted-foreground line-clamp-2">
                        {course.description}
                      </p>
                    </div>

                    <div className="mt-auto space-y-4">
                      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        <div className="flex items-center gap-1.5">
                          <span className="text-yellow-500">⭐</span> {course.rating || 'New'}
                        </div>
                        <div>
                          {course.total_students?.toLocaleString() || 0} enrolled
                        </div>
                      </div>

                      <Button
                        asChild
                        className="w-full h-12 rounded-2xl text-sm font-bold bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary/95 group-hover:bg-primary/90 active:scale-[0.98]"
                      >
                        <Link href={`/courses/${course.id}`}>
                          View Course <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center py-12">
                <p className="text-xl font-bold text-muted-foreground">No courses found.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}