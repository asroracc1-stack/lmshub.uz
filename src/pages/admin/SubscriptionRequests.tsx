import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, X, Clock, User, Package, DollarSign,
  Search, CheckCircle2, AlertCircle, Loader2, XCircle, ShieldCheck, Crown
} from "lucide-react";
import { api } from "@/lib/axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SubscriptionRequest {
  id: string;
  user: {
    username: string;
    fullName: string;
    email: string;
  };
  pack: {
    name: string;
    type: string;
    price: number;
  };
  requestedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  processedBy?: string;
  processedAt?: string;
}

export default function SubscriptionRequests() {
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");

  const loadRequests = async () => {
    try {
      const { data } = await api.get("/admin/subscription-requests");
      setRequests(data || []);
    } catch (e) {
      toast.error("So'rovlarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const onApprove = async (id: string) => {
    setProcessingId(id + "-approve");
    try {
      await api.post(`/admin/subscription-requests/${id}/approve`);
      toast.success("✅ Obuna muvaffaqiyatli faollashtirildi!");
      await loadRequests();
    } catch (e) {
      toast.error("Xatolik yuz berdi");
    } finally {
      setProcessingId(null);
    }
  };

  const onReject = async (id: string) => {
    setProcessingId(id + "-reject");
    try {
      await api.post(`/admin/subscription-requests/${id}/reject`);
      toast.success("So'rov rad etildi");
      await loadRequests();
    } catch (e) {
      toast.error("Xatolik yuz berdi");
    } finally {
      setProcessingId(null);
    }
  };

  const getPackBadge = (type: string) => {
    if (type === "ELITE") return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60";
    if (type === "PRO") return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60";
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300";
  };

  const filtered = requests.filter(r => {
    const matchSearch = 
      r.user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.pack.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = filter === "ALL" || r.status === filter;
    return matchSearch && matchFilter;
  });

  const counts = {
    ALL: requests.length,
    PENDING: requests.filter(r => r.status === "PENDING").length,
    APPROVED: requests.filter(r => r.status === "APPROVED").length,
    REJECTED: requests.filter(r => r.status === "REJECTED").length,
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-48 gap-4">
        <div className="h-12 w-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <p className="text-muted-foreground font-medium">So'rovlar yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20 transition-colors duration-500">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  Obuna So'rovlari
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                  Foydalanuvchilarning paket sotib olish so'rovlarini boshqaring
                </p>
              </div>
            </div>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-12 h-12 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl focus-visible:ring-2 focus-visible:ring-primary/30 shadow-sm"
              placeholder="Foydalanuvchi yoki paket..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 border",
                filter === f
                  ? f === "PENDING" ? "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20"
                    : f === "APPROVED" ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20"
                    : f === "REJECTED" ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20"
                    : "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                  : "bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-primary/40"
              )}
            >
              {f === "ALL" ? "Barchasi" : f === "PENDING" ? "Kutilayotgan" : f === "APPROVED" ? "Tasdiqlangan" : "Rad etilgan"}
              <span className="ml-1.5 opacity-70">({counts[f]})</span>
            </button>
          ))}
        </div>
      </header>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Jami", val: counts.ALL, color: "from-indigo-500 to-purple-500", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
          { label: "Kutilayotgan", val: counts.PENDING, color: "from-amber-500 to-orange-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
          { label: "Tasdiqlangan", val: counts.APPROVED, color: "from-emerald-500 to-teal-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          { label: "Rad etilgan", val: counts.REJECTED, color: "from-red-500 to-rose-500", bg: "bg-red-50 dark:bg-red-950/30" },
        ].map(s => (
          <Card key={s.label} className={cn("p-5 border-none shadow-sm", s.bg)}>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{s.label}</p>
            <p className={cn("text-3xl font-black bg-gradient-to-r bg-clip-text text-transparent mt-1", s.color)}>{s.val}</p>
          </Card>
        ))}
      </div>

      {/* Requests list */}
      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            filtered.map((req, i) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className={cn(
                  "p-6 border shadow-sm transition-all duration-300 hover:shadow-lg rounded-3xl overflow-hidden relative",
                  "bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl",
                  req.status === "PENDING" ? "border-amber-200 dark:border-amber-800/40" 
                  : req.status === "APPROVED" ? "border-emerald-200 dark:border-emerald-800/40"
                  : "border-red-200 dark:border-red-800/40"
                )}>
                  {/* Status stripe */}
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1 rounded-l-3xl",
                    req.status === "PENDING" ? "bg-amber-400"
                    : req.status === "APPROVED" ? "bg-emerald-500"
                    : "bg-red-400"
                  )} />

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pl-4">
                    {/* User info */}
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center border border-slate-200 dark:border-white/10 shrink-0">
                        <User className="h-5 w-5 text-slate-400" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                          {req.user.fullName || req.user.username}
                          <span className="text-[10px] text-slate-400 font-normal bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-lg">@{req.user.username}</span>
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(req.requestedAt).toLocaleString("uz-UZ")}
                          </span>
                          {req.user.email && <span className="truncate">{req.user.email}</span>}
                        </div>
                        {req.processedBy && (
                          <p className="text-[10px] text-slate-400 font-medium">
                            {req.status === "APPROVED" ? "✅" : "❌"} {req.processedBy} tomonidan {req.status === "APPROVED" ? "tasdiqlandi" : "rad etildi"}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Pack + actions */}
                    <div className="flex flex-wrap items-center gap-6">
                      {/* Pack info */}
                      <div className="space-y-1">
                        <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Paket</p>
                        <div className="flex items-center gap-2">
                          {req.pack.type === "ELITE" ? <Crown className="h-4 w-4 text-amber-500" /> : <Package className="h-4 w-4 text-primary" />}
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{req.pack.name}</span>
                          <Badge variant="outline" className={cn("text-[9px] uppercase", getPackBadge(req.pack.type))}>
                            {req.pack.type}
                          </Badge>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="space-y-1">
                        <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Narxi</p>
                        <div className="flex items-center gap-1 font-black text-slate-900 dark:text-white text-sm">
                          <DollarSign className="h-4 w-4 text-emerald-500" />
                          {Number(req.pack.price).toLocaleString()} UZS
                        </div>
                      </div>

                      {/* Status badge */}
                      <Badge variant="outline" className={cn(
                        "font-black uppercase text-[9px] tracking-wider px-3 py-1.5 rounded-xl",
                        req.status === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 animate-pulse"
                        : req.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300"
                      )}>
                        {req.status === "PENDING" ? "⏳ Kutilayotgan"
                         : req.status === "APPROVED" ? "✅ Tasdiqlangan"
                         : "❌ Rad etilgan"}
                      </Badge>

                      {/* Action buttons for PENDING only */}
                      {req.status === "PENDING" && (
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => onApprove(req.id)}
                            disabled={processingId === req.id + "-approve" || processingId === req.id + "-reject"}
                            className="h-10 px-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black uppercase text-[9px] tracking-widest shadow-lg shadow-emerald-500/20 gap-2"
                          >
                            {processingId === req.id + "-approve"
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <CheckCircle2 className="h-4 w-4" />}
                            Tasdiqlash
                          </Button>
                          <Button
                            onClick={() => onReject(req.id)}
                            disabled={processingId === req.id + "-approve" || processingId === req.id + "-reject"}
                            variant="outline"
                            className="h-10 px-5 text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30 dark:border-red-800/40 rounded-xl font-black uppercase text-[9px] tracking-widest gap-2"
                          >
                            {processingId === req.id + "-reject"
                              ? <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                              : <XCircle className="h-4 w-4" />}
                            Rad etish
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          ) : (
            <div className="py-32 text-center space-y-6">
              <div className="w-24 h-24 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="h-10 w-10 text-slate-300" />
              </div>
              <p className="text-slate-400 font-light italic">Hech qanday so'rov topilmadi.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
