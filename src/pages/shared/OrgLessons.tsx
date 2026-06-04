import { useEffect, useMemo, useState } from "react";
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
import { CalendarClock, Plus, Pencil, Trash2, Loader2, MapPin, BookOpen, Users2, ClipboardCheck, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/lib/axios";

interface Lesson {
  id: string; title: string; description: string | null; room: string | null;
  starts_at: string; ends_at: string; group_id: string; subject_id: string; teacher_id: string | null;
}
interface Group { id: string; name: string; color: string; }
interface Subject { id: string; name: string; color: string; }
interface Profile { id: string; full_name: string | null; username: string; }

interface Props {
  canManage?: boolean;
  basePath: string; // e.g. "/admin", "/teacher", "/student"
  filter?: "teacher" | "student" | "all";
}

const toLocalInput = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
};

export default function OrgLessons({ canManage = false, basePath, filter = "all" }: Props) {
  const { profile, user, role } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [room, setRoom] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [groupId, setGroupId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [saving, setSaving] = useState(false);
  const isTeacherView = role === "teacher";

  const load = async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    try {
      const [lRes, gRes, sRes, tRes] = await Promise.all([
        api.get("/admin/lessons"),
        isTeacherView ? api.get("/teacher/groups") : api.get("/admin/groups?size=1000"),
        api.get("/admin/subjects"),
        api.get("/admin/users?role=TEACHER")
      ]);

      const rawLessons = lRes.data || [];
      let list = rawLessons.map((x: any) => ({
        id: x.id,
        title: x.title,
        description: x.description,
        room: x.room,
        starts_at: x.startsAt || x.starts_at,
        ends_at: x.endsAt || x.ends_at,
        group_id: x.groupId || x.group_id,
        subject_id: x.subjectId || x.subject_id,
        teacher_id: x.teacherId || x.teacher_id,
      }));

      if (filter === "teacher" && user?.id) {
        list = list.filter((x: any) => x.teacher_id === user.id);
      } else if (filter === "student" && user?.id) {
        // Find groups student belongs to
        const { data: gm } = await supabase.from("group_members").select("group_id").eq("student_id", user.id);
        const myGroups = new Set((gm ?? []).map((r: any) => r.group_id));
        list = list.filter((x: any) => myGroups.has(x.group_id));
      }

      setLessons(list);
      
      const rawGroups = isTeacherView ? gRes.data : gRes.data?.content || gRes.data || [];
      setGroups(rawGroups);
      
      setSubjects(sRes.data || []);
      
      const rawTeachers = tRes.data || [];
      setTeachers(rawTeachers.map((t: any) => ({
        id: t.id,
        full_name: t.fullName || t.full_name,
        username: t.username
      })));
    } catch (e) {
      console.error(e);
      toast.error("Ma'lumotlarni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [profile?.organization_id, user?.id]);

  const reset = () => {
    setEditing(null); setTitle(""); setDescription(""); setRoom("");
    setStartsAt(""); setEndsAt(""); setGroupId(""); setSubjectId(""); setTeacherId("");
  };

  const openEdit = (l: Lesson) => {
    setEditing(l); setTitle(l.title); setDescription(l.description ?? ""); setRoom(l.room ?? "");
    setStartsAt(toLocalInput(l.starts_at)); setEndsAt(toLocalInput(l.ends_at));
    setGroupId(l.group_id); setSubjectId(l.subject_id); setTeacherId(isTeacherView ? user?.id ?? "" : l.teacher_id ?? "");
    setOpen(true);
  };

  const submit = async () => {
    if (!title.trim() || !startsAt || !endsAt || !groupId || !subjectId) {
      return toast.error("Hamma majburiy maydonlarni to'ldiring");
    }
    if (!profile?.organization_id) return;
    setSaving(true);
    const payload = {
      title: title.trim(), 
      description: description.trim() || null, 
      room: room.trim() || null,
      startsAt: new Date(startsAt).toISOString(), 
      endsAt: new Date(endsAt).toISOString(),
      groupId, 
      subjectId, 
      teacherId: isTeacherView ? user?.id : teacherId || null,
      organizationId: profile.organization_id,
    };
    try {
      if (editing) {
        await api.put(`/admin/lessons/${editing.id}`, payload);
      } else {
        await api.post(`/admin/lessons`, payload);
      }
      toast.success(editing ? "Yangilandi" : "Yaratildi");
      setOpen(false); reset(); load();
    } catch (e) {
      // toast error is handled by axios interceptor
    } finally {
      setSaving(false);
    }
  };

  const remove = async (l: Lesson) => {
    try {
      await api.delete(`/admin/lessons/${l.id}`);
      toast.success("O'chirildi"); load();
    } catch (e) {
      // toast error handled
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, Lesson[]>();
    lessons.forEach((l) => {
      const day = new Date(l.starts_at).toLocaleDateString("uz-UZ", { day: "numeric", month: "long", weekday: "long" });
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(l);
    });
    return Array.from(map.entries());
  }, [lessons]);

  const groupName = (id: string) => groups.find((g) => g.id === id);
  const subjectName = (id: string) => subjects.find((s) => s.id === id);
  const teacherName = (id: string | null) => {
    if (!id) return null;
    const t = teachers.find((x) => x.id === id);
    return t?.full_name || t?.username || null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Dars jadvali</h1>
          <p className="text-muted-foreground">Darslar ro'yxati va vaqtlari</p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild><Button variant="hero"><Plus className="h-4 w-4" /> Yangi dars</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editing ? "Tahrirlash" : "Yangi dars"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid gap-2"><Label>Sarlavha *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Algoritmlar #5" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Boshlanish *</Label>
                    <div className="relative">
                      <Input 
                        type="datetime-local" 
                        value={startsAt} 
                        onChange={(e) => setStartsAt(e.target.value)} 
                        className="pr-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:z-10"
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-0" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Tugash *</Label>
                    <div className="relative">
                      <Input 
                        type="datetime-local" 
                        value={endsAt} 
                        onChange={(e) => setEndsAt(e.target.value)} 
                        className="pr-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:z-10"
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-0" />
                    </div>
                  </div>
                </div>
                <div className="grid gap-2"><Label>Guruh *</Label>
                  <Select value={groupId} onValueChange={setGroupId}>
                    <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                    <SelectContent>{groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div className="grid gap-2"><Label>Fan *</Label>
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                    <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select></div>
                {!isTeacherView && (
                  <div className="grid gap-2"><Label>O'qituvchi</Label>
                    <Select value={teacherId} onValueChange={setTeacherId}>
                      <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                      <SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name || t.username}</SelectItem>)}</SelectContent>
                    </Select></div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2"><Label>Xona</Label>
                    <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="A-204" /></div>
                </div>
                <div className="grid gap-2"><Label>Tavsif</Label>
                  <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                <Button onClick={submit} disabled={saving} className="w-full" variant="hero">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Saqlash
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : grouped.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Darslar yo'q</Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, list]) => (
            <div key={day}>
              <p className="text-sm font-display font-semibold text-muted-foreground uppercase tracking-wider mb-2">{day}</p>
              <div className="grid gap-3">
                {list.map((l) => {
                  const g = groupName(l.group_id);
                  const s = subjectName(l.subject_id);
                  return (
                    <Card key={l.id} className="p-4 flex items-start justify-between gap-3 flex-wrap hover:shadow-elegant transition-smooth">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`h-12 w-12 rounded-lg bg-${s?.color ?? "primary"}/15 grid place-items-center shrink-0`}>
                          <BookOpen className={`h-6 w-6 text-${s?.color ?? "primary"}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-display font-semibold truncate">{l.title}</h3>
                            {s && <Badge variant="outline">{s.name}</Badge>}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                            <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" />
                              {new Date(l.starts_at).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                              {" – "}
                              {new Date(l.ends_at).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {g && <span className="flex items-center gap-1"><Users2 className="h-3 w-3" /> {g.name}</span>}
                            {l.room && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {l.room}</span>}
                            {l.teacher_id && teacherName(l.teacher_id) && (
                              <span>• {teacherName(l.teacher_id)}</span>
                            )}
                          </div>
                          {l.description && <p className="text-sm text-muted-foreground mt-2">{l.description}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {(isTeacherView && l.teacher_id === user?.id) || canManage ? (
                          <Button asChild size="sm" variant="outline">
                            <Link to={`${basePath}/attendance/${l.id}`}><ClipboardCheck className="h-4 w-4" /> Yo'qlama</Link>
                          </Button>
                        ) : null}
                        {((isTeacherView && l.teacher_id === user?.id) || canManage) && (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>O'chirilsinmi?</AlertDialogTitle>
                                  <AlertDialogDescription>"{l.title}" darsi o'chiriladi.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Bekor</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => remove(l)}>O'chirish</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

