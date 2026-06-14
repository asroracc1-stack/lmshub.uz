import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Lock, Check, Compass, Star, Trophy, Award, MapPin, Sun, Moon, CloudRain, CloudSnow } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import confetti from "canvas-confetti";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";

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
  forcedWeather?: string;
}

export const AdventureMap: React.FC<AdventureMapProps> = ({ progressData, compact = false, onRefresh, forcedWeather }) => {
  const { total_distance, current_region, xp, coins, streak, checkpoints, progress_percentage } = progressData;
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === "dark";

  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [claiming, setClaiming] = useState(false);

  // Weather system
  const [weather, setWeather] = useState<"sunny" | "night" | "rain" | "snow">("sunny");
  useEffect(() => {
    if (forcedWeather) {
      setWeather(forcedWeather as any);
      return;
    }
    const min = new Date().getMinutes();
    const weatherIndex = min % 4;
    const weatherTypes: ("sunny" | "night" | "rain" | "snow")[] = ["sunny", "night", "rain", "snow"];
    setWeather(weatherTypes[weatherIndex]);
  }, [forcedWeather]);

  // SVG dimensions
  const viewWidth = 1200;
  const viewHeight = compact ? 260 : 700;

  const pathD = compact
    ? "M 50 130 Q 300 20, 600 130 T 1150 130"
    : "M 100 120 C 350 40, 450 240, 250 320 C 50 380, 200 560, 550 480 C 850 400, 1050 560, 950 600 C 850 630, 950 250, 1050 120";

  // Translate Region names dynamically
  const regions = [
    { name: t("learningWorld.regions.startVillage"), keyName: "Start Village", x: compact ? 50 : 100, y: compact ? 130 : 120, minDistance: 0, icon: "🏠", color: "from-amber-400 to-orange-500" },
    { name: t("learningWorld.regions.readingForest"), keyName: "Reading Forest", x: compact ? 220 : 280, y: compact ? 90 : 140, minDistance: 50000, icon: "📚", color: "from-emerald-400 to-green-600" },
    { name: t("learningWorld.regions.listeningOcean"), keyName: "Listening Ocean", x: compact ? 380 : 360, y: compact ? 110 : 250, minDistance: 120000, icon: "🎧", color: "from-blue-400 to-cyan-500" },
    { name: t("learningWorld.regions.writingCity"), keyName: "Writing City", x: compact ? 540 : 190, y: compact ? 130 : 380, minDistance: 200000, icon: "✍️", color: "from-indigo-400 to-purple-600" },
    { name: t("learningWorld.regions.speakingArena"), keyName: "Speaking Arena", x: compact ? 700 : 390, y: compact ? 110 : 490, minDistance: 280000, icon: "🎤", color: "from-rose-400 to-pink-600" },
    { name: t("learningWorld.regions.nationalCertKingdom"), keyName: "National Certificate Kingdom", x: compact ? 860 : 680, y: compact ? 90 : 450, minDistance: 350000, icon: "🎓", color: "from-purple-500 to-indigo-700" },
    { name: t("learningWorld.regions.satSpaceAcademy"), keyName: "SAT Space Academy", x: compact ? 1020 : 930, y: compact ? 130 : 540, minDistance: 420000, icon: "🚀", color: "from-violet-500 to-fuchsia-700" },
    { name: t("learningWorld.regions.masterCastle"), keyName: "LMSHub Master Castle", x: compact ? 1150 : 1050, y: compact ? 130 : 120, minDistance: 480000, icon: "👑", color: "from-yellow-400 to-amber-600" },
  ];

  // Helper to translate current region name
  const getLocalizedCurrentRegion = (regKey: string) => {
    if (!regKey) return "";
    const lowerKey = regKey.toLowerCase();
    if (lowerKey.includes("village") || lowerKey.includes("boshlanish")) return t("learningWorld.regions.startVillage");
    if (lowerKey.includes("forest") || lowerKey.includes("o'rmon") || lowerKey.includes("ormon")) return t("learningWorld.regions.readingForest");
    if (lowerKey.includes("ocean") || lowerKey.includes("okean")) return t("learningWorld.regions.listeningOcean");
    if (lowerKey.includes("city") || lowerKey.includes("shahar")) return t("learningWorld.regions.writingCity");
    if (lowerKey.includes("arena") || lowerKey.includes("arena")) return t("learningWorld.regions.speakingArena");
    if (lowerKey.includes("kingdom") || lowerKey.includes("qirollik")) return t("learningWorld.regions.nationalCertKingdom");
    if (lowerKey.includes("space") || lowerKey.includes("kosmik")) return t("learningWorld.regions.satSpaceAcademy");
    if (lowerKey.includes("castle") || lowerKey.includes("qal'a") || lowerKey.includes("qala")) return t("learningWorld.regions.masterCastle");
    return regKey;
  };

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
  }, [progress_percentage, compact, total_distance]);

  const getChestRarity = (targetDistance: number) => {
    if (targetDistance <= 120000) return { name: t("learningWorld.chests.common"), color: "#10B981", bg: "bg-emerald-500/10 border-emerald-500/30", iconColor: "text-emerald-400" };
    if (targetDistance <= 280000) return { name: t("learningWorld.chests.rare"), color: "#3B82F6", bg: "bg-blue-500/10 border-blue-500/30", iconColor: "text-blue-400" };
    if (targetDistance <= 420000) return { name: t("learningWorld.chests.epic"), color: "#8B5CF6", bg: "bg-purple-500/10 border-purple-500/30", iconColor: "text-purple-400" };
    return { name: t("learningWorld.chests.legendary"), color: "#F59E0B", bg: "bg-amber-500/10 border-amber-500/30", iconColor: "text-amber-400" };
  };

  const handleClaim = async () => {
    if (!selectedCheckpoint) return;
    setClaiming(true);
    try {
      const response = await api.post(`/user/gamification/claim/${selectedCheckpoint.id}`);
      if (response.data?.success) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#F59E0B", "#10B981", "#3B82F6", "#8B5CF6"]
        });
        toast.success(t("learningWorld.successClaim"));
        setSelectedCheckpoint(null);
        if (onRefresh) onRefresh();
      } else {
        toast.error(response.data?.message || t("learningWorld.errorClaim"));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("learningWorld.errorClaim"));
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className={`relative w-full overflow-hidden rounded-3xl border transition-colors duration-1000 p-6 shadow-2xl backdrop-blur-md ${
      isDark 
        ? "bg-slate-950/90 border-slate-800/80 shadow-slate-950/50" 
        : "bg-sky-50/70 border-sky-100/80 shadow-sky-100/30"
    }`}>
      
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5 mb-5 border-slate-800/20 dark:border-slate-800/60">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-tr from-amber-500 to-yellow-300 rounded-2xl shadow-lg text-slate-950 animate-spin-slow">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h3 className={`text-xl font-black ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              {t("learningWorld.title")}
            </h3>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {t("learningWorld.currentRegion")}: <span className="font-bold text-slate-700 dark:text-slate-200">{getLocalizedCurrentRegion(current_region)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/55 dark:border-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-2">
            {weather === "sunny" && <Sun className="w-4 h-4 text-amber-500 animate-pulse" />}
            {weather === "night" && <Moon className="w-4 h-4 text-indigo-400" />}
            {weather === "rain" && <CloudRain className="w-4 h-4 text-blue-400 animate-bounce" />}
            {weather === "snow" && <CloudSnow className="w-4 h-4 text-sky-200" />}
            <span className="text-[10px] font-bold uppercase tracking-wider">{weather}</span>
          </div>

          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/55 dark:border-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold">{Math.round(total_distance / 1000)} km</span>
          </div>
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/55 dark:border-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-xs font-bold">{xp} {t("learningWorld.xp")}</span>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <div style={{ minWidth: "1100px" }} className="mx-auto">
          <svg
            ref={svgRef}
            width="100%"
            viewBox={`0 0 ${viewWidth} ${viewHeight}`}
            className="w-full h-auto overflow-visible select-none transition-all duration-1000"
          >
            <defs>
              <filter id="roadGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              
              <pattern id="rainPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <line x1="10" y1="0" x2="5" y2="20" stroke="rgba(156, 163, 175, 0.4)" strokeWidth="1.5" />
                <line x1="30" y1="10" x2="25" y2="30" stroke="rgba(156, 163, 175, 0.4)" strokeWidth="1.5" />
              </pattern>

              <pattern id="snowPattern" width="60" height="60" patternUnits="userSpaceOnUse">
                <circle cx="15" cy="15" r="2" fill="rgba(255, 255, 255, 0.8)" />
                <circle cx="45" cy="35" r="3.5" fill="rgba(255, 255, 255, 0.8)" />
              </pattern>
            </defs>

            {!compact && (
              <g className="landscapes">
                <path
                  d="M 300 0 C 350 200, 150 400, 400 700"
                  fill="none"
                  stroke={isDark ? "#1E293B" : "#93C5FD"}
                  strokeWidth="20"
                  className="opacity-70"
                />
                <path
                  d="M 300 0 C 350 200, 150 400, 400 700"
                  fill="none"
                  stroke={isDark ? "#38BDF8" : "#60A5FA"}
                  strokeWidth="8"
                  className="opacity-90 animate-pulse"
                />

                <g transform="translate(290, 185) rotate(-35)">
                  <rect x="-30" y="-12" width="60" height="24" rx="4" fill="#475569" stroke="#1E293B" strokeWidth="2" />
                  <line x1="-20" y1="-12" x2="-20" y2="12" stroke="#64748B" strokeWidth="2" />
                  <line x1="20" y1="-12" x2="20" y2="12" stroke="#64748B" strokeWidth="2" />
                </g>
                <g transform="translate(200, 345) rotate(35)">
                  <rect x="-35" y="-12" width="70" height="24" rx="4" fill="#475569" stroke="#1E293B" strokeWidth="2" />
                  <line x1="-25" y1="-12" x2="-25" y2="12" stroke="#64748B" strokeWidth="2" />
                  <line x1="25" y1="-12" x2="25" y2="12" stroke="#64748B" strokeWidth="2" />
                </g>

                <g className="mountains opacity-50 dark:opacity-20" transform="translate(0, -20)">
                  <polygon points="500,280 570,400 430,400" fill="#64748B" />
                  <polygon points="500,280 520,314 480,314" fill="#F8FAFC" />
                  <polygon points="750,380 840,520 660,520" fill="#475569" />
                  <polygon points="750,380 775,420 725,420" fill="#F8FAFC" />
                </g>

                {weather === "rain" && (
                  <rect width={viewWidth} height={viewHeight} fill="url(#rainPattern)" pointerEvents="none" className="animate-rain" />
                )}
                {weather === "snow" && (
                  <rect width={viewWidth} height={viewHeight} fill="url(#snowPattern)" pointerEvents="none" className="animate-snow" />
                )}
                {weather === "sunny" && !isDark && (
                  <g className="sunrays opacity-25 pointer-events-none">
                    <line x1="0" y1="0" x2="300" y2="700" stroke="#FBBF24" strokeWidth="150" strokeDasharray="30 30" />
                  </g>
                )}
              </g>
            )}

            <path
              d={pathD}
              fill="none"
              stroke={isDark ? "#1E1B4B" : "#CBD5E1"}
              strokeWidth={compact ? 12 : 24}
              strokeLinecap="round"
            />
            <path
              d={pathD}
              fill="none"
              stroke={isDark ? "#312E81" : "#E2E8F0"}
              strokeWidth={compact ? 8 : 16}
              strokeLinecap="round"
            />

            <path
              className="main-track-path"
              d={pathD}
              fill="none"
              stroke={isDark ? "#818CF8" : "#60A5FA"}
              strokeWidth={compact ? 8 : 16}
              strokeLinecap="round"
              strokeDasharray="1500"
              strokeDashoffset={1500 - (1500 * (progress_percentage / 100))}
              style={{ transition: "stroke-dashoffset 2s ease-in-out" }}
            />
            <path
              d={pathD}
              fill="none"
              stroke="#FBBF24"
              strokeWidth={3}
              strokeDasharray="15 15"
              strokeLinecap="round"
              className="animate-dash"
              style={{ filter: isDark ? "url(#roadGlow)" : "none" }}
            />

            {regions.map((reg, idx) => {
              const isUnlocked = total_distance >= reg.minDistance;
              const isMasterCastle = reg.keyName === "LMSHub Master Castle";
              const shouldHide = isMasterCastle && total_distance < 420000;

              if (shouldHide) return null;

              return (
                <g key={idx} transform={`translate(${reg.x}, ${reg.y})`} className="transition-all duration-500">
                  {!isUnlocked && (
                    <circle
                      r={compact ? 24 : 45}
                      fill={isDark ? "#0F172A" : "#E2E8F0"}
                      className="opacity-75"
                      style={{ filter: "blur(8px)" }}
                    />
                  )}

                  <ellipse
                    rx={compact ? 18 : 32}
                    ry={compact ? 10 : 16}
                    fill={isUnlocked ? "url(#activeGradient)" : "#475569"}
                    opacity={isUnlocked ? 0.35 : 0.6}
                  />

                  <g transform={`translate(0, ${compact ? -10 : -18})`}>
                    {reg.keyName === "Start Village" && (
                      <g className="scale-75 md:scale-100">
                        <polygon points="0,-16 -12,0 12,0" fill="#B45309" />
                        <rect x="-8" y="0" width="16" height="12" fill="#F59E0B" />
                        <circle cx="0" cy="4" r="2.5" fill="#FEF08A" className="animate-pulse" />
                      </g>
                    )}

                    {reg.keyName === "Reading Forest" && (
                      <g className="scale-75 md:scale-100">
                        <rect x="-3" y="-12" width="6" height="18" fill="#78350F" />
                        <path d="M 0 -24 C -15 -18, -10 0, 0 6 C 10 0, 15 -18, 0 -24" fill="#047857" />
                        <path d="M -8 -12 L 8 -12" stroke="#FFF" strokeWidth="1.5" />
                      </g>
                    )}

                    {reg.keyName === "Listening Ocean" && (
                      <g className="scale-75 md:scale-100">
                        <circle r="12" fill="#0284C7" />
                        <circle r="8" fill="#38BDF8" className="animate-ping" opacity="0.4" />
                        <text y="4" textAnchor="middle" fontSize="12">🏝️</text>
                      </g>
                    )}

                    {reg.keyName === "Writing City" && (
                      <g className="scale-75 md:scale-100">
                        <rect x="-8" y="-18" width="16" height="24" fill="#475569" rx="2" />
                        <polygon points="0,-28 -8,-18 8,-18" fill="#E2E8F0" />
                        <line x1="0" y1="-28" x2="0" y2="-12" stroke="#000" strokeWidth="1.5" />
                      </g>
                    )}

                    {reg.keyName === "Speaking Arena" && (
                      <g className="scale-75 md:scale-100">
                        <ellipse rx="16" ry="10" fill="#9F1239" />
                        <line x1="-12" y1="-16" x2="-12" y2="4" stroke="#FDA4AF" strokeWidth="1.5" className="animate-pulse" />
                        <line x1="12" y1="-16" x2="12" y2="4" stroke="#FDA4AF" strokeWidth="1.5" className="animate-pulse" />
                      </g>
                    )}

                    {reg.keyName === "National Certificate Kingdom" && (
                      <g className="scale-75 md:scale-100">
                        <rect x="-14" y="-14" width="28" height="20" fill="#1E3A8A" rx="3" />
                        <polygon points="-14,-14 0,-26 14,-14" fill="#1D4ED8" />
                        <rect x="-4" y="-2" width="8" height="8" fill="#FEF08A" />
                      </g>
                    )}

                    {reg.keyName === "SAT Space Academy" && (
                      <g className="scale-75 md:scale-100">
                        <path d="M 0 -22 C -6 -10, -8 0, 0 4 C 8 0, 6 -10, 0 -22" fill="#E2E8F0" />
                        <polygon points="-4,2 0,-8 4,2" fill="#EF4444" />
                      </g>
                    )}

                    {reg.keyName === "LMSHub Master Castle" && (
                      <g className="scale-75 md:scale-100">
                        <rect x="-18" y="-20" width="36" height="26" fill="#D97706" rx="4" />
                        <polygon points="-18,-20 -9,-32 0,-20 9,-32 18,-20" fill="#F59E0B" />
                        <circle cx="0" cy="-6" r="5" fill="#FEF08A" className="animate-pulse" />
                      </g>
                    )}
                  </g>

                  {!isUnlocked && (
                    <g transform={`translate(0, ${compact ? 8 : 14})`}>
                      <circle r="9" fill="#0F172A" stroke="#475569" strokeWidth="1.5" />
                      <g transform="translate(-5, -5)">
                        <Lock className="w-2.5 h-2.5 text-slate-400" />
                      </g>
                    </g>
                  )}

                  {!compact && (
                    <text
                      y="32"
                      textAnchor="middle"
                      fill={isUnlocked ? (isDark ? "#F1F5F9" : "#1E293B") : "#94A3B8"}
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {reg.name}
                    </text>
                  )}
                </g>
              );
            })}

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
                  transform={`translate(${cpX}, ${cpY - (compact ? 16 : 28)})`}
                  className="cursor-pointer"
                  onClick={() => setSelectedCheckpoint(cp)}
                >
                  {cp.unlocked && !cp.claimed && (
                    <motion.circle
                      r={compact ? 16 : 24}
                      fill={rarity.color}
                      opacity={0.35}
                      animate={{ scale: [1, 1.35, 1], opacity: [0.35, 0.6, 0.35] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  )}

                  <circle
                    r={compact ? 13 : 19}
                    fill={cp.claimed ? "#1E293B" : cp.unlocked ? rarity.color : "#0F172A"}
                    stroke={cp.unlocked ? "#FFF" : "#475569"}
                    strokeWidth={2}
                    className="shadow-xl"
                  />

                  <g transform={`translate(-8, -8) scale(${compact ? 0.85 : 1.05})`}>
                    {cp.claimed ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : cp.unlocked ? (
                      <Gift className="w-4 h-4 text-slate-950 animate-bounce" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-500" />
                    )}
                  </g>

                  {!compact && (
                    <text
                      y="-24"
                      textAnchor="middle"
                      fill={rarity.color}
                      fontSize="9"
                      fontWeight="black"
                    >
                      {Math.round(cp.target_distance / 1000)}km
                    </text>
                  )}
                </g>
              );
            })}

            <g transform={`translate(${avatarPos.x}, ${avatarPos.y})`} className="pointer-events-none">
              <motion.circle
                r={compact ? 18 : 26}
                fill="none"
                stroke="#FBBF24"
                strokeWidth={3}
                animate={{ scale: [1, 1.25, 1], opacity: [0.9, 0.3, 0.9] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
              <circle
                r={compact ? 13 : 18}
                fill="#FBBF24"
                className="shadow-2xl"
              />
              
              <g transform={`translate(0, ${compact ? -20 : -28})`}>
                <rect x="-16" y="-7" width="32" height="14" rx="4" fill="#0F172A" stroke="#FBBF24" strokeWidth="1" />
                <text textAnchor="middle" y="3.5" fontSize="8" fontWeight="bold" fill="#FBBF24">
                  {t("learningWorld.level").toUpperCase()} {Math.max(1, Math.floor(xp / 1000) + 1)}
                </text>
              </g>

              <g transform="translate(-10, -10)">
                <MapPin className="w-5 h-5 text-slate-950 fill-slate-900" />
              </g>
            </g>
          </svg>
        </div>
      </div>

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
                  {selectedCheckpoint.name === "Start Village Chest" ? `${t("learningWorld.regions.startVillage")} ${t("learningWorld.rewardChest")}`
                   : selectedCheckpoint.name === "Reading Forest Chest" ? `${t("learningWorld.regions.readingForest")} ${t("learningWorld.rewardChest")}`
                   : selectedCheckpoint.name === "Listening Ocean Chest" ? `${t("learningWorld.regions.listeningOcean")} ${t("learningWorld.rewardChest")}`
                   : selectedCheckpoint.name === "Writing City Chest" ? `${t("learningWorld.regions.writingCity")} ${t("learningWorld.rewardChest")}`
                   : selectedCheckpoint.name === "Speaking Arena Chest" ? `${t("learningWorld.regions.speakingArena")} ${t("learningWorld.rewardChest")}`
                   : selectedCheckpoint.name === "NC Kingdom Chest" ? `${t("learningWorld.regions.nationalCertKingdom")} ${t("learningWorld.rewardChest")}`
                   : selectedCheckpoint.name === "SAT Academy Chest" ? `${t("learningWorld.regions.satSpaceAcademy")} ${t("learningWorld.rewardChest")}`
                   : selectedCheckpoint.name === "Master Castle Chest" ? `${t("learningWorld.regions.masterCastle")} ${t("learningWorld.rewardChest")}`
                   : selectedCheckpoint.name}
                </h4>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
                  {getChestRarity(selectedCheckpoint.target_distance).name}
                </span>

                <p className="text-xs text-slate-400 mt-2">
                  {t("learningWorld.totalDistance")}: <span className="font-bold">{Math.round(selectedCheckpoint.target_distance / 1000)} km</span>
                </p>

                <div className="bg-slate-950/50 rounded-2xl p-4 my-5 border border-slate-800/80 text-left">
                  <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">{t("learningWorld.rewardChest")}</span>
                  <span className="text-sm text-slate-200 font-bold">
                    {selectedCheckpoint.reward_type === "COIN_BOX" ? `${selectedCheckpoint.reward_value} ${t("learningWorld.coins")}`
                     : selectedCheckpoint.reward_type === "XP_BOOST" ? `${selectedCheckpoint.reward_value} ${t("learningWorld.xp")}`
                     : `${t("learningWorld.rewardChest")}`}
                  </span>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setSelectedCheckpoint(null)}
                    className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition"
                  >
                    {t("learningWorld.close")}
                  </button>
                  {selectedCheckpoint.unlocked && !selectedCheckpoint.claimed && (
                    <button
                      onClick={handleClaim}
                      disabled={claiming}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-black rounded-2xl shadow-lg transition"
                    >
                      {t("learningWorld.claimReward")}
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
