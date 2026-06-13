import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Award, Flame, Trophy, Star, Shield, Target, BookOpen, Users, 
  Zap, UserCheck, Lock, Eye, Calendar, Sparkles, CheckCircle2, ChevronRight, Activity, Clock
} from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  type: "core" | "special" | "secret";
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  xpReward: number;
  levelText?: string;
  progressMax: number;
  progressCurrent: number;
  isCompleted: boolean;
  secretLabel?: string;
}

export default function UserAchievements() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<"all" | "in_progress" | "completed" | "secret">("all");

  // Fetch real user profile data dynamically from backend API
  const { data: profileData, isLoading: loadingProfile } = useQuery({
    queryKey: ["user-profile-achievements"],
    queryFn: async () => {
      const res = await api.get("/user/profile");
      return res.data;
    },
    staleTime: 30 * 1000 // cache for 30s
  });

  const coins = profileData?.coins ?? 0;
  const examDate = profileData?.examDate || profileData?.exam_date;

  // 1. Dynamic Calculations based on Coins
  const level = useMemo(() => Math.floor(coins / 150) + 1, [coins]);
  const xp = useMemo(() => coins * 15, [coins]);
  const nextLevelXp = useMemo(() => level * 150 * 15, [level]);
  const currentLevelStartXp = useMemo(() => (level - 1) * 150 * 15, [level]);
  const levelProgressPercent = useMemo(() => {
    const totalXpInThisLevel = nextLevelXp - currentLevelStartXp;
    const earnedXpInThisLevel = xp - currentLevelStartXp;
    return Math.min(100, Math.max(0, Math.round((earnedXpInThisLevel / totalXpInThisLevel) * 100)));
  }, [xp, level, nextLevelXp, currentLevelStartXp]);

  const xpToNextLevel = useMemo(() => (level * 150) - coins, [level, coins]);

  // Streak calculation (mock-dynamic: based on coins to show active status)
  const streakDays = useMemo(() => {
    if (coins === 0) return 0;
    return (coins % 12) + 3; // Mocking a reasonable streak between 3 and 14 days
  }, [coins]);

  const testsCompleted = useMemo(() => Math.max(0, Math.floor(coins / 4)), [coins]);

  // 2. Define Achievements with dynamic progress based on user's coins
  const achievements: Achievement[] = useMemo(() => {
    const profileSetupCompleted = !!examDate;

    return [
      {
        id: "first_step",
        name: t("achievements.firstStepName"),
        description: t("achievements.firstStepDesc"),
        type: "special",
        icon: Zap,
        iconBg: "from-amber-500/20 to-yellow-500/25 border-amber-500/30 dark:border-amber-500/30",
        iconColor: "text-amber-500 dark:text-amber-400",
        xpReward: 100,
        progressMax: 1,
        progressCurrent: 1,
        isCompleted: true
      },
      {
        id: "profile_setup",
        name: t("achievements.profileSetupName"),
        description: t("achievements.profileSetupDesc"),
        type: "special",
        icon: UserCheck,
        iconBg: profileSetupCompleted 
          ? "from-purple-500/20 to-indigo-500/25 border-purple-500/30 dark:border-purple-500/30" 
          : "from-slate-200 to-slate-300 dark:from-slate-800/80 dark:to-slate-900/80 border-slate-300 dark:border-slate-700/30",
        iconColor: profileSetupCompleted ? "text-purple-600 dark:text-purple-400" : "text-slate-500 dark:text-slate-400",
        xpReward: 150,
        progressMax: 1,
        progressCurrent: profileSetupCompleted ? 1 : 0,
        isCompleted: profileSetupCompleted
      },
      {
        id: "streak_master",
        name: t("achievements.streakMasterName"),
        description: t("achievements.streakMasterDesc"),
        type: "core",
        icon: Flame,
        iconBg: "from-orange-500/20 to-red-500/25 border-orange-500/30 dark:border-orange-500/30",
        iconColor: "text-orange-500 dark:text-orange-400",
        xpReward: 500,
        levelText: coins >= 200 ? "Level 3 / 5" : coins >= 80 ? "Level 2 / 5" : "Level 1 / 5",
        progressMax: coins >= 200 ? 50 : coins >= 80 ? 20 : 7,
        progressCurrent: coins >= 200 ? Math.min(50, streakDays + 20) : coins >= 80 ? Math.min(20, streakDays + 8) : Math.min(7, streakDays),
        isCompleted: coins >= 400
      },
      {
        id: "practice_master",
        name: t("achievements.practiceMasterName"),
        description: t("achievements.practiceMasterDesc"),
        type: "core",
        icon: Target,
        iconBg: "from-purple-500/20 to-violet-500/25 border-purple-500/30 dark:border-purple-500/30",
        iconColor: "text-purple-600 dark:text-purple-400",
        xpReward: 700,
        levelText: coins >= 300 ? "Level 4 / 5" : coins >= 100 ? "Level 2 / 5" : "Level 1 / 5",
        progressMax: coins >= 300 ? 100 : coins >= 100 ? 30 : 10,
        progressCurrent: Math.min(coins >= 300 ? 100 : coins >= 100 ? 30 : 10, testsCompleted),
        isCompleted: testsCompleted >= (coins >= 300 ? 100 : coins >= 100 ? 30 : 10)
      },
      {
        id: "vocabulary_master",
        name: t("achievements.vocabularyMasterName"),
        description: t("achievements.vocabularyMasterDesc"),
        type: "core",
        icon: BookOpen,
        iconBg: "from-blue-500/20 to-indigo-500/25 border-blue-500/30 dark:border-blue-500/30",
        iconColor: "text-blue-600 dark:text-blue-400",
        xpReward: 300,
        levelText: coins >= 150 ? "Level 2 / 5" : "Level 1 / 5",
        progressMax: coins >= 150 ? 50 : 20,
        progressCurrent: Math.min(coins >= 150 ? 50 : 20, Math.floor(coins / 3)),
        isCompleted: Math.floor(coins / 3) >= (coins >= 150 ? 50 : 20)
      },
      {
        id: "community_builder",
        name: t("achievements.communityBuilderName"),
        description: t("achievements.communityBuilderDesc"),
        type: "core",
        icon: Users,
        iconBg: "from-fuchsia-500/20 to-blue-500/25 border-fuchsia-500/30 dark:border-fuchsia-500/30",
        iconColor: "text-fuchsia-600 dark:text-fuchsia-400",
        xpReward: 400,
        levelText: "Level 1 / 5",
        progressMax: 1,
        progressCurrent: coins >= 100 ? 1 : 0,
        isCompleted: coins >= 100
      },
      {
        id: "ielts_legend",
        name: t("achievements.ieltsLegendName"),
        description: t("achievements.ieltsLegendDesc"),
        type: "special",
        icon: Trophy,
        iconBg: "from-rose-500/20 to-pink-500/25 border-rose-500/30 dark:border-rose-500/30",
        iconColor: "text-rose-500 dark:text-rose-400",
        xpReward: 2000,
        progressMax: 500,
        progressCurrent: Math.min(500, coins),
        isCompleted: coins >= 500
      },
      {
        id: "secret_owl",
        name: t("achievements.secretOwlName"),
        description: t("achievements.secretOwlDesc"),
        type: "secret",
        icon: Lock,
        iconBg: coins >= 300 
          ? "from-violet-500/20 to-fuchsia-500/25 border-violet-500/30 dark:border-violet-500/30" 
          : "from-slate-100 to-slate-200 dark:from-slate-900/60 dark:to-slate-950/60 border-slate-200 dark:border-slate-800/40",
        iconColor: coins >= 300 ? "text-violet-500 dark:text-violet-400" : "text-slate-400 dark:text-slate-500",
        xpReward: 1000,
        progressMax: 1,
        progressCurrent: coins >= 300 ? 1 : 0,
        isCompleted: coins >= 300,
        secretLabel: t("achievements.secretOwlLabel", "Kamida Level 3 ga erishing")
      },
      {
        id: "secret_unstoppable",
        name: t("achievements.secretUnstoppableName"),
        description: t("achievements.secretUnstoppableDesc"),
        type: "secret",
        icon: Lock,
        iconBg: coins >= 700 
          ? "from-yellow-500/20 to-amber-500/25 border-yellow-500/30 dark:border-yellow-500/30" 
          : "from-slate-100 to-slate-200 dark:from-slate-900/60 dark:to-slate-950/60 border-slate-200 dark:border-slate-800/40",
        iconColor: coins >= 700 ? "text-yellow-600 dark:text-yellow-400" : "text-slate-400 dark:text-slate-500",
        xpReward: 3000,
        progressMax: 700,
        progressCurrent: Math.min(700, coins),
        isCompleted: coins >= 700,
        secretLabel: t("achievements.secretUnstoppableLabel", "700 coin to'plang")
      }
    ];
  }, [coins, streakDays, testsCompleted, examDate]);

  // 3. Filter achievements based on tabs
  const filteredAchievements = useMemo(() => {
    return achievements.filter(ach => {
      if (activeTab === "all") return true;
      if (activeTab === "in_progress") return !ach.isCompleted && ach.type !== "secret";
      if (activeTab === "completed") return ach.isCompleted;
      if (activeTab === "secret") return ach.type === "secret";
      return true;
    });
  }, [achievements, activeTab]);

  const completedCount = useMemo(() => achievements.filter(a => a.isCompleted).length, [achievements]);
  const inProgressCount = useMemo(() => achievements.filter(a => !a.isCompleted && a.type !== "secret").length, [achievements]);
  const secretCount = useMemo(() => achievements.filter(a => a.type === "secret").length, [achievements]);

  // Recent activity list
  const recentActivities = useMemo(() => {
    const list = [
      { id: "1", text: t("achievements.recent_activity_first_step", "Birinchi Qadam yutug'i ochildi"), time: t("time.hours_ago_2", "2 soat oldin"), done: true },
    ];
    if (examDate) {
      list.unshift({ id: "2", text: t("achievements.recent_activity_profile_setup", "Profil Sozlamalari yutug'i ochildi"), time: t("time.days_ago_1", "1 kun oldin"), done: true });
    }
    if (coins >= 100) {
      list.unshift({ id: "3", text: t("achievements.recent_activity_community_builder", "Hamjamiyat Yaratuvchi yutug'i ochildi"), time: t("time.days_ago_3", "3 kun oldin"), done: true });
    }
    if (coins >= 300) {
      list.unshift({ id: "4", text: t("achievements.recent_activity_secret_owl", "Tungi Boyqush maxfiy nishoni ochildi!"), time: t("time.just_now", "Yaqinda"), done: true });
    }
    if (coins >= 500) {
      list.unshift({ id: "5", text: t("achievements.recent_activity_ielts_legend", "IELTS Afsonasi darajasi faollashdi!"), time: t("time.just_now", "Yaqinda"), done: true });
    }
    return list.slice(0, 4);
  }, [coins, examDate, t]);

  // Badge list for gallery
  const badgeGallery = useMemo(() => {
    return [
      { name: "Flame", gradient: "from-orange-500 to-red-500", unlocked: true },
      { name: "Time", gradient: "from-blue-400 to-indigo-600", unlocked: true },
      { name: "Trophy", gradient: "from-yellow-400 to-amber-600", unlocked: coins >= 50 },
      { name: "Target", gradient: "from-purple-400 to-violet-600", unlocked: coins >= 100 },
      { name: "Book", gradient: "from-purple-500 to-pink-500", unlocked: coins >= 150 },
      { name: "Users", gradient: "from-fuchsia-400 to-blue-500", unlocked: coins >= 200 },
      { name: "Level", gradient: "from-violet-500 to-purple-800", unlocked: level >= 2 },
      { name: "Crown", gradient: "from-amber-500 to-orange-600", unlocked: level >= 3 },
      { name: "Centurion", gradient: "from-red-500 to-rose-700", unlocked: coins >= 500 },
      { name: "Star", gradient: "from-yellow-300 to-yellow-500", unlocked: coins >= 300 },
      { name: "Shield", gradient: "from-violet-400 to-purple-600", unlocked: coins >= 150 },
      { name: "Lock", gradient: "from-slate-700 to-slate-800", unlocked: false }
    ];
  }, [coins, level]);

  const timelineEvents = useMemo(() => {
    const list = [
      { date: t("time.today", "Bugun"), title: t("achievements.timeline.welcome.title", "LMS Hub-ga xush kelibsiz!"), desc: t("achievements.timeline.welcome.desc", "Platformada birinchi qadamingiz.") },
    ];
    if (examDate) {
      list.unshift({ date: t("time.yesterday", "Kecha"), title: t("achievements.timeline.target.title", "Maqsad belgilandi"), desc: t("achievements.timeline.target.desc", "Imtihon topshirish sanasini o'rnatdingiz.") });
    }
    if (testsCompleted > 0) {
      list.unshift({ date: t("time.week_start", "Hafta boshida"), title: t("achievements.timeline.mock.title", "Birinchi Mock Test"), desc: t("achievements.timeline.mock.desc", "Mock imtihonini muvaffaqiyatli yakunladingiz.") });
    }
    if (coins >= 100) {
      list.unshift({ date: t("time.last_week", "O'tgan hafta"), title: t("achievements.timeline.coins.title", "Coin Master"), desc: t("achievements.timeline.coins.desc", "Balansingiz 100 dan ortiq coinga yetdi.") });
    }
    return list;
  }, [coins, examDate, testsCompleted, t]);

  // Loading skeleton layout
  if (loadingProfile) {
    return (
      <div className="w-full space-y-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 bg-white dark:bg-[#0f172a]/70 border-slate-200 dark:border-slate-800/60 rounded-2xl flex flex-col md:flex-row items-center gap-8">
              <Skeleton className="h-40 w-40 rounded-full" />
              <div className="flex-1 w-full space-y-4">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-6 w-full" />
              </div>
            </Card>
            <Card className="p-6 bg-white dark:bg-[#0f172a]/70 border-slate-200 dark:border-slate-800/60 rounded-2xl">
              <Skeleton className="h-8 w-1/3 mb-4" />
              <Skeleton className="h-20 w-full" />
            </Card>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4 bg-white dark:bg-[#0f172a]/50 border-slate-200 dark:border-slate-800/50 rounded-xl space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-2/3" />
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full text-slate-800 dark:text-slate-200 font-sans antialiased transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* TOP LEVEL OVERVIEW CARD */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 relative overflow-hidden p-6 bg-white dark:bg-[#0f172a]/70 border-slate-200 dark:border-slate-800/60 backdrop-blur-md rounded-2xl flex flex-col md:flex-row items-center gap-8 shadow-md dark:shadow-xl">
            {/* Glowing background highlights (Dark mode only or subtle in light mode) */}
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[90px] pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[90px] pointer-events-none" />
            
            {/* Left Big Trophy */}
            <div className="relative flex-shrink-0 flex items-center justify-center h-40 w-40 rounded-full bg-slate-100 dark:bg-gradient-to-br dark:from-primary/10 dark:to-primary/5 border border-slate-200 dark:border-primary/20 shadow-md">
              <motion.div 
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10"
              >
                <Trophy className="h-20 w-20 text-yellow-500 dark:text-yellow-400 filter drop-shadow-[0_4px_12px_rgba(250,204,21,0.25)]" />
              </motion.div>
              <div className="absolute inset-0 rounded-full bg-yellow-400/5 animate-pulse" />
            </div>

            {/* Middle Level and Progress */}
            <div className="flex-1 w-full space-y-4 text-center md:text-left">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 tracking-wider uppercase flex items-center justify-center md:justify-start gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> {t("achievements.title")}
                </span>
                <div className="flex items-baseline justify-center md:justify-start gap-2">
                  <h1 className="text-5xl font-black font-display text-slate-900 dark:text-white tracking-tight">{level}</h1>
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t("achievements.level").toLowerCase()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-500 dark:text-slate-400">{coins} {t("achievements.coinsEarned")}</span>
                  <span className="text-purple-600 dark:text-purple-400 font-bold">{levelProgressPercent}%</span>
                </div>
                <Progress value={levelProgressPercent} className="h-2.5 bg-slate-200 dark:bg-slate-900 border border-slate-300/65 dark:border-slate-800/40 rounded-full overflow-hidden" />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t("achievements.nextLevelSubtitle", { count: xpToNextLevel })}
                </p>
              </div>

              {/* Badges and Streak mini badges */}
              <div className="flex items-center justify-center md:justify-start gap-3 pt-2">
                <Badge className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/25 px-3 py-1 text-xs gap-1">
                  <Flame className="h-3.5 w-3.5 fill-orange-500/25" /> {t("achievements.streakDays", { count: streakDays })}
                </Badge>
                <Badge className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/25 px-3 py-1 text-xs gap-1">
                  <Shield className="h-3.5 w-3.5" /> {t("achievements.badgesUnlocked", { count: completedCount })}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Right Info Circle Card */}
          <Card className="relative overflow-hidden p-6 bg-white dark:bg-[#0f172a]/70 border-slate-200 dark:border-slate-800/60 backdrop-blur-md rounded-2xl flex flex-col justify-between shadow-md dark:shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Star className="h-5 w-5 fill-purple-500/25 dark:fill-purple-400/25" />
              </div>
              <Badge className="bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25 dark:border-purple-500/30 text-[10px]">Leaderboard</Badge>
            </div>
            
            <div className="space-y-2 pt-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{t("common.greatResult", "Ajoyib natija!")}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {t("achievements.leaderboardRank", { count: 12 })}
              </p>
            </div>
          </Card>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: t("dashboard.metric_streak", "Ketma-ket faollik"), value: t("achievements.streakDaysVal", "{{count}} Kun", { count: streakDays }), desc: t("achievements.streakDaysDesc", "Joriy streak muddati"), icon: Flame, color: "text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20" },
            { label: t("achievements.totalXpLabel", "Jami to'plangan XP"), value: t("achievements.xpValue", "{{count}} Ball", { count: xp }), desc: t("achievements.xpDesc", "{{count}} ta coinga asosan", { count: coins }), icon: Trophy, color: "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
            { label: t("achievements.badgesUnlockedCount", "Ochilgan nishonlar"), value: t("achievements.badgesCountVal", "{{count}} ta", { count: completedCount }), desc: t("achievements.badgesDesc", "Nishonlar va medallar"), icon: Shield, color: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20" },
            { label: t("achievements.completedMocksLabel", "Tugatilgan mocklar"), value: t("achievements.mocksCountVal", "{{count}} ta", { count: testsCompleted }), desc: t("achievements.mocksDesc", "Mock testlar topshiriqlari"), icon: Target, color: "text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20" }
          ].map((item, i) => (
            <Card key={i} className="p-4 bg-white dark:bg-[#0f172a]/50 border-slate-200 dark:border-slate-800/50 backdrop-blur-sm rounded-xl space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{item.label}</span>
                <div className={`h-8 w-8 rounded-lg border flex items-center justify-center ${item.color}`}>
                  <item.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xl font-extrabold text-slate-900 dark:text-white">{item.value}</h4>
                <p className="text-[10px] text-slate-500">{item.desc}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* MAIN LAYOUT (TABS & ACHIEVEMENTS + RIGHT SIDEBAR) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: TABS & ACHIEVEMENTS GRID */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* FILTER TABS */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/40 rounded-xl w-fit">
              {[
                { id: "all", label: t("achievements.tabs.all") },
                { id: "in_progress", label: t("achievements.tabs.in_progress"), count: inProgressCount },
                { id: "completed", label: t("achievements.tabs.completed"), count: completedCount },
                { id: "secret", label: t("achievements.tabs.secret"), count: secretCount }
              ].map(tab => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 h-8 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === tab.id
                      ? "bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-800/60"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900/40"
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ml-1.5 rounded-full bg-slate-200 dark:bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-800/40">
                      {tab.count}
                    </span>
                  )}
                </Button>
              ))}
            </div>

            {/* ACHIEVEMENTS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredAchievements.map(ach => {
                  const isLocked = ach.type === "secret" && !ach.isCompleted;
                  const IconComp = ach.icon;

                  return (
                    <motion.div
                      key={ach.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className={`p-4 h-full flex flex-col justify-between bg-white dark:bg-[#0f172a]/55 border-slate-200 dark:border-slate-800/60 backdrop-blur-sm rounded-2xl transition-all shadow-sm ${
                        ach.isCompleted 
                          ? "border-purple-500/20 dark:border-purple-500/20 hover:border-purple-500/40 dark:hover:border-purple-500/30" 
                          : "hover:border-slate-300 dark:hover:border-slate-700/60"
                      }`}>
                        
                        <div className="space-y-4">
                          {/* Card Header (Icon, Title, XP, Lock status) */}
                          <div className="flex items-start justify-between gap-3">
                            <div className={`h-11 w-11 rounded-xl bg-gradient-to-br border flex items-center justify-center ${ach.iconBg}`}>
                              {isLocked ? (
                                <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                              ) : (
                                <IconComp className={`h-5 w-5 ${ach.iconColor}`} />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                  {isLocked ? "???" : ach.name}
                                </h4>
                                {ach.isCompleted && (
                                  <CheckCircle2 className="h-4 w-4 text-purple-500 dark:text-purple-400 flex-shrink-0 fill-purple-500/10" />
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                {isLocked ? t("achievements.secretLabelText", "Maxfiy yutuq: {{requirement}}", { requirement: ach.secretLabel }) : ach.levelText || t("achievements.specialTask", "Maxsus topshiriq")}
                              </p>
                            </div>

                            <Badge className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ach.isCompleted 
                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25"
                                : "bg-primary/10 text-primary border border-primary/20"
                            }`}>
                              +{ach.xpReward} XP
                            </Badge>
                          </div>

                          {/* Card Description */}
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed min-h-[32px]">
                            {isLocked ? t("achievements.lockedDesc") : ach.description}
                          </p>
                        </div>

                        {/* Card Progress */}
                        {!isLocked && (
                          <div className="space-y-2 pt-4">
                            <div className="flex items-center justify-between text-[10px] font-semibold">
                              <span className="text-slate-500">{t("achievements.process")}</span>
                              <span className="text-slate-700 dark:text-slate-300">
                                {ach.progressCurrent} / {ach.progressMax}
                              </span>
                            </div>
                            <Progress 
                              value={Math.round((ach.progressCurrent / ach.progressMax) * 100)} 
                              className="h-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800/40 rounded-full overflow-hidden" 
                            />
                          </div>
                        )}

                        {isLocked && (
                          <div className="mt-4 p-2 bg-slate-100/60 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 rounded-xl flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                            <Eye className="h-3 w-3" /> {t("achievements.secretLabel")}
                          </div>
                        )}

                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* RIGHT: SIDEBAR STATS & TIMELINE */}
          <div className="space-y-8">
            
            {/* BADGE GALLERY */}
            <Card className="p-5 bg-white dark:bg-[#0f172a]/70 border-slate-200 dark:border-slate-800/60 backdrop-blur-md rounded-2xl shadow-md dark:shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="h-4.5 w-4.5 text-primary" /> {t("achievements.badgesUnlockedCount")}
                </h3>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{completedCount} / 12</span>
              </div>

              {/* Hexagonal/Shield Medals Grid */}
              <div className="grid grid-cols-4 gap-3">
                {badgeGallery.map((badge, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className={`relative h-12 w-12 rounded-xl flex items-center justify-center border transition-all ${
                      badge.unlocked 
                        ? `bg-gradient-to-br ${badge.gradient}/15 border-${badge.gradient.split(" ")[0].replace("from-", "")}/30 shadow-[0_2px_10px_rgba(0,0,0,0.1)]`
                        : "bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/40 text-slate-400 dark:text-slate-600"
                    }`}>
                      {badge.unlocked ? (
                        <Star className="h-6 w-6 text-yellow-500 dark:text-white fill-yellow-500/15 dark:fill-white/10" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* RECENT ACTIVITY LOG */}
            <Card className="p-5 bg-white dark:bg-[#0f172a]/70 border-slate-200 dark:border-slate-800/60 backdrop-blur-md rounded-2xl shadow-md dark:shadow-xl space-y-4">
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400" /> {t("achievements.recent")}
              </h3>

              <div className="space-y-3.5">
                {recentActivities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 text-xs leading-relaxed">
                    <div className="h-2 w-2 mt-1.5 rounded-full bg-purple-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700 dark:text-slate-200 font-medium">{act.text}</p>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500">{act.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* ACHIEVEMENT TIMELINE */}
            <Card className="p-5 bg-white dark:bg-[#0f172a]/70 border-slate-200 dark:border-slate-800/60 backdrop-blur-md rounded-2xl shadow-md dark:shadow-xl space-y-4">
              <h3 className="font-display font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-blue-500 dark:text-blue-400" /> {t("achievements.timeline")}
              </h3>

              <div className="relative border-l border-slate-250 dark:border-slate-800 pl-4 ml-2 space-y-4">
                {timelineEvents.map((evt, i) => (
                  <div key={i} className="relative space-y-1">
                    <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-blue-500 border-2 border-slate-50 dark:border-slate-950" />
                    <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{evt.date}</span>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white leading-none">{evt.title}</h5>
                    <p className="text-[10px] text-slate-400 leading-normal">{evt.desc}</p>
                  </div>
                ))}
              </div>
            </Card>

          </div>

        </div>

      </div>
    </div>
  );
}
