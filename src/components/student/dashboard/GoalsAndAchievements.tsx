import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Circle, Flame, Star, Crown, BookOpen, Mic, PenTool, Headphones } from "lucide-react";
import { StudentIeltsDashboardDto } from "@/hooks/useOptimizedQueries";

interface GoalsAndAchievementsProps {
  data: StudentIeltsDashboardDto;
}

export default function GoalsAndAchievements({ data }: GoalsAndAchievementsProps) {
  const { t } = useTranslation();
  
  const getGoalIcon = (type: string) => {
    switch(type) {
      case "test": return <BookOpen className="h-4 w-4 text-purple-500" />;
      case "practice": return <Mic className="h-4 w-4 text-blue-500" />;
      case "vocabulary": return <Flame className="h-4 w-4 text-orange-500" />;
      case "writing": return <PenTool className="h-4 w-4 text-purple-500" />;
      case "listening": return <Headphones className="h-4 w-4 text-indigo-500" />;
      default: return <CheckCircle2 className="h-4 w-4 text-slate-500" />;
    }
  };

  const getAchievementIcon = (type: string) => {
    switch(type) {
      case "streak": return <Flame className="h-5 w-5 text-purple-500" />;
      case "star": return <Star className="h-5 w-5 text-purple-500" />;
      case "top10": return <Crown className="h-5 w-5 text-amber-500" />;
      default: return <Star className="h-5 w-5 text-slate-500" />;
    }
  };

  const getAchievementBg = (type: string) => {
    switch(type) {
      case "streak": return "bg-purple-100 dark:bg-purple-500/10";
      case "star": return "bg-purple-100 dark:bg-purple-500/10";
      case "top10": return "bg-amber-100 dark:bg-amber-500/10";
      default: return "bg-slate-100 dark:bg-slate-700";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
      
      {/* Today's Goals */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="h-full">
        <Card className="p-5 rounded-3xl border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-slate-900 dark:text-white">{t("dynamic.goalsandachievements.bugungi_maqsadlar")}</h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">4/5 bajarildi</span>
          </div>

          <div className="flex-1 space-y-4">
            {data.todayGoals.map((goal) => (
              <div key={goal.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-slate-50 dark:bg-slate-700 border ${goal.isCompleted ? 'border-purple-200 dark:border-purple-500/30' : 'border-slate-200 dark:border-slate-600'}`}>
                  {getGoalIcon(goal.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${goal.isCompleted ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                    {goal.title}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{goal.subtitle}</p>
                </div>
                
                <div className="shrink-0 flex items-center">
                  {goal.isCompleted ? (
                    <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  ) : goal.progress !== null ? (
                    <div className="relative w-8 h-8 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-slate-100 dark:text-slate-600" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                        <path className="text-blue-500" strokeDasharray={`${goal.progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                      </svg>
                      <span className="absolute text-[8px] font-bold text-blue-500">{goal.progress}%</span>
                    </div>
                  ) : (
                    <Circle className="h-5 w-5 text-slate-200 dark:text-slate-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Achievements */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="h-full">
        <Card className="p-5 rounded-3xl border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-bold text-slate-900 dark:text-white">{t("dynamic.goalsandachievements.yutuqlar")}</h3>
            <button className="text-[10px] text-purple-600 dark:text-primary font-medium flex items-center gap-1 hover:underline">
              Barchasini ko'rish <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="flex-1 space-y-5">
            {data.achievements.map((ach) => (
              <div key={ach.id} className="flex gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${getAchievementBg(ach.iconType)}`}>
                  {getAchievementIcon(ach.iconType)}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate mb-0.5">{ach.title}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">
                    {ach.description}
                  </p>
                </div>
                <div className="shrink-0 flex items-start pt-1">
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">{ach.date}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

    </div>
  );
}
