import React from "react";
import { Mic, Loader2, Check, AlertCircle } from "lucide-react";
import { useVoiceAssistant } from "@/hooks/useVoiceAssistant";
import { cn } from "@/lib/utils";

export const VoiceAssistantButton: React.FC = () => {
  const { isListening, status, startListening, stopListening, setPanelOpen } = useVoiceAssistant();

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const getButtonContent = () => {
    switch (status) {
      case "listening":
        return {
          icon: <Mic className="w-4 h-4 text-white animate-pulse" />,
          text: "Tinglanmoqda...",
          class: "from-red-500 to-pink-600 shadow-rose-500/20 border-red-400/30",
        };
      case "processing":
        return {
          icon: <Loader2 className="w-4 h-4 text-white animate-spin" />,
          text: "Tahlil qilinmoqda...",
          class: "from-amber-500 to-orange-600 shadow-amber-500/20 border-amber-400/30",
        };
      case "success":
        return {
          icon: <Check className="w-4 h-4 text-white" />,
          text: "Bajarildi",
          class: "from-emerald-500 to-teal-600 shadow-emerald-500/20 border-emerald-400/30",
        };
      case "error":
        return {
          icon: <AlertCircle className="w-4 h-4 text-white" />,
          text: "Tushunilmadi",
          class: "from-red-600 to-rose-700 shadow-red-600/20 border-red-500/30",
        };
      default:
        return {
          icon: <Mic className="w-4 h-4 text-white" />,
          text: "Ovozli Yordamchi",
          class: "from-purple-500 to-indigo-600 shadow-purple-500/20 border-purple-400/30 hover:shadow-glow-purple",
        };
    }
  };

  const stateDetails = getButtonContent();

  return (
    <button
      onClick={handleToggle}
      onDoubleClick={() => setPanelOpen(true)}
      title="Ovozli boshqaruv (CTRL + SHIFT + V)"
      className={cn(
        "flex items-center gap-2 h-9 px-3.5 rounded-full border text-xs font-semibold text-white bg-gradient-to-r",
        "shadow-md transition-all duration-300 transform active:scale-95 cursor-pointer backdrop-blur-md select-none",
        stateDetails.class
      )}
    >
      <span className="relative flex h-2 w-2 items-center justify-center">
        {isListening && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
      </span>
      
      {stateDetails.icon}
      
      <span className="hidden md:inline font-bold">
        {stateDetails.text}
      </span>
    </button>
  );
};

export default VoiceAssistantButton;
