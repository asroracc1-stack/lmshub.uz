import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/axios";
import { CheckCircle2, Circle, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

interface DailyTask {
  title: string;
  current: number;
  target: number;
  unit: string;
  isCompleted: boolean;
}

export default function DailyTasks() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await api.get("/user/stats/daily-tasks");
        setTasks(res.data);
        
        const allDone = res.data.every((t: DailyTask) => t.isCompleted);
        if (allDone && res.data.length > 0) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#10b981", "#34d399", "#059669"]
          });
        }
      } catch (e) {
        console.error("Daily tasks fetch failed", e);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  if (loading) return (
    <Card className={cn(
      "p-8 border rounded-[2rem] animate-pulse h-full",
      isDark ? "bg-slate-900/40 border-white/5" : "bg-white border-slate-100 shadow-slate-200/50"
    )}>
      <div className={cn("h-6 w-32 rounded mb-6", isDark ? "bg-white/10" : "bg-slate-100")} />
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className={cn("h-12 rounded-xl", isDark ? "bg-white/5" : "bg-slate-50")} />)}
      </div>
    </Card>
  );

  const allCompleted = tasks.length > 0 && tasks.every(t => t.isCompleted);

  return (
    <Card className={cn(
      "p-8 border shadow-2xl rounded-[2rem] relative overflow-hidden group h-full transition-all duration-500",
      isDark ? "bg-slate-900/40 backdrop-blur-md border-white/5" : "bg-white border-slate-100 shadow-slate-200/50"
    )}>
      <div className={cn(
        "absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700",
        isDark ? "bg-emerald-500/5" : "bg-emerald-500/10"
      )} />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-8">
          <h3 className={cn("font-display font-black text-2xl tracking-tight", isDark ? "text-white" : "text-slate-900")}>Bugungi maqsadlar</h3>
          {allCompleted && (
            <span className="inline-flex items-center text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-emerald-500 text-white rounded-full animate-bounce shadow-lg shadow-emerald-500/20">
              Super natija! 🔥
            </span>
          )}
        </div>

        <div className="space-y-7 flex-1">
          {tasks.map((task, i) => (
            <motion.div 
              key={task.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="space-y-3"
            >
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center transition-colors",
                    task.isCompleted 
                      ? "bg-emerald-500/10 text-emerald-500" 
                      : isDark ? "bg-white/5 text-slate-700" : "bg-slate-100 text-slate-400"
                  )}>
                    {task.isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  </div>
                  <span className={cn(
                    "font-bold transition-colors",
                    task.isCompleted 
                      ? (isDark ? "text-emerald-400" : "text-emerald-600")
                      : (isDark ? "text-slate-400" : "text-slate-600")
                  )}>
                    {task.title}
                  </span>
                </div>
                <span className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-slate-500" : "text-slate-400")}>
                  {task.current} / {task.target} {task.unit}
                </span>
              </div>
              <div className={cn(
                "relative h-2 w-full rounded-full overflow-hidden border",
                isDark ? "bg-white/5 border-white/5" : "bg-slate-100 border-slate-100 shadow-inner"
              )}>
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${Math.min(100, (task.current / task.target) * 100)}%` }}
                   transition={{ duration: 1, delay: i * 0.1 + 0.5, ease: "circOut" }}
                   className={cn(
                     "h-full rounded-full transition-all duration-700 shadow-lg",
                     task.isCompleted 
                       ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-emerald-500/30" 
                       : isDark ? "bg-slate-800" : "bg-slate-300"
                   )}
                />
              </div>
            </motion.div>
          ))}
        </div>

        <AnimatePresence>
          {allCompleted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "mt-8 p-5 rounded-2xl border text-center transition-all duration-500",
                isDark ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-100"
              )}
            >
              <div className={cn("flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest mb-2", isDark ? "text-emerald-400" : "text-emerald-600")}>
                <Trophy size={16} />
                <span>Kunlik maqsad bajarildi!</span>
              </div>
              <p className={cn("text-[11px] font-bold leading-relaxed", isDark ? "text-emerald-50/50" : "text-emerald-900/60")}>
                Siz bugun ajoyib natija ko'rsatdingiz. <br/> Ertaga ham shunday davom eting!
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}
