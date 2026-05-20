import React from "react";
import { useNavigate } from "react-router-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound(): JSX.Element {
  const navigate = useNavigate();

  const goHome = () => navigate("/", { replace: true });

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-12 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-3xl w-full text-center space-y-6">
        <div className="mx-auto">
          {/* Prefer DotLottieReact; keep iframe fallback below for safety */}
          <div className="mx-auto" aria-hidden>
            <DotLottieReact
              src="https://lottie.host/9f391db8-29ed-4dd9-a719-de803b065547/3hc778SPKu.lottie"
              loop
              autoplay
              style={{ width: 400, height: 400 }}
            />
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white">Ops! Sahifa topilmadi</h1>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
          Kechirasiz, siz qidirayotgan sahifa o'chirilgan yoki ko'chirilgan bo'lishi mumkin. Balki link noto'g'ri yozilgandir — biz uni topib keltiramiz.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={goHome}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-lg font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <Home className="h-5 w-5" /> Bosh sahifaga qaytish
          </button>

          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border border-border text-slate-900 dark:text-slate-200 px-4 py-3 rounded-lg font-medium shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="h-4 w-4" /> Orqaga
          </button>
        </div>

        {/* Fallback iframe in case DotLottieReact cannot run in an environment */}
        <div className="mt-6 text-xs text-muted-foreground">
          Agar animatsiya ko'rinmasa, sahifani yangilang yoki brauzerni tekshiring.
        </div>
      </div>
    </div>
  );
}
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Compass } from "lucide-react";
import TigerPlayer from "@/components/TigerPlayer";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [exitMode, setExitMode] = useState(false);

  useEffect(() => {
    console.error("404: Route not found:", location.pathname);
  }, [location.pathname]);

  const handleBack = () => {
    setExitMode(true);
    setTimeout(() => {
      if (window.history.state && window.history.state.idx > 0) {
        navigate(-1);
      } else {
        navigate("/", { replace: true });
      }
    }, 1500);
  };

  if (exitMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white overflow-hidden">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="text-center"
        >
          <TigerPlayer text="Xayr, yana kutamiz! 👋" size={350} />
          <h2 className="text-3xl font-bold mt-6 tracking-tight text-white/90">
            O'z yo'lingizga qaytmoqdasiz...
          </h2>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 text-white">
      {/* Deep Dark Neon Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-4xl px-4 flex flex-col md:flex-row-reverse items-center justify-center gap-12"
      >
        <div className="glass p-8 rounded-3xl border border-white/10 shadow-2xl bg-slate-900/40 backdrop-blur-md flex-shrink-0 relative">
           <div className="absolute -top-6 -right-6 h-16 w-16 bg-blue-500 rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-blue-500/50">
             <Compass className="h-8 w-8 text-white" />
           </div>
           <TigerPlayer text="Oops! Bu sahifa adashib qoldi 🐾" size={280} />
        </div>

        <div className="text-center md:text-left">
          <h1 className="font-display text-7xl md:text-9xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent leading-none">
            404
          </h1>
          <p className="mt-6 font-display text-2xl md:text-3xl font-semibold text-slate-100">
            Sahifa topilmadi
          </p>
          <p className="mt-4 text-slate-400 max-w-md leading-relaxed text-lg font-light">
            Siz qidirayotgan sahifa o'chirilgan yoki manzili o'zgargan bo'lishi mumkin. Iltimos, manzilni tekshirib qayta urinib ko'ring.
          </p>
          <p className="mt-2 text-xs text-slate-500 font-mono opacity-60">
            {location.pathname}
          </p>

          <div className="mt-8 flex flex-wrap justify-center md:justify-start gap-4">
            <Button 
              variant="outline" 
              size="lg" 
              onClick={handleBack} 
              className="glass border-white/20 text-white hover:bg-blue-500/20 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgb(59,130,246,0.3)] transition-all duration-300 rounded-xl h-12 px-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Orqaga
            </Button>
            <Button asChild size="lg" className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl h-12 px-6 shadow-lg shadow-blue-500/30 border-none">
              <Link to="/">
                <Home className="h-4 w-4 mr-2" /> Bosh sahifaga
              </Link>
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
