import { useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Users, GraduationCap, Calendar as CalendarIcon, 
  ArrowUpRight, Heart, TrendingUp, BookOpen, Users2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAdminDashboard } from "@/hooks/useOptimizedQueries";
import TigerPlayer from "@/components/TigerPlayer";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import WelcomeBanner from "@/components/shared/WelcomeBanner";

export default function AdministratorDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading, isError } = useAdminDashboard();

  const statCards = useMemo(() => [
    { label: "O'qituvchilar", value: stats?.teachersCount ?? 0, growth: stats?.teacherGrowth ?? 0, icon: GraduationCap, color: "text-blue-500", bg: "bg-blue-500/10", to: "/administrator/teachers", accent: "#3b82f6" },
    { label: "Talabalar",     value: stats?.studentsCount  ?? 0, growth: stats?.studentGrowth  ?? 0, icon: Users,         color: "text-emerald-500", bg: "bg-emerald-500/10", to: "/administrator/students",  accent: "#10b981" },
    { label: "Ota-onalar",   value: stats?.parentsCount   ?? 0, growth: 0,                          icon: Heart,         color: "text-pink-500",    bg: "bg-pink-500/10",    to: "/administrator/parents",   accent: "#ec4899" },
    { label: "Guruhlar",     value: stats?.groupsCount    ?? 0, growth: 0,                          icon: Users2,        color: "text-cyan-500",    bg: "bg-cyan-500/10",    to: "/administrator/groups",    accent: "#06b6d4" },
    { label: "Tadbirlar",    value: stats?.eventsCount    ?? 0, growth: stats?.eventGrowth     ?? 0, icon: CalendarIcon,  color: "text-amber-500",  bg: "bg-amber-500/10",  to: "/administrator/calendar",  accent: "#f59e0b" },
    { label: "Kurslar",      value: 0,                          growth: 0,                          icon: BookOpen,      color: "text-indigo-500", bg: "bg-indigo-500/10", to: "/administrator/subjects",  accent: "#6366f1" },
  ], [stats]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
        <TigerPlayer text="Xatolik yuz berdi... 🐯🛠️" size={200} />
        <p className="text-muted-foreground">Ma'lumotlarni yuklashda xatolik yuz berdi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <WelcomeBanner />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="cursor-pointer"
            onClick={() => navigate(s.to)}
          >
            <Card className="p-5 border border-slate-200 dark:border-white/5 shadow-sm bg-white dark:bg-slate-900/40 rounded-xl group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden h-full">
              <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: s.accent }} />

              <div className="flex items-start justify-between mb-3">
                <div className={cn("p-2.5 rounded-lg transition-all group-hover:scale-110", s.bg)}>
                  <s.icon className={cn("h-5 w-5", s.color)} />
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 group-hover:text-slate-500 transition-all duration-200" />
              </div>

              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{s.label}</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-3">
                {isLoading ? <span className="inline-block w-10 h-7 bg-slate-100 dark:bg-white/10 rounded animate-pulse" /> : s.value.toLocaleString()}
              </p>

              {s.growth !== 0 && (
                <div className={cn(
                  "flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md w-fit",
                  s.growth >= 0
                    ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10"
                    : "text-red-600 bg-red-50 dark:bg-red-500/10"
                )}>
                  <TrendingUp className={cn("h-3 w-3", s.growth < 0 && "rotate-180")} />
                  {s.growth > 0 ? `+${s.growth.toFixed(1)}%` : `${s.growth.toFixed(1)}%`}
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card className="p-8 border-dashed border-2 flex flex-col items-center justify-center text-center space-y-4">
          <TigerPlayer text="Yangi modullar yo'lda! 🐯🚀" size={150} />
          <div className="space-y-1">
            <h3 className="font-bold text-lg">Tez orada...</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Darslar, vazifalar va avtomatlashtirilgan hisobotlar moduli tez orada ishga tushiriladi.
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
