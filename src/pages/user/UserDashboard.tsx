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
import { useNavigate, useLocation } from "react-router-dom";
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
  national_cert?: number | null;
  attempts_count?: number | null;
}

interface UserStats {
  total_minutes: number;
  streak: number;
  target_band: number | null;
  avg_score: number | null;
  exam_days_left: number | null;
  weekly_data: DailyData[];
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

  const [attempts, setAttempts] = useState<any[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [selectedTargetBand, setSelectedTargetBand] = useState<number>(7.0);
  const [savingTarget, setSavingTarget] = useState(false);

  const mapStats = (data: any): UserStats => {
    return {
      total_minutes: data.total_minutes ?? data.totalMinutes ?? 0,
      streak: data.streak ?? 0,
      target_band: data.target_band ?? data.targetBand ?? null,
      avg_score: data.avg_score ?? data.avgScore ?? null,
      exam_days_left: data.exam_days_left ?? data.examDaysLeft ?? null,
      weekly_data: (data.weekly_data || data.weeklyData || []).map((d: any) => ({
        day: d.day,
        minutes: d.minutes ?? 0,
        reading: d.reading ?? null,
        listening: d.listening ?? null,
        writing: d.writing ?? null,
        speaking: d.speaking ?? null,
        sat: d.sat ?? null,
        national_cert: d.national_cert ?? d.nationalCert ?? null,
        attempts_count: d.attempts_count ?? d.attemptsCount ?? 0,
      })),
    };
  };

  // Load attempts on mount for dynamic overall average score calculations
  useEffect(() => {
    const fetchAttempts = async () => {
      setLoadingAttempts(true);
      try {
        const res = await api.get("/student/exams/attempts");
        setAttempts(res.data || []);
      } catch (e) {
        console.error("Failed to load attempts for breakdown on mount", e);
      } finally {
        setLoadingAttempts(false);
      }
    };
    fetchAttempts();
  }, []);

  const computeDaysLeft = (dateStr: string): number | null => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const today = new Date();
    target.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  };

  useEffect(() => {
    if (openKey === "target") {
      const savedBand = localStorage.getItem("lmshub_target_band");
      if (savedBand) {
        setSelectedTargetBand(parseFloat(savedBand));
      } else if (stats?.target_band) {
        setSelectedTargetBand(stats.target_band);
      }
    }
  }, [openKey, stats?.target_band]);

  const breakdown = useMemo(() => {
    const modules = [
      { id: "listening", label: "Listening", icon: "🎧" },
      { id: "reading", label: "Reading", icon: "📖" },
      { id: "speaking", label: "Speaking", icon: "🗣️" },
      { id: "writing", label: "Writing", icon: "✍️" },
      { id: "mock", label: "Mock Test", icon: "🏆" },
    ];

    const statsMap = modules.map(m => {
      const filtered = attempts.filter(a => {
        const type = (a.exam?.type || "").toLowerCase();
        if (m.id === "mock") {
          return type.includes("mock") || type === "ielts";
        }
        return type === m.id;
      });

      const count = filtered.length;
      const scores = filtered
        .map(a => a.overall_band ?? a.overallBand ?? a.total_score ?? a.totalScore ?? a.score)
        .filter((s): s is number => typeof s === "number" && s > 0);
      
      const sum = scores.reduce((acc, s) => acc + s, 0);
      const avg = scores.length > 0 ? sum / scores.length : null;

      return {
        ...m,
        count,
        avg,
      };
    });

    const validAvgs = statsMap.map(s => s.avg).filter((a): a is number => a !== null);
    const overallAvg = validAvgs.length > 0 ? validAvgs.reduce((acc, a) => acc + a, 0) / validAvgs.length : null;

    return {
      modules: statsMap,
      overallAvg,
    };
  }, [attempts]);

  // Active tab selection (7 tabs supported)
  const [activeChartTab, setActiveChartTab] = useState<"practice" | "reading" | "listening" | "writing" | "speaking" | "sat" | "national_cert">("practice");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, contribRes] = await Promise.allSettled([
          api.get("/user/stats"),
          api.get("/user/gamification/contributions")
        ]);

        let mapped: UserStats = {
          total_minutes: 0,
          streak: 0,
          target_band: null,
          avg_score: null,
          exam_days_left: null,
          weekly_data: []
        };

        if (statsRes.status === "fulfilled") {
          mapped = mapStats(statsRes.value.data);
        }

        // Fallback target band & exam date from localStorage
        const savedBand = localStorage.getItem("lmshub_target_band");
        if (savedBand) {
          mapped.target_band = parseFloat(savedBand);
        }
        const savedExamDate = localStorage.getItem("lmshub_exam_date");
        if (savedExamDate) {
          mapped.exam_days_left = computeDaysLeft(savedExamDate);
          setExamDate(savedExamDate);
        }

        // Fallback practice minutes and streak from gamification contributions endpoint
        if (contribRes.status === "fulfilled" && contribRes.value.data) {
          const contribData = contribRes.value.data;
          const dailyContributions = contribData.daily_contributions || [];
          const computedTotalMinutes = dailyContributions.reduce((acc: number, d: any) => acc + (d.minutes || 0), 0);
          
          if (!mapped.total_minutes || mapped.total_minutes === 0) {
            mapped.total_minutes = computedTotalMinutes;
          }
          if (!mapped.streak || mapped.streak === 0) {
            mapped.streak = contribData.current_streak ?? contribData.currentStreak ?? 0;
          }
        }

        setStats(mapped);
      } catch (e) {
        console.error("Stats fetch failed", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const savedExamDate = localStorage.getItem("lmshub_exam_date");
    if (savedExamDate) {
      setExamDate(savedExamDate);
    } else if (profile?.exam_date) {
      setExamDate(profile.exam_date);
    }
  }, [profile?.exam_date]);

  const saveExamDate = async () => {
    if (!examDate) return;
    setSavingExam(true);
    try {
      await api.put("/user/profile", { examDate });
      localStorage.setItem("lmshub_exam_date", examDate);
      toast.success(t("userDashboard.toast.examDateSaved"), {
        description: t("userDashboard.toast.examDateDesc"),
      });
      await refresh();
      setStats(prev => {
        if (!prev) return null;
        return {
          ...prev,
          exam_days_left: computeDaysLeft(examDate)
        };
      });
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
      value: stats?.target_band ? stats.target_band.toFixed(1) : "--",
      icon: Target,
      gradient: "from-[#3b82f6] to-[#1d4ed8] shadow-blue-500/10",
      textClass: "text-white",
      labelClass: "text-blue-100/70",
      iconClass: "bg-white/15 text-white border-white/10",
      hoverClass: "group-hover:shadow-[0_15px_30px_-5px_rgba(59,130,246,0.3)] group-hover:border-blue-400/40"
    },
    {
      key: "avg",
      label: t("userDashboard.stats.avgScore"),
      value: (stats?.avg_score || breakdown.overallAvg) ? (stats?.avg_score || breakdown.overallAvg)!.toFixed(1) : "--",
      icon: Activity,
      gradient: "from-[#10b981] to-[#047857] shadow-emerald-500/10",
      textClass: "text-white",
      labelClass: "text-emerald-100/70",
      iconClass: "bg-white/15 text-white border-white/10",
      hoverClass: "group-hover:shadow-[0_15px_30px_-5px_rgba(16,185,129,0.3)] group-hover:border-emerald-400/40"
    },
    {
      key: "exam",
      label: t("userDashboard.stats.daysLeft"),
      value: (stats?.exam_days_left !== null && stats?.exam_days_left !== undefined) ? t("userDashboard.stats.daysValue", { count: stats?.exam_days_left }) : "--",
      icon: CalendarDays,
      gradient: "from-[#ef4444] to-[#b91c1c] shadow-red-500/10",
      textClass: "text-white",
      labelClass: "text-red-100/70",
      iconClass: "bg-white/15 text-white border-white/10",
      hoverClass: "group-hover:shadow-[0_15px_30px_-5px_rgba(239,68,68,0.3)] group-hover:border-red-400/40"
    },
    {
      key: "minutes",
      label: t("userDashboard.stats.practiceTime"),
      value: t("userDashboard.stats.minutesValue", { count: (stats?.total_minutes || 0).toFixed(1) }),
      icon: Clock,
      gradient: "from-[#8b5cf6] to-[#6d28d9] shadow-purple-500/10",
      textClass: "text-white",
      labelClass: "text-purple-100/70",
      iconClass: "bg-white/15 text-white border-white/10",
      hoverClass: "group-hover:shadow-[0_15px_30px_-5px_rgba(139,92,246,0.3)] group-hover:border-purple-400/40"
    },
    {
      key: "streak",
      label: t("userDashboard.stats.dailyStreak"),
      value: stats?.streak ?? 0,
      icon: Flame,
      gradient: "from-[#f59e0b] to-[#b45309] shadow-amber-500/10",
      textClass: "text-white",
      labelClass: "text-amber-100/70",
      iconClass: "bg-white/15 text-white border-white/10",
      hoverClass: "group-hover:shadow-[0_15px_30px_-5px_rgba(245,158,11,0.3)] group-hover:border-amber-400/40"
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

  const maxMin = useMemo(() => Math.max(1, ...(stats?.weekly_data?.map((d) => d.minutes) || [0])), [stats]);
  const activeDays = useMemo(() => stats?.weekly_data?.filter((d) => d.minutes > 0).length || 0, [stats]);
  const avgMin = useMemo(
    () => ((stats?.total_minutes || 0) / Math.max(1, activeDays || 1)).toFixed(1),
    [stats, activeDays]
  );

  // Compute stats for all 7 modules based on real database records
  const location = useLocation();
  const basePath = location.pathname.startsWith("/student") ? "/student" : "/user";

  const composedChartData = useMemo(() => {
    const rawWeekly = stats?.weekly_data || [];
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
        national_cert: null,
        attempts: 0,
        timeSpent: 0
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
        national_cert: item.national_cert ?? null,
        attempts: item.attempts_count ?? 0,
        timeSpent: item.minutes || 0
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
          stroke: "#22c55e",
          bgBadge: "bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/20",
          activeTabClass: "bg-green-500 text-white shadow-lg shadow-green-500/25 hover:bg-green-600"
        };
      case "reading":
        return {
          stroke: "#f97316",
          bgBadge: "bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20",
          activeTabClass: "bg-orange-500 text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600"
        };
      case "listening":
        return {
          stroke: "#3b82f6",
          bgBadge: "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20",
          activeTabClass: "bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:bg-blue-600"
        };
      case "writing":
        return {
          stroke: "#f59e0b",
          bgBadge: "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20",
          activeTabClass: "bg-amber-500 text-white shadow-lg shadow-amber-500/25 hover:bg-amber-600"
        };
      case "speaking":
        return {
          stroke: "#8b5cf6",
          bgBadge: "bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20",
          activeTabClass: "bg-purple-500 text-white shadow-lg shadow-purple-500/25 hover:bg-purple-600"
        };
      case "sat":
        return {
          stroke: "#06b6d4",
          bgBadge: "bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20",
          activeTabClass: "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25 hover:bg-cyan-600"
        };
      case "national_cert":
        return {
          stroke: "#ef4444",
          bgBadge: "bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20",
          activeTabClass: "bg-red-500 text-white shadow-lg shadow-red-500/25 hover:bg-red-600"
        };
      default:
        return {
          stroke: "#8b5cf6",
          bgBadge: "bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20",
          activeTabClass: "bg-purple-500 text-white shadow-lg shadow-purple-500/25 hover:bg-purple-600"
        };
    }
  }, [activeChartTab]);

  // Compute sum or average for the selected tab to display as "Jami" / "O'rtacha"
  const activeTabTotal = useMemo(() => {
    if (!composedChartData.length) return "--";

    if (activeChartTab === "practice") {
      const sum = composedChartData.reduce((acc, curr) => acc + (curr.practice || 0), 0);
      return Math.round(sum) + " mins";
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
        return Math.round(avg).toString();
      case "national_cert":
        return Math.round(avg).toString();
      default:
        return avg.toFixed(1);
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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = payload[0].value;
      
      const moduleName = activeChartTab === "practice" ? t("userDashboard.tabs.practice", "Practice Time") :
        activeChartTab === "reading" ? "Reading" :
        activeChartTab === "listening" ? "Listening" :
        activeChartTab === "writing" ? "Writing" :
        activeChartTab === "speaking" ? "Speaking" :
        activeChartTab === "sat" ? "SAT" : "National Certificate";
        
      let formattedValue = "";
      if (value !== null && value !== undefined) {
        if (activeChartTab === "practice") {
          formattedValue = `${value} mins`;
        } else if (activeChartTab === "sat") {
          formattedValue = `${value} score`;
        } else if (activeChartTab === "national_cert") {
          formattedValue = `${value} ball`;
        } else {
          formattedValue = `Band ${value}`;
        }
      } else {
        formattedValue = "--";
      }

      const attempts = data.attempts ?? 0;
      const time = data.timeSpent ?? 0;

      return (
        <div className={cn(
          "p-4 rounded-2xl border shadow-xl backdrop-blur-md text-left text-xs font-semibold space-y-1.5 min-w-[150px] transition-all duration-300",
          isDark ? "bg-[#0f0c1b]/95 border-purple-500/20 text-slate-200" : "bg-white/95 border-slate-200 text-slate-800"
        )}>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{data.day}</p>
          <div className="border-t border-slate-500/10 pt-1.5 space-y-1">
            <p className="flex items-center justify-between gap-4">
              <span className="text-slate-400">{t("userDashboard.chart.module", "Modul")}:</span>
              <span className="font-extrabold">{moduleName}</span>
            </p>
            <p className="flex items-center justify-between gap-4">
              <span className="text-slate-400">{t("userDashboard.chart.value", "Natija")}:</span>
              <span className="font-extrabold" style={{ color: chartTheme.stroke }}>{formattedValue}</span>
            </p>
            <p className="flex items-center justify-between gap-4">
              <span className="text-slate-400">{t("userDashboard.chart.attempts", "Urinishlar")}:</span>
              <span className="font-extrabold">{attempts}</span>
            </p>
            <p className="flex items-center justify-between gap-4">
              <span className="text-slate-400">{t("userDashboard.chart.time", "Vaqt")}:</span>
              <span className="font-extrabold">{time} mins</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Modals for stat details
  const modal = (() => {
    if (!openKey) return null;
    const common = { open: true, onOpenChange: (v: boolean) => !v && setOpenKey(null) };
    const dialogClass = isDark ? "bg-[#120b20] border-white/[0.08] text-white" : "bg-white border-slate-100 text-slate-900";
    const descClass = isDark ? "text-slate-400" : "text-slate-500";
    const labelClass = isDark ? "text-slate-350" : "text-slate-600";
    const inputClass = isDark ? "bg-white/[0.04] border-white/[0.08] text-white" : "bg-slate-50 border-slate-100 text-slate-900";
    const itemClass = isDark ? "bg-white/[0.02] border-white/[0.04]" : "bg-slate-50/50 border-slate-100";

    switch (openKey) {
      case "target": {
        const bands = [5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0];
        return (
          <Dialog {...common}>
            <DialogContent className={cn(dialogClass, "shadow-2xl rounded-[24px] max-w-sm p-6 border")}>
              <DialogHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4 dark:border-white/[0.06] border-slate-100/60 relative">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-50 dark:bg-blue-950/20 text-blue-500 border border-blue-100 rounded-xl flex items-center justify-center shadow-sm">
                    <Target className="h-5 w-5" />
                  </div>
                  <DialogTitle className="font-extrabold text-lg">Target Band</DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  {bands.map((band) => {
                    const isSelected = selectedTargetBand === band;
                    return (
                      <button
                        key={band}
                        type="button"
                        onClick={() => setSelectedTargetBand(band)}
                        className={cn(
                          "py-3 text-center text-sm font-bold rounded-xl transition-all border cursor-pointer",
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-950/20 border-blue-500 text-blue-600 dark:text-blue-400 border-2 font-black shadow-md shadow-blue-500/10"
                            : "bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        {band.toFixed(1)}
                      </button>
                    );
                  })}
                </div>
                <Button
                  onClick={async () => {
                    setSavingTarget(true);
                    try {
                      await api.put("/user/profile", { targetBand: selectedTargetBand, target_band: selectedTargetBand });
                      localStorage.setItem("lmshub_target_band", selectedTargetBand.toString());
                      toast.success(t("userDashboard.toast.targetBandSaved", "Maqsadli ball saqlandi"));
                      await refresh();
                      setStats(prev => {
                        if (!prev) return null;
                        return {
                          ...prev,
                          target_band: selectedTargetBand
                        };
                      });
                      setOpenKey(null);
                    } catch (e: any) {
                      toast.error(e.response?.data?.message || "Xatolik yuz berdi");
                    } finally {
                      setSavingTarget(false);
                    }
                  }}
                  disabled={savingTarget}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all border-none cursor-pointer"
                >
                  {savingTarget ? t("userDashboard.modal.saving", "Saqlanmoqda...") : "Saqlash"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      }
      case "avg": {
        return (
          <Dialog {...common}>
            <DialogContent className={cn(dialogClass, "shadow-2xl rounded-[24px] max-w-md p-6 border")}>
              <DialogHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4 dark:border-white/[0.06] border-slate-100/60 relative">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-violet-50 dark:bg-violet-950/20 text-violet-500 border border-violet-100 rounded-xl flex items-center justify-center shadow-sm">
                    <Activity className="h-5 w-5" />
                  </div>
                  <DialogTitle className="font-extrabold text-lg">O'rtacha ball</DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-6">
                {loadingAttempts ? (
                  <div className="py-12 flex items-center justify-center">
                    <span className="animate-spin text-2xl">⏳</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {breakdown.modules.map((m) => {
                      const hasTests = m.count > 0;
                      const scoreStr = m.avg !== null ? m.avg.toFixed(1) : "--";
                      const testsText = hasTests 
                        ? `${m.count} test` 
                        : (m.id === "mock" ? "urinish yo'q" : "test yo'q");
                      
                      const pct = m.avg !== null ? (m.avg / 9.0) * 100 : 0;
                      
                      // Progress bar colors matching module themes
                      let barColor = "bg-blue-500";
                      if (m.id === "reading") barColor = "bg-emerald-500";
                      if (m.id === "speaking") barColor = "bg-orange-500";
                      if (m.id === "writing") barColor = "bg-purple-500";
                      if (m.id === "mock") barColor = "bg-cyan-500";

                      return (
                        <div key={m.id} className="flex items-center gap-4 text-xs font-bold">
                          <span className="w-20 text-slate-500 dark:text-slate-400 capitalize flex items-center gap-1.5 shrink-0">
                            <span>{m.icon}</span> <span>{m.label}</span>
                          </span>
                          <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all duration-500", barColor)} style={{ width: `${pct}%` }} />
                          </div>
                          <div className="w-20 text-right flex flex-col shrink-0">
                            <span className="text-slate-900 dark:text-white font-extrabold text-sm">{scoreStr}</span>
                            <span className="text-[10px] text-slate-400 font-semibold mt-0.5">{testsText}</span>
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex items-center justify-between border-t pt-4 dark:border-white/5 border-slate-100 mt-6 font-bold">
                      <span className="text-slate-800 dark:text-slate-350">Umumiy</span>
                      <span className="text-2xl font-black text-[#8B5CF6] dark:text-[#A855F7]">
                        {breakdown.overallAvg !== null ? breakdown.overallAvg.toFixed(1) : "--"}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border dark:border-white/5 border-slate-100 rounded-xl space-y-1.5 mt-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qanday hisoblanadi?</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                        Har bir sectionning o'rtacha bali (% → band) hisoblanib, mavjudlarining o'rtachasi olinadi.
                      </p>
                    </div>

                    <Button
                      onClick={() => {
                        setOpenKey(null);
                        navigate(`${basePath}/practice`);
                      }}
                      className="w-full py-3.5 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 mt-4 transition-all duration-200 cursor-pointer border-none"
                    >
                      Mashq qilish <span className="text-sm font-sans font-black">➔</span>
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        );
      }
      case "exam": {
        return (
          <Dialog {...common}>
            <DialogContent className={cn(dialogClass, "shadow-2xl rounded-[24px] max-w-sm p-6 border")}>
              <DialogHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4 dark:border-white/[0.06] border-slate-100/60 relative">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-rose-50 dark:bg-rose-955/20 text-rose-500 border border-rose-100 rounded-xl flex items-center justify-center shadow-sm">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <DialogTitle className="font-extrabold text-lg">Imtihon sanasi</DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-2">
                  <input
                    type="date"
                    value={examDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50/50 dark:bg-slate-900 font-bold text-slate-800 dark:text-slate-200 transition-all cursor-pointer"
                  />
                </div>
                <Button
                  onClick={saveExamDate}
                  disabled={!examDate || savingExam}
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg shadow-rose-500/20 transition-all border-none cursor-pointer"
                >
                  {savingExam ? t("userDashboard.modal.saving", "Saqlanmoqda...") : "Saqlash"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      }
      case "minutes":
        return (
          <Dialog {...common}>
            <DialogContent className={cn(dialogClass, "shadow-2xl rounded-[24px] max-w-sm p-6 border")}>
              <DialogHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4 dark:border-white/[0.06] border-slate-100/60 relative">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-orange-50 dark:bg-orange-955/20 text-orange-500 border border-orange-100 rounded-xl flex items-center justify-center shadow-sm">
                    <Clock className="h-5 w-5" />
                  </div>
                  <DialogTitle className="font-extrabold text-lg">{t("userDashboard.stats.practiceTime")}</DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className={cn("flex justify-between p-3.5 rounded-xl border font-bold text-xs", itemClass)}>
                  <span className="text-slate-450 dark:text-slate-400">{t("userDashboard.modal.total")}</span>
                  <span className="text-slate-850 dark:text-white font-extrabold">{(stats?.total_minutes || 0).toFixed(1)} {t("mockCategory.minutesShort")}</span>
                </div>
                <div className={cn("flex justify-between p-3.5 rounded-xl border font-bold text-xs", itemClass)}>
                  <span className="text-slate-450 dark:text-slate-400">{t("userDashboard.modal.activeDays")}</span>
                  <span className="text-slate-850 dark:text-white font-extrabold">{activeDays} / 7</span>
                </div>
                <div className={cn("flex justify-between p-3.5 rounded-xl border font-bold text-xs", itemClass)}>
                  <span className="text-slate-450 dark:text-slate-400">{t("userDashboard.modal.dailyAverage")}</span>
                  <span className="text-slate-850 dark:text-white font-extrabold">{avgMin} {t("mockCategory.minutesShort")}</span>
                </div>
                <div className={cn("flex justify-between p-3.5 rounded-xl border font-bold text-xs", itemClass)}>
                  <span className="text-slate-450 dark:text-slate-400">{t("userDashboard.modal.bestDay")}</span>
                  <span className="text-slate-850 dark:text-white font-extrabold">{maxMin.toFixed(1)} {t("mockCategory.minutesShort")}</span>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      case "streak":
        return (
          <Dialog {...common}>
            <DialogContent className={cn(dialogClass, "shadow-2xl rounded-[24px] max-w-sm p-6 border")}>
              <DialogHeader className="flex flex-row items-center justify-between border-b pb-4 mb-4 dark:border-white/[0.06] border-slate-100/60 relative">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-purple-50 dark:bg-purple-955/20 text-purple-500 border border-purple-100 rounded-xl flex items-center justify-center shadow-sm">
                    <Flame className="h-5 w-5" />
                  </div>
                  <DialogTitle className="font-extrabold text-lg">{t("userDashboard.stats.dailyStreak")}</DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-xs text-slate-450 dark:text-slate-400 font-bold leading-normal">
                  {t("userDashboard.modal.streakDesc", { count: stats?.streak })}
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {stats?.weekly_data?.map((d) => (
                    <span
                      key={d.day}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black ${
                        d.minutes > 0 
                          ? "bg-purple-650 text-white shadow-sm shadow-purple-500/10" 
                          : isDark ? "bg-white/5 text-slate-555 border border-white/5" : "bg-slate-100 text-slate-400 border border-transparent"
                      }`}
                    >
                      {d.day}
                    </span>
                  ))}
                </div>
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
                    className="text-left group w-full cursor-pointer focus:outline-none"
                  >
                    <div className={cn(
                      "p-4 h-full transition-all duration-300 rounded-[22px] border relative overflow-hidden bg-gradient-to-tr",
                      s.gradient,
                      "border-white/10 dark:border-white/5 shadow-md",
                      "group-hover:scale-[1.02] group-hover:-translate-y-1",
                      s.hoverClass
                    )}>
                      {/* Visual glass gloss shine layer inside the card */}
                      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-65 pointer-events-none" />
                      
                      <div className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center mb-3.5 border transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm",
                        s.iconClass
                      )}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <p className="font-display text-2xl font-extrabold tracking-tight leading-none text-white">
                        {s.value}
                      </p>
                      <p className={cn("text-[9px] font-black uppercase tracking-widest mt-2.5 truncate", s.labelClass)}>
                        {s.label}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
          </div>

          {/* Weekly Results Chart (Clean, Spacious, Floating Pills Layout similar to IELTS Hub) */}
          <Card className={cn(
            "p-6 shadow-xl rounded-[24px] border transition-all duration-300 overflow-hidden relative",
            isDark
              ? "bg-gradient-to-b from-[#18122a] to-[#110b1f] border-white/[0.04]"
              : "bg-gradient-to-b from-white to-[#fbfbfe] border-slate-100 shadow-slate-200/15"
          )}>
            {/* Header Row: Title & Total Badge */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className={cn("font-display font-black text-base tracking-tight", isDark ? "text-white" : "text-slate-900")}>
                  {t("userDashboard.chart.trendsTitle", "Weekly results")}
                </h3>
                <p className="text-[11px] text-slate-400 font-bold tracking-wide mt-0.5">
                  {t("userDashboard.chart.trendsDesc", "last 7 days")}
                </p>
              </div>
              {/* Total / Average Badge */}
              <div className={cn("px-3 py-1.5 rounded-full text-[11px] font-black border flex items-center gap-1.5 select-none transition-all duration-300", chartTheme.bgBadge)}>
                <span className="opacity-85">
                  {activeChartTab === "practice"
                    ? t("userDashboard.chart.totalPractice", "Total practice minutes this week")
                    : activeChartTab === "reading"
                    ? t("userDashboard.chart.avgReading", "Average Reading Score")
                    : activeChartTab === "listening"
                    ? t("userDashboard.chart.avgListening", "Average Listening Score")
                    : activeChartTab === "writing"
                    ? t("userDashboard.chart.avgWriting", "Average Writing Band")
                    : activeChartTab === "speaking"
                    ? t("userDashboard.chart.avgSpeaking", "Average Speaking Band")
                    : activeChartTab === "sat"
                    ? t("userDashboard.chart.avgSat", "Average SAT Score")
                    : t("userDashboard.chart.avgNC", "Average Score")}
                  :
                </span>
                <span>{activeTabTotal}</span>
              </div>
            </div>

            {/* Row 2: Floating Pill Buttons */}
            <div className="mt-4 mb-5 flex flex-wrap gap-2 select-none">
              {[
                { id: "practice", label: t("userDashboard.tabs.practice", "Practice Time") },
                { id: "reading", label: t("userDashboard.tabs.reading", "Reading") },
                { id: "listening", label: t("userDashboard.tabs.listening", "Listening") },
                { id: "writing", label: t("userDashboard.tabs.writing", "Writing") },
                { id: "speaking", label: t("userDashboard.tabs.speaking", "Speaking") },
                { id: "sat", label: t("userDashboard.tabs.sat", "SAT") },
                { id: "national_cert", label: t("userDashboard.tabs.national_cert", "National Certificate") }
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
                  <AreaChart data={composedChartData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                    <defs>
                      <linearGradient id={`chartFillGradient-${activeChartTab}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartTheme.stroke} stopOpacity={isDark ? 0.35 : 0.2} />
                        <stop offset="95%" stopColor={chartTheme.stroke} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    {/* Clean, high-fidelity soft grid lines */}
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} opacity={0.5} vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }}
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                      height={30}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: "bold" }}
                      tickLine={false}
                      axisLine={false}
                      domain={activeYDomain as any}
                      width={35}
                      dx={-2}
                    />
                    <ChartTooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey={activeChartTab}
                      stroke={chartTheme.stroke}
                      strokeWidth={2}
                      dot={renderCustomDot}
                      fillOpacity={1}
                      fill={`url(#chartFillGradient-${activeChartTab})`}
                      activeDot={{ r: 5, stroke: chartTheme.stroke, strokeWidth: 1.5, fill: isDark ? "#0f0c1b" : "#ffffff" }}
                      isAnimationActive={true}
                      animationDuration={500}
                      animationEasing="ease-in-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center text-center space-y-3.5 py-4 animate-fade-in select-none">
                  {/* Wave icon inside soft themed circular background */}
                  <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner transition-transform duration-300 hover:scale-105",
                    activeChartTab === "practice" ? "bg-green-500/10 text-green-500" :
                    activeChartTab === "reading" ? "bg-orange-500/10 text-orange-500" :
                    activeChartTab === "listening" ? "bg-blue-500/10 text-blue-500" :
                    activeChartTab === "writing" ? "bg-amber-500/10 text-amber-500" :
                    activeChartTab === "speaking" ? "bg-purple-500/10 text-purple-500" :
                    activeChartTab === "sat" ? "bg-cyan-500/10 text-cyan-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {/* Nice soft wave icon */}
                    <TrendingUp className="h-6 w-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <p className={cn("text-xs font-semibold tracking-tight", isDark ? "text-slate-200" : "text-slate-700")}>
                      {t(`userDashboard.empty.${activeChartTab}.title`, "No activity yet")}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold max-w-[280px] leading-relaxed mx-auto">
                      {t(`userDashboard.empty.${activeChartTab}.desc`, "Start practicing to see your weekly progress.")}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      const pathMap: Record<string, string> = {
                        reading: `${basePath}/mocks/c/reading`,
                        listening: `${basePath}/mocks/c/listening`,
                        writing: `${basePath}/mocks/c/writing`,
                        speaking: `${basePath}/speaking`,
                        sat: `${basePath}/mocks/c/sat`,
                        national_cert: `${basePath}/mocks/c/national_cert`
                      };
                      navigate(pathMap[activeChartTab] || `${basePath}/practice`);
                    }}
                    className={cn(
                      "px-5 py-1.5 h-auto rounded-xl text-[10px] font-black shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg text-white",
                      activeChartTab === "practice" ? "bg-green-600 hover:bg-green-700 shadow-green-500/20" :
                      activeChartTab === "reading" ? "bg-orange-600 hover:bg-orange-700 shadow-orange-500/20" :
                      activeChartTab === "listening" ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20" :
                      activeChartTab === "writing" ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20" :
                      activeChartTab === "speaking" ? "bg-purple-600 hover:bg-purple-700 shadow-purple-500/20" :
                      activeChartTab === "sat" ? "bg-cyan-600 hover:bg-cyan-700 shadow-cyan-500/20" : "bg-red-600 hover:bg-red-700 shadow-red-500/20"
                    )}
                  >
                    {t("practice.startBtn", "Start Practice")}
                  </Button>
                </div>
              )}
            </div>
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
