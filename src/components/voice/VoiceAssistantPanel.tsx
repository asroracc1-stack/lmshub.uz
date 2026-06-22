import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mic, MicOff, Palette, Sun, Moon, HelpCircle, Terminal } from "lucide-react";
import { useVoiceAssistant } from "@/hooks/useVoiceAssistant";
import { VoiceWaveAnimation } from "./VoiceWaveAnimation";
import { VoiceCommandHistory } from "./VoiceCommandHistory";
import { ACCENT_COLORS } from "@/utils/voiceCommands";
import { useTheme } from "@/contexts/ThemeContext";

const SUGGESTIONS = [
  { group: "Mavzular (Theme)", items: ["dark mode", "light mode", "qorong'i rejim", "yorug' rejim"] },
  { group: "Ranglar (Accent Color)", items: ["red (qizil)", "blue (ko'k)", "green (yashil)", "pink (pushti)", "indigo"] },
  { group: "Navigatsiya (Routes)", items: ["dashboard", "kutubxona (library)", "sat", "milliy sertifikat", "profil (profile)", "sozlamalar"] },
  { group: "Qidiruv (Search)", items: ["search physics", "qidiring matematika"] },
  { group: "Tizim Amallari (System)", items: ["logout (chiqish)", "refresh page", "go back", "hello lmshub"] },
];

export const VoiceAssistantPanel: React.FC = () => {
  const {
    isListening,
    status,
    lastRecognizedText,
    commandHistory,
    currentAccentColor,
    isPanelOpen,
    setPanelOpen,
    startListening,
    stopListening,
    clearHistory,
    executeVoiceCommand,
  } = useVoiceAssistant();

  const [manualCommand, setManualCommand] = useState("");

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCommand.trim()) {
      executeVoiceCommand(manualCommand.trim());
      setManualCommand("");
    }
  };

  const { theme } = useTheme();

  const getStatusLabel = () => {
    switch (status) {
      case "listening":
        return "🎙️ Tinglanmoqda...";
      case "processing":
        return "⚡ Buyruq tahlil qilinmoqda...";
      case "success":
        return "✅ Buyruq bajarildi";
      case "error":
        return "❌ Buyruq tushunilmadi";
      default:
        return "🎤 Kutish rejimida";
    }
  };

  return (
    <AnimatePresence>
      {isPanelOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={() => setPanelOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
          />

          {/* Panel content */}
          <motion.div
            initial={{ x: "100%", opacity: 0.9 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed right-0 top-0 z-50 h-full w-[380px] max-w-full flex flex-col shadow-2xl border-l select-none
              ${theme === "dark" 
                ? "bg-[#110A21]/90 border-[#2E1E52] text-slate-100" 
                : "bg-white/90 border-[#E8DDFB] text-slate-800"
              } backdrop-blur-xl`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-muted/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight">Voice Assistant</h3>
                  <p className="text-[10px] font-mono text-muted-foreground">LMSHub AI Core</p>
                </div>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto thin-scrollbar p-5 space-y-6">
              
              {/* Mic State Visualizer Card */}
              <div className="p-5 rounded-2xl border border-muted/40 bg-muted/10 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-inner">
                {/* Background glow effects */}
                <div className={`absolute -top-10 -left-10 w-24 h-24 rounded-full blur-[40px] opacity-20
                  ${status === "listening" ? "bg-purple-500" : status === "processing" ? "bg-amber-500" : "bg-blue-500"}`}
                />
                
                <span className="text-xs font-bold px-3 py-1 rounded-full border border-muted/50 bg-background/50 text-muted-foreground mb-4">
                  {getStatusLabel()}
                </span>

                <div className="relative mb-4">
                  <button
                    onClick={isListening ? stopListening : startListening}
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-300 relative cursor-pointer
                      ${isListening 
                        ? "bg-gradient-to-r from-red-500 to-pink-500 hover:scale-105 animate-pulse" 
                        : "bg-gradient-to-r from-purple-500 to-indigo-500 hover:scale-105 hover:shadow-purple-500/20"
                      }`}
                  >
                    {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>
                </div>

                <VoiceWaveAnimation status={status} />

                {lastRecognizedText && (
                  <div className="mt-3 w-full">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">Eshitildi:</p>
                    <p className="text-sm font-semibold italic text-slate-700 dark:text-slate-300 px-4 py-2 bg-background/40 border border-muted/20 rounded-xl">
                      "{lastRecognizedText}"
                    </p>
                  </div>
                )}

                {/* Manual Command Input Fallback */}
                <div className="mt-4 pt-4 border-t border-muted/20 w-full">
                  <form onSubmit={handleManualSubmit} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Yoki buyruqni bu yerga yozing..."
                      value={manualCommand}
                      onChange={(e) => setManualCommand(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-muted/30 bg-background/60 dark:bg-slate-900/60 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-slate-800 dark:text-slate-100"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl transition-all shadow-sm cursor-pointer active:scale-95"
                    >
                      OK
                    </button>
                  </form>
                </div>
              </div>

              {/* Status Settings Badge */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-muted/30 bg-muted/5 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Palette className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-semibold">Accent Color</span>
                  </div>
                  <span className="text-xs font-bold capitalize flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full inline-block border border-black/10" 
                      style={{ backgroundColor: ACCENT_COLORS[currentAccentColor]?.hex || "#8B5CF6" }}
                    />
                    {currentAccentColor}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-muted/30 bg-muted/5 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    {theme === "dark" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                    <span className="text-[11px] font-semibold">Theme Mode</span>
                  </div>
                  <span className="text-xs font-bold capitalize">{theme} Mode</span>
                </div>
              </div>

              {/* Keyboard Shortcut Info */}
              <div className="p-3 rounded-xl border border-muted/20 bg-muted/5 flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Tezkor tugma:</span>
                <kbd className="px-2 py-0.5 rounded border border-muted/60 bg-background/80 font-mono font-bold text-[10px]">
                  Ctrl + Shift + V
                </kbd>
              </div>

              {/* History Section */}
              <VoiceCommandHistory history={commandHistory} onClear={clearHistory} />

              {/* Suggestions Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mavjud Buyruqlar</h4>
                </div>

                <div className="space-y-2.5">
                  {SUGGESTIONS.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-1">
                      <span className="text-[10px] font-mono font-bold text-muted-foreground/80">{group.group}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {group.items.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-background/50 border border-muted/30 hover:border-primary/40 cursor-default transition-all"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-muted/30 text-center flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground font-mono">
              <Terminal className="w-3.5 h-3.5" />
              LMSHub Enterprise Voice Assistant v1.0
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default VoiceAssistantPanel;
