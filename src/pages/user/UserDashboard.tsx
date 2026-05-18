import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/axios";
import {
  Target,
  Activity,
  CalendarDays,
  Clock,
  Flame,
  ArrowRight,
  Copy,
  Send,
  ChevronRight,
  Crown,
  Layers,
  Sparkles,
  Leaf,
  FileText,
  Gift
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import DonationCard from "@/components/DonationCard";
import DailyTasks from "@/components/DailyTasks";
import { useTheme } from "@/contexts/ThemeContext";
import TigerPlayer from "@/components/TigerPlayer";

interface DailyData {
  day: string;
  minutes: number;
}

interface UserStats {
  totalMinutes: number;
  streak: number;
  targetBand: number | null;
  avgScore: number | null;
  examDaysLeft: number | null;
  weeklyData: DailyData[];
}

interface FreeExam {
  id: string;
  title: string;
  description?: string;
  type: string;
  durationMinutes: number;
  difficulty: string;
  requiredPack?: string;
}

const DIFFICULTY_META: Record<string, { label: string; cls: string; icon: any }> = {
  easy:   { label: "Oson",  cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", icon: Leaf },
  medium: { label: "O'rta", cls: "bg-amber-500/15 text-amber-700 border-amber-500/30",      icon: Sparkles },
  hard:   { label: "Qiyin", cls: "bg-rose-500/15 text-rose-700 border-rose-500/30",          icon: FileText },
};

export default function UserDashboard() {
  const { profile, user, refresh } = useAuth();
  const { theme } = useTheme();
  const { t: _t } = useTranslation();
  const navigate = useNavigate();

  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [examDate, setExamDate] = useState<string>("");
  const [savingExam, setSavingExam] = useState(false);

  // Free Tier Diagnostic exams state
  const [freeExams, setFreeExams] = useState<FreeExam[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/user/stats");
        setStats(res.data);
      } catch (e) {
        console.error("Stats fetch failed", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchFreeExams = async () => {
      try {
        const { data } = await api.get("/admin/exams");
        const mapped = (data || []).map((e: any) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          type: e.type,
          durationMinutes: e.durationMinutes || e.duration_minutes || 60,
          difficulty: e.difficulty || "easy",
          requiredPack: e.requiredPack || e.required_pack || "free"
        }));

        // Filter: Mock exams having free tier access or diagnostic type
        const filtered = mapped.filter((e: any) =>
          e.requiredPack === "free" || !e.requiredPack || String(e.type).toLowerCase() === "diagnostic"
        );
        setFreeExams(filtered);
      } catch (err) {
        console.error("Free exams fetch failed", err);
      } finally {
        setLoadingExams(false);
      }
    };
    fetchFreeExams();
  }, []);

  useEffect(() => {
    if (profile?.exam_date) {
      setExamDate(profile.exam_date);
    }
  }, [profile?.exam_date]);

  const saveExamDate = async () => {
    if (!examDate) return;
    setSavingExam(true);
    try {
      await api.put("/user/profile", { examDate });
      toast.success("Imtihon sanasi saqlandi ✅", {
        description: "Sizga har kuni eslatmalar yuboramiz",
      });
      await refresh();
      const res = await api.get("/user/stats");
      setStats(res.data);
      setOpenKey(null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Xatolik yuz berdi");
    } finally {
      setSavingExam(false);
    }
  };

  const greet = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Xayrli tong";
    if (h < 18) return "Xayrli kun";
    return "Xayrli kech";
  })();

  const isDark = theme === "dark";

  const statCards = [
    {
      key: "target",
      label: "Target Band",
      value: stats?.targetBand ? stats.targetBand.toFixed(1) : "--",
      icon: Target,
      color: isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-100",
    },
    {
      key: "avg",
      label: "O'rtacha ball",
      value: stats?.avgScore ? stats.avgScore.toFixed(1) : "--",
      icon: Activity,
      color: isDark ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "bg-violet-50 text-violet-600 border-violet-100",
    },
    {
      key: "exam",
      label: "Imtihongacha",
      value: (stats?.examDaysLeft !== null && stats?.examDaysLeft !== undefined) ? `${stats?.examDaysLeft} kun` : "--",
      icon: CalendarDays,
      color: isDark ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-rose-50 text-rose-600 border-rose-100",
    },
    {
      key: "minutes",
      label: "Mashq vaqti",
      value: `${(stats?.totalMinutes || 0).toFixed(1)} m`,
      icon: Clock,
      color: isDark ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-orange-50 text-orange-600 border-orange-100",
    },
    {
      key: "streak",
      label: "Kunlik streak",
      value: stats?.streak ?? 0,
      icon: Flame,
      color: isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-600 border-emerald-100",
    },
  ];

  const maxMin = useMemo(() => Math.max(1, ...(stats?.weeklyData?.map((d) => d.minutes) || [0])), [stats]);
  const activeDays = useMemo(() => stats?.weeklyData?.filter((d) => d.minutes > 0).length || 0, [stats]);
  const avgMin = useMemo(
    () => ((stats?.totalMinutes || 0) / Math.max(1, activeDays || 1)).toFixed(1),
    [stats, activeDays]
  );

  const modal = (() => {
    if (!openKey) return null;
    const common = { open: true, onOpenChange: (v: boolean) => !v && setOpenKey(null) };
    const dialogClass = isDark ? "bg-slate-950 border-white/10 text-white" : "bg-white border-slate-200 text-slate-900";
    const descClass = isDark ? "text-slate-400" : "text-slate-500";
    const labelClass = isDark ? "text-slate-300" : "text-slate-600";
    const inputClass = isDark ? "bg-white/5 border-white/10 text-white" : "bg-slate-50 border-slate-200 text-slate-900";
    const itemClass = isDark ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100";

    switch (openKey) {
      case "target":
        return (
          <Dialog {...common}>
            <DialogContent className={cn(dialogClass, "shadow-2xl rounded-2xl")}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">🎯 Target Band</DialogTitle>
                <DialogDescription className={descClass}>
                  O'zingizga maqsadli IELTS bandini belgilang.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                 <p className={cn("text-sm font-medium", labelClass)}>Sizning joriy maqsadingiz: <span className="text-blue-500 font-bold">{stats?.targetBand || "Belgilanmagan"}</span></p>
                 <Button onClick={() => navigate("/user/profile")} className="w-full bg-[#00c2ff] hover:bg-[#00a8e0] text-white font-bold h-12 rounded-xl">Profilni tahrirlash</Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      case "avg":
        return (
          <Dialog {...common}>
            <DialogContent className={cn(dialogClass, "shadow-2xl rounded-2xl")}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">📊 O'rtacha ball</DialogTitle>
                <DialogDescription className={descClass}>
                  Mock testlar yakunlanganda o'rtacha bandingiz shu yerda ko'rinadi.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                 <Button onClick={() => navigate("/user/mocks")} className="w-full bg-[#00c2ff] hover:bg-[#00a8e0] text-white font-bold h-12 rounded-xl">Mock testlarga o'tish</Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      case "exam":
        return (
          <Dialog {...common}>
            <DialogContent className={cn(dialogClass, "shadow-2xl rounded-2xl")}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">🗓️ Imtihon sanasi</DialogTitle>
                <DialogDescription className={descClass}>
                  Imtihon sanangizni kiriting — biz sizga countdown ko'rsatamiz.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {stats?.examDaysLeft !== null && (
                  <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 text-white p-6 text-center shadow-lg shadow-rose-500/20">
                    <p className="text-xs uppercase tracking-widest opacity-80 font-bold">Qoldi</p>
                    <p className="font-display text-4xl font-bold mt-2">
                      {stats?.examDaysLeft} <span className="text-lg opacity-80 font-normal">kun</span>
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <label className={cn("text-sm font-semibold", labelClass)}>Imtihon sanasi</label>
                  <input
                    type="date"
                    value={examDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setExamDate(e.target.value)}
                    className={cn("w-full h-11 px-3 rounded-md border outline-none focus:ring-2 focus:ring-rose-500 transition-all", inputClass)}
                  />
                </div>
                <Button
                  onClick={saveExamDate}
                  disabled={!examDate || savingExam}
                  className="w-full h-12 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold transition-all shadow-lg shadow-rose-500/20"
                >
                  {savingExam ? "Saqlanmoqda..." : "Saqlash"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      case "minutes":
        return (
          <Dialog {...common}>
            <DialogContent className={cn(dialogClass, "shadow-2xl rounded-2xl")}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">⏱️ Mashq vaqti</DialogTitle>
                <DialogDescription className={descClass}>So'nggi 7 kunlik mashq tafsiloti</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4 text-sm">
                <div className={cn("flex justify-between p-3 rounded-xl border", itemClass)}><span>Jami</span><b>{(stats?.totalMinutes || 0).toFixed(1)} min</b></div>
                <div className={cn("flex justify-between p-3 rounded-xl border", itemClass)}><span>Faol kunlar</span><b>{activeDays} / 7</b></div>
                <div className={cn("flex justify-between p-3 rounded-xl border", itemClass)}><span>Kunlik o'rtacha</span><b>{avgMin} min</b></div>
                <div className={cn("flex justify-between p-3 rounded-xl border", itemClass)}><span>Eng yaxshi kun</span><b>{maxMin.toFixed(1)} min</b></div>
                <Button onClick={() => navigate("/user/speaking")} className="w-full mt-4 h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg shadow-orange-500/20">AI Speaking bilan mashq</Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      case "streak":
        return (
          <Dialog {...common}>
            <DialogContent className={cn(dialogClass, "shadow-2xl rounded-2xl")}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">🔥 Kunlik streak</DialogTitle>
                <DialogDescription className={descClass}>
                  Siz <b>{stats?.streak}</b> kun ketma-ket mashq qildingiz.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap gap-2 py-4">
                {stats?.weeklyData?.map((d) => (
                  <span
                    key={d.day}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${d.minutes > 0 ? "bg-emerald-500 text-white" : isDark ? "bg-white/5 text-slate-500" : "bg-slate-100 text-slate-400"}`}
                  >
                    {d.day}
                  </span>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        );
    }
    return null;
  })();

  return (
    <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto min-h-screen">
      {modal}
      
      {/* Greeting card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="relative overflow-hidden p-8 md:p-10 bg-gradient-to-r from-[#10b981] to-[#0d9488] text-white border-0 shadow-2xl shadow-emerald-500/20 rounded-[2rem]">
          <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden md:flex opacity-100 pointer-events-none">
            <TigerPlayer text={`Salom, ${profile?.firstName || profile?.username || 'Do\'st'}!`} size={220} />
          </div>
          <div className="relative">
             <div className="bg-white/10 w-fit px-4 py-1.5 rounded-full backdrop-blur-md text-xs font-bold mb-6 flex items-center gap-2">
               <span className="opacity-80 font-medium">{greet}</span> <span>👋</span>
             </div>
            <h1 className="font-display text-3xl md:text-5xl font-black tracking-tight mt-1">
              Xush kelibsiz,<br/> {String(profile?.firstName || user?.username || 'Do\'st')}!
            </h1>
            <p className="opacity-90 mt-6 text-lg font-medium max-w-md leading-relaxed text-emerald-50">
              Har bir qadam sizni <span className="font-bold underline decoration-white/30 decoration-2 underline-offset-4">Band 9</span> ga yaqinlashtiradi.
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Onboarding Welcome Call-to-Action Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-6 md:p-8 bg-gradient-to-br from-purple-600/10 via-indigo-600/5 to-pink-500/10 backdrop-blur-xl border border-purple-500/20 rounded-[2.5rem] shadow-xl overflow-hidden relative group">
          <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-purple-500/20 blur-2xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <Badge className="bg-purple-500 text-white uppercase text-[10px] tracking-widest font-black py-1 px-3.5 rounded-full">
                Onboarding Portal
              </Badge>
              <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white leading-tight">
                Xush kelibsiz! Ta'limni boshlash uchun paket tanlang yoki markazimiz filialiga murojaat qiling
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Premium mock testlar, AI speaking mashqlari va o'quv planlari sizni kutmoqda!
              </p>
            </div>
            <Button
              onClick={() => navigate("/user/subscriptions")}
              className="bg-gradient-primary hover:opacity-90 text-white px-8 h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20 shrink-0 flex items-center gap-2 group/btn"
            >
              Ta'riflarni Tanlash <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Free Tier Diagnostic Tests Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-black text-2xl text-slate-800 dark:text-white flex items-center gap-2">
              Mening Bepul Testlarim <Gift className="h-6 w-6 text-emerald-500 animate-pulse" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Sotib olmasdan darhol topshirishingiz mumkin bo'lgan diagnostic testlar ro'yxati
            </p>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3.5 py-1.5 rounded-full font-black text-[10px] uppercase">
            Free Tier Mocks
          </Badge>
        </div>

        {loadingExams ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-40 rounded-3xl bg-slate-100 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : freeExams.length === 0 ? (
          <Card className="p-8 text-center bg-white/40 dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 rounded-3xl">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Hozircha tizimda bepul diagnostic testlar mavjud emas.</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {freeExams.map((e, i) => {
              const diff = DIFFICULTY_META[e.difficulty] || DIFFICULTY_META.easy;
              const DIcon = diff.icon;

              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -4 }}
                  className="flex"
                >
                  <Card className="w-full p-6 bg-white/60 dark:bg-slate-900/60 border border-slate-100 dark:border-white/5 backdrop-blur-xl rounded-[2rem] shadow-lg flex flex-col justify-between group">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase text-[9px] font-bold tracking-wider rounded-full">
                          Diagnostic Free
                        </Badge>
                        <Badge variant="outline" className={`rounded-full ${diff.cls} text-[9px] px-2 py-0.5`}>
                          <DIcon className="h-3 w-3 mr-1" /> {diff.label}
                        </Badge>
                      </div>

                      <div>
                        <h4 className="font-bold text-base text-slate-800 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                          {e.title}
                        </h4>
                        {e.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {e.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {e.durationMinutes} daqiqa</span>
                        <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {e.type}</span>
                      </div>
                    </div>

                    <div className="pt-5 mt-4 border-t border-slate-100 dark:border-white/5">
                      <Button
                        onClick={() => navigate(`/user/mocks/take/${e.id}`)}
                        className="w-full h-11 bg-slate-100 dark:bg-white/5 hover:bg-primary hover:text-white text-slate-700 dark:text-slate-200 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all"
                      >
                        Boshlash <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.button
              type="button"
              onClick={() => setOpenKey(s.key)}
              key={s.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="text-left group"
            >
              <Card className={cn(
                "p-6 h-full transition-all duration-300 cursor-pointer border rounded-3xl",
                isDark 
                  ? "bg-slate-900/40 backdrop-blur-md border-white/5 shadow-xl group-hover:bg-slate-900/60 group-hover:border-white/10" 
                  : "bg-white border-slate-100 shadow-xl shadow-slate-200/40 group-hover:shadow-2xl group-hover:border-slate-200"
              )}>
                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center mb-5 border transition-transform group-hover:rotate-6 shadow-sm", s.color)}>
                  <Icon className="h-6 w-6" />
                </div>
                <p className={cn("font-display text-3xl font-black tracking-tight leading-none", isDark ? "text-white" : "text-slate-900")}>{s.value}</p>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-2">{s.label}</p>
              </Card>
            </motion.button>
          );
        })}
      </div>

      {/* Weekly chart */}
      <Card className={cn(
        "p-8 shadow-2xl rounded-[2rem] border",
        isDark ? "bg-slate-900/40 backdrop-blur-md border-white/5" : "bg-white border-slate-100 shadow-slate-200/50"
      )}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className={cn("font-display font-black text-2xl", isDark ? "text-white" : "text-slate-900")}>Haftalik natija</h3>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">so'nggi 7 kun</p>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-4 py-1.5 rounded-full font-black text-xs">
            Jami: {(stats?.totalMinutes || 0).toFixed(1)} min
          </Badge>
        </div>
        <div className="flex items-stretch justify-between gap-3 h-48 mt-12">
          {stats?.weeklyData?.map((d, i) => {
            const h = (d.minutes / maxMin) * 100;
            return (
              <div key={i} className="flex flex-col items-center flex-1 h-full group">
                <div className="flex-1 w-full flex items-end justify-center px-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(8, h)}%` }}
                    transition={{ duration: 1, delay: i * 0.1, ease: "circOut" }}
                    className="w-full max-w-[40px] bg-gradient-to-t from-emerald-600 to-teal-400 rounded-2xl min-h-[8px] relative shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all"
                  >
                     <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {d.minutes}m
                     </div>
                  </motion.div>
                </div>
                <span className="text-[11px] font-bold text-slate-500 mt-5 uppercase tracking-tighter">{d.day}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Right Column Widgets */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Telegram Card */}
        <Card className={cn(
          "p-8 shadow-2xl rounded-[2rem] group overflow-hidden relative border",
          isDark ? "bg-slate-900/40 backdrop-blur-md border-white/5" : "bg-white border-slate-100 shadow-slate-200/50"
        )}>
          <div className={cn("absolute -right-4 -top-4 h-32 w-32 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700", isDark ? "bg-blue-500/10" : "bg-blue-50")} />
          <div className="relative z-10">
            <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center mb-6 border transition-all", isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-100")}>
              <Send size={28} />
            </div>
            <h4 className={cn("font-display font-black text-2xl mb-3 tracking-tight", isDark ? "text-white" : "text-slate-900")}>Telegram kanalimiz</h4>
            <p className="text-slate-500 text-base font-medium leading-relaxed mb-8">
              IELTS va ingliz tili haqida foydali materiallar va yangiliklar.
            </p>
            <a
              href="https://t.me/LMSHub_uz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 text-blue-600 font-black text-sm uppercase tracking-widest group/link hover:text-blue-500 transition-colors"
            >
              Kanalga obuna bo'lish <ChevronRight size={18} className="group-hover/link:translate-x-2 transition-transform" />
            </a>
          </div>
        </Card>

        {/* Daily Tasks Widget */}
        <DailyTasks />
      </div>

      {/* Donation card */}
      <DonationCard />

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { to: "/user/leaderboard", label: "Peshqadamlar", emoji: "🏆", color: "from-amber-400 to-orange-500", shadow: "shadow-amber-500/10" },
          { to: "/user/achievements", label: "Yutuqlar", emoji: "🎖️", color: "from-blue-400 to-indigo-500", shadow: "shadow-blue-500/10" },
          { to: "/user/profile", label: "Hisob", emoji: "👤", color: "from-slate-400 to-slate-600", shadow: "shadow-slate-500/10" },
        ].map((q) => (
          <Link key={q.to} to={q.to}>
             <Card className={cn(
               "p-6 flex items-center justify-between hover:shadow-2xl transition-all duration-300 rounded-[1.5rem] border group relative overflow-hidden",
               isDark ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100 shadow-slate-200/30",
               q.shadow
             )}>
               <div className={`absolute left-0 top-0 w-1.5 h-full bg-gradient-to-b ${q.color}`} />
              <div className="flex items-center gap-5">
                <span className="text-4xl transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">{q.emoji}</span>
                <p className={cn("font-black uppercase tracking-wider text-sm", isDark ? "text-white" : "text-slate-700")}>{q.label}</p>
              </div>
              <div className={cn("h-10 w-10 rounded-full flex items-center justify-center transition-all shadow-inner", isDark ? "bg-white/5 group-hover:bg-white group-hover:text-slate-900" : "bg-slate-50 group-hover:bg-slate-900 group-hover:text-white")}>
                <ArrowRight size={20} />
              </div>
             </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
