import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Lock, Compass, Star, Trophy, MapPin, ArrowRight, Flame } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import confetti from "canvas-confetti";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

interface Checkpoint {
  id: string;
  name: string;
  target_distance: number;
  reward_type: string;
  reward_value: string;
  unlocked: boolean;
  claimed: boolean;
}

interface AdventureMapProps {
  progressData: {
    total_distance: number;
    current_region: string;
    xp: number;
    coins: number;
    streak: number;
    checkpoints: Checkpoint[];
    progress_percentage: number;
    avatar_position?: number;
  };
  compact?: boolean;
  onRefresh?: () => void;
}

export const AdventureMap: React.FC<AdventureMapProps> = ({ progressData, compact = false, onRefresh }) => {
  const { total_distance, current_region, xp, coins, streak, checkpoints, progress_percentage } = progressData;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isDark = theme === "dark";

  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [claiming, setClaiming] = useState(false);

  // Helper to translate current region name
  const getLocalizedCurrentRegion = (regKey: string) => {
    if (!regKey) return "";
    const lowerKey = regKey.toLowerCase();
    if (lowerKey.includes("village") || lowerKey.includes("boshlanish")) return t("dynamic.learningWorld.regions.startVillage");
    if (lowerKey.includes("forest") || lowerKey.includes("o'rmon") || lowerKey.includes("ormon")) return t("dynamic.learningWorld.regions.readingForest");
    if (lowerKey.includes("ocean") || lowerKey.includes("okean")) return t("dynamic.learningWorld.regions.listeningOcean");
    if (lowerKey.includes("city") || lowerKey.includes("shahar")) return t("dynamic.learningWorld.regions.writingCity");
    if (lowerKey.includes("arena") || lowerKey.includes("arena")) return t("dynamic.learningWorld.regions.speakingArena");
    if (lowerKey.includes("kingdom") || lowerKey.includes("qirollik")) return t("dynamic.learningWorld.regions.nationalCertKingdom");
    if (lowerKey.includes("space") || lowerKey.includes("kosmik")) return t("dynamic.learningWorld.regions.satSpaceAcademy");
    if (lowerKey.includes("castle") || lowerKey.includes("qal'a") || lowerKey.includes("qala")) return t("dynamic.learningWorld.regions.masterCastle");
    return regKey;
  };

  // Find next reward checkpoint
  const nextCheckpoint = checkpoints?.find(cp => !cp.claimed);

  const getChestRarity = (targetDistance: number) => {
    if (targetDistance <= 120000) return { name: t("dynamic.learningWorld.chests.common"), color: "#10B981", bg: "bg-emerald-500/10 border-emerald-500/30", iconColor: "text-emerald-400" };
    if (targetDistance <= 280000) return { name: t("dynamic.learningWorld.chests.rare"), color: "#3B82F6", bg: "bg-blue-500/10 border-blue-500/30", iconColor: "text-blue-400" };
    if (targetDistance <= 420000) return { name: t("dynamic.learningWorld.chests.epic"), color: "#8B5CF6", bg: "bg-purple-500/10 border-purple-500/30", iconColor: "text-purple-400" };
    return { name: t("dynamic.learningWorld.chests.legendary"), color: "#F59E0B", bg: "bg-amber-500/10 border-amber-500/30", iconColor: "text-amber-400" };
  };

  const handleClaim = async () => {
    if (!selectedCheckpoint) return;
    setClaiming(true);
    try {
      const response = await api.post(`/user/gamification/claim/${selectedCheckpoint.id}`);
      if (response.data?.success) {
        confetti({
          particleCount: 180,
          spread: 90,
          origin: { y: 0.6 },
          colors: ["#F59E0B", "#10B981", "#3B82F6", "#8B5CF6"]
        });
        toast.success(t("dynamic.learningWorld.successClaim"));
        setSelectedCheckpoint(null);
        if (onRefresh) onRefresh();
      } else {
        toast.error(response.data?.message || t("dynamic.learningWorld.errorClaim"));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("dynamic.learningWorld.errorClaim"));
    } finally {
      setClaiming(false);
    }
  };

  // ----------------------------------------------------
  // COMPACT VERSION: Premium Illustrated Game Scroll HUD
  // ----------------------------------------------------
  if (compact) {
    return (
      <div className={`relative w-full overflow-hidden rounded-2xl sm:rounded-[2.5rem] border p-4 sm:p-6 md:p-8 shadow-2xl transition-all duration-500 ${
        isDark 
          ? "bg-gradient-to-br from-[#0c152b] via-[#090e1a] to-[#050810] border-slate-800/80 shadow-slate-950/60" 
          : "bg-gradient-to-br from-amber-50/60 via-orange-50/20 to-sky-100/50 border-orange-100 shadow-orange-100/40"
      }`}>
        {/* Beautiful adventure themed vector background */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 pointer-events-none -z-10">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0,50 Q25,35 50,50 T100,50" fill="none" stroke={isDark ? "#38bdf8" : "#f59e0b"} strokeWidth="1.5" />
            <path d="M0,70 Q25,55 50,70 T100,70" fill="none" stroke={isDark ? "#38bdf8" : "#f59e0b"} strokeWidth="1" />
            <circle cx="80" cy="40" r="15" fill="none" stroke={isDark ? "#38bdf8" : "#f59e0b"} strokeWidth="1.5" strokeDasharray="3 3" />
          </svg>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-xl sm:rounded-2xl text-slate-950 shadow-lg shadow-orange-500/20">
                <Compass className="w-4 h-4 sm:w-5 sm:h-5 animate-spin-slow" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 block">
                  {t("dynamic.learningWorld.title")}
                </span>
                <h3 className={`text-base sm:text-xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>
                  {getLocalizedCurrentRegion(current_region)}
                </h3>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-bold">
              <span className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 border rounded-lg sm:rounded-xl shadow-sm ${
                isDark ? "bg-slate-900/60 border-slate-800 text-amber-300" : "bg-white border-orange-100 text-orange-700"
              }`}>
                <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                {Math.round(total_distance / 1000)} km
              </span>
              <span className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 border rounded-lg sm:rounded-xl shadow-sm ${
                isDark ? "bg-slate-900/60 border-slate-800 text-yellow-300" : "bg-white border-orange-100 text-orange-600"
              }`}>
                <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500 fill-yellow-500" />
                {xp} {t("dynamic.learningWorld.xp")}
              </span>
              <span className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 border rounded-lg sm:rounded-xl shadow-sm ${
                isDark ? "bg-slate-900/60 border-slate-800 text-orange-300" : "bg-white border-orange-100 text-orange-600"
              }`}>
                <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500 fill-orange-500" />
                {streak} {t("dynamic.learningWorld.dailyStreak")}
              </span>
            </div>
          </div>

          <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-3 sm:gap-4 min-w-0 sm:min-w-[280px]">
            {nextCheckpoint && (
              <div className={`flex-1 p-3 rounded-xl sm:rounded-2xl border ${
                isDark ? "bg-slate-950/60 border-slate-800/80" : "bg-white border-orange-100 shadow-sm"
              }`}>
                <div className="flex justify-between items-center gap-2 mb-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{t("dynamic.learningWorld.nextReward")}</span>
                  <span className="text-[9px] font-bold text-amber-500">{Math.round(nextCheckpoint.target_distance / 1000)}km</span>
                </div>
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-amber-500 animate-bounce" />
                  <span className={`text-xs font-bold truncate ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                    {nextCheckpoint.reward_type === "COIN_BOX" ? `${nextCheckpoint.reward_value} ${t("dynamic.learningWorld.coins")}` : `${t("dynamic.learningWorld.rewardChest")}`}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => navigate(total_distance >= 0 ? "/user/map" : "/student/map")}
              className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 text-[11px] sm:text-xs font-black rounded-xl sm:rounded-2xl shadow-lg shadow-orange-500/20 transition flex items-center justify-center gap-2 group whitespace-nowrap self-stretch md:self-auto"
            >
              {t("dynamic.learningWorld.openFullMap")}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        <div className="mt-3 sm:mt-5">
          <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
            <span>{t("dynamic.learningWorld.progress")}</span>
            <span>{Math.round(progress_percentage)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 transition-all duration-1000"
              style={{ width: `${progress_percentage}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // FULLSCREEN ILLUSTRATED WORLD MAP ENGINE (SVG CANVAS)
  // ----------------------------------------------------
  const viewWidth = 1800;
  const viewHeight = 1100;

  // The winding adventure roadmap coordinates crossing the illustrated lands
  const pathD = "M 150 780 C 180 550, 480 750, 450 480 C 420 250, 250 180, 500 150 C 700 120, 800 320, 750 450 C 700 620, 950 820, 1150 700 C 1300 600, 1100 350, 1320 280 C 1450 220, 1480 480, 1650 420";

  // Coordinates of regions along the road
  const regions = [
    { name: t("dynamic.learningWorld.regions.startVillage"), keyName: "Start Village", x: 150, y: 780, minDistance: 0, color: "from-amber-400 to-orange-500" },
    { name: t("dynamic.learningWorld.regions.readingForest"), keyName: "Reading Forest", x: 380, y: 640, minDistance: 50000, color: "from-emerald-400 to-green-600" },
    { name: t("dynamic.learningWorld.regions.listeningOcean"), keyName: "Listening Ocean", x: 440, y: 350, minDistance: 120000, color: "from-blue-400 to-cyan-500" },
    { name: t("dynamic.learningWorld.regions.writingCity"), keyName: "Writing City", x: 380, y: 160, minDistance: 200000, color: "from-indigo-400 to-purple-600" },
    { name: t("dynamic.learningWorld.regions.speakingArena"), keyName: "Speaking Arena", x: 740, y: 220, minDistance: 280000, color: "from-rose-400 to-pink-600" },
    { name: t("dynamic.learningWorld.regions.nationalCertKingdom"), keyName: "National Certificate Kingdom", x: 800, y: 550, minDistance: 350000, color: "from-purple-500 to-indigo-700" },
    { name: t("dynamic.learningWorld.regions.satSpaceAcademy"), keyName: "SAT Space Academy", x: 1200, y: 480, minDistance: 420000, color: "from-violet-500 to-fuchsia-700" },
    { name: t("dynamic.learningWorld.regions.masterCastle"), keyName: "LMSHub Master Castle", x: 1580, y: 410, minDistance: 480000, color: "from-yellow-400 to-amber-600" },
  ];

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [avatarPos, setAvatarPos] = useState({ x: regions[0].x, y: regions[0].y });

  useEffect(() => {
    if (svgRef.current) {
      const pathEl = svgRef.current.querySelector("path.main-track-path") as SVGPathElement | null;
      if (pathEl) {
        try {
          const pathLength = pathEl.getTotalLength();
          const point = pathEl.getPointAtLength(pathLength * (progress_percentage / 100));
          setAvatarPos({ x: point.x, y: point.y });
        } catch (e) {
          const currentIdx = regions.findIndex(r => total_distance < r.minDistance);
          const activeIdx = currentIdx === -1 ? regions.length - 1 : Math.max(0, currentIdx - 1);
          setAvatarPos({ x: regions[activeIdx].x, y: regions[activeIdx].y });
        }
      }
    }
  }, [progress_percentage, total_distance]);

  return (
    <div className={`relative w-full h-[780px] overflow-hidden rounded-[2.5rem] border shadow-2xl ${
      isDark 
        ? "bg-[#0b132b] border-slate-800/80 shadow-slate-950/70" 
        : "bg-[#e0f2fe] border-sky-100 shadow-sky-200/30"
    }`}>
      
      {/* SVG Canvas rendering the fully illustrated continent */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        className="w-full h-full overflow-visible select-none transition-colors duration-1000"
      >
        <defs>
          {/* Water patterns and linear gradients */}
          <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isDark ? "#090f22" : "#7dd3fc"} />
            <stop offset="100%" stopColor={isDark ? "#060913" : "#38bdf8"} />
          </linearGradient>

          <linearGradient id="landGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isDark ? "#14253d" : "#a3e635"} />
            <stop offset="100%" stopColor={isDark ? "#0e182a" : "#65a30d"} />
          </linearGradient>

          <linearGradient id="mountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isDark ? "#1e293b" : "#94a3b8"} />
            <stop offset="100%" stopColor={isDark ? "#0f172a" : "#475569"} />
          </linearGradient>

          <linearGradient id="castleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>

          <linearGradient id="quillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isDark ? "#6366f1" : "#c084fc"} />
            <stop offset="100%" stopColor={isDark ? "#4338ca" : "#7e22ce"} />
          </linearGradient>

          <filter id="fantasyGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="castleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Water reflection flow pattern */}
          <pattern id="seaPattern" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M 0 50 Q 25 35, 50 50 T 100 50" fill="none" stroke={isDark ? "#1e293b" : "#bae6fd"} strokeWidth="1.5" opacity="0.3" />
            <path d="M 0 80 Q 25 65, 50 80 T 100 80" fill="none" stroke={isDark ? "#1e293b" : "#bae6fd"} strokeWidth="1.5" opacity="0.2" />
          </pattern>
        </defs>

        {/* 1. OCEAN BACKGROUND */}
        <rect width={viewWidth} height={viewHeight} fill="url(#oceanGrad)" />
        <rect width={viewWidth} height={viewHeight} fill="url(#seaPattern)" />

        {/* Dynamic marine items (ships/waves) */}
        <g className="sea-details">
          <circle cx="850" cy="180" r="16" fill="none" stroke={isDark ? "#1e1b4b" : "#bae6fd"} strokeWidth="2" strokeDasharray="5 5" className="animate-spin-slow" />
          {/* Sailboat in ocean */}
          <g transform="translate(680, 290) scale(0.8)">
            <path d="M 0 10 L 15 25 L -15 25 Z" fill={isDark ? "#0f172a" : "#fff"} />
            <path d="M 0 10 L 0 25" stroke={isDark ? "#475569" : "#78350f"} strokeWidth="2" />
            <path d="M -20 25 L 20 25 Q 25 35, 0 35 Q -25 35, -20 25 Z" fill={isDark ? "#334155" : "#b45309"} />
          </g>
          <g transform="translate(1450, 720) scale(0.65)">
            <path d="M 0 10 L 15 25 L -15 25 Z" fill={isDark ? "#0f172a" : "#fff"} />
            <path d="M 0 10 L 0 25" stroke={isDark ? "#475569" : "#78350f"} strokeWidth="2" />
            <path d="M -20 25 L 20 25 Q 25 35, 0 35 Q -25 35, -20 25 Z" fill={isDark ? "#334155" : "#b45309"} />
          </g>
        </g>

        {/* 2. THE CONTINENT SHORELINES & LANDMASSES (ORGANIC WORLD SHAPE) */}
        <g className="continent-land">
          {/* Main big continent */}
          <path
            d="M 50 900 Q 150 400, 300 650 T 600 200 T 950 150 T 1100 550 T 1300 200 T 1650 250 T 1750 650 T 1450 950 T 950 1050 T 550 920 Z"
            fill="url(#landGrad)"
            stroke={isDark ? "#38bdf8" : "#4d7c0f"}
            strokeWidth="8"
            style={{ filter: isDark ? "drop-shadow(0px 0px 15px rgba(56, 189, 248, 0.25))" : "none" }}
          />

          {/* Independent islands in ocean */}
          <path
            d="M 400 350 Q 450 280, 520 340 T 450 420 Z"
            fill="url(#landGrad)"
            stroke={isDark ? "#38bdf8" : "#4d7c0f"}
            strokeWidth="4"
          />
          <path
            d="M 1250 820 Q 1300 780, 1350 820 T 1300 880 Z"
            fill="url(#landGrad)"
            stroke={isDark ? "#38bdf8" : "#4d7c0f"}
            strokeWidth="4"
          />
        </g>

        {/* 3. PHYSICAL GEOGRAPHY: MOUNTAINS, RIVERS & WATERFALLS */}
        <g className="geography">
          {/* Winding purple/dark ink river */}
          <path
            d="M 380 0 C 390 100, 340 180, 410 280 C 440 320, 550 280, 520 400 C 490 500, 300 480, 200 600 C 100 700, 80 850, 0 920"
            fill="none"
            stroke={isDark ? "#6366f1" : "#1d4ed8"}
            strokeWidth="20"
          />
          <path
            d="M 380 0 C 390 100, 340 180, 410 280 C 440 320, 550 280, 520 400 C 490 500, 300 480, 200 600 C 100 700, 80 850, 0 920"
            fill="none"
            stroke={isDark ? "#a5b4fc" : "#60a5fa"}
            strokeWidth="8"
            opacity="0.8"
          />

          {/* Waterfall at river mouth/source */}
          <g transform="translate(380, 0)">
            <ellipse rx="15" ry="5" fill="#fff" className="animate-pulse" />
            <line x1="-10" y1="0" x2="-10" y2="40" stroke="#fff" strokeWidth="2" opacity="0.9" />
            <line x1="0" y1="0" x2="0" y2="45" stroke="#fff" strokeWidth="3" opacity="0.9" />
            <line x1="10" y1="0" x2="10" y2="40" stroke="#fff" strokeWidth="2" opacity="0.9" />
          </g>

          {/* Mountains separators */}
          <g className="mountains">
            {/* Mountain Range 1 */}
            <polygon points="620,180 670,270 570,270" fill="url(#mountainGrad)" />
            <polygon points="620,180 640,210 600,210" fill="#fff" />

            <polygon points="680,210 740,310 620,310" fill="url(#mountainGrad)" />
            <polygon points="680,210 705,245 655,245" fill="#fff" />

            {/* Mountain Range 2 (Near Master Castle) */}
            <polygon points="1520,320 1600,480 1440,480" fill="url(#mountainGrad)" />
            <polygon points="1520,320 1550,370 1490,370" fill="#fff" />

            <polygon points="1600,280 1700,480 1500,480" fill="url(#mountainGrad)" />
            <polygon points="1600,280 1635,340 1565,340" fill="#fff" />
          </g>

          {/* Bridges crossing river */}
          <g className="bridges">
            {/* Bridge 1 */}
            <g transform="translate(420, 310) rotate(-45)">
              <rect x="-10" y="-30" width="20" height="60" rx="3" fill="#78350f" stroke="#451a03" strokeWidth="2" />
              <line x1="-10" y1="-30" x2="-10" y2="30" stroke="#f59e0b" strokeWidth="2" />
              <line x1="10" y1="-30" x2="10" y2="30" stroke="#f59e0b" strokeWidth="2" />
            </g>
          </g>
        </g>

        {/* 4. THE ROADPATH (windy cobblestones with glow) */}
        <g className="adventure-road">
          <path
            d={pathD}
            fill="none"
            stroke={isDark ? "#111827" : "#d1d5db"}
            strokeWidth="24"
            strokeLinecap="round"
          />
          <path
            d={pathD}
            fill="none"
            stroke={isDark ? "#1f2937" : "#e5e7eb"}
            strokeWidth="16"
            strokeLinecap="round"
          />

          {/* Completed highlighted segment */}
          <path
            className="main-track-path"
            d={pathD}
            fill="none"
            stroke={isDark ? "#f59e0b" : "#fbbf24"}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray="1800"
            strokeDashoffset={1800 - (1800 * (progress_percentage / 100))}
            style={{ transition: "stroke-dashoffset 2s ease-in-out" }}
          />

          {/* Glowing particle outline */}
          <path
            d={pathD}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="4"
            strokeDasharray="20 15"
            strokeLinecap="round"
            className="animate-dash"
            style={{ filter: "url(#fantasyGlow)" }}
          />
        </g>

        {/* 5. REGIONAL LANDMARK ILLUSTRATIONS */}
        <g className="landmarks">
          {/* START VILLAGE */}
          <g transform="translate(150, 780)">
            <circle r="40" fill={isDark ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.75)"} className="backdrop-blur-sm" />
            <g transform="translate(-20, -20)">
              {/* Cozy cottages */}
              <rect x="-8" y="10" width="16" height="15" fill={isDark ? "#334155" : "#d97706"} rx="2" />
              <polygon points="-12,10 0,-2 12,10" fill="#991b1b" />
              <rect x="-3" y="17" width="6" height="8" fill="#fef08a" />

              <rect x="12" y="15" width="12" height="10" fill={isDark ? "#1e293b" : "#b45309"} rx="1" />
              <polygon points="9,15 18,7 27,15" fill="#7f1d1d" />

              <circle cx="-15" cy="22" r="3" fill="#eab308" className="animate-pulse" />
            </g>
          </g>

          {/* READING FOREST */}
          <g transform="translate(380, 640)">
            <circle r="42" fill={isDark ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.75)"} />
            <g transform="translate(0, -5)">
              {/* Trees */}
              <polygon points="-25,10 -15,-15 -5,10" fill="#065f46" />
              <polygon points="-15,15 -7,-5 1,15" fill="#047857" />
              <polygon points="12,10 22,-12 32,10" fill="#065f46" />

              {/* Magical Open Book Dome */}
              <path d="M -15 -8 L 0 -18 L 15 -8 L 15 8 L 0 -2 L -15 8 Z" fill="#fff" stroke="#1e3a8a" strokeWidth="2" />
              <line x1="0" y1="-18" x2="0" y2="-2" stroke="#1e3a8a" strokeWidth="2" />
              <circle cx="0" cy="-22" r="4" fill="#a7f3d0" className="animate-pulse" />
            </g>
          </g>

          {/* LISTENING OCEAN */}
          <g transform="translate(440, 350)">
            <circle r="45" fill={isDark ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.75)"} />
            {/* Headphones stone monument */}
            <g transform="translate(0, -5) scale(0.9)">
              <path d="M -22 15 C -22 -15, 22 -15, 22 15" fill="none" stroke={isDark ? "#94a3b8" : "#475569"} strokeWidth="8" strokeLinecap="round" />
              <rect x="-26" y="8" width="10" height="15" rx="3" fill={isDark ? "#cbd5e1" : "#1e293b"} />
              <rect x="16" y="8" width="10" height="15" rx="3" fill={isDark ? "#cbd5e1" : "#1e293b"} />
              <circle cx="0" cy="12" r="6" fill="#60a5fa" className="animate-ping" opacity="0.5" />
              <circle cx="0" cy="12" r="4" fill="#3b82f6" />
            </g>
          </g>

          {/* WRITING CITY */}
          <g transform="translate(380, 160)">
            <circle r="42" fill={isDark ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.75)"} />
            <g transform="translate(0, -12)">
              {/* Quill Tower */}
              <rect x="-8" y="10" width="16" height="25" fill="url(#quillGrad)" rx="2" />
              <rect x="-5" y="15" width="10" height="5" fill="#fef08a" />
              {/* Feather point */}
              <path d="M 0 -15 L -8 10 L 8 10 Z" fill="#e2e8f0" />
              <line x1="0" y1="-15" x2="0" y2="10" stroke="#cbd5e1" strokeWidth="1.5" />
            </g>
          </g>

          {/* SPEAKING ARENA */}
          <g transform="translate(740, 220)">
            <circle r="48" fill={isDark ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.75)"} />
            {/* Colosseum Stadium */}
            <g transform="translate(0, -5)">
              <ellipse rx="30" ry="18" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
              <ellipse rx="22" ry="12" fill={isDark ? "#1e293b" : "#475569"} />
              {/* Pillars */}
              <line x1="-24" y1="-2" x2="-24" y2="8" stroke="#cbd5e1" strokeWidth="3" />
              <line x1="24" y1="-2" x2="24" y2="8" stroke="#cbd5e1" strokeWidth="3" />
              <line x1="0" y1="8" x2="0" y2="-12" stroke="#fda4af" strokeWidth="2" className="animate-pulse" />
              <circle cx="0" cy="-14" r="3" fill="#f43f5e" />
            </g>
          </g>

          {/* NATIONAL CERTIFICATE KINGDOM */}
          <g transform="translate(800, 550)">
            <circle r="46" fill={isDark ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.75)"} />
            <g transform="translate(0, -10)">
              {/* Castle Fortress */}
              <rect x="-22" y="10" width="44" height="20" fill={isDark ? "#334155" : "#475569"} rx="2" />
              <rect x="-26" y="2" width="10" height="28" fill={isDark ? "#1e293b" : "#334155"} />
              <polygon points="-28,2 -21,-8 -14,2" fill="#991b1b" />

              <rect x="16" y="2" width="10" height="28" fill={isDark ? "#1e293b" : "#334155"} />
              <polygon points="14,2 21,-8 28,2" fill="#991b1b" />

              <rect x="-5" y="18" width="10" height="12" rx="2" fill="#f59e0b" />
            </g>
          </g>

          {/* SAT SPACE ACADEMY */}
          <g transform="translate(1200, 480)">
            <circle r="48" fill={isDark ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.75)"} />
            <g transform="translate(0, -12)">
              {/* Launchpad & rocket */}
              <rect x="-15" y="24" width="30" height="8" fill="#4b5563" />
              <path d="M 0 -18 C -6 -5, -8 15, 0 24 C 8 15, 6 -5, 0 -18" fill="#f3f4f6" stroke="#9ca3af" strokeWidth="1.5" />
              <polygon points="-8,18 -14,24 -8,24" fill="#ef4444" />
              <polygon points="8,18 14,24 8,24" fill="#ef4444" />
              <circle cx="0" cy="28" r="4" fill="#f97316" className="animate-ping" />
            </g>
          </g>

          {/* LMSHUB MASTER CASTLE */}
          <g transform="translate(1580, 410)">
            <circle r="55" fill={isDark ? "rgba(15,23,42,0.6)" : "rgba(255,255,255,0.75)"} style={{ filter: "url(#castleGlow)" }} />
            <g transform="translate(0, -18)">
              {/* Massive Golden Castle */}
              <rect x="-25" y="15" width="50" height="30" fill="url(#castleGrad)" rx="3" />
              {/* Central Tower */}
              <rect x="-10" y="-10" width="20" height="40" fill="url(#castleGrad)" />
              <polygon points="-14,-10 0,-32 14,-10" fill="#f59e0b" />
              
              {/* Flags */}
              <line x1="0" y1="-32" x2="0" y2="-45" stroke="#d97706" strokeWidth="2" />
              <polygon points="0,-45 15,-40 0,-35" fill="#ef4444" />

              <rect x="-6" y="28" width="12" height="17" fill="#fef08a" rx="3" />
            </g>
          </g>
        </g>

        {/* Fog of war cloud overlay covering locked sections */}
        <g className="fog-of-war" opacity="0.65">
          {regions.map((reg, idx) => {
            const isUnlocked = total_distance >= reg.minDistance;
            if (isUnlocked) return null;

            return (
              <g key={idx} transform={`translate(${reg.x}, ${reg.y})`}>
                <circle r="80" fill={isDark ? "#090d16" : "#cbd5e1"} style={{ filter: "blur(18px)" }} />
                <path d="M-40,0 Q-20,-30 0,0 T40,0 T0,30 Z" fill={isDark ? "#1e293b" : "#94a3b8"} opacity="0.6" />
                <g transform="translate(-10, -10)">
                  <Lock className="w-5 h-5 text-slate-400" />
                </g>
              </g>
            );
          })}
        </g>

        {/* 6. TREASURE REWARD CHESTS (Common, Rare, Epic, Legendary) */}
        {checkpoints && checkpoints.map((cp) => {
          const ratio = Math.min(1.0, cp.target_distance / 500000.0);
          let cpX = 500;
          let cpY = 300;
          
          if (svgRef.current) {
            const pathEl = svgRef.current.querySelector("path.main-track-path") as SVGPathElement | null;
            if (pathEl) {
              try {
                const point = pathEl.getPointAtLength(pathEl.getTotalLength() * ratio);
                cpX = point.x;
                cpY = point.y;
              } catch (e) {}
            }
          }

          const rarity = getChestRarity(cp.target_distance);

          return (
            <g
              key={cp.id}
              transform={`translate(${cpX}, ${cpY - 35})`}
              className="cursor-pointer"
              onClick={() => setSelectedCheckpoint(cp)}
            >
              {cp.unlocked && !cp.claimed && (
                <motion.circle
                  r="28"
                  fill={rarity.color}
                  opacity={0.35}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.35, 0.6, 0.35] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              )}

              {/* Chest Vector Illustration */}
              <g transform="translate(-16, -16) scale(1.1)">
                {/* Chest Base */}
                <rect x="2" y="14" width="28" height="14" fill="#5c3a21" rx="2" stroke={rarity.color} strokeWidth="1.5" />
                {/* Chest Lid - Rotates slightly if claimed (open state) */}
                <g style={{
                  transform: cp.claimed ? "rotate(-30deg) translate(-4px, -6px)" : "none",
                  transformOrigin: "2px 14px",
                  transition: "transform 0.5s ease-out"
                }}>
                  <path d="M 2 14 C 2 6, 30 6, 30 14 Z" fill="#82522e" stroke={rarity.color} strokeWidth="1.5" />
                  <rect x="13" y="10" width="6" height="5" fill="#f59e0b" rx="1" />
                </g>
                {/* Clasp / Lock Indicator */}
                {!cp.unlocked && (
                  <circle cx="16" cy="16" r="4" fill="#1e293b" />
                )}
                {cp.claimed && (
                  <circle cx="16" cy="18" r="5" fill="#10b981" />
                )}
              </g>

              {/* Checkpoint text */}
              <rect x="-35" y="-35" width="70" height="16" rx="4" fill="#0f172a" opacity="0.85" />
              <text
                y="-23"
                textAnchor="middle"
                fill="#fef08a"
                fontSize="9"
                fontWeight="black"
              >
                {Math.round(cp.target_distance / 1000)} km
              </text>
            </g>
          );
        })}

        {/* 7. AVATAR POSITION & TRAVELLING CHARACTER */}
        <g transform={`translate(${avatarPos.x}, ${avatarPos.y})`} className="pointer-events-none">
          {/* Pulsing ring */}
          <motion.circle
            r="32"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="3"
            animate={{ scale: [1, 1.3, 1], opacity: [0.9, 0.2, 0.9] }}
            transition={{ repeat: Infinity, duration: 1.6 }}
          />

          <circle r="20" fill="#f59e0b" className="shadow-2xl" />

          {/* Level banner above character */}
          <g transform="translate(0, -32)">
            <rect x="-22" y="-8" width="44" height="16" rx="4" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" />
            <text textAnchor="middle" y="3.5" fontSize="8" fontWeight="black" fill="#f59e0b">
              {t("dynamic.learningWorld.level").toUpperCase()} {Math.max(1, Math.floor(xp / 1000) + 1)}
            </text>
          </g>

          {/* Map marker or custom character icon */}
          <g transform="translate(-12, -12)">
            <MapPin className="w-6 h-6 text-slate-950 fill-amber-400" />
          </g>
        </g>
      </svg>

      {/* Floating Region Labels Overlay directly on the game canvas */}
      <div className="absolute inset-0 pointer-events-none">
        {regions.map((reg, idx) => {
          const isUnlocked = total_distance >= reg.minDistance;
          // Master castle remains fully hidden until 420k distance
          if (reg.keyName === "LMSHub Master Castle" && total_distance < 420000) return null;

          return (
            <div
              key={idx}
              className="absolute transition-all duration-500"
              style={{
                left: `${(reg.x / viewWidth) * 100}%`,
                top: `${(reg.y / viewHeight) * 100}%`,
                transform: "translate(-50%, 25px)"
              }}
            >
              <div className={`px-2.5 py-1 rounded-xl border text-[9px] font-black tracking-wide shadow-md whitespace-nowrap ${
                isUnlocked 
                  ? "bg-slate-900/90 border-amber-500/30 text-amber-300"
                  : "bg-slate-950/80 border-slate-800 text-slate-500"
              }`}>
                {reg.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chest Details Overlay Dialog */}
      <AnimatePresence>
        {selectedCheckpoint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div
                className="absolute top-0 left-0 right-0 h-2"
                style={{ backgroundColor: getChestRarity(selectedCheckpoint.target_distance).color }}
              />

              <div className="text-center relative">
                <div
                  className="mx-auto w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl mb-4 animate-pulse"
                  style={{ backgroundColor: `${getChestRarity(selectedCheckpoint.target_distance).color}20` }}
                >
                  <Gift className="w-10 h-10" style={{ color: getChestRarity(selectedCheckpoint.target_distance).color }} />
                </div>

                <h4 className="text-2xl font-black text-slate-100">
                  {selectedCheckpoint.name === "Start Village Chest" ? `${t("dynamic.learningWorld.regions.startVillage")} ${t("dynamic.learningWorld.rewardChest")}`
                   : selectedCheckpoint.name === "Reading Forest Chest" ? `${t("dynamic.learningWorld.regions.readingForest")} ${t("dynamic.learningWorld.rewardChest")}`
                   : selectedCheckpoint.name === "Listening Ocean Chest" ? `${t("dynamic.learningWorld.regions.listeningOcean")} ${t("dynamic.learningWorld.rewardChest")}`
                   : selectedCheckpoint.name === "Writing City Chest" ? `${t("dynamic.learningWorld.regions.writingCity")} ${t("dynamic.learningWorld.rewardChest")}`
                   : selectedCheckpoint.name === "Speaking Arena Chest" ? `${t("dynamic.learningWorld.regions.speakingArena")} ${t("dynamic.learningWorld.rewardChest")}`
                   : selectedCheckpoint.name === "NC Kingdom Chest" ? `${t("dynamic.learningWorld.regions.nationalCertKingdom")} ${t("dynamic.learningWorld.rewardChest")}`
                   : selectedCheckpoint.name === "SAT Academy Chest" ? `${t("dynamic.learningWorld.regions.satSpaceAcademy")} ${t("dynamic.learningWorld.rewardChest")}`
                   : selectedCheckpoint.name === "Master Castle Chest" ? `${t("dynamic.learningWorld.regions.masterCastle")} ${t("dynamic.learningWorld.rewardChest")}`
                   : selectedCheckpoint.name}
                </h4>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
                  {getChestRarity(selectedCheckpoint.target_distance).name}
                </span>

                <p className="text-xs text-slate-400 mt-2">
                  {t("dynamic.learningWorld.totalDistance")}: <span className="font-bold">{Math.round(selectedCheckpoint.target_distance / 1000)} km</span>
                </p>

                <div className="bg-slate-950/50 rounded-2xl p-4 my-5 border border-slate-800/80 text-left">
                  <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">{t("dynamic.learningWorld.rewardChest")}</span>
                  <span className="text-sm text-slate-200 font-bold">
                    {selectedCheckpoint.reward_type === "COIN_BOX" ? `${selectedCheckpoint.reward_value} ${t("dynamic.learningWorld.coins")}`
                     : selectedCheckpoint.reward_type === "XP_BOOST" ? `${selectedCheckpoint.reward_value} ${t("dynamic.learningWorld.xp")}`
                     : `${t("dynamic.learningWorld.rewardChest")}`}
                  </span>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setSelectedCheckpoint(null)}
                    className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition"
                  >
                    {t("dynamic.learningWorld.close")}
                  </button>
                  {selectedCheckpoint.unlocked && !selectedCheckpoint.claimed && (
                    <button
                      onClick={handleClaim}
                      disabled={claiming}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-black rounded-2xl shadow-lg transition"
                    >
                      {t("dynamic.learningWorld.claimReward")}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
