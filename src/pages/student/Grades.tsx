import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Award,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
} from "lucide-react";

type FeedbackType = "positive" | "negative" | "neutral";
type AttendanceStatus = "present" | "absent" | "late" | "excused";

interface Grade {
  id: string; subject_id: string; teacher_id: string;
  score: number; max_score: number; comment: string | null; created_at: string;
}
interface Feedback {
  id: string; teacher_id: string; title: string; body: string | null;
  type: FeedbackType; created_at: string;
}
interface Attendance {
  id: string; lesson_id: string; status: AttendanceStatus;
  note: string | null; created_at: string;
}
interface Subject { id: string; name: string; }
interface Profile { id: string; full_name: string | null; username: string; }
interface Lesson { id: string; title: string; starts_at: string; }

export default function StudentGrades() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [subjects, setSubjects] = useState<Record<string, Subject>>({});
  const [teachers, setTeachers] = useState<Record<string, Profile>>({});
  const [lessons, setLessons] = useState<Record<string, Lesson>>({});

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      const [{ data: gr }, { data: fb }, { data: att }] = await Promise.all([
        supabase.from("grades").select("*").eq("student_id", user.id).order("created_at", { ascending: false }),
        supabase.from("feedbacks").select("*").eq("student_id", user.id).order("created_at", { ascending: false }),
        supabase.from("attendance").select("*").eq("student_id", user.id).order("created_at", { ascending: false }),
      ]);
      const gs = (gr as Grade[]) ?? [];
      const fs = (fb as Feedback[]) ?? [];
      const ats = (att as Attendance[]) ?? [];
      setGrades(gs);
      setFeedbacks(fs);
      setAttendance(ats);

      const subjIds = Array.from(new Set(gs.map((g) => g.subject_id)));
      const teacherIds = Array.from(new Set([...gs.map((g) => g.teacher_id), ...fs.map((f) => f.teacher_id)]));
      const lessonIds = Array.from(new Set(ats.map((a) => a.lesson_id)));

      const [subjRes, profRes, lesRes] = await Promise.all([
        subjIds.length ? supabase.from("subjects").select("id, name").in("id", subjIds) : Promise.resolve({ data: [] as any[] }),
        teacherIds.length ? supabase.from("profiles").select("id, full_name, username").in("id", teacherIds) : Promise.resolve({ data: [] as any[] }),
        lessonIds.length ? supabase.from("lessons").select("id, title, starts_at").in("id", lessonIds) : Promise.resolve({ data: [] as any[] }),
      ]);
      const sm: Record<string, Subject> = {};
      (subjRes.data ?? []).forEach((s: any) => (sm[s.id] = s));
      setSubjects(sm);
      const tm: Record<string, Profile> = {};
      (profRes.data ?? []).forEach((p: any) => (tm[p.id] = p));
      setTeachers(tm);
      const lm: Record<string, Lesson> = {};
      (lesRes.data ?? []).forEach((l: any) => (lm[l.id] = l));
      setLessons(lm);

      setLoading(false);
    })();
  }, [user?.id]);

  const stats = useMemo(() => {
    const total = grades.reduce((sum, g) => sum + Number(g.score), 0);
    const max = grades.reduce((sum, g) => sum + Number(g.max_score), 0);
    const avg = max > 0 ? (total / max) * 100 : 0;
    const presentCount = attendance.filter((a) => a.status === "present").length;
    const attRate = attendance.length > 0 ? (presentCount / attendance.length) * 100 : 0;
    return { avg, attRate, totalGrades: grades.length, totalAtt: attendance.length };
  }, [grades, attendance]);

  const fbIcon = (t: FeedbackType) => {
    if (t === "positive") return <ThumbsUp className="h-4 w-4 text-success" />;
    if (t === "negative") return <ThumbsDown className="h-4 w-4 text-destructive" />;
    return <MessageCircle className="h-4 w-4 text-muted-foreground" />;
  };

  const attIcon = (s: AttendanceStatus) => {
    if (s === "present") return <CheckCircle2 className="h-4 w-4 text-success" />;
    if (s === "late") return <Clock className="h-4 w-4 text-warning" />;
    if (s === "absent") return <XCircle className="h-4 w-4 text-destructive" />;
    return <FileText className="h-4 w-4 text-muted-foreground" />;
  };

  const attLabel = (s: AttendanceStatus) =>
    ({ present: "Keldi", absent: "Kelmadi", late: "Kech keldi", excused: "Sababli" })[s];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Mening natijalarim</h1>
        <p className="text-sm text-muted-foreground">Baholar, davomat va o'qituvchi fikrlari</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase">O'rtacha ball</p>
          <p className="font-display font-bold text-3xl mt-1">{stats.avg.toFixed(1)}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Jami baholar</p>
          <p className="font-display font-bold text-3xl mt-1">{stats.totalGrades}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Davomat</p>
          <p className="font-display font-bold text-3xl mt-1">{stats.attRate.toFixed(0)}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Jami darslar</p>
          <p className="font-display font-bold text-3xl mt-1">{stats.totalAtt}</p>
        </Card>
      </div>

      <Tabs defaultValue="grades">
        <TabsList>
          <TabsTrigger value="grades">Baholar ({grades.length})</TabsTrigger>
          <TabsTrigger value="attendance">Davomat ({attendance.length})</TabsTrigger>
          <TabsTrigger value="feedbacks">Fikrlar ({feedbacks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="grades" className="mt-4">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : grades.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">Hali baholar yo'q</Card>
          ) : (
            <div className="grid gap-3">
              {grades.map((g) => {
                const pct = (Number(g.score) / Number(g.max_score)) * 100;
                return (
                  <Card key={g.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary grid place-items-center">
                        <Award className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{subjects[g.subject_id]?.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {teachers[g.teacher_id]?.full_name || teachers[g.teacher_id]?.username || "—"}
                          {" • "}{new Date(g.created_at).toLocaleDateString("uz")}
                        </p>
                        {g.comment && <p className="text-sm mt-1 text-muted-foreground">{g.comment}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-2xl">{g.score}<span className="text-sm text-muted-foreground">/{g.max_score}</span></p>
                      <Badge variant={pct >= 80 ? "default" : pct >= 60 ? "secondary" : "destructive"}>
                        {pct.toFixed(0)}%
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : attendance.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">Hali yozuvlar yo'q</Card>
          ) : (
            <div className="grid gap-2">
              {attendance.map((a) => (
                <Card key={a.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {attIcon(a.status)}
                    <div>
                      <p className="font-medium">{lessons[a.lesson_id]?.title || "Dars"}</p>
                      <p className="text-xs text-muted-foreground">
                        {lessons[a.lesson_id]?.starts_at ? new Date(lessons[a.lesson_id].starts_at).toLocaleString("uz") : ""}
                      </p>
                      {a.note && <p className="text-sm mt-1 text-muted-foreground">{a.note}</p>}
                    </div>
                  </div>
                  <Badge variant={a.status === "present" ? "default" : a.status === "absent" ? "destructive" : "secondary"}>
                    {attLabel(a.status)}
                  </Badge>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="feedbacks" className="mt-4">
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : feedbacks.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">Hali fikrlar yo'q</Card>
          ) : (
            <div className="grid gap-3">
              {feedbacks.map((f) => (
                <Card key={f.id} className="p-4">
                  <div className="flex items-center gap-2">
                    {fbIcon(f.type)}
                    <p className="font-medium">{f.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {teachers[f.teacher_id]?.full_name || teachers[f.teacher_id]?.username || "—"}
                    {" • "}{new Date(f.created_at).toLocaleDateString("uz")}
                  </p>
                  {f.body && <p className="text-sm mt-2 whitespace-pre-wrap">{f.body}</p>}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
