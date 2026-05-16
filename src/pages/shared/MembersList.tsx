import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/axios";
import { Search, Plus, Pencil, Trash2, KeyRound, Loader2, UserCircle, Phone, Mail, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import TigerLoader from "@/components/TigerLoader";
import { motion, AnimatePresence } from "framer-motion";

interface Member {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  is_active: boolean;
  role: string;
  subject?: string | null;
}

interface Props {
  role: "teacher" | "student";
  title: string;
  description: string;
  canManage?: boolean;
}

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Login kamida 3 ta belgi bo'lishi kerak")
    .max(40)
    .regex(/^[a-z0-9_.-]+$/, "Faqat kichik harflar, sonlar va _ . -"),
  password: z.string().min(6, "Parol kamida 6 ta belgi").max(100),
  full_name: z.string().trim().min(2, "Ism juda qisqa").max(100),
  email: z.string().trim().email("Noto'g'ri email").or(z.literal("")),
  phone_number: z.string().trim().max(30).or(z.literal("")),
  subject: z.string().trim().max(100).optional(),
});

export default function MembersList({ role, title, description, canManage }: Props) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [pwdTarget, setPwdTarget] = useState<Member | null>(null);
  const [delTarget, setDelTarget] = useState<Member | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    full_name: "",
    email: "",
    phone_number: "",
    subject: "",
  });
  const [newPwd, setNewPwd] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/users/by-role/${role.toUpperCase()}`);
      const data = response.data.content || response.data;
      setMembers(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Failed to load members:", error);
      toast.error("Ma'lumotlarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [role]);

  const resetForm = () => {
    setForm({ 
      username: "", 
      password: "", 
      full_name: "", 
      email: "", 
      phone_number: "",
      subject: "",
    });
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (m: Member) => {
    setEditing(m);
    setForm({
      username: m.username,
      password: "",
      full_name: m.full_name || "",
      email: m.email || "",
      phone_number: m.phone_number || "",
      subject: m.subject || "",
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    const parsed = schema.safeParse({
      ...form,
      password: editing ? "dummy-pass" : form.password
    });
    
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        username: form.username.toLowerCase(),
        role: role.toUpperCase(),
        phone_number: form.phone_number.trim().replaceAll(' ', ''),
      };

      if (editing) {
        await api.put(`/admin/users/${editing.id}`, payload);
        toast.success("Ma'lumotlar yangilandi! ✨");
      } else {
        await api.post('/admin/users', payload);
        toast.success("Yangi a'zo qo'shildi! 🚀");
      }
      
      setDialogOpen(false);
      resetForm();
      load();
    } catch (error: any) {
      console.error("Submit error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!delTarget) return;
    try {
      await api.delete(`/admin/users/${delTarget.id}`);
      toast.success("O'chirib tashlandi");
      setDelTarget(null);
      load();
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const resetPassword = async () => {
    if (!pwdTarget || newPwd.length < 6) {
      toast.error("Parol kamida 6 ta belgi bo'lishi kerak");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/admin/users/${pwdTarget.id}/password`, {
        password: newPwd 
      });
      toast.success("Parol yangilandi! 🔐");
      setPwdTarget(null);
      setNewPwd("");
    } catch (error) {
      console.error("Reset pass error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      (m.username || "").toLowerCase().includes(q) ||
      (m.full_name || "").toLowerCase().includes(q) ||
      (m.email || "").toLowerCase().includes(q) ||
      (m.subject || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <TigerLoader isLoading={loading} text={`${title} ro'yxatini tekshiryapman... 🐯🔎`} />
      
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <UserCircle className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">{description || `Tizimdagi barcha ${title.toLowerCase()}lar`}</p>
          </div>
        </div>
        {canManage && (
          <Button onClick={openCreate} variant="hero">
            <Plus className="h-4 w-4 mr-1" /> Qo'shish
          </Button>
        )}
      </div>

      <Card className="p-4 border-primary/10 shadow-sm">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Ism, login yoki fan bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-lg h-11"
          />
        </div>
      </Card>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5 border-primary/5">
              <div className="flex items-center gap-4 mb-4">
                <Skeleton className="h-14 w-14 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="p-12 text-center text-muted-foreground bg-slate-50/50 dark:bg-slate-900/50 border-dashed">
            {members.length === 0 ? "Hech kim topilmadi" : "Qidiruv natijasi yo'q"}
          </Card>
        </motion.div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((m) => {
              const initials = (m.full_name || m.username)
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Card className="p-5 flex flex-col gap-4 hover:shadow-glow transition-smooth border-primary/20 group">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14 rounded-xl border-2 border-primary/10 group-hover:border-primary/30 transition-colors">
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold rounded-xl">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold truncate text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                          {m.full_name || m.username}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">@{m.username}</p>
                        {m.subject && (
                          <div className="flex items-center gap-1 mt-1 text-primary">
                            <BookOpen className="h-3 w-3" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{m.subject}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 py-2 border-t border-slate-100 dark:border-white/5">
                      {m.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{m.email}</span>
                        </div>
                      )}
                      {m.phone_number && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{m.phone_number}</span>
                        </div>
                      )}
                    </div>

                    {canManage && (
                      <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/5 mt-auto">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1 h-9 rounded-lg"
                          onClick={() => openEdit(m)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1.5" /> Tahrir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 w-9 rounded-lg"
                          onClick={() => setPwdTarget(m)}
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDelTarget(m)}
                          className="h-9 w-9 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden border-none shadow-2xl rounded-xl" aria-describedby="member-dialog-description">
          <DialogHeader className="p-8 pb-4 bg-slate-50 dark:bg-slate-900/50">
            <DialogTitle className="text-xl font-bold">
              {editing ? "Ma'lumotlarni tahrirlash" : "Yangi a'zo qo'shish"}
            </DialogTitle>
            <DialogDescription id="member-dialog-description">
              {role === "teacher" ? "O'qituvchi" : "Talaba"} ma'lumotlarini to'g'ri va to'liq kiriting.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <div className="p-8 pt-4 space-y-4 max-h-[70vh] overflow-y-auto thin-scrollbar">
              {!editing && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Username *</Label>
                    <Input
                      value={form.username}
                      onChange={(e) =>
                        setForm({ ...form, username: e.target.value.toLowerCase() })
                      }
                      placeholder="masalan: ali_v"
                      className="rounded-lg h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Parol *</Label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="rounded-lg h-11"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider opacity-70">To'liq ism *</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Ism va Familiya"
                  className="rounded-lg h-11"
                />
              </div>

              {role === "teacher" && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Mutaxassislik (Fan)</Label>
                  <Input
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="masalan: Math, IELTS, Physics"
                    className="rounded-lg h-11"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="example@mail.com"
                    className="rounded-lg h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Telefon</Label>
                  <Input
                    value={form.phone_number}
                    onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                    placeholder="+998 90 123 45 67"
                    className="rounded-lg h-11"
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter className="p-8 pt-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/80 backdrop-blur-md">
              <Button variant="ghost" type="button" onClick={() => setDialogOpen(false)} className="rounded-lg h-11 px-6">
                Bekor
              </Button>
              <Button type="submit" disabled={submitting} variant="hero" className="rounded-lg h-11 px-8">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editing ? "Saqlash" : "Yaratish"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog
        open={!!pwdTarget}
        onOpenChange={(v) => {
          if (!v) {
            setPwdTarget(null);
            setNewPwd("");
          }
        }}
      >
        <DialogContent className="max-w-sm rounded-xl" aria-describedby="pwd-reset-description">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Parolni yangilash</DialogTitle>
            <DialogDescription id="pwd-reset-description">
              Foydalanuvchi: <span className="text-primary font-bold">@{pwdTarget?.username}</span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); resetPassword(); }}>
            <div className="py-4 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Yangi parol</Label>
              <Input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Kamida 6 ta belgi"
                className="rounded-lg h-11"
              />
            </div>
            <DialogFooter className="mt-4">
              <Button variant="ghost" type="button" onClick={() => setPwdTarget(null)} className="rounded-lg">
                Bekor
              </Button>
              <Button type="submit" disabled={submitting} variant="hero" className="rounded-lg">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                O'zgartirish
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!delTarget} onOpenChange={(v) => !v && setDelTarget(null)}>
        <AlertDialogContent className="rounded-xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">O'chirishni tasdiqlang</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-slate-900 dark:text-white">@{delTarget?.username}</span> butunlay
              tizimdan o'chiriladi. Bu amalni qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="rounded-lg">Bekor</AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg px-6"
            >
              O'chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
