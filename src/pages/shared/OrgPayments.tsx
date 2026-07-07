import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  CreditCard, CheckCircle2, XCircle, Clock, Eye, Loader2, Receipt, ArrowRight, Sparkles, User, FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PaymentTransaction {
  id: string;
  studentId: string;
  studentName: string;
  payerId: string;
  payerName: string;
  adminId: string;
  adminName: string;
  amount: number;
  paymentProofUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  organizationId: string;
  note: string | null;
  createdAt: string;
}

const statusMeta = (s: string, t: any) => {
  const status = s.toLowerCase();
  switch (status) {
    case "pending":
      return { label: t("dynamic.orgpayments.kutilmoqda"), icon: Clock, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
    case "approved":
    case "completed":
    case "paid":
      return { label: "Tasdiqlandi", icon: CheckCircle2, className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" };
    case "rejected":
    case "failed":
      return { label: "Rad etildi", icon: XCircle, className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" };
    default:
      return { label: s, icon: Clock, className: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" };
  }
};

const getImageUrl = (url?: string | null) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";
  const baseUrl = apiUrl.replace(/\/api\/v1\/?$/, ""); // extract just the host
  
  if (url.startsWith("/api/")) return `${baseUrl}${url}`;
  if (url.startsWith("view/")) return `${baseUrl}/api/v1/files/${url}`;
  if (url.startsWith("receipts/")) return `${baseUrl}/api/v1/files/view/${url}`;
  
  return `${baseUrl}/api/v1/files/view/receipts/${url}`; // default to receipts if it's just a filename
};

const formatTransactionDate = (dateVal: any): string => {
  if (!dateVal) return "Noma'lum sana";
  try {
    if (Array.isArray(dateVal)) {
      const [year, month, day, hour = 0, minute = 0, second = 0] = dateVal;
      return new Date(year, month - 1, day, hour, minute, second).toLocaleString("uz-UZ");
    }
    const parsed = new Date(dateVal);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleString("uz-UZ");
    }
    return "Noma'lum sana";
  } catch (e) {
    return "Noma'lum sana";
  }
};

export default function OrgPayments() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [selected, setSelected] = useState<PaymentTransaction | null>(null);

  // Fetch all payment transactions for calculations and responsive filters
  const { data: allTransactions = [], isLoading: loading } = useQuery<PaymentTransaction[]>({
    queryKey: ["admin-payment-transactions"],
    queryFn: async () => {
      const { data } = await api.get<any>("/admin/payments/manage", { params: { size: 1000, status: "ALL" } });
      const content = data?.content || data || [];
      const list = Array.isArray(content) ? content : [];
      return list.map((item: any) => ({
        id: item.id,
        studentId: item.student_id || item.studentId,
        studentName: item.student_name || item.studentName,
        payerId: item.payer_id || item.payerId,
        payerName: item.payer_name || item.payerName,
        adminId: item.admin_id || item.adminId,
        adminName: item.admin_name || item.adminName,
        amount: item.amount,
        paymentProofUrl: item.payment_proof_url || item.paymentProofUrl,
        status: item.status,
        organizationId: item.organization_id || item.organizationId,
        note: item.note,
        createdAt: item.created_at || item.createdAt,
      }));
    },
  });

  // Approve payment mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<PaymentTransaction>(`/admin/payments/manage/${id}/approve`);
      return data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin-payment-transactions"] });
      toast.success(t("dynamic.orgpayments.to_lov_muvaffaqiyatli_tasdiqlandi"));
      setSelected(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Tasdiqlashda xatolik yuz berdi");
    }
  });

  // Reject payment mutation
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<PaymentTransaction>(`/admin/payments/manage/${id}/reject`);
      return data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin-payment-transactions"] });
      toast.success(t("dynamic.orgpayments.to_lov_so_rovi_rad_etildi"));
      setSelected(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Rad etishda xatolik yuz berdi");
    }
  });

  // Calculate live stats
  const stats = {
    pending: allTransactions.filter((p) => p.status === "PENDING").length,
    paid: allTransactions.filter((p) => p.status === "APPROVED").length,
    total: allTransactions
      .filter((p) => p.status === "APPROVED")
      .reduce((sum, p) => sum + Number(p.amount), 0),
  };

  // Filter list locally for instant tab switching
  const filtered = allTransactions.filter((p) => {
    if (filter === "ALL") return true;
    return p.status === filter;
  });

  const isMutationPending = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="space-y-8">
      {/* Top Title Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center shadow-lg shadow-primary/20">
            <CreditCard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent">{t("dynamic.subscriptions.to_lovlar")}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Talabalar to'lov cheklarini ko'ring, tahlil qiling va tasdiqlang
            </p>
          </div>
        </div>
      </motion.div>

      {/* Glassmorphic Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border border-amber-500/10 hover:border-amber-500/30 glass relative overflow-hidden group transition-all duration-300">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t("dynamic.orgpayments.kutilmoqda")}</p>
              <p className="font-display text-3xl font-extrabold text-slate-800 dark:text-white mt-1">{stats.pending}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 grid place-items-center text-amber-500 group-hover:scale-110 transition-transform">
              <Clock className="h-6 w-6" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-amber-500/40" />
        </Card>

        <Card className="p-6 border border-purple-500/10 hover:border-purple-500/30 glass relative overflow-hidden group transition-all duration-300">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t("dynamic.orgpayments.tasdiqlangan")}</p>
              <p className="font-display text-3xl font-extrabold text-slate-800 dark:text-white mt-1">{stats.paid}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 grid place-items-center text-purple-500 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-purple-500/40" />
        </Card>

        <Card className="p-6 border border-indigo-500/10 hover:border-indigo-500/30 glass relative overflow-hidden group transition-all duration-300">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t("dynamic.orgpayments.jami_summa")}</p>
              <p className="font-display text-2xl font-extrabold text-slate-800 dark:text-white mt-1.5">
                {stats.total.toLocaleString("uz-UZ")} <span className="text-xs font-medium text-muted-foreground">{t("dynamic.finance.uzs")}</span>
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 grid place-items-center text-indigo-500 group-hover:scale-110 transition-transform">
              <Receipt className="h-6 w-6" />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-indigo-500/40" />
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2.5 flex-wrap">
        {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className={`rounded-xl px-4 py-5 font-semibold text-xs border border-border/40 hover:scale-[1.02] active:scale-95 transition-all ${
              filter === f 
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-md" 
                : "bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            {f === "PENDING" && "Kutilayotgan"}
            {f === "APPROVED" && "Tasdiqlangan"}
            {f === "REJECTED" && "Rad etilgan"}
            {f === "ALL" && "Barcha to'lovlar"}
          </Button>
        ))}
      </div>

      {/* Payments Content Area */}
      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5 border border-border/40 rounded-2xl glass flex justify-between items-center animate-pulse">
              <div className="flex items-center gap-3.5 w-full">
                <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
                <div className="space-y-2 w-1/3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
              <Skeleton className="h-9 w-24 rounded-xl" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="p-16 text-center text-muted-foreground bg-slate-50/50 dark:bg-slate-900/50 border-dashed rounded-2xl">
            <Receipt className="h-12 w-12 mx-auto mb-4 text-slate-300 dark:text-slate-700 animate-pulse" />
            <h3 className="text-lg font-bold">{t("dynamic.orgpayments.to_lovlar_mavjud_emas")}</h3>
            <p className="text-sm mt-1">{t("dynamic.orgpayments.ushbu_filtr_bo_yicha_hech_qanday_to_lov_")}</p>
          </Card>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((p, idx) => {
              const m = statusMeta(p.status, t);
              const StatusIcon = m.icon;
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ delay: idx * 0.02, duration: 0.2 }}
                >
                  <Card className="p-5 border border-border/40 rounded-2xl glass hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3.5">
                      <div className="h-11 w-11 rounded-xl bg-primary/10 grid place-items-center text-primary shrink-0">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800 dark:text-slate-200">
                            {p.studentName || "Noma'lum Talaba"}
                          </p>
                          {p.studentName !== p.payerName && p.payerName && (
                            <span className="text-[10px] bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                              <ArrowRight className="h-2.5 w-2.5" /> to'lovchi: {p.payerName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <strong className="text-slate-800 dark:text-slate-200 font-extrabold text-sm mr-1">
                            {Number(p.amount).toLocaleString("uz-UZ")} UZS
                          </strong> 
                          · {formatTransactionDate(p.createdAt)}
                        </p>
                        {p.note && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 italic bg-slate-500/5 px-2.5 py-1 rounded-lg border border-slate-500/10 inline-block">
                            "{p.note}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3.5 shrink-0 ml-auto md:ml-0">
                      <Badge className={`rounded-lg px-2.5 py-1 text-xs border font-semibold flex items-center gap-1.5 ${m.className}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {m.label}
                      </Badge>
                      
                      {p.status === "PENDING" && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectMutation.mutate(p.id)}
                            disabled={isMutationPending}
                            className="rounded-xl px-3 border-rose-500/30 text-rose-600 hover:bg-rose-500/10 hover:border-rose-500 h-9 transition-colors"
                            title="Rad etish"
                          >
                            {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(p.id)}
                            disabled={isMutationPending}
                            className="rounded-xl px-3 bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 border-none h-9 transition-all"
                            title={t("dynamic.profile.tasdiqlash")}
                          >
                            {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      )}

                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setSelected(p)}
                        className="rounded-xl px-4 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 border-border/40 gap-1.5 text-xs h-9"
                      >
                        <Eye className="h-4 w-4" /> Ko'rish
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Transaction Details Dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-2xl p-6 rounded-2xl border-none shadow-2xl bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-950 dark:text-white">
              <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
              To'lov Tafsilotlari
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-border/30 text-xs sm:text-sm">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><User className="h-3 w-3" />{t("dynamic.orgrewards.talaba")}</span>
                  <p className="font-bold text-slate-800 dark:text-white">{selected.studentName}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><Receipt className="h-3 w-3" />{t("dynamic.orgpayments.summa")}</span>
                  <p className="font-extrabold text-slate-900 dark:text-white text-base">
                    {Number(selected.amount).toLocaleString("uz-UZ")} UZS
                  </p>
                </div>
                {selected.studentName !== selected.payerName && selected.payerName && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><User className="h-3 w-3" />{t("dynamic.orgpayments.to_lovchi_payer")}</span>
                    <p className="font-medium text-slate-700 dark:text-slate-300">{selected.payerName}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1"><Clock className="h-3 w-3" />{t("dynamic.orgpayments.yuborilgan_sana")}</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{formatTransactionDate(selected.createdAt)}</p>
                </div>
              </div>

              {selected.note && (
                <div className="space-y-1 bg-amber-500/5 border border-amber-500/10 p-3.5 rounded-xl">
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1"><FileText className="h-3 w-3" /> Izoh / Xabar</span>
                  <p className="text-xs italic text-slate-700 dark:text-slate-300">"{selected.note}"</p>
                </div>
              )}

              {/* Receipt Image Container */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{t("dynamic.orgpayments.to_lov_cheki_kvitansiya")}</span>
                {selected.paymentProofUrl ? (
                  <div className="rounded-xl overflow-hidden border border-border/40 bg-slate-100 dark:bg-slate-950 p-2">
                    <img 
                      src={getImageUrl(selected.paymentProofUrl) || ""} 
                      alt="Payment receipt proof" 
                      className="w-full max-h-[350px] object-contain rounded-lg shadow-sm hover:scale-[1.01] transition-transform duration-300"
                      onError={(e) => {
                        // Fallback placeholder if image load fails
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80";
                      }}
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">{t("dynamic.paymentrequests.chek_rasmi_yuklanmagan")}</div>
                )}
              </div>

              {/* Action Buttons for Pending State */}
              {selected.status === "PENDING" && (
                <div className="flex gap-3.5 justify-end pt-3">
                  <Button
                    variant="outline"
                    onClick={() => rejectMutation.mutate(selected.id)}
                    disabled={isMutationPending}
                    className="rounded-xl px-5 h-11 text-rose-500 hover:text-rose-700 border border-rose-500/20 hover:bg-rose-500/10 font-bold text-xs flex items-center justify-center transition-colors"
                  >
                    {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Rad etish
                  </Button>
                  <Button 
                    onClick={() => approveMutation.mutate(selected.id)} 
                    disabled={isMutationPending}
                    className="rounded-xl px-5 h-11 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center shadow-lg shadow-purple-600/25 border-none transition-all duration-200"
                  >
                    {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    To'lovni tasdiqlash
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

