import { useEffect, useState } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Users2 as ParentIcon,
  AtSign, // Added AtSign for telegram username
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import TigerLoader from "@/components/TigerLoader";
import { useTranslation } from "react-i18next";
import { StudentCombobox } from "@/components/StudentCombobox"; // Import StudentCombobox

interface User {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  active: boolean;
  role: string;
  subject?: string | null;
  telegramUsername?: string | null; // Added telegramUsername
  defaultPassword?: string; // Added defaultPassword for response
}

// Updated schema for Parent creation/update
const parentSchema = z.object({
  studentId: z.string().uuid("Noto'g'ri talaba IDsi").optional().nullable(), // Optional for update, can be null
  fullName: z.string().trim().min(2, "Ism juda qisqa").max(100),
  phoneNumber: z.string().trim().max(30).or(z.literal("")),
  email: z.string().trim().email("Noto'g'ri email").or(z.literal("")),
  telegramUsername: z.string().trim().optional().nullable(),
});

export default function Users() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [pwdTarget, setPwdTarget] = useState<User | null>(null);
  const [delTarget, setDelTarget] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tigerAction, setTigerAction] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Updated form state for Parent
  const [form, setForm] = useState({
    studentId: null as string | null,
    fullName: "",
    phoneNumber: "",
    email: "",
    telegramUsername: "",
    role: "PARENT", // Default role is PARENT
  });
  const [newPwd, setNewPwd] = useState("");

  // TanStack Query integration with search parameter and dynamic key
  const { data: responseData, isLoading: loading, isError: globalError, refetch } = useQuery({
    queryKey: ["admin-parents", debouncedSearch],
    queryFn: async () => {
      const response = await api.get("/admin/parents", {
        params: { query: debouncedSearch || undefined, size: 1000 }
      });
      return response.data;
    }
  });

  const users = Array.isArray(responseData) ? responseData : (responseData?.content || []);


  const resetForm = () => {
    setForm({
      studentId: null,
      fullName: "",
      phoneNumber: "",
      email: "",
      telegramUsername: "",
      role: "PARENT",
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
      studentId: null, // Student ID is not directly editable for existing parent
      fullName: u.full_name || "",
      phoneNumber: u.phone_number || "",
      email: u.email || "",
      telegramUsername: u.telegramUsername || "",
      role: u.role,
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    const parsed = parentSchema.safeParse({
      studentId: form.studentId,
      fullName: form.fullName,
      phoneNumber: form.phoneNumber,
      email: form.email,
      telegramUsername: form.telegramUsername,
    });

    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        studentId: form.studentId,
        fullName: form.fullName,
        phoneNumber: form.phoneNumber.trim().replaceAll(' ', ''),
        email: form.email,
        telegramUsername: form.telegramUsername ? form.telegramUsername.replace(/^@/, "") : null, // Clean telegram username
      };

      let response;
      if (editing) {
        response = await api.put(`/admin/parents/${editing.id}`, payload);
        toast.success("Ota-ona ma'lumotlari yangilandi! ✨");
      } else {
        response = await api.post('/admin/parents', payload);
        toast.success(`Ota-ona muvaffaqiyatli qo'shildi! Parol: ${response.data.defaultPassword} 🚀`);
      }

      setDialogOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      console.error("Submit error:", error);
      toast.error(error.response?.data?.message || "Xatolik yuz berdi!");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (u: User) => {
    // This function is not directly used for parents as per new requirements
    // but keeping it for other user types if this component is reused.
    try {
      await api.put(`/admin/users/${u.id}`, {
        ...u,
        active: !u.active
      });
      toast.success(u.active ? "Bloklandi" : "Faollashtirildi! 🔓");
      setTigerAction(u.active ? "Tartib o'rnatildi! 🐯🛠️" : "Foydalanuvchi yana safimizda! 🐯✨");
      setTimeout(() => setTigerAction(null), 3000);
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      refetch();
    } catch (error) {
      console.error("Toggle status error:", error);
    }
  };

  const remove = async () => {
    if (!delTarget) return;
    try {
      await api.delete(`/admin/parents/${delTarget.id}`);
      toast.success("Ota-ona o'chirib tashlandi");
      setTigerAction("Tartib o'rnatildi! 🐯🛠️");
      setTimeout(() => setTigerAction(null), 3000);
      setDelTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      refetch();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(error.response?.data?.message || "Xatolik yuz berdi!");
    }
  };

  const resetPassword = async () => {
    // This function is not used for parents as password is auto-generated
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
    const q = debouncedSearch.toLowerCase();
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
      case "PARENT":
        return <Badge className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-500/20 rounded-lg px-2.5 py-0.5"><ParentIcon className="h-3 w-3 mr-1" /> Ota-ona</Badge>; // New Parent Badge
      default:
        return <Badge variant="outline" className="rounded-lg">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <TigerLoader isLoading={loading} text="Ota-onalarni tekshiryapman... 🐯🔎" />
      <TigerLoader isLoading={globalError} text="Backend'da nosozlik, lekin men hozir to'g'irlayman! 🐯🛠️" />
      <TigerLoader isLoading={!!tigerAction} text={tigerAction || ""} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <ParentIcon className="h-6 w-6 text-primary-foreground" /> {/* Changed icon */}
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Ota-onalar boshqaruvi</h1> {/* Changed title */}
            <p className="text-sm text-muted-foreground">Tizimdagi ota-onalarni boshqarish</p> {/* Changed description */}
          </div>
        </div>
        <Button onClick={openCreate} variant="hero">
          <Plus className="h-4 w-4 mr-1" /> Yangi ota-ona qo'shish
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
                <TableHead className="w-[300px] font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">Ota-ona</TableHead>
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
                          {u.telegramUsername && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <AtSign size={12} className="shrink-0" />
                              <span>@{u.telegramUsername}</span>
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
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-all"
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
              {editing ? "Ota-onani tahrirlash" : "Yangi ota-ona qo'shish"}
            </DialogTitle>
            <DialogDescription id="user-dialog-description">
              Ota-ona ma'lumotlarini boshqarish.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <div className="p-8 pt-4 space-y-5 max-h-[70vh] overflow-y-auto thin-scrollbar">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Foydalanuvchi roli *</Label>
                <Select
                  value={form.role}
                  onValueChange={(val) => setForm({ ...form, role: val as "PARENT" })} // Cast to "PARENT"
                  disabled // Role is always PARENT for this view
                >
                  <SelectTrigger className="h-11 rounded-lg border-primary/20">
                    <SelectValue placeholder="Rolni tanlang" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-primary/10 shadow-xl">
                    <SelectItem value="PARENT" className="rounded-lg">Ota-ona (Parent)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Student Combobox for linking parent to student */}
              {!editing && ( // Only show for creation
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Farzandni tanlang *</Label>
                  <StudentCombobox
                    selectedStudentId={form.studentId}
                    onSelectStudent={(id) => setForm({ ...form, studentId: id })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider opacity-70">To'liq ism (F.I.SH) *</Label>
                <Input
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Eshmatov Toshmat"
                  className="rounded-lg h-11 border-primary/10 focus:border-primary"
                />
              </div>

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
                    value={form.phoneNumber}
                    onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                    placeholder="+998 90 123 45 67"
                    className="rounded-lg h-11 border-primary/10 focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Telegram username</Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary opacity-60" />
                  <Input
                    value={form.telegramUsername}
                    onChange={(e) => setForm({ ...form, telegramUsername: e.target.value })}
                    placeholder="masalan: @username"
                    className="rounded-lg h-11 pl-10 border-primary/10 focus:border-primary"
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
      <Dialog open={!!pwdTarget} onOpenChange={(v) => { if (!v) { setPwdTarget(null); setNewPwd(""); } }}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-xl" aria-describedby="pwd-dialog-description">
          <DialogHeader className="p-8 pb-4 bg-slate-50 dark:bg-slate-900/50">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-500" />
              Parolni yangilash
            </DialogTitle>
            <DialogDescription id="pwd-dialog-description">
              Foydalanuvchi <span className="font-bold text-slate-900 dark:text-white">@{pwdTarget?.username}</span> uchun yangi parol o'rnating.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); resetPassword(); }}>
            <div className="p-8 pt-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Yangi parol *</Label>
                <Input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Kamida 6 ta belgi"
                  className="rounded-lg h-11 border-primary/10 focus:border-primary"
                  required
                />
              </div>
            </div>

            <DialogFooter className="p-8 pt-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/80 backdrop-blur-md">
              <Button variant="ghost" type="button" onClick={() => { setPwdTarget(null); setNewPwd(""); }} className="rounded-lg h-11">
                Bekor qilish
              </Button>
              <Button type="submit" disabled={submitting || newPwd.length < 6} variant="hero" className="rounded-lg h-11 px-8 min-w-[120px]">
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
              Ota-ona <span className="font-bold text-slate-900 dark:text-white">@{delTarget?.username}</span> tizimdan butunlay o'chiriladi. Ushbu amalni ortga qaytarib bo'lmaydi.
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
