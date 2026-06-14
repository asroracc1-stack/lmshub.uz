import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Lock, Check, Compass, Star, Trophy, Award, MapPin } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios"; // Correct import path

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
  };
  compact?: boolean;
  onRefresh?: () => void;
}

export const AdventureMap: React.FC<AdventureMapProps> = ({ progressData, compact = false, onRefresh }) => {
  const { total_distance, current_region, xp, coins, streak, checkpoints, progress_percentage } = progressData;
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [claiming, setClaiming] = useState(false);

  // SVG dimensions
  const viewWidth = 1000;
  const viewHeight = compact ? 220 : 600;

  // Curving path coordinates mapping the 500km journey across 8 zones.
  // 500km is mapped linearly.
  // We'll define a smooth cubic bezier/quadratic bezier path from left to right, winding down.
  const pathD = compact 
    ? "M 40 110 C 200 30, 350 190, 500 110 C 650 30, 800 190, 960 110" // Simple winding line for compact view
    : "M 100 100 C 350 40, 400 220, 200 280 C 50 320, 250 480, 500 400 C 750 320, 950 480, 800 520 C 700 540, 900 150, 920 80"; // Winding path for full view

  // Regions placement along path coordinates
  const regions = [
    { name: "Start Village", x: compact ? 40 : 100, y: compact ? 110 : 100, color: "from-blue-400 to-indigo-600", desc: "🏠 Boshlanish Qishlog'i (0km - 50km)", icon: "🏠" },
    { name: "Reading Forest", x: compact ? 170 : 250, y: compact ? 80 : 110, color: "from-emerald-400 to-green-600", desc: "📚 Reading O'rmoni (50km - 120km)", icon: "📚" },
    { name: "Listening Ocean", x: compact ? 310 : 340, y: compact ? 130 : 230, color: "from-cyan-400 to-blue-600", desc: "🎧 Listening Okeani (120km - 200km)", icon: "🎧" },
    { name: "Writing City", x: compact ? 450 : 200, y: compact ? 110 : 320, color: "from-amber-400 to-orange-600", desc: "✍️ Writing Shahri (200km - 280km)", icon: "✍️" },
    { name: "Speaking Arena", x: compact ? 590 : 390, y: compact ? 80 : 420, color: "from-rose-400 to-red-600", desc: "🎤 Speaking Arenasi (280km - 350km)", icon: "🎤" },
    { name: "National Certificate Kingdom", x: compact ? 720 : 620, y: compact ? 130 : 405, color: "from-purple-400 to-indigo-700", desc: "🎓 Milliy Sertifikat Qirolligi (350km - 420km)", icon: "🎓" },
    { name: "SAT Space Academy", x: compact ? 850 : 810, y: compact ? 90 : 470, color: "from-violet-500 to-fuchsia-700", desc: "🚀 SAT Kosmik Akademiyasi (420km - 480km)", icon: "🚀" },
    { name: "LMSHub Master Castle", x: compact ? 960 : 920, y: compact ? 110 : 80, color: "from-yellow-400 to-amber-600", desc: "👑 LMSHub Master Qal'asi (480km - 500km+)", icon: "👑" },
  ];

  // Helper to approximate point along path based on percentage (using SVG path properties)
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const [avatarPos, setAvatarPos] = useState({ x: regions[0].x, y: regions[0].y });

  React.useEffect(() => {
    if (svgRef.current) {
      const pathEl = svgRef.current.querySelector("path.main-track-path") as SVGPathElement | null;
      if (pathEl) {
        try {
          const pathLength = pathEl.getTotalLength();
          const point = pathEl.getPointAtLength(pathLength * (progress_percentage / 100));
          setAvatarPos({ x: point.x, y: point.y });
        } catch (e) {
          // Fallback to region center based on distance
          const regIndex = Math.min(
            regions.length - 1,
            Math.floor((progress_percentage / 100) * regions.length)
          );
          setAvatarPos({ x: regions[regIndex].x, y: regions[regIndex].y });
        }
      }
    }
  }, [progress_percentage, compact]);

  // Handle claiming checkpoint reward
  const handleClaim = async () => {
    if (!selectedCheckpoint) return;
    setClaiming(true);
    try {
      const response = await api.post(`/user/gamification/claim/${selectedCheckpoint.id}`);
      if (response.data?.success) {
        toast.success(response.data.message || "Sovg'a muvaffaqiyatli qabul qilindi!");
        setSelectedCheckpoint(null);
        if (onRefresh) onRefresh();
      } else {
        toast.error(response.data?.message || "Xatolik yuz berdi");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Sovg'ani olishda xatolik yuz berdi.");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="relative w-full overflow-hidden bg-slate-950/80 rounded-3xl border border-slate-800 p-6 shadow-2xl backdrop-blur-md">
      {/* Top dashboard / stats banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-tr from-amber-500 to-yellow-300 rounded-2xl shadow-lg shadow-amber-500/20 text-slate-950">
            <Compass className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-amber-300 to-yellow-100 bg-clip-text text-transparent">
              Sarguzasht Xaritasi (Learning World)
            </h3>
            <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Joriy hudud: <span className="font-semibold text-slate-200">{current_region}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-slate-300">{Math.round(total_distance / 1000)} km yurildi</span>
          </div>
          <div className="px-4 py-2 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-medium text-slate-300">{xp} XP</span>
          </div>
          <div className="px-4 py-2 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-slate-300">{streak} Kunlik Streak</span>
          </div>
        </div>
      </div>

      {/* SVG Map Canvas */}
      <div className="relative w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <div style={{ minWidth: "900px" }} className="mx-auto">
          <svg
            ref={svgRef}
            width="100%"
            viewBox={`0 0 ${viewWidth} ${viewHeight}`}
            className="w-full h-auto overflow-visible select-none"
          >
            <defs>
              {/* Path glow filter */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              {/* Gold gradient */}
              <linearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
            </defs>

            {/* Backgound Map Elements (mountains, trees, water decoration) */}
            {!compact && (
              <g className="opacity-15 pointer-events-none">
                {/* Forest icons near Reading Forest */}
                <text x="210" y="80" className="text-3xl">🌲</text>
                <text x="280" y="140" className="text-3xl">🌲</text>
                {/* Water ripples near Listening Ocean */}
                <text x="350" y="270" className="text-3xl">🌊</text>
                <text x="420" y="210" className="text-3xl">🌊</text>
                {/* Castle peaks near Castle */}
                <text x="890" y="110" className="text-4xl">🏰</text>
                {/* Space icons near SAT space academy */}
                <text x="790" y="520" className="text-3xl">🛸</text>
                <text x="840" y="440" className="text-3xl">🚀</text>
              </g>
            )}

            {/* Untraveled Locked Road Path */}
            <path
              d={pathD}
              fill="none"
              stroke="#1E293B"
              strokeWidth={compact ? 8 : 12}
              strokeLinecap="round"
            />
            <path
              d={pathD}
              fill="none"
              stroke="#334155"
              strokeWidth={compact ? 2 : 4}
              strokeDasharray="8 8"
              strokeLinecap="round"
            />

            {/* Traveled Animated Highlighted Road Path */}
            <path
              className="main-track-path"
              d={pathD}
              fill="none"
              stroke="url(#activeGradient)"
              strokeWidth={compact ? 8 : 12}
              strokeLinecap="round"
              strokeDasharray="1000"
              strokeDashoffset={1000 - (1000 * (progress_percentage / 100))}
              style={{ transition: "stroke-dashoffset 1.5s ease-in-out" }}
            />
            {/* Inner neon glow dashed path */}
            <path
              d={pathD}
              fill="none"
              stroke="#FFF"
              strokeWidth={2}
              strokeDasharray="12 12"
              strokeLinecap="round"
              strokeDashoffset={-10}
              className="animate-dash"
              opacity={0.8}
            />

            {/* Regions / Milestones Pins */}
            {regions.map((reg, idx) => (
              <g key={idx} transform={`translate(${reg.x}, ${reg.y})`} className="cursor-pointer">
                {/* Glowing beacon ring */}
                <circle
                  r={compact ? 12 : 20}
                  fill="currentColor"
                  className={`text-slate-900 border border-slate-700`}
                />
                <circle
                  r={compact ? 12 : 20}
                  fill="none"
                  stroke={total_distance >= (idx * 62500) ? "#F59E0B" : "#475569"}
                  strokeWidth={2}
                />
                <text
                  textAnchor="middle"
                  dy={compact ? "4" : "6"}
                  fontSize={compact ? "12" : "18"}
                  className="pointer-events-none select-none"
                >
                  {reg.icon}
                </text>
                {/* Region Text Labels */}
                {!compact && (
                  <text
                    y={32}
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize="11"
                    fontWeight="bold"
                    className="bg-slate-900 px-1 py-0.5 rounded"
                  >
                    {reg.name}
                  </text>
                )}
              </g>
            ))}

            {/* Checkpoint Reward Chests */}
            {checkpoints && checkpoints.map((cp, idx) => {
              // Interpolate chest position along path
              // For simplicity, space chests visually along the path based on distance ratio
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

              return (
                <g
                  key={cp.id}
                  transform={`translate(${cpX}, ${cpY - (compact ? 16 : 24)})`}
                  className="cursor-pointer"
                  onClick={() => setSelectedCheckpoint(cp)}
                >
                  {/* Glowing background for claimable chests */}
                  {cp.unlocked && !cp.claimed && (
                    <motion.circle
                      r={compact ? 16 : 24}
                      fill="#F59E0B"
                      opacity={0.3}
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                  )}

                  <circle
                    r={compact ? 12 : 18}
                    fill={cp.claimed ? "#1E293B" : cp.unlocked ? "#D97706" : "#0F172A"}
                    stroke={cp.unlocked ? "#F59E0B" : "#334155"}
                    strokeWidth={2}
                    className="shadow-lg"
                  />

                  {/* Icon */}
                  <g transform={`translate(-8, -8) scale(${compact ? 0.8 : 1})`}>
                    {cp.claimed ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : cp.unlocked ? (
                      <Gift className="w-4 h-4 text-slate-950 animate-bounce" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-500" />
                    )}
                  </g>

                  {/* Tooltip on hover/click */}
                  {!compact && (
                    <text
                      y={-24}
                      textAnchor="middle"
                      fill="#FBBF24"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      {Math.round(cp.target_distance / 1000)}km
                    </text>
                  )}
                </g>
              );
            })}

            {/* Avatar Marker representing user current spot */}
            <g transform={`translate(${avatarPos.x}, ${avatarPos.y})`} className="pointer-events-none">
              {/* Outer pulsing ring */}
              <motion.circle
                r={compact ? 18 : 28}
                fill="none"
                stroke="#F59E0B"
                strokeWidth={3}
                animate={{ scale: [1, 1.25, 1], opacity: [0.9, 0.4, 0.9] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
              <circle
                r={compact ? 12 : 18}
                fill="#FBBF24"
                className="shadow-xl shadow-amber-500/50"
              />
              {/* Avatar face/initials or Pin icon */}
              <g transform="translate(-10, -10)">
                <MapPin className="w-5 h-5 text-slate-950 fill-slate-900" />
              </g>
            </g>
          </svg>
        </div>
      </div>

      {/* Checkpoint Reward Modal / Bottom Sheet Drawer */}
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
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative"
            >
              {/* Decorative light rays */}
              <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent rounded-3xl pointer-events-none" />

              <div className="text-center relative">
                <div className="mx-auto w-20 h-20 bg-gradient-to-tr from-amber-500 to-yellow-300 rounded-3xl flex items-center justify-center shadow-xl shadow-amber-500/20 mb-4 animate-pulse">
                  {selectedCheckpoint.claimed ? (
                    <Check className="w-10 h-10 text-slate-950" />
                  ) : (
                    <Gift className="w-10 h-10 text-slate-950" />
                  )}
                </div>

                <h4 className="text-2xl font-black text-slate-100">{selectedCheckpoint.name}</h4>
                <p className="text-sm text-slate-400 mt-1">
                  Miyos masofasi: <span className="text-amber-400 font-bold">{Math.round(selectedCheckpoint.target_distance / 1000)} km</span>
                </p>

                <div className="bg-slate-950/50 rounded-2xl p-4 my-5 border border-slate-800/80 text-left">
                  <span className="text-xs uppercase text-slate-500 font-bold block mb-1">Sovg'a turi</span>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 font-bold">
                      {selectedCheckpoint.reward_type}
                    </div>
                    <span className="text-sm text-slate-300 font-semibold">
                      {selectedCheckpoint.reward_type === "COIN_BOX" ? `${selectedCheckpoint.reward_value} Tillar` 
                       : selectedCheckpoint.reward_type === "XP_BOOST" ? `${selectedCheckpoint.reward_value} XP ballari`
                       : `Maxsus Mukofot`}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setSelectedCheckpoint(null)}
                    className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl transition"
                  >
                    Yopish
                  </button>
                  {selectedCheckpoint.unlocked && !selectedCheckpoint.claimed && (
                    <button
                      onClick={handleClaim}
                      disabled={claiming}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-black rounded-2xl shadow-lg transition disabled:opacity-50"
                    >
                      {claiming ? "Yuklanmoqda..." : "Mukofotni Ol"}
                    </button>
                  )}
                  {!selectedCheckpoint.unlocked && (
                    <button
                      disabled
                      className="flex-1 py-3 px-4 bg-slate-800 text-slate-500 font-bold rounded-2xl flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" /> Locked
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
