import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Clock, 
  Trash2, 
  RefreshCw, 
  Eye, 
  Loader2, 
  CheckCircle2, 
  BookOpen, 
  TrendingUp, 
  Award, 
  Percent, 
  Activity, 
  FileText 
} from "lucide-react";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface ReadingHistoryProps {
  basePath: string;
}

interface HistoryItem {
  attemptId: string;
  examId: string;
  testTitle: string;
  passageTitle: string;
  finishedAt: string;
  durationMinutes: number;
  difficulty: string;
  partType: string;
  correctAnswers: number;
  totalQuestions: number;
  overallBand: number;
}

interface Statistics {
  overallReadingBand: number;
  totalTestsSolved: number;
  totalCorrectAnswers: number;
  totalQuestionsCount: number;
  accuracy: number;
  highestBand: number;
  averageTimeMinutes: number;
  completionRate: number;
}

export const ReadingHistory: React.FC<ReadingHistoryProps> = ({ basePath }) => {
  const navigate = useNavigate();
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const size = 8;

  const loadData = async (reset = false) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentPage = reset ? 0 : page;
      const historyRes = await api.get(`/user/reading/history?page=${currentPage}&size=${size}`);
      const statsRes = await api.get("/user/reading/statistics");

      const items = historyRes.data.content || [];
      if (reset) {
        setHistoryItems(items);
        setPage(1);
      } else {
        setHistoryItems(prev => [...prev, ...items]);
        setPage(prev => prev + 1);
      }

      setHasMore(!historyRes.data.last);
      setStatistics(statsRes.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Natijalarni yuklashda xatolik yuz berdi.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  const handleDeleteAttempt = async (attemptId: string) => {
    if (!window.confirm("Haqiqatdan ham ushbu urinish natijasini o'chirib tashlamoqchimisiz?")) {
      return;
    }

    try {
      await api.delete(`/user/reading/history/${attemptId}`);
      toast.success("Urinish muvaffaqiyatli o'chirildi.");
      loadData(true); // reload list and stats
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "O'chirishda xatolik yuz berdi.");
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (String(diff).toLowerCase()) {
      case "easy":
      case "oson":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200/50";
      case "medium":
      case "orta":
      case "o'rtacha":
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200/50";
      default:
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200/50";
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50/60 dark:bg-[#070311] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate(`${basePath}/mocks/c/reading`)}
            className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c0817] text-slate-700 dark:text-slate-200 font-bold text-xs gap-1.5 h-11 px-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Orqaga
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
              Bajarilgan Reading Testlari
            </h1>
          </div>
        </div>

        {loading && historyItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
            <p className="text-sm font-semibold text-slate-400">Natijalar yuklanmoqda...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left: Completed Attempts List */}
            <div className="lg:col-span-2 space-y-4">
              {historyItems.length === 0 ? (
                <Card className="p-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d091a] text-center space-y-4 shadow-xs">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 flex items-center justify-center text-indigo-500">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-slate-700 dark:text-slate-200">Sizda hali bajarilgan testlar mavjud emas</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">Tarixni shakllantirish uchun Reading mock testlaridan birini boshlang va yakunlang.</p>
                  <Button asChild className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm">
                    <Link to={`${basePath}/mocks/c/reading`}>Testlarni ko'rish</Link>
                  </Button>
                </Card>
              ) : (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-4"
                >
                  <AnimatePresence mode="popLayout">
                    {historyItems.map((item, idx) => (
                      <motion.div 
                        key={item.attemptId} 
                        variants={cardVariants}
                        layout
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={{ y: -2 }}
                        className="rounded-3xl border border-slate-200/80 dark:border-slate-800/60 bg-white dark:bg-[#0c0817] p-6 shadow-sm hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all duration-200 relative overflow-hidden"
                      >
                        {/* Top-right BEPUL Badge */}
                        <div className="absolute top-4 right-4">
                          <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-300/60 dark:border-indigo-800/50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            BEPUL
                          </span>
                        </div>

                        {/* Attempt Details */}
                        <div className="space-y-3 flex-1 min-w-0 pr-16">
                          <h3 className="text-lg md:text-xl font-black text-indigo-600 dark:text-indigo-400 truncate">
                            {(() => {
                              const t = item.testTitle || (item as any).title || (item as any).examTitle || "Reading Test";
                              return String(t).startsWith("Test") ? t : `Test ${idx + 1} | ${t}`;
                            })()}
                          </h3>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-200/60 font-extrabold px-2.5 py-1 rounded-full">
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-indigo-500" />
                              {item.correctAnswers || 0}/{item.totalQuestions || 0} to'g'ri
                            </Badge>
                            <Badge variant="outline" className="rounded-full bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-2.5 py-1">
                              📅 {item.finishedAt ? new Date(item.finishedAt).toISOString().split('T')[0] : 'Yangi'}
                            </Badge>
                            <Badge variant="outline" className="rounded-full bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-2.5 py-1">
                              <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                              {item.durationMinutes} daq
                            </Badge>
                            <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 font-semibold", getDifficultyColor(item.difficulty))}>
                              ⚡ {item.difficulty}
                            </Badge>
                            <Badge variant="outline" className="rounded-full bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-2.5 py-1">
                              <BookOpen className="h-3.5 w-3.5 mr-1 text-slate-400" />
                              {item.partType === "full" ? "To'liq test" : `${item.partType} qism`}
                            </Badge>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0">
                          <Button 
                            asChild
                            variant="outline"
                            className="rounded-xl h-10 px-4 font-extrabold text-xs gap-1.5 border-indigo-500/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 shadow-xs"
                          >
                            <Link to={`${basePath}/mocks/take/${item.examId}?review=true&attemptId=${item.attemptId}`}>
                              <Eye className="h-4 w-4" />
                              Ko'rib chiqish
                            </Link>
                          </Button>
                          
                          <Button 
                            asChild
                            className="rounded-xl h-10 px-4 font-extrabold text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
                          >
                            <Link to={`${basePath}/mocks/take/${item.examId}`}>
                              <RefreshCw className="h-4 w-4" />
                              Qaytadan
                            </Link>
                          </Button>

                          <Button 
                            variant="outline"
                            onClick={() => handleDeleteAttempt(item.attemptId)}
                            className="rounded-xl h-10 px-3 font-extrabold text-xs gap-1 border-rose-200 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            title="O'chirish"
                          >
                            <Trash2 className="h-4 w-4 mr-0.5" />
                            O'chirish
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button 
                    disabled={loadingMore} 
                    onClick={() => loadData(false)}
                    className="rounded-xl bg-white dark:bg-[#0c0817] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider px-6 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 shadow-xs"
                  >
                    {loadingMore ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                    Yuklash
                  </Button>
                </div>
              )}
            </div>

            {/* Right: Statistics Sidebar */}
            <div className="space-y-6">
              {statistics && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-3xl border border-slate-200/80 dark:border-slate-800/60 bg-white dark:bg-[#0c0817] p-6 shadow-sm space-y-6"
                >
                  <div className="border-b border-slate-200/60 dark:border-slate-800/40 pb-3">
                    <h2 className="text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                      Overall band score
                    </h2>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      {statistics.totalTestsSolved} ta bajarilgan test asosida
                    </p>
                  </div>

                  {/* Overall Band Card */}
                  <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 rounded-3xl p-6 text-center relative overflow-hidden space-y-2">
                    <span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-black uppercase tracking-widest block">
                      READING OVERALL
                    </span>
                    <h3 className="text-5xl font-black text-indigo-600 dark:text-indigo-400 leading-none">
                      {statistics.overallReadingBand.toFixed(1)} <span className="text-xl font-bold text-slate-400 dark:text-slate-500">/ 9</span>
                    </h3>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 pt-1">
                      {statistics.totalCorrectAnswers}/{statistics.totalQuestionsCount} ta to'g'ri javob
                    </p>
                    <div className="w-full h-2 bg-indigo-200/60 dark:bg-indigo-900/40 rounded-full overflow-hidden mt-3">
                      <div 
                        className="h-full bg-indigo-600 rounded-full" 
                        style={{ width: `${Math.min(100, (statistics.overallReadingBand / 9.0) * 100)}%` }} 
                      />
                    </div>
                  </div>

                  {/* Grid Stat Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    
                    {/* Tests Solved */}
                    <div className="bg-slate-50/70 dark:bg-white/5 border border-slate-200/60 dark:border-slate-800/40 rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Testlar</span>
                      <p className="text-xl font-black text-slate-800 dark:text-slate-100">
                        {statistics.totalTestsSolved}
                      </p>
                    </div>

                    {/* Total Correct */}
                    <div className="bg-slate-50/70 dark:bg-white/5 border border-slate-200/60 dark:border-slate-800/40 rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">To'g'ri javoblar</span>
                      <p className="text-xl font-black text-slate-800 dark:text-slate-100">
                        {statistics.totalCorrectAnswers}/{statistics.totalQuestionsCount}
                      </p>
                    </div>

                    {/* Accuracy */}
                    <div className="bg-slate-50/70 dark:bg-white/5 border border-slate-200/60 dark:border-slate-800/40 rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Aniqlik</span>
                      <p className="text-xl font-black text-slate-800 dark:text-slate-100">
                        {statistics.accuracy}%
                      </p>
                    </div>

                    {/* Highest Band */}
                    <div className="bg-slate-50/70 dark:bg-white/5 border border-slate-200/60 dark:border-slate-800/40 rounded-2xl p-4 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Eng yuqori band</span>
                      <p className="text-xl font-black text-slate-800 dark:text-slate-100">
                        {statistics.highestBand.toFixed(1)} / 9
                      </p>
                    </div>

                  </div>

                </motion.div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default ReadingHistory;
