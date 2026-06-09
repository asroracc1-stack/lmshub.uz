import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { api } from "@/lib/axios";
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
  Pencil,
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
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

  const [gradeOpen, setGradeOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);

  const [gradeForm, setGradeForm] = useState({
    student_id: "", subject_id: "", score: "", max_score: "5", comment: "",
  });
  const [fbForm, setFbForm] = useState<{ student_id: string; title: string; body: string; type: FeedbackType }>({
    student_id: "", title: "", body: "", type: "positive",
  });

  const load = async () => {
    if (!user?.id || !profile?.organization_id) return;
    setLoading(true);

    try {
      const [studentsRes, subjectsRes, gradesRes, fbRes] = await Promise.all([
        api.get('/admin/users', { params: { role: 'STUDENT', size: 1000 } }),
        api.get('/admin/subjects'),
        api.get('/teacher/grades/my'),
        api.get('/teacher/feedbacks/my')
      ]);

      const studentList = (studentsRes.data || []).map((u: any) => ({
        id: u.id,
        full_name: u.fullName || u.username,
        username: u.username
      }));
      setStudents(studentList);
      setSubjects(subjectsRes.data || []);

      const gradesList = (gradesRes.data || []).map((g: any) => ({
        id: g.id,
        student_id: g.studentId,
        subject_id: g.subjectId,
        score: g.score,
        max_score: g.maxScore,
        comment: g.comment,
        created_at: g.createdAt
      }));
      setGrades(gradesList);

      const fbList = (fbRes.data || []).map((f: any) => ({
        id: f.id,
        student_id: f.studentId,
        title: f.title,
        body: f.body,
        type: f.type ? f.type.toLowerCase() as FeedbackType : 'positive',
        created_at: f.createdAt
      }));
      setFeedbacks(fbList);
    } catch (err: any) {
      console.error(err);
      toast.error(t("gradesPage.loadError"));
    } finally {
      setLoading(false);
    }
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

  // === GRADE CRUD ===
  const openNewGrade = () => {
    setEditingGrade(null);
    setGradeForm({ student_id: "", subject_id: "", score: "", max_score: "5", comment: "" });
    setGradeOpen(true);
  };

  const openEditGrade = (g: Grade) => {
    setEditingGrade(g);
    setGradeForm({
      student_id: g.student_id,
      subject_id: g.subject_id,
      score: String(g.score),
      max_score: String(g.max_score),
      comment: g.comment || "",
    });
    setGradeOpen(true);
  };

  const submitGrade = async () => {
    if (!user?.id || !profile?.organization_id) return;
    const score = Number(gradeForm.score);
    if (!gradeForm.student_id || !gradeForm.subject_id || !gradeForm.score) {
      toast.error(t("gradesPage.fillRequired"));
      return;
    }
    if (!Number.isFinite(score) || score < 0 || score > 5) {
      toast.error(t("gradesPage.scoreRange"));
      return;
    }
    setSaving(true);
    try {
      if (editingGrade) {
        await api.put(`/teacher/grades/${editingGrade.id}`, {
          studentId: gradeForm.student_id,
          subjectId: gradeForm.subject_id,
          score,
          maxScore: 5,
          comment: gradeForm.comment || null,
        });
        toast.success(t("gradesPage.gradeUpdated"));
      } else {
        await api.post('/teacher/grades', {
          studentId: gradeForm.student_id,
          subjectId: gradeForm.subject_id,
          score,
          maxScore: 5,
          comment: gradeForm.comment || null,
        });
        toast.success(t("gradesPage.gradeSaved"));
      }
      setGradeOpen(false);
      setEditingGrade(null);
      setGradeForm({ student_id: "", subject_id: "", score: "", max_score: "5", comment: "" });
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || t("gradesPage.error"));
    } finally {
      setSaving(false);
    }
  };

  const deleteGrade = async (id: string) => {
    if (!confirm(t("gradesPage.deleteGradeConfirm"))) return;
    try {
      await api.delete(`/teacher/grades/${id}`);
      toast.success(t("gradesPage.deleted"));
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || t("gradesPage.error"));
    }
  };

  // === FEEDBACK CRUD ===
  const openNewFeedback = () => {
    setEditingFeedback(null);
    setFbForm({ student_id: "", title: "", body: "", type: "positive" });
    setFeedbackOpen(true);
  };

  const openEditFeedback = (f: Feedback) => {
    setEditingFeedback(f);
    setFbForm({
      student_id: f.student_id,
      title: f.title,
      body: f.body || "",
      type: f.type,
    });
    setFeedbackOpen(true);
  };

  const submitFeedback = async () => {
    if (!user?.id || !profile?.organization_id) return;
    if (!fbForm.student_id || !fbForm.title) {
      toast.error(t("gradesPage.studentAndTitle"));
      return;
    }
    setSaving(true);
    try {
      if (editingFeedback) {
        await api.put(`/teacher/feedbacks/${editingFeedback.id}`, {
          studentId: fbForm.student_id,
          title: fbForm.title,
          body: fbForm.body || null,
          type: fbForm.type.toUpperCase(),
        });
        toast.success(t("gradesPage.feedbackUpdated"));
      } else {
        await api.post('/teacher/feedbacks', {
          studentId: fbForm.student_id,
          title: fbForm.title,
          body: fbForm.body || null,
          type: fbForm.type.toUpperCase(),
        });
        toast.success(t("gradesPage.feedbackSent"));
      }
      setFeedbackOpen(false);
      setEditingFeedback(null);
      setFbForm({ student_id: "", title: "", body: "", type: "positive" });
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || t("gradesPage.error"));
    } finally {
      setSaving(false);
    }
  };

  const deleteFeedback = async (id: string) => {
    if (!confirm(t("gradesPage.deleteFeedbackConfirm"))) return;
    try {
      await api.delete(`/teacher/feedbacks/${id}`);
      toast.success(t("gradesPage.deleted"));
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || t("gradesPage.error"));
    }
  };

  const initials = (s?: Student) =>
    (s?.full_name || s?.username || "?").charAt(0).toUpperCase();

  const fbIcon = (tp: FeedbackType) => {
    if (tp === "positive") return <ThumbsUp className="h-4 w-4 text-success" />;
    if (tp === "negative") return <ThumbsDown className="h-4 w-4 text-destructive" />;
    return <MessageCircle className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">{t("gradesPage.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("gradesPage.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Grade Dialog */}
          <Dialog open={gradeOpen} onOpenChange={(v) => { if (!v) { setGradeOpen(false); setEditingGrade(null); } else setGradeOpen(true); }}>
            <DialogTrigger asChild>
              <Button variant="hero" onClick={openNewGrade}>
                <Award className="h-4 w-4" /> {t("gradesPage.addGrade")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingGrade ? t("gradesPage.gradeDialog.editTitle") : t("gradesPage.gradeDialog.title")}</DialogTitle>
                <DialogDescription>{editingGrade ? t("gradesPage.gradeDialog.editDescription") : t("gradesPage.gradeDialog.description")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>{t("gradesPage.gradeDialog.student")}</Label>
                  <Select value={gradeForm.student_id} onValueChange={(v) => setGradeForm({ ...gradeForm, student_id: v })} disabled={!!editingGrade}>
                    <SelectTrigger><SelectValue placeholder={t("gradesPage.gradeDialog.selectPlaceholder")} /></SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.full_name || s.username}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("gradesPage.gradeDialog.subject")}</Label>
                  <Select value={gradeForm.subject_id} onValueChange={(v) => setGradeForm({ ...gradeForm, subject_id: v })} disabled={!!editingGrade}>
                    <SelectTrigger><SelectValue placeholder={t("gradesPage.gradeDialog.selectPlaceholder")} /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{t("gradesPage.gradeDialog.scoreLabel")}</Label>
                  <Select value={gradeForm.score} onValueChange={(v) => setGradeForm({ ...gradeForm, score: v, max_score: "5" })}>
                    <SelectTrigger><SelectValue placeholder={t("gradesPage.gradeDialog.scorePlaceholder")} /></SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4, 5].map((grade) => (
                        <SelectItem key={grade} value={String(grade)}>{grade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("gradesPage.gradeDialog.comment")}</Label>
                  <Textarea rows={3} value={gradeForm.comment} onChange={(e) => setGradeForm({ ...gradeForm, comment: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setGradeOpen(false); setEditingGrade(null); }}>{t("gradesPage.gradeDialog.cancel")}</Button>
                <Button variant="hero" onClick={submitGrade} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {editingGrade ? t("gradesPage.gradeDialog.update") : t("gradesPage.gradeDialog.save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Feedback Dialog */}
          <Dialog open={feedbackOpen} onOpenChange={(v) => { if (!v) { setFeedbackOpen(false); setEditingFeedback(null); } else setFeedbackOpen(true); }}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={openNewFeedback}>
                <MessageCircle className="h-4 w-4" /> {t("gradesPage.addFeedback")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingFeedback ? t("gradesPage.feedbackDialog.editTitle") : t("gradesPage.feedbackDialog.title")}</DialogTitle>
                <DialogDescription>{editingFeedback ? t("gradesPage.feedbackDialog.editDescription") : t("gradesPage.feedbackDialog.description")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>{t("gradesPage.feedbackDialog.student")}</Label>
                  <Select value={fbForm.student_id} onValueChange={(v) => setFbForm({ ...fbForm, student_id: v })} disabled={!!editingFeedback}>
                    <SelectTrigger><SelectValue placeholder={t("gradesPage.gradeDialog.selectPlaceholder")} /></SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.full_name || s.username}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("gradesPage.feedbackDialog.type")}</Label>
                  <Select value={fbForm.type} onValueChange={(v) => setFbForm({ ...fbForm, type: v as FeedbackType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positive">{t("gradesPage.feedbackDialog.positive")}</SelectItem>
                      <SelectItem value="neutral">{t("gradesPage.feedbackDialog.neutral")}</SelectItem>
                      <SelectItem value="negative">{t("gradesPage.feedbackDialog.negative")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("gradesPage.feedbackDialog.heading")}</Label>
                  <Input value={fbForm.title} onChange={(e) => setFbForm({ ...fbForm, title: e.target.value })} />
                </div>
                <div>
                  <Label>{t("gradesPage.feedbackDialog.comment")}</Label>
                  <Textarea rows={4} value={fbForm.body} onChange={(e) => setFbForm({ ...fbForm, body: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setFeedbackOpen(false); setEditingFeedback(null); }}>{t("gradesPage.feedbackDialog.cancel")}</Button>
                <Button variant="hero" onClick={submitFeedback} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {editingFeedback ? t("gradesPage.feedbackDialog.update") : t("gradesPage.feedbackDialog.send")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="grades">
        <TabsList>
          <TabsTrigger value="grades">{t("gradesPage.tabs.grades")} ({grades.length})</TabsTrigger>
          <TabsTrigger value="feedbacks">{t("gradesPage.tabs.feedbacks")} ({feedbacks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="grades" className="mt-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : grades.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">{t("gradesPage.emptyGrades")}</Card>
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
                      <Button size="icon" variant="ghost" onClick={() => openEditGrade(g)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
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
            <Card className="p-12 text-center text-muted-foreground">{t("gradesPage.emptyFeedbacks")}</Card>
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
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditFeedback(f)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteFeedback(f.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
