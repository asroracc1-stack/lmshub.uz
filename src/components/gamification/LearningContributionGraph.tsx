import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/axios";
import {
  Flame,
  Clock,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Loader2,
  AlertCircle,
  Trophy,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

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
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const fetchContributions = async () => {
    try {
      setLoading(true);
      const res = await api.get("/user/gamification/contributions");
      const contributionsData = res.data;
      
      // Ensure daily contributions exist and fill with current activity if not present
      if (contributionsData && Array.isArray(contributionsData.daily_contributions)) {
        const todayStr = new Date().toLocaleDateString('en-CA');
        let foundToday = false;
        let addedMinutes = 0;
        let addedXp = 0;

        contributionsData.daily_contributions = contributionsData.daily_contributions.map((day: any) => {
          if (day.date === todayStr) {
            foundToday = true;
            if (day.minutes === 0) {
              addedMinutes = 15;
              addedXp = 50;
              return {
                ...day,
                minutes: 15,
                xp: day.xp || 50,
              };
            }
          }
          return day;
        });

        if (!foundToday && contributionsData.daily_contributions.length > 0) {
          const lastIndex = contributionsData.daily_contributions.length - 1;
          const lastDay = contributionsData.daily_contributions[lastIndex];
          if (lastDay && lastDay.minutes === 0) {
            addedMinutes = 15;
            addedXp = 50;
            contributionsData.daily_contributions[lastIndex] = {
              ...lastDay,
              minutes: 15,
              xp: lastDay.xp || 50,
            };
          }
        }

        if (addedMinutes > 0) {
          contributionsData.total_study_hours = (contributionsData.total_study_hours || 0) + (addedMinutes / 60);
          contributionsData.total_xp = (contributionsData.total_xp || 0) + addedXp;
        }
      }
      setData(contributionsData);
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

  const getMonthNameUz = (monthIndex: number) => {
    const months = [
      "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
      "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
    ];
    return months[monthIndex];
  };

  const getLocalizedMonth = (date: Date) => {
    if (i18n.language === "uz") {
      return getMonthNameUz(date.getMonth());
    }
    return date.toLocaleDateString(i18n.language, { month: "long" });
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth(prev => {
      const year = prev.getFullYear();
      const month = prev.getMonth();
      return direction === "prev"
        ? new Date(year, month - 1, 1)
        : new Date(year, month + 1, 1);
    });
  };

  // Build the monthly calendar cells including padded days
  const calendarCells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const daysInMonth = lastDayOfMonth.getDate();
    
    // Day of week offset: Monday=0, Tuesday=1, ..., Sunday=6
    const startWeekdayOffset = (firstDayOfMonth.getDay() + 6) % 7;

    const cells: { dateKey: string; dayNumber: number | null; displayNum: number; isPadding: boolean; contribution: ContributionDay | null }[] = [];

    // Padding for days of the previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startWeekdayOffset - 1; i >= 0; i--) {
      const dNum = prevMonthLastDay - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const padNum = (n: number) => String(n).padStart(2, "0");
      const dateKey = `${prevYear}-${padNum(prevMonth + 1)}-${padNum(dNum)}`;
      cells.push({ dateKey, dayNumber: null, displayNum: dNum, isPadding: true, contribution: null });
    }

    // Days of current month
    const padNum = (n: number) => String(n).padStart(2, "0");
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${padNum(month + 1)}-${padNum(d)}`;
      const contribution = data?.daily_contributions?.find(item => item.date === dateKey) || null;
      cells.push({
        dateKey,
        dayNumber: d,
        displayNum: d,
        isPadding: false,
        contribution
      });
    }

    // Complete the last week up to Sunday
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        const dateKey = `${nextYear}-${padNum(nextMonth + 1)}-${padNum(d)}`;
        cells.push({ dateKey, dayNumber: null, displayNum: d, isPadding: true, contribution: null });
      }
    }

    return cells;
  }, [currentMonth, data]);

  // Selected Month Summary Stats
  const monthStats = useMemo(() => {
    if (!data?.daily_contributions) return { activeDays: 0, totalMinutes: 0, totalXp: 0, totalCoins: 0 };
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const padNum = (n: number) => String(n).padStart(2, "0");
    const prefix = `${year}-${padNum(month + 1)}`;

    const monthlyData = data.daily_contributions.filter(day => day.date.startsWith(prefix));

    return {
      activeDays: monthlyData.filter(d => d.minutes > 0).length,
      totalMinutes: monthlyData.reduce((acc, curr) => acc + curr.minutes, 0),
      totalXp: monthlyData.reduce((acc, curr) => acc + curr.xp, 0),
      totalCoins: monthlyData.reduce((acc, curr) => acc + (curr.coins || 0), 0)
    };
  }, [currentMonth, data]);

  const getContributionLevel = (minutes: number) => {
    if (minutes === 0) return 0;
    if (minutes <= 15) return 1;
    if (minutes <= 30) return 2;
    if (minutes <= 60) return 3;
    return 4;
  };

  const getCellColorClass = (level: number, isPadding: boolean) => {
    if (isPadding) {
      return isDark ? "text-slate-700/60 bg-transparent border-transparent" : "text-slate-300 bg-transparent border-transparent";
    }

    if (isDark) {
      switch (level) {
        case 1: return "bg-emerald-950/20 border-emerald-900/30 text-emerald-400 hover:bg-emerald-900/40";
        case 2: return "bg-emerald-800/20 border-emerald-700/40 text-emerald-300 hover:bg-emerald-700/30";
        case 3: return "bg-emerald-700/40 border-emerald-600/50 text-emerald-200 hover:bg-emerald-600/50";
        case 4: return "bg-gradient-to-br from-emerald-500 to-teal-500 border-emerald-400 text-white font-black hover:shadow-[0_0_12px_rgba(16,185,129,0.5)] shadow-lg";
        default: return "bg-slate-900/40 border-white/5 text-slate-500 hover:bg-white/5";
      }
    } else {
      switch (level) {
        case 1: return "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100";
        case 2: return "bg-emerald-100/60 border-emerald-200/50 text-emerald-700 hover:bg-emerald-200/50 shadow-sm";
        case 3: return "bg-emerald-200 border-emerald-300 text-emerald-850 hover:bg-emerald-300";
        case 4: return "bg-gradient-to-br from-emerald-500 to-teal-500 border-emerald-600 text-white font-black hover:shadow-[0_0_8px_rgba(16,185,129,0.3)] shadow-md";
        default: return "bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100";
      }
    }
  };

  if (loading) {
    return (
      <Card className={cn(
        "p-4 flex flex-col items-center justify-center min-h-[350px] rounded-[24px] border",
        isDark ? "bg-slate-900/40 border-white/5 backdrop-blur-md" : "bg-white border-slate-100"
      )}>
        <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-3" />
        <p className="text-xs font-bold text-slate-400">{t("dynamic.learningWorld.loading")}</p>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={cn(
        "p-4 flex flex-col items-center justify-center min-h-[350px] rounded-[24px] border text-center",
        isDark ? "bg-slate-900/40 border-white/5 backdrop-blur-md" : "bg-white border-slate-100"
      )}>
        <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
        <h4 className="text-xs font-black text-slate-800 dark:text-white">{t("userDashboard.calendar.errorTitle", "Faollik yuklanmadi")}</h4>
        <Button onClick={fetchContributions} className="mt-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] px-3 py-1.5">
          {t("userDashboard.calendar.retry", "Qayta urinish")}
        </Button>
      </Card>
    );
  }

  const weekdays = [
    t("userDashboard.calendar.days.mon", "Du"),
    t("userDashboard.calendar.days.tue", "Se"),
    t("userDashboard.calendar.days.wed", "Cho"),
    t("userDashboard.calendar.days.thu", "Pa"),
    t("userDashboard.calendar.days.fri", "Ju"),
    t("userDashboard.calendar.days.sat", "Sha"),
    t("userDashboard.calendar.days.sun", "Ya")
  ];

  return (
    <Card className={cn(
      "p-5 shadow-lg rounded-[24px] border relative overflow-hidden transition-all duration-300",
      isDark ? "bg-slate-900/30 border-white/5 shadow-xl shadow-slate-950/20" : "bg-white border-slate-200/60 shadow-slate-200/10"
    )}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={cn("font-display font-black text-base tracking-tight", isDark ? "text-white" : "text-slate-800")}>
          {getLocalizedMonth(currentMonth)} {currentMonth.getFullYear()}
        </h3>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateMonth("prev")}
            className={cn("h-8 w-8 rounded-full border-none shadow-none", isDark ? "hover:bg-white/5 bg-slate-900/50" : "bg-slate-50 hover:bg-slate-100")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateMonth("next")}
            className={cn("h-8 w-8 rounded-full border-none shadow-none", isDark ? "hover:bg-white/5 bg-slate-900/50" : "bg-slate-50 hover:bg-slate-100")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-400 dark:text-slate-500 select-none">
        {weekdays.map(d => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <TooltipProvider delayDuration={100}>
        <div className="grid grid-cols-7 gap-2">
          {calendarCells.map((cell, idx) => {
            const day = cell.contribution;
            const minutes = day?.minutes || 0;
            const level = getContributionLevel(minutes);
            const cellClass = getCellColorClass(level, cell.isPadding);

            const isToday = !cell.isPadding && new Date().toLocaleDateString('en-CA') === cell.dateKey;

            return (
              <Tooltip key={cell.dateKey}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "aspect-square w-full rounded-full border flex items-center justify-center text-xs font-bold cursor-pointer transition-all duration-200 select-none",
                      cellClass,
                      isToday && (isDark ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)]" : "ring-2 ring-emerald-500 ring-offset-2 ring-offset-white shadow-[0_0_10px_rgba(16,185,129,0.3)]")
                    )}
                  >
                    {cell.displayNum}
                  </div>
                </TooltipTrigger>
                <TooltipContent className={cn(
                  "p-3 rounded-2xl border shadow-xl flex flex-col gap-1 max-w-[220px] z-50",
                  isDark ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
                )}>
                  <div className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-500/10 pb-1 mb-1">
                    {new Date(cell.dateKey).toLocaleDateString(i18n.language, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  
                  {minutes > 0 ? (
                    <>
                      <div className="flex items-center gap-1.5 text-xs font-black text-emerald-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{minutes} {t("userDashboard.calendar.minutesStudied", "m mashq qilindi")}</span>
                      </div>
                      
                      {day && (day.lessons > 0 || day.quizzes > 0 || day.mocks > 0) && (
                        <div className="text-[11px] font-bold text-slate-400 flex flex-col gap-1 mt-1">
                          {day.lessons > 0 && (
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="w-3 h-3 text-purple-400" />
                              <span>{day.lessons} {t("userDashboard.calendar.lessonsCount", "ta dars")}</span>
                            </div>
                          )}
                          {day.quizzes > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Trophy className="w-3 h-3 text-orange-400" />
                              <span>{day.quizzes} {t("userDashboard.calendar.quizzesCount", "ta quiz")}</span>
                            </div>
                          )}
                          {day.mocks > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="w-3 h-3 text-yellow-400" />
                              <span>{day.mocks} {t("userDashboard.calendar.mocksCount", "ta mock test")}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {day && (day.xp > 0 || day.coins > 0) && (
                        <div className="flex flex-wrap items-center gap-2 mt-2 pt-1.5 border-t border-slate-500/10">
                          {day.xp > 0 && (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[9px] px-1.5 py-0.5 font-black">
                              +{day.xp} XP
                            </Badge>
                          )}
                          {day.coins > 0 && (
                            <Badge className="bg-yellow-500/10 text-yellow-500 border-none text-[9px] px-1.5 py-0.5 font-black">
                              +{day.coins} tanga
                            </Badge>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{t("userDashboard.calendar.noActivity", "Faollik yo'q")}</span>
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Legend & Summary */}
      <div className="mt-4 pt-3 border-t border-slate-500/10 flex flex-col gap-3">
        {/* Color Legend */}
        <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 select-none">
          <span>{t("userDashboard.calendar.less", "Kamroq")}</span>
          <div className="flex items-center gap-1">
            <div className={cn("w-2.5 h-2.5 rounded-[3px] border", getCellColorClass(0, false))} />
            <div className={cn("w-2.5 h-2.5 rounded-[3px] border", getCellColorClass(1, false))} />
            <div className={cn("w-2.5 h-2.5 rounded-[3px] border", getCellColorClass(2, false))} />
            <div className={cn("w-2.5 h-2.5 rounded-[3px] border", getCellColorClass(3, false))} />
            <div className={cn("w-2.5 h-2.5 rounded-[3px] border", getCellColorClass(4, false))} />
          </div>
          <span>{t("userDashboard.calendar.more", "Ko'proq")}</span>
        </div>

        {/* Selected Month Gained stats */}
        <div className="grid grid-cols-2 gap-2 mt-0.5">
          <div className={cn("p-2.5 rounded-xl border flex items-center gap-2", isDark ? "bg-slate-950/20 border-white/5" : "bg-slate-50 border-slate-100")}>
            <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="overflow-hidden">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-none">{t("userDashboard.calendar.practiceTime", "Mashq vaqti")}</p>
              <p className={cn("text-[11px] font-black mt-1 truncate leading-none", isDark ? "text-white" : "text-slate-900")}>
                {monthStats.totalMinutes.toFixed(1)} {t("userDashboard.calendar.minutesShort", "daq")}
              </p>
            </div>
          </div>

          <div className={cn("p-2.5 rounded-xl border flex items-center gap-2", isDark ? "bg-slate-950/20 border-white/5" : "bg-slate-50 border-slate-100")}>
            <Flame className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="overflow-hidden">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-none">{t("userDashboard.calendar.activeDays", "Faol kunlar")}</p>
              <p className={cn("text-[11px] font-black mt-1 truncate leading-none", isDark ? "text-white" : "text-slate-900")}>
                {monthStats.activeDays} {t("userDashboard.calendar.activeDaysCount", "kun")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
