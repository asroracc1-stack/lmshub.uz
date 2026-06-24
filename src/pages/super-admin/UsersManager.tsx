import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDebounce } from "@/hooks/useDebounce";
import { motion } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppRole, roleLabel } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus, Pencil, Trash2, Loader2, KeyRound, Search, Mic, Volume2,
  Play, Pause, History, Calendar, Award, CheckCircle2, AlertCircle, Sparkles, Gift, Ban, Unlock
} from "lucide-react";

// Data interfaces and validation schemas moved below
interface SpeakingSession {
  id: string;
  student_id: string;
  topic: string;
  avg_fluency: number | null;
  avg_grammar: number | null;
  avg_vocabulary: number | null;
  avg_pronunciation: number | null;
  overall_band: number | null;
  ai_report: any;
  created_at: string;
}

interface SpeakingMessage {
  id: string;
  session_id: string;
  role: string;
  content: string;
  audio_url: string | null;
  transcript: string | null;
  grammar_feedback: string | null;
  vocabulary_feedback: string | null;
  pronunciation_feedback: string | null;
  created_at: string;
}



interface UserRow {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  phone_number: string | null;
  organization_id: string | null;
  group_id: string | null;
  subject: string | null;
  telegram_chat_id?: string | null;
  telegram_username?: string | null;
  card_number?: string | null;
  card_holder?: string | null;
  role: AppRole;
  created_at: string;
  coins?: number;
}

interface Org {
  id: string;
  name: string;
}

const createSchema = z.object({
  email: z.string().email("Email noto'g'ri"),
  username: z.string().min(3, "Username kamida 3 ta belgi").max(50),
  password: z.string().min(6, "Parol kamida 6 ta belgi").max(100),
  full_name: z.string().min(2, "F.I.O kiriting").max(100),
  role: z.enum(["super_admin", "admin", "administrator", "teacher", "student", "user", "parent", "payment_manager"]),
  phone_number: z.string().min(5, "Telefon kiriting").max(30),
  organization_id: z.string().uuid("Tashkilot ID noto'g'ri").optional().or(z.literal("")),
  group_id: z.string().optional().or(z.literal("")),
  subject: z.string().optional().or(z.literal("")),
  telegram_chat_id: z.string().optional().or(z.literal("")),
  telegram_username: z.string().optional().or(z.literal("")),
  card_number: z.string().optional().or(z.literal("")),
  card_holder: z.string().optional().or(z.literal("")),
}).superRefine((val, ctx) => {
  if (val.role === "admin" || val.role === "administrator") {
    if (!val.card_number || val.card_number.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Admin/Administrator uchun Karta raqami majburiy!",
        path: ["card_number"],
      });
    }
    if (!val.card_holder || val.card_holder.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Admin/Administrator uchun Karta egasi ismi majburiy!",
        path: ["card_holder"],
      });
    }
    // Card number must be exactly 16 digits
    if (val.card_number && val.card_number.replace(/\D/g, "").length !== 16) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Karta raqami 16 ta raqam bo'lishi kerak (masalan: 8600123456789012)",
        path: ["card_number"],
      });
    }
  }
});

// Update schema - password is optional for editing
const updateSchema = z.object({
  email: z.string().email("Email noto'g'ri"),
  username: z.string().min(3, "Username kamida 3 ta belgi").max(50),
  password: z.string().min(6, "Parol kamida 6 ta belgi").max(100).optional().or(z.literal("")),
  full_name: z.string().min(2, "F.I.O kiriting").max(100),
  role: z.enum(["super_admin", "admin", "administrator", "teacher", "student", "user", "parent", "payment_manager"]),
  phone_number: z.string().min(5, "Telefon kiriting").max(30),
  organization_id: z.string().uuid("Tashkilot ID noto'g'ri").optional().or(z.literal("")),
  group_id: z.string().optional().or(z.literal("")),
  subject: z.string().optional().or(z.literal("")),
  telegram_chat_id: z.string().optional().or(z.literal("")),
  telegram_username: z.string().optional().or(z.literal("")),
  card_number: z.string().optional().or(z.literal("")),
  card_holder: z.string().optional().or(z.literal("")),
}).superRefine((val, ctx) => {
  if (val.role === "admin" || val.role === "administrator") {
    if (!val.card_number || val.card_number.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Admin/Administrator uchun Karta raqami majburiy!",
        path: ["card_number"],
      });
    }
    if (!val.card_holder || val.card_holder.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Admin/Administrator uchun Karta egasi ismi majburiy!",
        path: ["card_holder"],
      });
    }
    if (val.card_number && val.card_number.replace(/\D/g, "").length !== 16) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Karta raqami 16 ta raqam bo'lishi kerak (masalan: 8600123456789012)",
        path: ["card_number"],
      });
    }
  }
});

interface Props {
  filterRole?: AppRole;
  title: string;
  description: string;
}

export default function UsersManager({
  filterRole, title, description }: Props) {
  const { t } = useTranslation();
  const { user: me, profile, role: myRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const orgIdParam = searchParams.get("orgId") || "";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(100);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdTarget, setPwdTarget] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  // Student Speaking History States
  const [speakingStudent, setSpeakingStudent] = useState<UserRow | null>(null);
  const [sessions, setSessions] = useState<SpeakingSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<SpeakingSession | null>(null);
  const [messagesList, setMessagesList] = useState<SpeakingMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [grantCoinsOpen, setGrantCoinsOpen] = useState(false);
  const [grantCoinsTarget, setGrantCoinsTarget] = useState<UserRow | null>(null);
  const [grantAmount, setGrantAmount] = useState(500);
  const [grantReason, setGrantReason] = useState("Darsdagi faollik");
  const [grantComment, setGrantComment] = useState("");
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const SPEAKING_FEATURE_AVAILABLE = false;

  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    full_name: "",
    role: (filterRole ?? "student") as AppRole,
    phone_number: "",
    organization_id: (myRole === "super_admin" ? "" : profile?.organization_id) || "",
    group_id: "",
    subject: "",
    telegram_chat_id: "",
    telegram_username: "",
    card_number: "",
    card_holder: "",
  });

  // Ensure form gets organization_id when profile loads
  useEffect(() => {
    if (myRole !== "super_admin" && profile?.organization_id && !form.organization_id) {
      setForm((f) => ({ ...f, organization_id: profile.organization_id || "" }));
    }
  }, [profile, myRole]);

  const { data, isLoading } = useQuery({
    queryKey: ["users", filterRole, page, debouncedSearch, myRole === "super_admin" ? undefined : profile?.organization_id, orgIdParam],
    queryFn: async () => {
      // Backend controller: AdminUserController (@RequestMapping("/api/v1/admin/users"))
      // Endpointlar: /all (hamma uchun) yoki /by-role/{role}
      const endpoint = filterRole
        ? `/admin/users/by-role/${filterRole.toUpperCase()}`
        : "/admin/users/all";

      const { data } = await api.get<any>(endpoint, {
        params: {
          page,
          size: pageSize,
          query: debouncedSearch || "", // Backend 'query' parametrini kutyapti for /all
          search: debouncedSearch || "",  // Backend 'search' parametrini kutyapti for /by-role
          organizationId: orgIdParam || (myRole === "super_admin" ? undefined : profile?.organization_id) || undefined,
        }
      });
      return data;
    },
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ["organizations-list"],
    queryFn: async () => {
      const { data } = await api.get<any>("/organizations", { params: { size: 1000 } });
      return data.content || [];
    },
  });

  const effectiveOrgIdForGroups = form.organization_id || (myRole === "super_admin" ? "" : profile?.organization_id);

  const { data: groups = [] } = useQuery({
    queryKey: ["groups-list", effectiveOrgIdForGroups],
    queryFn: async () => {
      if (!effectiveOrgIdForGroups || effectiveOrgIdForGroups === "none") return [];
      const { data } = await api.get<any>(`/admin/organizations/${effectiveOrgIdForGroups}/groups`);
      return data || [];
    },
    enabled: !!effectiveOrgIdForGroups,
  });

  const { data: allGroups = [] } = useQuery({
    queryKey: ["all-groups-list-global", myRole === "super_admin" ? undefined : profile?.organization_id],
    queryFn: async () => {
      const { data } = await api.get<any>("/admin/groups", {
        params: { size: 1000, organizationId: myRole === "super_admin" ? undefined : profile?.organization_id }
      });
      return data.content || [];
    },
  });

  // Backend Page object qaytaradi (content, totalPages, etc.)
  // Agar to'g'ridan-to'g'ri array kelsa ham ishlaydigan qilamiz
  const users = Array.isArray(data) ? data : (data?.content || []);
  const totalPages = data?.totalPages || (Array.isArray(data) ? 1 : 0);

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editing) {
        return api.put(`/admin/users/${editing.id}`, payload);
      } else {
        return api.post("/admin/users", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      const entityName = filterRole === "student" ? "Talaba" : filterRole === "teacher" ? "O'qituvchi" : filterRole === "administrator" ? "Administrator" : "Foydalanuvchi";
      toast.success(editing ? `${entityName} muvaffaqiyatli yangilandi` : `${entityName} muvaffaqiyatli qo'shildi`);
      setOpen(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Xatolik yuz berdi");
    },
  });

  const reset = () => {
    setEditing(null);
    setForm({
      email: "",
      username: "",
      password: "",
      full_name: "",
      role: (filterRole ?? "student") as AppRole,
      phone_number: "",
      organization_id: (myRole === "super_admin" ? "" : profile?.organization_id) || "",
      group_id: "",
      subject: "",
      telegram_chat_id: "",
      telegram_username: "",
      card_number: "",
      card_holder: "",
    });
  };

  const openCreate = () => { reset(); setOpen(true); };
  const openEdit = (u: UserRow) => {
    setEditing(u);
    setForm({
      email: u.email,
      username: u.username ?? "",
      password: "",
      full_name: u.full_name ?? "",
      role: (u.role as string).toLowerCase() as AppRole,
      phone_number: u.phone_number ?? "",
      organization_id: u.organization_id || (myRole === "super_admin" ? "" : profile?.organization_id) || "",
      group_id: u.group_id ?? "",
      subject: u.subject ?? "",
      telegram_chat_id: u.telegram_chat_id ?? "",
      telegram_username: u.telegram_username ?? "",
      card_number: u.card_number ?? "",
      card_holder: u.card_holder ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    const targetOrgId = form.organization_id && form.organization_id !== "none" 
      ? form.organization_id 
      : (myRole === "super_admin" ? "" : (profile?.organization_id || ""));
    if (form.role !== "super_admin" && form.role !== "administrator" && form.role !== "user" && form.role !== "payment_manager" && !targetOrgId) {
      toast.error(t("dynamic.usersmanager.iltimos_tashkilotni_tanlang"));
      return;
    }

    // Use appropriate schema for create or edit
    const schema = editing ? updateSchema : createSchema;
    const parsed = schema.safeParse(form);

    if (!parsed.success) {
      // Show ALL validation errors with field names
      const errorMessages = parsed.error.errors
        .map((err) => {
          const fieldName = err.path.join(" → ");
          return `${fieldName}: ${err.message}`;
        })
        .join("\n");

      console.error("Validation errors:", parsed.error.errors);
      toast.error(
        errorMessages.length > 100
          ? `${parsed.error.errors.length} ta xato:\n${parsed.error.errors[0].message}`
          : errorMessages || "Forma noto'g'ri to'ldirilgan"
      );
      return;
    }

    // Prepare payload with only necessary fields (no DTO duplication)
    const basePayload = {
      email: parsed.data.email,
      username: parsed.data.username,
      full_name: parsed.data.full_name,
      phone_number: parsed.data.phone_number || null,
      role: parsed.data.role.toUpperCase(),
      organization_id: targetOrgId !== "" ? targetOrgId : null,
      group_id: (form.group_id && form.group_id !== "none") ? form.group_id : null,
      subject: parsed.data.subject || null,
      telegram_chat_id: parsed.data.telegram_chat_id || null,
      telegram_username: parsed.data.telegram_username || null,
      card_number: parsed.data.card_number || null,
      card_holder: parsed.data.card_holder || null,
    };

    const payload = editing
      ? basePayload // Edit: no password sent if not changed
      : {
        ...basePayload,
        password: parsed.data.password
      };

    mutation.mutate(payload);
  };


  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      toast.success(t("dynamic.usersmanager.o_chirildi"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "O'chirishda xatolik");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string, active: boolean }) => {
      return api.patch(`/admin/users/${id}/active`, { active });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(variables.active ? "Foydalanuvchi faollashtirildi" : "Foydalanuvchi bloklandi");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Xatolik yuz berdi");
    },
  });

  const remove = async (u: UserRow) => {
    deleteMutation.mutate(u.id);
  };

  const grantCoinsMutation = useMutation({
    mutationFn: async (payload: { studentId: string, amount: number, reason: string, comment?: string }) => {
      return api.post("/admin/coins/grant", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["global-leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });

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

  const resetPwd = async () => {
    if (!pwdTarget || newPassword.length < 6) {
      toast.error(t("dynamic.usersmanager.parol_kamida_6_ta_belgi"));
      return;
    }
    try {
      await api.patch(`/admin/users/${pwdTarget.id}/password`, { password: newPassword });
      toast.success(t("dynamic.usersmanager.parol_yangilandi"));
      setPwdOpen(false);
      setNewPassword("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Xatolik yuz berdi");
    }
  };

  // Student Speaking History Fetchers (Mocked for now as per Java migration)
  const fetchSpeakingSessions = async (studentId: string) => {
    setLoadingHistory(true);
    // Speaking history is not currently exposed through a backend admin endpoint.
    setSessions([]);
    setLoadingHistory(false);
  };

  const fetchSessionMessages = async (sessionId: string) => {
    setLoadingMessages(true);
    // Speaking message details are not currently exposed through a backend admin endpoint.
    setMessagesList([]);
    setLoadingMessages(false);
  };

  const playAudio = (url: string, id: string) => {
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const player = new Audio(url);
      audioPlayerRef.current = player;
      player.onended = () => setPlayingVoiceId(null);
      player.onerror = () => {
        setPlayingVoiceId(null);
        toast.error(t("dynamic.usersmanager.ovozli_faylni_yuklab_bo_lmadi"));
      };
      setPlayingVoiceId(id);
      player.play().catch(() => {
        setPlayingVoiceId(null);
        toast.error(t("dynamic.usersmanager.ijro_etish_bloklandi"));
      });
    } catch (e) {
      setPlayingVoiceId(null);
    }
  };

  const stopAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setPlayingVoiceId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            <Button variant="hero" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Yangi foydalanuvchi
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Tahrirlash" : "Yangi foydalanuvchi"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              {/* 1-qator: Username va Parol */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>{t("dynamic.usersmanager.username_")}</Label>
                  <Input
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                    placeholder="@username"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{editing ? "Parol (bo'sh — o'zgarmaydi)" : "Parol *"}</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="••••••••"
                    disabled={!!editing}
                  />
                </div>
              </div>

              {/* 2-qator: F.I.O */}
              <div className="grid gap-2">
                <Label>{t("dynamic.usersmanager.fio_")}</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder={t("dynamic.packs.ism_familiya")}
                />
              </div>

              {/* 3-qator: Role va Tashkilot */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>{t("dynamic.usersmanager.role_")}</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => setForm((f) => ({ ...f, role: v as AppRole }))}
                    disabled={!!filterRole}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(roleLabel)
                        .filter((r) => {
                          if (myRole !== "super_admin") {
                            return r !== "payment_manager" && r !== "super_admin";
                          }
                          return true;
                        })
                        .map((r) => (
                          <SelectItem key={r} value={r}>{roleLabel[r as AppRole]}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Tashkilot {(form.role === "user" || form.role === "super_admin" || form.role === "administrator" || form.role === "payment_manager") && <span className="text-muted-foreground font-normal">{t("dynamic.usersmanager.ixtiyoriy")}</span>}</Label>
                  <Select
                    value={form.organization_id || "none"}
                    onValueChange={(v) => setForm((f) => ({ ...f, organization_id: v === "none" ? "" : v }))}
                    disabled={myRole !== "super_admin"}
                  >
                    <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Yo'q —</SelectItem>
                      {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Guruh selektori */}
              {(form.role === "student" || form.role === "teacher") && (
                <div className="grid gap-2">
                  <Label>{t("dynamic.usersmanager.guruh_ixtiyoriy")}</Label>
                  <Select
                    value={form.group_id || "none"}
                    onValueChange={(v) => setForm((f) => ({ ...f, group_id: v === "none" ? "" : v }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Guruhni tanlang" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Guruhsiz —</SelectItem>
                      {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 4-qator: Email va Telefon */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>{t("dynamic.usersmanager.email_")}</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value.toLowerCase() }))}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t("dynamic.usersmanager.telefon_")}</Label>
                  <Input
                    value={form.phone_number}
                    onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
                    placeholder="+998..."
                  />
                </div>
              </div>

              {/* Shartli maydonlar (Fan) */}
              {form.role === "teacher" && (
                <div className="grid grid-cols-1 gap-3">
                  <div className="grid gap-2">
                    <Label>{t("dynamic.usersmanager.fan_subject")}</Label>
                    <Input
                      value={form.subject}
                      onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                      placeholder="IELTS, Mathematics... (vergul bilan ajrating)"
                    />
                  </div>
                </div>
              )}
              {(form.role === "admin" || form.role === "administrator") && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>{t("dynamic.usersmanager.telegram_chat_id")}</Label>
                    <Input
                      value={form.telegram_chat_id}
                      onChange={(e) => setForm((f) => ({ ...f, telegram_chat_id: e.target.value }))}
                      placeholder="Masalan: 123456789"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("dynamic.usersmanager.telegram_username")}</Label>
                    <Input
                      value={form.telegram_username}
                      onChange={(e) => setForm((f) => ({ ...f, telegram_username: e.target.value }))}
                      placeholder="@username"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("dynamic.usersmanager.karta_raqami")}</Label>
                    <Input
                      value={form.card_number}
                      onChange={(e) => setForm((f) => ({ ...f, card_number: e.target.value }))}
                      placeholder="8600 1234 5678 9012"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>{t("dynamic.usersmanager.karta_egasi")}</Label>
                    <Input
                      value={form.card_holder}
                      onChange={(e) => setForm((f) => ({ ...f, card_holder: e.target.value }))}
                      placeholder={t("dynamic.profile.fio")}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>{t("dynamic.usersmanager.bekor")}</Button>
              <Button variant="hero" onClick={submit} disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Saqlash" : "Qo'shish"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="glass rounded-2xl p-4">
        {orgIdParam && (
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2 text-sm text-primary w-fit mb-4 animate-fade-in shadow-sm">
            <span>
              <strong>{orgs.find((o: any) => o.id === orgIdParam)?.name || "Tashkilot"}</strong> xodimlari ko'rsatilmoqda.
            </span>
            <button
              onClick={() => {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete("orgId");
                setSearchParams(newParams);
              }}
              className="ml-2 font-bold text-primary hover:text-primary-foreground hover:bg-primary/20 px-2 py-0.5 rounded transition-colors duration-200 text-xs focus:outline-none"
              title="Filtrni tozalash"
            >
              Filtrni tozalash (✖)
            </button>
          </div>
        )}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Username, F.I.O yoki email bo'yicha qidirish..."
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="border border-border/40 rounded-2xl overflow-hidden glass shadow-xl animate-pulse">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                <TableRow>
                  <TableHead className="font-semibold"><Skeleton className="h-4 w-28" /></TableHead>
                  <TableHead className="font-semibold"><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead className="font-semibold"><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead className="font-semibold"><Skeleton className="h-4 w-32" /></TableHead>
                  <TableHead className="font-semibold"><Skeleton className="h-4 w-24" /></TableHead>
                  <TableHead className="font-semibold"><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead className="text-right font-semibold"><Skeleton className="h-4 w-24 ml-auto" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i} className="border-b border-border/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-xl" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Skeleton className="h-3.5 w-36" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
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
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dynamic.usersmanager.foydalanuvchi")}</TableHead>
                  <TableHead>{t("dynamic.usersmanager.role")}</TableHead>
                  <TableHead>{t("dynamic.usersmanager.holati")}</TableHead>
                  <TableHead>Email / Telefon</TableHead>
                  <TableHead>{t("dynamic.usersmanager.tashkilot")}</TableHead>
                  <TableHead>Guruh/Yo'nalish</TableHead>
                  <TableHead className="text-right">{t("dynamic.usersmanager.amallar")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{t("dynamic.usersmanager.foydalanuvchi_topilmadi")}</TableCell></TableRow>
                ) : users.map((u: UserRow) => {
                  const initials = (u.full_name || u.email).split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
                  const orgName = u.organization_id
                    ? (orgs.find((o: any) => o.id === u.organization_id)?.name || "—")
                    : (u.role === "SUPER_ADMIN" || u.role === "PAYMENT_MANAGER" ? "Hamma" : "—");
                  const mappedRole = (u.role as string).toLowerCase() as AppRole;

                  const getRoleBadgeClasses = (role: string) => {
                    switch (role) {
                      case 'super_admin': return 'bg-orange-500/15 text-orange-600 border-orange-500/30';
                      case 'admin': return 'bg-purple-500/15 text-purple-600 border-purple-500/30';
                      case 'teacher': return 'bg-pink-500/15 text-pink-600 border-pink-500/30';
                      case 'user': return 'bg-blue-500/15 text-blue-600 border-blue-500/30';
                      case 'student': return 'bg-purple-500/15 text-purple-600 border-purple-500/30';
                      default: return 'bg-primary/15 text-primary border-primary/30';
                    }
                  };

                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-primary/20">
                            <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{u.full_name || "—"}</p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="font-mono">@{u.username || "—"}</span>
                              {(mappedRole === "student" || mappedRole === "user") && (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 dark:bg-amber-500/20 px-1.5 py-0.5 rounded-md text-[10px]">
                                    <Sparkles className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                                    {u.coins || 0}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getRoleBadgeClasses(mappedRole)}>
                          {roleLabel[mappedRole] || u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.active !== false ? (
                          <div className="flex items-center gap-1.5 bg-purple-500/10 w-fit px-2 py-1 rounded-full border border-purple-500/20">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                            </span>
                            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">{t("dynamic.usersmanager.faol")}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 bg-destructive/10 w-fit px-2 py-1 rounded-full border border-destructive/20">
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                            <span className="text-[10px] font-bold text-destructive uppercase tracking-wider">{t("dynamic.usersmanager.bloklangan")}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <p>{u.email}</p>
                        <p className="text-xs">{u.phone_number || ""}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {orgName}
                      </TableCell>
                      <TableCell className="text-sm">
                        {u.role === "student" ? (
                          (() => {
                            const groupName = allGroups.find((g: any) => g.id === u.group_id || g.id === (u as any).groupId)?.name;
                            return groupName ? (
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-medium">
                                {groupName}
                              </Badge>
                            ) : "—";
                          })()
                        ) : (
                          u.role === "teacher" ? (u.subject || "—") : "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          {(mappedRole === "user" || mappedRole === "student") && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-100/50"
                              onClick={() => {
                                setGrantCoinsTarget(u);
                                setGrantCoinsOpen(true);
                              }}
                              title={t("dynamic.usersmanager.coin_hadya_qilish")}
                            >
                              <Gift className="h-4 w-4" />
                            </Button>
                          )}
                          {u.role === "student" && SPEAKING_FEATURE_AVAILABLE && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => {
                                setSpeakingStudent(u);
                                setSelectedSession(null);
                                setSessions([]);
                                setMessagesList([]);
                                fetchSpeakingSessions(u.id);
                              }}
                              title="Speaking tahlillari"
                            >
                              <Mic className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className={u.active !== false ? "text-amber-600" : "text-purple-600"}
                            onClick={() => toggleActiveMutation.mutate({ id: u.id, active: u.active === false })}
                            title={u.active !== false ? "Bloklash" : "Faollashtirish"}
                          >
                            {toggleActiveMutation.isPending && toggleActiveMutation.variables?.id === u.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : u.active !== false ? (
                              <Ban className="h-4 w-4" />
                            ) : (
                              <Unlock className="h-4 w-4" />
                            )}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { setPwdTarget(u); setPwdOpen(true); }} title={t("dynamic.sharedprofile.parolni_o_zgartirish")}>
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(u)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {u.id !== me?.id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("dynamic.usersmanager.o_chirilsinmi")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    "{u.fullName || u.email}" foydalanuvchi tizimdan o'chiriladi.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("dynamic.usersmanager.bekor")}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => remove(u)} className="bg-destructive">{t("dynamic.usersmanager.o_chirish")}</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Sahifa {page + 1} / {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Oldingi
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Keyingi
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={grantCoinsOpen} onOpenChange={setGrantCoinsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <span>{t("dynamic.usersmanager.coin_hadya_qilish")}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <Avatar className="h-12 w-12 border-2 border-amber-500/20">
                <AvatarFallback className="bg-amber-500 text-white font-bold">
                  {(grantCoinsTarget?.full_name || "?").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-amber-900">{grantCoinsTarget?.full_name}</p>
                <p className="text-xs text-amber-700/70">
                  {grantCoinsTarget?.role ? (roleLabel[(grantCoinsTarget.role as string).toLowerCase() as AppRole] || grantCoinsTarget.role) : ""}
                </p>
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

      {/* 🎙️ STUDENT SPEAKING SESSIONS HISTORY VIEWER DIALOG */}
      <Dialog open={!!speakingStudent} onOpenChange={(v) => { if (!v) { setSpeakingStudent(null); setSelectedSession(null); stopAudio(); } }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-xl border-b pb-2">
              <Mic className="h-5 w-5 text-primary" />
              <span>{speakingStudent?.full_name} — AI Speaking Mashqlar Tarixi</span>
            </DialogTitle>
          </DialogHeader>

          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-semibold">{t("dynamic.usersmanager.speaking_mashqlari_yuklanmoqda")}</p>
            </div>
          ) : !selectedSession ? (
            // Session List View
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{t("dynamic.usersmanager.talabaning_barcha_speaking_seanslari")}</p>
              {sessions.length === 0 ? (
                <Card className="p-8 text-center border-dashed">
                  <History className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">{t("dynamic.usersmanager.talaba_hozirgacha_hech_qanday_speaking_m")}</p>
                </Card>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {sessions.map((s) => (
                    <Card
                      key={s.id}
                      className="p-4 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
                      onClick={() => { setSelectedSession(s); fetchSessionMessages(s.id); }}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b pb-2">
                          <Badge variant="outline" className="text-xs font-bold uppercase">{s.topic}</Badge>
                          <Badge className="bg-purple-500 text-white font-extrabold text-xs">Band {s.overall_band?.toFixed(1) || "N/A"}</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold text-muted-foreground py-1">
                          <p>{t("dynamic.usersmanager.fluency")}<span className="text-foreground">{s.avg_fluency ?? "N/A"}</span></p>
                          <p>{t("dynamic.usersmanager.vocabulary")}<span className="text-foreground">{s.avg_vocabulary ?? "N/A"}</span></p>
                          <p>{t("dynamic.usersmanager.grammar")}<span className="text-foreground">{s.avg_grammar ?? "N/A"}</span></p>
                          <p>{t("dynamic.usersmanager.pronunciation")}<span className="text-foreground">{s.avg_pronunciation ?? "N/A"}</span></p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t pt-2 mt-2">
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(s.created_at).toLocaleDateString()}</span>
                        <span className="text-primary font-bold hover:underline">Tafsilotlarni ko'rish &rarr;</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Individual Session Detail View
            <div className="space-y-5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSelectedSession(null); setMessagesList([]); stopAudio(); }}
                className="h-8 text-xs font-bold"
              >
                &larr; Seanslar ro'yxatiga qaytish
              </Button>

              <div className="grid md:grid-cols-3 gap-5">
                {/* Session Summary Cards */}
                <Card className="p-4 space-y-4 md:col-span-1 border border-border bg-muted/20">
                  <p className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-widest border-b pb-1.5">{t("dynamic.usersmanager.mashq_yakuniy_ballari")}</p>

                  <div className="flex flex-col items-center justify-center py-4 bg-background border rounded-xl shadow-sm">
                    <div className="h-16 w-16 rounded-full bg-purple-500 text-white flex flex-col items-center justify-center font-extrabold text-xl shadow-sm">
                      <span className="text-[8px] uppercase tracking-wider opacity-85">{t("dynamic.usersmanager.ielts")}</span>
                      <span>{selectedSession.overall_band?.toFixed(1) || "N/A"}</span>
                    </div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2">{t("dynamic.usersmanager.overall_band")}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-extrabold text-muted-foreground uppercase">{t("dynamic.usersmanager.me_yorlar_taqsimoti")}</p>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between font-bold"><span className="text-muted-foreground">Fluency & Coherence</span><span>{selectedSession.avg_fluency ?? "N/A"} / 9.0</span></div>
                      <Progress value={((selectedSession.avg_fluency ?? 0) / 9) * 100} className="h-1 bg-muted rounded-full" />
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between font-bold"><span className="text-muted-foreground">{t("dynamic.usersmanager.lexical_resource")}</span><span>{selectedSession.avg_vocabulary ?? "N/A"} / 9.0</span></div>
                      <Progress value={((selectedSession.avg_vocabulary ?? 0) / 9) * 100} className="h-1 bg-muted rounded-full" />
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between font-bold"><span className="text-muted-foreground">{t("dynamic.usersmanager.grammar_accuracy")}</span><span>{selectedSession.avg_grammar ?? "N/A"} / 9.0</span></div>
                      <Progress value={((selectedSession.avg_grammar ?? 0) / 9) * 100} className="h-1 bg-muted rounded-full" />
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between font-bold"><span className="text-muted-foreground">Pronunciation</span><span>{selectedSession.avg_pronunciation ?? "N/A"} / 9.0</span></div>
                      <Progress value={((selectedSession.avg_pronunciation ?? 0) / 9) * 100} className="h-1 bg-muted rounded-full" />
                    </div>
                  </div>
                </Card>

                {/* Transcripts and Recorded audio player lists */}
                <Card className="p-4 md:col-span-2 space-y-4 border">
                  <p className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-widest border-b pb-1.5">{t("dynamic.usersmanager.nutq_transkriptlari_va_audio_yozuvlari")}</p>

                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-12 gap-2"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="text-xs text-muted-foreground">{t("dynamic.usersmanager.xabarlar_yuklanmoqda")}</p></div>
                  ) : messagesList.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic text-center py-6">{t("dynamic.usersmanager.nutq_xabarlari_topilmadi")}</p>
                  ) : (
                    <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                      {messagesList.map((m) => (
                        <Card key={m.id} className="p-3.5 space-y-2 border border-border/60 bg-card/60 rounded-xl shadow-inner">
                          <div className="flex items-start justify-between flex-wrap gap-2 border-b pb-1.5 border-border/30">
                            <span className="text-xs font-bold text-foreground">{t("dynamic.usersmanager.talaba_gapirgan_javob")}</span>

                            {m.audio_url && (
                              <Button
                                size="xs"
                                variant={playingVoiceId === m.id ? "destructive" : "hero"}
                                onClick={() => playingVoiceId === m.id ? stopAudio() : playAudio(m.audio_url!, m.id)}
                                className="h-7 text-[10px] font-bold gap-1 px-2.5 rounded-lg shadow-sm"
                              >
                                {playingVoiceId === m.id ? (
                                  <>
                                    <Pause className="h-3 w-3" /> To'xtatish
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-3 w-3" /> Audioni Eshitish (Play)
                                  </>
                                )}
                              </Button>
                            )}
                          </div>

                          <p className="text-xs md:text-sm text-foreground/90 italic font-medium leading-relaxed">"{m.content}"</p>

                          {/* Specific feedbacks */}
                          {(m.grammar_feedback || m.vocabulary_feedback || m.pronunciation_feedback) && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 mt-1.5 border-t border-border/35 text-[11px] font-medium">
                              {m.grammar_feedback && (
                                <div className="p-2 bg-rose-500/5 rounded-lg border border-rose-500/10">
                                  <p className="font-bold text-rose-700 dark:text-rose-400">{t("dynamic.usersmanager.grammatika")}</p>
                                  <p className="text-muted-foreground mt-0.5 leading-relaxed">{m.grammar_feedback}</p>
                                </div>
                              )}
                              {m.vocabulary_feedback && (
                                <div className="p-2 bg-indigo-500/5 rounded-lg border border-indigo-500/10">
                                  <p className="font-bold text-indigo-700 dark:text-indigo-400">{t("dynamic.usersmanager.so_z_boyligi")}</p>
                                  <p className="text-muted-foreground mt-0.5 leading-relaxed">{m.vocabulary_feedback}</p>
                                </div>
                              )}
                              {m.pronunciation_feedback && (
                                <div className="p-2 bg-violet-500/5 rounded-lg border border-violet-500/10">
                                  <p className="font-bold text-violet-700 dark:text-violet-400">{t("dynamic.usersmanager.talaffuz")}</p>
                                  <p className="text-muted-foreground mt-0.5 leading-relaxed">{m.pronunciation_feedback}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("dynamic.usersmanager.parolni_yangilash")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>{t("dynamic.usersmanager.yangi_parol")}</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Kamida 6 ta belgi" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPwdOpen(false)}>{t("dynamic.usersmanager.bekor")}</Button>
            <Button variant="hero" onClick={resetPwd}>{t("dynamic.usersmanager.saqlash")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

