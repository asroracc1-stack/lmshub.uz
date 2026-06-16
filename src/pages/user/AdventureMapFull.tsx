import React, { useEffect, useState, useRef } from "react";
import { AdventureMap } from "@/components/gamification/AdventureMap";
import { api } from "@/lib/axios";
import { ArrowLeft, RefreshCw, Compass, Trophy, Star, Shield, Gift, Flame, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";

interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  unlocked: boolean;
}

export const AdventureMapFull: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [progressData, setProgressData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Zoom and Pan states
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const response = await api.get("/user/gamification/progress");
      setProgressData(response.data);
    } catch (e) {
      console.error("Failed to load adventure map progress:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  const handleBack = () => {
    const r = (role || 'student').toLowerCase();
    const path = r === 'super_admin' ? 'super-admin' : r === 'payment_manager' ? 'pack-manager' : r;
    navigate(`/${path}/dashboard`);
  };

  const zoomIn = () => setZoom(prev => Math.min(2.5, prev + 0.25));
  const zoomOut = () => setZoom(prev => Math.max(0.6, prev - 0.25));
  const resetZoom = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setStartX(e.clientX - panX);
    setStartY(e.clientY - panY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanX(e.clientX - startX);
    setPanY(e.clientY - startY);
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

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

  const getAchievementsList = (): Achievement[] => {
    if (!progressData) return [];
    const dist = progressData.total_distance;
    const streakVal = progressData.streak;
    const xpVal = progressData.xp;

    return [
      { id: "1", name: t("dynamic.learningWorld.badges.step.name"), desc: t("dynamic.learningWorld.badges.step.desc"), icon: "🌱", unlocked: dist > 0 },
      { id: "2", name: t("dynamic.learningWorld.badges.streak7.name"), desc: t("dynamic.learningWorld.badges.streak7.desc"), icon: "🔥", unlocked: streakVal >= 7 },
      { id: "3", name: t("dynamic.learningWorld.badges.streak30.name"), desc: t("dynamic.learningWorld.badges.streak30.desc"), icon: "👑", unlocked: streakVal >= 30 },
      { id: "4", name: t("dynamic.learningWorld.badges.traveler100.name"), desc: t("dynamic.learningWorld.badges.traveler100.desc"), icon: "🎒", unlocked: dist >= 100000 },
      { id: "5", name: t("dynamic.learningWorld.badges.explorer250.name"), desc: t("dynamic.learningWorld.badges.explorer250.desc"), icon: "🧭", unlocked: dist >= 250000 },
      { id: "6", name: t("dynamic.learningWorld.badges.ielts.name"), desc: t("dynamic.learningWorld.badges.ielts.desc"), icon: "🎓", unlocked: xpVal >= 10000 },
      { id: "7", name: t("dynamic.learningWorld.badges.sat.name"), desc: t("dynamic.learningWorld.badges.sat.desc"), icon: "🚀", unlocked: dist >= 420000 },
      { id: "8", name: t("dynamic.learningWorld.badges.legend.name"), desc: t("dynamic.learningWorld.badges.legend.desc"), icon: "🏆", unlocked: dist >= 480000 },
    ];
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950 z-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-300">{t("dynamic.learningWorld.loading")}</h3>
          <p className="text-sm text-slate-500 mt-1">{t("dynamic.learningWorld.loadingDesc")}</p>
        </div>
      </div>
    );
  }

  const nextReward = progressData?.checkpoints?.find((cp: any) => !cp.claimed);

  return (
    <div className={`min-h-screen p-4 md:p-6 flex flex-col gap-6 transition-colors duration-500 ${
      isDark ? "bg-[#090d16] text-slate-100" : "bg-sky-50/50 text-slate-900"
    }`}>
      {/* 1. Header with back navigation & global title */}
      <div className={`flex items-center justify-between gap-4 border p-4 rounded-3xl backdrop-blur-md transition-all duration-300 ${
        isDark ? "bg-slate-900/40 border-slate-800/80" : "bg-white border-slate-200 shadow-md"
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className={`p-3 rounded-2xl transition flex items-center justify-center ${
              isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent leading-tight">
              {t("dynamic.learningWorld.title")}
            </h1>
            <p className="text-xs text-slate-400 font-bold">{t("dynamic.learningWorld.subtitle")}</p>
          </div>
        </div>

        <button
          onClick={fetchProgress}
          className={`p-3 rounded-2xl transition flex items-center justify-center ${
            isDark ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
          }`}
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Fullscreen Game Viewport grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch flex-1 min-h-[640px]">
        {/* Left Side Game HUD & Achievements */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Current Region Info Card */}
          <div className={`border rounded-3xl p-5 backdrop-blur-md transition-all duration-300 ${
            isDark ? "bg-slate-900/40 border-slate-800/80" : "bg-white border-slate-200 shadow-md"
          }`}>
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-500" />
              {t("dynamic.learningWorld.currentRegion")}
            </h3>
            <p className="text-lg font-black text-amber-500 mb-4">
              {getLocalizedCurrentRegion(progressData?.current_region)}
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                  <span>{t("dynamic.learningWorld.distanceTraveled")}</span>
                  <span>{Math.round((progressData?.total_distance || 0) / 1000)} km / 500 km</span>
                </div>
                <div className={`w-full h-2.5 rounded-full overflow-hidden ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-amber-500 h-full transition-all duration-1000"
                    style={{ width: `${progressData?.progress_percentage || 0}%` }}
                  />
                </div>
              </div>

              {nextReward && (
                <div className={`p-3 rounded-2xl border ${
                  isDark ? "bg-slate-950/60 border-slate-800/80" : "bg-slate-50 border-slate-200"
                }`}>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    {t("dynamic.learningWorld.nextReward")}
                  </span>
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-amber-500 animate-bounce" />
                    <span className="text-xs font-bold">
                      {nextReward.reward_type === "COIN_BOX" ? `${nextReward.reward_value} ${t("dynamic.learningWorld.coins")}` : `${t("dynamic.learningWorld.rewardChest")}`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Badges Achievements Card */}
          <div className={`border rounded-3xl p-5 backdrop-blur-md flex-1 flex flex-col transition-all duration-300 ${
            isDark ? "bg-slate-900/40 border-slate-800/80" : "bg-white border-slate-200 shadow-md"
          }`}>
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              {t("dynamic.learningWorld.achievementsTitle")}
            </h3>
            
            <div className="grid grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin flex-1">
              {getAchievementsList().map((ach) => (
                <div
                  key={ach.id}
                  className={`p-3 rounded-2xl border text-center relative transition-all duration-300 flex flex-col justify-center items-center ${
                    ach.unlocked
                      ? isDark 
                        ? "bg-indigo-950/20 border-indigo-500/40 text-slate-100 shadow-lg shadow-indigo-500/5"
                        : "bg-indigo-50/70 border-indigo-100 text-indigo-950 shadow-md"
                      : isDark
                        ? "bg-slate-950/40 border-slate-800/80 text-slate-500 opacity-50"
                        : "bg-slate-100 border-slate-200 text-slate-400 opacity-60"
                  }`}
                >
                  <span className="text-2xl block mb-1">{ach.icon}</span>
                  <h4 className="text-[10px] font-black truncate w-full">{ach.name}</h4>
                  <p className="text-[8px] text-slate-400 dark:text-slate-400 mt-0.5 line-clamp-2 leading-normal">{ach.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Pannable Interactive Illustrated Map Viewport */}
        <div className="lg:col-span-3 flex flex-col gap-4 relative">
          {/* Zoom Controls Panel */}
          <div className="absolute bottom-6 right-6 z-20 flex gap-2">
            <button
              onClick={zoomIn}
              className={`w-11 h-11 border rounded-xl flex items-center justify-center font-black text-base transition shadow-lg ${
                isDark ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              +
            </button>
            <button
              onClick={zoomOut}
              className={`w-11 h-11 border rounded-xl flex items-center justify-center font-black text-base transition shadow-lg ${
                isDark ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              -
            </button>
            <button
              onClick={resetZoom}
              className={`px-4 h-11 border rounded-xl flex items-center justify-center text-xs font-black transition shadow-lg ${
                isDark ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Reset
            </button>
          </div>

          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`w-full h-full overflow-hidden border rounded-[2.5rem] cursor-grab active:cursor-grabbing relative ${
              isDark ? "border-slate-800/80 bg-slate-950/40" : "border-slate-200 bg-white"
            }`}
            style={{ touchAction: "none" }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                transformOrigin: "center center",
                transition: isPanning ? "none" : "transform 0.15s ease-out"
              }}
            >
              {progressData && (
                <AdventureMap
                  progressData={progressData}
                  compact={false}
                  onRefresh={fetchProgress}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdventureMapFull;
