import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronRight } from "lucide-react";
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
  const { i18n } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [attempts, setAttempts] = useState<StudentAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch real student mock attempts to calculate active completed lesson stats
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
  const listeningCount = useMemo(() => attempts.filter(a => a.exam?.type === "LISTENING").length, [attempts]);
  const readingCount = useMemo(() => attempts.filter(a => a.exam?.type === "READING").length, [attempts]);
  const writingCount = useMemo(() => attempts.filter(a => a.exam?.type === "WRITING").length, [attempts]);
  const speakingCount = useMemo(() => attempts.filter(a => a.exam?.type === "SPEAKING").length, [attempts]);

  // Safe Multi-language Translation dictionary
  const lang = i18n.language || "uz";
  const translations = {
    uz: {
      title: "Amaliyot bo'limi",
      subtitle: "IELTS ko'nikmalarini tizimli va interaktiv tarzda rivojlantiring.",
      startBtn: "Amaliyotni boshlash",
      completed: "yakunlandi",
      lessons: "ta dars",
      noActivity: "Faollik yo'q",
      listeningTitle: "Listening",
      listeningDesc: "Audio mashqlar orqali tinglab tushunish ko'nikmangizni oshiring.",
      readingTitle: "Reading",
      readingDesc: "Matnlarni o'qing, tahlil qiling va lug'at boyligingizni sinab ko'ring.",
      writingTitle: "Writing",
      writingDesc: "Fikrlarni aniq bayon qilish va insho yozishni mashq qiling.",
      speakingTitle: "Speaking",
      speakingDesc: "Sun'iy intellekt murabbiyi bilan gaplashishni mashq qiling.",
      practiceActivity: "Amaliyot foalligi",
      dashboard: "Bosh sahifa",
    },
    en: {
      title: "Practice Section",
      subtitle: "Develop your IELTS skills systematically and interactively.",
      startBtn: "Start practice",
      completed: "completed",
      lessons: "lessons",
      noActivity: "No activity",
      listeningTitle: "Listening",
      listeningDesc: "Improve your listening capability through audio practices.",
      readingTitle: "Reading",
      readingDesc: "Read passages, analyze arguments, and test your vocabulary.",
      writingTitle: "Writing",
      writingDesc: "Express arguments clearly and practice structural essay composition.",
      speakingTitle: "Speaking",
      speakingDesc: "Practice active speech dialogue with live AI coach feedback.",
      practiceActivity: "Practice activity",
      dashboard: "Dashboard",
    },
    ru: {
      title: "Раздел практики",
      subtitle: "Развивайте свои навыки IELTS систематически и интерактивно.",
      startBtn: "Начать практику",
      completed: "завершено",
      lessons: "уроков",
      noActivity: "Нет активности",
      listeningTitle: "Listening",
      listeningDesc: "Улучшайте навыки аудирования с помощью аудио-практик.",
      readingTitle: "Reading",
      readingDesc: "Читайте тексты, анализируйте аргументы и проверяйте словарный запас.",
      writingTitle: "Writing",
      writingDesc: "Учитесь четко излагать мысли и писать эссе.",
      speakingTitle: "Speaking",
      speakingDesc: "Практикуйте устную речь с обратной связью от ИИ.",
      practiceActivity: "Активность практики",
      dashboard: "Главная",
    }
  };

  const currentText = translations[lang as keyof typeof translations] || translations.uz;

  // Skill items list with premium SVGs matching target layout
  const skills = [
    {
      id: "listening",
      title: currentText.listeningTitle,
      emoji: "🎧",
      desc: currentText.listeningDesc,
      completed: listeningCount,
      total: 12,
      path: "/student/mocks/c/listening",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
      btnClass: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20",
      svg: (
        <svg viewBox="0 0 200 160" className="w-full h-full object-contain">
          <defs>
            <linearGradient id="headphoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffdbb5" />
              <stop offset="100%" stopColor="#fca5a5" />
            </linearGradient>
          </defs>
          {/* Background soft circular blur ring */}
          <circle cx="100" cy="80" r="60" fill="#e0f2fe" opacity="0.4" className="dark:opacity-10" />
          
          {/* Sitting student character body */}
          <path d="M60,160 C60,115 75,100 100,100 C125,100 140,115 140,160" fill="#1e293b" className="dark:fill-slate-700" />
          
          {/* Neck & Head */}
          <rect x="94" y="85" width="12" height="20" rx="3" fill="url(#skinGrad)" />
          <circle cx="100" cy="75" r="22" fill="url(#skinGrad)" />
          
          {/* Hair */}
          <path d="M78,70 C78,50 122,50 122,70 C122,55 110,55 100,55 C90,55 78,55 78,70 Z" fill="#0f172a" />
          
          {/* Headphones */}
          <path d="M74,75 C74,48 126,48 126,75" fill="none" stroke="url(#headphoneGrad)" strokeWidth="5" strokeLinecap="round" />
          <rect x="70" y="70" width="10" height="20" rx="5" fill="#4f46e5" />
          <rect x="120" y="70" width="10" height="20" rx="5" fill="#4f46e5" />

          {/* Phone in hand */}
          <rect x="135" y="115" width="15" height="28" rx="2" fill="#0f172a" stroke="#ffffff" strokeWidth="1" transform="rotate(15, 142, 129)" />
          <line x1="120" y1="90" x2="135" y2="120" stroke="#4f46e5" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
          
          {/* Sound waves floating */}
          <path d="M140,65 Q150,55 155,65" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />
          <path d="M145,55 Q160,45 165,55" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" className="animate-pulse" style={{ animationDelay: "0.2s" }} />
        </svg>
      )
    },
    {
      id: "reading",
      title: currentText.readingTitle,
      emoji: "📖",
      desc: currentText.readingDesc,
      completed: readingCount,
      total: 24,
      path: "/student/mocks/c/reading",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
      btnClass: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20",
      svg: (
        <svg viewBox="0 0 200 160" className="w-full h-full object-contain">
          <defs>
            <linearGradient id="bookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="80" r="60" fill="#f0fdf4" opacity="0.6" className="dark:opacity-10" />
          
          {/* Sitting Girl Character body */}
          <path d="M60,160 C60,120 75,105 100,105 C125,105 140,120 140,160" fill="#047857" />
          
          {/* Neck & Head */}
          <rect x="94" y="88" width="12" height="20" rx="3" fill="#ffd7b5" />
          <circle cx="100" cy="78" r="22" fill="#ffd7b5" />
          
          {/* Hair (Long) */}
          <path d="M78,78 C78,45 122,45 122,78 C122,95 125,115 125,120 C125,120 120,120 115,115 L100,85 L85,115 C80,120 75,120 75,120 C75,115 78,95 78,78 Z" fill="#0f172a" />

          {/* Giant Book in Hand */}
          <path d="M70,140 C85,125 100,135 100,135 C100,135 115,125 130,140 L130,110 C115,95 100,105 100,105 C100,105 85,95 70,110 Z" fill="url(#bookGrad)" />
          <path d="M100,105 L100,135" stroke="#ffffff" strokeWidth="2" />
          <line x1="78" y1="118" x2="92" y2="114" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
          <line x1="78" y1="126" x2="92" y2="122" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
          <line x1="108" y1="114" x2="122" y2="118" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
          <line x1="108" y1="122" x2="122" y2="126" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" />
        </svg>
      )
    },
    {
      id: "writing",
      title: currentText.writingTitle,
      emoji: "✍️",
      desc: currentText.writingDesc,
      completed: writingCount,
      total: 10,
      path: "/student/mocks/c/writing",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
      btnClass: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20",
      svg: (
        <svg viewBox="0 0 200 160" className="w-full h-full object-contain">
          <defs>
            <linearGradient id="lampGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="80" r="60" fill="#fffbeb" opacity="0.6" className="dark:opacity-10" />
          
          {/* Table Surface */}
          <line x1="40" y1="140" x2="160" y2="140" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
          
          {/* Sitting Character body */}
          <path d="M55,160 C55,125 70,110 95,110 C120,110 135,125 135,160" fill="#1e3a8a" />
          <rect x="89" y="93" width="12" height="20" rx="3" fill="#ffd7b5" />
          <circle cx="95" cy="83" r="22" fill="#ffd7b5" />
          <path d="M73,83 C73,50 117,50 117,83 C117,70 105,70 95,70 C85,70 73,70 73,83 Z" fill="#1e293b" />

          {/* Lamp casting light gradient */}
          <path d="M150,140 L150,85 L135,85" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
          <path d="M125,85 L145,85 L140,75 L130,75 Z" fill="#f59e0b" />
          <polygon points="120,140 150,140 140,85 130,85" fill="url(#lampGrad)" />

          {/* Paper and Pen */}
          <rect x="75" y="125" width="30" height="22" rx="1" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" transform="skewX(-10)" />
          <line x1="85" y1="130" x2="100" y2="130" stroke="#94a3b8" strokeWidth="1.5" />
          <line x1="83" y1="136" x2="98" y2="136" stroke="#94a3b8" strokeWidth="1.5" />
          <line x1="102" y1="120" x2="95" y2="130" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )
    },
    {
      id: "speaking",
      title: currentText.speakingTitle,
      emoji: "🗣️",
      desc: currentText.speakingDesc,
      completed: speakingCount,
      total: 9,
      isBeta: true,
      path: "/student/speaking",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
      btnClass: "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20",
      svg: (
        <svg viewBox="0 0 200 160" className="w-full h-full object-contain">
          <circle cx="100" cy="80" r="60" fill="#faf5ff" opacity="0.6" className="dark:opacity-10" />
          
          {/* Sitting Character body */}
          <path d="M60,160 C60,120 75,105 100,105 C125,105 140,120 140,160" fill="#6b21a8" />
          
          {/* Neck & Head */}
          <rect x="94" y="88" width="12" height="20" rx="3" fill="#ffd7b5" />
          <circle cx="100" cy="78" r="22" fill="#ffd7b5" />
          <path d="M78,78 C78,45 122,45 122,78 C122,70 110,70 100,70 C90,70 78,70 78,78 Z" fill="#0f172a" />

          {/* Dual speech bubbles floating */}
          <path d="M130,70 C130,55 145,45 160,45 C175,45 185,55 185,70 C185,80 178,88 170,91 L175,98 L162,93 C160,94 158,94 156,94 C141,94 130,83 130,70 Z" fill="#a855f7" opacity="0.9" />
          <path d="M142,65 L173,65" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M148,73 L167,73" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />

          {/* Mic Stand */}
          <line x1="100" y1="120" x2="100" y2="145" stroke="#475569" strokeWidth="3" />
          <circle cx="100" cy="115" r="6" fill="#1e293b" />
        </svg>
      )
    }
  ];

  return (
    <div className="w-full space-y-6 relative pb-6 font-sans select-none">
      {/* Background ambient glowing spheres */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-[300px] h-[300px] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[90px] -z-10 pointer-events-none" />

      {/* Breadcrumb Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200/60 dark:border-white/5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <button onClick={() => navigate("/user/dashboard")} className="hover:text-purple-500 flex items-center gap-1 transition-colors">
              <ArrowLeft className="h-3 w-3" /> {currentText.dashboard}
            </button>
            <span>/</span>
            <span className="text-slate-500 dark:text-slate-300">Amaliyot</span>
          </div>
          <h2 className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            {currentText.title}
          </h2>
          <p className="text-xs text-slate-400 font-bold leading-relaxed">
            {currentText.subtitle}
          </p>
        </div>
      </div>

      {loading ? (
        // Grid loaders
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className={cn("p-6 rounded-[28px] border animate-pulse min-h-[220px]", isDark ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100")} />
          ))}
        </div>
      ) : (
        // 4 Skill Practice Cards grid matching IELTS Hub perfectly
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {skills.map((skill, index) => {
            const progressPercent = Math.min(100, Math.round((skill.completed / skill.total) * 100));
            return (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="w-full"
              >
                <Card className={cn(
                  "p-6 rounded-[28px] border relative overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-md hover:shadow-lg group",
                  isDark 
                    ? "bg-slate-900/30 border-white/5 shadow-slate-950/20" 
                    : "bg-white border-slate-200/60 shadow-slate-200/5 hover:border-slate-300"
                )}>
                  {/* Two column layout inside card */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    {/* Left Column: text content & capsule button */}
                    <div className="space-y-4 flex-1 w-full text-left">
                      <div className="space-y-2">
                        {/* Top Completed progress capsule */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn("text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full select-none leading-none", skill.badgeColor)}>
                            {skill.completed}/{skill.total} {currentText.lessons}
                          </span>
                          {skill.isBeta && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500 text-white select-none leading-none">
                              BETA
                            </span>
                          )}
                        </div>

                        {/* Main Title & Emoji */}
                        <h3 className={cn("text-xl font-black tracking-tight flex items-center gap-1.5 leading-none", isDark ? "text-white" : "text-slate-800")}>
                          {skill.title} <span className="text-lg">{skill.emoji}</span>
                        </h3>

                        {/* Description text */}
                        <p className="text-[11px] text-slate-400 font-bold leading-normal min-h-[32px]">
                          {skill.desc}
                        </p>
                      </div>

                      {/* Small Progress Line indicator */}
                      <div className="space-y-1 select-none">
                        <div className="flex justify-between text-[9px] font-bold text-slate-400 leading-none">
                          <span>{currentText.practiceActivity}</span>
                          <span>{progressPercent}%</span>
                        </div>
                        <div className={cn("h-1.5 w-full rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-slate-100")}>
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700" 
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Compact Start Practice Button (Not full-width, aligned left) */}
                      <Button
                        onClick={() => navigate(skill.path)}
                        className={cn(
                          "h-10 rounded-xl text-xs font-black text-white px-5 py-2 flex items-center gap-1.5 transition-all duration-300 w-fit",
                          skill.btnClass
                        )}
                      >
                        {currentText.startBtn} <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    </div>

                    {/* Right Column: large illustration */}
                    <div className="w-40 h-36 flex items-center justify-center shrink-0 p-1 relative overflow-hidden">
                      {skill.svg}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
