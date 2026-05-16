import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users as UsersIcon, 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  KeyRound, 
  Loader2, 
  UserCircle,
  Shield,
  GraduationCap,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  BookOpen,
  Users2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import TigerLoader from "@/components/TigerLoader";
import { useTranslation } from "react-i18next";

interface User {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  active: boolean;
  role: string;
  subject?: string | null;
  group_id?: string | null;
}

const userSchema = z.object({
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
  role: z.enum(["ADMINISTRATOR", "TEACHER", "STUDENT", "ADMIN"]),
  subject: z.string().optional(),
});

export default function Users() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [pwdTarget, setPwdTarget] = useState<User | null>(null);
  const [delTarget, setDelTarget] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState(false);
  const [tigerAction, setTigerAction] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    username: "",
    password: "",
    full_name: "",
    email: "",
    phone_number: "",
    role: "STUDENT",
    subject: "",
  });
  const [newPwd, setNewPwd] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/users/all");
      setUsers(response.data.content || response.data);
    } catch (error: any) {
      console.error("Failed to load users:", error);
      if (error.response?.status >= 500) setGlobalError(true);
      toast.error("Foydalanuvchilarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm({
      username: "",
      password: "",
      full_name: "",
      email: "",
      phone_number: "",
      role: "STUDENT",
      subject: "",
    });
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      username: u.username,
      password: "",
      full_name: u.full_name || "",
      email: u.email || "",
      phone_number: u.phone_number || "",
      role: u.role,
      subject: u.subject || "",
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    const parsed = userSchema.safeParse({
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
        phone_number: form.phone_number.trim().replaceAll(' ', ''),
      };

      if (editing) {
        await api.put(`/admin/users/${editing.id}`, payload);
        toast.success("Ma'lumotlar yangilandi! ✨");
      } else {
        await api.post('/admin/users', payload);
        toast.success("Foydalanuvchi muvaffaqiyatli qo'shildi! 🚀");
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

  const toggleStatus = async (u: User) => {
    try {
      await api.put(`/admin/users/${u.id}`, {
        ...u,
        active: !u.active
      });
      toast.success(u.active ? "Bloklandi" : "Faollashtirildi! 🔓");
      setTigerAction(u.active ? "Tartib o'rnatildi! 🐯🛠️" : "Foydalanuvchi yana safimizda! 🐯✨");
      setTimeout(() => setTigerAction(null), 3000);
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      load();
    } catch (error) {
      console.error("Toggle status error:", error);
    }
  };

  const remove = async () => {
    if (!delTarget) return;
    try {
      await api.delete(`/admin/users/${delTarget.id}`);
      toast.success("O'chirib tashlandi");
      setTigerAction("Tartib o'rnatildi! 🐯🛠️");
      setTimeout(() => setTigerAction(null), 3000);
      setDelTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
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

  const filtered = users.filter((u) => {
    // Filter out SUPER_ADMINs for normal admins
    if (u.role === "ADMIN") return false;

    const q = search.toLowerCase();
    return (
      (u.username || "").toLowerCase().includes(q) ||
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20 rounded-lg px-2.5 py-0.5"><Shield className="h-3 w-3 mr-1" /> Super Admin</Badge>;
      case "ADMINISTRATOR":
        return <Badge className="bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-500/20 rounded-lg px-2.5 py-0.5"><Shield className="h-3 w-3 mr-1" /> Admin</Badge>;
      case "TEACHER":
        return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20 rounded-lg px-2.5 py-0.5"><GraduationCap className="h-3 w-3 mr-1" /> O'qituvchi</Badge>;
      case "STUDENT":
        return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 rounded-lg px-2.5 py-0.5"><UserIcon className="h-3 w-3 mr-1" /> Talaba</Badge>;
      default:
        return <Badge variant="outline" className="rounded-lg">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <TigerLoader isLoading={loading} text="Foydalanuvchilarni tekshiryapman... 🐯🔎" />
      <TigerLoader isLoading={globalError} text="Backend'da nosozlik, lekin men hozir to'g'irlayman! 🐯🛠️" />
      <TigerLoader isLoading={!!tigerAction} text={tigerAction || ""} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <UsersIcon className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Barcha foydalanuvchilar</h1>
            <p className="text-sm text-muted-foreground">Tizimdagi barcha foydalanuvchilarni boshqarish</p>
          </div>
        </div>
        <Button onClick={openCreate} variant="hero">
          <Plus className="h-4 w-4 mr-1" /> Yangi qo'shish
        </Button>
      </div>

      <Card className="p-4 border-primary/10 shadow-sm">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Ism, login, email yoki rol bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-lg h-11"
          />
        </div>
      </Card>

      <Card className="overflow-hidden border-primary/10 rounded-xl shadow-sm bg-card/50 backdrop-blur-sm">
        <div className="overflow-x-auto thin-scrollbar">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
              <TableRow className="hover:bg-transparent border-primary/5">
                <TableHead className="w-[300px] font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">Foydalanuvchi</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">Rol</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">Aloqa</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">Status</TableHead>
                <TableHead className="text-right font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                    Hech kim topilmadi
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {filtered.map((u) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="group hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors border-primary/5"
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-gradient-primary/10 grid place-items-center text-primary font-bold border border-primary/10">
                            {(u.full_name || u.username)[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                              {u.full_name || u.username}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(u.role)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {u.email && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Mail size={12} className="shrink-0" />
                              <span className="truncate max-w-[150px]">{u.email}</span>
                            </div>
                          )}
                          {u.phone_number && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone size={12} className="shrink-0" />
                              <span>{u.phone_number}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => toggleStatus(u)}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                            u.active 
                              ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" 
                              : "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                          )}
                        >
                          {u.active ? (
                            <><CheckCircle2 size={12} /> Faol</>
                          ) : (
                            <><XCircle size={12} /> Bloklangan</>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
                            onClick={() => openEdit(u)}
                            title="Tahrirlash"
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-all"
                            onClick={() => setPwdTarget(u)}
                            title="Parolni yangilash"
                          >
                            <KeyRound size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-destructive hover:bg-red-50 transition-all"
                            onClick={() => setDelTarget(u)}
                            title="O'chirish"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-none shadow-2xl rounded-xl" aria-describedby="user-dialog-description">
          <DialogHeader className="p-8 pb-4 bg-slate-50 dark:bg-slate-900/50">
            <DialogTitle className="text-xl font-bold">
              {editing ? "Foydalanuvchini tahrirlash" : "Yangi foydalanuvchi qo'shish"}
            </DialogTitle>
            <DialogDescription id="user-dialog-description">
              Tizimdagi istalgan turdagi foydalanuvchini boshqarish.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <div className="p-8 pt-4 space-y-5 max-h-[70vh] overflow-y-auto thin-scrollbar">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Foydalanuvchi roli *</Label>
                <Select
                  value={form.role}
                  onValueChange={(val) => setForm({ ...form, role: val })}
                  disabled={!!editing}
                >
                  <SelectTrigger className="h-11 rounded-lg border-primary/20">
                    <SelectValue placeholder="Rolni tanlang" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-primary/10 shadow-xl">
                    <SelectItem value="STUDENT" className="rounded-lg">Talaba (Student)</SelectItem>
                    <SelectItem value="TEACHER" className="rounded-lg">O'qituvchi (Teacher)</SelectItem>
                    <SelectItem value="ADMINISTRATOR" className="rounded-lg">Administrator (Org Admin)</SelectItem>
                    <SelectItem value="ADMIN" className="rounded-lg text-red-600 font-bold">Super Admin (System)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!editing && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Login (Username) *</Label>
                    <Input
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                      placeholder="masalan: alisher_99"
                      className="rounded-lg h-11 border-primary/10 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Parol *</Label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="••••••••"
                      className="rounded-lg h-11 border-primary/10 focus:border-primary"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider opacity-70">To'liq ism (F.I.SH) *</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Eshmatov Toshmat"
                  className="rounded-lg h-11 border-primary/10 focus:border-primary"
                />
              </div>

              {/* Dynamic fields based on role */}
              <AnimatePresence mode="wait">
                {form.role === "TEACHER" && (
                  <motion.div
                    key="teacher-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Mutaxassislik (Fan nomi)</Label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-60" />
                      <Input
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        placeholder="masalan: Mathematics, IELTS, Python"
                        className="rounded-lg h-11 pl-10 border-primary/20"
                      />
                    </div>
                  </motion.div>
                )}
                {form.role === "STUDENT" && (
                  <motion.div
                    key="student-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                      <Users2 className="h-3 w-3 inline mr-1" /> Talaba yaratilgandan so'ng guruhga biriktirilishi mumkin.
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="example@mail.uz"
                    className="rounded-lg h-11 border-primary/10 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Telefon raqam</Label>
                  <Input
                    value={form.phone_number}
                    onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                    placeholder="+998 90 123 45 67"
                    className="rounded-lg h-11 border-primary/10 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="p-8 pt-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/80 backdrop-blur-md">
              <Button variant="ghost" type="button" onClick={() => setDialogOpen(false)} className="rounded-lg h-11">
                Bekor qilish
              </Button>
              <Button type="submit" disabled={submitting} variant="hero" className="rounded-lg h-11 px-8 min-w-[120px]">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editing ? "Saqlash" : "Yaratish"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={!!pwdTarget} onOpenChange={(v) => !v && (setPwdTarget(null), setNewPwd(""))}>
        <DialogContent className="max-w-sm rounded-xl" aria-describedby="pwd-reset-desc">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Parolni yangilash</DialogTitle>
            <DialogDescription id="pwd-reset-desc">
              Foydalanuvchi: <span className="font-bold text-primary">@{pwdTarget?.username}</span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); resetPassword(); }}>
            <div className="py-5 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Yangi parol</Label>
              <Input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Kamida 6 ta belgi"
                className="rounded-lg h-11 border-primary/20"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" type="button" onClick={() => setPwdTarget(null)} className="rounded-lg">
                Bekor qilish
              </Button>
              <Button type="submit" disabled={submitting} variant="hero" className="rounded-lg">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Yangilash
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!delTarget} onOpenChange={(v) => !v && setDelTarget(null)}>
        <AlertDialogContent className="rounded-xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">O'chirishni tasdiqlang</AlertDialogTitle>
            <AlertDialogDescription>
              Foydalanuvchi <span className="font-bold text-slate-900 dark:text-white">@{delTarget?.username}</span> tizimdan butunlay o'chiriladi. Ushbu amalni ortga qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="rounded-lg">Bekor qilish</AlertDialogCancel>
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
