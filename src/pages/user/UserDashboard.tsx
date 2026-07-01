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
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import WelcomeBanner from "@/components/shared/WelcomeBanner";
import LearningContributionGraph from "@/components/gamification/LearningContributionGraph";

// Recharts components for trading chart and indicators
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  CartesianGrid,
} from "recharts";

interface DailyData {
  day: string;
  minutes: number;
  reading?: number | null;
  listening?: number | null;
  writing?: number | null;
  speaking?: number | null;
  sat?: number | null;
  nationalCert?: number | null;
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

  // Active tab selection (7 tabs supported)
  const [activeChartTab, setActiveChartTab] = useState<"practice" | "reading" | "listening" | "writing" | "speaking" | "sat" | "national_cert">("practice");

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
  const mapDay = (day: string) => {
    const d = day.toUpperCase();
    if (d === "MON" || d === "DU") return "Du";
    if (d === "TUE" || d === "SE") return "Se";
    if (d === "WED" || d === "CHO") return "Cho";
    if (d === "THU" || d === "PA") return "Pa";
    if (d === "FRI" || d === "JU") return "Ju";
    if (d === "SAT" || d === "SHA") return "Sha";
    if (d === "SUN" || d === "YA") return "Ya";
    return day;
  };

  const maxMin = useMemo(() => Math.max(1, ...(stats?.weeklyData?.map((d) => d.minutes) || [0])), [stats]);
  const activeDays = useMemo(() => stats?.weeklyData?.filter((d) => d.minutes > 0).length || 0, [stats]);
  const avgMin = useMemo(
    () => ((stats?.totalMinutes || 0) / Math.max(1, activeDays || 1)).toFixed(1),
    [stats, activeDays]
  );

  // Compute stats for all 7 modules based on real database records
  const composedChartData = useMemo(() => {
    const rawWeekly = stats?.weeklyData || [];
    if (rawWeekly.length === 0) {
      const days = ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"];
      return days.map((day) => ({
        day,
        practice: 0,
        reading: null,
        listening: null,
        writing: null,
        speaking: null,
        sat: null,
        national_cert: null
      }));
    }
    
    return rawWeekly.map((item) => {
      const dayName = mapDay(item.day);
      return {
        day: dayName,
        practice: item.minutes || 0,
        reading: item.reading ?? null,
        listening: item.listening ?? null,
        writing: item.writing ?? null,
        speaking: item.speaking ?? null,
        sat: item.sat ?? null,
        national_cert: item.nationalCert ?? null
      };
    });
  }, [stats]);

  // Check if there is data for the selected chart tab
  const hasDataForActiveTab = useMemo(() => {
    if (activeChartTab === "practice") return true;
    return composedChartData.some(d => d[activeChartTab] !== null && d[activeChartTab] !== undefined);
  }, [composedChartData, activeChartTab]);

  // Determine active unit/scale based on active tab
  const activeYDomain = useMemo(() => {
    switch (activeChartTab) {
      case "sat":
        return [400, 1600];
      case "national_cert":
        return [0, 75];
      case "reading":
      case "listening":
      case "writing":
      case "speaking":
        return [0, 9];
      default:
        return [0, "auto"];
    }
  }, [activeChartTab]);

  // Dynamic theme colors and CSS classes for the chart based on the active tab
  const chartTheme = useMemo(() => {
    switch (activeChartTab) {
      case "practice":
        return {
          stroke: "#10b981", // Emerald Green
          bgBadge: "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
          activeTabClass: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600"
        };
      case "sat":
        return {
          stroke: "#3b82f6", // Blue
          bgBadge: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20",
          activeTabClass: "bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600"
        };
      case "national_cert":
        return {
          stroke: "#f59e0b", // Amber
          bgBadge: "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20",
          activeTabClass: "bg-amber-500 text-white shadow-lg shadow-amber-500/25 hover:bg-amber-600"
        };
      default:
        return {
          stroke: "#8b5cf6", // Violet/Purple
          bgBadge: "bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20",
          activeTabClass: "bg-purple-500 text-white shadow-lg shadow-purple-500/25 hover:bg-purple-600"
        };
    }
  }, [activeChartTab]);

  // Compute sum or average for the selected tab to display as "Jami" / "O'rtacha"
  const activeTabTotal = useMemo(() => {
    if (!composedChartData.length) return "--";
    
    if (activeChartTab === "practice") {
      const sum = composedChartData.reduce((acc, curr) => {
        const val = curr.practice;
        return acc + (typeof val === "number" ? val : 0);
      }, 0);
      return sum.toFixed(1) + " daq";
    }

    const nonNullPoints = composedChartData.filter(d => d[activeChartTab] !== null && d[activeChartTab] !== undefined);
    if (nonNullPoints.length === 0) return "--";

    const sum = nonNullPoints.reduce((acc, curr) => {
      const val = curr[activeChartTab];
      return acc + (typeof val === "number" ? val : 0);
    }, 0);
    const avg = sum / nonNullPoints.length;

    switch (activeChartTab) {
      case "sat":
        return Math.round(avg).toString() + " score";
      case "national_cert":
        return Math.round(avg).toString() + " ball";
      default:
        return avg.toFixed(1) + " band";
    }
  }, [composedChartData, activeChartTab]);

  // Custom dots matching IELTS Hub style (white/dark filled circle with themed stroke border)
  const renderCustomDot = (props: any) => {
    const { cx, cy, index } = props;
    return (
      <circle
        key={index}
        cx={cx}
        cy={cy}
        r={3.5}
        fill={isDark ? "#120c1e" : "#ffffff"}
        stroke={chartTheme.stroke}
        strokeWidth={2}
      />
    );
  };

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
    <div className="w-full space-y-3 relative pb-1">
      {/* Background radial ambient glow */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-[300px] h-[300px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[80px] -z-10 pointer-events-none" />

      {modal}

      {/* Welcome Banner */}
      <WelcomeBanner />

      {/* Dashboard 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        
        {/* Left / Main Column (occupies 2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Stat Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "p-3.5 rounded-2xl border animate-pulse",
                      isDark
                        ? "bg-slate-900/40 border-white/5"
                        : "bg-white border-slate-100"
                    )}
                  >
                    <div className={cn("h-8 w-8 rounded-xl mb-3", isDark ? "bg-white/10" : "bg-slate-100")} />
                    <div className={cn("h-6 w-12 rounded-lg mb-1.5", isDark ? "bg-white/10" : "bg-slate-100")} />
                    <div className={cn("h-2.5 w-16 rounded", isDark ? "bg-white/5" : "bg-slate-100")} />
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
                      whileHover={{ y: -3, scale: 1.02 }}
                      className="text-left group w-full"
                    >
                      <Card className={cn(
                        "p-3.5 h-full transition-all duration-300 cursor-pointer border rounded-2xl",
                        isDark 
                          ? "bg-slate-900/40 backdrop-blur-md border-white/5 shadow-xl group-hover:bg-slate-900/60 group-hover:border-white/10" 
                          : "bg-white border-slate-100 shadow-md shadow-slate-200/10 group-hover:shadow-xl group-hover:border-slate-200"
                      )}>
                        <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center mb-2 border transition-transform group-hover:rotate-6 shadow-sm", s.color)}>
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <p className={cn("font-display text-xl font-black tracking-tight leading-none", isDark ? "text-white" : "text-slate-900")}>{s.value}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1.5 truncate">{s.label}</p>
                      </Card>
                    </motion.button>
                  );
                })}
          </div>

          {/* Weekly Results Chart (Clean, Spacious, Floating Pills Layout similar to IELTS Hub) */}
          <Card className={cn(
            "p-5 shadow-lg rounded-[24px] border transition-all duration-300 overflow-hidden relative",
            isDark ? "bg-slate-900/30 border-white/5" : "bg-white border-slate-200/60 shadow-slate-200/10"
          )}>
            {/* Header Row: Title & Total Badge */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className={cn("font-display font-black text-base tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                  {t("userDashboard.chart.trendsTitle", "Haftalik natija")}
                </h3>
                <p className="text-[11px] text-slate-400 font-bold tracking-wide mt-0.5">
                  {t("userDashboard.chart.trendsDesc", "so'nggi 7 kun")}
                </p>
                  {/* Total / Average Badge */}
              <div className={cn("px-3 py-1.5 rounded-full text-[11px] font-black border flex items-center gap-1.5 select-none transition-all duration-300", chartTheme.bgBadge)}>
                <span className="opacity-85">
                  {activeChartTab === "practice" 
                    ? t("userDashboard.calendar.total", "Jami") 
                    : t("userDashboard.chart.average", "O'rtacha")}
                  :
                </span>
                <span>{activeTabTotal}</span>
              </div>
            </div>

            {/* Row 2: Floating Pill Buttons */}
            <div className="mt-4 mb-5 flex flex-wrap gap-2 select-none">
              {[
                { id: "practice", label: t("userDashboard.tabs.practice", "Mashq vaqti") },
                { id: "reading", label: t("userDashboard.tabs.reading", "Reading") },
                { id: "listening", label: t("userDashboard.tabs.listening", "Listening") },
                { id: "writing", label: t("userDashboard.tabs.writing", "Writing") },
                { id: "speaking", label: t("userDashboard.tabs.speaking", "Speaking") },
                { id: "sat", label: t("userDashboard.tabs.sat", "SAT") },
                { id: "national_cert", label: t("userDashboard.tabs.national_cert", "Milliy Sertifikat") }
              ].map(tab => {
                const isActive = activeChartTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveChartTab(tab.id as any)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-[11px] font-black transition-all duration-200 whitespace-nowrap",
                      isActive
                        ? chartTheme.activeTabClass
                        : "bg-slate-100/70 hover:bg-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300"
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Row 3: Crisp, Professional Line Chart OR Empty State */}
            <div className="h-52 w-full relative flex items-center justify-center">
              {hasDataForActiveTab ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={composedChartData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                    <defs>
                      <linearGradient id="chartFillGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartTheme.stroke} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={chartTheme.stroke} stopOpacity={0.005} />
                      </linearGradient>
                    </defs>
                    {/* Clean, high-fidelity soft grid lines */}
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#f1f5f9"} opacity={0.5} vertical={false} />
                    <XAxis
                      dataKey="day"
                      stroke="#94a3b8"
                      fontSize={10}
                      fontWeight="bold"
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={10}
                      fontWeight="bold"
                      tickLine={false}
                      axisLine={false}
                      domain={activeYDomain as any}
                      width={35}
                      dx={-2}
                    />
                    <ChartTooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#0f0c1b" : "#ffffff",
                        borderColor: isDark ? "#2a224a" : "#e2e8f0",
                        borderRadius: "12px",
                        color: isDark ? "#f8fafc" : "#0f172a",
                        fontSize: "10px",
                        fontWeight: "bold",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey={activeChartTab}
                      stroke={chartTheme.stroke}
                      strokeWidth={2}
                      dot={renderCustomDot}
                      fillOpacity={1}
                      fill="url(#chartFillGradient)"
                      activeDot={{ r: 5, stroke: chartTheme.stroke, strokeWidth: 1.5, fill: isDark ? "#0f0c1b" : "#ffffff" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center text-center space-y-3.5 py-4 animate-fade-in select-none">
                  {/* Wave icon inside soft themed circular background */}
                  <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner transition-transform duration-300 hover:scale-105", 
                    activeChartTab === "listening" ? "bg-blue-500/10 text-blue-500" :
                    activeChartTab === "reading" ? "bg-violet-500/10 text-violet-500" :
                    activeChartTab === "writing" ? "bg-orange-500/10 text-orange-500" :
                    activeChartTab === "speaking" ? "bg-purple-500/10 text-purple-500" :
                    activeChartTab === "sat" ? "bg-indigo-500/10 text-indigo-500" : "bg-amber-500/10 text-amber-500"
                  )}>
                    {/* Nice soft wave icon (trending-up/activity style pulse) */}
                    <TrendingUp className="h-6 w-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <p className={cn("text-xs font-semibold tracking-tight", isDark ? "text-slate-200" : "text-slate-700")}>
                      {t(`userDashboard.empty.${activeChartTab}.title`, `${t(`userDashboard.tabs.${activeChartTab}`, activeChartTab)} natijalari bu yerda ko'rinadi.`)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold max-w-[280px] leading-relaxed mx-auto">
                      {t(`userDashboard.empty.${activeChartTab}.desc`, `Ushbu modul bo'yicha ko'rsatkichlaringizni bilish uchun birinchi testni topshiring.`)}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      const pathMap: Record<string, string> = {
                        reading: "/user/mocks/c/reading",
                        listening: "/user/mocks/c/listening",
                        writing: "/user/mocks/c/writing",
                        speaking: "/user/mocks/c/speaking",
                        sat: "/user/mocks/c/sat",
                        national_cert: "/user/mocks/c/national_cert"
                      };
                      navigate(pathMap[activeChartTab] || "/user/mocks");
                    }}
                    className={cn(
                      "px-5 py-1.5 h-auto rounded-xl text-[10px] font-black shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg text-white",
                      activeChartTab === "listening" ? "bg-blue-500 hover:bg-blue-600 shadow-blue-500/20" :
                      activeChartTab === "reading" ? "bg-violet-500 hover:bg-violet-600 shadow-violet-500/20" :
                      activeChartTab === "writing" ? "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20" :
                      activeChartTab === "speaking" ? "bg-purple-500 hover:bg-purple-600 shadow-purple-500/20" :
                      activeChartTab === "sat" ? "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20" : "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
                    )}
                  >
                    {t(`userDashboard.empty.${activeChartTab}.btn`, `${t(`userDashboard.tabs.${activeChartTab}`, activeChartTab)} boshlash`)}
                  </Button>
                </div>
              )}            </div>
          </Card>
        </div>

        {/* Right Column / Sidebar (occupies 1/3 width on large screens) */}
        <div className="space-y-4">
          {/* Monthly Practice Calendar */}
          <LearningContributionGraph />
        </div>
      </div>
    </div>
  );
}
