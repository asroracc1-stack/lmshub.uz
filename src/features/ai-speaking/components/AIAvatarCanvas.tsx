import { motion } from "framer-motion";
import { Cpu, Eye, Lightbulb, Camera, Compass } from "lucide-react";
import { AvatarState } from "../types";
import { cn } from "@/lib/utils";

interface AIAvatarCanvasProps {
  state: AvatarState;
}

export default function AIAvatarCanvas({ state }: AIAvatarCanvasProps) {
  // Visual configuration mapping based on the current AvatarState
  const stateConfig: Record<
    AvatarState,
    {
      color: string;
      glow: string;
      label: string;
      animation: any;
      avatarScale: number;
    }
  > = {
    idle: {
      color: "from-teal-400 to-blue-500",
      glow: "shadow-teal-500/20",
      label: "Ready (Idle)",
      avatarScale: 1.0,
      animation: {
        scale: [1, 1.03, 1],
        rotate: [0, 5, 0],
        transition: { repeat: Infinity, duration: 4, ease: "easeInOut" },
      },
    },
    listening: {
      color: "from-purple-500 via-pink-500 to-red-500",
      glow: "shadow-purple-500/40",
      label: "Listening...",
      avatarScale: 1.08,
      animation: {
        scale: [1, 1.1, 0.98, 1.05, 1],
        transition: { repeat: Infinity, duration: 1.8, ease: "linear" },
      },
    },
    thinking: {
      color: "from-indigo-400 via-blue-500 to-purple-500",
      glow: "shadow-indigo-500/30",
      label: "Thinking...",
      avatarScale: 1.02,
      animation: {
        rotate: [0, 360],
        transition: { repeat: Infinity, duration: 3, ease: "linear" },
      },
    },
    speaking: {
      color: "from-blue-400 via-cyan-400 to-indigo-500",
      glow: "shadow-blue-500/40",
      label: "Speaking...",
      avatarScale: 1.06,
      animation: {
        scale: [1.02, 0.97, 1.05, 1.02],
        transition: { repeat: Infinity, duration: 0.8, ease: "easeInOut" },
      },
    },
    happy: {
      color: "from-yellow-400 via-orange-400 to-amber-500",
      glow: "shadow-amber-500/40",
      label: "Inspired",
      avatarScale: 1.1,
      animation: {
        y: [0, -10, 0],
        scale: [1, 1.08, 1],
        transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" },
      },
    },
    error: {
      color: "from-red-500 to-rose-600",
      glow: "shadow-red-500/35",
      label: "Connection Issue",
      avatarScale: 0.95,
      animation: {
        x: [0, -6, 6, -6, 6, 0],
        transition: { repeat: Infinity, duration: 0.5 },
      },
    },
    disconnected: {
      color: "from-slate-400 to-slate-600",
      glow: "shadow-slate-500/10",
      label: "Offline",
      avatarScale: 0.9,
      animation: {
        opacity: [0.6, 0.8, 0.6],
        transition: { repeat: Infinity, duration: 2 },
      },
    },
  };

  const current = stateConfig[state] || stateConfig.idle;

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-6 bg-slate-900/40 dark:bg-black/20 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/40 rounded-3xl overflow-hidden shadow-xl min-h-[380px] md:min-h-[480px]">
      
      {/* Three.js Environment Metadata Indicator Overlays */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-[10px] font-bold tracking-widest text-slate-450 dark:text-slate-400 uppercase pointer-events-none select-none z-10">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 dark:bg-slate-900/50 border border-slate-200/10 backdrop-blur-sm">
          <Camera className="w-3 h-3 text-blue-500" />
          <span>CAM: FOV 45 | ORBIT</span>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 dark:bg-slate-900/50 border border-slate-200/10 backdrop-blur-sm">
          <Lightbulb className="w-3 h-3 text-amber-500" />
          <span>LIGHTS: AMBIENT + THREE-POINT</span>
        </div>
      </div>

      {/* Simulated 3D Viewport Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      {/* Futuristic Centerpiece: R3F Canvas Container & Simulated GLB Avatar */}
      <div className="flex-1 flex flex-col items-center justify-center relative mt-6">
        
        {/* Glowing Ambient Radial Aura */}
        <div className={cn(
          "absolute w-[240px] h-[240px] md:w-[320px] md:h-[320px] rounded-full blur-[70px] opacity-25 transition-all duration-700",
          state === "idle" && "bg-teal-500",
          state === "listening" && "bg-purple-500",
          state === "thinking" && "bg-indigo-500",
          state === "speaking" && "bg-blue-500",
          state === "happy" && "bg-amber-500",
          state === "error" && "bg-rose-500",
          state === "disconnected" && "bg-slate-500"
        )} />

        {/* Scaled Animation Controller Wrapper */}
        <motion.div
          animate={current.animation}
          style={{ scale: current.avatarScale }}
          className="relative flex items-center justify-center"
        >
          {/* Concentric Rotating Outer Rings */}
          <div className="absolute w-[160px] h-[160px] md:w-[220px] md:h-[220px] rounded-full border border-dashed border-slate-300/20 dark:border-slate-700/30 animate-[spin_20s_linear_infinite]" />
          <div className="absolute w-[200px] h-[200px] md:w-[260px] md:h-[260px] rounded-full border border-dotted border-blue-500/10 dark:border-blue-500/5 animate-[spin_40s_linear_infinite_reverse]" />

          {/* Central Holographic Avatar Core */}
          <div className={cn(
            "w-[100px] h-[100px] md:w-[140px] md:h-[140px] rounded-full bg-gradient-to-tr flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.15)] relative overflow-hidden group border border-white/10",
            current.color,
            current.glow
          )}>
            {/* Ambient inner shimmer */}
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-b from-white/10 to-transparent" />
            <Cpu className="w-12 h-12 md:w-16 md:h-16 text-white/90 drop-shadow-md animate-pulse" />
          </div>
        </motion.div>

        {/* 3D Model Label */}
        <div className="mt-8 text-center space-y-1">
          <p className="text-xs font-bold tracking-widest text-slate-400 uppercase">
            GLB Avatar Model (Placeholder)
          </p>
          <h4 className="text-sm font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-1.5 justify-center">
            <span className={cn(
              "w-2 h-2 rounded-full",
              state === "idle" && "bg-teal-500",
              state === "listening" && "bg-purple-500 animate-ping",
              state === "thinking" && "bg-indigo-500 animate-pulse",
              state === "speaking" && "bg-blue-500 animate-bounce",
              state === "happy" && "bg-amber-500",
              state === "error" && "bg-rose-500 animate-pulse",
              state === "disconnected" && "bg-slate-500"
            )} />
            {current.label}
          </h4>
        </div>
      </div>

      {/* Bottom Technical Calibration Dashboard overlay */}
      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 select-none z-10 border-t border-slate-200/10 pt-4 mt-2">
        <div className="flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-blue-500" />
          <span>GRID AXES: ENABLED</span>
        </div>
        <div className="flex items-center gap-3">
          <span>FPS: 60.0</span>
          <span>LATENCY: 12ms</span>
        </div>
      </div>
    </div>
  );
}
