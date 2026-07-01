import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/axios";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Flame, Hourglass, BarChart3, Layers, BookOpen, Headphones, PenTool, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentAttempt {
  id: string;
  exam: {
    id: string;
    title: string;
    type: string;
  };
  overallBand?: number;
  totalScore?: number;
}

export default function UserPractice() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [attempts, setAttempts] = useState<StudentAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch student mock attempts dynamically
  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        const res = await api.get("/student/exams/attempts");
        setAttempts(res.data || []);
      } catch (err) {
        console.error("Failed to load attempts", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttempts();
  }, []);

  // Filter attempts per category
  const listeningCount = useMemo(() => attempts.filter(a => a.exam?.type?.toLowerCase() === "listening").length, [attempts]);
  const readingCount = useMemo(() => attempts.filter(a => a.exam?.type?.toLowerCase() === "reading").length, [attempts]);
  const writingCount = useMemo(() => attempts.filter(a => a.exam?.type?.toLowerCase() === "writing").length, [attempts]);
  const speakingCount = useMemo(() => attempts.filter(a => a.exam?.type?.toLowerCase() === "speaking").length, [attempts]);

  // Calculate total progress
  const totalCompleted = listeningCount + readingCount + writingCount + speakingCount;
  const showHero = totalCompleted === 0;

  // Premium modules data matching requirements
  const skills = [
    {
      id: "listening",
      tag: t("practice.listening.tag", "LISTENING"),
      title: t("practice.listening.title", "Eshitish 🎧"),
      desc: t("practice.listening.desc", "Eshitish ko'nikmalaringizni rivojlantiring"),
      completed: listeningCount,
      total: 12,
      path: "/student/mocks/c/listening",
      difficulty: t("practice.listening.diff", "O'rta"),
      difficultyColor: "text-emerald-500 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-500/20",
      estTime: 25, // 25 mins
      icon: Headphones,
      gradient: "from-blue-500/20 via-indigo-500/5 to-purple-500/10",
      glowColor: "group-hover:border-blue-500/40",
      svg: (
        <svg viewBox="0 0 200 160" className="w-full h-full object-contain">
          <defs>
            <linearGradient id="headphoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffd8b5" />
              <stop offset="100%" stopColor="#fca5a5" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="80" r="55" fill="#f0fdf4" className="dark:fill-slate-800/40" />
          <path d="M65,160 C65,120 78,105 100,105 C122,105 135,120 135,160" fill="#2d7a5f" className="dark:fill-emerald-800" />
          <rect x="94" y="90" width="12" height="15" rx="2" fill="url(#skinGrad)" />
          <circle cx="100" cy="80" r="20" fill="url(#skinGrad)" />
          <path d="M80,76 C80,58 120,58 120,76 C120,62 110,62 100,62 C90,62 80,62 80,76 Z" fill="#0f172a" />
          <path d="M76,80 C76,55 124,55 124,80" fill="none" stroke="url(#headphoneGrad)" strokeWidth="4.5" strokeLinecap="round" />
          <rect x="72" y="75" width="8" height="18" rx="4" fill="#4f46e5" />
          <rect x="120" y="75" width="8" height="18" rx="4" fill="#4f46e5" />
          <path d="M40,80 Q45,65 50,80" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" className="animate-pulse" />
          <path d="M35,90 Q45,75 55,90" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" className="animate-pulse" />
          <path d="M150,70 Q158,62 162,70" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" className="animate-pulse" />
          <path d="M155,80 Q167,72 171,80" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" className="animate-pulse" />
        </svg>
      )
    },
    {
      id: "reading",
      tag: t("practice.reading.tag", "READING"),
      title: t("practice.reading.title", "O'qish 📖"),
      desc: t("practice.reading.desc", "Matnlarni tushunish va tahlil qilish"),
      completed: readingCount,
      total: 24,
      path: "/student/mocks/c/reading",
      difficulty: t("practice.reading.diff", "O'rta"),
      difficultyColor: "text-emerald-500 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-500/20",
      estTime: 30, // 30 mins
      icon: BookOpen,
      gradient: "from-emerald-500/20 via-teal-500/5 to-emerald-500/10",
      glowColor: "group-hover:border-emerald-500/40",
      svg: (
        <svg viewBox="0 0 200 160" className="w-full h-full object-contain">
          <defs>
            <linearGradient id="bookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="80" r="55" fill="#f0fdf4" className="dark:fill-slate-800/40" />
          <path d="M65,160 C65,123 78,110 100,110 C122,110 135,123 135,160" fill="#2d7a5f" className="dark:fill-emerald-800" />
          <rect x="94" y="93" width="12" height="15" rx="2" fill="#ffd7b5" />
          <circle cx="100" cy="83" r="20" fill="#ffd7b5" />
          <path d="M80,83 C80,53 120,53 120,83 C120,98 123,115 123,120 C123,120 118,120 113,115 L100,88 L87,115 C82,120 77,120 77,120 C77,115 80,98 80,83 Z" fill="#0f172a" />
          <path d="M72,142 C86,128 100,137 100,137 C100,137 114,128 128,142 L128,115 C114,101 100,110 100,110 C100,110 86,101 72,115 Z" fill="url(#bookGrad)" />
          <path d="M100,110 L100,137" stroke="#ffffff" strokeWidth="1.5" />
          <line x1="80" y1="122" x2="92" y2="119" stroke="#ffffff" strokeWidth="1.2" opacity="0.6" />
          <line x1="80" y1="129" x2="92" y2="126" stroke="#ffffff" strokeWidth="1.2" opacity="0.6" />
          <line x1="108" y1="119" x2="120" y2="122" stroke="#ffffff" strokeWidth="1.2" opacity="0.6" />
          <line x1="108" y1="126" x2="120" y2="129" stroke="#ffffff" strokeWidth="1.2" opacity="0.6" />
        </svg>
      )
    },
    {
      id: "writing",
      tag: t("practice.writing.tag", "WRITING"),
      title: t("practice.writing.title", "O'qish ✍️"),
      desc: t("practice.writing.desc", "Yozma ifoda va grammatikani mukammallashtiring"),
      completed: writingCount,
      total: 10,
      path: "/student/mocks/c/writing",
      difficulty: t("practice.writing.diff", "Qiyin"),
      difficultyColor: "text-amber-500 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-500/20",
      estTime: 40, // 40 mins
      icon: PenTool,
      gradient: "from-amber-500/20 via-orange-500/5 to-amber-500/10",
      glowColor: "group-hover:border-amber-500/40",
      svg: (
        <svg viewBox="0 0 200 160" className="w-full h-full object-contain">
          <defs>
            <linearGradient id="lampGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="80" r="55" fill="#f0fdf4" className="dark:fill-slate-800/40" />
          <line x1="45" y1="140" x2="155" y2="140" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M60,160 C60,128 73,115 95,115 C117,115 130,128 130,160" fill="#2d7a5f" className="dark:fill-emerald-800" />
          <rect x="89" y="97" width="12" height="15" rx="2" fill="#ffd7b5" />
          <circle cx="95" cy="87" r="20" fill="#ffd7b5" />
          <path d="M75,87 C75,57 115,57 115,87 C115,75 105,75 95,75 C85,75 75,75 75,87 Z" fill="#1e293b" />
          <path d="M145,140 L145,90 L132,90" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M123,90 L141,90 L137,81 L127,81 Z" fill="#f59e0b" />
          <polygon points="118,140 146,140 137,90 127,90" fill="url(#lampGrad)" />
          <rect x="76" y="127" width="26" height="20" rx="1" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" transform="skewX(-10)" />
          <line x1="84" y1="132" x2="97" y2="132" stroke="#94a3b8" strokeWidth="1.2" />
          <line x1="82" y1="137" x2="95" y2="137" stroke="#94a3b8" strokeWidth="1.2" />
          <line x1="100" y1="122" x2="94" y2="131" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    },
    {
      id: "speaking",
      tag: t("practice.speaking.tag", "SPEAKING"),
      title: t("practice.speaking.title", "Gapirish 🗣️"),
      desc: t("practice.speaking.desc", "Og'zaki nutq va talaffuzni rivojlantiring"),
      completed: speakingCount,
      total: 9,
      isBeta: true,
      path: "/student/speaking",
      difficulty: t("practice.speaking.diff", "Murakkab"),
      difficultyColor: "text-purple-500 bg-purple-500/10 dark:text-purple-400 dark:bg-purple-500/20",
      estTime: 15, // 15 mins
      icon: Mic,
      gradient: "from-purple-500/20 via-pink-500/5 to-purple-500/10",
      glowColor: "group-hover:border-purple-500/40",
      svg: (
        <svg viewBox="0 0 200 160" className="w-full h-full object-contain">
          <circle cx="100" cy="80" r="55" fill="#f0fdf4" className="dark:fill-slate-800/40" />
          <path d="M65,160 C65,123 78,110 100,110 C122,110 135,123 135,160" fill="#2d7a5f" className="dark:fill-emerald-800" />
          <rect x="94" y="93" width="12" height="15" rx="2" fill="#ffd7b5" />
          <circle cx="100" cy="83" r="20" fill="#ffd7b5" />
          <path d="M80,83 C80,53 120,53 120,83 C120,75 110,75 100,75 C90,75 80,75 80,83 Z" fill="#0f172a" />
          <line x1="80" y1="123" x2="80" y2="145" stroke="#475569" strokeWidth="2.5" />
          <circle cx="80" cy="119" r="5" fill="#1e293b" />
          <path d="M125,73 C125,60 138,51 152,51 C166,51 175,60 175,73 C175,82 169,89 162,91 L166,97 L155,93 C153,94 151,94 149,94 C136,94 125,84 125,73 Z" fill="#22c55e" opacity="0.15" />
        </svg>
      )
    }
  ];

  return (
    <div className="w-full space-y-6 relative pb-10 font-sans select-none">
      {/* Background ambient glowing spheres */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-[400px] h-[400px] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* Page Header (Simple elegant layout) */}
      <div className="flex flex-col gap-1 text-left pb-2 border-b border-slate-200/40 dark:border-white/5">
        <h2 className={cn("text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
          {t("practice.title", "Amaliyot")}
        </h2>
        <p className="text-xs font-medium text-slate-400">
          {t("practice.desc", "IELTS ko'nikmalarini tizimli va interaktiv tarzda rivojlantiring.")}
        </p>
      </div>

      {loading ? (
        // Premium Skeleton Loader layout
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className={cn("p-8 rounded-[32px] border animate-pulse min-h-[250px]", isDark ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100")} />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Introductory Hero Banner for zero progress state */}
          <AnimatePresence>
            {showHero && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4 }}
                className={cn(
                  "p-8 rounded-[32px] border relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm backdrop-blur-md",
                  isDark 
                    ? "bg-slate-900/40 border-white/5 shadow-slate-950/20" 
                    : "bg-gradient-to-r from-emerald-50/50 via-white to-purple-50/30 border-slate-200/60 shadow-slate-200/5"
                )}
              >
                {/* Decorative blob in banner */}
                <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-gradient-to-br from-emerald-500/10 to-purple-500/10 rounded-full blur-[40px] -z-10" />
                
                {/* Motivational Content */}
                <div className="space-y-4 flex-1 text-left relative z-10">
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/40 px-3 py-1 rounded-full uppercase tracking-widest leading-none select-none">
                    {t("practice.startJourney", "Start Journey")}
                  </span>
                  <h3 className={cn("text-2xl md:text-3xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-800")}>
                    {t("practice.heroTitle", "O'quv safaringizni boshlang! 🚀")}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium max-w-xl leading-relaxed">
                    {t("practice.heroDesc", "Hali birorta ham mashg'ulotni yakunlamabsiz. Keling, birinchi tinglash yoki o'qish testidan boshlaymiz!")}
                  </p>
                  <Button
                    onClick={() => navigate("/student/mocks/c/listening")}
                    className="h-11 rounded-xl text-xs font-semibold text-white px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md shadow-emerald-500/20 transition-all duration-300"
                  >
                    {t("practice.heroCta", "Birinchi mashqni boshlash")}
                  </Button>
                </div>
                
                {/* Illustration with Floating Animation */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
                  className="w-40 h-40 shrink-0 relative z-10 flex items-center justify-center"
                >
                  <svg viewBox="0 0 200 200" className="w-full h-full object-contain">
                    <defs>
                      <linearGradient id="rocketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                    </defs>
                    <circle cx="100" cy="100" r="70" fill="url(#rocketGrad)" opacity="0.1" />
                    <path d="M100,40 L125,90 L100,78 L75,90 Z" fill="url(#rocketGrad)" />
                    <path d="M100,40 L112,90 L100,78 Z" fill="#4f46e5" opacity="0.8" />
                    <path d="M85,86 L70,115 L90,95 Z" fill="#ef4444" />
                    <path d="M115,86 L130,115 L110,95 Z" fill="#ef4444" />
                    <circle cx="100" cy="120" r="15" fill="#f59e0b" opacity="0.3" className="animate-ping" />
                    <circle cx="100" cy="120" r="8" fill="#f59e0b" />
                  </svg>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Practice Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
            {skills.map((skill, index) => {
              const progressPercent = Math.min(100, Math.round((skill.completed / skill.total) * 100));
              const remainingCount = Math.max(0, skill.total - skill.completed);
              const SkillIcon = skill.icon;
              
              return (
                <motion.div
                  key={skill.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: index * 0.1 }}
                  whileHover={{ y: -6 }}
                  className="w-full h-full"
                >
                  <Card className={cn(
                    "p-8 rounded-[32px] border relative overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-md hover:shadow-xl group backdrop-blur-md min-h-[280px]",
                    isDark 
                      ? "bg-slate-900/30 border-white/5 shadow-slate-950/20" 
                      : "bg-white border-slate-200/50 shadow-slate-200/5 hover:border-slate-350"
                  )}>
                    {/* Background glowing blob */}
                    <div className="absolute top-10 right-10 w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-500/5 blur-xl -z-10 group-hover:scale-125 transition-transform duration-500" />
                    
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
                      {/* Left Column: Metadata & Contents */}
                      <div className="space-y-4 flex-1 w-full text-left">
                        
                        {/* Upper Info row */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider leading-none select-none">
                              {skill.tag}
                            </span>
                            {skill.isBeta && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-purple-500 text-white select-none leading-none select-none">
                                BETA
                              </span>
                            )}
                          </div>

                          <h3 className={cn("text-2xl font-extrabold tracking-tight flex items-center leading-none", isDark ? "text-white" : "text-slate-800")}>
                            {skill.title}
                          </h3>

                          <p className="text-[12px] text-slate-400 font-medium leading-relaxed min-h-[36px]">
                            {skill.desc}
                          </p>
                        </div>

                        {/* Badges details grid */}
                        <div className="grid grid-cols-2 gap-3 max-w-[280px]">
                          {/* Difficulty badge */}
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-300">
                            <BarChart3 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                            <span>{t("practice.difficulty", "Qiyinlik")}:</span>
                            <span className={cn("px-1.5 py-0.5 rounded text-[10px] uppercase font-bold", skill.difficultyColor)}>
                              {skill.difficulty}
                            </span>
                          </div>

                          {/* Est Time badge */}
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-300">
                            <Hourglass className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                            <span>{t("practice.estTime", "Muddati")}:</span>
                            <span className="text-slate-600 dark:text-slate-200">
                              {skill.estTime} {t("practice.minsPerLesson", "daqiqa")}
                            </span>
                          </div>
                        </div>

                        {/* Completed & Remaining counter details */}
                        <div className="grid grid-cols-2 gap-3 max-w-[280px] border-t border-slate-500/10 pt-2 select-none">
                          <div className="text-[11px] font-medium text-slate-400">
                            <span className="font-bold text-slate-600 dark:text-slate-200">{skill.completed}</span> {t("practice.lessonsCompleted", "dars yakunlangan")}
                          </div>
                          <div className="text-[11px] font-medium text-slate-400">
                            <span className="font-bold text-slate-600 dark:text-slate-200">{remainingCount}</span> {t("practice.lessonsRemaining", "dars qolgan")}
                          </div>
                        </div>

                        {/* Premium custom progress bar line */}
                        <div className="space-y-1.5 w-full max-w-[280px] select-none">
                          <div className="flex items-center gap-3">
                            <div className={cn("h-2 w-full rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-slate-100")}>
                              <div 
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700" 
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400 shrink-0 leading-none">
                              {progressPercent}%
                            </span>
                          </div>
                        </div>

                        {/* Action Continue Button */}
                        <Button
                          onClick={() => navigate(skill.path)}
                          className="h-10 rounded-xl text-xs font-semibold text-white px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-md shadow-emerald-500/10 transition-all duration-300 w-fit flex items-center gap-1.5 transform active:scale-95"
                        >
                          {progressPercent > 0 ? t("practice.continueBtn", "Davom ettirish") : t("practice.startBtn", "Boshlash")} 
                          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                        </Button>
                      </div>

                      {/* Right Column: Premium Custom floating vector illustration */}
                      <motion.div
                        animate={{ y: [0, -6, 0] }}
                        transition={{ repeat: Infinity, duration: 4 + index, ease: "easeInOut" }}
                        className="w-36 h-36 flex items-center justify-center shrink-0 p-1 relative z-10 select-none group-hover:scale-105 transition-transform duration-300"
                      >
                        {skill.svg}
                      </motion.div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
