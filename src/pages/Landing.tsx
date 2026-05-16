import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { roleHomePath } from "@/lib/auth";
import BrandLogo from "@/components/BrandLogo";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Users, BarChart3, X, Shield } from "lucide-react";
import TigerPlayer from "@/components/TigerPlayer";

export default function Landing() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleAuthClick = () => {
    if (user && role) {
      navigate(roleHomePath[role] || "/dashboard");
    } else {
      navigate("/signin");
    }
  };

  const handleSignUpClick = () => {
    if (user && role) {
      navigate(roleHomePath[role] || "/dashboard");
    } else {
      navigate("/signup");
    }
  };

  return (
    <div className="relative min-h-screen bg-[#f4f9f6] text-slate-800 font-sans overflow-x-hidden selection:bg-emerald-200 flex flex-col">
      {/* Abstract Background Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full border-[1px] border-emerald-500/10 pointer-events-none" />
      <div className="absolute top-[-20%] left-[-20%] w-[70vw] h-[70vw] rounded-full border-[1px] border-emerald-500/10 pointer-events-none" />
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-emerald-100/40 blur-3xl opacity-60" />
      </div>

      {/* Navbar */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? "py-3 bg-white/70 backdrop-blur-xl border-b border-white shadow-sm" : "py-5 bg-transparent"
        }`}
      >
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
            <Logo size={42} showText variant="dark" />
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#about" className="hover:text-emerald-600 transition-colors">About</a>
            <a href="#features" className="hover:text-emerald-600 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-emerald-600 transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-emerald-600 transition-colors">Contact</a>
          </nav>

          <div className="flex items-center gap-3">
            <Button 
              variant="ghost"
              onClick={() => navigate("/signin")}
              className="text-slate-600 hover:text-emerald-600 font-semibold"
            >
              Sign In
            </Button>
            <Button 
              onClick={() => navigate("/signup")}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-full px-6 shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/40 hover:-translate-y-0.5 min-w-[120px] border-none font-semibold"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section (Full viewport height) */}
      <main className="relative z-10 flex-1 flex items-center pt-24 pb-12 min-h-screen">
        <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Content */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-2xl"
          >
            <h1 className="text-5xl md:text-6xl lg:text-[5rem] font-bold text-slate-900 leading-[1.05] tracking-tight">
              Get The Full <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500 drop-shadow-sm">
                IELTS Exam
              </span> <br/>
              Experience <span className="text-slate-800">Free</span>
            </h1>
            <p className="mt-8 text-lg text-slate-600 leading-relaxed max-w-lg font-light">
              Practice Listening, Reading, Writing and Speaking with our AI-powered feedback system. Improve your band score easily.
            </p>
            
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button onClick={handleSignUpClick} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-8 h-14 text-base font-semibold shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all hover:-translate-y-1">
                Start free test
              </Button>
              <Button onClick={handleAuthClick} variant="outline" className="bg-white/60 backdrop-blur-md border-emerald-200 hover:bg-emerald-50 text-emerald-800 rounded-full px-8 h-14 text-base font-semibold transition-all hover:-translate-y-1 shadow-sm hover:shadow-md">
                Get free trial
              </Button>
            </div>
          </motion.div>

          {/* Right Content */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative h-[500px] lg:h-[650px] w-full flex items-center justify-center"
          >
            {/* Big Green Circle */}
            <div className="absolute inset-0 bg-emerald-500 rounded-full scale-[0.85] shadow-2xl shadow-emerald-500/20 overflow-hidden flex items-center justify-center border-4 border-white/50">
               <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-500 opacity-90" />
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
            </div>

            {/* Tiger / Student Placeholder */}
            <div className="relative z-10 w-full h-full flex items-end justify-center pb-8">
               <TigerPlayer text="IELTS is easy! 🚀" size={480} />
            </div>

            {/* Floating Card 1 */}
            <motion.div 
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-24 right-4 bg-white/95 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-white/50 flex items-center gap-4 z-20"
            >
              <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">1000+</p>
                <p className="text-xs text-slate-500 font-medium">Practice Tests</p>
              </div>
            </motion.div>

            {/* Floating Card 2 */}
            <motion.div 
              animate={{ y: [0, 15, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-32 right-12 bg-white/95 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-white/50 flex items-center gap-4 z-20"
            >
              <div className="h-12 w-12 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">10K+</p>
                <p className="text-xs text-slate-500 font-medium">Active Students</p>
              </div>
            </motion.div>

            {/* Floating Card 3 */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute top-1/2 -left-6 bg-white/95 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-white/50 flex items-center gap-4 z-20"
            >
              <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">AI Powered</p>
                <p className="text-xs text-slate-500 font-medium">System</p>
              </div>
            </motion.div>

            {/* Floating Card 4 */}
            <motion.div 
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              className="absolute bottom-12 left-10 bg-white/95 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-white/50 flex items-center gap-4 z-20 hidden md:flex"
            >
              <div className="h-12 w-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Real Exam</p>
                <p className="text-xs text-slate-500 font-medium">Experience</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
