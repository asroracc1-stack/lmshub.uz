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

