import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
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

  const [, setAttempts] = useState<StudentAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  // Keep API integration active to ensure no functionality breaks
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

  // Simplified practice modules data matching design objectives
  const skills = [
    {
      id: "listening",
      tag: t("practice.listening.tag", "LISTENING"),
      title: t("practice.listening.title", "Eshitish 🎧"),
      desc: t("practice.listening.desc", "Improve your listening"),
      path: "/student/mocks/c/listening",
      blobColor: "from-blue-500/10 to-indigo-500/5",
      btnClass: "from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/20",
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
          <circle cx="100" cy="80" r="55" fill="#f8fafc" className="dark:fill-slate-800/20" />
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
      desc: t("practice.reading.desc", "Read smarter"),
      path: "/student/mocks/c/reading",
      blobColor: "from-emerald-500/10 to-teal-500/5",
      btnClass: "from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20",
      svg: (
        <svg viewBox="0 0 200 160" className="w-full h-full object-contain">
          <defs>
            <linearGradient id="bookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="80" r="55" fill="#f8fafc" className="dark:fill-slate-800/20" />
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
      title: t("practice.writing.title", "Yozish ✍️"),
      desc: t("practice.writing.desc", "Write confidently"),
      path: "/student/mocks/c/writing",
      blobColor: "from-amber-500/10 to-orange-500/5",
      btnClass: "from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-500/20",
      svg: (
        <svg viewBox="0 0 200 160" className="w-full h-full object-contain">
          <defs>
            <linearGradient id="lampGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="80" r="55" fill="#f8fafc" className="dark:fill-slate-800/20" />
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
      title: t("practice.speaking.title", "Gapirish 🎙️"),
      desc: t("practice.speaking.desc", "Speak naturally"),
      isBeta: true,
      path: "/student/speaking",
      blobColor: "from-purple-500/10 to-pink-500/5",
      btnClass: "from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-purple-500/20",
      svg: (
        <svg viewBox="0 0 200 160" className="w-full h-full object-contain">
          <circle cx="100" cy="80" r="55" fill="#f8fafc" className="dark:fill-slate-800/20" />
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
    <div className="w-full space-y-8 relative pb-16 font-sans select-none">
      {/* Background ambient glowing spheres */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-[400px] h-[400px] bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

      {/* Page Header (Minimal title, Vercel layout style) */}
      <div className="flex flex-col gap-1 text-left pb-4 border-b border-slate-200/40 dark:border-white/5">
        <h2 className={cn("text-4xl font-extrabold tracking-tight", isDark ? "text-white" : "text-slate-900")}>
          {t("practice.title", "Amaliyot")}
        </h2>
        <p className="text-sm font-medium text-slate-400">
          {t("practice.desc", "Improve your skills through systematic interactive practice models.")}
        </p>
      </div>

      {loading ? (
        // Grid loaders
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className={cn("rounded-[32px] border animate-pulse min-h-[260px]", isDark ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100")} />
          ))}
        </div>
      ) : (
        // Minimalist Premium Cards grid
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
          {skills.map((skill, index) => {
            return (
              <motion.div
                key={skill.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -6 }}
                className="w-full h-full"
              >
                <Card className={cn(
                  "p-8 rounded-[32px] border relative overflow-hidden transition-all duration-300 flex flex-col justify-between shadow-md hover:shadow-xl group backdrop-blur-md min-h-[250px]",
                  isDark 
                    ? "bg-slate-900/30 border-white/5 shadow-slate-950/20" 
                    : "bg-white border-slate-200/50 shadow-slate-200/5 hover:border-slate-350"
                )}>
                  {/* Subtle decorative mesh / background gradient blob */}
                  <div className={cn("absolute inset-0 bg-gradient-to-br opacity-[0.03] pointer-events-none -z-10", skill.blobColor)} />
                  <div className="absolute top-10 right-10 w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-500/5 blur-xl -z-10 group-hover:scale-125 transition-transform duration-500" />
                  
                  {/* Two column flex layout. Ensuring illustration does not wrap below on mobile */}
                  <div className="flex flex-row items-center justify-between gap-4 sm:gap-6 h-full w-full">
                    {/* Left Column: text content & capsule button */}
                    <div className="space-y-6 flex-1 text-left">
                      <div className="space-y-3">
                        {/* Top Module Badge */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md uppercase tracking-widest leading-none select-none">
                            {skill.tag}
                          </span>
                          {skill.isBeta && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-purple-500 text-white select-none leading-none select-none">
                              BETA
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className={cn("text-2xl font-extrabold tracking-tight leading-none", isDark ? "text-white" : "text-slate-800")}>
                          {skill.title}
                        </h3>

                        {/* Subtitle */}
                        <p className="text-[13px] text-slate-400 font-medium leading-relaxed max-w-[200px] sm:max-w-none">
                          {skill.desc}
                        </p>
                      </div>

                      {/* Start Practice Button */}
                      <Button
                        onClick={() => navigate(skill.path)}
                        className={cn(
                          "h-10 rounded-full text-xs font-semibold text-white px-6 bg-gradient-to-r shadow-md transition-all duration-300 w-fit flex items-center gap-1.5 transform active:scale-95",
                          skill.btnClass
                        )}
                      >
                        {t("practice.startBtn", "Start Practice")}
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Right Column: Premium Custom floating vector illustration (Scaled side-by-side) */}
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ repeat: Infinity, duration: 4.5 + index, ease: "easeInOut" }}
                      whileHover={{ scale: 1.03, rotate: 1 }}
                      className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 flex items-center justify-center shrink-0 p-1 relative z-10 select-none transition-transform duration-300"
                    >
                      {skill.svg}
                    </motion.div>
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
