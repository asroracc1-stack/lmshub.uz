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
  Headphones, 
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
import { cn } from "@/lib/utils";

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

export const ListeningHistory: React.FC = () => {
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
      const historyRes = await api.get(`/user/listening/history?page=${currentPage}&size=${size}`);
      const statsRes = await api.get("/user/listening/statistics");

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
      await api.delete(`/user/listening/history/${attemptId}`);
      toast.success("Urinish muvaffaqiyatli o'chirildi.");
      loadData(true);
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
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-200/50";
      case "hard":
      case "qiyin":
        return "bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border-rose-200/50";
      default:
        return "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200/50";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
              onClick={() => navigate("/user/practice")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Headphones className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                Bajarilgan Listening Testlari
              </h1>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                Listening ko'nikmasi bo'yicha yechilgan barcha imtihon va mashqlar tarixi
              </p>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: History Items */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm min-h-[300px]">
                <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mb-3" />
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Natijalar yuklanmoqda...</p>
              </div>
            ) : historyItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm text-center min-h-[300px]">
                <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mb-3">
                  <Headphones className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">
                  Hali hech qanday Listening testi yechilmagan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
                  O'z bilimingizni oshirish uchun birinchi Listening testini yechib ko'ring!
                </p>
                <Button 
                  onClick={() => navigate("/user/practice")}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold px-5"
                >
                  Test Yechishni Boshlash
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {historyItems.map((item) => (
                    <motion.div
                      key={item.attemptId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-black text-slate-900 dark:text-white">
                              {item.testTitle}
                            </h3>
                            <Badge variant="outline" className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5", getDifficultyColor(item.difficulty))}>
                              {item.difficulty || "medium"}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 flex-wrap">
                            <div className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                {item.correctAnswers}/{item.totalQuestions}
                              </span> to'g'ri
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{item.durationMinutes || 40} daq</span>
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-400">
                              <span>{new Date(item.finishedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions & Score */}
                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="text-right mr-2">
                            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                              {item.overallBand > 0 ? item.overallBand.toFixed(1) : "—"}
                            </div>
                            <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                              Band Score
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl text-xs font-bold border-slate-200 dark:border-slate-800"
                              onClick={() => navigate(`/user/mocks/take/${item.examId}?attemptId=${item.attemptId}&mode=review`)}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Ko'rib chiqish
                            </Button>
                            <Button
                              size="sm"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                              onClick={() => navigate(`/user/mocks/take/${item.examId}`)}
                            >
                              <RefreshCw className="w-3.5 h-3.5 mr-1" />
                              Qaytadan
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl"
                              onClick={() => handleDeleteAttempt(item.attemptId)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {hasMore && (
                  <div className="text-center pt-2">
                    <Button
                      variant="outline"
                      disabled={loadingMore}
                      onClick={() => loadData(false)}
                      className="rounded-xl text-xs font-bold border-slate-200 dark:border-slate-800"
                    >
                      {loadingMore ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Ko'proq yuklash
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Column: Overall Statistics */}
          <div className="space-y-4">
            <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm">
              <h2 className="text-base font-black text-slate-900 dark:text-white mb-4 flex items-center justify-between">
                <span>Listening Overall Statatsika</span>
                <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </h2>

              <div className="space-y-5">
                {/* Overall Band Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900/50 text-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                    O'rtacha Ball
                  </span>
                  <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400 my-1">
                    {statistics?.overallReadingBand ? statistics.overallReadingBand.toFixed(1) : "0.0"} <span className="text-sm font-bold text-slate-400">/ 9</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {statistics?.totalTestsSolved || 0} ta bajarilgan test asosida
                  </p>
                </div>

                {/* Grid Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Testlar</span>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                      {statistics?.totalTestsSolved || 0}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">To'g'ri Javoblar</span>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                      {statistics?.totalCorrectAnswers || 0}/{statistics?.totalQuestionsCount || 0}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Aniqlik</span>
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {statistics?.accuracy ? statistics.accuracy.toFixed(1) : "0"}%
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Eng Yuqori Band</span>
                    <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {statistics?.highestBand ? statistics.highestBand.toFixed(1) : "0.0"}/9
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

        </div>

      </div>
    </div>
  );
};
