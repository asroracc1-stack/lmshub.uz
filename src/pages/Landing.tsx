import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { roleHomePath } from "@/lib/auth";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CheckCircle2, Users, BarChart3, Shield, ArrowRight } from "lucide-react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import SplashCursor from "@/components/SplashCursor";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

import LightRays from "@/components/LightRays";

export default function Landing() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { t, i18n } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [authButtonIndex, setAuthButtonIndex] = useState(0);

  const headlines = [
    t("headlines.h1"),
    t("headlines.h2"),
    t("headlines.h3")
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Headline Rotation Timer
  useEffect(() => {
    const headlineTimer = setInterval(() => {
      setHeadlineIndex((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(headlineTimer);
  }, []);

  // Auth Button Rotation Timer
  useEffect(() => {
    const authTimer = setInterval(() => {
      setAuthButtonIndex((prev) => (prev + 1) % 2);
    }, 3000);
    return () => clearInterval(authTimer);
  }, []);

  // Language Auto-Rotation Logic (10 seconds)
  useEffect(() => {
    const languages = ["en", "uz", "ru"];
    const startLanguageRotation = () => {
      if (localStorage.getItem("userLanguageLocked") === "true") return null;

      return setInterval(() => {
        const currentCode = i18n.language.split('-')[0];
        const currentIndex = languages.indexOf(currentCode);
        const nextIndex = (currentIndex + 1) % languages.length;
        i18n.changeLanguage(languages[nextIndex]);
      }, 10000);
    };

    let langTimer = startLanguageRotation();

    const stopRotation = () => {
      if (langTimer) {
        clearInterval(langTimer);
        langTimer = null;
      }
    };

    window.addEventListener("languageManualSelect", stopRotation);

    return () => {
      window.removeEventListener("languageManualSelect", stopRotation);
      if (langTimer) clearInterval(langTimer);
    };
  }, [i18n.language]); // Re-run only when language actually changes to restart the 10s countdown

  const handleAuthClick = () => {
    if (user && role) navigate(roleHomePath[role] || "/dashboard");
    else navigate("/signup");
  };

  return (
    <div className="relative min-h-screen bg-[#f8fafc] text-slate-900 font-sans overflow-x-hidden flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      <SplashCursor
        RAINBOW_MODE={false}
        COLOR="#10b981"
        SPLAT_RADIUS={0.25}
        DENSITY_DISSIPATION={3.5}
      />

      {/* --- Premium Background Layer --- */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.4]" />

        {/* Blurred Gradient Blobs */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.4, 0.3],
            x: [0, 20, 0],
            y: [0, -20, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] right-[-5%] w-[60vw] h-[60vw] rounded-full bg-emerald-100/40 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
            x: [0, -30, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[-10%] left-[-5%] w-[50vw] h-[50vw] rounded-full bg-blue-50/30 blur-[100px]"
        />

        {/* Tech Ornaments & Corner Lines */}
        <TechOrnaments />
      </div>

      {/* Navbar */}
      <header className={cn(
        "fixed top-4 md:top-6 inset-x-0 z-50 transition-all duration-500",
        scrolled ? "top-3" : "top-6"
      )}>
        <div className="w-full px-4 sm:px-6 lg:px-8 text-white">
          <nav className={cn(
            "flex items-center justify-between px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-2xl transition-all duration-500 border",
            scrolled
              ? "bg-white/90 backdrop-blur-xl border-slate-200 shadow-xl shadow-slate-200/20"
              : "bg-white/50 backdrop-blur-md border-white/40 shadow-sm"
          )}>
            <div className="cursor-pointer group flex items-center gap-2" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <Logo size={42} showText variant="dark" />
            </div>

            <div className="hidden lg:flex items-center gap-10">
              {["About", "Features", "Pricing", "Contact"].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-colors relative group"
                >
                  {t(`navbar.${item.toLowerCase()}`)}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-emerald-500 transition-all group-hover:w-full" />
                </a>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <LanguageSwitcher />

              <div className="flex items-center gap-2 sm:gap-3">
                <AnimatePresence mode="wait">
                  {authButtonIndex === 0 ? (
                    <motion.div
                      key="signin"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Button
                        variant="ghost"
                        onClick={() => navigate("/signin")}
                        className="text-slate-600 hover:text-emerald-600 font-bold hover:bg-emerald-50/50"
                      >
                        {t("navbar.signIn")}
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="signup"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Button
                        onClick={handleAuthClick}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-4 sm:px-8 h-9 sm:h-10 text-xs sm:text-sm shadow-lg shadow-emerald-600/20 transition-all hover:shadow-emerald-600/40 hover:-translate-y-0.5 font-bold border-none"
                      >
                        {t("navbar.signUp")}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex items-center pt-32 pb-12 md:pb-20">
        <div className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen">
          <LightRays
            raysOrigin="top-center"
            raysColor="#ff00ff"
            raysSpeed={1.5}
            lightSpread={0.8}
            rayLength={1.2}
            followMouse={true}
            mouseInfluence={0.1}
            noiseAmount={0.05}
            distortion={0.05}
            className="w-full h-full"
          />
        </div>
        <div className="w-full px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 xl:gap-16 items-center w-full relative z-10">

          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-center relative items-center lg:items-start text-center lg:text-left"
          >
            {/* Subtle HUD Accent */}
            <div className="hidden md:flex items-center gap-2 mb-6 opacity-40">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">System Online // AI Core Active</span>
            </div>

            <div className="min-h-[140px] xs:min-h-[180px] md:min-h-[280px] flex flex-col justify-center w-full">
              <AnimatePresence mode="wait">
                <motion.h1
                  key={`${i18n.language}-${headlineIndex}`}
                  initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -30, filter: "blur(8px)" }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="text-4xl xs:text-5xl md:text-6xl lg:text-6xl xl:text-7xl 2xl:text-[5rem] font-bold text-slate-900 leading-[1.1] md:leading-[1.05] tracking-tight"
                >
                  {headlines[headlineIndex].split(' ').map((word, i) => (
                    <span key={i} className={cn(
                      word.includes("IELTS") || word.includes("Band") || word.includes("Real") || word.includes("Future") || word.includes("Haqiqiy") || word.includes("Mashq")
                        ? "text-emerald-600 drop-shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                        : ""
                    )}>
                      {word}{" "}
                    </span>
                  ))}
                </motion.h1>
              </AnimatePresence>
            </div>

            <AnimatePresence mode="wait">
              <motion.p
                key={i18n.language}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-6 text-lg md:text-xl xl:text-2xl 2xl:text-3xl text-slate-500 leading-relaxed max-w-lg xl:max-w-xl 2xl:max-w-2xl font-medium opacity-80 mx-auto lg:mx-0"
              >
                {t("hero.subheadline")}
              </motion.p>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={i18n.language}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-8 sm:mt-12 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-5 w-full"
              >
                <Button
                  onClick={handleAuthClick}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl px-6 sm:px-10 h-14 sm:h-16 xl:h-20 text-base sm:text-lg xl:text-xl font-bold shadow-2xl shadow-emerald-600/20 transition-all hover:-translate-y-1 group w-full sm:w-auto"
                >
                  {t("hero.startBtn")}
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  onClick={handleAuthClick}
                  variant="outline"
                  className="bg-white/80 backdrop-blur-md border-emerald-100 hover:border-emerald-200 hover:bg-emerald-50/30 text-emerald-700 rounded-2xl px-6 sm:px-10 h-14 sm:h-16 xl:h-20 text-base sm:text-lg xl:text-xl font-bold transition-all hover:-translate-y-1 shadow-sm w-full sm:w-auto"
                >
                  {t("hero.trialBtn")}
                </Button>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Right Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex items-center justify-center"
          >
            <div className="relative w-full max-w-[580px] aspect-square flex items-center justify-center group">
              {/* Central Glow */}
              <div className="absolute inset-0 bg-emerald-500/5 rounded-full blur-[80px] group-hover:bg-emerald-500/10 transition-colors duration-1000" />

              {/* Lottie Animation Container with Glass Frame */}
              <div className="relative z-10 w-full h-full flex items-center justify-center p-8">
                <div className="absolute inset-0 border border-emerald-500/10 rounded-[3rem] [mask-image:radial-gradient(circle_at_center,#000_60%,transparent_100%)] opacity-20" />
                <DotLottieReact
                  src="https://lottie.host/a355b6f6-e610-4325-93f9-fbd488a15bc7/6ueVPok8v6.lottie"
                  loop
                  autoplay
                  className="w-full h-full object-contain drop-shadow-2xl"
                />
              </div>

              {/* Minimal Badges - Only visible on XL desktops as requested previously */}
              <FloatingBadge icon={CheckCircle2} title="AI Analysis" className="top-[15%] -right-2 hidden xl:flex" />
              <FloatingBadge icon={Users} title="Global Access" className="bottom-[20%] -right-4 hidden xl:flex" />
              <FloatingBadge icon={BarChart3} title="Real-time Stats" className="top-1/2 -left-6 hidden xl:flex" />
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function TechOrnaments() {
  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* Top Left Corner */}
      <svg className="absolute top-0 left-0 w-64 h-64 opacity-30 stroke-slate-300 hidden md:block" viewBox="0 0 200 200" fill="none">
        <path d="M20 20H60M20 20V60M20 20L40 40" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="20" cy="20" r="3" fill="currentColor" opacity="0.5" />
        <path d="M80 20L100 20" strokeWidth="1" strokeDasharray="4 4" />
      </svg>

      {/* Top Right Corner */}
      <svg className="absolute top-0 right-0 w-64 h-64 opacity-30 stroke-emerald-300 hidden md:block" viewBox="0 0 200 200" fill="none">
        <path d="M180 20H140M180 20V60" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M180 80V120" strokeWidth="1" strokeDasharray="4 4" />
        <rect x="170" y="15" width="20" height="10" rx="2" strokeWidth="1" />
      </svg>

      {/* Bottom Left Corner */}
      <svg className="absolute bottom-0 left-0 w-64 h-64 opacity-30 stroke-slate-300 hidden md:block" viewBox="0 0 200 200" fill="none">
        <path d="M20 180H60M20 180V140" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M20 120L40 100" strokeWidth="1" opacity="0.5" />
        <circle cx="65" cy="180" r="2" fill="currentColor" />
      </svg>

      {/* Bottom Right Corner */}
      <svg className="absolute bottom-0 right-0 w-64 h-64 opacity-40 stroke-emerald-400 hidden md:block" viewBox="0 0 200 200" fill="none">
        <path d="M180 180H140M180 180V140" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M150 180L130 160" strokeWidth="2" strokeLinecap="round" />
        <circle cx="180" cy="180" r="4" strokeWidth="1" />
      </svg>

      {/* Decorative Floating Lines */}
      <motion.div
        animate={{ y: [0, -40, 0], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-[2px] h-32 bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent hidden xl:block"
      />
      <motion.div
        animate={{ y: [0, 50, 0], opacity: [0.1, 0.15, 0.1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-1/4 right-1/3 w-[2px] h-48 bg-gradient-to-b from-transparent via-slate-500/20 to-transparent hidden xl:block"
      />
    </div>
  );
}

function FloatingBadge({ icon: Icon, title, className }: { icon: any, title: string, className?: string }) {
  return (
    <motion.div
      animate={{
        y: [0, -12, 0],
        x: [0, 5, 0]
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className={cn("absolute z-20 bg-white/80 backdrop-blur-xl p-4 rounded-2xl shadow-2xl shadow-slate-200/50 border border-white items-center gap-3", className)}
    >
      <div className="h-10 w-10 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-bold text-slate-800 text-sm whitespace-nowrap tracking-tight">{title}</p>
    </motion.div>
  );
}

