import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users2, Plus, Pencil, Trash2, Loader2, GraduationCap, UserPlus, X } from "lucide-react";

interface Group { id: string; name: string; description: string | null; color: string; }
interface Profile { id: string; full_name: string | null; username: string; }
interface Subject { id: string; name: string; }
interface Member { id: string; student_id: string; }
interface TeacherAssign { id: string; teacher_id: string; subject_id: string | null; }

const COLORS = ["primary", "secondary", "accent", "success", "warning"];

export default function OrgGroups() {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // form
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("primary");
  const [saving, setSaving] = useState(false);

  // members panel
  const [active, setActive] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [teacherAssigns, setTeacherAssigns] = useState<TeacherAssign[]>([]);
  const [pickStudent, setPickStudent] = useState("");
  const [pickTeacher, setPickTeacher] = useState("");
  const [pickSubject, setPickSubject] = useState("");

  const load = async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const [g, s, t, sub] = await Promise.all([
      supabase.from("groups").select("*").eq("organization_id", profile.organization_id).order("name"),
      supabase.from("profiles").select("id, full_name, username")
        .eq("organization_id", profile.organization_id),
      supabase.from("profiles").select("id, full_name, username")
        .eq("organization_id", profile.organization_id),
      supabase.from("subjects").select("id, name").eq("organization_id", profile.organization_id).order("name"),
    ]);
    setGroups((g.data ?? []) as Group[]);

    // Filter students/teachers by role
    const ids = (s.data ?? []).map((p: any) => p.id);
    if (ids.length) {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
      const studentIds = new Set((roles ?? []).filter((r: any) => r.role === "student").map((r: any) => r.user_id));
      const teacherIds = new Set((roles ?? []).filter((r: any) => r.role === "teacher").map((r: any) => r.user_id));
      setStudents((s.data ?? []).filter((p: any) => studentIds.has(p.id)) as Profile[]);
      setTeachers((t.data ?? []).filter((p: any) => teacherIds.has(p.id)) as Profile[]);
    }
    setSubjects((sub.data ?? []) as Subject[]);
    setLoading(false);
  };

  const loadGroupDetails = async (g: Group) => {
    const [m, ta] = await Promise.all([
      supabase.from("group_members").select("id, student_id").eq("group_id", g.id),
      supabase.from("group_teachers").select("id, teacher_id, subject_id").eq("group_id", g.id),
    ]);
    setMembers((m.data ?? []) as Member[]);
    setTeacherAssigns((ta.data ?? []) as TeacherAssign[]);
  };

  useEffect(() => { load(); }, [profile?.organization_id]);
  useEffect(() => { if (active) loadGroupDetails(active); }, [active?.id]);

  const reset = () => { setEditing(null); setName(""); setDescription(""); setColor("primary"); };

  const submit = async () => {
    if (!name.trim() || !profile?.organization_id) return toast.error("Nom kiriting");
    setSaving(true);
    const payload = { name: name.trim(), description: description.trim() || null, color, organization_id: profile.organization_id };
    const { error } = editing
      ? await supabase.from("groups").update(payload).eq("id", editing.id)
      : await supabase.from("groups").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Yangilandi" : "Yaratildi");
    setOpen(false); reset(); load();
  };

  const remove = async (g: Group) => {
    const { error } = await supabase.from("groups").delete().eq("id", g.id);
    if (error) return toast.error(error.message);
    toast.success("O'chirildi"); load();
    if (active?.id === g.id) setActive(null);
  };

  const addStudent = async () => {
    if (!pickStudent || !active || !profile?.organization_id) return;
    const { error } = await supabase.from("group_members").insert({
      group_id: active.id, student_id: pickStudent, organization_id: profile.organization_id,
    });
    if (error) return toast.error(error.message);
    setPickStudent(""); loadGroupDetails(active); toast.success("Talaba biriktirildi");
  };

  const removeMember = async (id: string) => {
    const { error } = await supabase.from("group_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (active) loadGroupDetails(active);
  };

  const addTeacher = async () => {
    if (!pickTeacher || !active || !profile?.organization_id) return;
    const { error } = await supabase.from("group_teachers").insert({
      group_id: active.id, teacher_id: pickTeacher,
      subject_id: pickSubject || null, organization_id: profile.organization_id,
    });
    if (error) return toast.error(error.message);
    setPickTeacher(""); setPickSubject(""); loadGroupDetails(active); toast.success("O'qituvchi biriktirildi");
  };

  const removeTeacher = async (id: string) => {
    const { error } = await supabase.from("group_teachers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (active) loadGroupDetails(active);
  };

  const profileName = (id: string, list: Profile[]) => {
    const p = list.find((x) => x.id === id);
    return p?.full_name || p?.username || "—";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Guruhlar</h1>
          <p className="text-muted-foreground">Talaba va o'qituvchilarni guruhlarga biriktiring</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild><Button variant="hero"><Plus className="h-4 w-4" /> Yangi guruh</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Tahrirlash" : "Yangi guruh"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid gap-2"><Label>Nom *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="A-101" /></div>
              <div className="grid gap-2"><Label>Tavsif</Label>
                <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              <div className="grid gap-2"><Label>Rang</Label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setColor(c)}
                      className={`h-8 w-8 rounded-lg border-2 bg-${c} ${color === c ? "border-foreground" : "border-transparent"}`} />
                  ))}
                </div>
              </div>
              <Button onClick={submit} disabled={saving} className="w-full" variant="hero">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Saqlash
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-[1fr_2fr] gap-6">
        {/* Groups list */}
        <div className="space-y-2">
          {loading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            : groups.length === 0 ? <Card className="p-6 text-center text-muted-foreground text-sm">Guruh yo'q</Card>
            : groups.map((g) => (
              <Card key={g.id} onClick={() => setActive(g)}
                className={`p-4 cursor-pointer transition-smooth hover:shadow-elegant ${active?.id === g.id ? "ring-2 ring-primary" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg bg-${g.color}/15 grid place-items-center`}>
                      <Users2 className={`h-5 w-5 text-${g.color}`} />
                    </div>
                    <div>
                      <p className="font-display font-semibold">{g.name}</p>
                      {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(g); setName(g.name); setDescription(g.description ?? ""); setColor(g.color); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>O'chirilsinmi?</AlertDialogTitle>
                          <AlertDialogDescription>"{g.name}" guruhi va uning a'zolari o'chiriladi.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Bekor</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(g)}>O'chirish</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            ))}
        </div>

        {/* Group details */}
        <div>
          {active ? (
            <Card className="p-6 space-y-6">
              <div>
                <h2 className="font-display font-bold text-2xl">{active.name}</h2>
                {active.description && <p className="text-muted-foreground text-sm">{active.description}</p>}
              </div>

              {/* Teachers */}
              <div className="space-y-3">
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" /> O'qituvchilar
                </h3>
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <Select value={pickTeacher} onValueChange={setPickTeacher}>
                    <SelectTrigger><SelectValue placeholder="O'qituvchi" /></SelectTrigger>
                    <SelectContent>
                      {teachers.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.username}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={pickSubject} onValueChange={setPickSubject}>
                    <SelectTrigger><SelectValue placeholder="Fan (ixtiyoriy)" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={addTeacher} disabled={!pickTeacher}><UserPlus className="h-4 w-4" /> Qo'shish</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {teacherAssigns.length === 0 && <p className="text-sm text-muted-foreground">Hali o'qituvchi yo'q</p>}
                  {teacherAssigns.map((t) => {
                    const subj = subjects.find((s) => s.id === t.subject_id);
                    return (
                      <Badge key={t.id} variant="secondary" className="gap-2 py-1.5">
                        {profileName(t.teacher_id, teachers)} {subj && <span className="opacity-70">· {subj.name}</span>}
                        <button onClick={() => removeTeacher(t.id)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Students */}
              <div className="space-y-3">
                <h3 className="font-display font-semibold flex items-center gap-2">
                  <Users2 className="h-5 w-5 text-primary" /> Talabalar ({members.length})
                </h3>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Select value={pickStudent} onValueChange={setPickStudent}>
                    <SelectTrigger><SelectValue placeholder="Talaba tanlang" /></SelectTrigger>
                    <SelectContent>
                      {students
                        .filter((s) => !members.some((m) => m.student_id === s.id))
                        .map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.username}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={addStudent} disabled={!pickStudent}><UserPlus className="h-4 w-4" /> Qo'shish</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {members.length === 0 && <p className="text-sm text-muted-foreground">Hali talaba yo'q</p>}
                  {members.map((m) => (
                    <Badge key={m.id} variant="outline" className="gap-2 py-1.5">
                      {profileName(m.student_id, students)}
                      <button onClick={() => removeMember(m.id)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center text-muted-foreground">
              <Users2 className="h-12 w-12 mx-auto opacity-50 mb-3" />
              Guruh tanlang yoki yangi guruh yarating
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
