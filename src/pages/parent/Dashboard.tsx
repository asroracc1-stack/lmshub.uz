import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import TigerPlayer from "@/components/TigerPlayer";
import {
  Heart, Users, Coins, Award, CalendarCheck2,
  ChevronDown, TrendingUp, BookOpen, Star, MessageSquare,
  Wallet, Copy, UploadCloud, FileText, CheckCircle2,
  AlertCircle, Clock, Search, Trophy, ArrowRight, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface Child {
  id: string;
  fullName: string | null;
  username: string;
  avatarUrl: string | null;
  coins: number;
}

interface GradeItem {
  id: string;
  studentId: string;
  studentName?: string;
  subjectName: string;
  score: number;
  maxScore: number;
  comment?: string;
  createdAt: string;
}

interface AttItem {
  id: string;
  status: string;
  date?: string;
  lessonTitle?: string;
}

interface AdminPaymentInfo {
  id: string;
  fullName: string;
  cardNumber?: string;
  cardHolder?: string;
  phoneNumber?: string;
}

interface PaymentTransactionDto {
  id: string;
  amount: number;
  note: string;
  status: string;
  paymentProofUrl: string;
  createdAt: string;
  studentName?: string;
  adminName?: string;
}

const GRADIENT_BY_IDX = [
  "from-rose-500 to-pink-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  APPROVED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  REJECTED: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

export default function ParentDashboard() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"academics" | "gamification" | "finance">("academics");

  // Finance states
  const [selectedAdmin, setSelectedAdmin] = useState<AdminPaymentInfo | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Search/Filter states
  const [gradeSearch, setGradeSearch] = useState("");

  // ─── Fetch children ────────────────────────────────────────────────────────
  const { data: children = [], isLoading: childrenLoading } = useQuery<Child[]>({
    queryKey: ["parent-children", user?.id],
    queryFn: async () => {
      const { data } = await api.get("/admin/parents/my-children");
      return data;
    },
    staleTime: 60_000,
    enabled: !!user,
  });

  const activeChild = selectedChildId
    ? children.find(c => c.id === selectedChildId) ?? children[0]
    : children[0];

  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  // ─── Fetch grades for active child ────────────────────────────────────────
  const { data: grades = [], isLoading: gradesLoading } = useQuery<GradeItem[]>({
    queryKey: ["child-grades", activeChild?.id],
    queryFn: async () => {
      const { data } = await api.get(`/parent/children/${activeChild!.id}/grades`);
      return Array.isArray(data) ? data : (data.content ?? []);
    },
    enabled: !!activeChild?.id,
    staleTime: 60_000,
  });

  // ─── Fetch attendance for active child ────────────────────────────────────
  const { data: attendance = [], isLoading: attendanceLoading } = useQuery<AttItem[]>({
    queryKey: ["child-attendance", activeChild?.id],
    queryFn: async () => {
      const { data } = await api.get(`/parent/children/${activeChild!.id}/attendance`);
      return Array.isArray(data) ? data : (data.content ?? []);
    },
    enabled: !!activeChild?.id,
    staleTime: 60_000,
  });

  // ─── Fetch leaderboard for active child's class context ────────────────────
  const { data: leaderboard = [], isLoading: leaderboardLoading } = useQuery<any[]>({
    queryKey: ["global-leaderboard", activeChild?.id],
    queryFn: async () => {
      const { data } = await api.get("/leaderboard", {
        params: { period: "all_time", role: "STUDENT", isGlobal: true }
      });
      return data || [];
    },
    enabled: !!activeChild?.id,
    staleTime: 5 * 60 * 1000,
  });

  // ─── Fetch Admins available for payment ───────────────────────────────────
  const { data: admins = [], isLoading: adminsLoading } = useQuery<AdminPaymentInfo[]>({
    queryKey: ["payment-admins", profile?.organization_id],
    queryFn: async () => {
      const { data } = await api.get("/payments/initiate/admins");
      return data || [];
    },
    enabled: !!profile?.organization_id,
  });

  useEffect(() => {
    if (admins.length > 0 && !selectedAdmin) {
      setSelectedAdmin(admins[0]);
    }
  }, [admins, selectedAdmin]);

  // ─── Fetch Payment History ────────────────────────────────────────────────
  const { data: paymentHistory = [], isLoading: historyLoading } = useQuery<PaymentTransactionDto[]>({
    queryKey: ["payment-history", activeChild?.id],
    queryFn: async () => {
      const { data } = await api.get("/payments/history");
      // Filter transactions related to active child
      return (data || []).filter((tx: any) => tx.studentId === activeChild?.id || tx.studentName === activeChild?.fullName);
    },
    enabled: !!activeChild?.id,
  });

  // ─── Computed stats ────────────────────────────────────────────────────────
  const avgGrade = grades.length
    ? Math.round(grades.reduce((s, g) => s + (g.score / Math.max(1, g.maxScore)) * 100, 0) / grades.length)
    : null;

  const totalPresent = attendance.filter(a => a.status === "PRESENT").length;
  const totalLate = attendance.filter(a => a.status === "LATE").length;
  const totalAbsent = attendance.filter(a => a.status === "ABSENT").length;

  const attendanceRate = attendance.length
    ? Math.round((totalPresent / attendance.length) * 100)
    : null;

  const pieData = [
    { name: "Keldi", value: totalPresent, color: "#10b981" },
    { name: "Kech qoldi", value: totalLate, color: "#f59e0b" },
    { name: "Kelmadi", value: totalAbsent, color: "#ef4444" },
  ].filter(d => d.value > 0);

  // ─── Copier helper ─────────────────────────────────────────────────────────
  const copyCard = async (cardNumber: string) => {
    if (!cardNumber) return;
    await navigator.clipboard.writeText(cardNumber.replace(/\s/g, ""));
    toast.success("Karta raqami nusxalandi! 💳");
  };

  // ─── Dropzone triggers ─────────────────────────────────────────────────────
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onPickFile(e.dataTransfer.files[0]);
    }
  };

  const onPickFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Iltimos, faqat rasm fayl yuklang (JPG, PNG)");
    if (f.size > 5 * 1024 * 1024) return toast.error("Rasm hajmi 5MB dan kichik bo'lishi kerak");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  // ─── Payment Mutation ──────────────────────────────────────────────────────
  const initiateMutation = useMutation({
    mutationFn: async (payload: { amount: number; note: string; paymentProofUrl: string; adminId: string; studentId: string }) => {
      return api.post("/payments/initiate", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-history"] });
      toast.success("To'lov cheki yuborildi! Administrator tasdiqlashini kuting. 🎉");
      setAmount("");
      setNote("");
      setFile(null);
      setPreview(null);
      
      // Celebration Confetti
      import("canvas-confetti").then(({ default: confetti }) => {
        confetti({ particleCount: 120, spread: 80 });
      });

      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "To'lovni yuborishda xatolik");
    },
  });

  const submitPayment = async () => {
    if (!profile?.organization_id) return toast.error("Tashkilot aniqlanmadi");
    if (!selectedAdmin) return toast.error("To'lov qabul qiluvchi adminni tanlang");
    const amt = Number(amount);
    if (!amt || amt < 1000) return toast.error("To'lov summasi kamida 1,000 so'm bo'lishi kerak");
    if (!file) return toast.error("Iltimos, to'lov cheki rasmini yuklang");
    if (!activeChild) return toast.error("Farzandingiz aniqlanmadi");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const publicUrl = res.data;

      initiateMutation.mutate({
        amount: amt,
        note: note || "",
        paymentProofUrl: publicUrl,
        adminId: selectedAdmin.id,
        studentId: activeChild.id,
      });
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || "Chekni yuklashda xatolik yuz berdi");
    }
  };

  // Filter feedbacks
  const feedbacks = grades.filter(g => g.comment && g.comment.trim() !== "");

  // Leaderboard ranking of selected child
  const childRank = leaderboard.findIndex(u => u.id === activeChild?.id || u.fullName === activeChild?.fullName) + 1;

  if (childrenLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <TigerPlayer text="Tizim ma'lumotlari yuklanmoqda..." size={220} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* ─── Header greeting banner ──────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative overflow-hidden rounded-3xl p-6 md:p-8
                        bg-gradient-to-br from-rose-500 via-pink-500 to-purple-600 text-white shadow-xl">
          {/* Futuristic blurry vector designs */}
          <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md
                              grid place-items-center ring-4 ring-white/25 shadow-2xl">
                <Heart className="h-8 w-8 text-white fill-white/10" />
              </div>
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">
                  {profile?.full_name || profile?.username || "Ota-ona"} 👋
                </h1>
                <p className="text-white/85 text-xs md:text-sm font-medium mt-1">
                  Farzandingiz ta'lim jarayonini 100% ishonch bilan real-time kuzatib boring
                </p>
              </div>
            </div>

            {/* Always visible child picker with dropdown */}
            <div className="relative self-start md:self-auto min-w-[240px]">
              <button
                onClick={() => setDropdownOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl
                           bg-white/15 backdrop-blur-md border border-white/20
                           text-white font-semibold hover:bg-white/25 transition-all shadow-md"
              >
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-white/25 text-white font-extrabold text-xs grid place-items-center">
                    {(activeChild?.fullName || activeChild?.username || "?")[0].toUpperCase()}
                  </div>
                  <span className="text-sm truncate max-w-[140px]">
                    {activeChild?.fullName || activeChild?.username}
                  </span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full mt-2 left-0 right-0 z-50 rounded-2xl overflow-hidden
                               bg-card border border-border shadow-2xl"
                  >
                    {children.map((c, idx) => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedChildId(c.id); setDropdownOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left
                                   hover:bg-muted/70 transition-colors
                                   ${c.id === activeChild?.id ? "bg-primary/10 text-primary" : "text-foreground"}`}
                      >
                        <div className={`h-8 w-8 rounded-xl bg-gradient-to-br
                                        ${GRADIENT_BY_IDX[idx % 4] || "from-pink-500 to-rose-600"}
                                        grid place-items-center text-white font-extrabold text-xs`}>
                          {(c.fullName || c.username || "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{c.fullName || c.username}</p>
                          <p className="text-[10px] text-muted-foreground">O'quvchi</p>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {children.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-white/10 rounded-2xl glass">
          <Users className="h-14 w-14 mx-auto text-slate-300 dark:text-slate-600 mb-4 animate-bounce" />
          <p className="font-bold text-slate-700 dark:text-slate-300 text-lg mb-1">
            Farzandlar hali bog'lanmagan
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Administrator sizga farzandingizni bog'laganidan keyin barcha akademik natijalar va to'lovlar shu yerda paydo bo'ladi.
          </p>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Left panel: selected child overview */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-5 rounded-2xl border border-border bg-card shadow-sm flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600" />
              <div className="mt-4 h-20 w-20 rounded-3xl bg-gradient-to-br from-purple-500 to-rose-500 text-white font-black text-3xl grid place-items-center shadow-lg">
                {(activeChild?.fullName || activeChild?.username || "?")[0].toUpperCase()}
              </div>
              <h2 className="mt-4 font-bold text-lg text-foreground truncate max-w-full">
                {activeChild?.fullName || activeChild?.username}
              </h2>
              <Badge variant="outline" className="mt-1 text-[10px] font-bold text-purple-500 border-purple-500/20 bg-purple-500/5">
                FAOL O'QUVCHI
              </Badge>

              <div className="w-full border-t border-border my-5" />

              <div className="w-full space-y-3.5">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Coins className="h-4 w-4 text-amber-500" /> Tangalar:
                  </span>
                  <span className="font-extrabold text-amber-500 text-base">
                    {activeChild?.coins ?? 0}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-yellow-500" /> Reyting:
                  </span>
                  <span className="font-extrabold text-foreground">
                    {childRank > 0 ? `#${childRank}` : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <CalendarCheck2 className="h-4 w-4 text-emerald-500" /> Davomat:
                  </span>
                  <span className="font-extrabold text-emerald-500">
                    {attendanceRate !== null ? `${attendanceRate}%` : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-violet-500" /> O'rtacha baho:
                  </span>
                  <span className="font-extrabold text-violet-500">
                    {avgGrade !== null ? `${avgGrade}%` : "—"}
                  </span>
                </div>
              </div>
            </Card>

            {/* Elegant Tab Switcher */}
            <div className="flex flex-col gap-2 bg-muted/65 p-2 rounded-2xl border border-border">
              <button
                onClick={() => setActiveTab("academics")}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-sm text-left transition-smooth
                            ${activeTab === "academics" ? "bg-background text-primary shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}
              >
                <BookOpen className="h-4.5 w-4.5" />
                <span>Akademik natijalar</span>
              </button>
              <button
                onClick={() => setActiveTab("gamification")}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-sm text-left transition-smooth
                            ${activeTab === "gamification" ? "bg-background text-primary shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Trophy className="h-4.5 w-4.5" />
                <span>Reyting & Mukofot</span>
              </button>
              <button
                onClick={() => setActiveTab("finance")}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl font-bold text-sm text-left transition-smooth
                            ${activeTab === "finance" ? "bg-background text-primary shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Wallet className="h-4.5 w-4.5" />
                <span>To'lovlar markazi</span>
              </button>
            </div>
          </div>

          {/* Right panel: Active tab content */}
          <div className="lg:col-span-3 space-y-6">
            <AnimatePresence mode="wait">
              {activeTab === "academics" && (
                <motion.div
                  key="academics"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Academic Metrics Row */}
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Recharts Circular/Pie attendance summary */}
                    <Card className="p-5 rounded-2xl border border-border bg-card shadow-sm flex flex-col md:col-span-1 justify-between">
                      <h3 className="font-bold text-sm text-foreground mb-2">Davomat foizi</h3>
                      {attendanceLoading ? (
                        <div className="h-40 w-full animate-pulse bg-muted rounded-xl" />
                      ) : attendance.length === 0 ? (
                        <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
                          Hali davomat belgilanmagan
                        </div>
                      ) : (
                        <div className="h-36 relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieData}
                                innerRadius={35}
                                outerRadius={50}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {pieData.map((entry, idx) => (
                                  <Cell key={idx} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-lg font-black text-emerald-500">{attendanceRate}%</span>
                            <span className="text-[9px] text-muted-foreground uppercase font-bold">Kelgan</span>
                          </div>
                        </div>
                      )}
                      <div className="flex justify-around text-[10px] font-bold text-muted-foreground border-t border-border pt-3 mt-1">
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Keldi ({totalPresent})</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Kech ({totalLate})</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Kelmadi ({totalAbsent})</span>
                      </div>
                    </Card>

                    {/* Progress details of child */}
                    <Card className="p-5 rounded-2xl border border-border bg-card shadow-sm md:col-span-2">
                      <h3 className="font-bold text-sm text-foreground mb-4">Fanlararo o'zlashtirish</h3>
                      {gradesLoading ? (
                        <div className="space-y-3.5">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                      ) : grades.length === 0 ? (
                        <div className="py-8 text-center text-xs text-muted-foreground">
                          Baholar hali kiritilmagan
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-[170px] overflow-y-auto pr-1">
                          {grades.slice(0, 5).map((g, idx) => {
                            const pct = Math.round((g.score / Math.max(1, g.maxScore)) * 100);
                            const color = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-rose-500";
                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                                  <span>{g.subjectName || "Baho"}</span>
                                  <span>{g.score} / {g.maxScore} ({pct}%)</span>
                                </div>
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    className={`h-full rounded-full ${color}`}
                                    transition={{ duration: 0.6 }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  </div>

                  {/* Read-Only Grades Table */}
                  <Card className="p-5 rounded-2xl border border-border bg-card shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                      <div>
                        <h3 className="font-bold text-base text-foreground">Barcha baholar (Read-only)</h3>
                        <p className="text-xs text-muted-foreground">Taqdim etilgan ballar va nazorat ishlari reyestri</p>
                      </div>
                      <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Fanni qidirish..."
                          value={gradeSearch}
                          onChange={(e) => setGradeSearch(e.target.value)}
                          className="pl-9 h-9 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-border">
                      <table className="w-full border-collapse text-sm text-left">
                        <thead>
                          <tr className="bg-muted/70 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                            <th className="px-4 py-3">Fan nomi</th>
                            <th className="px-4 py-3 text-center">To'plangan ball</th>
                            <th className="px-4 py-3 text-center">Maksimal ball</th>
                            <th className="px-4 py-3 text-center">Natija</th>
                            <th className="px-4 py-3">Sana</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gradesLoading ? (
                            <tr>
                              <td colSpan={5} className="py-4 text-center"><Skeleton className="h-6 w-32 mx-auto" /></td>
                            </tr>
                          ) : grades.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-muted-foreground">Baholar mavjud emas</td>
                            </tr>
                          ) : (
                            grades
                              .filter(g => g.subjectName?.toLowerCase().includes(gradeSearch.toLowerCase()))
                              .map((g, idx) => {
                                const pct = Math.round((g.score / Math.max(1, g.maxScore)) * 100);
                                return (
                                  <tr key={idx} className="border-b border-border hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3 font-semibold text-foreground">{g.subjectName}</td>
                                    <td className="px-4 py-3 text-center font-bold text-primary">{g.score}</td>
                                    <td className="px-4 py-3 text-center text-muted-foreground">{g.maxScore}</td>
                                    <td className="px-4 py-3 text-center">
                                      <Badge variant="outline" className={`font-bold ${
                                        pct >= 80 ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" :
                                        pct >= 60 ? "text-amber-500 border-amber-500/20 bg-amber-500/5" :
                                        "text-rose-500 border-rose-500/20 bg-rose-500/5"
                                      }`}>
                                        {pct}%
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground text-xs">
                                      {new Date(g.createdAt).toLocaleDateString("uz-UZ")}
                                    </td>
                                  </tr>
                                );
                              })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  {/* Teacher Feedback Board */}
                  <Card className="p-5 rounded-2xl border border-border bg-card shadow-sm">
                    <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-1.5">
                      <MessageSquare className="h-4.5 w-4.5 text-purple-500" />
                      O'qituvchilar izohlari va fikr-mulohazalari
                    </h3>
                    {gradesLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : feedbacks.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground text-xs">
                        Hozircha ustozlar tomonidan bildirilgan fikrlar mavjud emas
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {feedbacks.map((f, idx) => (
                          <div key={idx} className="relative rounded-2xl border border-border bg-muted/20 p-4 pl-5">
                            <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-purple-500 to-rose-500 rounded-l-2xl" />
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-xs uppercase text-purple-600 dark:text-purple-400">
                                {f.subjectName}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(f.createdAt).toLocaleDateString("uz-UZ")}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-foreground italic font-medium">
                              "{f.comment}"
                            </p>
                            <p className="mt-2 text-[10px] text-muted-foreground text-right font-bold">
                              — O'qituvchidan
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </motion.div>
              )}

              {activeTab === "gamification" && (
                <motion.div
                  key="gamification"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="grid md:grid-cols-3 gap-6">
                    <Card className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between md:col-span-1 text-center items-center relative overflow-hidden">
                      <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl" />
                      <Coins className="h-12 w-12 text-amber-500 animate-spin" style={{ animationDuration: "12s" }} />
                      <h3 className="font-bold text-lg text-foreground mt-4">Tanga balansi</h3>
                      <p className="text-3xl font-black text-amber-500 mt-2">
                        {activeChild?.coins ?? 0}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-2 max-w-[160px]">
                        Darsdagi faollik, to'liq to'lov yoki a'lo baholar uchun taqdirlangan tangalar
                      </p>
                    </Card>

                    {/* Leaderboard Position */}
                    <Card className="p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col justify-between md:col-span-2 relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-sm text-foreground">Global Reytingdagi O'rni</h3>
                        <Trophy className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div className="flex items-baseline gap-2 mt-4">
                        <p className="text-5xl font-black text-primary">
                          {childRank > 0 ? `#${childRank}` : "—"}
                        </p>
                        <p className="text-xs text-muted-foreground font-bold">
                          o'quv markaz bo'yicha
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-4">
                        Tashkilotdagi o'quvchilar yig'gan tangalari asosidagi o'rni.
                      </p>
                    </Card>
                  </div>

                  {/* Top Leaders in the center */}
                  <Card className="p-5 rounded-2xl border border-border bg-card shadow-sm">
                    <h3 className="font-bold text-sm text-foreground mb-4 flex items-center gap-1.5">
                      <Trophy className="h-4.5 w-4.5 text-yellow-500" />
                      Top O'quvchilar Reytingi (Leaderboard)
                    </h3>
                    <div className="space-y-3">
                      {leaderboardLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ) : leaderboard.length === 0 ? (
                        <p className="text-center text-xs text-muted-foreground py-4">Leaderboard yuklanmadi</p>
                      ) : (
                        leaderboard.slice(0, 5).map((u: any, idx) => {
                          const isMe = u.id === activeChild?.id || u.fullName === activeChild?.fullName;
                          return (
                            <div
                              key={idx}
                              className={`flex items-center justify-between p-3 rounded-xl border transition-colors
                                         ${isMe ? "bg-primary/10 border-primary/25" : "bg-muted/30 border-border hover:bg-muted/65"}`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`w-6 text-center text-xs font-black ${
                                  idx === 0 ? "text-yellow-500" :
                                  idx === 1 ? "text-slate-400" :
                                  idx === 2 ? "text-amber-600" : "text-muted-foreground"
                                }`}>
                                  {idx + 1}
                                </span>
                                <div className="h-7 w-7 rounded-lg bg-gradient-premium grid place-items-center text-white text-[10px] font-black uppercase">
                                  {(u.fullName || "?")[0]}
                                </div>
                                <span className="font-bold text-sm text-foreground truncate max-w-[200px]">
                                  {u.fullName} {isMe && <Badge className="ml-1 text-[9px] bg-primary text-white">Farzandingiz</Badge>}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Coins className="h-3.5 w-3.5 text-amber-500" />
                                <span className="font-extrabold text-sm text-amber-500">{u.coins || 0}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </Card>
                </motion.div>
              )}

              {activeTab === "finance" && (
                <motion.div
                  key="finance"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Top card with receivers and checkout */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Admins card list */}
                    <Card className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4">
                      <div>
                        <h3 className="font-bold text-sm text-foreground flex items-center gap-1">
                          <ShieldCheck className="h-4.5 w-4.5 text-primary" />
                          To'lov rekvizitlari
                        </h3>
                        <p className="text-xs text-muted-foreground">Admin kartasiga pul o'tkazing va chekni o'ng tomonga yuklang</p>
                      </div>

                      {adminsLoading ? (
                        <div className="space-y-2">
                          <Skeleton className="h-16 w-full" />
                        </div>
                      ) : admins.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4">Tashkilot adminlari topilmadi</p>
                      ) : (
                        <div className="space-y-3">
                          {admins.map((adm, idx) => (
                            <div
                              key={idx}
                              onClick={() => setSelectedAdmin(adm)}
                              className={`p-3.5 rounded-xl border cursor-pointer transition-all
                                         ${selectedAdmin?.id === adm.id ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-muted/40"}`}
                            >
                              <div className="flex justify-between items-start">
                                <span className="font-bold text-xs text-foreground uppercase">{adm.fullName}</span>
                                {selectedAdmin?.id === adm.id && <Badge className="text-[8px] bg-primary text-white">TANLANDI</Badge>}
                              </div>
                              {adm.cardNumber ? (
                                <div className="flex items-center justify-between bg-muted/65 p-2 rounded-lg mt-2 text-xs">
                                  <span className="font-mono tracking-widest text-slate-800 dark:text-slate-200">
                                    {adm.cardNumber.replace(/(\d{4})/g, "$1 ").trim()}
                                  </span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); copyCard(adm.cardNumber || ""); }}
                                    className="p-1 rounded hover:bg-muted-foreground/10 text-muted-foreground hover:text-foreground"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <p className="text-[10px] text-muted-foreground mt-2">Karta biriktirilmagan</p>
                              )}
                              <p className="text-[10px] text-muted-foreground mt-1">Sohibi: {adm.cardHolder || "Noma'lum"}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>

                    {/* Initiate Payment / Receipt dropzone */}
                    <Card className="p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4">
                      <h3 className="font-bold text-sm text-foreground">To'lovni tasdiqlash (Chek yuklash)</h3>

                      <div className="space-y-3 text-xs">
                        <div className="space-y-1">
                          <label className="font-bold text-muted-foreground">To'lov summasi (so'm)</label>
                          <Input
                            type="number"
                            placeholder="Masalan, 500000"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="rounded-xl h-9.5"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-muted-foreground">To'lov uchun izoh</label>
                          <Input
                            placeholder="Farzand ismi, oy nomi yoki guruh izohi"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="rounded-xl h-9.5"
                          />
                        </div>

                        {/* Dropzone Container */}
                        <div
                          onDragEnter={handleDrag}
                          onDragOver={handleDrag}
                          onDragLeave={handleDrag}
                          onDrop={handleDrop}
                          className={`relative border-2 border-dashed rounded-xl p-4 transition-all flex flex-col items-center justify-center cursor-pointer text-center
                                     ${dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 bg-muted/15"}`}
                          onClick={() => fileRef.current?.click()}
                        >
                          <input
                            type="file"
                            ref={fileRef}
                            onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                            className="hidden"
                            accept="image/*"
                          />
                          {preview ? (
                            <div className="relative">
                              <img src={preview} className="h-24 object-contain rounded border" alt="receipt preview" />
                              <p className="text-[9px] text-muted-foreground mt-1 truncate max-w-[160px]">{file?.name}</p>
                            </div>
                          ) : (
                            <>
                              <UploadCloud className="h-7 w-7 text-primary mb-1" />
                              <p className="font-bold text-[10px] text-foreground">Chek rasmini sudrab keling yoki bosing</p>
                              <p className="text-[8px] text-muted-foreground mt-0.5">PNG, JPG, JPEG (Maks. 5MB)</p>
                            </>
                          )}
                        </div>

                        <Button
                          onClick={submitPayment}
                          className="w-full rounded-xl py-4 font-bold text-sm shadow-md"
                          disabled={initiateMutation.isPending}
                        >
                          {initiateMutation.isPending ? "Yuborilmoqda..." : "Chekni tasdiqlash uchun yuborish"}
                        </Button>
                      </div>
                    </Card>
                  </div>

                  {/* Payment History */}
                  <Card className="p-5 rounded-2xl border border-border bg-card shadow-sm">
                    <h3 className="font-bold text-sm text-foreground mb-4">To'lovlar tarixi</h3>

                    <div className="overflow-x-auto rounded-xl border border-border">
                      <table className="w-full border-collapse text-sm text-left">
                        <thead>
                          <tr className="bg-muted/70 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                            <th className="px-4 py-3">Sana</th>
                            <th className="px-4 py-3">Summa</th>
                            <th className="px-4 py-3">Izoh</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-center">Chek</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyLoading ? (
                            <tr>
                              <td colSpan={5} className="py-4 text-center"><Skeleton className="h-6 w-32 mx-auto" /></td>
                            </tr>
                          ) : paymentHistory.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-muted-foreground">To'lovlar tarixi mavjud emas</td>
                            </tr>
                          ) : (
                            paymentHistory.map((tx, idx) => (
                              <tr key={idx} className="border-b border-border hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-muted-foreground text-xs">
                                  {new Date(tx.createdAt).toLocaleDateString("uz-UZ")}
                                </td>
                                <td className="px-4 py-3 font-bold text-foreground">
                                  {tx.amount.toLocaleString()} UZS
                                </td>
                                <td className="px-4 py-3 text-muted-foreground truncate max-w-[140px]" title={tx.note}>
                                  {tx.note || "Izohsiz"}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Badge className={`text-[10px] font-bold border ${STATUS_COLORS[tx.status] || "bg-muted border-border"}`}>
                                    {tx.status}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {tx.paymentProofUrl ? (
                                    <a
                                      href={tx.paymentProofUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-xs font-bold text-primary hover:underline flex items-center justify-center gap-1"
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                      Ko'rish
                                    </a>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
