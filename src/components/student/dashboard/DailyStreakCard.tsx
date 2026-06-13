import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Trophy, Check, Flame } from "lucide-react";
import { StudentIeltsDashboardDto } from "@/hooks/useOptimizedQueries";

interface DailyStreakCardProps {
  data: StudentIeltsDashboardDto;
}

export default function DailyStreakCard({ data }: DailyStreakCardProps) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card className="p-5 flex flex-col justify-between h-full rounded-3xl border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm hover:shadow-md transition-all duration-300">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            Kunlik streak <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
          </h3>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{data.dailyStreak}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">kun davom etmoqda</p>

          <div className="flex justify-between items-center px-1">
            {days.map((day, idx) => {
              const isChecked = data.weekChecklist[idx];
              return (
                <div key={day} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{day}</span>
                  <div 
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      isChecked 
                        ? "bg-purple-500 text-white" 
                        : "border-2 border-slate-200 dark:border-slate-700 text-transparent"
                    }`}
                  >
                    {isChecked && <Check className="h-3.5 w-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 bg-purple-50 dark:bg-primary/10 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500 dark:bg-primary flex items-center justify-center shadow-sm">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-purple-800 dark:text-primary">Eng uzun streak</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-900 dark:text-white">{data.longestStreak} kun</p>
            <p className="text-[9px] text-slate-500 dark:text-slate-400">(15.04.2024)</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
