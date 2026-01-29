"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Video as VideoIcon, Plus, Trash2, FileQuestion } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QuizQuestion {
  id: string;
  question_text: string;
  question_order: number;
}

export default function TopicLessonPage({ params }: { params: { id: string } }) {
  const { id: topicId } = params;
  const router = useRouter();
  const supabase = createClient();
  const [topic, setTopic] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [quizzes, setQuizzes] = useState<QuizQuestion[]>([]);
  const [fetchingQuizzes, setFetchingQuizzes] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTopic();
  }, [topicId]);

  async function fetchTopic() {
    setLoading(true);
    const { data: topicData } = await supabase
      .from("topics")
      .select("*")
      .eq("id", topicId)
      .single();

    if (topicData) {
      setTopic(topicData);
      setVideoUrl(topicData.video_url || "");
      fetchQuizzes();
    }
    setLoading(false);
  }

  async function fetchQuizzes() {
    setFetchingQuizzes(true);
    const { data } = await supabase
      .from("quiz_questions")
      .select("id,question_text,question_order")
      .eq("topic_id", topicId)
      .order("question_order");

    if (data) {
      setQuizzes(data as QuizQuestion[]);
    }
    setFetchingQuizzes(false);
  }

  async function handleDeleteQuiz(quizId: string) {
    if (!confirm("Delete this quiz question?")) return;
    const { error } = await supabase.from("quiz_questions").delete().eq("id", quizId);
    if (error) {
      alert("Error deleting quiz: " + error.message);
    } else {
      setQuizzes(quizzes.filter((q) => q.id !== quizId));
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(10);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `lesson-videos/${fileName}`;

      const { data, error } = await supabase.storage
        .from("videos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      setUploadProgress(80);

      const { data: { publicUrl } } = supabase.storage
        .from("videos")
        .getPublicUrl(filePath);

      setVideoUrl(publicUrl);
      setUploadProgress(100);

      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (error: any) {
      alert("Upload failed: " + error.message);
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function handleSave() {
    if (!topic) return;
    setUpdating(true);

    const { error } = await supabase
      .from("topics")
      .update({
        video_url: videoUrl || null,
      })
      .eq("id", topic.id);

    setUpdating(false);

    if (error) {
      alert("Error saving topic: " + error.message);
    } else {
      alert("Topic saved successfully!");
      fetchTopic();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!topic) {
    return <div className="p-8">Topic not found</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <div className="mb-6">
        <Button asChild variant="ghost" className="pl-0 hover:bg-transparent -ml-2">
          <Link href="/admin/topics" className="flex items-center gap-2 font-bold text-muted-foreground hover:text-foreground">
            ← Back to Topics
          </Link>
        </Button>
      </div>

      <div>
        <h2 className="text-3xl font-black tracking-tight text-foreground uppercase">
          Edit Topic: {topic.title}
        </h2>
        <p className="text-muted-foreground font-bold italic mt-2">
          Manage videos and metadata below.
        </p>
      </div>

      <div className="border-4 border-foreground rounded-lg p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-background space-y-4">
        <div className="space-y-3 bg-secondary/10 p-4 border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <Label className="font-black uppercase text-xs flex items-center gap-2">
            <VideoIcon className="h-4 w-4" /> Video
          </Label>

          <div className="relative">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="video/*"
              className="hidden"
            />
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-foreground bg-yellow-400 text-foreground font-black hover:bg-yellow-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" /> UPLOADING {uploadProgress}%
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4 stroke-[3px]" /> UPLOAD VIDEO
                </>
              )}
            </Button>
            {uploading && (
              <div className="mt-2 h-2 w-full bg-foreground/10 border border-foreground overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>

          {videoUrl && (
            <div className="p-3 bg-green-100 border-2 border-green-600 rounded text-sm font-bold text-green-800">
              ✓ Video uploaded
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleSave}
            disabled={updating || uploading}
            className="flex-1 border-4 border-foreground bg-primary text-primary-foreground font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
          >
            {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            SAVE TOPIC
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-4 border-foreground font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <Link href={`/admin/topics/${topicId}/quizzes`}>
              <Plus className="mr-2 h-4 w-4" /> MANAGE QUIZZES
            </Link>
          </Button>
        </div>
      </div>

      <div className="border-4 border-foreground rounded-lg p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-background space-y-4">
        <div className="flex items-center justify-between">
          <Label className="font-black uppercase text-lg flex items-center gap-2">
            <FileQuestion className="h-5 w-5" /> Quiz Questions ({quizzes.length})
          </Label>
          <Button
            asChild
            size="sm"
            className="border-2 border-foreground bg-green-400 text-foreground font-black hover:bg-green-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          >
            <Link href={`/admin/topics/${topicId}/quizzes`}>
              <Plus className="h-4 w-4 mr-1" /> Add Question
            </Link>
          </Button>
        </div>

        {fetchingQuizzes ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : quizzes.length > 0 ? (
          <div className="space-y-2">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="flex items-center justify-between bg-secondary/50 p-3 border-2 border-foreground rounded"
              >
                <div className="flex-1">
                  <p className="font-bold text-sm">{quiz.question_text}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    Question {quiz.question_order + 1}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteQuiz(quiz.id)}
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 border-2 border-transparent hover:border-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No quiz questions yet. Add one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
