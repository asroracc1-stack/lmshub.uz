import React, { useEffect, useState } from "react";
import { AdventureMap } from "@/components/gamification/AdventureMap";
import { api } from "@/lib/axios";
import { ArrowLeft, RefreshCw, Compass, Trophy, Star, Shield, Sun, Moon, CloudRain, CloudSnow } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

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
  const [progressData, setProgressData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Zoom and Pan states
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);

  // Weather toggle state
  const [currentWeather, setCurrentWeather] = useState<string>("sunny");

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
    navigate(`/${role}/dashboard`);
  };

  const zoomIn = () => setZoom(prev => Math.min(2.5, prev + 0.15));
  const zoomOut = () => setZoom(prev => Math.max(0.7, prev - 0.15));
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

  const getAchievementsList = (): Achievement[] => {
    if (!progressData) return [];
    const dist = progressData.total_distance;
    const streakVal = progressData.streak;
    const xpVal = progressData.xp;

    return [
      { id: "1", name: t("learningWorld.badges.step.name"), desc: t("learningWorld.badges.step.desc"), icon: "🌱", unlocked: dist > 0 },
      { id: "2", name: t("learningWorld.badges.streak7.name"), desc: t("learningWorld.badges.streak7.desc"), icon: "🔥", unlocked: streakVal >= 7 },
      { id: "3", name: t("learningWorld.badges.streak30.name"), desc: t("learningWorld.badges.streak30.desc"), icon: "👑", unlocked: streakVal >= 30 },
      { id: "4", name: t("learningWorld.badges.traveler100.name"), desc: t("learningWorld.badges.traveler100.desc"), icon: "🎒", unlocked: dist >= 100000 },
      { id: "5", name: t("learningWorld.badges.explorer250.name"), desc: t("learningWorld.badges.explorer250.desc"), icon: "🧭", unlocked: dist >= 250000 },
      { id: "6", name: t("learningWorld.badges.ielts.name"), desc: t("learningWorld.badges.ielts.desc"), icon: "🎓", unlocked: xpVal >= 10000 },
      { id: "7", name: t("learningWorld.badges.sat.name"), desc: t("learningWorld.badges.sat.desc"), icon: "🚀", unlocked: dist >= 420000 },
      { id: "8", name: t("learningWorld.badges.legend.name"), desc: t("learningWorld.badges.legend.desc"), icon: "🏆", unlocked: dist >= 480000 },
    ];
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950 z-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-300">{t("learningWorld.loading")}</h3>
          <p className="text-sm text-slate-500 mt-1">{t("learningWorld.loadingDesc")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition text-slate-300 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-amber-400 to-yellow-200 bg-clip-text text-transparent">
              {t("learningWorld.title")}
            </h1>
            <p className="text-xs text-slate-400">{t("learningWorld.subtitle")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1 rounded-2xl">
          <button
            onClick={() => setCurrentWeather("sunny")}
            className={`p-2 rounded-xl transition ${currentWeather === "sunny" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Sun className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentWeather("night")}
            className={`p-2 rounded-xl transition ${currentWeather === "night" ? "bg-indigo-500 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Moon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentWeather("rain")}
            className={`p-2 rounded-xl transition ${currentWeather === "rain" ? "bg-blue-500 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}
          >
            <CloudRain className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentWeather("snow")}
            className={`p-2 rounded-xl transition ${currentWeather === "snow" ? "bg-sky-400 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
          >
            <CloudSnow className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={fetchProgress}
          className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition text-slate-300 flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 items-start">
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 backdrop-blur-md">
            <h3 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              {t("learningWorld.statusTitle")}
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{t("learningWorld.distanceTraveled")}</span>
                  <span className="font-bold text-amber-400">{Math.round((progressData?.total_distance || 0) / 1000)} km / 500km</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-amber-500 h-full"
                    style={{ width: `${progressData?.progress_percentage || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 backdrop-blur-md">
            <h3 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              {t("learningWorld.achievementsTitle")}
            </h3>
            
            <div className="grid grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
              {getAchievementsList().map((ach) => (
                <div
                  key={ach.id}
                  className={`p-3 rounded-2xl border text-center relative transition-all duration-300 ${
                    ach.unlocked
                      ? "bg-indigo-950/20 border-indigo-500/40 text-slate-200 shadow-lg shadow-indigo-500/5"
                      : "bg-slate-950/40 border-slate-800/80 text-slate-500 grayscale opacity-60"
                  }`}
                >
                  <span className="text-2xl block mb-1.5">{ach.icon}</span>
                  <h4 className="text-[10px] font-bold truncate">{ach.name}</h4>
                  <p className="text-[8px] text-slate-400 mt-0.5 line-clamp-2 leading-normal">{ach.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 flex flex-col gap-4 relative">
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <button
              onClick={zoomIn}
              className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center font-bold text-slate-300 hover:bg-slate-800 transition"
            >
              +
            </button>
            <button
              onClick={zoomOut}
              className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center font-bold text-slate-300 hover:bg-slate-800 transition"
            >
              -
            </button>
            <button
              onClick={resetZoom}
              className="px-3 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
            >
              Reset
            </button>
          </div>

          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="w-full overflow-hidden border border-slate-800/80 rounded-[2rem] bg-slate-950/50 cursor-grab active:cursor-grabbing"
            style={{ touchAction: "none" }}
          >
            <div
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                transformOrigin: "center center",
                transition: isPanning ? "none" : "transform 0.2s ease-out"
              }}
            >
              {progressData && (
                <AdventureMap
                  progressData={progressData}
                  compact={false}
                  onRefresh={fetchProgress}
                  forcedWeather={currentWeather}
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
