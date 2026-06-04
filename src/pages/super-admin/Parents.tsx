import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
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
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Heart, Plus, Search, Trash2, Users,
  Phone, Mail, CheckCircle2, XCircle, UserPlus,
  Pencil, Ban, Unlock, Loader2, KeyRound, ChevronDown, Check,
  Link as LinkIcon, Shield, ShieldAlert, Gift, Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import TigerPlayer from "@/components/TigerPlayer";
import { formatDistanceToNow } from "date-fns";
import { uz } from "date-fns/locale";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface Child {
  id: string;
  fullName?: string;
  full_name?: string;
  username: string;
}

interface Parent {
  id: string;
  fullName?: string;
  full_name?: string;
  username: string;
  email: string;
  phoneNumber?: string;
  phone_number?: string;
  active: boolean;
  createdAt?: any;
  created_at?: any;
  childrenNames?: string[];
  children_names?: string[];
  children?: Child[];
}

interface ParentsPage {
  content: Parent[];
  totalPages: number;
  totalElements: number;
}

const safeDate = (d: any) => {
  if (!d) return "—";
  try {
    const dt = Array.isArray(d)
      ? new Date(d[0], d[1] - 1, d[2], d[3] || 0, d[4] || 0)
      : new Date(d);
    return isNaN(dt.getTime()) ? "—" : formatDistanceToNow(dt, { addSuffix: true, locale: uz });
  } catch { return "—"; }
};

export default function ParentsPage() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Parent | null>(null);
  
  // Link Child Modal State
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkingParent, setLinkingParent] = useState<Parent | null>(null);
  
  // Custom Reset Password & Delete State
  const [delTarget, setDelTarget] = useState<Parent | null>(null);
  const [pwdTarget, setPwdTarget] = useState<Parent | null>(null);
  const [newPwd, setNewPwd] = useState("");

  const [form, setForm] = useState({
    fullName: "", phoneOrUsername: "", email: "",
    password: "", studentId: "", relationship: "OTA-ONA",
  });
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupSearchOpen, setGroupSearchOpen] = useState(false);
  const [studentSearchOpen, setStudentSearchOpen] = useState(false);
  const [grantCoinsOpen, setGrantCoinsOpen] = useState(false);
  const [grantCoinsTarget, setGrantCoinsTarget] = useState<Parent | null>(null);
  const [grantAmount, setGrantAmount] = useState(500);
  const [grantReason, setGrantReason] = useState("Ota-ona faolligi");
  const [grantComment, setGrantComment] = useState("");

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: any) => api.post(`/admin/users/${id}/password`, { password }),
    onSuccess: () => {
      toast.success("Parol muvaffaqiyatli yangilandi! 🔐");
      setPwdTarget(null);
      setNewPwd("");
    },
    onError: () => toast.error("Parolni yangilashda xatolik"),
  });

  // Fetch groups
  const { data: groupsData } = useQuery({
    queryKey: ["groups-for-parents"],
    queryFn: async () => {
      const endpoint = role === "teacher" ? "/teacher/groups" : "/admin/groups";
      const { data } = await api.get(endpoint, { params: { size: 1000 } });
      return data.content || data;
    },
  });
  const groups = Array.isArray(groupsData) ? groupsData : [];

  // Fetch students for selection - now depends on selectedGroupId
  const { data: studentsData } = useQuery({
    queryKey: ["students-for-parents", selectedGroupId],
    queryFn: async () => {
      const { data } = await api.get("/admin/users", { 
        params: { role: "STUDENT", groupId: selectedGroupId || undefined } 
      });
      return data; // List<UserSummaryDto>
    },
  });
  const students = Array.isArray(studentsData) ? studentsData : [];

  const { data, isLoading, isError } = useQuery<ParentsPage>({
    queryKey: ["parents", page, search],
    queryFn: async () => {
      const { data } = await api.get("/admin/parents", {
        params: { page, size: 20, query: search || undefined },
      });
      return data;
    },
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => api.post("/admin/parents", payload),
    onSuccess: (res) => {
      const createdParent = res.data;
      const pwd = createdParent?.card_number || createdParent?.cardNumber;
      if (pwd) {
        toast.success(
          <div className="flex flex-col gap-1 text-slate-800 dark:text-slate-200">
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Ota-ona muvaffaqiyatli qo'shildi!</span>
            <div className="text-xs space-y-0.5 mt-1">
              <p>Login: <code className="bg-slate-100 dark:bg-white/10 px-1 py-0.5 rounded font-mono font-bold text-primary select-all">@{createdParent.username}</code></p>
              <p>Parol: <code className="bg-emerald-50 dark:bg-emerald-950/20 px-1 py-0.5 rounded font-mono font-bold text-emerald-600 dark:text-emerald-400 select-all">{pwd}</code></p>
            </div>
          </div>,
          { duration: 15000 }
        );
      } else {
        toast.success("Ota-ona muvaffaqiyatli qo'shildi!");
      }
      qc.invalidateQueries({ queryKey: ["parents"] });
      qc.invalidateQueries({ queryKey: ["super-admin-dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      setOpen(false);
      setForm({ fullName: "", phoneOrUsername: "", email: "", password: "", studentId: "", relationship: "OTA-ONA" });
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  });

  const editMutation = useMutation({
    mutationFn: (payload: any) => api.put(`/admin/parents/${payload.id}`, payload),
    onSuccess: () => {
      toast.success("Ma'lumotlar yangilandi!");
      qc.invalidateQueries({ queryKey: ["parents"] });
      setOpen(false);
      setEditing(null);
    },
    onError: () => toast.error("Yangilab bo'lmadi"),
  });

  const linkChildMutation = useMutation({
    mutationFn: ({ parentId, studentId }: { parentId: string, studentId: string }) => 
      api.post(`/admin/parents/${parentId}/link-child/${studentId}`),
    onSuccess: () => {
      toast.success("Farzand muvaffaqiyatli biriktirildi!");
      qc.invalidateQueries({ queryKey: ["parents"] });
      setLinkOpen(false);
      setLinkingParent(null);
      setForm((prev) => ({ ...prev, studentId: "" }));
    },
    onError: (e: any) => toast.error(e.response?.data?.message || "Biriktirib bo'lmadi"),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string, active: boolean }) => 
      api.patch(`/admin/users/${id}/active`, { active }),
    onSuccess: (_, variables) => {
      toast.success(variables.active ? "Faollashtirildi" : "Bloklandi");
      qc.invalidateQueries({ queryKey: ["parents"] });
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/parents/${id}`),
    onSuccess: () => {
      toast.success("O'chirildi");
      qc.invalidateQueries({ queryKey: ["parents"] });
      qc.invalidateQueries({ queryKey: ["super-admin-dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
    },
    onError: () => toast.error("O'chirib bo'lmadi"),
  });

  const grantCoinsMutation = useMutation({
    mutationFn: async (payload: { studentId: string, amount: number, reason: string, comment?: string }) => {
      return api.post("/admin/coins/grant", {
        studentId: payload.studentId,
        amount: Number(payload.amount),
        reason: payload.reason || "Ota-ona faolligi",
        comment: payload.comment || ""
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parents"] });
      qc.invalidateQueries({ queryKey: ["super-admin-dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      
      // Celebration UX: Confetti
      import("canvas-confetti").then(({ default: confetti }) => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FF8C00']
        });
      });

      toast.success("Coinlar muvaffaqiyatli yuborildi! 🪙✨");
      setGrantCoinsOpen(false);
      setGrantComment("");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Xatolik yuz berdi");
    },
  });

  const openEdit = (p: Parent) => {
    setEditing(p);
    setForm({
      fullName: p.fullName || p.full_name || "",
      phoneOrUsername: p.phoneNumber || p.phone_number || p.username || "",
      email: p.email || "",
      password: "",
      studentId: "",
      relationship: "OTA-ONA"
    });
    setOpen(true);
  };

  const openLink = (p: Parent) => {
    setLinkingParent(p);
    setForm((prev) => ({ ...prev, studentId: "" }));
    setLinkOpen(true);
  };

  const parents = data?.content ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600
                          grid place-items-center shadow-lg shadow-pink-500/25">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Ota-onalar
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Jami {data?.totalElements ?? 0} ta ota-ona ro'yxatda
            </p>
          </div>
        </div>
        <Button onClick={() => { setEditing(null); setForm({ fullName: "", phoneOrUsername: "", email: "", password: "", studentId: "", relationship: "OTA-ONA" }); setOpen(true); }}
          className="gap-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600
                     hover:to-rose-700 text-white border-0 shadow-lg shadow-pink-500/25">
          <UserPlus className="h-4 w-4" /> Yangi ota-ona
        </Button>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Ism, telefon yoki email bo'yicha qidirish..."
          className="pl-10 h-11 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10
                     rounded-xl shadow-sm text-slate-900 dark:text-white"
        />
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="animate-pulse">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-200 dark:border-white/5">
                  <TableHead><Skeleton className="h-4 w-28" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i} className="border-slate-100 dark:border-white/5">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-8 w-8 rounded-lg" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-16 w-16 rounded-2xl bg-rose-500/10 grid place-items-center">
              <XCircle className="h-8 w-8 text-rose-500" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Ma'lumotlarni yuklashda xatolik
            </p>
          </div>
        ) : parents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Users className="h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">Ota-ona topilmadi</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-200 dark:border-white/5">
                <TableHead className="font-bold text-slate-900 dark:text-slate-200">F.I.O</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-200">Farzandlari</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-200">Aloqa</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-200">Holati</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-200">Qo'shilgan</TableHead>
                <TableHead className="text-right font-bold text-slate-900 dark:text-slate-200">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parents.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/3"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600
                                      grid place-items-center text-white font-bold text-sm shrink-0">
                        {((p.fullName || p.full_name || p.username || "?")[0]).toUpperCase()}
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-900 dark:text-white text-sm">
                          {p.fullName || p.full_name || "—"}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono select-all font-medium">@{p.username}</span>
                          {p.children && p.children.length > 0 && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-1 py-0.2 rounded font-mono select-all font-semibold">
                              Parol: {p.children[0].id.substring(0, 8)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {((p.childrenNames || p.children_names)?.length || 0) > 0
                        ? (p.childrenNames || p.children_names)!.map((name, idx) => (
                          <Badge key={idx} variant="secondary"
                            className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                            {name}
                          </Badge>
                        ))
                        : <span className="text-xs text-slate-400">Bog'lanmagan</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {(p.phoneNumber || p.phone_number) && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <Phone className="h-3 w-3" /> {p.phoneNumber || p.phone_number}
                        </div>
                      )}
                      {p.email && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-500">
                          <Mail className="h-3 w-3" /> {p.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.active ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Faol</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <XCircle className="h-4 w-4 text-slate-400" />
                        <span className="text-xs font-medium text-slate-500">Nofaol</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {safeDate(p.createdAt || p.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost" size="icon"
                        className={p.active ? "h-8 w-8 text-amber-500" : "h-8 w-8 text-emerald-500"}
                        onClick={() => toggleActiveMutation.mutate({ id: p.id, active: !p.active })}
                        disabled={toggleActiveMutation.isPending}
                      >
                        {toggleActiveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (p.active ? <Ban className="h-4 w-4" /> : <Unlock className="h-4 w-4" />)}
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 hover:text-amber-700"
                        onClick={() => {
                          setGrantCoinsTarget(p);
                          setGrantCoinsOpen(true);
                        }}
                        title="Coin hadya qilish"
                      >
                        <Gift className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => openLink(p)} title="Farzand biriktirish">
                        <LinkIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-primary"
                        onClick={() => openEdit(p)}
                        title="Tahrirlash"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-amber-500 hover:text-amber-700 hover:bg-amber-500/10"
                        onClick={() => setPwdTarget(p)}
                        title="Parolni yangilash"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10"
                        onClick={() => setDelTarget(p)}
                        title="O'chirish"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {(data?.totalPages ?? 0) > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-white/5">
            <p className="text-xs text-slate-500">Sahifa {page + 1} / {data?.totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="rounded-xl border-slate-200 dark:border-white/10">
                Oldingi
              </Button>
              <Button variant="outline" size="sm" disabled={page >= (data?.totalPages ?? 1) - 1}
                onClick={() => setPage(p => p + 1)}
                className="rounded-xl border-slate-200 dark:border-white/10">
                Keyingi
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600
                              grid place-items-center">
                <Plus className="h-4 w-4 text-white" />
              </div>
              {editing ? "Ota-ona ma'lumotlarini tahrirlash" : "Yangi ota-ona qo'shish"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2 max-h-[65vh] overflow-y-auto pr-2 thin-scrollbar">
            {[
              { id: "fullName", label: "To'liq ismi", placeholder: "Abdullayev Jasur", type: "text" },
              { id: "phoneOrUsername", label: "Telefon / Username *", placeholder: "+998901234567", type: "text" },
              { id: "email", label: "Email (ixtiyoriy)", placeholder: "parent@example.com", type: "email" },
              ...(!editing ? [
                { id: "password", label: "Parol (bo'sh qolsa: Parent@123)", placeholder: "••••••••", type: "password" },
              ] : [])
            ].map(({ id, label, placeholder, type }) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {label}
                </Label>
                <Input
                  id={id}
                  type={type}
                  placeholder={placeholder}
                  value={(form as any)[id]}
                  onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
                  className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10
                             text-slate-900 dark:text-white rounded-xl h-10"
                />
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}
              className="border-slate-200 dark:border-white/10">
              Bekor
            </Button>
            <Button
              disabled={!form.phoneOrUsername || createMutation.isPending || editMutation.isPending}
              onClick={() => editing ? editMutation.mutate({ ...form, id: editing.id, username: form.phoneOrUsername }) : createMutation.mutate(form)}
              className="bg-gradient-to-r from-pink-500 to-rose-600 text-white border-0">
              {createMutation.isPending || editMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Child Modal */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 grid place-items-center">
                <LinkIcon className="h-4 w-4 text-white" />
              </div>
              Farzand biriktirish
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Ota-ona
              </Label>
              <Input disabled value={linkingParent?.fullName || linkingParent?.username || ""} className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl h-10" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Farzandining guruhi (qidirish uchun)
              </Label>
              <Popover open={groupSearchOpen} onOpenChange={setGroupSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl h-10">
                    {selectedGroupId ? groups.find((g) => g.id === selectedGroupId)?.name : "Barcha guruhlar"}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Guruh ismini yozing..." />
                    <CommandList>
                      <CommandEmpty>Guruh topilmadi.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="all" onSelect={() => { setSelectedGroupId(null); setGroupSearchOpen(false); setForm({ ...form, studentId: "" }); }}>
                          <Check className={cn("mr-2 h-4 w-4", !selectedGroupId ? "opacity-100" : "opacity-0")} /> Barcha guruhlar
                        </CommandItem>
                        {groups.map((g) => (
                          <CommandItem key={g.id} value={g.name} onSelect={() => { setSelectedGroupId(g.id); setGroupSearchOpen(false); setForm({ ...form, studentId: "" }); }}>
                            <Check className={cn("mr-2 h-4 w-4", selectedGroupId === g.id ? "opacity-100" : "opacity-0")} /> {g.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Talabani tanlang
              </Label>
              <Popover open={studentSearchOpen} onOpenChange={setStudentSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between font-normal bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl h-10">
                    {form.studentId ? (
                      (() => {
                        const s = students.find((st) => st.id === form.studentId);
                        return s ? (s.full_name || s.fullName || s.username) : "Talabani qidirish...";
                      })()
                    ) : "Talabani qidirish..."}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Talaba ismini yozing..." />
                    <CommandList>
                      <CommandEmpty>Talaba topilmadi.</CommandEmpty>
                      <CommandGroup>
                        {students.map((s) => {
                          const studentName = s.full_name || s.fullName || s.username;
                          return (
                            <CommandItem 
                              key={s.id} 
                              value={studentName} 
                              onSelect={() => { 
                                setForm({ ...form, studentId: s.id }); 
                                setStudentSearchOpen(false); 
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", form.studentId === s.id ? "opacity-100" : "opacity-0")} /> 
                              {studentName}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLinkOpen(false)}>Bekor qilish</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              disabled={!form.studentId || linkChildMutation.isPending}
              onClick={() => {
                if (linkingParent && form.studentId) {
                  linkChildMutation.mutate({ parentId: linkingParent.id, studentId: form.studentId });
                }
              }}
            >
              Biriktirish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={!!pwdTarget} onOpenChange={(v) => { if (!v) { setPwdTarget(null); setNewPwd(""); } }}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10" aria-describedby="parents-pwd-desc">
          <DialogHeader className="p-8 pb-4 bg-slate-50 dark:bg-slate-900/50">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <KeyRound className="h-5 w-5 text-amber-500" />
              Parolni yangilash
            </DialogTitle>
            <DialogDescription id="parents-pwd-desc">
              Foydalanuvchi <span className="font-bold text-slate-900 dark:text-white">@{pwdTarget?.username}</span> uchun yangi parol o'rnating.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); if (pwdTarget) resetPasswordMutation.mutate({ id: pwdTarget.id, password: newPwd }); }}>
            <div className="p-8 pt-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Yangi parol *</Label>
                <Input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Kamida 6 ta belgi"
                  className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl h-10"
                  required
                />
              </div>
            </div>

            <DialogFooter className="p-8 pt-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/80 backdrop-blur-md">
              <Button variant="ghost" type="button" onClick={() => { setPwdTarget(null); setNewPwd(""); }} className="rounded-xl">
                Bekor qilish
              </Button>
              <Button type="submit" disabled={resetPasswordMutation.isPending || newPwd.length < 6} className="bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl px-8 min-w-[120px]">
                {resetPasswordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Yangilash
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Grant Coins Dialog */}
      <Dialog open={grantCoinsOpen} onOpenChange={setGrantCoinsOpen}>
        <DialogContent className="max-w-md" aria-describedby="grant-coins-parent-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <span>Coin hadya qilish</span>
            </DialogTitle>
            <DialogDescription id="grant-coins-parent-desc">
              Ota-onaga faolligi uchun coin yuborish.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <Avatar className="h-12 w-12 border-2 border-amber-500/20">
                <AvatarFallback className="bg-amber-500 text-white font-bold">
                  {(grantCoinsTarget?.fullName || grantCoinsTarget?.full_name || grantCoinsTarget?.username || "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-amber-900">{grantCoinsTarget?.fullName || grantCoinsTarget?.full_name || grantCoinsTarget?.username}</p>
                <p className="text-xs text-amber-700/70">@{grantCoinsTarget?.username}</p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Coin miqdori</Label>
              <Input 
                type="number" 
                value={grantAmount} 
                onChange={(e) => setGrantAmount(Number(e.target.value))} 
                className="text-lg font-bold text-amber-600"
              />
            </div>

            <div className="grid gap-2">
              <Label>Sabab</Label>
              <Select value={grantReason} onValueChange={setReason => setGrantReason(setReason)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IELTS/SAT yuqori ball">IELTS/SAT yuqori ball</SelectItem>
                  <SelectItem value="Milliy sertifikat">Milliy sertifikat</SelectItem>
                  <SelectItem value="Olimpiada g'olibi">Olimpiada g'olibi</SelectItem>
                  <SelectItem value="Darsdagi faollik">Darsdagi faollik</SelectItem>
                  <SelectItem value="5+ a'lo baho">5+ a'lo baho</SelectItem>
                  <SelectItem value="Ota-ona faolligi">Ota-ona faolligi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Izoh (Comment)</Label>
              <Input 
                value={grantComment} 
                onChange={(e) => setGrantComment(e.target.value)} 
                placeholder="Qisqacha izoh yozing..." 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGrantCoinsOpen(false)}>Bekor</Button>
            <Button 
              variant="hero" 
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => {
                if (grantCoinsTarget) {
                  grantCoinsMutation.mutate({
                    studentId: grantCoinsTarget.id,
                    amount: grantAmount,
                    reason: grantReason,
                    comment: grantComment
                  });
                }
              }}
              disabled={grantCoinsMutation.isPending}
            >
              {grantCoinsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Coinlarni yuborish 🪙
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={!!delTarget} onOpenChange={(v) => !v && setDelTarget(null)}>
        <AlertDialogContent className="rounded-xl border-none shadow-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">O'chirishni tasdiqlang</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              Ota-ona <span className="font-bold text-slate-900 dark:text-white">@{delTarget?.username}</span> tizimdan butunlay o'chiriladi. Ushbu amalni ortga qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300">Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (delTarget) deleteMutation.mutate(delTarget.id); setDelTarget(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl px-6"
            >
              O'chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

