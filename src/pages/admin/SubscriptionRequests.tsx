import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Check, X, Clock, User, Package, DollarSign, Calendar, 
  Search, Filter, ExternalLink, ShieldCheck, MessageCircle,
  MoreVertical, CheckCircle2, AlertCircle, Loader2
} from "lucide-react";
import { api } from "@/lib/axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import TigerPlayer from "@/components/TigerPlayer";

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
    setProcessingId(id);
    try {
      await api.post(`/admin/subscription-requests/${id}/approve`);
      toast.success("Obuna muvaffaqiyatli faollashtirildi!");
      await loadRequests();
    } catch (e) {
      toast.error("Xatolik yuz berdi");
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = requests.filter(r => 
    r.user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.pack.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-48 gap-8 bg-slate-50 dark:bg-slate-950 min-h-screen">
        <TigerPlayer text="So'rovlarni qidiryapman..." size={320} />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Badge className="bg-primary/10 text-primary border-none text-xs px-2 py-1">ADMIN</Badge>
            Kutilayotgan So'rovlar
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-light">Foydalanuvchilarning obuna bo'lish so'rovlarini boshqarish markazi</p>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            className="pl-12 h-14 bg-white dark:bg-white/5 border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-primary/50" 
            placeholder="Foydalanuvchi yoki paket..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <div className="grid gap-6">
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            filtered.map((req, i) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className={cn(
                  "p-6 border-none shadow-sm transition-all duration-300 hover:shadow-md rounded-[2rem]",
                  "bg-white dark:bg-slate-900/40 dark:backdrop-blur-xl",
                  req.status === "PENDING" ? "border-l-4 border-l-amber-500" : "border-l-4 border-l-emerald-500"
                )}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center border border-slate-100 dark:border-white/5">
                        <User className="h-6 w-6 text-slate-400" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                          {req.user.fullName || req.user.username}
                          <span className="text-[10px] text-slate-400 font-normal">@{req.user.username}</span>
                        </h3>
                        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(req.requestedAt).toLocaleString()}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {req.user.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-8">
                      <div className="space-y-1 text-center md:text-left">
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Paket</p>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          <span className="font-bold text-slate-700 dark:text-slate-200">{req.pack.name}</span>
                          <Badge variant="outline" className="text-[9px] uppercase tracking-tighter border-primary/20 text-primary">{req.pack.type}</Badge>
                        </div>
                      </div>

                      <div className="space-y-1 text-center md:text-left">
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Narxi</p>
                        <div className="flex items-center gap-1 font-black text-slate-900 dark:text-white">
                          <DollarSign className="h-4 w-4 text-emerald-500" />
                          {req.pack.price.toLocaleString()} UZS
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {req.status === "PENDING" ? (
                          <Button 
                            onClick={() => onApprove(req.id)} 
                            disabled={processingId === req.id}
                            className="h-12 px-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 gap-2"
                          >
                            {processingId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Faollashtirish
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2 text-emerald-500 font-black text-xs uppercase tracking-widest bg-emerald-500/5 px-4 py-2 rounded-xl">
                            <Check className="h-4 w-4" /> Faollashtirilgan
                          </div>
                        )}
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-white/5 text-slate-400">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
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
              <p className="text-slate-400 font-light italic">Hech qanday kutilayotgan so'rov topilmadi.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

