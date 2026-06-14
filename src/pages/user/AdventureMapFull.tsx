import React, { useEffect, useState } from "react";
import { AdventureMap } from "@/components/gamification/AdventureMap";
import { api } from "@/lib/axios";
import { ArrowLeft, RefreshCw, Compass, Trophy, Star, Shield, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

export const AdventureMapFull: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [progressData, setProgressData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    // Navigate back to the dashboard
    navigate(`/${role}/dashboard`);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950 z-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-300">Sarguzasht Xaritasi Yuklanmoqda...</h3>
          <p className="text-sm text-slate-500 mt-1">Ushbu dunyo qidirilmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col gap-6">
      {/* Top navbar */}
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
              LMSHub Learning World
            </h1>
            <p className="text-xs text-slate-400">500km Sarguzasht Kontinenti</p>
          </div>
        </div>

        <button
          onClick={fetchProgress}
          className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition text-slate-300 flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-xs font-semibold hidden md:inline">Yangilash</span>
        </button>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 items-start">
        {/* Left Side stats & legend */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Progress Summary Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 backdrop-blur-md">
            <h3 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Sarguzasht Holati
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Umumiy masofa</span>
                  <span className="font-bold text-amber-400">{Math.round(progressData?.total_distance || 0)}m / 500km</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-amber-500 h-full"
                    style={{ width: `${progressData?.progress_percentage || 0}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-950/50 border border-slate-800/80 p-3 rounded-2xl text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Kunlar</span>
                  <span className="text-lg font-black text-slate-200">{progressData?.streak || 0} 🔥</span>
                </div>
                <div className="bg-slate-950/50 border border-slate-800/80 p-3 rounded-2xl text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Tillar</span>
                  <span className="text-lg font-black text-slate-200">{progressData?.coins || 0} 🪙</span>
                </div>
              </div>
            </div>
          </div>

          {/* Zones Legend */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 backdrop-blur-md">
            <h3 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-400" />
              Sarguzasht Hududlari
            </h3>
            
            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
              <div className="flex gap-3 items-center">
                <span className="text-xl">🏠</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Start Village</h4>
                  <p className="text-[10px] text-slate-500">0 - 50 km</p>
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <span className="text-xl">📚</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Reading Forest</h4>
                  <p className="text-[10px] text-slate-500">50 - 120 km</p>
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <span className="text-xl">🎧</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Listening Ocean</h4>
                  <p className="text-[10px] text-slate-500">120 - 200 km</p>
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <span className="text-xl">✍️</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Writing City</h4>
                  <p className="text-[10px] text-slate-500">200 - 280 km</p>
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <span className="text-xl">🎤</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Speaking Arena</h4>
                  <p className="text-[10px] text-slate-500">280 - 350 km</p>
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <span className="text-xl">🎓</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">National Certificate Kingdom</h4>
                  <p className="text-[10px] text-slate-500">350 - 420 km</p>
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <span className="text-xl">🚀</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">SAT Space Academy</h4>
                  <p className="text-[10px] text-slate-500">420 - 480 km</p>
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <span className="text-xl">👑</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">LMSHub Master Castle</h4>
                  <p className="text-[10px] text-slate-500">480 - 500 km+</p>
                </div>
              </div>
            </div>
          </div>

          {/* Multiplier Guide */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 backdrop-blur-md">
            <h3 className="text-base font-bold text-slate-200 mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-emerald-400" />
              Masofa qanday hisoblanadi?
            </h3>
            <div className="text-xs space-y-2 text-slate-400">
              <p>Siz o'rgangan har bir daqiqa va topshirgan darslaringiz masofa sifatida qo'shiladi:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>1 daqiqa mashq = 50 metr</li>
                <li>1 ta quiz testi = 100 metr</li>
                <li>1 ta darsda qatnashish = 150 metr</li>
                <li>1 ta Mock testi = 500 metr</li>
                <li>1 ta coin = 10 metr</li>
                <li>1 kunlik streak = 200 metr</li>
                <li>1 XP ball = 1 metr</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Side Map */}
        <div className="lg:col-span-3">
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
  );
};

export default AdventureMapFull;
