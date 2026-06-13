import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { 
  Play, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  HelpCircle, 
  Cpu, 
  Layers, 
  Zap, 
  AlertCircle,
  Search,
  CheckCircle2,
  Lock,
  Coins,
  TrendingUp,
  Activity,
  UserCheck
} from "lucide-react";

interface RoleData {
  name: string;
  desc: string;
  icon: string;
  color: string;
}

// -------------------------------------------------------------
// React Bits Inspired Components
// -------------------------------------------------------------

function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.offsetHeight || window.innerHeight);

    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
    }> = [];

    const numParticles = 40;
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.5 + 0.15,
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || window.innerWidth;
      height = canvas.height = canvas.offsetHeight || window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(16, 185, 129, 0.4)";
      
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.globalAlpha = p.opacity;
        ctx.fill();

        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0 || p.x > width) p.speedX *= -1;
        if (p.y < 0 || p.y > height) p.speedY *= -1;
      });

      // Draw subtle connecting lines
      ctx.strokeStyle = "rgba(16, 185, 129, 0.05)";
      ctx.lineWidth = 0.8;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
}

function DecryptText({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState("");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$";

  useEffect(() => {
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(
        text
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";
            if (index < iteration) {
              return text[index];
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );

      if (iteration >= text.length) {
        clearInterval(interval);
      }
      iteration += 1 / 3;
    }, 25);

    return () => clearInterval(interval);
  }, [text]);

  return <span>{displayText}</span>;
}

function TiltedCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;

    const rX = -(mouseY / (height / 2)) * 8;
    const rY = (mouseX / (width / 2)) * 8;

    setRotate({ x: rX, y: rY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
        transition: "transform 0.15s ease-out",
        transformStyle: "preserve-3d",
      }}
      className={`w-full h-full ${className}`}
    >
      <div style={{ transform: "translateZ(20px)" }} className="w-full h-full">
        {children}
      </div>
    </div>
  );
}

function ReactBitsLoader() {
  return (
    <div className="relative w-44 h-44 flex items-center justify-center">
      {/* Outer spinning dashed ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
        className="absolute w-40 h-40 rounded-full border-4 border-dashed border-purple-500/20"
      />
      {/* Middle rotating ring */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
        className="absolute w-32 h-32 rounded-full border-4 border-t-violet-500 border-r-transparent border-b-purple-450 border-l-transparent filter drop-shadow-[0_0_8px_rgba(20,184,166,0.6)]"
      />
      {/* Inner fast rotating ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
        className="absolute w-22 h-22 rounded-full border-4 border-r-rose-400 border-t-transparent border-l-amber-400 border-b-transparent filter drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]"
      />
      <motion.div
        animate={{ scale: [1, 1.12, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        className="absolute w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/50 flex items-center justify-center"
      >
        <Sparkles className="h-5 w-5 text-purple-400 animate-pulse" />
      </motion.div>
    </div>
  );
}

export default function StartupPitch(): React.ReactElement {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [direction, setDirection] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [transitionType, setTransitionType] = useState<"cube" | "airplane" | "zoom" | "slide">("cube");
  
  // Slide-specific interactive state variables
  const [aiTextList, setAiTextList] = useState<string[]>([]);
  const [aiTypingPhase, setAiTypingPhase] = useState<number>(0);
  const [cmdKActive, setCmdKActive] = useState<boolean>(false);
  const [activeSearchQuery, setActiveSearchQuery] = useState<string>("");
  const [financeChartProgress, setFinanceChartProgress] = useState<number>(0);
  const [activeOrbitNode, setActiveOrbitNode] = useState<number | null>(null);
  const [selectedRoleIdx, setSelectedRoleIdx] = useState<number>(0);
  const [rocketLaunched, setRocketLaunched] = useState<boolean>(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const totalSlides = 10;

  // Keyframes and CSS Animations injection
  const injectCSS = `
    @keyframes wave-hand {
      0%, 100% { transform: rotate(0deg); }
      15%, 85% { transform: rotate(0deg); }
      30%, 60% { transform: rotate(18deg); }
      45% { transform: rotate(-8deg); }
      75% { transform: rotate(12deg); }
    }
    .animate-wave-hand {
      display: inline-block;
      animation: wave-hand 2s ease-in-out infinite;
      transform-origin: 70% 80%;
    }
    @keyframes float-breathing {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-12px) rotate(1deg); }
    }
    .animate-float-breathing {
      animation: float-breathing 4s ease-in-out infinite;
    }
    @keyframes float-reverse {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(12px) rotate(-1deg); }
    }
    .animate-float-reverse {
      animation: float-reverse 4.5s ease-in-out infinite;
    }
    @keyframes pulse-purple {
      0%, 100% { transform: scale(1); box-shadow: 0 0 25px rgba(16, 185, 129, 0.4); }
      50% { transform: scale(1.06); box-shadow: 0 0 50px rgba(16, 185, 129, 0.7); }
    }
    .animate-pulse-purple {
      animation: pulse-purple 3s ease-in-out infinite;
    }
    @keyframes rotate-clockwise {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .animate-rotate-clockwise {
      animation: rotate-clockwise 25s linear infinite;
    }
    @keyframes rotate-counter {
      from { transform: rotate(360deg); }
      to { transform: rotate(0deg); }
    }
    .animate-rotate-counter {
      animation: rotate-counter 25s linear infinite;
    }
    @keyframes shiny-text-sweep {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    .animate-shiny-sweep {
      background: linear-gradient(120deg, rgba(16,185,129,0.3) 30%, rgba(16,185,129,0.9) 50%, rgba(16,185,129,0.3) 70%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: shiny-text-sweep 4s linear infinite;
    }
    @keyframes coin-fly-up {
      0% { transform: translateY(40px) scale(0.6) rotate(0deg); opacity: 0; }
      50% { opacity: 1; }
      100% { transform: translateY(-120px) scale(1.1) rotate(360deg); opacity: 0; }
    }
    .animate-coin-fly {
      animation: coin-fly-up 3.5s ease-out infinite;
    }
    @keyframes text-cursor {
      50% { border-color: transparent; }
    }
    .animate-cursor {
      border-right: 2px solid #9F86C0;
      animation: text-cursor 0.8s step-end infinite;
    }
  `;

  // Trigger animations when entering slides
  useEffect(() => {
    // Gemini AI text simulation (Slide 5)
    if (currentSlide === 4) {
      setAiTypingPhase(0);
      setAiTextList([]);
      const timers: NodeJS.Timeout[] = [];
      
      const logs = [
        "🤖 Gemini: Tizim tahlil qilinmoqda...",
        "🧠 Gemini: IELTS Mock dars rejasi generatsiya qilinyapti...",
        "🍃 Gemini: Spring Boot darsliklari tuzilmoqda...",
        "🚀 Gemini: 10 ta o'quv haftasi va 30 ta mavzu tayyor!",
        "✨ Gemini: Kurs muvaffaqiyatli yuklandi!"
      ];

      timers.push(setTimeout(() => setAiTypingPhase(1), 800));
      logs.forEach((log, index) => {
        timers.push(setTimeout(() => {
          setAiTextList(prev => [...prev, log]);
          if (index === logs.length - 1) {
            setAiTypingPhase(2);
          }
        }, 1600 + index * 900));
      });

      return () => timers.forEach(clearTimeout);
    }

    // Cmd + K search bar trigger (Slide 6)
    if (currentSlide === 5) {
      setCmdKActive(false);
      setActiveSearchQuery("");
      const timers: NodeJS.Timeout[] = [];

      timers.push(setTimeout(() => setCmdKActive(true), 1000));
      
      const query = "Backend guruhlari";
      let text = "";
      query.split("").forEach((char, idx) => {
        timers.push(setTimeout(() => {
          text += char;
          setActiveSearchQuery(text);
        }, 2000 + idx * 100));
      });

      return () => timers.forEach(clearTimeout);
    }

    // Finance line progress trigger (Slide 8)
    if (currentSlide === 7) {
      setFinanceChartProgress(0);
      const timer = setTimeout(() => {
        setFinanceChartProgress(100);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentSlide]);

  // Fullscreen state listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setDirection(1);
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(prev => prev - 1);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Space") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft" || e.key === "Backspace") {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlide]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err: Error) => {
        console.error(`Fullscreen request failed: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const roles: RoleData[] = [
    { name: "Super Admin", desc: "Tizim ekotizimini va barcha tashkilotlarni to'liq nazorat qilish 👑", icon: "👑", color: "from-purple-500 to-indigo-500" },
    { name: "Admin", desc: "Tashkilotning boshqaruvchisi, o'qituvchilar va guruhlar arxitektori 🏛️", icon: "🏛️", color: "from-blue-500 to-fuchsia-500" },
    { name: "Administrator", desc: "Filial va kundalik operatsiyalar, to'lovlar va davomat nazoratchisi 📋", icon: "📋", color: "from-violet-500 to-purple-500" },
    { name: "Teacher", desc: "Dars jadvallari, o'quvchilar baholari, vazifalar va chat boshqaruvi 🎓", icon: "🎓", color: "from-yellow-500 to-amber-500" },
    { name: "Student", desc: "Darslar, natijalar, virtual tangalar, IELTS/SAT test topshirish 📚", icon: "📚", color: "from-pink-500 to-rose-500" },
    { name: "Parent", desc: "Farzandining davomati, to'lovlari, reytingi va xabarlaridan tezkor xabardorlik 👨‍👩‍👦", icon: "👨‍👩‍👦", color: "from-orange-500 to-red-500" },
    { name: "Regular User", desc: "Platformadagi ochiq kurslar va AI Speaking imkoniyatlaridan foydalanuvchi 👥", icon: "👥", color: "from-slate-500 to-slate-700" },
    { name: "Pack Manager", desc: "Tarif rejalari, coin mukofotlari va moliyaviy obunalarni sozlovchi 💰", icon: "💰", color: "from-violet-500 to-fuchsia-500" }
  ];

  // PowerPoint transition variants mapping
  const transitionVariants = {
    cube: {
      enter: (dir: number) => ({
        rotateY: dir > 0 ? 90 : -90,
        x: dir > 0 ? "50%" : "-50%",
        opacity: 0,
        scale: 0.9,
      }),
      center: {
        rotateY: 0,
        x: 0,
        opacity: 1,
        scale: 1,
        transition: {
          duration: 0.7,
          ease: "easeInOut",
        },
      },
      exit: (dir: number) => ({
        rotateY: dir > 0 ? -90 : 90,
        x: dir > 0 ? "-50%" : "50%",
        opacity: 0,
        scale: 0.9,
        transition: {
          duration: 0.7,
          ease: "easeInOut",
        },
      }),
    },
    airplane: {
      enter: (dir: number) => ({
        x: dir > 0 ? -1200 : 1200,
        y: dir > 0 ? 600 : -600,
        rotate: dir > 0 ? -45 : 45,
        scale: 0.1,
        opacity: 0,
        skewX: dir > 0 ? -15 : 15,
      }),
      center: {
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1,
        opacity: 1,
        skewX: 0,
        transition: {
          type: "spring",
          stiffness: 140,
          damping: 20,
        },
      },
      exit: (dir: number) => ({
        x: dir > 0 ? 1200 : -1200,
        y: dir > 0 ? -600 : 600,
        rotate: dir > 0 ? 45 : -45,
        scale: 0.1,
        opacity: 0,
        skewX: dir > 0 ? 15 : -15,
        transition: {
          duration: 0.8,
          ease: "easeIn",
        },
      }),
    },
    zoom: {
      enter: {
        scale: 0.6,
        opacity: 0,
      },
      center: {
        scale: 1,
        opacity: 1,
        transition: {
          duration: 0.5,
          ease: "easeOut",
        },
      },
      exit: {
        scale: 1.4,
        opacity: 0,
        transition: {
          duration: 0.5,
          ease: "easeIn",
        },
      },
    },
    slide: {
      enter: (dir: number) => ({
        x: dir > 0 ? 1000 : -1000,
        opacity: 0,
      }),
      center: {
        x: 0,
        opacity: 1,
        transition: {
          type: "spring",
          stiffness: 280,
          damping: 28,
        },
      },
      exit: (dir: number) => ({
        x: dir > 0 ? -1000 : 1000,
        opacity: 0,
        transition: {
          duration: 0.45,
        },
      }),
    },
  };

  const renderBackground = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Canvas particles background from React Bits */}
      <ParticlesBackground />

      {/* Dynamic Glow Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-[120px] animate-float-breathing" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-500/10 dark:bg-violet-500/5 rounded-full blur-[120px] animate-float-reverse" />
      
      {/* Grid overlay adapting to light/dark */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(16,185,129,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.04)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(16,185,129,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,185,129,0.07)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_80%,transparent_100%)] opacity-70" />
    </div>
  );

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: injectCSS }} />

      {/* Header Panel when not in Fullscreen */}
      {!isFullscreen && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="h-7 w-7 text-purple-500 animate-pulse" />
              LMSHub Loyiha Taqdimoti <span className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold px-2.5 py-1 rounded-full uppercase">{t("dynamic.startuppitch.10_slayd")}</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{t("dynamic.startuppitch.siz_izlagan_super_interaktiv_animatsiyal")}</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Transition selector dropdown */}
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase">{t("dynamic.startuppitch.slayd_o_tish_effekti")}</span>
              <select 
                value={transitionType} 
                onChange={(e) => setTransitionType(e.target.value as any)} 
                className="mt-1 text-xs font-black bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                <option value="cube">📦 3D Kub aylanma</option>
                <option value="airplane">✈️ Qog'oz Samolyot</option>
                <option value="zoom">🔍 Portlash & Zoom</option>
                <option value="slide">➡️ Smooth Slide</option>
              </select>
            </div>
            
            <Button 
              onClick={toggleFullscreen} 
              className="h-12 px-6 rounded-2xl bg-gradient-premium text-white font-bold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/35 hover:scale-[1.02] active:scale-98 transition-all flex items-center gap-2 shrink-0"
            >
              <Play className="h-5 w-5 fill-current" /> Boshlash
            </Button>
          </div>
        </div>
      )}

      {/* Main Slideshow Viewport (Adaptive Layout) */}
      <div 
        ref={containerRef} 
        className={`relative select-none transition-all duration-500 flex flex-col justify-between overflow-hidden ${
          isFullscreen 
            ? "w-screen h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white z-[99999]" 
            : "w-full min-h-[660px] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white rounded-3xl border border-slate-200 dark:border-slate-900 shadow-xl"
        }`}
      >
        {renderBackground()}

        {/* Fullscreen top toolbar */}
        <div className="p-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-900/60 backdrop-blur-md bg-white/40 dark:bg-slate-950/40 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <Logo size={36} variant="dark" />
            <div>
              <p className="text-[10px] tracking-widest font-black uppercase text-purple-600 dark:text-purple-500">{t("dynamic.startuppitch.lmshub_ekotizimi")}</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{t("dynamic.startuppitch.startup_pitch_presentation")}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Top dots index */}
            <div className="hidden sm:flex items-center gap-1.5 mr-4 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800">
              {Array.from({ length: totalSlides }).map((_, i) => (
                <div 
                  key={i} 
                  onClick={() => { setDirection(i > currentSlide ? 1 : -1); setCurrentSlide(i); }}
                  className={`h-2 rounded-full cursor-pointer transition-all duration-300 ${
                    i === currentSlide ? "w-6 bg-purple-500" : "w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-500"
                  }`} 
                />
              ))}
            </div>

            {isFullscreen && (
              <div className="mr-3">
                <select 
                  value={transitionType} 
                  onChange={(e) => setTransitionType(e.target.value as any)} 
                  className="text-xs font-black bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="cube">📦 3D Kub</option>
                  <option value="airplane">✈️ Qog'oz Samolyot</option>
                  <option value="zoom">🔍 Zoom</option>
                  <option value="slide">➡️ Slide</option>
                </select>
              </div>
            )}

            <Button 
              variant="outline" 
              size="icon" 
              onClick={toggleFullscreen} 
              className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            
            {isFullscreen && (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => document.exitFullscreen()} 
                className="h-10 w-10 rounded-xl border-rose-200 dark:border-rose-950 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-all"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Central Slide Content Area */}
        <div className="flex-1 flex items-center justify-center p-8 md:p-12 z-10 overflow-hidden relative">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={transitionVariants[transitionType]}
              initial="enter"
              animate="center"
              exit="exit"
              style={{ transformPerspective: 1200 }}
              className="w-full w-full h-full flex flex-col justify-center items-center text-center relative"
            >
              {/* SLIDE 1: INTRO */}
              {currentSlide === 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full text-left">
                  <div className="lg:col-span-6 space-y-6">
                    <div className="inline-flex items-center gap-2 bg-purple-55/10 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20 px-4 py-2 rounded-full text-xs font-black tracking-wide uppercase">
                      <Sparkles className="h-3.5 w-3.5 text-purple-500 animate-pulse" /> LMSHub Startup Pitch
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] text-slate-900 dark:text-white">
                      LMSHub — <br />
                      <span className="text-gradient">
                        <DecryptText text="Ta'lim Inqilobi" />
                      </span>
                    </h1>

                    <p className="text-xl text-slate-650 dark:text-slate-350 max-w-xl font-medium leading-relaxed mt-4">
                      Barcha rollarni yagona interaktiv va 100% avtomatlashtirilgan o'quv ekotizimida birlashtiruvchi zamonaviy platforma.
                    </p>

                    <div className="pt-4 flex items-center gap-4">
                      <span className="text-5xl animate-wave-hand cursor-pointer filter drop-shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                        👋
                      </span>
                      <div>
                        <p className="text-sm font-black uppercase text-purple-600 dark:text-purple-500 tracking-wider">{t("dynamic.startuppitch.hakamlarga_ehtiromlar")}</p>
                        <p className="text-xs text-slate-500 font-bold">{t("dynamic.startuppitch.lmshub_bilan_bozorni_yondirishga_tayyorm")}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right side: 50/50 split showing the Lottie animation file */}
                  <div className="lg:col-span-6 flex items-center justify-center relative min-h-[360px]">
                    <TiltedCard className="flex items-center justify-center w-full">
                      <div className="w-full h-full flex items-center justify-center p-4">
                        <DotLottieReact 
                          src="https://lottie.host/5b76c28c-2098-4fe5-a825-0003a2cb2e70/fYNcx11Jzq.lottie" 
                          loop 
                          autoplay 
                          className="w-full h-full object-contain max-h-[350px] drop-shadow-2xl" 
                        />
                      </div>
                    </TiltedCard>
                  </div>
                </div>
              )}

              {/* SLIDE 2: THE CHAOS (PROBLEM) */}
              {currentSlide === 1 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full text-left">
                  <div className="lg:col-span-6 space-y-6">
                    <div className="inline-flex items-center gap-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20 px-4 py-1.5 rounded-full text-xs font-black uppercase">
                      <AlertCircle className="h-3.5 w-3.5" /> Asosiy Muammo
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-none">
                      Hozirgi holat:<br />
                      <span className="text-rose-500">
                        <DecryptText text="Tartibsizlik va Xaos" />
                      </span>
                    </h2>
                    <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                      Excel fayllarini tushunish qiyin, ma'lumotlar yo'qoladi, to'lovlar hisobi chalkash, davomat esa qog'ozda qolib ketmoqda. Tizimsizlik va noaniqlik vaqt va pulni yeydi.
                    </p>
                  </div>

                  {/* Sherlock Holmes floating visual wrapped in TiltedCard */}
                  <div className="lg:col-span-6">
                    <TiltedCard>
                      <div className="relative w-full h-[360px] bg-slate-100/50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between overflow-hidden shadow-inner">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                          <span className="text-xs font-bold text-rose-500 animate-pulse flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-rose-500" /> EXCEL_DATABASE_CRASHED.xlsx
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-600 font-mono">{t("dynamic.startuppitch.100_unstable")}</span>
                        </div>
                        
                        <div className="flex-1 relative mt-4 overflow-hidden">
                          <motion.div 
                            animate={{ y: [0, -8, 0], rotate: [0, -2, 0] }}
                            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                            className="absolute top-2 left-2 bg-white dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-450 px-3 py-2 rounded-xl text-xs font-bold shadow-sm"
                          >
                            <span>❌ 12 ta to'lov yo'qoldi!</span>
                          </motion.div>
                          <motion.div 
                            animate={{ y: [0, 8, 0], rotate: [0, 2, 0] }}
                            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                            className="absolute top-12 right-2 bg-white dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-450 px-3 py-2 rounded-xl text-xs font-bold shadow-sm"
                          >
                            📖 Jurnal topilmadi
                          </motion.div>
                          <motion.div 
                            animate={{ x: [0, -6, 0] }}
                            transition={{ repeat: Infinity, duration: 3.5 }}
                            className="absolute bottom-16 left-4 bg-white dark:bg-red-950/20 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-450 px-3 py-2 rounded-xl text-xs font-bold shadow-sm"
                          >
                            🏃‍♂️ O'qituvchi ma'lumotlari xato
                          </motion.div>
                          <motion.div 
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="absolute bottom-4 right-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/40 text-rose-600 dark:text-rose-450 px-4 py-2 rounded-xl text-xs font-bold"
                          >
                            ⚠️ Tizim xatosi
                          </motion.div>
                          
                          {/* Sherlock Holmes Magnifying Glass */}
                          <motion.div 
                            animate={{ 
                              x: [30, 180, 70, 30],
                              y: [70, 10, 110, 70],
                            }}
                            transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                            className="absolute pointer-events-none z-10 opacity-90"
                          >
                            <div className="w-16 h-16 rounded-full border-4 border-slate-700 bg-purple-500/10 backdrop-blur-[2px] flex items-center justify-center shadow-lg relative">
                              <div className="absolute w-12 h-1 bg-slate-700 origin-right rotate-45 translate-x-7 translate-y-7 rounded-full" />
                              <span className="text-xl">🕵️‍♂️</span>
                            </div>
                          </motion.div>
                        </div>
                        
                        <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-between text-xs text-rose-500 dark:text-rose-455 font-extrabold">
                          <span>{t("dynamic.startuppitch.sherlok_xolms_xulosasi")}</span>
                          <span className="bg-rose-100 dark:bg-rose-500/20 text-rose-650 dark:text-rose-450 px-3 py-1 rounded-full text-[10px]">{t("dynamic.startuppitch.tushunarsiz_tartibsizlik")}</span>
                        </div>
                      </div>
                    </TiltedCard>
                  </div>
                </div>
              )}

              {/* SLIDE 3: SOLUTION (ORBIT & PULSING SPHERE) */}
              {currentSlide === 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full text-left">
                  <div className="lg:col-span-6 space-y-6">
                    <div className="inline-flex items-center gap-2 bg-purple-55/10 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20 px-4 py-1.5 rounded-full text-xs font-black uppercase">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Bizning Yechim
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-none">
                      Yechim: <br />
                      <span className="text-gradient">
                        <DecryptText text="Yagona Ekotizim" />
                      </span>
                    </h2>
                    <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                      Barcha 8 ta rol platformamiz atrofida yagona oqimda, real vaqt rejimida o'zaro bog'liq holda ishlaydi. Aloqalar va ma'lumotlar avtomatlashtirilgan.
                    </p>
                  </div>

                  {/* Planet node orbit layout wrapped in TiltedCard */}
                  <div className="lg:col-span-6 flex items-center justify-center">
                    <TiltedCard>
                      <div className="relative w-full h-[360px] flex items-center justify-center bg-slate-100/50 dark:bg-slate-900/20 rounded-2xl border border-slate-200 dark:border-slate-800/65 overflow-hidden">
                        <div className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-slate-950 font-black text-base shadow-lg shadow-purple-500/20 animate-pulse z-10">
                          LMSHub
                        </div>
                        
                        {/* SVG connection beams */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none">
                          {roles.map((r, i) => {
                            const angle = (i * 360) / roles.length;
                            const rad = (angle * Math.PI) / 180;
                            const x = 50 + 35 * Math.cos(rad);
                            const y = 50 + 35 * Math.sin(rad);
                            
                            return (
                              <line 
                                key={i}
                                x1="50%" 
                                y1="50%" 
                                x2={`${x}%`} 
                                y2={`${y}%`} 
                                stroke={activeOrbitNode === i ? "#9F86C0" : "rgba(16, 185, 129, 0.4)"} 
                                strokeWidth={activeOrbitNode === i ? "3" : "1"} 
                                strokeDasharray={activeOrbitNode === i ? "none" : "3 3"}
                                className="transition-all duration-300" 
                              />
                            );
                          })}
                        </svg>
                        
                        {/* Rotating orbit */}
                        <div className="absolute w-72 h-72 rounded-full border border-purple-500/20 dark:border-purple-500/10 flex items-center justify-center animate-rotate-clockwise" style={{ animationDuration: "35s" }}>
                          {roles.map((role, idx) => {
                            const angle = (idx * 360) / roles.length;
                            const rad = (angle * Math.PI) / 180;
                            const x = 145 + 125 * Math.cos(rad);
                            const y = 145 + 125 * Math.sin(rad);
                            
                            return (
                              <button 
                                key={role.name}
                                style={{ left: x, top: y }}
                                onMouseEnter={() => setActiveOrbitNode(idx)}
                                onMouseLeave={() => setActiveOrbitNode(null)}
                                className={`absolute h-9 w-9 rounded-full bg-white dark:bg-slate-900 border flex items-center justify-center text-sm shadow-md transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 ${
                                  activeOrbitNode === idx 
                                    ? "border-purple-500 shadow-purple-500/30 scale-110" 
                                    : "border-slate-200 dark:border-slate-800"
                                }`}
                              >
                                <span>{role.icon}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </TiltedCard>
                  </div>
                </div>
              )}

              {/* SLIDE 4: MULTI-ROLE SYSTEM (GLOWING GRID) */}
              {currentSlide === 3 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full text-left">
                  <div className="lg:col-span-5 space-y-4">
                    <div className="inline-flex items-center gap-2 bg-purple-55/10 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20 px-4 py-1.5 rounded-full text-xs font-black uppercase">
                      <UserCheck className="h-3.5 w-3.5" /> Rol Sozlamalari
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white leading-none">
                      8 Xil Rol — <br />
                      <span className="text-gradient">
                        <DecryptText text="Yagona Ekotizimda" />
                      </span>
                    </h2>
                    
                    {/* Role tabs list */}
                    <div className="space-y-1 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin">
                      {roles.map((role, idx) => (
                        <button
                          key={role.name}
                          onClick={() => setSelectedRoleIdx(idx)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all duration-200 flex items-center justify-between ${
                            selectedRoleIdx === idx 
                              ? "bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-450" 
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-55 dark:hover:bg-slate-850"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{role.icon}</span>
                            <span>{role.name}</span>
                          </span>
                          <span className="text-[10px] text-slate-400">0{idx + 1}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Profile Card visualization wrapped in TiltedCard */}
                  <div className="lg:col-span-7">
                    <TiltedCard>
                      <div className="relative w-full h-[360px] bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${roles[selectedRoleIdx].color} flex items-center justify-center text-3xl shadow-md`}>
                            {roles[selectedRoleIdx].icon}
                          </div>
                          <div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                              {roles[selectedRoleIdx].name}
                              <span className="text-[9px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold px-2 py-0.5 rounded-full uppercase">{t("dynamic.subscriptions.active")}</span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{roles[selectedRoleIdx].desc}</p>
                          </div>
                        </div>
                        
                        {/* Permission toggle list mockup */}
                        <div className="space-y-2.5 mt-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                          <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t("dynamic.startuppitch.ruxsatlar_va_huquqlar")}</div>
                          <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                            <span>{t("dynamic.startuppitch.tizim_sozlamalari")}</span>
                            <span className="h-4.5 w-8 bg-purple-500 rounded-full flex items-center pl-4 transition-all"><span className="h-3.5 w-3.5 bg-white rounded-full" /></span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                            <span>{t("dynamic.startuppitch.moliyaviy_hisobotlar")}</span>
                            <span className={`h-4.5 w-8 rounded-full flex items-center transition-all ${
                              ["Super Admin", "Admin", "Pack Manager"].includes(roles[selectedRoleIdx].name) ? "bg-purple-500 pl-4" : "bg-slate-200 dark:bg-slate-800 pl-0.5"
                            }`}><span className="h-3.5 w-3.5 bg-white rounded-full" /></span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                            <span>{t("dynamic.startuppitch.guruhlarni_tahrirlash")}</span>
                            <span className={`h-4.5 w-8 rounded-full flex items-center transition-all ${
                              ["Super Admin", "Admin", "Administrator", "Teacher"].includes(roles[selectedRoleIdx].name) ? "bg-purple-500 pl-4" : "bg-slate-200 dark:bg-slate-800 pl-0.5"
                            }`}><span className="h-3.5 w-3.5 bg-white rounded-full" /></span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                          <span>{t("dynamic.startuppitch.tizim_darajasi")}</span>
                          <span className="font-mono font-black text-purple-500">LEVEL 0{selectedRoleIdx + 1}</span>
                        </div>
                      </div>
                    </TiltedCard>
                  </div>
                </div>
              )}

              {/* SLIDE 5: GEMINI AI INTEGRATION (TERMINAL TYPEWRITER) */}
              {currentSlide === 4 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full text-left">
                  <div className="lg:col-span-6 space-y-6">
                    <div className="inline-flex items-center gap-2 bg-purple-55/10 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20 px-4 py-1.5 rounded-full text-xs font-black uppercase">
                      <Cpu className="h-3.5 w-3.5 text-purple-500" /> Gemini AI Magic ✨
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-none">
                      Gemini AI:<br />
                      <span className="text-gradient">
                        <DecryptText text="Intellektual O'qituvchi" />
                      </span>
                    </h2>
                    <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                      Fan nomini kiritib to'liq dars rejasi, mavzular va test savollarini soniyalarda generatsiya qilish mumkin. Inson o'rniga AI 1 klikda ishlaydi.
                    </p>
                  </div>

                  {/* Terminal Box wrapped in TiltedCard */}
                  <div className="lg:col-span-6">
                    <TiltedCard>
                      <div className="relative w-full h-[360px] bg-slate-900/90 text-purple-400 p-5 rounded-2xl border border-slate-800 font-mono flex flex-col justify-between overflow-hidden shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <div className="flex items-center gap-2 text-slate-300 text-xs font-bold">
                            <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
                            <span>{t("dynamic.startuppitch.gemini_ai_engine_v35")}</span>
                          </div>
                          <span className="text-[9px] bg-purple-500/10 text-purple-400 font-bold px-2 py-0.5 rounded border border-purple-500/20">{t("dynamic.startuppitch.ready")}</span>
                        </div>
                        
                        <div className="flex-1 mt-4 space-y-3 text-[11px] overflow-y-auto pr-1">
                          <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-850">
                            <p className="text-[9px] text-slate-500 uppercase font-black">{t("dynamic.startuppitch.prompt_input")}</p>
                            <p className="text-white mt-1 font-bold">$ create-course --name "Python IELTS BootCamp" --weeks 4</p>
                          </div>
                          
                          {aiTypingPhase === 1 && (
                            <div className="flex items-center gap-2 text-purple-400 font-bold text-[10px] animate-pulse">
                              <Cpu className="h-4 w-4 animate-spin" />
                              <span>{t("dynamic.startuppitch.gemini_ai_dars_rejasini_tuzmoqda")}</span>
                            </div>
                          )}
                          
                          {aiTextList.length > 0 && (
                            <div className="space-y-1 bg-slate-950/30 p-2.5 rounded-lg border border-slate-800/40">
                              {aiTextList.map((log, i) => (
                                <motion.div 
                                  key={i} 
                                  initial={{ opacity: 0, x: -10 }} 
                                  animate={{ opacity: 1, x: 0 }}
                                  className="text-[11px] text-purple-400 font-semibold"
                                >
                                  {log}
                                </motion.div>
                              ))}
                              {aiTypingPhase === 1 && (
                                <span className="inline-block h-3.5 w-2 bg-purple-500 ml-1 animate-cursor" />
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-[10px] text-slate-500">
                          <span>{t("dynamic.startuppitch.ai_model")}</span>
                          <span className="text-purple-400 font-bold">Gemini 3.5 Flash 🚀</span>
                        </div>
                      </div>
                    </TiltedCard>
                  </div>
                </div>
              )}

              {/* SLIDE 6: GLOBAL SEARCH (CMD + K INTERACTIVE) */}
              {currentSlide === 5 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full text-left">
                  <div className="lg:col-span-6 space-y-6">
                    <div className="inline-flex items-center gap-2 bg-purple-55/10 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20 px-4 py-1.5 rounded-full text-xs font-black uppercase">
                      <Search className="h-3.5 w-3.5 text-purple-500" /> Global Qidiruv
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-none">
                      Cmd + K:<br />
                      <span className="text-gradient">
                        <DecryptText text="Tezkor Boshqaruv" />
                      </span>
                    </h2>
                    <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                      Butun platformani bitta klaviatura tugmasi orqali boshqarish. Qidiruv paneli ekranga sakrab chiqadi va real vaqtda butun bazani qidiradi.
                    </p>
                  </div>

                  {/* Interactive keyboard and palette wrapped in TiltedCard */}
                  <div className="lg:col-span-6">
                    <TiltedCard>
                      <div className="relative w-full h-[360px] bg-slate-100/50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-hidden shadow-inner">
                        <div className="flex-1 flex flex-col justify-center items-center gap-6">
                          <div className="flex gap-3">
                            <motion.kbd 
                              animate={cmdKActive ? { scale: [1, 0.9, 1], backgroundColor: ["#ffffff", "#9F86C0", "#ffffff"], color: ["#475569", "#ffffff", "#475569"] } : {}}
                              transition={{ repeat: Infinity, repeatDelay: 3.5, duration: 0.5 }}
                              className="px-4 py-2 border border-slate-300 dark:border-slate-800 rounded-xl text-sm font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 shadow-sm"
                            >
                              Cmd
                            </motion.kbd>
                            <span className="text-slate-400 font-bold self-center text-lg">+</span>
                            <motion.kbd 
                              animate={cmdKActive ? { scale: [1, 0.9, 1], backgroundColor: ["#ffffff", "#9F86C0", "#ffffff"], color: ["#475569", "#ffffff", "#475569"] } : {}}
                              transition={{ repeat: Infinity, repeatDelay: 3.5, duration: 0.5, delay: 0.3 }}
                              className="px-4 py-2 border border-slate-300 dark:border-slate-800 rounded-xl text-sm font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-355 shadow-sm"
                            >
                              K
                            </motion.kbd>
                          </div>
                          
                          <AnimatePresence>
                            {cmdKActive && (
                              <motion.div 
                                initial={{ y: 20, opacity: 0, scale: 0.95 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                exit={{ y: 20, opacity: 0, scale: 0.95 }}
                                className="w-full max-w-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-lg text-left"
                              >
                                <div className="flex items-center gap-2 text-slate-400 border-b border-slate-100 dark:border-slate-800/80 pb-2 mb-2">
                                  <Search className="h-4 w-4 text-purple-500" />
                                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{activeSearchQuery}</span>
                                  <span className="inline-block h-3.5 w-0.5 bg-purple-500 animate-cursor" />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[11px] p-2 bg-purple-55/10 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 rounded-lg text-purple-600 dark:text-purple-400 font-bold">
                                    <span>🔍 Backend Bootcamp 4.0</span>
                                    <span className="text-[9px] text-slate-400 font-medium">{t("dynamic.startuppitch.guruhlar")}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-55 dark:hover:bg-slate-800 rounded-lg font-bold">
                                    <span>👤 Sherzod Jo'rayev (IELTS)</span>
                                    <span className="text-[9px] text-slate-400 font-medium">{t("dynamic.startuppitch.ustozlar")}</span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        
                        <div className="border-t border-slate-200 dark:border-slate-800/80 pt-2 flex items-center justify-between text-[10px] text-slate-400">
                          <span>{t("dynamic.startuppitch.qidiruv_tezligi")}</span>
                          <span className="text-purple-500 font-bold">0ms / Instant ⚡</span>
                        </div>
                      </div>
                    </TiltedCard>
                  </div>
                </div>
              )}

              {/* SLIDE 7: SPEED & PREMIUM REACT BITS LOADER */}
              {currentSlide === 6 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full text-left">
                  <div className="lg:col-span-6 space-y-6">
                    <div className="inline-flex items-center gap-2 bg-purple-55/10 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20 px-4 py-1.5 rounded-full text-xs font-black uppercase">
                      <Zap className="h-3.5 w-3.5 text-purple-500" /> Ajoyib Tezlik
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-none">
                      Millisekundlar<br />
                      <span className="text-gradient">
                        <DecryptText text="Jangi va Loader" />
                      </span>
                    </h2>
                    <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                      Sohadagi eng tezkor yuklanish tezligi. Keshlash arxitekturasi va virtual DOM optimallashtirish bilan sahifalar yashindek tez ochiladi.
                    </p>
                  </div>

                  {/* React Bits Concentric Spinner Loader wrapped in TiltedCard */}
                  <div className="lg:col-span-6">
                    <TiltedCard>
                      <div className="relative w-full h-[360px] bg-slate-100/50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between items-center shadow-inner">
                        <div className="flex-1 flex flex-col items-center justify-center relative w-full gap-4">
                          {/* Live React Bits loader simulation */}
                          <ReactBitsLoader />
                          
                          <div className="text-center">
                            <h4 className="text-2xl font-black text-purple-500">{t("dynamic.startuppitch.12ms")}</h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-widest mt-1">O'rtacha javob vaqti ⚡</p>
                          </div>
                        </div>
                        
                        <div className="border-t border-slate-200 dark:border-slate-800 w-full pt-2 flex items-center justify-between text-[10px] text-slate-400">
                          <span>{t("dynamic.startuppitch.ishlash_darajasi")}</span>
                          <span className="text-purple-500 font-bold">A+ Excellent 🏅</span>
                        </div>
                      </div>
                    </TiltedCard>
                  </div>
                </div>
              )}

              {/* SLIDE 8: FINANCE & GAMIFICATION */}
              {currentSlide === 7 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full text-left">
                  <div className="lg:col-span-6 space-y-6">
                    <div className="inline-flex items-center gap-2 bg-purple-55/10 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20 px-4 py-1.5 rounded-full text-xs font-black uppercase">
                      <TrendingUp className="h-3.5 w-3.5 text-purple-500" /> Moliya va Gamification
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-none">
                      Moliyaviy O'sish &<br />
                      <span className="text-gradient">
                        <DecryptText text="Virtual Tangalar" />
                      </span>
                    </h2>
                    <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                      O'quvchilarni rag'batlantirish uchun maxsus LMS Coins (🪙) tizimi va tashkilotlar moliyasini nazorat qiluvchi daxshatli visual grafik tahlillar.
                    </p>
                  </div>

                  {/* SVG Chart and flying coins wrapped in TiltedCard */}
                  <div className="lg:col-span-6">
                    <TiltedCard>
                      <div className="relative w-full h-[360px] bg-slate-100/50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between overflow-hidden shadow-inner">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4 text-amber-500" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{t("dynamic.startuppitch.lms_coins_o_sish_indeksi")}</span>
                          </div>
                          <span className="text-[9px] text-purple-650 dark:text-purple-450 font-bold bg-purple-500/10 px-2 py-0.5 rounded">{t("dynamic.startuppitch.uptrend")}</span>
                        </div>
                        
                        {/* SVG Line Chart */}
                        <div className="flex-1 relative flex items-end justify-center py-6 w-full">
                          <svg className="w-full h-32 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="chartGradArea" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#9F86C0" stopOpacity="0.4" />
                                <stop offset="100%" stopColor="#9F86C0" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            
                            {/* Area */}
                            <motion.path 
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              d="M 0 85 L 20 70 L 40 75 L 60 50 L 80 40 L 100 20 L 100 100 L 0 100 Z"
                              fill="url(#chartGradArea)"
                            />
                            
                            {/* Line */}
                            <motion.path 
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              d="M 0 85 L 20 70 L 40 75 L 60 50 L 80 40 L 100 20"
                              fill="none" 
                              stroke="#9F86C0" 
                              strokeWidth="3.5"
                              strokeLinecap="round"
                            />
                          </svg>
                          
                          {/* Flying Coins */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-4xl absolute animate-coin-fly text-amber-500 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" style={{ animationDelay: "0s", left: "15%" }}>🪙</span>
                            <span className="text-4xl absolute animate-coin-fly text-amber-500 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" style={{ animationDelay: "1s", left: "45%" }}>🪙</span>
                            <span className="text-4xl absolute animate-coin-fly text-amber-500 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" style={{ animationDelay: "1.8s", left: "75%" }}>🪙</span>
                          </div>
                        </div>
                        
                        <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex items-center justify-between text-[10px] text-slate-400">
                          <span>{t("dynamic.startuppitch.rag_batlantirish_effekti")}</span>
                          <span className="text-purple-500 font-bold">+142% faollashish 🚀</span>
                        </div>
                      </div>
                    </TiltedCard>
                  </div>
                </div>
              )}

              {/* SLIDE 9: TECH STACK */}
              {currentSlide === 8 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full text-left">
                  <div className="lg:col-span-6 space-y-6">
                    <div className="inline-flex items-center gap-2 bg-purple-55/10 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20 px-4 py-1.5 rounded-full text-xs font-black uppercase">
                      <Layers className="h-3.5 w-3.5 text-purple-500" /> Texnologik Stack
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-none">
                      Zamonaviy va <span className="text-gradient">
                        <DecryptText text="Barqaror Arxitektura" />
                      </span>
                    </h2>
                    <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 font-semibold leading-relaxed">
                      React 18, Vite JS, Spring Boot va PostgreSQL ashesida qurilgan yengil, ishonchli va xavfsiz texnologik poydevor.
                    </p>
                  </div>

                  {/* 3D Tech stack grid cards wrapped in TiltedCard */}
                  <div className="lg:col-span-6">
                    <TiltedCard>
                      <div className="grid grid-cols-2 gap-4 w-full h-[360px] p-2">
                        <motion.div 
                          whileHover={{ scale: 1.04, rotateY: 8, rotateX: -4 }}
                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col items-center justify-center text-center cursor-pointer shadow-sm"
                        >
                          <svg className="h-10 w-10 animate-spin text-fuchsia-400" style={{ animationDuration: "10s" }} viewBox="0 0 100 100" fill="none">
                            <ellipse cx="50" cy="50" rx="8" ry="20" transform="rotate(0 50 50)" stroke="currentColor" strokeWidth="2.5" />
                            <ellipse cx="50" cy="50" rx="8" ry="20" transform="rotate(60 50 50)" stroke="currentColor" strokeWidth="2.5" />
                            <ellipse cx="50" cy="50" rx="8" ry="20" transform="rotate(120 50 50)" stroke="currentColor" strokeWidth="2.5" />
                            <circle cx="50" cy="50" r="4.5" fill="currentColor" />
                          </svg>
                          <h4 className="text-sm font-black text-slate-800 dark:text-white mt-2">{t("dynamic.startuppitch.react_18")}</h4>
                          <p className="text-[9px] text-slate-450 font-bold">{t("dynamic.startuppitch.spa_client_frontend")}</p>
                        </motion.div>
                        
                        <motion.div 
                          whileHover={{ scale: 1.04, rotateY: -8, rotateX: -4 }}
                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col items-center justify-center text-center cursor-pointer shadow-sm"
                        >
                          <svg className="h-10 w-10 text-purple-500" viewBox="0 0 100 100" fill="none">
                            <path d="M85 20L50 85L15 20H85Z" fill="currentColor" opacity="0.15" />
                            <path d="M52 10L35 50H50L45 90L70 42H52L52 10Z" fill="currentColor" />
                          </svg>
                          <h4 className="text-sm font-black text-slate-800 dark:text-white mt-2">{t("dynamic.startuppitch.vite_js")}</h4>
                          <p className="text-[9px] text-slate-450 font-bold">{t("dynamic.startuppitch.fast_hmr_bundler")}</p>
                        </motion.div>
                        
                        <motion.div 
                          whileHover={{ scale: 1.04, rotateY: 8, rotateX: 4 }}
                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col items-center justify-center text-center cursor-pointer shadow-sm"
                        >
                          <svg className="h-10 w-10 text-purple-500" viewBox="0 0 100 100" fill="none">
                            <rect x="15" y="15" width="70" height="70" rx="16" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2.5" />
                            <path d="M50 25C40 35 40 45 42 62C47 64 57 64 65 52C70 45 70 35 50 25Z" fill="currentColor" />
                          </svg>
                          <h4 className="text-sm font-black text-slate-800 dark:text-white mt-2">{t("dynamic.startuppitch.spring_boot")}</h4>
                          <p className="text-[9px] text-slate-450 font-bold">{t("dynamic.startuppitch.secure_java_api")}</p>
                        </motion.div>
                        
                        <motion.div 
                          whileHover={{ scale: 1.04, rotateY: -8, rotateX: 4 }}
                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col items-center justify-center text-center cursor-pointer shadow-sm"
                        >
                          <svg className="h-10 w-10 text-indigo-500" viewBox="0 0 100 100" fill="none">
                            <path d="M25 35C25 25 38 20 50 20C62 20 75 25 75 35C75 45 75 60 75 70C75 80 62 80 50 80C38 80 25 80 25 70C25 60 25 45 25 35Z" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="2.5" />
                          </svg>
                          <h4 className="text-sm font-black text-slate-800 dark:text-white mt-2">{t("dynamic.startuppitch.postgresql")}</h4>
                          <p className="text-[9px] text-slate-450 font-bold">{t("dynamic.startuppitch.robust_sql_storage")}</p>
                        </motion.div>
                      </div>
                    </TiltedCard>
                  </div>
                </div>
              )}

              {/* SLIDE 10: FINAL (CONTACTS & ROCKET) */}
              {currentSlide === 9 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full text-left">
                  <div className="lg:col-span-6 space-y-6">
                    <div className="inline-flex items-center gap-2 bg-purple-55/10 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-500/20 px-5 py-2 rounded-full text-xs font-black uppercase">
                      <HelpCircle className="h-4 w-4 text-purple-500" /> Savol-Javoblar (Q&A)
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none text-slate-900 dark:text-white animate-shiny-sweep">
                      <DecryptText text="E'tiboringiz uchun Katta Rahmat!" />
                    </h1>

                    <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 font-semibold">
                      LMSHub — Kelajak Ta'limining Raqamli Poydevori.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
                        <p className="text-[9px] text-purple-600 font-black uppercase tracking-wider">{t("dynamic.startuppitch.aloqa")}</p>
                        <p className="text-sm font-black text-slate-800 dark:text-white mt-1">{t("dynamic.startuppitch.lmshubuz")}</p>
                        <p className="text-[10px] text-slate-450 font-medium mt-0.5">{t("dynamic.startuppitch.infolmshubuz")}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
                        <p className="text-[9px] text-purple-600 font-black uppercase tracking-wider">{t("dynamic.startuppitch.sloqan")}</p>
                        <p className="text-xs font-black text-slate-800 dark:text-white mt-1">"Bozorni birgalikda yondiramiz! 🚀"</p>
                      </div>
                    </div>
                  </div>

                  {/* Rocket launcher visual wrapped in TiltedCard */}
                  <div className="lg:col-span-6">
                    <TiltedCard>
                      <div className="relative w-full h-[360px] bg-slate-100/50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between items-center overflow-hidden shadow-inner">
                        <div className="flex-1 flex flex-col items-center justify-center w-full relative">
                          {/* Rocket */}
                          <motion.div 
                            animate={rocketLaunched ? { y: -500, scale: 0.1, rotate: [0, -5, 5, 0], opacity: 0 } : { y: [0, -6, 0] }}
                            transition={rocketLaunched ? { duration: 1.2, ease: "easeIn" } : { repeat: Infinity, duration: 3, ease: "easeInOut" }}
                            className="text-7xl cursor-pointer select-none filter drop-shadow-[0_0_15px_rgba(16,185,129,0.35)] z-10"
                            onClick={() => {
                              setRocketLaunched(true);
                              setTimeout(() => setRocketLaunched(false), 3000);
                            }}
                          >
                            🚀
                          </motion.div>
                          
                          {/* Rocket flame */}
                          {rocketLaunched && (
                            <motion.div 
                              initial={{ opacity: 0.8, scale: 0.5 }}
                              animate={{ opacity: 0, scale: 2 }}
                              transition={{ duration: 1 }}
                              className="absolute w-12 h-12 bg-amber-500 rounded-full blur-md bottom-28"
                            />
                          )}
                          
                          <div className="text-center mt-6">
                            <Button 
                              onClick={() => {
                                      setRocketLaunched(true);
                                      setTimeout(() => setRocketLaunched(false), 3000);
                              }}
                              className="h-10 px-5 rounded-xl bg-gradient-premium hover:shadow-lg text-white font-bold transition-all"
                            >
                              {rocketLaunched ? "UCHMOQDA..." : "PLATFORMANI ISHGA TUSHIRISH"}
                            </Button>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">{t("dynamic.startuppitch.uchirish_uchun_tugmani_bosing")}</p>
                          </div>
                        </div>
                        
                        <div className="border-t border-slate-200 dark:border-slate-800 w-full pt-2 flex items-center justify-between text-[10px] text-slate-400">
                          <span>{t("dynamic.startuppitch.parvoz_holati")}</span>
                          <span className="text-purple-500 font-bold">{rocketLaunched ? "LAUNCHED 🛰️" : "READY FOR TAKEOFF"}</span>
                        </div>
                      </div>
                    </TiltedCard>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom slide preview navigation drawer */}
        <div className="px-6 py-4 bg-white/60 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-900/60 backdrop-blur-md z-10 shrink-0 overflow-x-auto flex gap-3 scrollbar-thin">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > currentSlide ? 1 : -1);
                setCurrentSlide(i);
              }}
              className={`flex-none w-28 p-2 rounded-lg border text-left transition-all relative overflow-hidden ${
                i === currentSlide 
                  ? "bg-purple-55/10 dark:bg-purple-500/10 border-purple-500" 
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700"
              }`}
            >
              <div className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500">Slayd 0{i + 1}</div>
              <div className="text-[10px] font-bold text-slate-850 dark:text-slate-200 truncate mt-0.5">
                {i === 0 && "LMSHub Kirish"}
                {i === 1 && "Muammo & Xaos"}
                {i === 2 && "Yechim & Orbit"}
                {i === 3 && "8 ta Rol"}
                {i === 4 && "Gemini AI"}
                {i === 5 && "Cmd+K Search"}
                {i === 6 && "Tezkor Loader"}
                {i === 7 && "Moliya & Coin"}
                {i === 8 && "Texnologiya"}
                {i === 9 && "Yakuniy Q&A"}
              </div>
              {i === currentSlide && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-500" />
              )}
            </button>
          ))}
        </div>

        {/* Footer controls inside presentation box */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-900/60 backdrop-blur-md bg-white/40 dark:bg-slate-950/40 flex items-center justify-between z-10 shrink-0">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handlePrev}
              disabled={currentSlide === 0}
              className="h-11 w-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-55 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleNext}
              disabled={currentSlide === totalSlides - 1}
              className="h-11 w-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-55 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="text-sm font-bold text-slate-650 dark:text-slate-400 bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900 px-4 py-2 rounded-xl">
            Slayd <span className="text-purple-550 dark:text-purple-400 font-black">{currentSlide + 1}</span> / {totalSlides}
          </div>

          <div className="text-xs font-bold text-slate-400 dark:text-slate-500 hidden sm:block">
            Boshqarish: <span className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 ml-1">←</span>{t("dynamic.startuppitch.va")}<span className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800">→</span> tugmalari
          </div>
        </div>
      </div>
    </div>
  );
}

