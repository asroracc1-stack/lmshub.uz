import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Target, TrendingUp, Calendar, Clock, Flame } from "lucide-react";
import { StudentIeltsDashboardDto } from "@/hooks/useOptimizedQueries";

interface MetricCardsRowProps {
  data: StudentIeltsDashboardDto;
}

export default function MetricCardsRow({ data }: MetricCardsRowProps) {
  const cards = [
    {
      title: "Target Band",
      value: data.targetBand,
      trend: data.targetBandTrend,
      trendUp: true,
      icon: <Target className="h-5 w-5 text-rose-500" />,
      iconBg: "bg-rose-50"
    },
    {
      title: "O'rtacha Ball",
      value: data.currentBand || "—",
      trend: data.averageScoreTrend,
      trendUp: true,
      icon: <TrendingUp className="h-5 w-5 text-indigo-500" />,
      iconBg: "bg-indigo-50"
    },
    {
      title: "Imtihongacha",
      value: data.daysUntilExam || "—",
      trend: "kun qoldi",
      trendUp: null,
      icon: <Calendar className="h-5 w-5 text-blue-500" />,
      iconBg: "bg-blue-50"
    },
    {
      title: "Mashq vaqti",
      value: data.totalPracticeTime,
      trend: "umumiy vaqt",
      trendUp: null,
      icon: <Clock className="h-5 w-5 text-amber-500" />,
      iconBg: "bg-amber-50"
    },
    {
      title: "Kunning streaki",
      value: data.dailyStreak,
      trend: "kun davom etmoqda",
      trendUp: true,
      icon: <Flame className="h-5 w-5 text-orange-500" />,
      iconBg: "bg-orange-50"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((card, idx) => (
        <motion.div 
          key={card.title}
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 + idx * 0.05 }}
        >
          <Card className="p-4 rounded-2xl border-primary/10 dark:border-primary/10 bg-white/60 dark:bg-[#1B1230]/60 backdrop-blur-md flex items-center gap-4 hover:shadow-glow-purple hover:border-primary/30 transition-all duration-300">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${card.iconBg} dark:bg-primary/10`}>
              {card.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-500 dark:text-muted-foreground font-medium truncate mb-0.5">{card.title}</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white truncate leading-none">{card.value}</p>
              {card.trend && (
                <p className={`text-[10px] mt-1.5 truncate ${
                  card.trendUp === true ? "text-primary font-medium" : 
                  card.trendUp === false ? "text-rose-500 font-medium" : 
                  "text-slate-400"
                }`}>
                  {card.trendUp === true ? "↗ " : card.trendUp === false ? "↘ " : ""}
                  {card.trend}
                </p>
              )}
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
