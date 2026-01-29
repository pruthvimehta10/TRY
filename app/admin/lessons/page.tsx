"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";

interface Lesson {
  id: string;
  title: string;
  topic_id: string;
  topic_title?: string;
}

export default function AdminLessonsPage() {
  const supabase = createClient();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLessons();
  }, []);

  async function fetchLessons() {
    setLoading(true);
    const { data } = await supabase
      .from("lessons")
      .select("id,title,topic_id,topics(title)")
      .order("created_at", { ascending: false });
    if (data) {
      setLessons(
        data.map((l: any) => ({
          ...l,
          topic_title: l.topics?.title || "Unknown"
        }))
      );
    }
    setLoading(false);
  }

  async function handleDeleteLesson(id: string) {
    if (!confirm("Are you sure you want to delete this lesson?")) return;
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) {
      alert("Error deleting lesson: " + error.message);
    } else {
      setLessons(lessons.filter((l) => l.id !== id));
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
          <h2 className="text-3xl font-black tracking-tight text-foreground uppercase">Lesson Management</h2>
          <p className="text-muted-foreground font-bold italic">
            Manage all lessons and their topics here.
          </p>
        </div>
        <Button asChild className="border-4 border-foreground bg-primary text-primary-foreground font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all">
          <Link href="/admin/topics/new">
            <Plus className="mr-2 h-4 w-4 stroke-[3px]" /> Add Topic
          </Link>
        </Button>
      </div>
      <div className="grid gap-6">
        <div className="border-4 border-foreground rounded-lg overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] bg-background">
          <Table>
            <TableHeader className="bg-secondary/50 border-b-4 border-foreground">
              <TableRow>
                <TableHead className="font-black text-foreground">Lesson Title</TableHead>
                <TableHead className="font-black text-foreground">Topic</TableHead>
                <TableHead className="text-right font-black text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessons.map((lesson) => (
                <TableRow
                  key={lesson.id}
                  className="font-medium border-b-2 border-border/50 last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="font-bold">{lesson.title}</TableCell>
                  <TableCell className="font-bold">{lesson.topic_title}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        asChild
                        className="h-8 w-8 border-2 border-foreground bg-background text-foreground hover:bg-muted"
                        title="Edit Lesson"
                      >
                        <Link href={`/admin/lessons/${lesson.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteLesson(lesson.id)}
                        className="h-8 w-8 border-2 border-transparent hover:border-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
