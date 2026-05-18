import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { 
  Users2, Plus, Pencil, Trash2, Loader2, Search, 
  ChevronDown, Check, GraduationCap, Target, Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import TigerLoader from "@/components/TigerLoader";

interface Group {
  id: string;
  name: string;
  description: string | null;
  direction: string | null;
  teacher_id: string | null;
  organization_id: string | null;
  color: string;
  student_count: number;
  is_active: boolean;
}

interface Teacher {
  id: string;
  full_name: string;
  username: string;
  organization_id?: string;
}

const COLORS = [
  { name: "Smaragd", value: "#10b981" },
  { name: "Moviy", value: "#3b82f6" },
  { name: "Binafsha", value: "#8b5cf6" },
  { name: "Oltin", value: "#f59e0b" },
  { name: "Pushti", value: "#ec4899" },
];

export default function OrgGroups() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [organizations, setOrganizations] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Role check
  const role = user?.role?.toLowerCase();
  const isSuper = role === "super_admin";
  const canManage = ["super_admin", "admin", "administrator"].includes(role || "");
  const isTeacher = role === "teacher";

  // form
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [saving, setSaving] = useState(false);
  const [teacherSearchOpen, setTeacherSearchOpen] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    direction: "",
    teacher_id: "",
    organization_id: "",
    color: "#10b981",
  });

  const load = async () => {
    setLoading(true);
    try {
      const endpoint = isTeacher ? "/teacher/groups" : "/admin/groups";
      const [{ data: groupsData }, { data: teachersData }] = await Promise.all([
        api.get(endpoint, { params: { size: 1000 } }),
        canManage ? api.get("/admin/users/by-role/TEACHER", { params: { size: 1000 } }) : Promise.resolve({ data: [] })
      ]);
      
      setGroups(isTeacher ? groupsData : (groupsData.content || []));
      setTeachers(canManage ? (Array.isArray(teachersData) ? teachersData : (teachersData.content || [])) : []);

      if (isSuper) {
        const { data: orgsData } = await api.get("/organizations", { params: { size: 1000 } });
        setOrganizations(orgsData.content || []);
      }
    } catch (e) {
      toast.error("Ma'lumotlarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({
      name: "",
      description: "",
      direction: "",
      teacher_id: "",
      organization_id: "",
      color: "#10b981",
    });
  };

  const handleEdit = (g: Group) => {
    setEditing(g);
    setForm({
      name: g.name,
      description: g.description || "",
      direction: g.direction || "",
      teacher_id: g.teacher_id || "",
      organization_id: g.organization_id || "",
      color: g.color || "#10b981",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Guruh nomini kiriting");
    if (isSuper && !form.organization_id) return toast.error("Tashkilotni tanlang");
    
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/groups/${editing.id}`, form);
        toast.success("Guruh yangilandi");
      } else {
        await api.post("/admin/groups", form);
        toast.success("Guruh yaratildi");
      }
      qc.invalidateQueries({ queryKey: ["super-admin-dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["groups-list"] });
      qc.invalidateQueries({ queryKey: ["all-groups-list-global"] });
      setOpen(false);
      resetForm();
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/groups/${id}`);
      qc.invalidateQueries({ queryKey: ["super-admin-dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["groups-list"] });
      qc.invalidateQueries({ queryKey: ["all-groups-list-global"] });
      toast.success("Guruh o'chirildi");
      load();
    } catch (e) {
      toast.error("O'chirishda xatolik");
    }
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.direction || "").toLowerCase().includes(search.toLowerCase())
  );

  const getTeacherName = (id: string | null) => {
    if (!id) return "—";
    const t = teachers.find(x => x.id === id);
    return t ? t.full_name : "Yuklanmoqda...";
  };

  if (loading && groups.length === 0) return <TigerLoader />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            Guruhlar Boshqaruvi
          </h1>
          <p className="text-muted-foreground mt-1">O'quv markazidagi barcha faol guruhlar ro'yxati</p>
        </div>

        {canManage && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button variant="hero" className="shadow-lg shadow-emerald-500/20">
                <Plus className="h-4 w-4 mr-2" /> Yangi Guruh
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editing ? "Guruhni Tahrirlash" : "Yangi Guruh Yaratish"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Guruh Nomi *</Label>
                    <Input 
                      value={form.name} 
                      onChange={e => setForm({...form, name: e.target.value})}
                      placeholder="masalan: IELTS 7.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Yo'nalish / Fan</Label>
                    <Input 
                      value={form.direction} 
                      onChange={e => setForm({...form, direction: e.target.value})}
                      placeholder="masalan: Ingliz tili"
                    />
                  </div>
                </div>

                {isSuper && (
                  <div className="space-y-2">
                    <Label>Tashkilot *</Label>
                    <Select
                      value={form.organization_id}
                      onValueChange={(v) => {
                        setForm({ ...form, organization_id: v, teacher_id: "" });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tashkilotni tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>O'qituvchi</Label>
                  <Popover open={teacherSearchOpen} onOpenChange={setTeacherSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal"
                      >
                        {form.teacher_id
                          ? teachers.find((t) => t.id === form.teacher_id)?.full_name
                          : "O'qituvchini tanlang..."}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                      <Command>
                        <CommandInput placeholder="O'qituvchi qidirish..." />
                        <CommandList>
                          <CommandEmpty>O'qituvchi topilmadi.</CommandEmpty>
                          <CommandGroup>
                            {teachers
                              .filter(t => !isSuper || !form.organization_id || (t as any).organization_id === form.organization_id)
                              .map((t) => (
                                <CommandItem
                                  key={t.id}
                                  value={t.full_name}
                                  onSelect={() => {
                                    setForm({ ...form, teacher_id: t.id });
                                    setTeacherSearchOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      form.teacher_id === t.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {t.full_name}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Tavsif</Label>
                  <Input 
                    value={form.description} 
                    onChange={e => setForm({...form, description: e.target.value})}
                    placeholder="Guruh haqida qisqacha..."
                  />
                </div>

                <div className="space-y-3">
                  <Label>Identifikatsiya Rangi</Label>
                  <div className="flex gap-3">
                    {COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setForm({...form, color: c.value})}
                        className={cn(
                          "h-8 w-8 rounded-full border-2 transition-all",
                          form.color === c.value ? "border-slate-900 scale-110 shadow-md" : "border-transparent"
                        )}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Bekor qilish</Button>
                <Button onClick={submit} disabled={saving} variant="hero">
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editing ? "Yangilash" : "Yaratish"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-4 bg-white/50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-200 dark:border-white/10">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Guruh yoki yo'nalish bo'yicha qidirish..."
            className="pl-10 bg-transparent border-none focus-visible:ring-0"
          />
        </div>
      </div>

      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {filteredGroups.map((g, idx) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="group relative overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1.5"
                  style={{ backgroundColor: g.color || "#10b981" }}
                />
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div 
                      className="h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner"
                      style={{ backgroundColor: `${g.color || "#10b981"}15` }}
                    >
                      <Users2 className="h-7 w-7" style={{ color: g.color || "#10b981" }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-xl">{g.name}</h3>
                        {!g.is_active && <Badge variant="destructive" className="text-[10px]">Nofaol</Badge>}
                      </div>
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5" /> {g.direction || "Yo'nalishsiz"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <GraduationCap className="h-3.5 w-3.5" /> {getTeacherName(g.teacher_id)}
                        </span>
                        <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                          <Users className="h-3.5 w-3.5" /> {g.student_count || 0} ta o'quvchi
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {canManage && (
                      <>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-9 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10"
                          onClick={() => handleEdit(g)}
                        >
                          <Pencil className="h-4 w-4 mr-2" /> Tahrirlash
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Guruhni o'chirish</AlertDialogTitle>
                              <AlertDialogDescription>
                                "{g.name}" guruhini o'chirib tashlamoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(g.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                O'chirish
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                    {isTeacher && (
                      <Button variant="outline" size="sm" className="h-9">
                        Batafsil
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {!loading && filteredGroups.length === 0 && (
          <div className="text-center py-20 bg-white/30 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10">
            <Users2 className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
            <h3 className="text-xl font-semibold">Guruhlar topilmadi</h3>
            <p className="text-muted-foreground mt-2">Qidiruv shartlarini o'zgartirib ko'ring yoki yangi guruh qo'shing.</p>
          </div>
        )}
      </div>
    </div>
  );
}
