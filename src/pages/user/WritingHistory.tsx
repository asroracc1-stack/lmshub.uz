import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Clock, 
  Trash2, 
  RefreshCw, 
  Eye, 
  Loader2, 
  CheckCircle2, 
  PenTool, 
  Award 
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

export const WritingHistory: React.FC = () => {
  const navigate = useNavigate();
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const historyRes = await api.get(`/user/writing/history?page=0&size=10`);
      const statsRes = await api.get("/user/writing/statistics");
      setHistoryItems(historyRes.data.content || []);
      setStatistics(statsRes.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Natijalarni yuklashda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteAttempt = async (attemptId: string) => {
    if (!window.confirm("Haqiqatdan ham ushbu urinish natijasini o'chirib tashlamoqchimisiz?")) return;
    try {
      await api.delete(`/user/writing/history/${attemptId}`);
      toast.success("Urinish muvaffaqiyatli o'chirildi.");
      loadData();
    } catch (e: any) {
      toast.error("O'chirishda xatolik yuz berdi.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
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
              <PenTool className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              Bajarilgan Writing Testlari
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              Writing insholar va mashqlar tarixi hamda AI tahlili
            </p>
          </div>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm min-h-[300px]">
                <Loader2 className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin mb-3" />
                <p className="text-xs font-bold text-slate-500">Natijalar yuklanmoqda...</p>
              </div>
            ) : historyItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-center min-h-[300px]">
                <PenTool className="w-12 h-12 text-purple-600 mb-3" />
                <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">Writing insholar topilmadi</h3>
                <Button onClick={() => navigate("/user/practice")} className="mt-4 bg-purple-600 text-white font-bold text-xs rounded-xl">
                  Insho Yozishni Boshlash
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {historyItems.map((item) => (
                  <motion.div
                    key={item.attemptId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800 shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white">{item.testTitle}</h3>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{new Date(item.finishedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-xs font-bold"
                          onClick={() => navigate(`/user/mocks/take/${item.examId}?attemptId=${item.attemptId}&mode=review`)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Natijani Ko'rish
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-500 rounded-xl"
                          onClick={() => handleDeleteAttempt(item.attemptId)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Right Stats */}
          <div>
            <Card className="p-6 bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm">
              <h2 className="text-base font-black text-slate-900 dark:text-white mb-4 flex items-center justify-between">
                <span>Writing Statistika</span>
                <Award className="w-5 h-5 text-purple-600" />
              </h2>
              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 text-center">
                <span className="text-[10px] font-extrabold uppercase text-purple-600">Bajarilgan insholar</span>
                <div className="text-3xl font-black text-purple-600 my-1">{statistics?.totalTestsSolved || 0}</div>
              </div>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
};
