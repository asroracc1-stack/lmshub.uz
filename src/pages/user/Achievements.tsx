import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"all" | "in_progress" | "completed" | "secret">("all");

  const coins = profile?.coins ?? 0;

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
    const profileSetupCompleted = !!profile?.exam_date;

    return [
      {
        id: "first_step",
        name: "Birinchi Qadam",
        description: "LMSHub platformasiga birinchi marta tizimga kirdingiz",
        type: "special",
        icon: Zap,
        iconBg: "from-amber-500/20 to-yellow-500/25 border-amber-500/30",
        iconColor: "text-amber-400",
        xpReward: 100,
        progressMax: 1,
        progressCurrent: 1,
        isCompleted: true
      },
      {
        id: "profile_setup",
        name: "Profil Sozlamalari",
        description: "Maqsadli ballingiz va imtihon sanasini o'rnating",
        type: "special",
        icon: UserCheck,
        iconBg: profileSetupCompleted 
          ? "from-purple-500/20 to-indigo-500/25 border-purple-500/30" 
          : "from-slate-800/80 to-slate-900/80 border-slate-700/30",
        iconColor: profileSetupCompleted ? "text-purple-400" : "text-slate-400",
        xpReward: 150,
        progressMax: 1,
        progressCurrent: profileSetupCompleted ? 1 : 0,
        isCompleted: profileSetupCompleted
      },
      {
        id: "streak_master",
        name: "Streak Master",
        description: "Ketma-ket kunlar davomida tizimda faol bo'ling",
        type: "core",
        icon: Flame,
        iconBg: "from-orange-500/20 to-red-500/25 border-orange-500/30",
        iconColor: "text-orange-400",
        xpReward: 500,
        levelText: coins >= 200 ? "Level 3 / 5" : coins >= 80 ? "Level 2 / 5" : "Level 1 / 5",
        progressMax: coins >= 200 ? 50 : coins >= 80 ? 20 : 7,
        progressCurrent: coins >= 200 ? Math.min(50, streakDays + 20) : coins >= 80 ? Math.min(20, streakDays + 8) : Math.min(7, streakDays),
        isCompleted: coins >= 400
      },
      {
        id: "practice_master",
        name: "Mock Master",
        description: "Platformada mock testlarni yakunlang",
        type: "core",
        icon: Target,
        iconBg: "from-emerald-500/20 to-teal-500/25 border-emerald-500/30",
        iconColor: "text-emerald-400",
        xpReward: 700,
        levelText: coins >= 300 ? "Level 4 / 5" : coins >= 100 ? "Level 2 / 5" : "Level 1 / 5",
        progressMax: coins >= 300 ? 100 : coins >= 100 ? 30 : 10,
        progressCurrent: Math.min(coins >= 300 ? 100 : coins >= 100 ? 30 : 10, testsCompleted),
        isCompleted: testsCompleted >= (coins >= 300 ? 100 : coins >= 100 ? 30 : 10)
      },
      {
        id: "vocabulary_master",
        name: "Lug'at Boyligi",
        description: "Yangi IELTS / SAT so'zlarini o'zlashtiring",
        type: "core",
        icon: BookOpen,
        iconBg: "from-blue-500/20 to-indigo-500/25 border-blue-500/30",
        iconColor: "text-blue-400",
        xpReward: 300,
        levelText: coins >= 150 ? "Level 2 / 5" : "Level 1 / 5",
        progressMax: coins >= 150 ? 50 : 20,
        progressCurrent: Math.min(coins >= 150 ? 50 : 20, Math.floor(coins / 3)),
        isCompleted: Math.floor(coins / 3) >= (coins >= 150 ? 50 : 20)
      },
      {
        id: "community_builder",
        name: "Hamjamiyat Yaratuvchi",
        description: "Referral havola orqali do'stlaringizni taklif qiling",
        type: "core",
        icon: Users,
        iconBg: "from-cyan-500/20 to-blue-500/25 border-cyan-500/30",
        iconColor: "text-cyan-400",
        xpReward: 400,
        levelText: "Level 1 / 5",
        progressMax: 1,
        progressCurrent: coins >= 100 ? 1 : 0,
        isCompleted: coins >= 100
      },
      {
        id: "ielts_legend",
        name: "IELTS Afsonasi",
        description: "Premium o'quvchi darajasiga erishing (500+ Coin)",
        type: "special",
        icon: Trophy,
        iconBg: "from-rose-500/20 to-pink-500/25 border-rose-500/30",
        iconColor: "text-rose-400",
        xpReward: 2000,
        progressMax: 500,
        progressCurrent: Math.min(500, coins),
        isCompleted: coins >= 500
      },
      {
        id: "secret_owl",
        name: "Tungi Boyqush",
        description: "Yarim tunda test topshirib, maxsus yutuqni oching",
        type: "secret",
        icon: Lock,
        iconBg: coins >= 300 
          ? "from-violet-500/20 to-fuchsia-500/25 border-violet-500/30" 
          : "from-slate-900/60 to-slate-950/60 border-slate-800/40",
        iconColor: coins >= 300 ? "text-violet-400" : "text-slate-500",
        xpReward: 1000,
        progressMax: 1,
        progressCurrent: coins >= 300 ? 1 : 0,
        isCompleted: coins >= 300,
        secretLabel: "Kamida Level 3 ga erishing"
      },
      {
        id: "secret_unstoppable",
        name: "To'xtatib Bo'lmas",
        description: "700 dan ortiq coin to'plab, eng oliy yutuqqa erishing",
        type: "secret",
        icon: Lock,
        iconBg: coins >= 700 
          ? "from-yellow-500/20 to-amber-500/25 border-yellow-500/30" 
          : "from-slate-900/60 to-slate-950/60 border-slate-800/40",
        iconColor: coins >= 700 ? "text-yellow-400" : "text-slate-500",
        xpReward: 3000,
        progressMax: 700,
        progressCurrent: Math.min(700, coins),
        isCompleted: coins >= 700,
        secretLabel: "700 coin to'plang"
      }
    ];
  }, [coins, streakDays, testsCompleted, profile?.exam_date]);

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
      { id: "1", text: "Birinchi Qadam yutug'i ochildi", time: "2 soat oldin", done: true },
    ];
    if (profile?.exam_date) {
      list.unshift({ id: "2", text: "Profil Sozlamalari yutug'i ochildi", time: "1 kun oldin", done: true });
    }
    if (coins >= 100) {
      list.unshift({ id: "3", text: "Hamjamiyat Yaratuvchi yutug'i ochildi", time: "3 kun oldin", done: true });
    }
    if (coins >= 300) {
      list.unshift({ id: "4", text: "Tungi Boyqush maxfiy nishoni ochildi!", time: "Yaqinda", done: true });
    }
    if (coins >= 500) {
      list.unshift({ id: "5", text: "IELTS Afsonasi darajasi faollashdi!", time: "Yaqinda", done: true });
    }
    return list.slice(0, 4);
  }, [coins, profile?.exam_date]);

  // Badge list for gallery
  const badgeGallery = useMemo(() => {
    return [
      { name: "Flame", gradient: "from-orange-500 to-red-500", unlocked: true },
      { name: "Time", gradient: "from-blue-400 to-indigo-600", unlocked: true },
      { name: "Trophy", gradient: "from-yellow-400 to-amber-600", unlocked: coins >= 50 },
      { name: "Target", gradient: "from-emerald-400 to-teal-600", unlocked: coins >= 100 },
      { name: "Book", gradient: "from-purple-500 to-pink-500", unlocked: coins >= 150 },
      { name: "Users", gradient: "from-cyan-400 to-blue-500", unlocked: coins >= 200 },
      { name: "Level", gradient: "from-violet-500 to-purple-800", unlocked: level >= 2 },
      { name: "Crown", gradient: "from-amber-500 to-orange-600", unlocked: level >= 3 },
      { name: "Centurion", gradient: "from-red-500 to-rose-700", unlocked: coins >= 500 },
      { name: "Star", gradient: "from-yellow-300 to-yellow-500", unlocked: coins >= 300 },
      { name: "Shield", gradient: "from-teal-400 to-emerald-600", unlocked: coins >= 150 },
      { name: "Lock", gradient: "from-slate-700 to-slate-800", unlocked: false }
    ];
  }, [coins, level]);

  const timelineEvents = useMemo(() => {
    const list = [
      { date: "Bugun", title: "LMS Hub-ga xush kelibsiz!", desc: "Platformada birinchi qadamingiz." },
    ];
    if (profile?.exam_date) {
      list.unshift({ date: "Kecha", title: "Maqsad belgilandi", desc: "Imtihon topshirish sanasini o'rnatdingiz." });
    }
    if (testsCompleted > 0) {
      list.unshift({ date: "Hafta boshida", title: "Birinchi Mock Test", desc: "Mock imtihonini muvaffaqiyatli yakunladingiz." });
    }
    if (coins >= 100) {
      list.unshift({ date: "O'tgan hafta", title: "Coin Master", desc: "Balansingiz 100 dan ortiq coinga yetdi." });
    }
    return list;
  }, [coins, profile?.exam_date, testsCompleted]);

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-200 font-sans antialiased p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* TOP LEVEL OVERVIEW CARD */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 relative overflow-hidden p-6 bg-[#0f172a]/70 border-slate-800/60 backdrop-blur-md rounded-2xl flex flex-col md:flex-row items-center gap-8 shadow-xl">
            {/* Glowing background highlights */}
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-[90px] pointer-events-none" />
            <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-[90px] pointer-events-none" />
            
            {/* Left Big Trophy */}
            <div className="relative flex-shrink-0 flex items-center justify-center h-40 w-40 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 shadow-lg shadow-primary/5">
              <motion.div 
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10"
              >
                <Trophy className="h-20 w-20 text-yellow-400 filter drop-shadow-[0_4px_12px_rgba(250,204,21,0.25)]" />
              </motion.div>
              <div className="absolute inset-0 rounded-full bg-yellow-400/5 animate-pulse" />
            </div>

            {/* Middle Level and Progress */}
            <div className="flex-1 w-full space-y-4 text-center md:text-left">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-emerald-400 tracking-wider uppercase flex items-center justify-center md:justify-start gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Achievement Daraja
                </span>
                <div className="flex items-baseline justify-center md:justify-start gap-2">
                  <h1 className="text-5xl font-black font-display text-white tracking-tight">{level}</h1>
                  <span className="text-sm font-semibold text-slate-400">daraja</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-slate-400">{coins} coin to'plangan</span>
                  <span className="text-emerald-400 font-bold">{levelProgressPercent}%</span>
                </div>
                <Progress value={levelProgressPercent} className="h-2.5 bg-slate-900 border border-slate-800/40 rounded-full overflow-hidden" />
                <p className="text-[11px] text-slate-400">
                  Keyingi daraja uchun yana <strong className="text-white font-semibold">{xpToNextLevel} coin</strong> to'plashingiz kerak
                </p>
              </div>

              {/* Badges and Streak mini badges */}
              <div className="flex items-center justify-center md:justify-start gap-3 pt-2">
                <Badge className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 px-3 py-1 text-xs gap-1">
                  <Flame className="h-3.5 w-3.5 fill-orange-400/25" /> {streakDays} Kunlik Streak
                </Badge>
                <Badge className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 px-3 py-1 text-xs gap-1">
                  <Shield className="h-3.5 w-3.5" /> {completedCount} Nishon ochilgan
                </Badge>
              </div>
            </div>
          </Card>

          {/* Right Info Circle Card */}
          <Card className="relative overflow-hidden p-6 bg-[#0f172a]/70 border-slate-800/60 backdrop-blur-md rounded-2xl flex flex-col justify-between shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Star className="h-5 w-5 fill-emerald-400/25" />
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px]">Leaderboard</Badge>
            </div>
            
            <div className="space-y-2 pt-6">
              <h3 className="text-xl font-bold text-white tracking-tight">Ajoyib natija!</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Siz hozirda platformadagi barcha faol o'quvchilar orasida coin yig'ish ko'rsatkichi bo'yicha <strong className="text-emerald-400 font-semibold">top 12%</strong> guruhidasiz. Shunday davom eting!
              </p>
            </div>
          </Card>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Ketma-ket faollik", value: `${streakDays} Kun`, desc: "Joriy streak muddati", icon: Flame, color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
            { label: "Jami to'plangan XP", value: `${xp} Ball`, desc: `${coins} ta coinga asosan`, icon: Trophy, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
            { label: "Ochilgan nishonlar", value: `${completedCount} ta`, desc: "Nishonlar va medallar", icon: Shield, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
            { label: "Tugatilgan mocklar", value: `${testsCompleted} ta`, desc: "Mock testlar topshiriqlari", icon: Target, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" }
          ].map((item, i) => (
            <Card key={i} className="p-4 bg-[#0f172a]/50 border-slate-800/50 backdrop-blur-sm rounded-xl space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{item.label}</span>
                <div className={`h-8 w-8 rounded-lg border flex items-center justify-center ${item.color}`}>
                  <item.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xl font-extrabold text-white">{item.value}</h4>
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
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800/40 rounded-xl w-fit">
              {[
                { id: "all", label: "Barchasi" },
                { id: "in_progress", label: "Jarayonda", count: inProgressCount },
                { id: "completed", label: "Bajarildi", count: completedCount },
                { id: "secret", label: "Maxfiy", count: secretCount }
              ].map(tab => (
                <Button
                  key={tab.id}
                  variant="ghost"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 h-8 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === tab.id
                      ? "bg-[#0f172a] text-white shadow-md border border-slate-800/60"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ml-1.5 rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-400 border border-slate-800/40">
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
                      <Card className={`p-4 h-full flex flex-col justify-between bg-[#0f172a]/55 border-slate-800/60 backdrop-blur-sm rounded-2xl transition-all ${
                        ach.isCompleted 
                          ? "border-emerald-500/20 hover:border-emerald-500/30" 
                          : "hover:border-slate-700/60"
                      }`}>
                        
                        <div className="space-y-4">
                          {/* Card Header (Icon, Title, XP, Lock status) */}
                          <div className="flex items-start justify-between gap-3">
                            <div className={`h-11 w-11 rounded-xl bg-gradient-to-br border flex items-center justify-center ${ach.iconBg}`}>
                              {isLocked ? (
                                <Lock className="h-5 w-5 text-slate-500" />
                              ) : (
                                <IconComp className={`h-5 w-5 ${ach.iconColor}`} />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-sm font-bold text-white truncate">
                                  {isLocked ? "???" : ach.name}
                                </h4>
                                {ach.isCompleted && (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 fill-emerald-500/10" />
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-medium">
                                {isLocked ? `Maxfiy yutuq: ${ach.secretLabel}` : ach.levelText || "Maxsus topshiriq"}
                              </p>
                            </div>

                            <Badge className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ach.isCompleted 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                                : "bg-primary/10 text-primary border border-primary/20"
                            }`}>
                              +{ach.xpReward} XP
                            </Badge>
                          </div>

                          {/* Card Description */}
                          <p className="text-xs text-slate-400 leading-relaxed min-h-[32px]">
                            {isLocked ? "Ushbu yutuq shartlarini bajarib uni ochishingiz kerak. Hozircha yopiq." : ach.description}
                          </p>
                        </div>

                        {/* Card Progress */}
                        {!isLocked && (
                          <div className="space-y-2 pt-4">
                            <div className="flex items-center justify-between text-[10px] font-semibold">
                              <span className="text-slate-500">Jarayon</span>
                              <span className="text-slate-300">
                                {ach.progressCurrent} / {ach.progressMax}
                              </span>
                            </div>
                            <Progress 
                              value={Math.round((ach.progressCurrent / ach.progressMax) * 100)} 
                              className="h-1.5 bg-slate-900 border border-slate-800/40 rounded-full overflow-hidden" 
                            />
                          </div>
                        )}

                        {isLocked && (
                          <div className="mt-4 p-2 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500">
                            <Eye className="h-3 w-3" /> Qulfni ochish uchun faol bo'ling
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
            <Card className="p-5 bg-[#0f172a]/70 border-slate-800/60 backdrop-blur-md rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                  <Shield className="h-4.5 w-4.5 text-primary" /> Medal galereyasi
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold">{completedCount} / 12</span>
              </div>

              {/* Hexagonal/Shield Medals Grid */}
              <div className="grid grid-cols-4 gap-3">
                {badgeGallery.map((badge, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className={`relative h-12 w-12 rounded-xl flex items-center justify-center border transition-all ${
                      badge.unlocked 
                        ? `bg-gradient-to-br ${badge.gradient}/15 border-${badge.gradient.split(" ")[0].replace("from-", "")}/30 shadow-[0_2px_10px_rgba(0,0,0,0.2)]`
                        : "bg-slate-900/60 border-slate-800/40 text-slate-600"
                    }`}>
                      {badge.unlocked ? (
                        <Star className={`h-6 w-6 text-white fill-white/10`} />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* RECENT ACTIVITY LOG */}
            <Card className="p-5 bg-[#0f172a]/70 border-slate-800/60 backdrop-blur-md rounded-2xl shadow-xl space-y-4">
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-emerald-400" /> Oxirgi natijalar
              </h3>

              <div className="space-y-3.5">
                {recentActivities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 text-xs leading-relaxed">
                    <div className="h-2 w-2 mt-1.5 rounded-full bg-emerald-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 font-medium">{act.text}</p>
                      <span className="text-[9px] text-slate-500">{act.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* ACHIEVEMENT TIMELINE */}
            <Card className="p-5 bg-[#0f172a]/70 border-slate-800/60 backdrop-blur-md rounded-2xl shadow-xl space-y-4">
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-blue-400" /> Tarixiy xronologiya
              </h3>

              <div className="relative border-l border-slate-800 pl-4 ml-2 space-y-4">
                {timelineEvents.map((evt, i) => (
                  <div key={i} className="relative space-y-1">
                    <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-blue-500 border-2 border-[#070b13]" />
                    <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">{evt.date}</span>
                    <h5 className="text-xs font-bold text-white leading-none">{evt.title}</h5>
                    <p className="text-[10px] text-slate-500 leading-normal">{evt.desc}</p>
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
