import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const languages = [
  { 
    code: "en", 
    label: "English", 
    short: "EN",
    flag: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" className="w-full h-full object-cover">
        <rect width="640" height="480" fill="#3c3b6e"/>
        <path fill="#fff" d="M0 37h640v37H0zM0 111h640v37H0zM0 185h640v37H0zM0 258h640v37H0zM0 332h640v37H0zM0 406h640v37H0z"/>
        <path fill="#b22234" d="M0 0h640v37H0zM0 74h640v37H0zM0 148h640v37H0zM0 222h640v37H0zM0 295h640v37H0zM0 369h640v37H0zM0 443h640v37H0z"/>
        <rect width="256" height="258" fill="#3c3b6e"/>
        <g fill="#fff">
          <circle cx="25" cy="30" r="3"/><circle cx="55" cy="30" r="3"/><circle cx="85" cy="30" r="3"/><circle cx="115" cy="30" r="3"/><circle cx="145" cy="30" r="3"/>
          <circle cx="40" cy="50" r="3"/><circle cx="70" cy="50" r="3"/><circle cx="100" cy="50" r="3"/><circle cx="130" cy="50" r="3"/>
          <circle cx="25" cy="70" r="3"/><circle cx="55" cy="70" r="3"/><circle cx="85" cy="70" r="3"/><circle cx="115" cy="70" r="3"/><circle cx="145" cy="70" r="3"/>
          <circle cx="40" cy="90" r="3"/><circle cx="70" cy="90" r="3"/><circle cx="100" cy="90" r="3"/><circle cx="130" cy="90" r="3"/>
          <circle cx="25" cy="110" r="3"/><circle cx="55" cy="110" r="3"/><circle cx="85" cy="110" r="3"/><circle cx="115" cy="110" r="3"/><circle cx="145" cy="110" r="3"/>
        </g>
      </svg>
    )
  },
  { 
    code: "uz", 
    label: "O'zbekcha", 
    short: "UZ",
    flag: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 250" className="w-full h-full object-cover">
        <rect width="500" height="250" fill="#fff"/>
        <rect width="500" height="82" fill="#0099b5"/>
        <rect width="500" height="82" y="168" fill="#1eb53a"/>
        <rect width="500" height="6" y="82" fill="#ce1126"/>
        <rect width="500" height="6" y="162" fill="#ce1126"/>
        <circle cx="70" cy="42" r="30" fill="#fff"/>
        <circle cx="82" cy="42" r="30" fill="#0099b5"/>
        <g fill="#fff">
          <circle cx="126" cy="20" r="3"/><circle cx="146" cy="20" r="3"/><circle cx="166" cy="20" r="3"/>
          <circle cx="126" cy="42" r="3"/><circle cx="146" cy="42" r="3"/><circle cx="166" cy="42" r="3"/>
          <circle cx="126" cy="64" r="3"/><circle cx="146" cy="64" r="3"/><circle cx="166" cy="64" r="3"/>
          <circle cx="110" cy="31" r="3"/><circle cx="110" cy="53" r="3"/>
          <circle cx="126" cy="42" r="3"/>
        </g>
      </svg>
    )
  },
  { 
    code: "ru", 
    label: "Русский", 
    short: "RU",
    flag: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" className="w-full h-full object-cover">
        <rect width="900" height="600" fill="#fff"/>
        <rect width="900" height="400" y="200" fill="#d52b1e"/>
        <rect width="900" height="200" y="200" fill="#0039a6"/>
      </svg>
    )
  },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentLang = languages.find((l) => l.code === i18n.language.split('-')[0]) || languages[0];

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem("userLanguageLocked", "true");
    setIsOpen(false);
    // Dispatch a custom event to notify other components to stop rotation
    window.dispatchEvent(new CustomEvent("languageManualSelect"));
  };

  const onMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const onMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  return (
    <div 
      className="relative" 
      ref={dropdownRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        className={cn(
          "flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1.5 rounded-full transition-all duration-300 border",
          "bg-white/80 backdrop-blur-md border-slate-200/50 hover:bg-white hover:border-purple-200 shadow-sm",
          "dark:bg-slate-900/50 dark:border-slate-800 dark:hover:border-purple-500/50",
          isOpen && "ring-2 ring-purple-500/20 border-purple-500/50"
        )}
      >
        <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-200 shadow-sm shrink-0">
          {currentLang.flag}
        </div>
        <span className="text-[12px] font-black tracking-wider text-slate-700 dark:text-slate-200 uppercase hidden sm:block">
          {currentLang.short}
        </span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform duration-500 hidden xs:block", isOpen && "rotate-180 text-purple-500")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 mt-2 w-48 bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden z-[100] dark:bg-slate-950/90 dark:border-slate-800"
          >
            <div className="p-1.5">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden",
                    i18n.language.startsWith(lang.code)
                      ? "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400" 
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900"
                  )}
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200/50 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    {lang.flag}
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[13px] font-bold tracking-tight">{lang.label}</span>
                    <span className="text-[10px] opacity-50 uppercase font-mono">{lang.code}</span>
                  </div>
                  
                  {i18n.language.startsWith(lang.code) && (
                    <motion.div 
                      layoutId="active-indicator"
                      className="absolute right-3 w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
