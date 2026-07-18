import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Star, Play, Check } from 'lucide-react';
import { UnitProgress } from '../types/vocabulary';
import { cn } from '@/lib/utils';

interface RoadmapNodeProps {
  unit: UnitProgress;
  isActive: boolean;
  onSelect: (unitNum: number) => void;
  xOffset: number; // percentage left offset (e.g. -25 to +25)
}

export const RoadmapNode: React.FC<RoadmapNodeProps> = ({
  unit,
  isActive,
  onSelect,
  xOffset
}) => {
  const isCompleted = unit.stageCompleted === 3;
  const isLocked = !unit.isUnlocked;

  // Format countdown timer (e.g. remainingSeconds -> hh:mm:ss)
  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '00:00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;
  };

  return (
    <div 
      className="relative flex flex-col items-center justify-center my-6"
      style={{ transform: `translateX(${xOffset}px)` }}
    >
      {/* Node Circle */}
      <motion.div
        whileHover={!isLocked ? { scale: 1.1, y: -4 } : {}}
        whileTap={!isLocked ? { scale: 0.95 } : {}}
        onClick={() => !isLocked && onSelect(unit.unit)}
        className={cn(
          "relative h-20 w-20 rounded-full flex items-center justify-center cursor-pointer shadow-2xl transition-all duration-500",
          isLocked
            ? "bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed shadow-none"
            : isCompleted
            ? "bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-emerald-500/20 border-2 border-emerald-400"
            : isActive
            ? "bg-gradient-to-tr from-amber-500 to-orange-400 text-white shadow-amber-500/30 border-2 border-amber-300 scale-105"
            : "bg-slate-700/80 backdrop-blur-md border border-white/10 text-slate-200 hover:border-emerald-400/40"
        )}
      >
        {/* Unit Completion Indicators */}
        {isCompleted ? (
          <Check className="h-8 w-8 stroke-[3.5]" />
        ) : isLocked ? (
          <Lock className="h-6 w-6" />
        ) : isActive ? (
          <Play className="h-8 w-8 fill-current ml-1 animate-pulse" />
        ) : (
          <span className="text-xl font-black">{unit.unit}</span>
        )}

        {/* Floating Stars reward indicators */}
        {!isLocked && (
          <div className="absolute -top-3 -right-2 flex gap-0.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-4.5 w-4.5 fill-current",
                  unit.stageCompleted > i ? "text-amber-400" : "text-slate-500/60"
                )}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Label and countdown */}
      <div className="text-center mt-3 select-none pointer-events-none">
        <span className="text-xs font-black uppercase tracking-wider text-slate-450 dark:text-slate-450">
          Unit {unit.unit}
        </span>
        
        {isLocked && unit.remainingSeconds > 0 && (
          <div className="mt-1 flex items-center gap-1 justify-center bg-slate-900/80 border border-white/5 py-1 px-2.5 rounded-full backdrop-blur-xl">
            <Lock className="h-3 w-3 text-rose-500" />
            <span className="text-[10px] font-black text-rose-400 tracking-wider font-mono">
              {formatTime(unit.remainingSeconds)}
            </span>
          </div>
        )}

        {!isLocked && !isCompleted && (
          <span className="block text-[10px] font-black text-emerald-500 dark:text-emerald-400 uppercase tracking-widest mt-0.5">
            Stage {unit.stageCompleted + 1}/3
          </span>
        )}
      </div>
    </div>
  );
};
