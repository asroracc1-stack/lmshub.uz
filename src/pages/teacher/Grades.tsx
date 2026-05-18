import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Award,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Trash2,
} from "lucide-react";

type FeedbackType = "positive" | "negative" | "neutral";

interface Student { id: string; full_name: string | null; username: string; }
interface Subject { id: string; name: string; }
interface Grade {
  id: string; student_id: string; subject_id: string;
  score: number; max_score: number; comment: string | null; created_at: string;
}
interface Feedback {
  id: string; student_id: string; title: string; body: string | null;
  type: FeedbackType; created_at: string;
}

export default function TeacherGrades() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

  const [gradeOpen, setGradeOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [gradeForm, setGradeForm] = useState({
    student_id: "", subject_id: "", score: "", max_score: "5", comment: "",
  });
  const [fbForm, setFbForm] = useState<{ student_id: string; title: string; body: string; type: FeedbackType }>({
    student_id: "", title: "", body: "", type: "positive",
  });

  const load = async () => {
    if (!user?.id || !profile?.organization_id) return;
    setLoading(true);
    const orgId = profile.organization_id;

    // Students from teacher's groups
    const { data: gt } = await supabase
      .from("group_teachers")
      .select("group_id")
      .eq("teacher_id", user.id);
    const groupIds = (gt ?? []).map((g: any) => g.group_id);

    let studentList: Student[] = [];
    if (groupIds.length) {
      const { data: gm } = await supabase
        .from("group_members")
        .select("student_id")
        .in("group_id", groupIds);
      const sids = Array.from(new Set((gm ?? []).map((x: any) => x.student_id)));
      if (sids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, username")
          .in("id", sids);
        studentList = (profs as Student[]) ?? [];
      }
    }
    setStudents(studentList);

    const [{ data: subj }, { data: gr }, { data: fb }] = await Promise.all([
      supabase.from("subjects").select("id, name").eq("organization_id", orgId),
      supabase.from("grades").select("*").eq("teacher_id", user.id).order("created_at", { ascending: false }),
      supabase.from("feedbacks").select("*").eq("teacher_id", user.id).order("created_at", { ascending: false }),
    ]);
    setSubjects((subj as Subject[]) ?? []);
    setGrades((gr as Grade[]) ?? []);
    setFeedbacks((fb as Feedback[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id, profile?.organization_id]);

  const studentMap = useMemo(() => {
    const m: Record<string, Student> = {};
    students.forEach((s) => (m[s.id] = s));
    return m;
  }, [students]);

  const subjectMap = useMemo(() => {
    const m: Record<string, Subject> = {};
    subjects.forEach((s) => (m[s.id] = s));
    return m;
  }, [subjects]);

  const submitGrade = async () => {
    if (!user?.id || !profile?.organization_id) return;
    const score = Number(gradeForm.score);
    if (!gradeForm.student_id || !gradeForm.subject_id || !gradeForm.score) {
      toast.error("Barcha kerakli maydonlarni to'ldiring");
      return;
    }
    if (!Number.isFinite(score) || score < 1 || score > 5) {
      toast.error("Baho 1 dan 5 gacha bo'lishi kerak");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("grades").insert({
        teacher_id: user.id,
        student_id: gradeForm.student_id,
        subject_id: gradeForm.subject_id,
        organization_id: profile.organization_id,
        score,
        max_score: 5,
        comment: gradeForm.comment || null,
      });
      if (error) throw error;
      toast.success("Baho qo'yildi");
      setGradeOpen(false);
      setGradeForm({ student_id: "", subject_id: "", score: "", max_score: "5", comment: "" });
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Xatolik");
    } finally {
      setSaving(false);
    }
  };

  const submitFeedback = async () => {
    if (!user?.id || !profile?.organization_id) return;
    if (!fbForm.student_id || !fbForm.title) {
      toast.error("Talaba va sarlavhani kiriting");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("feedbacks").insert({
        teacher_id: user.id,
        student_id: fbForm.student_id,
        organization_id: profile.organization_id,
        title: fbForm.title,
        body: fbForm.body || null,
        type: fbForm.type,
      });
      if (error) throw error;
      toast.success("Fikr-mulohaza yuborildi");
      setFeedbackOpen(false);
      setFbForm({ student_id: "", title: "", body: "", type: "positive" });
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Xatolik");
    } finally {
      setSaving(false);
    }
  };

  const deleteGrade = async (id: string) => {
    if (!confirm("Bahoni o'chirishni tasdiqlaysizmi?")) return;
    const original = [...grades];
    setGrades(grades.filter((g) => g.id !== id));
    toast.success("O'chirildi");
    const { error } = await supabase.from("grades").delete().eq("id", id);
    if (error) {
      setGrades(original);
      return toast.error(error.message);
    }
  };

  const deleteFeedback = async (id: string) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    const original = [...feedbacks];
    setFeedbacks(feedbacks.filter((f) => f.id !== id));
    toast.success("O'chirildi");
    const { error } = await supabase.from("feedbacks").delete().eq("id", id);
    if (error) {
      setFeedbacks(original);
      return toast.error(error.message);
    }
  };

  const initials = (s?: Student) =>
    (s?.full_name || s?.username || "?").charAt(0).toUpperCase();

  const fbIcon = (t: FeedbackType) => {
    if (t === "positive") return <ThumbsUp className="h-4 w-4 text-success" />;
    if (t === "negative") return <ThumbsDown className="h-4 w-4 text-destructive" />;
    return <MessageCircle className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Baholar va Fikrlar</h1>
          <p className="text-sm text-muted-foreground">
            Talabalarga baho qo'ying va fikr-mulohaza qoldiring
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={gradeOpen} onOpenChange={setGradeOpen}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Award className="h-4 w-4" /> Baho qo'yish
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Yangi baho</DialogTitle>
                <DialogDescription>Tanlangan talaba va fan bo'yicha yangi baho qo'shish.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Talaba</Label>
                  <Select value={gradeForm.student_id} onValueChange={(v) => setGradeForm({ ...gradeForm, student_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.full_name || s.username}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fan</Label>
                  <Select value={gradeForm.subject_id} onValueChange={(v) => setGradeForm({ ...gradeForm, subject_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Baho (1–5)</Label>
                  <Select value={gradeForm.score} onValueChange={(v) => setGradeForm({ ...gradeForm, score: v, max_score: "5" })}>
                    <SelectTrigger><SelectValue placeholder="Baho tanlang" /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((grade) => (
                        <SelectItem key={grade} value={String(grade)}>{grade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Izoh</Label>
                  <Textarea rows={3} value={gradeForm.comment} onChange={(e) => setGradeForm({ ...gradeForm, comment: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGradeOpen(false)}>Bekor</Button>
                <Button variant="hero" onClick={submitGrade} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Saqlash
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <MessageCircle className="h-4 w-4" /> Fikr qoldirish
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Fikr-mulohaza</DialogTitle>
                <DialogDescription>Talabaga o'z fikr-mulohazalaringizni yuboring.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Talaba</Label>
                  <Select value={fbForm.student_id} onValueChange={(v) => setFbForm({ ...fbForm, student_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.full_name || s.username}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Turi</Label>
                  <Select value={fbForm.type} onValueChange={(v) => setFbForm({ ...fbForm, type: v as FeedbackType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positive">👍 Ijobiy</SelectItem>
                      <SelectItem value="neutral">💬 Neytral</SelectItem>
                      <SelectItem value="negative">⚠️ Salbiy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sarlavha</Label>
                  <Input value={fbForm.title} onChange={(e) => setFbForm({ ...fbForm, title: e.target.value })} />
                </div>
                <div>
                  <Label>Izoh</Label>
                  <Textarea rows={4} value={fbForm.body} onChange={(e) => setFbForm({ ...fbForm, body: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setFeedbackOpen(false)}>Bekor</Button>
                <Button variant="hero" onClick={submitFeedback} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Yuborish
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="grades">
        <TabsList>
          <TabsTrigger value="grades">Baholar ({grades.length})</TabsTrigger>
          <TabsTrigger value="feedbacks">Fikrlar ({feedbacks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="grades" className="mt-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : grades.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">Hali baholar yo'q</Card>
          ) : (
            <div className="grid gap-3">
              {grades.map((g) => {
                const s = studentMap[g.student_id];
                const sub = subjectMap[g.subject_id];
                const pct = (Number(g.score) / Number(g.max_score)) * 100;
                return (
                  <Card key={g.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <Avatar><AvatarFallback>{initials(s)}</AvatarFallback></Avatar>
                      <div>
                        <p className="font-medium">{s?.full_name || s?.username || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {sub?.name || "—"} • {new Date(g.created_at).toLocaleDateString("uz")}
                        </p>
                        {g.comment && <p className="text-sm mt-1 text-muted-foreground">{g.comment}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-display font-bold text-2xl">{g.score}<span className="text-sm text-muted-foreground">/{g.max_score}</span></p>
                        <Badge variant={pct >= 80 ? "default" : pct >= 60 ? "secondary" : "destructive"}>
                          {pct.toFixed(0)}%
                        </Badge>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => deleteGrade(g.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="feedbacks" className="mt-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : feedbacks.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">Hali fikrlar yo'q</Card>
          ) : (
            <div className="grid gap-3">
              {feedbacks.map((f) => {
                const s = studentMap[f.student_id];
                return (
                  <Card key={f.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <Avatar><AvatarFallback>{initials(s)}</AvatarFallback></Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {fbIcon(f.type)}
                            <p className="font-medium">{f.title}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {s?.full_name || s?.username || "—"} • {new Date(f.created_at).toLocaleDateString("uz")}
                          </p>
                          {f.body && <p className="text-sm mt-2 whitespace-pre-wrap">{f.body}</p>}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => deleteFeedback(f.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
