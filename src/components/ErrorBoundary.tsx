import { Component, ErrorInfo, ReactNode } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import TigerPlayer from "./TigerPlayer";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950 px-4">
        <div className="absolute inset-0 grid-bg opacity-30" aria-hidden />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full blur-[120px] bg-red-500/10"
          aria-hidden
        />

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 max-w-lg w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[3rem] p-10 shadow-2xl border border-red-500/20 text-center"
        >
          <div className="mb-6 scale-125">
            <TigerPlayer text="Sparkles yo'qolib qoldi... 🐯" size={250} />
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Nimadir noto'g'ri ketdi</h1>
          <p className="mt-4 text-slate-500 dark:text-slate-400 text-sm font-light leading-relaxed">
            Kutilmagan xatolik yuz berdi. Iltimos sahifani qayta yuklang yoki tizim administratoriga murojaat qiling.
          </p>

          {this.state.error?.message && (
            <div className="mt-6 text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2">Texnik xatolik:</p>
              <pre className="text-[11px] font-mono bg-red-500/5 dark:bg-red-500/10 rounded-xl p-4 overflow-x-auto text-red-600 dark:text-red-400 border border-red-500/10 max-h-32 custom-scrollbar">
                {this.state.error.message}
              </pre>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3">
            <Button onClick={this.handleReload} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-lg">
              <RefreshCw className="h-4 w-4 mr-2" /> Sahifani qayta yuklash
            </Button>
            <Button variant="ghost" className="w-full h-14 rounded-2xl text-slate-500 font-bold" onClick={() => (window.location.href = "/")}>
              <Home className="h-4 w-4 mr-2" /> Bosh sahifaga qaytish
            </Button>
          </div>
        </motion.div>
        
        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(239, 68, 68, 0.2); border-radius: 10px; }
        `}</style>
      </div>
    );
  }
}
