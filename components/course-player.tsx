'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, CheckCircle, Clock, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { LessonQuizModal } from './lesson-quiz-modal'

interface Lesson {
  id: string
  title: string
  duration: number // in minutes
  completed: boolean
  isLocked: boolean
  videoUrl: string
  description?: string
  questions?: any[]
}

interface CoursePlayerProps {
  courseTitle: string
  lessons: Lesson[]
  initialLessonId: string
}

export function CoursePlayer({ courseTitle, lessons, initialLessonId }: CoursePlayerProps) {
  const [currentLessonId, setCurrentLessonId] = useState(initialLessonId)
  const [isVideoEnded, setIsVideoEnded] = useState(false)
  const [showQuizPrompt, setShowQuizPrompt] = useState(false)
  const [isQuizOpen, setIsQuizOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const currentLesson = lessons.find((l) => l.id === currentLessonId)

  // Auto-select first lesson if initialLessonId is not valid
  useEffect(() => {
    if (!currentLesson && lessons.length > 0) {
      setCurrentLessonId(lessons[0].id)
    }
  }, [currentLesson, lessons, initialLessonId])


  const handleVideoEnd = () => {
    setIsVideoEnded(true)
    setShowQuizPrompt(true)
  }

  const handleLessonClick = (lessonId: string) => {
    const lesson = lessons.find((l) => l.id === lessonId)
    // Allow clicking if not locked or if it's the current one (though logic prevents that loop usually)
    // In a real app we might allow re-watching locked previous lessons if completed?
    // For now assuming locked = strictly next in sequence not reached
    if (!lesson?.isLocked) {
      setCurrentLessonId(lessonId)
      setIsVideoEnded(false)
      setShowQuizPrompt(false)
    }
  }

  const handleStartQuiz = () => {
    setIsQuizOpen(true)
    setShowQuizPrompt(false)
  }

  const handleQuizClose = () => {
    setIsQuizOpen(false)
  }

  const handleQuizSubmit = (score: number) => {
    console.log('Quiz submitted with score:', score)
    // Here you would typically save the score to the backend
    // and unlock the next lesson if passed
    setIsQuizOpen(false)
  }

  const completedCount = lessons.filter((l) => l.completed).length
  const totalCount = lessons.filter((l) => !l.isLocked).length // Or just lessons.length based on logic

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border/5">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <h1 className="text-4xl font-black text-card-foreground tracking-tight">{courseTitle}</h1>
          <p className="text-muted-foreground font-bold mt-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Progress: {completedCount} of {lessons.length} lessons completed
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Player and Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player Container */}
            <div className="overflow-hidden bg-black rounded-3xl shadow-2xl aspect-video flex items-center justify-center relative">
              {currentLesson ? (
                <>
                  <video
                    key={currentLesson.id} // Re-render video element on lesson change
                    ref={videoRef}
                    src={currentLesson.videoUrl}
                    controls
                    className="w-full h-full object-cover"
                    onEnded={handleVideoEnd}
                    controlsList="nodownload"
                    style={{ pointerEvents: 'auto' }}
                  />
                  {/* Security overlay to prevent right-click */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    onContextMenu={(e) => e.preventDefault()}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-white gap-4">
                  <Lock className="h-16 w-16 opacity-50" />
                  <p className="text-lg">Select a lesson to start</p>
                </div>
              )}
            </div>

            {/* Lesson Info */}
            {currentLesson && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-3xl font-black text-foreground">{currentLesson.title}</h2>
                  <div className="flex items-center gap-2 mt-2 text-foreground font-bold">
                    <Clock className="h-4 w-4" />
                    <span>{currentLesson.duration} minutes</span>
                  </div>
                </div>

                {/* Quiz Prompt */}
                {showQuizPrompt && (
                  <div className="border-4 border-foreground bg-secondary p-6" style={{ boxShadow: '4px 4px 0px rgba(0,0,0,0.15)' }}>
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-black text-foreground mb-2 text-lg">Lesson Complete!</h3>
                        <p className="text-sm font-semibold text-foreground mb-4">
                          Take the lesson quiz to reinforce what you have learned.
                        </p>
                        <div className="flex gap-3">
                          <Button onClick={handleStartQuiz} className="border-4 border-foreground bg-primary text-primary-foreground font-black">
                            Take Lesson Quiz
                          </Button>
                          <Button onClick={() => setShowQuizPrompt(false)} className="border-4 border-foreground bg-background text-foreground font-black">
                            Skip for now
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lesson Description */}
                <div className="rounded-3xl p-8 bg-card shadow-lg">
                  <h3 className="font-black text-foreground mb-3">About this lesson</h3>
                  <p className="text-foreground leading-relaxed font-semibold">
                    {currentLesson.description || "Learn the fundamentals and best practices covered in this lesson. Complete the video and take the lesson quiz to reinforce your understanding and unlock the next lesson."}
                  </p>
                </div>
              </div>
            )}
          </div>
          {/* Sidebar - Playlist */}
          <div className="lg:col-span-1">
            <div className="h-fit rounded-3xl bg-card shadow-xl overflow-hidden border border-border/5">
              <Tabs defaultValue="content" className="w-full">
                {/* ADDED: border-b border-border/10 creates the thin line below the buttons */}
                <TabsList className="w-full border-b border-border/10 flex bg-muted/20 p-2 h-auto gap-2">
                  <TabsTrigger
                    value="content"
                    className="flex-1 py-3 font-bold text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-xl transition-all"
                  >
                    Content
                  </TabsTrigger>
                  <TabsTrigger
                    value="notes"
                    className="flex-1 py-3 font-bold text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-xl transition-all"
                  >
                    Notes
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
                  {lessons.map((lesson, index) => (
                    <button
                      key={lesson.id}
                      onClick={() => handleLessonClick(lesson.id)}
                      disabled={lesson.isLocked}
                      className={`w-full text-left p-4 transition-all font-semibold rounded-2xl group/item mb-2 ${currentLessonId === lesson.id
                        ? 'bg-primary/10 text-primary shadow-sm border border-primary/20' // Active state clean up
                        : 'bg-transparent hover:bg-muted/50 text-muted-foreground'
                        } ${lesson.isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {lesson.completed ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : lesson.isLocked ? (
                            <Lock className="h-5 w-5 opacity-50" />
                          ) : (
                            <Play className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">
                            {index + 1}. {lesson.title}
                          </p>
                          <p className="text-xs mt-1 font-medium opacity-70">
                            {lesson.duration} min
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}

                  {/* Final Exam Link - Cleaned up borders */}
                  <a
                    href={`${typeof window !== 'undefined' ? window.location.pathname.replace(/\/$/, '') : ''}/exam`}
                    className="block w-full text-left p-3 mt-4 border border-border/10 bg-secondary/30 hover:bg-secondary/60 rounded-2xl transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <Badge className="bg-primary text-primary-foreground">Ex</Badge>
                      </div>
                      <div className="flex-1 min-w-0 group-hover:text-foreground transition-all">
                        <p className="font-bold text-sm text-foreground">Final Exam</p>
                        <p className="text-xs mt-1 font-medium text-muted-foreground group-hover:text-accent-foreground">Test your knowledge</p>
                      </div>
                    </div>
                  </a>
                </TabsContent>

                <TabsContent value="notes" className="p-4 space-y-3">
                  {/* ADD NOTE BUTTON: Clean style + White Text on Hover */}
                  <Button className="w-full border border-border/20 bg-accent text-accent-foreground font-bold hover:bg-primary hover:text-white dark:hover:text-white transition-all">
                    + Add Note
                  </Button>
                  <div className="text-center text-sm font-medium py-8 text-muted-foreground">
                    No notes yet. Add notes to help you remember key concepts.
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>


      {/* Quiz Modal */}
      {currentLesson && currentLesson.questions && currentLesson.questions.length > 0 && (
        <LessonQuizModal
          isOpen={isQuizOpen}
          lessonTitle={currentLesson.title}
          questions={currentLesson.questions}
          onClose={handleQuizClose}
          onSubmit={handleQuizSubmit}
        />
      )}
    </div>
  )
}
