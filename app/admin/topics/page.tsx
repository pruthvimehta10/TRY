"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getJWTFromClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, BookOpen } from "lucide-react";
import Link from "next/link";

interface Topic {
  id: string;
  title: string;
  course_id: string;
  course_title?: string;
  video_url?: string;
  quiz_count?: number;
}

export default function AdminTopicsPage() {
  const supabase = createClient();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTopics();
  }, []);

  async function fetchTopics() {
    setLoading(true);
    const { data } = await supabase
      .from("topics")
      .select("id,title,course_id,courses(title),video_url,quiz_questions(count)")
      .order("created_at", { ascending: false });
    
    if (data) {
      setTopics(
        data.map((t: any) => ({
          ...t,
          course_title: t.courses?.title || "Unknown",
          video_url: t.video_url,
          quiz_count: t.quiz_questions?.length || 0
        }))
      );
    }
    setLoading(false);
  }

  async function handleDeleteTopic(id: string) {
    if (!confirm("Are you sure you want to delete this topic and all its videos and quizzes?")) return;
    
    try {
      const token = getJWTFromClient();
      const res = await fetch(`/api/admin/topics/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await res.json();

      if (!res.ok) {
        alert('Error deleting topic: ' + result.error);
      } else {
        setTopics(topics.filter((t) => t.id !== id));
      }
    } catch (error: any) {
      alert('Error deleting topic: ' + error.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground uppercase flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Topic Management
          </h2>
          <p className="text-muted-foreground font-bold italic mt-2">
            Manage all topics and their courses. Each topic has videos and quizzes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="border-4 border-foreground bg-primary text-primary-foreground font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
            <Link href="/admin/topics/new">
              <Plus className="mr-2 h-4 w-4 stroke-[3px]" /> Add Topic
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <div className="border-4 border-foreground rounded-lg overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-background">
          <Table>
            <TableHeader className="bg-secondary/50 border-b-4 border-foreground">
              <TableRow>
                <TableHead className="font-black text-foreground">Topic Title</TableHead>
                <TableHead className="font-black text-foreground">Course</TableHead>
                <TableHead className="font-black text-foreground">Videos</TableHead>
                <TableHead className="font-black text-foreground">Quizzes</TableHead>
                <TableHead className="text-right font-black text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topics.map((topic) => (
                <TableRow
                  key={topic.id}
                  className="font-medium border-b-2 border-border/50 last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="font-bold">{topic.title}</TableCell>
                  <TableCell className="font-bold">{topic.course_title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-2 border-foreground font-bold bg-blue-100 dark:bg-blue-900 text-foreground dark:text-blue-100">
                      {topic.video_url ? "1 Video" : "No Video"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-2 border-foreground font-bold bg-green-100 dark:bg-green-900 text-foreground dark:text-green-100">
                      {topic.quiz_count || 0} Quizzes
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTopic(topic.id)}
                        className="h-8 w-8 border-2 border-transparent hover:border-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {topics.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No topics yet. Create a course first to add topics.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
