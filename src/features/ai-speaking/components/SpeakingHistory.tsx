import { useState, useEffect } from "react";
import { HistoryItem } from "../types";
import { speakingService } from "../services/speakingService";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Star, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SpeakingHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await speakingService.getHistory();
        setHistory(data);
      } catch (err) {
        console.error("Failed to load speaking history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  const getScoreBadgeClass = (score: number) => {
    if (score >= 85) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    if (score >= 75) return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display font-bold text-lg text-slate-800 dark:text-white">Speaking History</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Summary of previous practice sessions</p>
      </div>

      <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1 select-none">
        {history.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-450 font-bold border border-dashed rounded-2xl border-slate-200 dark:border-slate-800">
            No speaking history found. Start your first session!
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] hover:border-slate-350 dark:hover:border-slate-700/60 shadow-sm transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-3 group"
            >
              {/* Left Column: Topic & Date */}
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-blue-500 transition-colors">
                  {item.topic}
                </h4>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(item.date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDuration(item.duration)}
                  </span>
                </div>
              </div>

              {/* Right Column: Score & Details */}
              <div className="flex items-center gap-3 justify-between md:justify-end">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-lg">
                    {item.language}
                  </Badge>
                  
                  <Badge variant="outline" className={cn("text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border flex items-center gap-1", getScoreBadgeClass(item.score))}>
                    <Star className="w-3 h-3 fill-current" />
                    {item.score}/100
                  </Badge>
                </div>

                {/* View report CTA */}
                <button className="h-8 w-8 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-500 dark:bg-slate-900/60 dark:hover:bg-blue-950/20 text-slate-400 flex items-center justify-center transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
