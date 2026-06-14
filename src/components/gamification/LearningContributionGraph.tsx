import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/axios";
import {
  Flame,
  Trophy,
  Clock,
  Sparkles,
  Coins,
  BookOpen,
  ArrowRight,
  Loader2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ContributionDay {
  date: string;
  minutes: number;
  lessons: number;
  quizzes: number;
  mocks: number;
  xp: number;
  coins: number;
}

interface ContributionStats {
  current_streak: number;
  longest_streak: number;
  total_study_hours: number;
  total_xp: number;
  total_coins: number;
  daily_contributions: ContributionDay[];
}

export default function LearningContributionGraph() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [data, setData] = useState<ContributionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContributions = async () => {
    try {
      setLoading(true);
      const res = await api.get("/user/gamification/contributions");
      setData(res.data);
      setError(null);
    } catch (err) {
      console.error("Failed to load contributions", err);
      setError("Failed to load contribution data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContributions();
  }, []);

  // Map month key to localized string
  const getLocalizedMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    const months = [
      t("dynamic.learningGraph.months.jan"),
      t("dynamic.learningGraph.months.feb"),
      t("dynamic.learningGraph.months.mar"),
      t("dynamic.learningGraph.months.apr"),
      t("dynamic.learningGraph.months.may"),
      t("dynamic.learningGraph.months.jun"),
      t("dynamic.learningGraph.months.jul"),
      t("dynamic.learningGraph.months.aug"),
      t("dynamic.learningGraph.months.sep"),
      t("dynamic.learningGraph.months.oct"),
      t("dynamic.learningGraph.months.nov"),
      t("dynamic.learningGraph.months.dec"),
    ];
    return months[d.getMonth()];
  };

  // Build a structured 53x7 grid representing the 365 days aligned by day of week
  const gridData = useMemo(() => {
    if (!data || !data.daily_contributions || data.daily_contributions.length === 0) return null;

    const list = data.daily_contributions;
    
    // Earliest date
    const firstDay = new Date(list[0].date);
    
    // Day of week offset: Mon=0, Tue=1, ..., Sun=6
    // Date.getDay(): Sun=0, Mon=1, ..., Sat=6
    const getWeekdayOffset = (date: Date) => {
      return (date.getDay() + 6) % 7;
    };

    const startOffset = getWeekdayOffset(firstDay);
    
    // Generate full list of cells, padded at the beginning
    const cells: (ContributionDay | null)[] = [];
    
    // Prepend padding cells
    for (let i = 0; i < startOffset; i++) {
      cells.push(null);
    }
    
    // Add real days
    list.forEach(day => {
      cells.push(day);
    });

    // Group into 53 columns (weeks), each containing 7 rows (days)
    const weeks: (ContributionDay | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      const week = cells.slice(i, i + 7);
      // Pad end of last week if it is incomplete
      while (week.length < 7) {
        week.push(null);
      }
      weeks.push(week);
    }

    return weeks;
  }, [data]);

  // Determine contribution level based on study minutes
  const getContributionLevel = (minutes: number) => {
    if (minutes === 0) return 0;
    if (minutes <= 15) return 1;
    if (minutes <= 30) return 2;
    if (minutes <= 60) return 3;
    return 4;
  };

  // Color mappings for levels
  const getCellColorClass = (level: number) => {
    if (isDark) {
      switch (level) {
        case 1: return "bg-emerald-900 border-emerald-850 hover:bg-emerald-800";
        case 2: return "bg-emerald-700 border-emerald-650 hover:bg-emerald-600";
        case 3: return "bg-emerald-500 border-emerald-450 hover:bg-emerald-450 hover:shadow-[0_0_8px_rgba(16,185,129,0.6)]";
        case 4: return "bg-emerald-400 border-emerald-350 hover:bg-emerald-300 hover:shadow-[0_0_12px_rgba(52,211,153,0.8)]";
        default: return "bg-slate-800/80 border-slate-700/50 hover:bg-slate-700/60";
      }
    } else {
      switch (level) {
        case 1: return "bg-green-100 border-green-200 hover:bg-green-200";
        case 2: return "bg-green-300 border-green-400 hover:bg-green-400";
        case 3: return "bg-green-500 border-green-600 hover:bg-green-650";
        case 4: return "bg-green-700 border-green-800 hover:bg-green-800";
        default: return "bg-white border-slate-200/80 hover:bg-slate-50";
      }
    }
  };

  if (loading) {
    return (
      <Card className={cn(
        "p-12 flex flex-col items-center justify-center min-h-[350px] rounded-[2rem] border",
        isDark ? "bg-slate-900/40 border-white/5 backdrop-blur-md" : "bg-white border-slate-100"
      )}>
        <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4" />
        <p className={cn("text-sm font-bold", isDark ? "text-slate-400" : "text-slate-500")}>
          {t("dynamic.learningWorld.loading")}
        </p>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={cn(
        "p-8 flex flex-col items-center justify-center min-h-[300px] rounded-[2rem] border text-center",
        isDark ? "bg-slate-900/40 border-white/5 backdrop-blur-md" : "bg-white border-slate-100"
      )}>
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h4 className={cn("text-lg font-black", isDark ? "text-white" : "text-slate-900")}>
          Error Loading Progress
        </h4>
        <p className="text-sm text-slate-500 mt-2 max-w-md">
          {error || "We encountered an issue fetching your activity history."}
        </p>
        <Button onClick={fetchContributions} className="mt-4 bg-purple-600 hover:bg-purple-700 text-white rounded-full px-6 py-2">
          Retry
        </Button>
      </Card>
    );
  }

  const hasActivity = data.daily_contributions.some(day => day.minutes > 0);

  return (
    <Card className={cn(
      "p-8 shadow-2xl rounded-[2rem] border relative overflow-hidden transition-all duration-300",
      isDark ? "bg-slate-900/40 backdrop-blur-md border-white/5" : "bg-white border-slate-100 shadow-slate-200/50"
    )}>
      {/* Background radial glow */}
      {isDark && (
        <div className="absolute -right-40 -top-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />
      )}

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h3 className={cn("font-display font-black text-2xl tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {t("dynamic.learningGraph.title")}
          </h3>
          <p className={cn("text-xs font-bold uppercase tracking-widest mt-1", isDark ? "text-slate-400" : "text-slate-500")}>
            {t("dynamic.learningGraph.subtitle")}
          </p>
        </div>
        {hasActivity && (
          <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-4 py-1.5 rounded-full font-black text-xs">
            {data.total_study_hours.toFixed(1)} {t("dynamic.learningGraph.hours")}
          </Badge>
        )}
      </div>

      {/* Streaks and Totals Panel */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        <div className={cn(
          "p-4 rounded-2xl border flex flex-col items-center justify-center text-center",
          isDark ? "bg-slate-800/40 border-white/5" : "bg-slate-50 border-slate-100"
        )}>
          <div className="p-2.5 bg-orange-500/10 rounded-full text-orange-500 mb-2">
            <Flame className="w-5 h-5 fill-orange-500/20" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            {t("dynamic.learningGraph.currentStreak")}
          </span>
          <span className={cn("text-lg font-black mt-1", isDark ? "text-white" : "text-slate-900")}>
            {data.current_streak} {t("dynamic.learningGraph.days")}
          </span>
        </div>

        <div className={cn(
          "p-4 rounded-2xl border flex flex-col items-center justify-center text-center",
          isDark ? "bg-slate-800/40 border-white/5" : "bg-slate-50 border-slate-100"
        )}>
          <div className="p-2.5 bg-amber-500/10 rounded-full text-amber-500 mb-2">
            <Trophy className="w-5 h-5 fill-amber-500/20" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            {t("dynamic.learningGraph.longestStreak")}
          </span>
          <span className={cn("text-lg font-black mt-1", isDark ? "text-white" : "text-slate-900")}>
            {data.longest_streak} {t("dynamic.learningGraph.days")}
          </span>
        </div>

        <div className={cn(
          "p-4 rounded-2xl border flex flex-col items-center justify-center text-center",
          isDark ? "bg-slate-800/40 border-white/5" : "bg-slate-50 border-slate-100"
        )}>
          <div className="p-2.5 bg-violet-500/10 rounded-full text-violet-500 mb-2">
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            {t("dynamic.learningGraph.totalStudyHours")}
          </span>
          <span className={cn("text-lg font-black mt-1", isDark ? "text-white" : "text-slate-900")}>
            {data.total_study_hours.toFixed(1)} {t("dynamic.learningGraph.hours")}
          </span>
        </div>

        <div className={cn(
          "p-4 rounded-2xl border flex flex-col items-center justify-center text-center",
          isDark ? "bg-slate-800/40 border-white/5" : "bg-slate-50 border-slate-100"
        )}>
          <div className="p-2.5 bg-blue-500/10 rounded-full text-blue-500 mb-2">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            {t("dynamic.learningGraph.totalXp")}
          </span>
          <span className={cn("text-lg font-black mt-1", isDark ? "text-white" : "text-slate-900")}>
            {data.total_xp} XP
          </span>
        </div>

        <div className={cn(
          "p-4 rounded-2xl border flex flex-col items-center justify-center text-center col-span-2 sm:col-span-1",
          isDark ? "bg-slate-800/40 border-white/5" : "bg-slate-50 border-slate-100"
        )}>
          <div className="p-2.5 bg-yellow-500/10 rounded-full text-yellow-500 mb-2">
            <Coins className="w-5 h-5 fill-yellow-500/20" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            {t("dynamic.learningGraph.totalCoins")}
          </span>
          <span className={cn("text-lg font-black mt-1", isDark ? "text-white" : "text-slate-900")}>
            {data.total_coins}
          </span>
        </div>
      </div>

      {/* Main Contribution Graph */}
      {!hasActivity ? (
        /* Empty State Illustration */
        <div className={cn(
          "flex flex-col items-center justify-center py-12 px-6 border rounded-[2rem] text-center",
          isDark ? "bg-slate-800/20 border-white/5" : "bg-slate-50/50 border-slate-100"
        )}>
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl animate-pulse" />
            <span className="relative text-5xl filter drop-shadow-lg block animate-bounce-slow">📚</span>
          </div>
          
          <h4 className={cn("text-xl font-black mb-2 tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {t("dynamic.learningGraph.emptyStateTitle")}
          </h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
            {t("dynamic.learningGraph.emptyStateDesc")}
          </p>

          <Button asChild className="bg-gradient-to-r from-purple-600 to-violet-500 hover:from-purple-700 hover:to-violet-600 text-white rounded-full px-8 py-3 h-auto font-black shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all duration-300">
            <a href="/ielts">
              {t("dynamic.learningGraph.startLearningBtn")}
              <ArrowRight className="w-4 h-4 ml-2 animate-pulse" />
            </a>
          </Button>
        </div>
      ) : (
        /* The Actual Grid */
        <div className="w-full">
          {/* Scrollable grid container */}
          <div className="overflow-x-auto pb-4 custom-scrollbar">
            <div className="min-w-[760px] flex flex-col pt-2 select-none">
              
              {/* Month Labels row */}
              <div className="flex pl-8 mb-2 h-5 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                {gridData?.map((week, weekIdx) => {
                  // Find the first non-null day in the week
                  const validDay = week.find(d => d !== null);
                  if (!validDay) return <div key={weekIdx} className="w-[12px] mr-[3px]" />;
                  
                  const d = new Date(validDay.date);
                  const isFirstColOfMonth = d.getDate() <= 7;
                  
                  if (isFirstColOfMonth) {
                    return (
                      <div key={weekIdx} className="w-[12px] mr-[3px] relative">
                        <span className="absolute left-0 top-0 whitespace-nowrap">
                          {getLocalizedMonth(validDay.date)}
                        </span>
                      </div>
                    );
                  }
                  return <div key={weekIdx} className="w-[12px] mr-[3px]" />;
                })}
              </div>

              {/* Grid content: Weekdays on left, Columns of squares on right */}
              <div className="flex">
                {/* Weekday Row Labels (Mon, Wed, Fri) */}
                <div className="flex flex-col justify-between h-[102px] w-8 pr-2 text-[10px] font-black text-slate-500 text-right pt-[1px]">
                  <span>{t("dynamic.learningGraph.weekdays.mon")}</span>
                  <span>{t("dynamic.learningGraph.weekdays.wed")}</span>
                  <span>{t("dynamic.learningGraph.weekdays.fri")}</span>
                </div>

                {/* Contribution Board Grid */}
                <div className="flex">
                  <TooltipProvider delayDuration={50}>
                    {gridData?.map((week, weekIdx) => (
                      <div key={weekIdx} className="flex flex-col gap-[3px] mr-[3px]">
                        {week.map((day, dayIdx) => {
                          if (!day) {
                            return (
                              <div
                                key={dayIdx}
                                className="w-[12px] h-[12px] rounded-[3px] bg-transparent pointer-events-none"
                              />
                            );
                          }

                          const level = getContributionLevel(day.minutes);
                          const cellClass = getCellColorClass(level);
                          
                          // Format localized tooltips
                          const studyTimeText = `${day.minutes.toFixed(1)} ${t("dynamic.learningGraph.studyMinutes")}`;
                          const lessonsText = day.lessons > 0 ? `${day.lessons} ${t("dynamic.learningGraph.lessons")}` : null;
                          const quizzesText = day.quizzes > 0 ? `${day.quizzes} ${t("dynamic.learningGraph.quizzes")}` : null;
                          const mocksText = day.mocks > 0 ? `${day.mocks} ${t("dynamic.learningGraph.mocks")}` : null;
                          const xpText = day.xp > 0 ? `+${day.xp} XP` : null;
                          const coinsText = day.coins > 0 ? `+${day.coins} ${t("dynamic.learningWorld.coins")}` : null;

                          return (
                            <Tooltip key={day.date}>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "w-[12px] h-[12px] rounded-[3px] border transition-all duration-150 cursor-pointer",
                                    cellClass
                                  )}
                                />
                              </TooltipTrigger>
                              <TooltipContent className={cn(
                                "p-3 rounded-2xl border shadow-xl flex flex-col gap-1 max-w-[200px] z-50",
                                isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
                              )}>
                                <div className="text-[10px] font-black text-slate-500 uppercase border-b border-slate-500/10 pb-1 mb-1">
                                  {new Date(day.date).toLocaleDateString(i18n.language, {
                                    weekday: 'short',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-500">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{studyTimeText}</span>
                                </div>
                                {lessonsText && (
                                  <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                                    <BookOpen className="w-3 h-3 text-purple-400" />
                                    <span>{lessonsText}</span>
                                  </div>
                                )}
                                {quizzesText && (
                                  <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                                    <Trophy className="w-3 h-3 text-orange-400" />
                                    <span>{quizzesText}</span>
                                  </div>
                                )}
                                {mocksText && (
                                  <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                                    <Sparkles className="w-3 h-3 text-yellow-400" />
                                    <span>{mocksText}</span>
                                  </div>
                                )}
                                {(xpText || coinsText) && (
                                  <div className="flex flex-wrap items-center gap-2 mt-1 pt-1.5 border-t border-slate-500/10">
                                    {xpText && (
                                      <Badge className="bg-blue-500/10 text-blue-500 border-none text-[9px] px-1.5 py-0.5 font-black">
                                        {xpText}
                                      </Badge>
                                    )}
                                    {coinsText && (
                                      <Badge className="bg-yellow-500/10 text-yellow-500 border-none text-[9px] px-1.5 py-0.5 font-black">
                                        {coinsText}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    ))}
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </div>

          {/* Legend indicator */}
          <div className="flex items-center justify-between mt-4 text-[10px] font-bold text-slate-500 select-none">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider">
              {data.daily_contributions.filter(d => d.minutes > 0).length} {t("dynamic.learningGraph.days")} {t("dynamic.learningGraph.contribution")}
            </span>
            <div className="flex items-center gap-1">
              <span>{t("dynamic.learningGraph.less")}</span>
              <div className={cn("w-3 h-3 rounded-[3px] border", getCellColorClass(0))} />
              <div className={cn("w-3 h-3 rounded-[3px] border", getCellColorClass(1))} />
              <div className={cn("w-3 h-3 rounded-[3px] border", getCellColorClass(2))} />
              <div className={cn("w-3 h-3 rounded-[3px] border", getCellColorClass(3))} />
              <div className={cn("w-3 h-3 rounded-[3px] border", getCellColorClass(4))} />
              <span>{t("dynamic.learningGraph.more")}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
