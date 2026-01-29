"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { LessonEditDialog } from "@/components/admin/lesson-edit-dialog";
import Link from "next/link";

export default function EditLessonPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const supabase = createClient();
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(true);

  useEffect(() => {
    fetchLesson();
  }, [id]);

  async function fetchLesson() {
    setLoading(true);
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", id)
      .single();
    if (data) setLesson(data);
    setLoading(false);
  }

  function handleSuccess() {
    fetchLesson();
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="mb-4">
        <Button asChild variant="ghost" className="pl-0 hover:bg-transparent -ml-2">
          <Link href="/admin/lessons" className="flex items-center gap-2 font-bold text-muted-foreground hover:text-foreground">
            Back to Lessons
          </Link>
        </Button>
      </div>
      <LessonEditDialog
        lesson={lesson}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
