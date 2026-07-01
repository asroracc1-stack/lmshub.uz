import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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

  // Filter attempts per category (case-insensitive search for robust mapping)
  const listeningCount = useMemo(() => attempts.filter(a => a.exam?.type?.toLowerCase() === "listening").length, [attempts]);
  const readingCount = useMemo(() => attempts.filter(a => a.exam?.type?.toLowerCase() === "reading").length, [attempts]);
  const writingCount = useMemo(() => attempts.filter(a => a.exam?.type?.toLowerCase() === "writing").length, [attempts]);
  const speakingCount = useMemo(() => attempts.filter(a => a.exam?.type?.toLowerCase() === "speaking").length, [attempts]);

  // Page translation dictionary matching the screenshot exactly
  const lang = i18n.language || "uz";
  const translations = {
    uz: {
      title: "Amaliyot",
      completedText: "dars yakunlangan",
      boshlash: "Boshlash",
      listening: {
        tag: "LISTENING",
        title: "Eshitish 🎧",
        desc: "Eshitish ko'nikmalaringizni rivojlantiring"
      },
      reading: {
        tag: "READING",
        title: "O'qish 📖",
        desc: "Matnlarni tushunish va tahlil qilish"
      },
      writing: {
        tag: "WRITING",
        title: "Yozish ✍️",
        desc: "Yozma ifoda va grammatikani mukammallashtiring"
      },
      speaking: {
        tag: "SPEAKING",
        title: "Gapirish 🗣️",
        desc: "Og'zaki nutq va talaffuzni rivojlantiring"
      }
    },
    en: {
      title: "Practice",
      completedText: "lessons completed",
      boshlash: "Start",
      listening: {
        tag: "LISTENING",
        title: "Listening 🎧",
        desc: "Improve your listening capability through audio practices."
      },
      reading: {
        tag: "READING",
        title: "Reading 📖",
        desc: "Read passages, analyze arguments, and test your vocabulary."
      },
      writing: {
        tag: "WRITING",
        title: "Writing ✍️",
        desc: "Express arguments clearly and practice structural essay composition."
      },
      speaking: {
        tag: "SPEAKING",
        title: "Speaking 🗣️",
        desc: "Practice active speech dialogue with live AI coach feedback."
      }
    },
    ru: {
      title: "Практика",
      completedText: "уроков завершено",
      boshlash: "Начать",
      listening: {
        tag: "LISTENING",
        title: "Аудирование 🎧",
        desc: "Улучшайте навыки аудирования с помощью аудио-практик."
      },
      reading: {
        tag: "READING",
        title: "Чтение 📖",
        desc: "Читайте тексты, анализируйте аргументы и проверяйте словарный запас."
      },
      writing: {
        tag: "WRITING",
        title: "Письмо ✍️",
        desc: "Учитесь четко излагать мысли и писать эссе."
      },
      speaking: {
        tag: "SPEAKING",
        title: "Говорение 🗣️",
        desc: "Практикуйте устную речь с обратной связью от ИИ."
      }
    }
  };

  const currentText = translations[lang as keyof typeof translations] || translations.uz;

  // Skill items list with premium SVGs matching target layout
  const skills = [
    {
      id: "listening",
      tag: currentText.listening.tag,
      title: currentText.listening.title,
      desc: currentText.listening.desc,
      completed: listeningCount,
      total: 12,
      path: "/student/mocks/c/listening",
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
          <circle cx="100" cy="80" r="55" fill="#f0fdf4" className="dark:fill-slate-800/40" />
          
          {/* Sitting student character body */}
          <path d="M65,160 C65,120 78,105 100,105 C122,105 135,120 135,160" fill="#2d7a5f" className="dark:fill-emerald-800" />
          
          {/* Neck & Head */}
          <rect x="94" y="90" width="12" height="15" rx="2" fill="url(#skinGrad)" />
          <circle cx="100" cy="80" r="20" fill="url(#skinGrad)" />
          
          {/* Hair */}
          <path d="M80,76 C80,58 120,58 120,76 C120,62 110,62 100,62 C90,62 80,62 80,76 Z" fill="#0f172a" />
          
          {/* Headphones */}
          <path d="M76,80 C76,55 124,55 124,80" fill="none" stroke="url(#headphoneGrad)" strokeWidth="4.5" strokeLinecap="round" />
          <rect x="72" y="75" width="8" height="18" rx="4" fill="#4f46e5" />
          <rect x="120" y="75" width="8" height="18" rx="4" fill="#4f46e5" />

          {/* Sound waves floating */}
          <path d="M40,80 Q45,65 50,80" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" className="animate-pulse" />
          <path d="M35,90 Q45,75 55,90" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" className="animate-pulse" />
          <path d="M150,70 Q158,62 162,70" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" className="animate-pulse" />
          <path d="M155,80 Q167,72 171,80" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" className="animate-pulse" />
        </svg>
      )
    },
    {
      id: "reading",
      tag: currentText.reading.tag,
      title: currentText.reading.title,
      desc: currentText.reading.desc,
      completed: readingCount,
      total: 24,
      path: "/student/mocks/c/reading",
      svg: (
        <svg viewBox="0 0 200 160" className="w-full h-full object-contain">
          <defs>
            <linearGradient id="bookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="80" r="55" fill="#f0fdf4" className="dark:fill-slate-800/40" />
          
          {/* Sitting Girl Character body */}
          <path d="M65,160 C65,123 78,110 100,110 C122,110 135,123 135,160" fill="#2d7a5f" className="dark:fill-emerald-800" />
          
          {/* Neck & Head */}
          <rect x="94" y="93" width="12" height="15" rx="2" fill="#ffd7b5" />
          <circle cx="100" cy="83" r="20" fill="#ffd7b5" />
          
          {/* Hair (Long) */}
          <path d="M80,83 C80,53 120,53 120,83 C120,98 123,115 123,120 C123,120 118,120 113,115 L100,88 L87,115 C82,120 77,120 77,120 C77,115 80,98 80,83 Z" fill="#0f172a" />

          {/* Giant Book in Hand */}
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
      tag: currentText.writing.tag,
      title: currentText.writing.title,
      desc: currentText.writing.desc,
      completed: writingCount,
      total: 10,
      path: "/student/mocks/c/writing",
      svg: (
        <svg viewBox="0 0 200 160" className="w-full h-full object-contain">
          <defs>
            <linearGradient id="lampGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="80" r="55" fill="#f0fdf4" className="dark:fill-slate-800/40" />
          
          {/* Table Surface */}
          <line x1="45" y1="140" x2="155" y2="140" stroke="#94a3b8" strokeWidth="3.5" strokeLinecap="round" />
          
          {/* Sitting Character body */}
          <path d="M60,160 C60,128 73,115 95,115 C117,115 130,128 130,160" fill="#2d7a5f" className="dark:fill-emerald-800" />
          <rect x="89" y="97" width="12" height="15" rx="2" fill="#ffd7b5" />
          <circle cx="95" cy="87" r="20" fill="#ffd7b5" />
          <path d="M75,87 C75,57 115,57 115,87 C115,75 105,75 95,75 C85,75 75,75 75,87 Z" fill="#1e293b" />

          {/* Lamp casting light gradient */}
          <path d="M145,140 L145,90 L132,90" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M123,90 L141,90 L137,81 L127,81 Z" fill="#f59e0b" />
          <polygon points="118,140 146,140 137,90 127,90" fill="url(#lampGrad)" />

          {/* Paper and Pen */}
          <rect x="76" y="127" width="26" height="20" rx="1" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" transform="skewX(-10)" />
          <line x1="84" y1="132" x2="97" y2="132" stroke="#94a3b8" strokeWidth="1.2" />
          <line x1="82" y1="137" x2="95" y2="137" stroke="#94a3b8" strokeWidth="1.2" />
          <line x1="100" y1="122" x2="94" y2="131" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    },
    {
      id: "speaking",
      tag: currentText.speaking.tag,
      title: currentText.speaking.title,
      desc: currentText.speaking.desc,
      completed: speakingCount,
      total: 9,
      isBeta: true,
      path: "/student/speaking",
      svg: (
        <svg viewBox="0 0 200 160" className="w-full h-full object-contain">
          <circle cx="100" cy="80" r="55" fill="#f0fdf4" className="dark:fill-slate-800/40" />
          
          {/* Sitting Character body */}
          <path d="M65,160 C65,123 78,110 100,110 C122,110 135,123 135,160" fill="#2d7a5f" className="dark:fill-emerald-800" />
          
          {/* Neck & Head */}
          <rect x="94" y="93" width="12" height="15" rx="2" fill="#ffd7b5" />
          <circle cx="100" cy="83" r="20" fill="#ffd7b5" />
          <path d="M80,83 C80,53 120,53 120,83 C120,75 110,75 100,75 C90,75 80,75 80,83 Z" fill="#0f172a" />

          {/* Mic Stand */}
          <line x1="80" y1="123" x2="80" y2="145" stroke="#475569" strokeWidth="2.5" />
          <circle cx="80" cy="119" r="5" fill="#1e293b" />
          
          {/* Speech bubble */}
          <path d="M125,73 C125,60 138,51 152,51 C166,51 175,60 175,73 C175,82 169,89 162,91 L166,97 L155,93 C153,94 151,94 149,94 C136,94 125,84 125,73 Z" fill="#22c55e" opacity="0.15" />
        </svg>
      )
    }
  ];

  return (
    <div className="w-full space-y-5 relative pb-6 font-sans select-none">
      {/* Background ambient glowing spheres */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-[300px] h-[300px] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[90px] -z-10 pointer-events-none" />

      {/* Page Header (Simple bold title aligned left) */}
      <div className="pb-1">
        <h2 className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
          {currentText.title}
        </h2>
      </div>

      {loading ? (
        // Grid loaders
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className={cn("p-6 rounded-[28px] border animate-pulse min-h-[220px]", isDark ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100")} />
          ))}
        </div>
      ) : (
        // 4 Skill Practice Cards grid matching the provided layout screenshot perfectly
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
                  "p-6 rounded-[24px] border relative overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-md hover:shadow-lg group",
                  isDark 
                    ? "bg-slate-900/30 border-white/5 shadow-slate-950/20" 
                    : "bg-white border-slate-100 shadow-slate-200/5 hover:border-slate-350"
                )}>
                  {/* Two column layout inside card */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    {/* Left Column: text content & capsule button */}
                    <div className="space-y-4 flex-1 w-full text-left">
                      <div className="space-y-2">
                        {/* Top Category Tag */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">
                            {skill.tag}
                          </span>
                          {skill.isBeta && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-500 text-white select-none leading-none">
                              BETA
                            </span>
                          )}
                        </div>

                        {/* Main Title */}
                        <h3 className={cn("text-2xl font-extrabold tracking-tight flex items-center leading-none", isDark ? "text-white" : "text-slate-800")}>
                          {skill.title}
                        </h3>

                        {/* Description text */}
                        <p className="text-[12px] text-slate-400 font-bold leading-normal min-h-[16px]">
                          {skill.desc}
                        </p>
                      </div>

                      {/* Dynamic Completed lesson count & progress bar */}
                      <div className="space-y-2 w-full max-w-[280px]">
                        <div className={cn("text-[11px] font-bold", isDark ? "text-slate-400" : "text-slate-500")}>
                          {skill.completed} / {skill.total} {currentText.completedText}
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Progress line */}
                          <div className={cn("h-2.5 flex-1 rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-slate-100")}>
                            <div 
                              className="h-full bg-emerald-500 rounded-full transition-all duration-700" 
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          {/* Percentage text */}
                          <span className="text-xs font-bold text-emerald-600 shrink-0 select-none">
                            {progressPercent}%
                          </span>
                        </div>
                      </div>

                      {/* Boshlash > Button */}
                      <Button
                        onClick={() => navigate(skill.path)}
                        className="h-9 rounded-lg text-xs font-semibold text-white px-5 py-2 bg-[#2d7a5f] hover:bg-[#225c48] transition-all duration-300 w-fit flex items-center gap-1 shadow-md shadow-emerald-500/10"
                      >
                        {currentText.boshlash} <span className="ml-1 text-[10px] font-bold">&gt;</span>
                      </Button>
                    </div>

                    {/* Right Column: large illustration */}
                    <div className="w-36 h-36 flex items-center justify-center shrink-0 p-1 relative overflow-hidden">
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
