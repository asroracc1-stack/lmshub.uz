import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/lib/axios";
import { Search, Plus, Pencil, Trash2, KeyRound, Loader2, UserCircle, Phone, Mail, BookOpen, Send, Copy, Hash, Check, ChevronsUpDown, ChevronDown, Ban, Unlock, Gift, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  parent_telegram_username?: string | null;
  student_id?: string | null;
  organization_id?: string | null;
}

interface Props {
  role: "teacher" | "student" | "administrator" | "parent";
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
  parent_telegram_username: z.string().trim().max(100).optional(),
  student_id: z.string().optional(),
});

export default function MembersList({
  role, title, description, canManage }: Props) {
  const { t } = useTranslation();
  const { profile, role: currentUserRole } = useAuth();
  const queryClient = useQueryClient();
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
    parent_telegram_username: "",
    student_id: "",
    organization_id: profile?.organization_id || "",
    group_id: "",
  });
  const [newPwd, setNewPwd] = useState("");
  const [groupSearchOpen, setGroupSearchOpen] = useState(false);
  const [studentSearchOpen, setStudentSearchOpen] = useState(false);
  const [grantCoinsOpen, setGrantCoinsOpen] = useState(false);
  const [grantCoinsTarget, setGrantCoinsTarget] = useState<Member | null>(null);
  const [grantAmount, setGrantAmount] = useState(500);
  const [grantReason, setGrantReason] = useState("Darsdagi faollik");
  const [grantComment, setGrantComment] = useState("");

  useEffect(() => {
    if (profile?.organization_id && !form.organization_id) {
      setForm((f) => ({ ...f, organization_id: profile.organization_id || "" }));
    }
  }, [profile]);

  const { data: membersData = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["members-list", role, profile?.organization_id],
    queryFn: async () => {
      const { data } = await api.get('/admin/users/by-role/' + role.toUpperCase(), {
        params: { size: 1000, organizationId: profile?.organization_id || undefined }
      });
      const content = data?.content || data;
      return Array.isArray(content) ? content : [];
    },
    placeholderData: (previousData) => previousData,
  });

  const { data: groupsData = [] } = useQuery({
    queryKey: ["groups-list", profile?.organization_id, currentUserRole],
    queryFn: async () => {
      const endpoint = currentUserRole === "TEACHER" ? '/teacher/groups' : '/admin/groups';
      const { data } = await api.get(endpoint, {
        params: { size: 1000, organizationId: profile?.organization_id || undefined }
      });
      const content = data?.content || data;
      return Array.isArray(content) ? content : [];
    },
    placeholderData: (previousData) => previousData,
  });

  const { data: studentsList = [] } = useQuery({
    queryKey: ["students-list", profile?.organization_id],
    queryFn: async () => {
      if (role !== "parent") return [];
      const { data } = await api.get('/admin/users/by-role/STUDENT', {
        params: { size: 1000, organizationId: profile?.organization_id || undefined }
      });
      const content = data?.content || data;
      return Array.isArray(content) ? content.map((s: any) => ({ id: s.id, fullName: s.full_name || s.username, username: s.username })) : [];
    },
    placeholderData: (previousData) => previousData,
  });

  const members = membersData;
  const groups = groupsData;
  const loading = loadingMembers;

  const resetForm = () => {
    setForm({ 
      username: "", 
      password: "", 
      full_name: "", 
      email: "", 
      phone_number: "",
      subject: "",
      parent_telegram_username: "",
      student_id: "",
      organization_id: profile?.organization_id || "",
      group_id: "",
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
      parent_telegram_username: m.parent_telegram_username || "",
      student_id: m.student_id || "",
      organization_id: m.organization_id || profile?.organization_id || "",
      group_id: (m as any).group_id || "",
    });
    setDialogOpen(true);
  };

  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editing) {
        return api.put(`/admin/users/${editing.id}`, payload);
      } else if (role === "parent") {
        return api.post('/admin/users/parents/auto-create', {
          studentId: form.student_id,
          phoneNumber: form.phone_number,
          telegramUsername: form.parent_telegram_username
        });
      } else {
        return api.post('/admin/users', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      toast.success(editing ? "Ma'lumotlar yangilandi! ✨" : "Yangi a'zo qo'shildi! 🚀");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Xatolik yuz berdi");
    },
  });

  const submit = async () => {
    const isParent = role === "parent";
    const parsed = schema.safeParse({
      ...form,
      password: (editing || isParent) ? "SystemAutoGenerated123!" : form.password,
      username: (editing || isParent) ? "auto_gen_placeholder" : form.username,
    });
    
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    if (isParent && !editing && !form.student_id) {
      toast.error(t("dynamic.memberslist.talabani_tanlash_shart"));
      return;
    }

    const payload = {
      ...form,
      username: form.username.toLowerCase(),
      role: role.toUpperCase(),
      phone_number: form.phone_number.trim().replaceAll(' ', ''),
      organizationId: form.organization_id || profile?.organization_id || null,
      organization_id: form.organization_id || profile?.organization_id || null,
      groupId: form.group_id || null,
      group_id: form.group_id || null,
    };

    submitMutation.mutate(payload);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      toast.success(t("dynamic.memberslist.o_chirib_tashlandi"));
      setDelTarget(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Xatolik yuz berdi");
    },
  });

  const remove = async () => {
    if (!delTarget) return;
    deleteMutation.mutate(delTarget.id);
  };

  const resetPwdMutation = useMutation({
    mutationFn: async ({ id, pass }: { id: string, pass: string }) => {
      return api.post(`/admin/users/${id}/password`, { password: pass });
    },
    onSuccess: () => {
      toast.success("Parol yangilandi! 🔐");
      setPwdTarget(null);
      setNewPwd("");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || "Parolni yangilashda xatolik";
      toast.error(msg);
      console.error("RESET PWD ERROR:", error.response?.data || error);
    },
  });

  const resetPassword = async () => {
    if (!pwdTarget || newPwd.length < 6) {
      toast.error(t("dynamic.memberslist.parol_kamida_6_ta_belgi_bo_lishi_kerak"));
      return;
    }
    resetPwdMutation.mutate({ id: pwdTarget.id, pass: newPwd });
  };

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string, active: boolean }) => {
      return api.patch(`/admin/users/${id}/active`, { active });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["members-list"] });
      toast.success(variables.active ? "Faollashtirildi" : "Bloklandi");
    },
    onError: () => {
      toast.error(t("dynamic.parents.xatolik_yuz_berdi"));
    },
  });

  const toggleActive = async (m: Member) => {
    toggleActiveMutation.mutate({ id: m.id, active: !m.is_active });
  };

  const grantCoinsMutation = useMutation({
    mutationFn: async (payload: { student_id: string, amount: number, reason: string, comment?: string }) => {
      return api.post("/admin/coins/grant", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      
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
      const data = error.response?.data;
      if (data?.errors && typeof data.errors === 'object') {
        const errorMessages = Object.values(data.errors).join(", ");
        toast.error(errorMessages);
      } else {
        toast.error(data?.message || "Xatolik yuz berdi");
      }
    },
  });

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
    <div className="space-y-6 w-full">
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
        <div className="border border-border/50 rounded-2xl overflow-hidden glass shadow-xl animate-pulse">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
              <TableRow>
                <TableHead><Skeleton className="h-4 w-28" /></TableHead>
                {role === "student" ? (
                  <>
                    <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                  </>
                ) : (
                  <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                )}
                <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                <TableHead className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i} className="border-b border-border/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-xl" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </TableCell>
                  {role === "student" ? (
                    <>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12 rounded-full" /></TableCell>
                    </>
                  ) : (
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  )}
                  <TableCell>
                    <div className="space-y-1">
                      <Skeleton className="h-3.5 w-36" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
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
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="p-12 text-center text-muted-foreground bg-slate-50/50 dark:bg-slate-900/50 border-dashed rounded-2xl">
            {members.length === 0 ? "Hech kim topilmadi" : "Qidiruv natijasi yo'q"}
          </Card>
        </motion.div>
      ) : (
        <div className="border border-border/50 rounded-2xl overflow-hidden glass shadow-xl">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-800 dark:text-slate-200">{t("dynamic.usersmanager.foydalanuvchi")}</TableHead>
                  {role === "student" ? (
                    <>
                      <TableHead className="font-semibold text-slate-800 dark:text-slate-200">{t("dynamic.memberslist.guruh")}</TableHead>
                      <TableHead className="font-semibold text-slate-800 dark:text-slate-200">{t("dynamic.memberslist.coinlar")}</TableHead>
                    </>
                  ) : (
                    <TableHead className="font-semibold text-slate-800 dark:text-slate-200">{t("dynamic.memberslist.fanlar_subject")}</TableHead>
                  )}
                  <TableHead className="font-semibold text-slate-800 dark:text-slate-200">{t("dynamic.memberslist.aloqa_ma_lumotlari")}</TableHead>
                  <TableHead className="font-semibold text-slate-800 dark:text-slate-200">{t("dynamic.usersmanager.holati")}</TableHead>
                  <TableHead className="text-right font-semibold text-slate-800 dark:text-slate-200">{t("dynamic.usersmanager.amallar")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {filtered.map((m) => {
                    const initials = (m.full_name || m.username)
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <TableRow 
                        key={m.id} 
                        className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors border-b border-border/40 group/row"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 rounded-xl border border-primary/10 shadow-sm group-hover/row:border-primary/30 transition-colors">
                              <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold rounded-xl text-xs">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white group-hover/row:text-primary transition-colors text-sm">
                                {m.full_name || m.username}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono">@{m.username}</p>
                            </div>
                          </div>
                        </TableCell>

                        {role === "student" ? (
                          <>
                            <TableCell>
                              {(() => {
                                // Match student group name from global list
                                const groupName = groups.find((g: any) => g.id === m.group_id || g.id === (m as any).groupId)?.name;
                                return groupName ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                    {groupName}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">— Guruhsiz —</span>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-900/30 animate-pulse-slow">
                                  🪙
                                </span>
                                <span className="font-bold text-sm text-amber-600 dark:text-amber-400">
                                  {((m as any).coins || (m as any).coinsBalance || 0).toLocaleString()}
                                </span>
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          <TableCell>
                            {m.subject ? (
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {m.subject.split(",").map((sub, idx) => (
                                  <span 
                                    key={idx} 
                                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-pink-500/10 text-pink-600 border border-pink-500/20"
                                  >
                                    {sub.trim()}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">— Fan biriktirilmagan —</span>
                            )}
                          </TableCell>
                        )}

                        <TableCell>
                          <div className="space-y-0.5 text-xs text-muted-foreground">
                            {m.email && (
                              <p className="flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                <span className="truncate max-w-[160px]">{m.email}</span>
                              </p>
                            )}
                            {m.phone_number && (
                              <p className="flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                <span>{m.phone_number}</span>
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          {m.is_active !== false ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 border border-purple-500/20">
                              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-ping-slow mr-1" />{t("dynamic.usersmanager.faol")}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-destructive/10 text-destructive border border-destructive/20">{t("dynamic.usersmanager.bloklangan")}</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            {canManage && role === "student" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-500/15"
                                onClick={() => {
                                  setGrantCoinsTarget(m);
                                  setGrantCoinsOpen(true);
                                }}
                                title={t("dynamic.usersmanager.coin_hadya_qilish")}
                              >
                                <Gift className="h-4 w-4" />
                              </Button>
                            )}
                            {canManage && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-500/15"
                                  onClick={() => openEdit(m)}
                                  title="Tahrirlash"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-slate-600 hover:text-slate-700 hover:bg-slate-500/15"
                                  onClick={() => setPwdTarget(m)}
                                  title={t("dynamic.sharedprofile.parolni_o_zgartirish")}
                                >
                                  <KeyRound className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={m.is_active !== false ? "h-8 w-8 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-500/15" : "h-8 w-8 rounded-lg text-purple-600 hover:text-purple-700 hover:bg-purple-500/15"}
                                  onClick={() => toggleActive(m)}
                                  title={m.is_active !== false ? "Bloklash" : "Faollashtirish"}
                                >
                                  {m.is_active !== false ? <Ban className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDelTarget(m)}
                                  className="h-8 w-8 rounded-lg text-destructive hover:text-destructive-foreground hover:bg-destructive/90"
                                  title={t("dynamic.usersmanager.o_chirish")}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
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
              {role === "teacher" ? "O'qituvchi"
               : role === "administrator" ? "Administrator"
               : role === "parent" ? "Ota-ona"
               : "Talaba"} ma'lumotlarini to'g'ri va to'liq kiriting.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <div className="p-8 pt-4 space-y-4 max-h-[70vh] overflow-y-auto thin-scrollbar">
              {!editing && (
                role === "parent" ? (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-primary">{t("dynamic.memberslist.bog_lanadigan_talaba_")}</Label>
                    <Popover open={studentSearchOpen} onOpenChange={setStudentSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={studentSearchOpen}
                          className="w-full justify-between h-11 rounded-lg border-primary/20 bg-background hover:bg-background/80"
                        >
                          {form.student_id
                            ? studentsList.find((s) => s.id === form.student_id)?.fullName
                            : "Talabani qidiring..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command className="w-full">
                          <CommandInput placeholder="Ism yoki login bo'yicha qidirish..." />
                          <CommandList>
                            <CommandEmpty>{t("dynamic.parents.talaba_topilmadi")}</CommandEmpty>
                            <CommandGroup>
                              {studentsList.map((s) => (
                                <CommandItem
                                  key={s.id}
                                  value={s.fullName + " " + s.username}
                                  onSelect={() => {
                                    setForm({ ...form, student_id: s.id });
                                    setStudentSearchOpen(false);
                                  }}
                                  className="flex items-center justify-between"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{s.fullName}</span>
                                    <span className="text-[10px] text-muted-foreground">@{s.username}</span>
                                  </div>
                                  <Check
                                    className={cn(
                                      "ml-auto h-4 w-4",
                                      form.student_id === s.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider opacity-70">{t("dynamic.usersmanager.username_")}</Label>
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
                      <Label className="text-xs font-bold uppercase tracking-wider opacity-70">{t("dynamic.memberslist.parol_")}</Label>
                      <Input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="rounded-lg h-11"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                )
              )}
              
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider opacity-70">{t("dynamic.memberslist.to_liq_ism_")}</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder={role === "parent" ? "Ota-ona ismi (ixtiyoriy)" : "Ism va Familiya"}
                  className="rounded-lg h-11"
                  disabled={role === "parent" && !editing}
                />
              </div>

              {role === "student" && !editing && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">{t("dynamic.usersmanager.guruh_ixtiyoriy")}</Label>
                  <Popover open={groupSearchOpen} onOpenChange={setGroupSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={groupSearchOpen}
                        className="w-full justify-between h-11 rounded-lg border-slate-200 dark:border-white/10"
                      >
                        {form.group_id
                          ? groups.find((g) => g.id === form.group_id)?.name
                          : "Guruhni tanlang..."}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command className="w-full">
                        <CommandInput placeholder="Guruh qidirish..." />
                        <CommandList>
                          <CommandEmpty>{t("dynamic.parents.guruh_topilmadi")}</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="none"
                              onSelect={() => {
                                setForm({ ...form, group_id: "" });
                                setGroupSearchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  form.group_id === "" ? "opacity-100" : "opacity-0"
                                )}
                              />
                              Guruhsiz
                            </CommandItem>
                            {groups.map((g) => (
                              <CommandItem
                                key={g.id}
                                value={g.name}
                                onSelect={() => {
                                  setForm({ ...form, group_id: g.id });
                                  setGroupSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    form.group_id === g.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {g.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {role === "teacher" && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">{t("dynamic.memberslist.mutaxassislik_fan")}</Label>
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
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">{t("dynamic.profile.email")}</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="example@mail.com"
                    className="rounded-lg h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">{t("dynamic.profile.telefon")}</Label>
                  <Input
                    value={form.phone_number}
                    onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                    placeholder="+998 90 123 45 67"
                    className="rounded-lg h-11"
                  />
                </div>
              </div>

              {role === "student" && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-primary">
                    Ota-ona Telegram Username
                  </Label>
                  <div className="relative">
                    <Send className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary/50" />
                    <Input
                      value={form.parent_telegram_username}
                      onChange={(e) => setForm({ ...form, parent_telegram_username: e.target.value })}
                      placeholder="@username"
                      className="rounded-lg h-11 pl-10 border-primary/20 focus:border-primary"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    * Ushbu telegram orqali ota-onaga avtomatik xabarnomalar yuboriladi.
                  </p>
                </div>
              )}
            </div>
            
            <DialogFooter className="p-8 pt-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/80 backdrop-blur-md">
              <Button variant="ghost" type="button" onClick={() => setDialogOpen(false)} className="rounded-lg h-11 px-6">{t("dynamic.usersmanager.bekor")}</Button>
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
            <DialogTitle className="text-xl font-bold">{t("dynamic.usersmanager.parolni_yangilash")}</DialogTitle>
            <DialogDescription id="pwd-reset-description">
              Foydalanuvchi: <span className="text-primary font-bold">@{pwdTarget?.username}</span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); resetPassword(); }}>
            <div className="py-4 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider opacity-70">{t("dynamic.usersmanager.yangi_parol")}</Label>
              <Input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="Kamida 6 ta belgi"
                className="rounded-lg h-11"
              />
            </div>
            <DialogFooter className="mt-4">
              <Button variant="ghost" type="button" onClick={() => setPwdTarget(null)} className="rounded-lg">{t("dynamic.usersmanager.bekor")}</Button>
              <Button type="submit" disabled={submitting} variant="hero" className="rounded-lg">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                O'zgartirish
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Grant Coins Dialog */}
      <Dialog open={grantCoinsOpen} onOpenChange={setGrantCoinsOpen}>
        <DialogContent className="max-w-md" aria-describedby="grant-coins-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <span>{t("dynamic.usersmanager.coin_hadya_qilish")}</span>
            </DialogTitle>
            <DialogDescription id="grant-coins-desc">
              Foydalanuvchiga rag'batlantirish uchun coin yuborish.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <Avatar className="h-12 w-12 border-2 border-amber-500/20">
                <AvatarFallback className="bg-amber-500 text-white font-bold">
                  {(grantCoinsTarget?.full_name || grantCoinsTarget?.username || "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-amber-900">{grantCoinsTarget?.full_name || grantCoinsTarget?.username}</p>
                <p className="text-xs text-amber-700/70">@{grantCoinsTarget?.username}</p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>{t("dynamic.usersmanager.coin_miqdori")}</Label>
              <Input 
                type="number" 
                value={grantAmount} 
                onChange={(e) => setGrantAmount(Number(e.target.value))} 
                className="text-lg font-bold text-amber-600"
              />
            </div>

            <div className="grid gap-2">
              <Label>{t("dynamic.smartdashboard.sabab")}</Label>
              <Select value={grantReason} onValueChange={setReason => setGrantReason(setReason)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IELTS/SAT yuqori ball">IELTS/SAT yuqori ball</SelectItem>
                  <SelectItem value="Milliy sertifikat">{t("dynamic.usersmanager.milliy_sertifikat")}</SelectItem>
                  <SelectItem value="Olimpiada g'olibi">{t("dynamic.usersmanager.olimpiada_g_olibi")}</SelectItem>
                  <SelectItem value="Darsdagi faollik">{t("dynamic.usersmanager.darsdagi_faollik")}</SelectItem>
                  <SelectItem value="5+ a'lo baho">{t("dynamic.usersmanager.5_a_lo_baho")}</SelectItem>
                  <SelectItem value="Ota-ona faolligi">{t("dynamic.usersmanager.otaona_faolligi")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>{t("dynamic.usersmanager.izoh_comment")}</Label>
              <Input 
                value={grantComment} 
                onChange={(e) => setGrantComment(e.target.value)} 
                placeholder="Qisqacha izoh yozing..." 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGrantCoinsOpen(false)}>{t("dynamic.usersmanager.bekor")}</Button>
            <Button 
              variant="hero" 
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => {
                if (grantCoinsTarget) {
                  grantCoinsMutation.mutate({
                    student_id: grantCoinsTarget.id,
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

      {/* Delete confirm */}
      <AlertDialog open={!!delTarget} onOpenChange={(v) => !v && setDelTarget(null)}>
        <AlertDialogContent className="rounded-xl border-none shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">{t("dynamic.paymentreceivers.o_chirishni_tasdiqlang")}</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-slate-900 dark:text-white">@{delTarget?.username}</span> butunlay
              tizimdan o'chiriladi. Bu amalni qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="rounded-lg">{t("dynamic.usersmanager.bekor")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg px-6"
            >{t("dynamic.usersmanager.o_chirish")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

