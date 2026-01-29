"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface Course {
  id: string;
  title: string;
}

interface Quiz {
  id: string;
  title: string;
  options: { text: string; isCorrect: boolean }[];
}

export default function AddTopicPage() {
  const router = useRouter();
  const supabase = createClient();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCourses, setFetchingCourses] = useState(true);

  const [selectedCourse, setSelectedCourse] = useState("");
  const [topicTitle, setTopicTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuizOptions, setNewQuizOptions] = useState([
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ]);

  useEffect(() => {
    fetchCourses();
  }, []);

  async function fetchCourses() {
    setFetchingCourses(true);
    const { data } = await supabase.from("courses").select("id,title").order("created_at", { ascending: false });
    if (data) {
      setCourses(data as Course[]);
    }
    setFetchingCourses(false);
  }

  function addQuiz() {
    if (!newQuizTitle.trim()) {
      alert("Please enter a quiz title");
      return;
    }

    if (!newQuestionText.trim()) {
      alert("Please enter a question text");
      return;
    }

    const quiz: Quiz = {
      id: Date.now().toString(),
      title: newQuestionText,
      options: newQuizOptions.filter((o) => o.text.trim()),
    };

    if (quiz.options.length < 2) {
      alert("Please add at least 2 options");
      return;
    }

    if (!quiz.options.some((o) => o.isCorrect)) {
      alert("Please mark at least one option as correct");
      return;
    }

    setQuizzes([...quizzes, quiz]);
    setNewQuizTitle("");
    setNewQuestionText("");
    setNewQuizOptions([
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ]);
  }

  function removeQuiz(id: string) {
    setQuizzes(quizzes.filter((q) => q.id !== id));
  }

  async function handleVideoSelect(file: File | undefined) {
    if (!file) return;
    setVideoFile(file);
    setUploadingVideo(true);
    setUploadProgress(0);

    try {
      const fileName = `topic-${Date.now()}-${file.name}`;
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev < 90) return prev + Math.random() * 30;
          return prev;
        });
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from("lesson-videos")
        .upload(fileName, file);

      clearInterval(progressInterval);

      if (uploadError) {
        alert("Error uploading video: " + uploadError.message);
        setVideoFile(null);
        setUploadingVideo(false);
        setUploadProgress(0);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("lesson-videos")
        .getPublicUrl(fileName);
      
      setUploadProgress(100);
      setUploadedVideoUrl(urlData?.publicUrl || null);
      setUploadingVideo(false);
    } catch (error: any) {
      alert("Error uploading video: " + error.message);
      setVideoFile(null);
      setUploadingVideo(false);
      setUploadProgress(0);
    }
  }

  function updateQuizOption(idx: number, text: string) {
    const newOpts = [...newQuizOptions];
    newOpts[idx].text = text;
    setNewQuizOptions(newOpts);
  }

  function setCorrectOption(idx: number) {
    const newOpts = newQuizOptions.map((opt, i) => ({ ...opt, isCorrect: i === idx }));
    setNewQuizOptions(newOpts);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      let videoUrl = uploadedVideoUrl;

      // Upload video if provided and not already uploaded
      if (videoFile && !uploadedVideoUrl) {
        setUploadingVideo(true);
        setUploadProgress(0);
        const fileName = `topic-${Date.now()}-${videoFile.name}`;
        
        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev < 90) return prev + Math.random() * 30;
            return prev;
          });
        }, 200);

        const { error: uploadError } = await supabase.storage
          .from("lesson-videos")
          .upload(fileName, videoFile);

        clearInterval(progressInterval);

        if (uploadError) {
          alert("Error uploading video: " + uploadError.message);
          setLoading(false);
          setUploadingVideo(false);
          setUploadProgress(0);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("lesson-videos")
          .getPublicUrl(fileName);
        videoUrl = urlData?.publicUrl;
        setUploadProgress(100);
        setUploadingVideo(false);
      }

      const res = await fetch("/api/admin/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedCourseId: selectedCourse,
          topicTitle,
          description,
          videoTitle,
          videoUrl,
          quizzes: quizzes.map((q) => ({ title: q.title, options: q.options })),
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert("Error creating topic: " + result.error);
      } else {
        router.push("/admin/topics");
        router.refresh();
      }
    } catch (error: any) {
      alert("Error creating topic: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  if (fetchingCourses) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" asChild className="pl-0 hover:bg-transparent -ml-2">
          <Link href="/admin/topics" className="flex items-center gap-2 font-bold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Topics
          </Link>
        </Button>
      </div>

      <div>
        <h2 className="text-3xl font-black tracking-tight text-foreground uppercase">Create New Topic</h2>
        <p className="text-muted-foreground font-bold italic mt-2">
          Create a topic with video, title, and optional quizzes.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Topic Details */}
        <Card className="border-4 border-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader>
            <CardTitle className="font-black uppercase">Topic Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="course" className="font-black uppercase text-xs">
                Course *
              </Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse} required>
                <SelectTrigger className="border-2 border-foreground">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic" className="font-black uppercase text-xs">
                Topic Title *
              </Label>
              <Input
                id="topic"
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                required
                placeholder="e.g. Introduction to React"
                className="border-2 border-foreground font-bold text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="font-black uppercase text-xs">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the topic..."
                className="border-2 border-foreground min-h-[80px] font-bold text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="videoTitle" className="font-black uppercase text-xs">
                Video Title
              </Label>
              <Input
                id="videoTitle"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="e.g. Getting Started with React"
                className="border-2 border-foreground font-bold text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video" className="font-black uppercase text-xs">
                Video Upload
              </Label>
              <Input
                id="video"
                type="file"
                accept="video/*"
                onChange={(e) => handleVideoSelect(e.target.files?.[0])}
                disabled={uploadingVideo}
                className="border-2 border-foreground font-bold text-xs cursor-pointer file:cursor-pointer file:border-0 file:bg-primary file:text-primary-foreground file:font-bold file:px-4 file:py-2 file:mr-4 disabled:opacity-50"
              />
              
              {uploadingVideo && (
                <div className="space-y-2">
                  <div className="w-full h-2 bg-foreground/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs font-bold text-primary">{Math.round(uploadProgress)}% Uploading...</p>
                </div>
              )}

              {uploadedVideoUrl && (
                <div className="space-y-1 p-3 bg-green-100 border-2 border-green-600 rounded-lg">
                  <p className="text-xs font-black uppercase text-green-700">✓ Video Uploaded</p>
                  <a 
                    href={uploadedVideoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-blue-600 hover:underline break-all"
                  >
                    {uploadedVideoUrl}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quizzes */}
        <Card className="border-4 border-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <CardHeader>
            <CardTitle className="font-black uppercase">Quizzes ({quizzes.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Existing Quizzes */}
            {quizzes.length > 0 && (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {quizzes.map((quiz, i) => (
                  <div key={quiz.id} className="border-2 border-foreground p-3 rounded-lg bg-secondary/10">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-black text-xs uppercase">
                        Q{i + 1}: {quiz.title}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => removeQuiz(quiz.id)}
                        className="h-6 w-6 p-0 text-white bg-destructive hover:bg-destructive/90 dark:text-white dark:bg-destructive dark:hover:bg-destructive/80"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <ul className="space-y-1 text-[10px]">
                      {quiz.options.map((opt, idx) => (
                        <li key={idx} className={cn("font-bold pl-2", opt.isCorrect ? "text-green-600" : "text-muted-foreground")}>
                          • {opt.text} {opt.isCorrect && "✓"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Quiz */}
            <div className="border-2 border-dashed border-foreground p-4 rounded-lg space-y-3">
              <div className="font-black uppercase text-xs">Add Quiz Question</div>

              <div className="space-y-2">
                <Label htmlFor="quizTitle" className="font-bold text-xs">
                  Quiz Title
                </Label>
                <Input
                  id="quizTitle"
                  value={newQuizTitle}
                  onChange={(e) => setNewQuizTitle(e.target.value)}
                  placeholder="e.g. React Basics Quiz"
                  className="border-2 border-foreground font-bold text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-xs">Question Text</Label>
                <Input
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="e.g. What is React?"
                  className="border-2 border-foreground font-bold text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-xs">Options (Select the correct one)</Label>
                <RadioGroup value={newQuizOptions.findIndex((o) => o.isCorrect).toString()} onValueChange={(val) => setCorrectOption(parseInt(val))}>
                  {newQuizOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <RadioGroupItem value={idx.toString()} id={`opt-${idx}`} className="border-2 border-foreground" />
                      <Input
                        value={opt.text}
                        onChange={(e) => updateQuizOption(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                        className={cn(
                          "border-2 border-foreground flex-1 text-xs font-bold",
                          opt.isCorrect ? "bg-green-100 border-green-600" : ""
                        )}
                      />
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Button
                type="button"
                onClick={addQuiz}
                className="w-full border-2 border-foreground bg-blue-400 text-foreground font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                <Plus className="mr-2 h-4 w-4" />
                ADD QUIZ
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="ghost" asChild className="font-bold">
            <Link href="/admin/topics">Cancel</Link>
          </Button>
          <Button
            type="submit"
            disabled={loading || uploadingVideo || !selectedCourse || !topicTitle}
            className="border-4 border-foreground bg-primary text-primary-foreground font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            CREATE TOPIC
          </Button>
        </div>
      </form>
    </div>
  );
}
