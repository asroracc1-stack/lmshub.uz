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
import api from "@/api";
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
    <div className="w-full min-h-screen bg-slate-50/50 dark:bg-[#070311] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`${basePath}/mocks/c/reading`)}
            className="rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 h-11 w-11 p-0 shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-black text-slate-800 dark:text-white tracking-tight">
              Mening Reading Natijalarim
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              Siz topshirgan mock testlar tarixi va to'liq tahlili.
            </p>
          </div>
        </div>

        {loading && historyItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
            <p className="text-sm font-semibold text-slate-400">Natijalar yuklanmoqda...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left: Completed Attempts List */}
            <div className="lg:col-span-2 space-y-5">
              {historyItems.length === 0 ? (
                <Card className="p-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d091a] text-center space-y-4 shadow-xs">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-[#140f24] flex items-center justify-center text-slate-400">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-slate-700 dark:text-slate-200">Sizda hali bajarilgan testlar mavjud emas</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">Tarixni shakllantirish uchun Reading mock testlaridan birini boshlang va yakunlang.</p>
                  <Button asChild className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm">
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
                    {historyItems.map((item) => (
                      <motion.div 
                        key={item.attemptId} 
                        variants={cardVariants}
                        layout
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={{ y: -2 }}
                        className="rounded-3xl border border-slate-200/60 dark:border-slate-800/40 bg-white dark:bg-[#0c0817] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all duration-200"
                      >
                        {/* Attempt Details */}
                        <div className="space-y-3.5 flex-1 min-w-0">
                          <div>
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                              {item.testTitle}
                            </h3>
                            {item.passageTitle && item.passageTitle !== item.testTitle && (
                              <p className="text-xs text-slate-400 font-semibold truncate mt-0.5">
                                {item.passageTitle}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={getDifficultyColor(item.difficulty)}>
                              {item.difficulty}
                            </Badge>
                            <Badge variant="outline" className="rounded-full bg-slate-50/50 dark:bg-white/5 border-slate-200/50 dark:border-slate-800/40 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                              <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                              {item.durationMinutes} min
                            </Badge>
                            <Badge variant="outline" className="rounded-full bg-slate-50/50 dark:bg-white/5 border-slate-200/50 dark:border-slate-800/40 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                              <BookOpen className="h-3.5 w-3.5 mr-1 text-slate-400" />
                              {item.partType === "full" ? "Full Passage" : `Part ${item.partType}`}
                            </Badge>
                            <span className="text-[11px] text-slate-400 font-bold ml-1">
                              {new Date(item.finishedAt).toLocaleDateString("uz-UZ", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Answers badge & actions */}
                        <div className="flex items-center justify-between md:justify-end gap-5 shrink-0">
                          {/* Score Box */}
                          <div className="bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 rounded-2xl px-4 py-2.5 text-center shrink-0">
                            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-450 leading-none">
                              {item.correctAnswers} / {item.totalQuestions}
                            </div>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-widest mt-1">
                              Band {item.overallBand ? item.overallBand.toFixed(1) : "0.0"}
                            </div>
                          </div>

                          {/* Action button triggers */}
                          <div className="flex items-center gap-1.5">
                            <Button 
                              asChild
                              size="sm" 
                              variant="outline"
                              className="rounded-xl h-10 px-3 font-semibold text-xs gap-1 border-slate-200 dark:border-slate-850 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-white/5 dark:hover:text-white shrink-0"
                            >
                              <Link to={`${basePath}/mocks/take/${item.examId}?review=true&attemptId=${item.attemptId}`}>
                                <Eye className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Ko'rib chiqish</span>
                              </Link>
                            </Button>
                            
                            <Button 
                              asChild
                              size="sm" 
                              variant="outline"
                              className="rounded-xl h-10 px-3 font-semibold text-xs gap-1 border-slate-200 dark:border-slate-850 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-white/5 dark:hover:text-white shrink-0"
                            >
                              <Link to={`${basePath}/mocks/take/${item.examId}`}>
                                <RefreshCw className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Qaytadan</span>
                              </Link>
                            </Button>

                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDeleteAttempt(item.attemptId)}
                              className="rounded-xl h-10 w-10 p-0 border-slate-200 dark:border-slate-850 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
                  className="rounded-3xl border border-slate-200/60 dark:border-slate-800/40 bg-white/80 dark:bg-[#0c0817]/70 backdrop-blur-md p-6 shadow-sm space-y-6"
                >
                  <div className="border-b border-slate-200/60 dark:border-slate-800/40 pb-4">
                    <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">
                      Umumiy statistika
                    </h2>
                    <p className="text-xs text-slate-400 font-semibold">Reading bo'yicha to'liq ko'rsatkichlar.</p>
                  </div>

                  {/* Overall Band Card */}
                  <div className="bg-emerald-500/10 dark:bg-emerald-500/[0.04] border-2 border-emerald-500/30 rounded-3xl p-5 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-6 -mt-6" />
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-450 font-black uppercase tracking-widest block mb-1">
                      Overall Reading Band
                    </span>
                    <h3 className="text-4xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
                      {statistics.overallReadingBand.toFixed(1)} <span className="text-lg font-semibold text-emerald-500/70">/ 9.0</span>
                    </h3>
                  </div>

                  {/* Grid Stat Cards */}
                  <div className="grid grid-cols-2 gap-3.5">
                    
                    {/* Tests Solved */}
                    <div className="bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200/50 dark:border-slate-800/40 rounded-2xl p-4 space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Jami testlar</span>
                        <CheckCircle2 className="w-4 h-4 text-slate-400" />
                      </div>
                      <p className="text-lg font-extrabold text-slate-800 dark:text-slate-200">
                        {statistics.totalTestsSolved}
                      </p>
                    </div>

                    {/* Highest Band */}
                    <div className="bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200/50 dark:border-slate-800/40 rounded-2xl p-4 space-y-1">
                      <div className="flex items-center justify-between text-indigo-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Highest Band</span>
                        <Award className="w-4 h-4 text-indigo-400" />
                      </div>
                      <p className="text-lg font-extrabold text-slate-800 dark:text-slate-200">
                        {statistics.highestBand.toFixed(1)}
                      </p>
                    </div>

                    {/* Total Correct */}
                    <div className="bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200/50 dark:border-slate-800/40 rounded-2xl p-4 space-y-1 col-span-2">
                      <div className="flex items-center justify-between text-slate-450">
                        <span className="text-[10px] font-bold uppercase tracking-wider">To'g'ri javoblar</span>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      </div>
                      <p className="text-lg font-extrabold text-slate-800 dark:text-slate-200">
                        {statistics.totalCorrectAnswers} <span className="text-xs font-semibold text-slate-400">/ {statistics.totalQuestionsCount}</span>
                      </p>
                    </div>

                    {/* Accuracy */}
                    <div className="bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200/50 dark:border-slate-800/40 rounded-2xl p-4 space-y-1">
                      <div className="flex items-center justify-between text-amber-500">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Accuracy</span>
                        <Percent className="w-4 h-4 text-amber-500" />
                      </div>
                      <p className="text-lg font-extrabold text-slate-800 dark:text-slate-200">
                        {statistics.accuracy}%
                      </p>
                    </div>

                    {/* Average Time */}
                    <div className="bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200/50 dark:border-slate-800/40 rounded-2xl p-4 space-y-1">
                      <div className="flex items-center justify-between text-cyan-500">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Avg Time</span>
                        <Clock className="w-4 h-4 text-cyan-500" />
                      </div>
                      <p className="text-lg font-extrabold text-slate-800 dark:text-slate-200">
                        {statistics.averageTimeMinutes} min
                      </p>
                    </div>

                    {/* Completion Rate */}
                    <div className="bg-slate-50/50 dark:bg-slate-900/20 border border-slate-200/50 dark:border-slate-800/40 rounded-2xl p-4 space-y-1 col-span-2">
                      <div className="flex items-center justify-between text-indigo-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Completion Rate</span>
                        <Activity className="w-4 h-4 text-indigo-400" />
                      </div>
                      <p className="text-lg font-extrabold text-slate-800 dark:text-slate-200">
                        {statistics.completionRate}%
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
