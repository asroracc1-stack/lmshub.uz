import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Eye, EyeOff, X, Calendar, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { uz } from "date-fns/locale";
import TigerPlayer from "./TigerPlayer";
import { toast } from "sonner";

export default function SmartClock() {
  const [time, setTime] = useState(new Date());
  const [isVisible, setIsVisible] = useState(() => {
    const saved = localStorage.getItem("smart-clock-settings");
    if (!saved) return false;
    return JSON.parse(saved).visible;
  });
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem("smart-clock-settings");
    if (!saved) return false;
    return !JSON.parse(saved).sound; // sound true means NOT muted
  });
  const [showTigerHide, setShowTigerHide] = useState(false);
  const audioContext = useRef<AudioContext | null>(null);

  useEffect(() => {
    const handleSync = () => {
      const saved = localStorage.getItem("smart-clock-settings");
      if (saved) {
        const settings = JSON.parse(saved);
        setIsVisible(settings.visible);
        setIsMuted(!settings.sound);
      }
    };
    window.addEventListener("storage", handleSync);
    return () => window.removeEventListener("storage", handleSync);
  }, []);

  // Initialize Audio Context on first interaction
  const initAudio = () => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playTick = () => {
    if (isMuted || !audioContext.current) return;
    
    // Check if any modal is open - quick way to detect shadcn/radix modals
    if (document.querySelector('[role="dialog"]')) return;

    const ctx = audioContext.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now);
      playTick();
    }, 1000);
    return () => clearInterval(timer);
  }, [isMuted]);

  const toggleVisibility = () => {
    initAudio();
    const newVisible = !isVisible;
    if (isVisible) {
      setShowTigerHide(true);
      setIsVisible(false);
      const settings = { visible: false, sound: !isMuted };
      localStorage.setItem("smart-clock-settings", JSON.stringify(settings));
      window.dispatchEvent(new Event("storage"));
      
      toast.info("Soat berkitildi", {
        className: "mt-20 bg-purple-500/20 backdrop-blur-md border-purple-500/30 text-purple-700 dark:text-purple-300 font-bold",
        duration: 2000,
      });
      setTimeout(() => {
        setShowTigerHide(false);
      }, 1500);
    } else {
      setIsVisible(true);
      const settings = { visible: true, sound: !isMuted };
      localStorage.setItem("smart-clock-settings", JSON.stringify(settings));
      window.dispatchEvent(new Event("storage"));
      toast.success("Soat ko'rsatildi", {
        className: "mt-20 bg-purple-500/20 backdrop-blur-md border-purple-500/30 text-purple-700 dark:text-purple-300 font-bold",
      });
    }
  };

  const toggleMute = () => {
    initAudio();
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    const settings = { visible: isVisible, sound: !newMuted };
    localStorage.setItem("smart-clock-settings", JSON.stringify(settings));
    window.dispatchEvent(new Event("storage"));
    
    if (newMuted) {
      toast.info("Ovoz o'chirildi (Shshsh... 🐯)", {
        className: "mt-20 bg-slate-900/80 backdrop-blur-md border-white/10 text-white font-bold",
      });
    } else {
      toast.success("Ovoz yoqildi (Eshityapman! 🐯)", {
        className: "mt-20 bg-purple-500/20 backdrop-blur-md border-purple-500/30 text-purple-700 dark:text-purple-300 font-bold",
      });
    }
  };

  const seconds = time.getSeconds();
  const minutes = time.getMinutes();
  const hours = time.getHours();

  const secondDegrees = (seconds / 60) * 360;
  const minuteDegrees = ((minutes + seconds / 60) / 60) * 360;
  const hourDegrees = (((hours % 12) + minutes / 60) / 12) * 360;

  return (
    <div className="flex items-center gap-3">
      <AnimatePresence mode="wait">
        {isVisible ? (
          <motion.div
            key="clock-main"
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className={cn(
              "relative flex items-center gap-4 px-4 py-2 rounded-2xl",
              "bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-100 dark:border-white/10",
              "shadow-[0_8px_32px_0_rgba(139,92,246,0.1)] hover:shadow-[0_8px_32px_0_rgba(139,92,246,0.2)] transition-shadow duration-500"
            )}
          >
            {/* Purple Glow Background */}
            <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl -z-10 animate-pulse" />

            {/* Analog Clock Mini */}
            <div className="relative w-10 h-10 rounded-full border-2 border-primary/30 flex items-center justify-center bg-slate-50 dark:bg-white/5 overflow-hidden shadow-inner">
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div className="absolute w-0.5 h-3 bg-slate-800 dark:bg-white rounded-full origin-bottom" style={{ rotate: hourDegrees, bottom: "50%" }} />
                <motion.div className="absolute w-0.5 h-4 bg-slate-500 dark:bg-slate-400 rounded-full origin-bottom" style={{ rotate: minuteDegrees, bottom: "50%" }} />
                <motion.div className="absolute w-px h-4 bg-primary rounded-full origin-bottom" style={{ rotate: secondDegrees, bottom: "50%" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-primary z-10 shadow-glow shadow-primary/40" />
              </div>
            </div>

            {/* Digital Clock & Date */}
            <div className="flex flex-col min-w-[100px]">
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
                  {format(time, "HH:mm")}
                </span>
                <span className="text-[10px] font-bold text-primary tabular-nums animate-pulse">
                  :{format(time, "ss")}
                </span>
              </div>
              <p className="text-[9px] uppercase font-black tracking-widest text-slate-400">
                {format(time, "d-MMMM, EEEE", { locale: uz })}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 border-l border-slate-200 dark:border-white/10 pl-2">
              <button 
                onClick={toggleMute}
                className="p-1.5 rounded-lg hover:bg-primary/10 text-slate-400 hover:text-primary transition-all duration-300"
                title={isMuted ? "Ovozni yoqish" : "Ovozni o'chirish"}
              >
                {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </button>
              <button 
                onClick={toggleVisibility}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all duration-300"
                title="Yashirish"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="clock-open"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={toggleVisibility}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-primary transition-all border border-transparent hover:border-primary/20"
            title="Soatni ko'rsatish"
          >
            <Clock className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Tiger Hide Animation Overlay */}
      <AnimatePresence>
        {showTigerHide && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-10 right-10 z-[100] pointer-events-none"
          >
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl p-6 rounded-[2.5rem] shadow-2xl border border-primary/20 flex items-center gap-4">
              <div className="scale-75 -m-10">
                <TigerPlayer text="" size={200} />
              </div>
              <div className="pr-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Sekret Service 🐯</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{isMuted ? "Shshsh... 🤫" : "Soatni berkitib qo'yapman..."}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
