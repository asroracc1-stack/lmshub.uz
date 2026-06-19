import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { BookOpen, ArrowRight } from "lucide-react";

interface Category {
  id: string;
  name: string;
  code: string;
  description: string;
  coverImage: string;
  materialsCount?: number;
}

// Inline Local Translations for Kutubxona module
const translations = {
  uz: {
    title: "Kutubxona",
    subtitle: "Raqamli bilimlar xazinasi",
    enterBtn: "Bo'limga kirish",
    materialsCount: "{{count}} ta material",
    adabiyTitle: "Adabiy Kitoblar",
    adabiyDesc: "Klassik va zamonaviy adabiyot durlaridan bahramand bo'ling, dunyoqarashingizni kengaytiring.",
    maktabTitle: "Maktab Darsliklari",
    maktabDesc: "Barcha sinflar uchun maktab darsliklari va qo'shimcha o'quv materiallari to'plami.",
    oquvTitle: "O'quv Qo'llanmalar",
    oquvDesc: "Fanlar bo'yicha mukammal qo'llanmalar, formulalar va imtihonga tayyorgarlik manbalari.",
  },
  ru: {
    title: "Библиотека",
    subtitle: "Цифровая сокровищница знаний",
    enterBtn: "Войти в раздел",
    materialsCount: "Материалов: {{count}}",
    adabiyTitle: "Художественные Книги",
    adabiyDesc: "Наслаждайтесь шедеврами классической и современной литературы, расширяйте кругозор.",
    maktabTitle: "Школьные Учебники",
    maktabDesc: "Сборник школьных учебников и дополнительных учебных материалов для всех классов.",
    oquvTitle: "Учебные Пособия",
    oquvDesc: "Подробные руководства по предметам, формулы и ресурсы для подготовки к экзаменам.",
  },
  en: {
    title: "Library",
    subtitle: "Digital Treasury of Knowledge",
    enterBtn: "Enter Section",
    materialsCount: "{{count}} materials",
    adabiyTitle: "Literary Books",
    adabiyDesc: "Enjoy the masterpieces of classical and modern literature, expand your horizons.",
    maktabTitle: "School Textbooks",
    maktabDesc: "Collection of school textbooks and supplementary learning materials for all grades.",
    oquvTitle: "Study Guides",
    oquvDesc: "Comprehensive subject guides, formulas, and exam preparation resources.",
  }
};

// ── CUSTOM DETAILED PREMIUM SVG ILLUSTRATIONS ───────────────────────

// 1. Adabiy Kitoblar Illustration: Open glowing book, shelf silhouette, reader under arch
const AdabiyIllustration = () => (
  <svg viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    {/* Shelf outline background */}
    <path d="M40 180H360" stroke="currentColor" strokeWidth="2" strokeOpacity="0.15" strokeLinecap="round" />
    <rect x="60" y="100" width="24" height="80" rx="4" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2" />
    <rect x="88" y="80" width="28" height="100" rx="4" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2" />
    <rect x="120" y="110" width="22" height="70" rx="4" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2" transform="rotate(10 120 110)" />
    
    <rect x="280" y="90" width="26" height="90" rx="4" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2" />
    <rect x="310" y="105" width="24" height="75" rx="4" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2" />

    {/* Reading Silhouette / Moon Arch */}
    <path d="M200 40C120 40 80 100 80 180" stroke="url(#adabiyArchGrad)" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 8" className="opacity-60" />
    <path d="M200 40C280 40 320 100 320 180" stroke="url(#adabiyArchGrad)" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 8" className="opacity-60" />

    {/* Silhouette reading a book under glowing lamp */}
    <circle cx="200" cy="95" r="16" fill="currentColor" fillOpacity="0.15" />
    <path d="M185 130C185 118 215 118 215 130V150H185V130Z" fill="currentColor" fillOpacity="0.15" />
    
    {/* Open book foreground */}
    <g transform="translate(145, 140)">
      {/* Glow Backing */}
      <path d="M5 25C25 15 50 15 55 5C60 15 85 15 105 25V65C85 55 60 55 55 45C50 55 25 55 5 65V25Z" fill="url(#adabiyBookGlow)" filter="blur(8px)" opacity="0.8" />
      {/* Cover */}
      <path d="M2 28C22 18 48 18 55 8C62 18 88 18 108 28V68C88 58 62 58 55 48C48 58 22 58 2 68V28Z" fill="#5B21B6" stroke="#8B5CF6" strokeWidth="2" />
      {/* Pages */}
      <path d="M5 25C25 15 50 15 55 5C60 15 85 15 105 25V62C85 52 60 52 55 42C50 52 25 52 5 62V25Z" fill="url(#adabiyPageGrad)" />
      {/* Book center line */}
      <path d="M55 5V42" stroke="#D8B4FE" strokeWidth="1.5" />
      {/* Text lines */}
      <path d="M15 25H40M15 32H45M15 39H35M15 46H42M65 25H90M65 32H95M65 39H85M65 46H92" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" />
    </g>

    {/* Sparkles / Magic rising */}
    <g className="animate-pulse">
      <path d="M185 110L188 115L193 116L189 120L190 125L185 122L180 125L181 120L177 116L182 115L185 110Z" fill="#FCD34D" opacity="0.8" />
      <path d="M215 105L217 109L221 110L218 113L219 117L215 115L211 117L212 113L209 110L213 109L215 105Z" fill="#60A5FA" opacity="0.8" />
      <circle cx="160" cy="115" r="3" fill="#A78BFA" />
      <circle cx="240" cy="120" r="2.5" fill="#F472B6" />
      <circle cx="200" cy="75" r="4" fill="#FBBF24" />
    </g>

    <defs>
      <linearGradient id="adabiyArchGrad" x1="80" y1="180" x2="320" y2="40">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#3B82F6" />
      </linearGradient>
      <linearGradient id="adabiyPageGrad" x1="5" y1="5" x2="105" y2="65">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#EDE9FE" />
      </linearGradient>
      <radialGradient id="adabiyBookGlow" cx="55" cy="35" r="45">
        <stop offset="0%" stopColor="#C084FC" />
        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);

// 2. Maktab Darsliklari Illustration: Stack of study books, graduation cap, laptop screen
const MaktabIllustration = () => (
  <svg viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    {/* Orbit line */}
    <ellipse cx="200" cy="140" rx="140" ry="50" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.1" strokeDasharray="6 6" />

    {/* Laptop outline in background */}
    <rect x="110" y="70" width="180" height="110" rx="8" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeWidth="2" strokeOpacity="0.15" />
    <path d="M90 180H310L320 188H80L90 180Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />

    {/* Stacked books */}
    <g transform="translate(135, 115)">
      {/* Book 1 (Bottom - Orange) */}
      <rect x="0" y="45" width="130" height="20" rx="3" fill="#EA580C" stroke="#F97316" strokeWidth="1.5" />
      <rect x="10" y="48" width="118" height="14" fill="#FFF" opacity="0.9" />
      <path d="M12 51H35" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />

      {/* Book 2 (Middle - Emerald) */}
      <rect x="8" y="27" width="115" height="19" rx="3" fill="#059669" stroke="#10B981" strokeWidth="1.5" transform="rotate(-3 8 27)" />
      <rect x="18" y="30" width="103" height="13" fill="#FFF" opacity="0.9" transform="rotate(-3 8 27)" />
      <path d="M22 34H45" stroke="#10B981" strokeWidth="2" strokeLinecap="round" transform="rotate(-3 8 27)" />

      {/* Book 3 (Top - Sky Blue) */}
      <rect x="20" y="10" width="90" height="18" rx="3" fill="#0284C7" stroke="#0EA5E9" strokeWidth="1.5" transform="rotate(4 20 10)" />
      <rect x="28" y="13" width="80" height="12" fill="#FFF" opacity="0.9" transform="rotate(4 20 10)" />
    </g>

    {/* Floating Mortarboard (Graduation Cap) */}
    <g transform="translate(165, 45)" className="animate-bounce" style={{ animationDuration: '4s' }}>
      {/* Cap base */}
      <path d="M20 32C20 32 20 42 35 42C50 42 50 32 50 32" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" fill="#1D4ED8" fillOpacity="0.2" />
      {/* Diamond top */}
      <path d="M35 12L70 24L35 36L0 24L35 12Z" fill="#1E40AF" stroke="#3B82F6" strokeWidth="2" />
      <path d="M35 15L64 24L35 33L6 24L35 15Z" fill="#3B82F6" opacity="0.6" />
      {/* Tassel */}
      <path d="M35 24H50V38L47 40" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="47" cy="41" r="2.5" fill="#FBBF24" />
    </g>

    {/* Small floating particles */}
    <g>
      <circle cx="70" cy="110" r="4" fill="#F97316" className="animate-ping" style={{ animationDuration: '3s' }} />
      <circle cx="320" cy="90" r="5" fill="#10B981" />
      <polygon points="300,160 305,170 295,170" fill="#3B82F6" opacity="0.7" />
      <rect x="80" y="150" width="6" height="6" rx="1" fill="#FBBF24" transform="rotate(45 80 150)" opacity="0.7" />
    </g>
  </svg>
);

// 3. O'quv Qo'llanmalar Illustration: Formulas, technical mesh, flask, gears
const OquvIllustration = () => (
  <svg viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    {/* Grid Background */}
    <path d="M40 40H360M40 80H360M40 120H360M40 160H360M40 200H360" stroke="currentColor" strokeWidth="1" strokeOpacity="0.05" />
    <path d="M80 40V200M120 40V200M160 40V200M200 40V200M240 40V200M280 40V200M320 40V200" stroke="currentColor" strokeWidth="1" strokeOpacity="0.05" />

    {/* Sine Wave */}
    <path d="M50 120C100 40 150 200 200 120C250 40 300 200 350 120" stroke="url(#oquvSineGrad)" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.7" />

    {/* Science Gear Left */}
    <g transform="translate(85, 135)" className="animate-spin" style={{ animationDuration: '20s' }}>
      <circle cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="2" strokeOpacity="0.15" strokeDasharray="6 4" />
      <circle cx="25" cy="25" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.15" />
    </g>

    {/* Chemistry Flask Right */}
    <g transform="translate(265, 80)">
      {/* Glowing behind flask */}
      <path d="M22 65C38 65 48 55 48 35C48 10 32 5 22 5C12 5 -4 10 -4 35C-4 55 6 65 22 65Z" fill="url(#flaskGlow)" opacity="0.5" filter="blur(6px)" />
      {/* Liquid */}
      <path d="M3 45C10 40 20 48 30 45C38 42 41 45 41 45L43 62C43 68 1 68 1 62L3 45Z" fill="url(#flaskLiquidGrad)" />
      {/* Flask outline */}
      <path d="M15 10H29M22 10V25L42 60C45 65 38 70 30 70H14C6 70 -1 65 2 60L22 25" stroke="#EC4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Bubbles */}
      <circle cx="15" cy="35" r="3" fill="#F472B6" className="animate-bounce" style={{ animationDuration: '2s' }} />
      <circle cx="28" cy="25" r="2" fill="#F472B6" className="animate-bounce" style={{ animationDuration: '2.5s' }} />
      <circle cx="22" cy="48" r="4.5" fill="#FFF" fillOpacity="0.7" />
      <circle cx="10" cy="55" r="3" fill="#FFF" fillOpacity="0.7" />
    </g>

    {/* Floating math / physics formulas */}
    <g fill="currentColor" fillOpacity="0.45" className="font-mono text-[11px] font-bold">
      <text x="70" y="70" transform="rotate(-5 70 70)" fill="#3B82F6" className="opacity-80">E = mc²</text>
      <text x="210" y="65" transform="rotate(8 210 65)" fill="#10B981" className="opacity-80">a² + b² = c²</text>
      <text x="65" y="195" fill="#EC4899" className="opacity-80">f(x) = dx/dy</text>
      <text x="200" y="185" fill="#F59E0B" className="opacity-80">H₂O + O₂</text>
    </g>

    {/* Floating dots / nodes */}
    <g>
      <circle cx="125" cy="80" r="3.5" fill="#3B82F6" />
      <circle cx="225" cy="140" r="4.5" fill="#10B981" />
      <line x1="125" y1="80" x2="225" y2="140" stroke="currentColor" strokeWidth="1" strokeOpacity="0.1" />
    </g>

    <defs>
      <linearGradient id="oquvSineGrad" x1="50" y1="120" x2="350" y2="120">
        <stop offset="0%" stopColor="#3B82F6" />
        <stop offset="50%" stopColor="#EC4899" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
      <linearGradient id="flaskLiquidGrad" x1="22" y1="40" x2="22" y2="68">
        <stop offset="0%" stopColor="#F472B6" />
        <stop offset="100%" stopColor="#DB2777" />
      </linearGradient>
      <radialGradient id="flaskGlow" cx="22" cy="35" r="30">
        <stop offset="0%" stopColor="#FBCFE8" />
        <stop offset="100%" stopColor="#EC4899" stopOpacity="0" />
      </radialGradient>
    </defs>
  </svg>
);

export default function Library() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const role = user?.role?.toLowerCase() || "user";
  const rolePath = role === "super_admin" ? "super-admin" : role === "payment_manager" ? "pack-manager" : role;
  const basePath = `/${rolePath}`;
  const lang = (i18n.language || "uz") as "uz" | "ru" | "en";
  const t = translations[lang] || translations["uz"];

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch live counts for cards
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get("/library/categories");
      // Count materials dynamically
      const updatedCategories = await Promise.all(
        res.data.map(async (cat: Category) => {
          try {
            const countRes = await api.get("/library/materials", {
              params: { categoryId: cat.id, size: 1 }
            });
            return {
              ...cat,
              materialsCount: countRes.data.totalElements || 0
            };
          } catch (e) {
            return { ...cat, materialsCount: 0 };
          }
        })
      );
      setCategories(updatedCategories);
    } catch (e) {
      console.error("Kategoriyalarni yuklashda xatolik:", e);
    } finally {
      setLoading(false);
    }
  };

  // Define static specs for the 3 premium categories matching user requirements
  const staticCategories = [
    {
      code: "adabiy_kitoblar",
      path: `${basePath}/library/adabiy-kitoblar`,
      illustration: <AdabiyIllustration />,
      titleKey: "adabiyTitle",
      descKey: "adabiyDesc",
      glowColor: "group-hover:shadow-[0_25px_60px_-10px_rgba(139,92,246,0.45)]",
      gradientBorder: "from-purple-500/30 via-violet-500/10 to-purple-600/30 dark:from-purple-500/40 dark:to-blue-500/40",
      cardBg: "bg-white/80 dark:bg-[#0F172A]/70",
      accentText: "text-purple-600 dark:text-purple-400",
      badgeBg: "bg-purple-100/80 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200/50 dark:border-purple-800/40",
      accentGlow: "rgba(139,92,246,0.15)",
    },
    {
      code: "maktab_darsliklari",
      path: `${basePath}/library/maktab-darsliklari`,
      illustration: <MaktabIllustration />,
      titleKey: "maktabTitle",
      descKey: "maktabDesc",
      glowColor: "group-hover:shadow-[0_25px_60px_-10px_rgba(16,185,129,0.45)]",
      gradientBorder: "from-emerald-500/30 via-teal-500/10 to-emerald-600/30 dark:from-emerald-500/40 dark:to-teal-500/40",
      cardBg: "bg-white/80 dark:bg-[#0F172A]/70",
      accentText: "text-emerald-600 dark:text-emerald-400",
      badgeBg: "bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/40",
      accentGlow: "rgba(16,185,129,0.15)",
    },
    {
      code: "oquv_qollanmalar",
      path: `${basePath}/library/oquv-qollanmalar`,
      illustration: <OquvIllustration />,
      titleKey: "oquvTitle",
      descKey: "oquvDesc",
      glowColor: "group-hover:shadow-[0_25px_60px_-10px_rgba(59,130,246,0.45)]",
      gradientBorder: "from-blue-500/30 via-indigo-500/10 to-blue-600/30 dark:from-blue-500/40 dark:to-indigo-500/40",
      cardBg: "bg-white/80 dark:bg-[#0F172A]/70",
      accentText: "text-blue-600 dark:text-blue-400",
      badgeBg: "bg-blue-100/80 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/40",
      accentGlow: "rgba(59,130,246,0.15)",
    }
  ];

  return (
    <div className="w-full min-h-[80vh] flex flex-col justify-center px-4 py-8 md:py-16 transition-colors duration-500 bg-transparent">
      {/* CSS Keyframes for floating particles and shine effect */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float-p-1 {
          0% { transform: translateY(0px) translateX(0px) scale(1); opacity: 0.15; }
          50% { transform: translateY(-15px) translateX(6px) scale(1.15); opacity: 0.45; }
          100% { transform: translateY(-30px) translateX(0px) scale(1); opacity: 0.15; }
        }
        @keyframes float-p-2 {
          0% { transform: translateY(0px) translateX(0px) scale(0.85); opacity: 0.1; }
          50% { transform: translateY(-22px) translateX(-8px) scale(1.1); opacity: 0.4; }
          100% { transform: translateY(-44px) translateX(0px) scale(0.85); opacity: 0.1; }
        }
        @keyframes float-p-3 {
          0% { transform: translateY(0px) translateX(0px) scale(1.1); opacity: 0.2; }
          50% { transform: translateY(-28px) translateX(12px) scale(0.95); opacity: 0.55; }
          100% { transform: translateY(-56px) translateX(0px) scale(1.1); opacity: 0.2; }
        }
        @keyframes shine-move {
          0% { left: -100%; }
          100% { left: 200%; }
        }
        .particle-1 { animation: float-p-1 6s infinite ease-in-out; }
        .particle-2 { animation: float-p-2 8s infinite ease-in-out; }
        .particle-3 { animation: float-p-3 7s infinite ease-in-out; }
      `}} />

      {/* Header Container */}
      <div className="text-center max-w-xl mx-auto mb-10 md:mb-16 space-y-3">
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center justify-center gap-3">
          <BookOpen className="h-8 w-8 md:h-10 md:w-10 text-purple-600 dark:text-purple-400" />
          {t.title}
        </h1>
        <p className="text-slate-500 dark:text-slate-300 text-sm md:text-base font-medium">
          {t.subtitle}
        </p>
      </div>

      {/* 3 Premium Cards Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="h-10 w-10 rounded-full border-4 border-purple-500/20 border-t-purple-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto w-full items-stretch">
          {staticCategories.map((staticCat, idx) => {
            // Find live category to extract count
            const matchedDbCat = categories.find(c => c.code === staticCat.code);
            const count = matchedDbCat?.materialsCount || 0;
            const cardTitle = t[staticCat.titleKey as keyof typeof t] || staticCat.code;
            const cardDesc = t[staticCat.descKey as keyof typeof t] || "";

            return (
              <motion.div
                key={staticCat.code}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.15, ease: "easeOut" }}
                onClick={() => navigate(staticCat.path)}
                style={{
                  willChange: "transform",
                }}
                className={`group relative rounded-[32px] cursor-pointer p-[1.5px] bg-gradient-to-br ${staticCat.gradientBorder} ${staticCat.glowColor} transition-all duration-500 ease-out hover:scale-[1.03] hover:translate-y-[-10px] flex flex-col`}
              >
                {/* Translucent Card Container (Glassmorphism) */}
                <div className={`flex-1 flex flex-col justify-between p-7 rounded-[30.5px] ${staticCat.cardBg} backdrop-blur-2xl overflow-hidden relative border border-white/10`}>
                  
                  {/* Glowing background circles for SaaS styling */}
                  <div 
                    className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" 
                    style={{ backgroundColor: staticCat.accentGlow }}
                  />
                  <div 
                    className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full blur-3xl opacity-15 group-hover:opacity-30 transition-opacity duration-500" 
                    style={{ backgroundColor: staticCat.accentGlow }}
                  />

                  {/* Shine effect overlay */}
                  <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
                    <div className="absolute top-0 w-[50%] h-full bg-gradient-to-r from-transparent via-white/15 dark:via-white/5 to-transparent skew-x-[-20deg] -left-full group-hover:animate-[shine-move_1.5s_infinite_ease-in-out]" />
                  </div>

                  {/* Floating particles inside card */}
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-10 w-2.5 h-2.5 rounded-full bg-purple-400/30 particle-1" />
                    <div className="absolute bottom-1/3 right-12 w-2.5 h-2.5 rounded-full bg-blue-400/20 particle-2" />
                    <div className="absolute top-1/3 right-1/4 w-3 h-3 rounded-full bg-pink-400/25 particle-3" />
                  </div>

                  {/* 1. Illustration (covers 60% of card) */}
                  <div className="relative h-[180px] w-full flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-[1.06] text-slate-700 dark:text-slate-350">
                    {staticCat.illustration}
                  </div>

                  {/* 2. Metadata: Category Title, Description & Button */}
                  <div className="mt-6 space-y-4 relative z-10">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight transition-colors duration-300 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                        {cardTitle}
                      </h3>
                      
                      {/* Material count badge */}
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${staticCat.badgeBg}`}>
                        {t.materialsCount.replace("{{count}}", String(count))}
                      </span>
                    </div>

                    <p className="text-slate-500 dark:text-slate-300 text-xs md:text-sm font-medium leading-relaxed line-clamp-3">
                      {cardDesc}
                    </p>

                    {/* Enter Button */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-650 dark:text-slate-350">
                      <span className="group-hover:translate-x-1 transition-transform duration-300 flex items-center gap-1.5">
                        {t.enterBtn}
                        <ArrowRight className={`h-4 w-4 ${staticCat.accentText}`} />
                      </span>
                    </div>
                  </div>

                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
