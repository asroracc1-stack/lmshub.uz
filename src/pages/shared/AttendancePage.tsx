import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle2, XCircle, Clock, FileText, Loader2, ArrowLeft, Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

type Status = "present" | "absent" | "late" | "excused";

interface Lesson {
  id: string; title: string; starts_at: string; ends_at: string;
  group_id: string; subject_id: string; organization_id: string; teacher_id: string | null;
}
interface Student { id: string; full_name: string | null; username: string; }
interface Row { student_id: string; status: Status; note: string; existingId?: string; }

export default function AttendancePage() {
  const { t } = useTranslation();

  const STATUS: { value: Status; label: string; icon: typeof CheckCircle2; color: string }[] = [
    { value: "present", label: t("dynamic.mycourses.keldi"), icon: CheckCircle2, color: "success" },
    { value: "late", label: "Kech keldi", icon: Clock, color: "warning" },
    { value: "absent", label: t("dynamic.mycourses.kelmadi"), icon: XCircle, color: "destructive" },
    { value: "excused", label: t("dynamic.mycourses.sababli"), icon: FileText, color: "muted-foreground" },
  ];
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [students, setStudents] = useState<Record<string, Student>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!lessonId) return;
      setLoading(true);

      const { data: l } = await supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle();
      if (!l) { toast.error(t("dynamic.attendancepage.dars_topilmadi")); navigate(-1); return; }
      setLesson(l as Lesson);

      const { data: gm } = await supabase.from("group_members").select("student_id").eq("group_id", l.group_id);
      const studentIds = (gm ?? []).map((r: any) => r.student_id);

      const [profiles, attendance] = await Promise.all([
        studentIds.length
          ? supabase.from("profiles").select("id, full_name, username").in("id", studentIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from("attendance").select("id, student_id, status, note").eq("lesson_id", lessonId),
      ]);

      const sMap: Record<string, Student> = {};
      (profiles.data ?? []).forEach((p: any) => { sMap[p.id] = p; });
      setStudents(sMap);

      const existingMap = new Map<string, any>();
      (attendance.data ?? []).forEach((a: any) => existingMap.set(a.student_id, a));

      setRows(studentIds.map((sid) => {
        const ex = existingMap.get(sid);
        return {
          student_id: sid,
          status: (ex?.status as Status) ?? "present",
          note: ex?.note ?? "",
          existingId: ex?.id,
        };
      }));
      setLoading(false);
    })();
  }, [lessonId]);

  const update = (sid: string, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.student_id === sid ? { ...r, ...patch } : r)));
  };

  const setAll = (status: Status) => {
    setRows((rs) => rs.map((r) => ({ ...r, status })));
  };

  const saveAll = async () => {
    if (!lesson || !user?.id) return;
    setSaving(true);
    try {
      // Upsert each row
      const payloads = rows.map((r) => ({
        ...(r.existingId ? { id: r.existingId } : {}),
        lesson_id: lesson.id,
        student_id: r.student_id,
        organization_id: lesson.organization_id,
        status: r.status,
        note: r.note || null,
        marked_by: user.id,
      }));

      // Split: inserts + updates
      const inserts = payloads.filter((p) => !p.id);
      const updates = payloads.filter((p) => p.id);

      if (inserts.length) {
        const { error } = await supabase.from("attendance").insert(inserts);
        if (error) throw error;
      }
      for (const u of updates) {
        const { id, ...rest } = u;
        const { error } = await supabase.from("attendance").update(rest).eq("id", id);
        if (error) throw error;
      }

      toast.success(t("dynamic.attendancepage.yo_qlama_saqlandi_kelmaganlarga_xabar_yu"));
      // Reload to capture new ids
      navigate(-1);
    } catch (e: any) {
      toast.error(e.message ?? "Xatolik");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!lesson) return null;

  const initials = (s: Student) => (s.full_name || s.username || "?").charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="font-display text-2xl font-bold">{lesson.title}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(lesson.starts_at).toLocaleString("uz-UZ")}
          </p>
        </div>
      </div>

      <Card className="p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{t("dynamic.attendancepage.hammaga")}</span>
          {STATUS.map((s) => {
            const Icon = s.icon;
            return (
              <Button key={s.value} size="sm" variant="outline" onClick={() => setAll(s.value)}>
                <Icon className="h-4 w-4" /> {s.label}
              </Button>
            );
          })}
        </div>
        <Button variant="hero" onClick={saveAll} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Saqlash ({rows.length})
        </Button>
      </Card>

      {rows.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">{t("dynamic.attendancepage.bu_guruhda_talaba_yo_q")}</Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => {
            const s = students[r.student_id];
            return (
              <Card key={r.student_id} className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Avatar><AvatarFallback>{s ? initials(s) : "?"}</AvatarFallback></Avatar>
                    <div>
                      <p className="font-medium">{s?.full_name || s?.username || "—"}</p>
                      <p className="text-xs text-muted-foreground">@{s?.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {STATUS.map((st) => {
                      const Icon = st.icon;
                      const active = r.status === st.value;
                      return (
                        <Button key={st.value} size="sm" variant={active ? "default" : "outline"}
                          onClick={() => update(r.student_id, { status: st.value })}
                          className={active ? `bg-${st.color} hover:bg-${st.color}/90 text-${st.color}-foreground` : ""}>
                          <Icon className="h-4 w-4" /> {st.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
                {(r.status === "absent" || r.status === "late" || r.status === "excused") && (
                  <Textarea
                    rows={1}
                    placeholder="Sabab yoki izoh (ixtiyoriy)..."
                    value={r.note}
                    onChange={(e) => update(r.student_id, { note: e.target.value })}
                    className="mt-3"
                  />
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

