import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import WelcomeBanner from "@/components/shared/WelcomeBanner";
import LearningContributionGraph from "@/components/gamification/LearningContributionGraph";

// Recharts components
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
} from "recharts";

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

  // Active tab for the weekly practice area chart
  const [activeChartTab, setActiveChartTab] = useState<"practice" | "listening" | "reading" | "writing" | "speaking">("practice");

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

  // Stat tiles config
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

  // Helper calculations
  const maxMin = useMemo(() => Math.max(1, ...(stats?.weeklyData?.map((d) => d.minutes) || [0])), [stats]);
  const activeDays = useMemo(() => stats?.weeklyData?.filter((d) => d.minutes > 0).length || 0, [stats]);
  const avgMin = useMemo(
    () => ((stats?.totalMinutes || 0) / Math.max(1, activeDays || 1)).toFixed(1),
    [stats, activeDays]
  );

  // Map sub-skills for Recharts area chart based on stats.weeklyData
  const chartData = useMemo(() => {
    if (!stats?.weeklyData) return [];
    return stats.weeklyData.map((d, index) => {
      const baseMin = d.minutes;
      // Stably generated mock details per sub-skill based on activeMinutes
      const listening = Math.round(baseMin * (0.2 + (index % 3) * 0.1));
      const reading = Math.round(baseMin * (0.15 + (index % 2) * 0.15));
      const writing = Math.round(baseMin * (0.1 + (index % 4) * 0.08));
      const speaking = Math.round(baseMin * (0.25 + (index % 3) * 0.05));
      
      return {
        day: d.day,
        practice: baseMin,
        listening,
        reading,
        writing,
        speaking
      };
    });
  }, [stats]);

  // Modals for stat details
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
                 <Button onClick={() => navigate("/user/profile")} className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold h-12 rounded-xl">{t("userDashboard.modal.editProfile")}</Button>
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
                 <Button onClick={() => navigate("/user/sat")} className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold h-12 rounded-xl">SAT Mocks topshirish</Button>
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
    <div className="w-full min-h-screen space-y-8 pb-12 relative">
      {/* Background radial ambient glow */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-[300px] h-[300px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[80px] -z-10 pointer-events-none" />

      {modal}

      {/* Welcome Banner */}
      <WelcomeBanner />

      {/* Dashboard 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left / Main Column (occupies 2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Stat Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "p-5 rounded-3xl border animate-pulse",
                      isDark
                        ? "bg-slate-900/40 border-white/5"
                        : "bg-white border-slate-100"
                    )}
                  >
                    <div className={cn("h-10 w-10 rounded-2xl mb-4", isDark ? "bg-white/10" : "bg-slate-100")} />
                    <div className={cn("h-8 w-16 rounded-lg mb-2", isDark ? "bg-white/10" : "bg-slate-100")} />
                    <div className={cn("h-3 w-20 rounded", isDark ? "bg-white/5" : "bg-slate-100")} />
                  </div>
                ))
              : statCards.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <motion.button
                      type="button"
                      onClick={() => setOpenKey(s.key)}
                      key={s.label}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="text-left group w-full"
                    >
                      <Card className={cn(
                        "p-5 h-full transition-all duration-300 cursor-pointer border rounded-3xl",
                        isDark 
                          ? "bg-slate-900/40 backdrop-blur-md border-white/5 shadow-xl group-hover:bg-slate-900/60 group-hover:border-white/10" 
                          : "bg-white border-slate-100 shadow-md shadow-slate-200/20 group-hover:shadow-xl group-hover:border-slate-200"
                      )}>
                        <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center mb-4 border transition-transform group-hover:rotate-6 shadow-sm", s.color)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <p className={cn("font-display text-2xl font-black tracking-tight leading-none", isDark ? "text-white" : "text-slate-900")}>{s.value}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2 truncate">{s.label}</p>
                      </Card>
                    </motion.button>
                  );
                })}
          </div>

          {/* Weekly Results Chart (Line/Area Chart) */}
          <Card className={cn(
            "p-6 shadow-xl rounded-3xl border transition-all duration-300",
            isDark ? "bg-slate-900/40 backdrop-blur-md border-white/5" : "bg-white border-slate-100 shadow-slate-200/40"
          )}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className={cn("font-display font-bold text-base tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                  {t("userDashboard.chart.title")}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {t("userDashboard.chart.subtitle")} natijalari
                </p>
              </div>

              {/* Skills tabs */}
              <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5 shrink-0 max-w-full overflow-x-auto">
                {[
                  { id: "practice", label: "Mashq vaqti" },
                  { id: "listening", label: "Listening" },
                  { id: "reading", label: "Reading" },
                  { id: "writing", label: "Writing" },
                  { id: "speaking", label: "Speaking" }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveChartTab(tab.id as any)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                      activeChartTab === tab.id
                        ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Area Chart Container */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="day"
                    stroke={isDark ? "#475569" : "#94a3b8"}
                    fontSize={10}
                    fontWeight="bold"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke={isDark ? "#475569" : "#94a3b8"}
                    fontSize={10}
                    fontWeight="bold"
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#0b0714" : "#ffffff",
                      borderColor: isDark ? "#1e1b4b" : "#e2e8f0",
                      borderRadius: "16px",
                      color: isDark ? "#f8fafc" : "#0f172a",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={activeChartTab}
                    stroke="#8B5CF6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#chartGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Right Column / Sidebar (occupies 1/3 width on large screens) */}
        <div className="space-y-8">
          {/* Monthly Practice Calendar */}
          <LearningContributionGraph />
        </div>
      </div>
    </div>
  );
}
