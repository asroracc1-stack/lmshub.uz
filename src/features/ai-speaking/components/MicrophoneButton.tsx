import { motion } from "framer-motion";
import { Mic, MicOff, Loader2, Sparkles, Volume2 } from "lucide-react";
import { AvatarState } from "../types";
import { cn } from "@/lib/utils";

interface MicrophoneButtonProps {
  state: AvatarState;
  isMuted: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  waveformLevels: number[];
}

export default function MicrophoneButton({
  state,
  isMuted,
  onStartListening,
  onStopListening,
  waveformLevels,
}: MicrophoneButtonProps) {
  const isDisabled = state === "disconnected" || isMuted;

  // Concentric ripple waveforms for 'Listening' state
  const RippleWaves = () => (
    <>
      <motion.div
        animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
        className="absolute inset-0 rounded-full bg-purple-500/20"
      />
      <motion.div
        animate={{ scale: [1, 1.7], opacity: [0.8, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeOut", delay: 0.6 }}
        className="absolute inset-0 rounded-full bg-pink-500/15"
      />
    </>
  );

  return (
    <div className="flex flex-col items-center gap-4 relative select-none">
      
      {/* Equalizer Waveform levels overlay (only active when Listening or Speaking) */}
      <div className="h-10 flex items-center justify-center gap-1.5 w-full max-w-[280px]">
        {(state === "listening" || state === "speaking" || state === "happy") ? (
          waveformLevels.map((level, idx) => (
            <motion.div
              key={idx}
              animate={{ height: `${level}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className={cn(
                "w-1 rounded-full",
                state === "listening" 
                  ? "bg-gradient-to-t from-purple-500 to-pink-500" 
                  : "bg-gradient-to-t from-blue-500 to-cyan-400"
              )}
              style={{ minHeight: "6px" }}
            />
          ))
        ) : (
          <p className="text-[11px] font-bold tracking-widest text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5">
            {state === "thinking" ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                <span>AI is thinking...</span>
              </>
            ) : isMuted ? (
              <span>Microphone Muted</span>
            ) : (
              <span>Hold Button to Speak</span>
            )}
          </p>
        )}
      </div>

      {/* Button Wrapper with ripples */}
      <div className="relative">
        
        {state === "listening" && <RippleWaves />}

        <motion.button
          onMouseDown={onStartListening}
          onMouseUp={onStopListening}
          onMouseLeave={onStopListening}
          onTouchStart={(e) => { e.preventDefault(); onStartListening(); }}
          onTouchEnd={(e) => { e.preventDefault(); onStopListening(); }}
          whileHover={!isDisabled ? { scale: 1.05 } : {}}
          whileTap={!isDisabled ? { scale: 0.95 } : {}}
          className={cn(
            "relative h-20 w-20 md:h-24 md:w-24 rounded-full flex items-center justify-center border transition-all duration-300 shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20",
            isDisabled 
              ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed"
              : state === "listening"
                ? "bg-gradient-to-tr from-purple-600 to-pink-500 border-purple-500 text-white shadow-purple-500/35"
                : state === "thinking"
                  ? "bg-white dark:bg-slate-900 border-indigo-500 text-indigo-500 shadow-indigo-500/10"
                  : state === "speaking" || state === "happy"
                    ? "bg-gradient-to-tr from-blue-600 to-cyan-500 border-blue-500 text-white shadow-blue-500/30"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-blue-500/5"
          )}
          aria-label={isMuted ? "Microphone muted" : "Start speaking voice button"}
          disabled={isDisabled}
        >
          {state === "thinking" ? (
            <Loader2 className="w-8 h-8 md:w-10 md:h-10 animate-spin" />
          ) : isMuted ? (
            <MicOff className="w-8 h-8 md:w-10 md:h-10" />
          ) : state === "speaking" || state === "happy" ? (
            <Volume2 className="w-8 h-8 md:w-10 md:h-10 animate-bounce" />
          ) : (
            <Mic className="w-8 h-8 md:w-10 md:h-10" />
          )}
        </motion.button>
      </div>

      {/* Connection State Badge */}
      <span className={cn(
        "text-[10px] font-black uppercase tracking-widest",
        state === "listening" && "text-purple-500 animate-pulse",
        state === "thinking" && "text-indigo-500 animate-pulse",
        state === "speaking" && "text-blue-500 animate-bounce",
        isMuted && "text-rose-500",
        state === "idle" && "text-slate-400"
      )}>
        {state === "listening" && "Listening..."}
        {state === "thinking" && "Processing..."}
        {state === "speaking" && "AI Speaking..."}
        {isMuted && "Muted"}
        {state === "idle" && "Tap & Hold"}
      </span>
    </div>
  );
}
