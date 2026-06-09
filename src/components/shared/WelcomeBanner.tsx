import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Headphones,
  Trophy,
  BookOpen,
  Star,
  CalendarDays,
  Zap,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

const WATERMARKS = [
  { Icon: Headphones,  top: "8%",  right: "6%",   size: 72, rotate: -15 },
  { Icon: Trophy,      top: "55%", right: "2%",    size: 56, rotate: 10 },
  { Icon: BookOpen,    top: "20%", right: "18%",   size: 64, rotate: 8 },
  { Icon: Star,        top: "60%", right: "22%",   size: 44, rotate: -20 },
  { Icon: CalendarDays,top: "10%", right: "34%",   size: 52, rotate: 12 },
  { Icon: Zap,         top: "70%", right: "38%",   size: 40, rotate: -5 },
];

export default function WelcomeBanner() {
  const { profile } = useAuth();
  const { t } = useTranslation();

  const currentHour = new Date().getHours();

  const greeting = useMemo(() => {
    if (currentHour >= 6 && currentHour < 12) {
      return { 
        text: t("welcomeBanner.greeting.morning"), 
        emoji: "🌅", 
        sub: t("welcomeBanner.sub.morning") 
      };
    } else if (currentHour >= 12 && currentHour < 18) {
      return { 
        text: t("welcomeBanner.greeting.afternoon"), 
        emoji: "☀️", 
        sub: t("welcomeBanner.sub.afternoon") 
      };
    } else {
      return { 
        text: t("welcomeBanner.greeting.evening"), 
        emoji: "🌙", 
        sub: t("welcomeBanner.sub.evening") 
      };
    }
  }, [currentHour, t]);

  const displayName = useMemo(() => {
    if (!profile) return t("welcomeBanner.defaultName");
    const full = profile.full_name?.trim();
    if (full) return full.split(" ")[0]; // only first name
    return profile.username || t("welcomeBanner.defaultName");
  }, [profile, t]);

  const motivation = useMemo(() => {
    const index = new Date().getDay() % 4;
    return t(`welcomeBanner.motivations.${index}`);
  }, [t]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-2xl shadow-emerald-500/30"
    >
      {/* Subtle inner glow ring */}
      <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/20 pointer-events-none" />

      {/* Watermark background icons */}
      <div className="absolute inset-0 pointer-events-none z-0" aria-hidden>
        {WATERMARKS.map(({ Icon, top, right, size, rotate }, i) => (
          <Icon
            key={i}
            style={{
              position: "absolute",
              top,
              right,
              width: size,
              height: size,
              transform: `rotate(${rotate}deg)`,
              opacity: 0.12,
              color: "white",
              strokeWidth: 1.5,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 p-6 md:p-8">

        {/* LEFT — greeting block */}
        <div className="flex-1 min-w-0">
          {/* Time greeting + wave hand */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white/80 text-sm font-medium tracking-wide uppercase">
              {greeting.text}
            </span>
            <span
              className="text-xl origin-bottom-right inline-block animate-wave select-none"
              aria-hidden
            >
              {greeting.emoji}
            </span>
          </div>

          {/* Main welcome headline */}
          <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight">
            {t("welcomeBanner.title", { name: "" })}
            <span className="text-yellow-300 drop-shadow-sm">{displayName}!</span>
          </h2>

          {/* Sub text */}
          <p className="mt-2 text-white/75 text-sm md:text-base max-w-sm leading-relaxed">
            {greeting.sub}
          </p>

          {/* Quick badges */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm cursor-default select-none">
              <Zap className="h-3.5 w-3.5 text-yellow-300" /> Super Admin
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm cursor-default select-none">
              <Star className="h-3.5 w-3.5 text-yellow-300" /> LMSHub Platform
            </span>
          </div>
        </div>

        {/* Divider — hidden on mobile */}
        <div className="hidden md:block self-stretch border-l border-white/25 mx-2" />

        {/* RIGHT — motivational block */}
        <div className="md:w-64 lg:w-72 shrink-0">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5 h-10 w-10 rounded-2xl bg-white/15 backdrop-blur-sm grid place-items-center border border-white/20">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">
                {t("welcomeBanner.motivationTitle")}
              </p>
              <p className="text-white text-sm md:text-base font-medium leading-snug">
                "{motivation}"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom shimmer bar */}
      <div className="relative z-10 h-1 bg-gradient-to-r from-yellow-300/60 via-white/30 to-transparent" />
    </motion.div>
  );
}
