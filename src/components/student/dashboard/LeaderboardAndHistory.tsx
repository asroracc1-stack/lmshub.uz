import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  FileText, 
  Crown, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ArrowUpRight, 
  Activity, 
  ShieldCheck, 
  Calendar,
  Wallet,
  Receipt
} from "lucide-react";
import { StudentIeltsDashboardDto } from "@/hooks/useOptimizedQueries";
import { usePackAccess } from "@/hooks/usePackAccess";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { cn } from "@/lib/utils";

interface LeaderboardAndHistoryProps {
  data: StudentIeltsDashboardDto;
}

interface PaymentTransactionDto {
  id: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  note?: string;
  admin_name: string;
}

export default function LeaderboardAndHistory({ data }: LeaderboardAndHistoryProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const pack = usePackAccess();

  // Fetch Payment History
  const { data: payments = [], isLoading: paymentsLoading } = useQuery<PaymentTransactionDto[]>({
    queryKey: ["payment-history", user?.id],
    queryFn: async () => {
      const { data: res } = await api.get("/payments/history");
      return res || [];
    },
    enabled: !!user?.id,
  });

  const latestPayment = payments.length > 0 ? payments[0] : null;

  // Format date safely
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(i18n.language, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* COLUMN 1: Learning Stats & Progress */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-6 rounded-[2rem] border bg-white dark:bg-slate-900/40 border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none backdrop-blur-md flex flex-col h-full min-h-[400px] hover:border-purple-500/20 dark:hover:border-purple-500/30 transition-all duration-300 animate-fade-in">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-slate-900 dark:text-white text-base tracking-tight">
                {t("dynamic.leaderboardandhistory.hisobingiz", "O'quv Statistikasi")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t("dynamic.leaderboardandhistory.statistikangiz", "Sizning natijalaringiz")}
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100/50 dark:border-white/5 text-center">
              <p className="text-xl font-black text-slate-900 dark:text-white">{data.takenTestsCount}</p>
              <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 leading-tight">
                {t("dynamic.leaderboardandhistory.topshirilgan_testlar", "Testlar")}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100/50 dark:border-white/5 text-center">
              <p className="text-xl font-black text-slate-900 dark:text-white">{(data.currentBand || 0).toFixed(1)}</p>
              <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 leading-tight">
                {t("dynamic.weeklychart.o_rtacha_natija", "Avg Score")}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100/50 dark:border-white/5 text-center">
              <p className="text-xl font-black text-slate-900 dark:text-white">{data.overallProgress}%</p>
              <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 leading-tight">
                {t("dynamic.leaderboardandhistory.umumiy_progress", "Progress")}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
              <span>{t("dynamic.learningWorld.progress", "Kurs progressi")}</span>
              <span>{data.overallProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500" 
                style={{ width: `${data.overallProgress}%` }} 
              />
            </div>
          </div>

          {/* Recent Tests List */}
          <div className="flex-1">
            <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              {t("dynamic.leaderboardandhistory.so_nggi_testlar", "So'nggi testlar")}
            </h4>
            
            <div className="space-y-3">
              {data.recentTests && data.recentTests.length > 0 ? (
                data.recentTests.slice(0, 3).map((test) => (
                  <div 
                    key={test.id} 
                    className="flex items-center gap-3 p-2 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100/50 dark:border-white/5 hover:border-purple-500/10 dark:hover:border-purple-500/20 transition-all duration-200"
                  >
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate">{test.title}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{test.subtitle}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                        {test.score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 font-medium">
                  {t("dynamic.leaderboardandhistory.hali_test_topshirilmagan", "Testlar topshirilmagan")}
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* COLUMN 2: Subscription & Packages */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="p-6 rounded-[2rem] border bg-white dark:bg-slate-900/40 border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none backdrop-blur-md flex flex-col h-full min-h-[400px] hover:border-blue-500/20 dark:hover:border-blue-500/30 transition-all duration-300 animate-fade-in">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-slate-900 dark:text-white text-base tracking-tight">
                {t("dynamic.packs.tanlangan_tarif", "Obuna & Paketlar")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t("dynamic.leaderboardandhistory.a_zolik_turi", "Profil tarifi va imkoniyatlar")}
              </p>
            </div>
          </div>

          {/* Active plan box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100/50 dark:border-white/5 mb-6 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {t("dynamic.packs.status", "Joriy Tarif")}
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white mt-1 block">
                {pack.loading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : pack.packCode ? (
                  `${pack.activePack} Plan`
                ) : (
                  "FREE Plan"
                )}
              </span>
            </div>
            <div>
              {pack.activePack === "ELITE" ? (
                <Badge className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white border-none font-bold px-3 py-1 shadow-md shadow-amber-500/20">
                  ELITE
                </Badge>
              ) : pack.activePack === "PRO" ? (
                <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-none font-bold px-3 py-1 shadow-md shadow-blue-500/20">
                  PRO
                </Badge>
              ) : (
                <Badge className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-none font-bold px-3 py-1">
                  FREE
                </Badge>
              )}
            </div>
          </div>

          {/* Access items list */}
          <div className="flex-1 space-y-3 mb-6">
            <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              {t("dynamic.packs.imkoniyatlar_ro_yxati", "Imkoniyatlar")}
            </h4>
            
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  IELTS Mock Exams
                </span>
                {pack.ielts ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Badge className="text-[9px] bg-slate-100 dark:bg-slate-850 text-slate-400 font-bold border-none px-1.5 py-0.5">LOCKED</Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  SAT Mock Exams
                </span>
                {pack.sat ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Badge className="text-[9px] bg-slate-100 dark:bg-slate-850 text-slate-400 font-bold border-none px-1.5 py-0.5">LOCKED</Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  Milliy Sertifikat
                </span>
                {pack.milliy ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Badge className="text-[9px] bg-slate-100 dark:bg-slate-850 text-slate-400 font-bold border-none px-1.5 py-0.5">LOCKED</Badge>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  AI Speaking Practice
                </span>
                {pack.activePack !== "FREE" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Badge className="text-[9px] bg-slate-100 dark:bg-slate-850 text-slate-400 font-bold border-none px-1.5 py-0.5">LOCKED</Badge>
                )}
              </div>
            </div>

            {/* Expiration date */}
            {pack.expiresAt && (
              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>
                  {t("dynamic.packs.muddat", "Muddati")}: {formatDate(pack.expiresAt)}
                </span>
              </div>
            )}
          </div>

          <a 
            href="/student/payment" 
            className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-850 text-slate-800 dark:text-slate-200 text-xs font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 flex items-center justify-center gap-1.5"
          >
            {t("dynamic.packs.saqlash", "Tarifni Yangilash")}
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </Card>
      </motion.div>

      {/* COLUMN 3: Payment History */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-6 rounded-[2rem] border bg-white dark:bg-slate-900/40 border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none backdrop-blur-md flex flex-col h-full min-h-[400px] hover:border-emerald-500/20 dark:hover:border-emerald-500/30 transition-all duration-300 animate-fade-in">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-slate-900 dark:text-white text-base tracking-tight">
                {t("dynamic.payment.to_lov_rekvizitlari_haqiqiy_karta", "To'lovlar Tarixi")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t("dynamic.payment.to_lov_skrinshotini_yuklang_va_tasdiqlas", "So'nggi to'lov holati")}
              </p>
            </div>
          </div>

          {/* Latest Payment Box */}
          <div className="flex-1 flex flex-col justify-between">
            {paymentsLoading ? (
              <div className="space-y-4 py-8 flex flex-col items-center justify-center">
                <span className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                <span className="text-xs text-slate-400 font-bold">Yuklanmoqda...</span>
              </div>
            ) : latestPayment ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100/50 dark:border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {t("dynamic.payment.summa_uzs", "To'lov Summasi")}
                    </span>
                    {latestPayment.status === "APPROVED" ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-bold py-0.5 px-2 text-[10px]">
                        {t("dynamic.finance.status_taqsimoti", "APPROVED")}
                      </Badge>
                    ) : latestPayment.status === "PENDING" ? (
                      <Badge className="bg-amber-500/10 text-amber-500 border-none font-bold py-0.5 px-2 text-[10px]">
                        {t("dynamic.finance.status_taqsimoti", "PENDING")}
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/10 text-red-500 border-none font-bold py-0.5 px-2 text-[10px]">
                        {t("dynamic.finance.status_taqsimoti", "REJECTED")}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    {latestPayment.amount.toLocaleString()} UZS
                  </div>
                  
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-bold flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-emerald-500" />
                    {formatDate(latestPayment.created_at)}
                  </div>
                </div>

                {/* Admin Note if Rejected / Pending */}
                {latestPayment.note && (
                  <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-[11px] text-red-600 dark:text-red-400 font-medium leading-relaxed animate-pulse">
                    <span className="font-bold uppercase tracking-wider text-[9px] block mb-0.5">Izoh:</span>
                    {latestPayment.note}
                  </div>
                )}
                
                {/* Admin name handling */}
                {latestPayment.admin_name && (
                  <div className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5 pl-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/60" />
                    <span>Admin: {latestPayment.admin_name}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center flex flex-col items-center justify-center gap-3">
                <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 stroke-[1.5]" />
                <div>
                  <p className="text-xs font-black text-slate-600 dark:text-slate-300">
                    {t("dynamic.payment.hali_to_lov_so_rovlari_yuborilmagan", "To'lovlar tarixi yo'q")}
                  </p>
                  <p className="text-[10px] text-slate-400 max-w-[200px] mt-1 leading-relaxed">
                    {t("dynamic.payment.yuqoridagi_shakl_orqali_birinchi_to_lov_", "Obunani faollashtirish uchun birinchi to'lovni amalga oshiring.")}
                  </p>
                </div>
              </div>
            )}

            <a 
              href="/student/payment" 
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white text-xs font-black shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-300 flex items-center justify-center gap-1.5 mt-auto"
            >
              <CreditCard className="h-4 w-4" />
              {t("dynamic.payment.to_lov_chekini_yuborish", "To'lov qilish & Chek yuklash")}
            </a>
          </div>
        </Card>
      </motion.div>

    </div>
  );
}
