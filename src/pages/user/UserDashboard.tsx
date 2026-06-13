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
  ChevronRight,
  Crown,
  Layers,
  Sparkles,
  Leaf,
  FileText,
  Send,
  Gift
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import DonationCard from "@/components/DonationCard";
import DailyTasks from "@/components/DailyTasks";
import { useTheme } from "@/contexts/ThemeContext";
import WelcomeBanner from "@/components/shared/WelcomeBanner";

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

const DIFFICULTY_META: Record<string, { labelKey: string; cls: string; icon: any }> = {
  easy:   { labelKey: "mockCategory.difficulty.easy",   cls: "bg-purple-500/15 text-purple-700 border-purple-500/30", icon: Leaf },
  medium: { labelKey: "mockCategory.difficulty.medium", cls: "bg-amber-500/15 text-amber-700 border-amber-500/30",      icon: Sparkles },
  hard:   { labelKey: "mockCategory.difficulty.hard",   cls: "bg-rose-500/15 text-rose-700 border-rose-500/30",          icon: FileText },
};

export default function UserDashboard() {
  const { profile, user, refresh } = useAuth();
  const { theme } = useTheme();
  const { t } = useTranslation();
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
      toast.success(t("userDashboard.toast.examDateSaved"), {
        description: t("userDashboard.toast.examDateDesc"),
      });
      await refresh();
      const res = await api.get("/user/stats");
      setStats(res.data);
      setOpenKey(null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || t("userDashboard.toast.errorOccurred"));
    } finally {
      setSavingExam(false);
    }
  };

  const isDark = theme === "dark";

  const statCards = [
    {
      key: "target",
      label: t("userDashboard.stats.targetBand"),
      value: stats?.targetBand ? stats.targetBand.toFixed(1) : "--",
      icon: Target,
      color: isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-100",
    },
    {
      key: "avg",
      label: t("userDashboard.stats.avgScore"),
      value: stats?.avgScore ? stats.avgScore.toFixed(1) : "--",
      icon: Activity,
      color: isDark ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "bg-violet-50 text-violet-600 border-violet-100",
    },
    {
      key: "exam",
      label: t("userDashboard.stats.daysLeft"),
      value: (stats?.examDaysLeft !== null && stats?.examDaysLeft !== undefined) ? t("userDashboard.stats.daysValue", { count: stats?.examDaysLeft }) : "--",
      icon: CalendarDays,
      color: isDark ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-rose-50 text-rose-600 border-rose-100",
    },
    {
      key: "minutes",
      label: t("userDashboard.stats.practiceTime"),
      value: t("userDashboard.stats.minutesValue", { count: (stats?.totalMinutes || 0).toFixed(1) }),
      icon: Clock,
      color: isDark ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : "bg-orange-50 text-orange-600 border-orange-100",
    },
    {
      key: "streak",
      label: t("userDashboard.stats.dailyStreak"),
      value: stats?.streak ?? 0,
      icon: Flame,
      color: isDark ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-purple-50 text-purple-600 border-purple-100",
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
                <DialogTitle className="flex items-center gap-2">🎯 {t("userDashboard.stats.targetBand")}</DialogTitle>
                <DialogDescription className={descClass}>
                  {t("userDashboard.modal.targetDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                 <p className={cn("text-sm font-medium", labelClass)}>{t("userDashboard.modal.currentGoal", { value: stats?.targetBand ? stats.targetBand.toFixed(1) : t("userDashboard.modal.notSet") })}</p>
                 <Button onClick={() => navigate("/user/profile")} className="w-full bg-[#00c2ff] hover:bg-[#00a8e0] text-white font-bold h-12 rounded-xl">{t("userDashboard.modal.editProfile")}</Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      case "avg":
        return (
          <Dialog {...common}>
            <DialogContent className={cn(dialogClass, "shadow-2xl rounded-2xl")}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">📊 {t("userDashboard.stats.avgScore")}</DialogTitle>
                <DialogDescription className={descClass}>
                  {t("userDashboard.modal.avgDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                 <Button onClick={() => navigate("/user/mocks")} className="w-full bg-[#00c2ff] hover:bg-[#00a8e0] text-white font-bold h-12 rounded-xl">{t("userDashboard.modal.viewMocks")}</Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      case "exam":
        return (
          <Dialog {...common}>
            <DialogContent className={cn(dialogClass, "shadow-2xl rounded-2xl")}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">🗓️ {t("userDashboard.modal.examDateTitle")}</DialogTitle>
                <DialogDescription className={descClass}>
                  {t("userDashboard.modal.examDateDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {stats?.examDaysLeft !== null && (
                  <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 text-white p-6 text-center shadow-lg shadow-rose-500/20">
                    <p className="text-xs uppercase tracking-widest opacity-80 font-bold">{t("userDashboard.modal.timeLeft")}</p>
                    <p className="font-display text-4xl font-bold mt-2">
                      {stats?.examDaysLeft} <span className="text-lg opacity-80 font-normal">{t("userDashboard.modal.days")}</span>
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <label className={cn("text-sm font-semibold", labelClass)}>{t("userDashboard.modal.examDateLabel")}</label>
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
                  {savingExam ? t("userDashboard.modal.saving") : t("userDashboard.modal.save")}
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
                <DialogTitle className="flex items-center gap-2">⏱️ {t("userDashboard.stats.practiceTime")}</DialogTitle>
                <DialogDescription className={descClass}>{t("userDashboard.modal.practiceDesc")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-4 text-sm">
                <div className={cn("flex justify-between p-3 rounded-xl border", itemClass)}><span>{t("userDashboard.modal.total")}</span><b>{(stats?.totalMinutes || 0).toFixed(1)} {t("mockCategory.minutesShort")}</b></div>
                <div className={cn("flex justify-between p-3 rounded-xl border", itemClass)}><span>{t("userDashboard.modal.activeDays")}</span><b>{activeDays} / 7</b></div>
                <div className={cn("flex justify-between p-3 rounded-xl border", itemClass)}><span>{t("userDashboard.modal.dailyAverage")}</span><b>{avgMin} {t("mockCategory.minutesShort")}</b></div>
                <div className={cn("flex justify-between p-3 rounded-xl border", itemClass)}><span>{t("userDashboard.modal.bestDay")}</span><b>{maxMin.toFixed(1)} {t("mockCategory.minutesShort")}</b></div>
                <Button onClick={() => navigate("/user/speaking")} className="w-full mt-4 h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg shadow-orange-500/20">{t("userDashboard.modal.trySpeakingBtn")}</Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      case "streak":
        return (
          <Dialog {...common}>
            <DialogContent className={cn(dialogClass, "shadow-2xl rounded-2xl")}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">🔥 {t("userDashboard.stats.dailyStreak")}</DialogTitle>
                <DialogDescription className={descClass}>
                  {t("userDashboard.modal.streakDesc", { count: stats?.streak })}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-wrap gap-2 py-4">
                {stats?.weeklyData?.map((d) => (
                  <span
                    key={d.day}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${d.minutes > 0 ? "bg-purple-500 text-white" : isDark ? "bg-white/5 text-slate-500" : "bg-slate-100 text-slate-400"}`}
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
    <div className="w-full min-h-screen space-y-6">
      {modal}

      {/* Premium Welcome Banner */}
      <WelcomeBanner />

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
                {t("userDashboard.promo.onboardingTitle")}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                {t("userDashboard.promo.onboardingDesc")}
              </p>
            </div>
            <Button
              onClick={() => navigate("/user/subscriptions")}
              className="bg-gradient-primary hover:opacity-90 text-white px-8 h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20 shrink-0 flex items-center gap-2 group/btn"
            >
              {t("userDashboard.promo.choosePlansBtn")} <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Free Tier Diagnostic Tests Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-black text-2xl text-slate-800 dark:text-white flex items-center gap-2">
              {t("userDashboard.freeMocks.title")} <Gift className="h-6 w-6 text-purple-500 animate-pulse" />
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {t("userDashboard.freeMocks.subtitle")}
            </p>
          </div>
          <Badge className="bg-purple-500/10 text-purple-500 border border-purple-500/20 px-3.5 py-1.5 rounded-full font-black text-[10px] uppercase">
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
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{t("userDashboard.freeMocks.emptyState")}</p>
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
                        <Badge className="bg-purple-500/10 text-purple-500 border border-purple-500/20 uppercase text-[9px] font-bold tracking-wider rounded-full">
                          Diagnostic Free
                        </Badge>
                        <Badge variant="outline" className={`rounded-full ${diff.cls} text-[9px] px-2 py-0.5`}>
                          <DIcon className="h-3 w-3 mr-1" /> {t(diff.labelKey)}
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
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {e.durationMinutes} {t("mockCategory.minutesShort")}</span>
                        <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {e.type}</span>
                      </div>
                    </div>

                    <div className="pt-5 mt-4 border-t border-slate-100 dark:border-white/5">
                      <Button
                        onClick={() => navigate(`/user/mocks/take/${e.id}`)}
                        className="w-full h-11 bg-slate-100 dark:bg-white/5 hover:bg-primary hover:text-white text-slate-700 dark:text-slate-200 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all"
                      >
                        {t("mockCategory.startBtn")} <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
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
            <h3 className={cn("font-display font-black text-2xl", isDark ? "text-white" : "text-slate-900")}>{t("userDashboard.chart.title")}</h3>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">{t("userDashboard.chart.subtitle")}</p>
          </div>
          <Badge className="bg-purple-500/10 text-purple-500 border border-purple-500/20 px-4 py-1.5 rounded-full font-black text-xs">
            {t("userDashboard.chart.totalMinutes", { count: (stats?.totalMinutes || 0).toFixed(1) })}
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
                    className="w-full max-w-[40px] bg-gradient-to-t from-purple-600 to-violet-400 rounded-2xl min-h-[8px] relative shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-all"
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
            <h4 className={cn("font-display font-black text-2xl mb-3 tracking-tight", isDark ? "text-white" : "text-slate-900")}>{t("userDashboard.telegram.title")}</h4>
            <p className="text-slate-500 text-base font-medium leading-relaxed mb-8">
              {t("userDashboard.telegram.desc")}
            </p>
            <a
              href="https://t.me/LMSHub_uz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 text-blue-600 font-black text-sm uppercase tracking-widest group/link hover:text-blue-500 transition-colors"
            >
              {t("userDashboard.telegram.subscribeBtn")} <ChevronRight size={18} className="group-hover/link:translate-x-2 transition-transform" />
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
          { to: "/user/leaderboard", label: t("nav.leaderboard"), emoji: "🏆", color: "from-amber-400 to-orange-500", shadow: "shadow-amber-500/10" },
          { to: "/user/achievements", label: t("nav.achievements"), emoji: "🎖️", color: "from-blue-400 to-indigo-500", shadow: "shadow-blue-500/10" },
          { to: "/user/profile", label: t("nav.account"), emoji: "👤", color: "from-slate-400 to-slate-600", shadow: "shadow-slate-500/10" },
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
