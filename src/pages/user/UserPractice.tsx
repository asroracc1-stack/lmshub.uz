import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Headphones, 
  BookOpen, 
  PenTool, 
  MessageSquare, 
  ArrowLeft,
  ChevronRight,
  TrendingUp
} from "lucide-react";
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
  const { t } = useTranslation();
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

  // Skill items list
  const skills = [
    {
      id: "listening",
      title: "Listening",
      emoji: "🎧",
      desc: "Improve your listening capability through audio practices.",
      completed: listeningCount,
      total: 12,
      path: "/student/mocks/c/listening",
      color: "from-blue-500/10 to-indigo-500/10",
      glow: "shadow-blue-500/10",
      badgeColor: "bg-blue-500/10 text-blue-500 dark:bg-blue-500/20",
      btnClass: "bg-blue-600 hover:bg-blue-700 shadow-blue-500/25",
      svg: (
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <defs>
            <linearGradient id="listeningGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="50" fill="url(#listeningGrad)" opacity="0.15" className="animate-pulse" />
          <path d="M70,90 C70,50 130,50 130,90" fill="none" stroke="url(#listeningGrad)" strokeWidth="6" strokeLinecap="round" />
          <rect x="62" y="90" rx="8" ry="8" width="16" height="30" fill="url(#listeningGrad)" />
          <rect x="122" y="90" rx="8" ry="8" width="16" height="30" fill="url(#listeningGrad)" />
          <circle cx="100" cy="105" r="8" fill="url(#listeningGrad)" />
          <path d="M100,105 L100,140" stroke="url(#listeningGrad)" strokeWidth="3" />
          {/* Pulsing sound waves */}
          <circle cx="100" cy="105" r="70" fill="none" stroke="url(#listeningGrad)" strokeWidth="2" opacity="0.4" strokeDasharray="5 5" className="animate-spin" style={{ animationDuration: '20s' }} />
        </svg>
      )
    },
    {
      id: "reading",
      title: "Reading",
      emoji: "📖",
      desc: "Read passages, analyze arguments, and test your vocabulary.",
      completed: readingCount,
      total: 24,
      path: "/student/mocks/c/reading",
      color: "from-emerald-500/10 to-teal-500/10",
      glow: "shadow-emerald-500/10",
      badgeColor: "bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20",
      btnClass: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25",
      svg: (
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <defs>
            <linearGradient id="readingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
          </defs>
          <path d="M50,130 C75,120 100,135 100,135 C100,135 125,120 150,130 L150,70 C125,60 100,75 100,75 C100,75 75,60 50,70 Z" fill="url(#readingGrad)" opacity="0.15" />
          <path d="M100,75 L100,135" stroke="url(#readingGrad)" strokeWidth="3" />
          <path d="M50,70 L50,130" stroke="url(#readingGrad)" strokeWidth="3" />
          <path d="M150,70 L150,130" stroke="url(#readingGrad)" strokeWidth="3" />
          <path d="M60,85 L85,80" stroke="url(#readingGrad)" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
          <path d="M60,100 L85,95" stroke="url(#readingGrad)" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
          <path d="M115,80 L140,85" stroke="url(#readingGrad)" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
          <path d="M115,95 L140,100" stroke="url(#readingGrad)" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        </svg>
      )
    },
    {
      id: "writing",
      title: "Writing",
      emoji: "✍️",
      desc: "Express arguments clearly and practice structural essay composition.",
      completed: writingCount,
      total: 10,
      path: "/student/mocks/c/writing",
      color: "from-orange-500/10 to-amber-500/10",
      glow: "shadow-orange-500/10",
      badgeColor: "bg-orange-500/10 text-orange-500 dark:bg-orange-500/20",
      btnClass: "bg-orange-600 hover:bg-orange-700 shadow-orange-500/25",
      svg: (
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <defs>
            <linearGradient id="writingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <rect x="60" y="50" width="80" height="100" rx="8" fill="url(#writingGrad)" opacity="0.15" />
          <line x1="75" y1="75" x2="125" y2="75" stroke="url(#writingGrad)" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          <line x1="75" y1="95" x2="125" y2="95" stroke="url(#writingGrad)" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          <line x1="75" y1="115" x2="110" y2="115" stroke="url(#writingGrad)" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
          <path d="M115,130 L135,110 L140,115 L120,135 Z" fill="url(#writingGrad)" />
          <circle cx="140" cy="110" r="2" fill="url(#writingGrad)" />
        </svg>
      )
    },
    {
      id: "speaking",
      title: "Speaking",
      emoji: "🗣️",
      desc: "Practice active speech dialogue with live AI coach feedback.",
      completed: speakingCount,
      total: 9,
      isBeta: true,
      path: "/student/speaking",
      color: "from-purple-500/10 to-pink-500/10",
      glow: "shadow-purple-500/10",
      badgeColor: "bg-purple-500/10 text-purple-500 dark:bg-purple-500/20",
      btnClass: "bg-purple-600 hover:bg-purple-700 shadow-purple-500/25",
      svg: (
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <defs>
            <linearGradient id="speakingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <path d="M60,110 C60,70 140,70 140,110 C140,125 125,135 100,135 C95,135 90,145 80,150 C80,150 82,140 80,135 C68,130 60,122 60,110 Z" fill="url(#speakingGrad)" opacity="0.15" />
          <circle cx="100" cy="110" r="15" fill="none" stroke="url(#speakingGrad)" strokeWidth="3" />
          <path d="M92,110 A8,8 0 0,1 108,110" fill="none" stroke="url(#speakingGrad)" strokeWidth="3" />
          <circle cx="93" cy="100" r="2.5" fill="url(#speakingGrad)" />
          <circle cx="107" cy="100" r="2.5" fill="url(#speakingGrad)" />
          <path d="M125,95 Q145,85 160,95" fill="none" stroke="url(#speakingGrad)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M130,80 Q150,70 165,80" fill="none" stroke="url(#speakingGrad)" strokeWidth="1.5" strokeLinecap="round" />
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-500/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <button onClick={() => navigate("/user/dashboard")} className="hover:text-purple-500 flex items-center gap-1 transition-colors">
              <ArrowLeft className="h-3 w-3" /> Dashboard
            </button>
            <span>/</span>
            <span className="text-slate-500 dark:text-slate-300">Amaliyot</span>
          </div>
          <h2 className={cn("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-slate-900")}>
            Amaliyot bo'limi (Mock Practice)
          </h2>
          <p className="text-xs text-slate-400 font-bold leading-relaxed">
            IELTS ko'nikmalarini tizimli va interaktiv tarzda rivojlantiring.
          </p>
        </div>
      </div>

      {loading ? (
        // Grid loaders
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className={cn("p-6 rounded-[28px] border animate-pulse min-h-[220px]", isDark ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100")} />
          ))}
        </div>
      ) : (
        // 4 Skill Practice Cards grid
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {skills.map((skill, index) => {
            const progressPercent = Math.min(100, Math.round((skill.completed / skill.total) * 100));
            return (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ y: -6 }}
                className="w-full h-full"
              >
                <Card className={cn(
                  "p-6 rounded-[28px] border relative overflow-hidden transition-all duration-300 h-full flex flex-col justify-between shadow-md hover:shadow-xl group",
                  isDark 
                    ? "bg-slate-900/30 border-white/5 shadow-slate-950/20" 
                    : "bg-white border-slate-200/60 shadow-slate-200/5 hover:border-slate-350"
                )}>
                  {/* Skill Card Header Info */}
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="space-y-2 flex-1">
                      {/* Top Completed progress capsule */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full select-none leading-none", skill.badgeColor)}>
                          {skill.completed}/{skill.total} Lessons Completed
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
                      <p className="text-[11px] text-slate-400 font-bold leading-normal">
                        {skill.desc}
                      </p>
                    </div>

                    {/* Styled illustration box */}
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 p-1 relative overflow-hidden bg-gradient-to-br from-slate-950/10 to-slate-950/5 dark:from-white/5 dark:to-white/1">
                      {skill.svg}
                    </div>
                  </div>

                  {/* Card Bottom Progress & Action Button */}
                  <div className="space-y-4 pt-3 border-t border-slate-500/10">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[9px] font-bold text-slate-400 select-none">
                        <span>Mashg'ulot foalligi</span>
                        <span>{progressPercent}%</span>
                      </div>
                      {/* Completion Progress Bar */}
                      <div className={cn("h-1.5 w-full rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-slate-100")}>
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700" 
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <Button
                      onClick={() => navigate(skill.path)}
                      className={cn(
                        "w-full h-11 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 transition-all duration-300",
                        skill.btnClass
                      )}
                    >
                      Start practice <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
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
