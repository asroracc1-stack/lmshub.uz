import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { parseVoiceCommand, ACCENT_COLORS, CommandMatch } from "@/utils/voiceCommands";
import { speechRecognitionService } from "@/utils/speechRecognition";
import { speechSynthesisService } from "@/utils/speechSynthesis";

export interface CommandHistoryItem {
  id: string;
  text: string;
  timestamp: string;
  status: "success" | "error";
  type?: string;
}

interface VoiceAssistantContextType {
  isListening: boolean;
  status: "idle" | "listening" | "processing" | "success" | "error";
  lastRecognizedText: string;
  commandHistory: CommandHistoryItem[];
  currentAccentColor: string;
  isPanelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  startListening: () => void;
  stopListening: () => void;
  clearHistory: () => void;
  executeVoiceCommand: (text: string) => void;
}

const VoiceAssistantContext = createContext<VoiceAssistantContextType | undefined>(undefined);

const HISTORY_KEY = "lmshub.voice_history";
const ACCENT_KEY = "accentColor";

export const VoiceAssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { setTheme } = useTheme();

  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "success" | "error">("idle");
  const [lastRecognizedText, setLastRecognizedText] = useState("");
  const [isPanelOpen, setPanelOpen] = useState(false);
  const [currentAccentColor, setCurrentAccentColor] = useState(() => {
    return localStorage.getItem("accentColor") || "purple";
  });

  const [commandHistory, setCommandHistory] = useState<CommandHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Apply accent color variable on root
  const applyAccentColor = useCallback((colorName: string) => {
    const colorObj = ACCENT_COLORS[colorName];
    if (colorObj) {
      document.documentElement.style.setProperty("--primary", colorObj.hex);
      document.documentElement.style.setProperty("--primary-light", colorObj.light);
      document.documentElement.style.setProperty("--primary-dark", colorObj.dark);
      document.documentElement.style.setProperty("--primary-glow", colorObj.glow);
      document.documentElement.style.setProperty("--primary-border", colorObj.border);
      document.documentElement.style.setProperty("--primary-muted", colorObj.muted);
      document.documentElement.style.setProperty("--primary-hsl", colorObj.hsl);
      document.documentElement.style.setProperty("--ring", colorObj.hsl);
      localStorage.setItem("accentColor", colorName);
      setCurrentAccentColor(colorName);
    }
  }, []);

  // Initialize accent color on load
  useEffect(() => {
    if (currentAccentColor) {
      applyAccentColor(currentAccentColor);
    }
  }, [currentAccentColor, applyAccentColor]);

  const addHistoryItem = useCallback((text: string, isSuccess: boolean, type?: string) => {
    const newItem: CommandHistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      status: isSuccess ? "success" : "error",
      type,
    };
    setCommandHistory((prev) => {
      const updated = [newItem, ...prev].slice(0, 20);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setCommandHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  // Execute parsed command match
  const handleCommandMatch = useCallback((match: CommandMatch, text: string) => {
    setStatus("success");
    addHistoryItem(text, true, match.type);

    // Voice Feedback
    speechSynthesisService.speak(match.speechResponse, match.lang);
    toast.success(match.toastMsg);

    // Execute actions
    switch (match.type) {
      case "theme":
        setTheme(match.action as "light" | "dark");
        break;
      case "color":
        if (match.payload) {
          applyAccentColor(match.payload);
        }
        break;
      case "navigation":
      case "ai":
        if (match.payload) {
          navigate(match.payload);
        }
        break;
      case "search":
        if (match.payload) {
          window.dispatchEvent(new CustomEvent("global-search-query", { detail: match.payload }));
        }
        break;
      case "system":
        if (match.action === "refresh") {
          setTimeout(() => window.location.reload(), 1500);
        } else if (match.action === "go-back") {
          navigate(-1);
        } else if (match.action === "logout") {
          // Open global command palette logout or dispatch event
          window.dispatchEvent(new Event("open-global-search"));
        }
        break;
      case "help":
        setPanelOpen(true);
        break;
      default:
        break;
    }
  }, [addHistoryItem, navigate, setTheme, applyAccentColor]);

  const executeVoiceCommand = useCallback((text: string) => {
    if (!text.trim()) return;

    setLastRecognizedText(text);
    setStatus("processing");

    const match = parseVoiceCommand(text, role || "student");

    if (match) {
      setTimeout(() => {
        handleCommandMatch(match, text);
      }, 600);
    } else {
      setTimeout(() => {
        setStatus("error");
        addHistoryItem(text, false);
        const errMsgUz = "Kechirasiz, buyruq tushunilmadi.";
        const errMsgEn = "Sorry, I couldn't understand that command.";
        const isUzbek = /rejim|tungi|yorug|kunduzgi|yarat|chiq|sertifikat|yordam|salom|kutubxona|sozlamalar/i.test(text);

        speechSynthesisService.speak(isUzbek ? errMsgUz : errMsgEn, isUzbek ? "uz-UZ" : "en-US");
        toast.error(isUzbek ? "❌ Buyruq aniqlanmadi" : "❌ Command not recognized");
      }, 600);
    }
  }, [role, handleCommandMatch, addHistoryItem]);

  const startListening = useCallback(() => {
    setPanelOpen(true);

    if (!speechRecognitionService.isSupported()) {
      setStatus("error");
      toast.info("Ovozli buyruqlar ushbu brauzerda qo'llab-quvvatlanmaydi. Buyruqni matn orqali yozishingiz mumkin.");
      setTimeout(() => {
        const inputEl = document.querySelector('input[placeholder*="bu yerga yozing"]') as HTMLInputElement;
        if (inputEl) inputEl.focus();
      }, 300);
      return;
    }

    speechRecognitionService.start({
      lang: localStorage.getItem("i18nextLng") === "uz" ? "uz-UZ" : "en-US",
      onStart: () => {
        setIsListening(true);
        setStatus("listening");
      },
      onResult: (transcript) => {
        executeVoiceCommand(transcript);
      },
      onError: (err) => {
        console.error("Speech Recognition Error:", err);
        setIsListening(false);
        setStatus("error");
        
        const isUz = localStorage.getItem("i18nextLng") === "uz" || true; // Fallback to uz
        if (err === "not-allowed") {
          toast.error(isUz 
            ? "❌ Mikrofon ruxsati rad etildi. Sozlamalardan brauzerga mikrofon ruxsatini bering." 
            : "❌ Microphone access denied. Please allow microphone permission in settings."
          );
        } else if (err === "no-speech") {
          toast.error(isUz 
            ? "❌ Ovoz aniqlanmadi. Iltimos, qayta urinib ko'ring." 
            : "❌ No speech detected. Please try again."
          );
        } else if (err === "network") {
          toast.error(isUz 
            ? "❌ Tarmoq xatoligi. Internet ulanishini tekshiring." 
            : "❌ Network error. Please check your internet connection."
          );
        } else if (err === "service-not-allowed") {
          toast.error(isUz
            ? "❌ Ovozli buyruqlar ushbu brauzerda qo'llab-quvvatlanmaydi. Matn orqali yozing."
            : "❌ Voice service restricted on this browser. Please type commands."
          );
          setTimeout(() => {
            const inputEl = document.querySelector('input[placeholder*="bu yerga yozing"]') as HTMLInputElement;
            if (inputEl) inputEl.focus();
          }, 300);
        } else {
          toast.error(isUz 
            ? `❌ Ovozli yordamchi xatosi: ${err}` 
            : `❌ Voice assistant error: ${err}`
          );
        }
      },
      onEnd: () => {
        setIsListening(false);
      },
    });
  }, [executeVoiceCommand]);

  const stopListening = useCallback(() => {
    speechRecognitionService.stop();
    setIsListening(false);
    setStatus("idle");
  }, []);

  // Keyboard shortcut Ctrl + Shift + V
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "V" || e.key === "v")) {
        e.preventDefault();
        startListening();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startListening]);

  return (
    <VoiceAssistantContext.Provider
      value={{
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
      }}
    >
      {children}
    </VoiceAssistantContext.Provider>
  );
};

export const useVoiceAssistantContext = () => {
  const context = useContext(VoiceAssistantContext);
  if (!context) {
    throw new Error("useVoiceAssistantContext must be used within a VoiceAssistantProvider");
  }
  return context;
};
