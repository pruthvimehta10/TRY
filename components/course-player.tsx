'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, CheckCircle, Clock, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { LessonQuizModal } from './lesson-quiz-modal'

interface Topic {
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
  topics: Topic[]
  initialTopicId: string
}

export function CoursePlayer({ courseTitle, topics: initialTopics, initialTopicId }: CoursePlayerProps) {
  const [topics, setTopics] = useState(initialTopics)
  const [currentTopicId, setCurrentTopicId] = useState(initialTopicId)
  const [isVideoEnded, setIsVideoEnded] = useState(false)
  const [showQuizPrompt, setShowQuizPrompt] = useState(false)
  const [isQuizOpen, setIsQuizOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const currentTopic = topics.find((t) => t.id === currentTopicId)

  // Sync props to state if they change (e.g. initial load vs revalidation)
  useEffect(() => {
    setTopics(initialTopics)
  }, [initialTopics])

  // Auto-select first topic if initialTopicId is not valid
  useEffect(() => {
    if (!currentTopic && topics.length > 0) {
      setCurrentTopicId(topics[0].id)
    }
  }, [currentTopic, topics])

  // Prevent playback rate changes and enforce normal speed
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Lock playback rate to 1.0 (normal speed)
    const enforcePlaybackRate = () => {
      if (video.playbackRate !== 1.0) {
        video.playbackRate = 1.0
      }
    }

    // Monitor and prevent rate changes
    video.addEventListener('ratechange', enforcePlaybackRate)
    video.playbackRate = 1.0

    // Prevent seeking (dragging timeline)
    const preventSeek = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
    }

    video.addEventListener('seeking', preventSeek)
    video.addEventListener('seeked', preventSeek)

    return () => {
      video.removeEventListener('ratechange', enforcePlaybackRate)
      video.removeEventListener('seeking', preventSeek)
      video.removeEventListener('seeked', preventSeek)
    }
  }, [currentTopic])

  const handleVideoEnd = () => {
    setIsVideoEnded(true)
    // Automatically open quiz modal when video ends
    if (currentTopic?.questions && currentTopic.questions.length > 0) {
      setIsQuizOpen(true)
    } else {
      // If no quiz, maybe show prompt or just mark complete? 
      // For now, let's show prompt if there are no questions? 
      // Or assume prompt is for quiz. 
      // Logic: No questions -> User manually clicks next or we auto-advance? 
      // Let's assume most lessons have quizzes given the user flow.
      setShowQuizPrompt(true)
    }
  }

  const handleTopicClick = (topicId: string) => {
    const topic = topics.find((t) => t.id === topicId)
    if (!topic?.isLocked) {
      setCurrentTopicId(topicId)
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

  const handleQuizSubmit = async (score: number) => {
    console.log('Quiz submitted with score:', score)

    // Mark topic as completed if score >= 70
    if (score >= 70) {
      try {
        // 1. Call backend API to mark as completed
        // Note: using 'topics' route but check if it matches 'lessons' terminology in backend
        await fetch(`/api/topics/${currentTopicId}/complete`, {
          method: 'POST'
        })

        console.log('Quiz passed! Topic completed.')

        // 2. Update local state
        const currentIndex = topics.findIndex(t => t.id === currentTopicId)
        const newTopics = [...topics]

        // Mark current as completed
        newTopics[currentIndex] = { ...newTopics[currentIndex], completed: true }

        // Unlock next topic
        let nextTopicId = null
        if (currentIndex + 1 < newTopics.length) {
          newTopics[currentIndex + 1] = { ...newTopics[currentIndex + 1], isLocked: false }
          nextTopicId = newTopics[currentIndex + 1].id
        }

        setTopics(newTopics)

        // 3. Auto-advance
        if (nextTopicId) {
          setCurrentTopicId(nextTopicId)
        }

      } catch (e) {
        console.error("Failed to save progress", e)
      }
    } else {
      alert("You must score at least 70% to proceed. Please try again.")
    }

    setIsQuizOpen(false)
    setIsVideoEnded(false)
  }

  const completedCount = topics.filter((t) => t.completed).length
  const totalCount = topics.filter((t) => !t.isLocked).length // Or just topics.length based on logic

  return (
    <div className="bg-background min-h-screen">
      {/* CSS to prevent dragging while showing timeline and time */}
      <style jsx global>{`
        /* Keep video interactive but limit specific control elements */
        video {
          pointer-events: auto !important;
        }
        
        /* Prevent dragging on timeline but keep it visible */
        video::-webkit-media-controls-timeline {
          pointer-events: none !important;
        }
        
        /* Keep current time and remaining time displays visible but not interactive */
        video::-webkit-media-controls-current-time-display,
        video::-webkit-media-controls-time-remaining-display {
          pointer-events: none !important;
        }
        
        /* Re-enable core controls */
        video::-webkit-media-controls-play-button,
        video::-webkit-media-controls-mute-button,
        video::-webkit-media-controls-volume-slider,
        video::-webkit-media-controls-fullscreen-button {
          pointer-events: auto !important;
        }
        
        /* Hide download button in some browsers */
        video::-internal-media-controls-download-button {
          display: none !important;
        }
        
        video::-webkit-media-controls-enclosure {
          overflow: hidden !important;
        }
        
        /* Disable text selection on video */
        video::selection {
          background: transparent !important;
        }
      `}</style>

      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border/5">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <h1 className="text-4xl font-black text-card-foreground tracking-tight">{courseTitle}</h1>
          <p className="text-muted-foreground font-bold mt-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Progress: {completedCount} of {topics.length} topics completed
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
              {currentTopic ? (
                <>
                  <video
                    key={currentTopic?.id}
                    ref={videoRef}
                    src={currentTopic?.videoUrl ? `/api/video?url=${encodeURIComponent(currentTopic.videoUrl)}&topicId=${currentTopic.id}` : ''}
                    controls
                    className="w-full h-full object-cover"
                    onEnded={handleVideoEnd}
                    controlsList="nodownload noremoteplayback noplaybackrate"
                    disablePictureInPicture
                    disableRemotePlayback
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    onDrop={(e) => e.preventDefault()}
                    style={{
                      WebkitUserSelect: 'none',
                      MozUserSelect: 'none',
                      msUserSelect: 'none',
                      userSelect: 'none',
                      WebkitTouchCallout: 'none',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-white gap-4">
                  <Lock className="h-16 w-16 opacity-50" />
                  <p className="text-lg">Select a lesson to start</p>
                </div>
              )}
            </div>

            {/* Topic Info */}
            {currentTopic && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-3xl font-black text-foreground">{currentTopic.title}</h2>
                  <div className="flex items-center gap-2 mt-2 text-foreground font-bold">
                    <Clock className="h-4 w-4" />
                    <span>{currentTopic.duration} minutes</span>
                  </div>
                </div>

                {/* Quiz Prompt */}
                {showQuizPrompt && (
                  <div className="border-4 border-foreground bg-secondary p-6" style={{ boxShadow: '4px 4px 0px rgba(0,0,0,0.15)' }}>
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-black text-foreground mb-2 text-lg">Topic Complete!</h3>
                        <p className="text-sm font-semibold text-foreground mb-4">
                          Take the topic quiz to reinforce what you have learned.
                        </p>
                        <div className="flex gap-3">
                          <Button onClick={handleStartQuiz} className="border-4 border-foreground bg-primary text-primary-foreground font-black">
                            Take Topic Quiz
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
                  <h3 className="font-black text-foreground mb-3">About this topic</h3>
                  <p className="text-foreground leading-relaxed font-semibold">
                    {currentTopic.description || "Learn the fundamentals and best practices covered in this topic. Complete the video and take the topic quiz to reinforce your understanding and unlock the next topic."}
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
                  {topics.map((topic, index) => (
                    <button
                      key={topic.id}
                      onClick={() => handleTopicClick(topic.id)}
                      disabled={topic.isLocked}
                      className={`w-full text-left p-4 transition-all font-semibold rounded-2xl group/item mb-2 ${currentTopicId === topic.id
                        ? 'bg-primary/10 text-primary shadow-sm border border-primary/20' // Active state clean up
                        : 'bg-transparent hover:bg-muted/50 text-muted-foreground'
                        } ${topic.isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 mt-1">
                          {topic.completed ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : topic.isLocked ? (
                            <Lock className="h-5 w-5 opacity-50" />
                          ) : (
                            <Play className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">
                            {index + 1}. {topic.title}
                          </p>
                          <p className="text-xs mt-1 font-medium opacity-70">
                            {topic.duration} min
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}

                  {/* Final Exam Link - Cleaned up borders */}
                  <a
                    href="/exam"
                    className="block w-full text-left p-3 mt-4 border border-border/10 bg-secondary/30 hover:bg-secondary/60 rounded-2xl transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 mt-1">
                        <Badge className="bg-primary text-primary-foreground">Ex</Badge>
                      </div>
                      <div className="flex-1 min-w-0 hover:text-white transition-all">
                        <p className="font-bold text-sm text-foreground">Final Exam</p>
                        <p className="text-xs mt-1 font-medium text-muted-foreground">Test your knowledge</p>
                      </div>
                    </div>
                  </a>
                </TabsContent>

                <TabsContent value="notes" className="p-4 space-y-3">
                  {/* ADD NOTE BUTTON: Clean style + White Text on Hover */}
                  <Button className="w-full border border-border/20 bg-accent text-accent-foreground font-bold hover:bg-primary hover:text-white transition-all">
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
      {currentTopic && currentTopic.questions && currentTopic.questions.length > 0 && (
        <LessonQuizModal
          isOpen={isQuizOpen}
          lessonTitle={currentTopic.title}
          questions={currentTopic.questions}
          onClose={handleQuizClose}
          onSubmit={handleQuizSubmit}
        />
      )}
    </div>
  )
}