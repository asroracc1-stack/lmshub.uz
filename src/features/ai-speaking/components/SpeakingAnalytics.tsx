import { useState, useEffect } from "react";
import { SpeakingStats } from "../types";
import { speakingService } from "../services/speakingService";
import { Flame, BookOpen, Trophy, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function SpeakingAnalytics() {
  const [stats, setStats] = useState<SpeakingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await speakingService.getStatistics();
        setStats(data);
      } catch (err) {
        console.error("Failed to load statistics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const RadialProgress = ({ percentage, size = 64, strokeWidth = 6, colorClass = "text-blue-500" }: { percentage: number; size?: number; strokeWidth?: number; colorClass?: string }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="text-slate-100 dark:text-slate-800"
            strokeWidth={strokeWidth}
            stroke="currentColor"
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={cn("transition-all duration-1000 ease-out", colorClass)}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
          />
        </svg>
        <span className="absolute text-xs font-black text-slate-855 dark:text-white">
          {percentage}%
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  const activeStats = stats || {
    pronunciation: 80,
    fluency: 78,
    grammar: 82,
    vocabulary: 76,
    confidence: 88,
    dailySpeakingTime: 15,
    streak: 5,
    wordsLearned: 210,
    sessionsCompleted: 12
  };

  const statsList = [
    { label: "Pronunciation", val: activeStats.pronunciation, color: "text-blue-500" },
    { label: "Fluency", val: activeStats.fluency, color: "text-purple-500" },
    { label: "Grammar", val: activeStats.grammar, color: "text-indigo-500" },
    { label: "Vocabulary", val: activeStats.vocabulary, color: "text-teal-500" },
    { label: "Confidence", val: activeStats.confidence, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      
      {/* Gamified Badges Header Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Streak */}
        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 flex flex-col items-center justify-center text-center">
          <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
          <h4 className="text-base font-black text-slate-855 dark:text-white mt-1.5">{activeStats.streak} Days</h4>
          <p className="text-[9px] font-bold text-slate-455 uppercase tracking-wider">Active Streak</p>
        </div>

        {/* Words Learned */}
        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 flex flex-col items-center justify-center text-center">
          <BookOpen className="w-6 h-6 text-blue-500" />
          <h4 className="text-base font-black text-slate-855 dark:text-white mt-1.5">{activeStats.wordsLearned}</h4>
          <p className="text-[9px] font-bold text-slate-455 uppercase tracking-wider">Words Learned</p>
        </div>

        {/* Sessions Completed */}
        <div className="p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 flex flex-col items-center justify-center text-center">
          <Trophy className="w-6 h-6 text-amber-500" />
          <h4 className="text-base font-black text-slate-855 dark:text-white mt-1.5">{activeStats.sessionsCompleted}</h4>
          <p className="text-[9px] font-bold text-slate-455 uppercase tracking-wider">Sessions</p>
        </div>
      </div>

      {/* Speaking Skill Meters */}
      <Card className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-sm space-y-4">
        <div>
          <h4 className="font-bold text-sm text-slate-850 dark:text-white">Skill Meters</h4>
          <p className="text-[10px] text-slate-500">Fluency components summary</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {statsList.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center justify-center text-center space-y-2">
              <RadialProgress percentage={stat.val} colorClass={stat.color} />
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Weekly Progress Simulated Chart */}
      <Card className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-bold text-sm text-slate-850 dark:text-white">Today's Practice Target</h4>
            <p className="text-[10px] text-slate-500">Daily goal: 20 minutes</p>
          </div>
          <span className="text-xs font-black text-blue-500">
            {activeStats.dailySpeakingTime}/20m
          </span>
        </div>

        <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" 
            style={{ width: `${Math.min(100, (activeStats.dailySpeakingTime / 20) * 100)}%` }}
          />
        </div>

        <div className="pt-2">
          <p className="text-[10px] font-bold text-slate-455 uppercase tracking-wider mb-3">Weekly Performance</p>
          <div className="flex items-end justify-between h-20 px-1 pt-2 select-none">
            {[
              { day: "Mon", time: 12 },
              { day: "Tue", time: 15 },
              { day: "Wed", time: 8 },
              { day: "Thu", time: 20 },
              { day: "Fri", time: 10 },
              { day: "Sat", time: activeStats.dailySpeakingTime },
              { day: "Sun", time: 0 },
            ].map((d, index) => (
              <div key={d.day} className="flex flex-col items-center gap-1.5 flex-1">
                <div className="w-full relative group">
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-800 text-white text-[9px] font-bold py-0.5 px-1.5 rounded-md shadow-md whitespace-nowrap z-10">
                    {d.time}m
                  </div>
                  <div 
                    className={cn(
                      "w-4 mx-auto rounded-t-md transition-all duration-500",
                      index === 5 
                        ? "bg-blue-500" 
                        : "bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700"
                    )}
                    style={{ height: `${(d.time / 20) * 60}px` }}
                  />
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
