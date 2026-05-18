import { useEffect, useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, Sparkles, Crown, Gift, Loader2, CreditCard, Copy, Send, X,
  Plus, Pencil, Trash2, Settings, ShieldCheck, XCircle, Clock, Zap, Rocket, 
  ChevronRight, Info, Users, BarChart3, Star, Layers, TrendingUp, Infinity,
  MessageCircle, Bell, AlertTriangle, CheckCircle2, RefreshCw
} from "lucide-react";
import { api } from "@/lib/axios";
import { supabase } from "@/integrations/supabase/client";
import TigerPlayer from "@/components/TigerPlayer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PackType = "FREE" | "PRO" | "ELITE";

interface Pack {
  id: string;
  code: string;
  name: string;
  price: number;
  duration: number; // -1 for unlimited
  features: string[];
  isPopular: boolean;
  status: string;
  type: PackType;
  totalPurchases?: number;
}

interface FeatureItem {
  id: string;
  text: string;
}

const ICONS: Record<string, any> = { 
  FREE: Rocket, 
  PRO: Zap, 
  ELITE: Crown 
};

const NARRATIVES: Record<string, string> = {
  FREE: "Platforma bilan tanishish va birinchi qadamni qo'shish uchun. IELTS dunyosiga bepul chiptangiz.",
  PRO: "Haqiqiy natija uchun. AI yordamida xatolaringizni tahlil qiling va tezroq o'sing.",
  ELITE: "Hech qanday chegara yo'q. Shaxsiy mentor va barcha premium imkoniyatlar sizning ixtiyoringizda."
};

export default function Packs() {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const isSuper = role === "super_admin";
  const isManager = role === "PACK_MANAGER" || role === "payment_manager" || isSuper;

  const [currentPackCode, setCurrentPackCode] = useState<string>("FREE");
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  // CRUD state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Pack> | null>(null);
  const [editFeatures, setEditFeatures] = useState<FeatureItem[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState<Pack | null>(null);

  const { data: packsData = [], isLoading: loadingPacks, refetch: loadPacks } = useQuery({
    queryKey: ["packs-list"],
    queryFn: async () => {
      const { data } = await api.get("/admin/packs");
      return (data || []).sort((a: Pack, b: Pack) => a.price - b.price);
    },
    placeholderData: (previousData) => previousData,
  });

  const packs = packsData;
  const loading = loadingPacks;

  const chooseMutation = useMutation({
    mutationFn: async (p: Pack) => {
      if (p.type === "FREE") {
        const { error } = await (supabase as any).rpc("subscribe_to_pack", { _pack_id: p.id });
        if (error) throw error;
        return { p, type: "FREE" };
      } else {
        await api.post("/admin/subscription-requests/submit", { pack_id: p.id });
        return { p, type: "PAID" };
      }
    },
    onSuccess: (res) => {
      if (res.type === "FREE") {
        queryClient.invalidateQueries({ queryKey: ["packs-list"] });
        toast.success("Free paket faollashtirildi");
      } else {
        setRequestSent(res.p);
      }
    },
    onError: (e: any) => {
      toast.error(e.message || "Xatolik yuz berdi");
    },
  });

  const onChoose = async (p: Pack) => {
    if (!user) { toast.error("Avval tizimga kiring"); return; }
    if (p.type === currentPackCode) return;
    chooseMutation.mutate(p);
  };

  const openNew = () => {
    setEditing({ code: "PRO", name: "", price: 0, duration: 1, features: [""], isPopular: false, status: "ACTIVE", type: "PRO", totalPurchases: 0 });
    setEditFeatures([{ id: Math.random().toString(36).substr(2, 9), text: "" }]);
    setEditorOpen(true);
  };

  const openEdit = (p: Pack) => {
    setEditing({ ...p });
    setEditFeatures((p.features || [""]).map(f => ({ id: Math.random().toString(36).substr(2, 9), text: f })));
    setEditorOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) return api.put(`/admin/packs/${payload.id}`, payload);
      return api.post("/admin/packs", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packs-list"] });
      setEditorOpen(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      setEditing(null);
      setEditFeatures([]);
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || "Saqlanmadi");
    },
  });

  const savePack = async () => {
    if (!editing || !editing.type) return;
    if (editing.price && editing.price < 0) {
      setShowError("Narx manfiy bo'lishi mumkin emas!");
      setTimeout(() => setShowError(null), 3000);
      return;
    }

    const cleanFeatures = editFeatures.map(f => f.text.trim()).filter(f => f !== "");
    if (cleanFeatures.length === 0) {
      toast.error("Kamida bitta imkoniyat kiritishingiz shart!");
      return;
    }

    const payload = {
      ...editing,
      features: cleanFeatures,
      price: editing.type === "FREE" ? 0 : Number(editing.price),
      duration: Number(editing.duration),
      totalPurchases: Number(editing.totalPurchases || 0),
      code: editing.type,
    };

    saveMutation.mutate(payload);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/admin/packs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packs-list"] });
      toast.success("O'chirildi");
      setDeleteId(null);
    },
    onError: () => {
      toast.error("O'chirishda xatolik");
    },
  });

  const deletePack = async () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  const saving = saveMutation.isPending;
  const sendingRequest = chooseMutation.isPending;

  const addFeature = () => {
    if (editFeatures.length >= 10) {
      toast.warning("Maksimal 10 ta imkoniyat!");
      return;
    }
    setEditFeatures([...editFeatures, { id: Math.random().toString(36).substr(2, 9), text: "" }]);
    setTimeout(() => {
      const inputs = document.querySelectorAll(".feature-input");
      (inputs[inputs.length - 1] as any)?.focus();
    }, 100);
  };

  const removeFeature = (id: string) => setEditFeatures(editFeatures.filter(f => f.id !== id));
  const updateFeature = (id: string, text: string) => setEditFeatures(editFeatures.map(f => f.id === id ? { ...f, text } : f));

  if (errorStatus === 500) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-8 bg-slate-50 dark:bg-slate-950 min-h-[70vh] rounded-[3rem] border border-red-200/50 dark:border-red-500/20 m-6">
        <TigerPlayer text="Serverda nosozlik, ustalar ishlamoqda... 🛠️" size={350} />
        <Button onClick={loadPacks} className="h-14 px-10 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-xs flex gap-3 hover:bg-slate-800">
          <RefreshCw className="h-4 w-4" /> Qayta urinib ko'rish
        </Button>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-6 bg-slate-50 dark:bg-slate-950 min-h-[60vh] rounded-[3rem] border border-slate-200/50 dark:border-white/5 m-6">
        <TigerPlayer text="Muvaffaqiyatli! Hammasi joyida! ✅" size={350} />
      </div>
    );
  }

  if (showError) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-6 bg-slate-50 dark:bg-slate-950 min-h-[60vh] rounded-[3rem] border border-red-200/50 m-6">
        <TigerPlayer text={showError} size={350} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 -m-6 p-6 sm:p-10 overflow-hidden transition-colors duration-700 font-sans selection:bg-primary/10">
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 dark:bg-primary/20 rounded-full blur-[150px] pointer-events-none" />
      
      <div className="relative space-y-16 max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row items-center md:items-end justify-between gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 text-center md:text-left max-w-2xl">
            <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">
              O'zingizga mos <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-indigo-500">yo'nalishni</span> belgilang
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl font-light leading-relaxed">
              Bizning moslashuvchan narxlarimiz har qanday darajadagi talaba uchun ideal. 
              Premium imkoniyatlar bilan IELTS natijangizni kafolatlang.
            </p>
          </motion.div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button onClick={() => setCompareOpen(true)} variant="ghost" className="h-12 px-6 rounded-2xl bg-white/50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 font-bold gap-2">
              <Layers className="h-4 w-4" /> Solishtirish
            </Button>
            {isSuper && (
              <Button onClick={openNew} size="lg" className="h-12 px-8 gap-2 bg-gradient-primary hover:opacity-90 shadow-glow rounded-2xl font-black uppercase text-xs tracking-widest text-white">
                <Plus className="h-5 w-5" /> Yangi paket
              </Button>
            )}
          </div>
        </header>

        <div className="grid lg:grid-cols-3 gap-10 items-stretch">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="space-y-6 p-10 bg-white/50 dark:bg-white/5 rounded-[2.5rem] border border-slate-100 dark:border-white/5">
                <Skeleton className="h-16 w-16 rounded-2xl bg-slate-200 dark:bg-white/10" />
                <Skeleton className="h-8 w-48 bg-slate-200 dark:bg-white/10" />
                <Skeleton className="h-12 w-full bg-slate-200 dark:bg-white/10" />
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full bg-slate-200 dark:bg-white/10" />
                  <Skeleton className="h-4 w-full bg-slate-200 dark:bg-white/10" />
                  <Skeleton className="h-4 w-2/3 bg-slate-200 dark:bg-white/10" />
                </div>
                <Skeleton className="h-14 w-full rounded-2xl bg-slate-200 dark:bg-white/10" />
              </div>
            ))
          ) : (
            <AnimatePresence>
              {packs.map((p, i) => {
                const Icon = ICONS[p.type] ?? Gift;
                const isCurrent = p.type === currentPackCode;
                const featured = p.isPopular || p.type === "PRO";
                
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="group"
                  >
                    <Card className={cn(
                      "relative h-full p-10 flex flex-col gap-10 transition-all duration-500 rounded-[2.5rem] overflow-hidden border-none",
                      "bg-white shadow-[0_20px_50px_-15px_rgba(15,23,42,0.06)] dark:shadow-none",
                      "dark:bg-slate-900/40 dark:backdrop-blur-3xl dark:border-[0.5px] dark:border-white/10",
                      featured && "ring-1 ring-primary/20 dark:ring-primary/40 shadow-glow shadow-primary/5",
                      isCurrent && "ring-2 ring-emerald-500/30 dark:ring-emerald-500/50"
                    )}>
                      <div className="absolute top-6 right-6 flex items-center gap-2">
                        {p.type === "ELITE" && <Badge className="bg-amber-500/10 text-amber-500 border-none text-[10px] font-black uppercase tracking-widest px-3 py-1">Premium</Badge>}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-[10px] font-bold text-slate-500 dark:text-primary/80">
                          <TrendingUp className="h-3 w-3" />
                          {p.totalPurchases || 0}+ tanlov
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className={cn(
                          "w-16 h-16 rounded-2xl grid place-items-center shadow-sm transition-transform duration-500 group-hover:scale-110",
                          p.type === "ELITE" ? "bg-amber-500/10 text-amber-500" : 
                          p.type === "PRO" ? "bg-primary/10 text-primary" : "bg-slate-50 dark:bg-white/5 text-slate-400"
                        )}>
                          <Icon className="h-8 w-8" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{p.name}</h3>
                            {featured && <span className="text-[10px] font-black uppercase tracking-widest text-primary px-2 py-0.5 bg-primary/5 rounded">Tavsiya</span>}
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 text-sm font-light leading-relaxed min-h-[48px]">
                            {NARRATIVES[p.type] || "Professional o'sish uchun minimalist va samarali tanlov."}
                          </p>
                        </div>
                      </div>

                      <div className="py-6 border-y border-slate-50 dark:border-white/5 flex items-baseline gap-2">
                        <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                          {p.price === 0 ? "Free" : Number(p.price).toLocaleString()}
                        </span>
                        {p.price > 0 && <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">UZS / {p.duration === -1 ? "Abadiy" : `${p.duration} oy`}</span>}
                      </div>

                      <ul className="space-y-5 flex-1">
                        {(p.features || []).map((f, idx) => (
                          <li key={idx} className="flex items-start gap-4 text-slate-600 dark:text-slate-300 text-[13px]">
                            <div className="mt-1 w-5 h-5 rounded-full bg-primary/5 dark:bg-primary/10 flex items-center justify-center shrink-0">
                              <Check className="h-3 w-3 text-primary" />
                            </div>
                            <span className="leading-tight">{f}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="space-y-4">
                        <Button
                          className={cn(
                            "w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all duration-500 text-white",
                            p.type === "ELITE" ? "bg-gradient-to-r from-amber-500 to-orange-600 shadow-amber-500/20" :
                            "bg-gradient-primary shadow-glow hover:opacity-90"
                          )}
                          disabled={isCurrent}
                          onClick={() => onChoose(p)}
                        >
                          {isCurrent ? "Sizning paket" : p.price === 0 ? "Packni faollashtirish" : "Sotib olish"}
                        </Button>

                        {isManager && (
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="flex-1 h-11 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400" onClick={() => openEdit(p)}>
                              <Pencil className="h-4 w-4 mr-2" /> Tahrirlash
                            </Button>
                            {isSuper && (
                              <Button variant="ghost" size="sm" className="w-11 h-11 rounded-xl bg-red-500/5 text-red-400" onClick={() => setDeleteId(p.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Success Request Modal */}
      <Dialog open={!!requestSent} onOpenChange={(v) => !v && setRequestSent(null)}>
        <DialogContent className="max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl rounded-[2.5rem] border-none shadow-2xl p-10 text-center">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="h-10 w-10 text-emerald-500" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white mb-2">So'rovingiz yuborildi!</DialogTitle>
            <p className="sr-only">Muvaffaqiyatli yuborilgan so'rov haqida ma'lumot</p>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-500 dark:text-slate-400 font-light leading-relaxed">
              Tez orada admin siz bilan bog'lanadi va <b>{requestSent?.name}</b> packingizni faollashtiradi. 
              Telegram orqali ham xabar yubordik! 🚀
            </p>
            <Button onClick={() => setRequestSent(null)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl h-14 font-black uppercase text-xs tracking-widest mt-4 shadow-lg shadow-emerald-500/20">
              Tushunarli
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Package Editor Modal */}
      <Dialog open={editorOpen} onOpenChange={(v) => { if (!v) { setEditorOpen(false); setEditing(null); setEditFeatures([]); } }}>
        <DialogContent className="max-w-3xl bg-white/90 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden flex flex-col max-h-[85vh]">
          <div className="p-8 pb-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                {editing?.id ? "Paketni Tahrirlash" : "Yangi Paket Yaratish"}
                {saving && <span className="text-[10px] text-primary animate-pulse font-bold ml-auto flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Saqlanmoqda...</span>}
              </DialogTitle>
              <p className="sr-only">Paket ma'lumotlarini kiritish va tahrirlash oynasi</p>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6 custom-scrollbar scroll-smooth">
            {editing && (
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Paket Turi (KOD)</Label>
                  <Select value={editing.type} onValueChange={(v: PackType) => setEditing({...editing, type: v, code: v, price: v === "FREE" ? 0 : (editing.price || 0)})}>
                    <SelectTrigger className={cn("h-12 rounded-xl bg-slate-50 dark:bg-white/5 border-none", editing.type === "ELITE" && "ring-2 ring-amber-500/50", editing.type === "PRO" && "ring-2 ring-primary/50")}>
                      <SelectValue placeholder="Turini tanlang" />
                    </SelectTrigger>
                    <SelectContent><SelectItem value="FREE">Tekin (FREE)</SelectItem><SelectItem value="PRO">Professional (PRO)</SelectItem><SelectItem value="ELITE">Cheksiz (ELITE)</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Paket Nomi</Label>
                  <Input className="bg-slate-50 dark:bg-white/5 h-12 rounded-xl border-none" value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Narx (UZS)</Label>
                  <Input type="number" className="bg-slate-50 dark:bg-white/5 h-12 rounded-xl border-none disabled:opacity-50" value={editing.price} disabled={editing.type === "FREE"} onChange={e => setEditing({...editing, price: +e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Muddat (Oy)</Label>
                  <Select value={String(editing.duration)} onValueChange={(v) => setEditing({...editing, duration: +v})}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 border-none"><SelectValue placeholder="Muddat" /></SelectTrigger>
                    <SelectContent><SelectItem value="1">1 oy</SelectItem><SelectItem value="3">3 oy</SelectItem><SelectItem value="6">6 oy</SelectItem><SelectItem value="12">12 oy</SelectItem><SelectItem value="-1">Cheksiz (Abadiy)</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-widest">Imkoniyatlar Ro'yxati</Label>
                    <Badge variant="outline" className={cn("px-2", editFeatures.length >= 10 ? "text-amber-500 border-amber-500/20" : "text-primary border-primary/20")}>{editFeatures.length} / 10</Badge>
                  </div>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar py-1">
                    <AnimatePresence mode="popLayout">
                      {editFeatures.map((f, i) => (
                        <motion.div key={f.id} initial={{ opacity: 0, height: 0, x: -10 }} animate={{ opacity: 1, height: "auto", x: 0 }} exit={{ opacity: 0, height: 0, x: 10 }} className="flex gap-3 mb-3">
                          <Input className="feature-input bg-slate-50 dark:bg-white/5 h-12 rounded-xl border border-slate-100 dark:border-white/10 flex-1 text-sm" value={f.text} onChange={e => updateFeature(f.id, e.target.value)} onKeyDown={(e) => e.key === "Enter" && addFeature()} />
                          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl bg-red-500/5 text-red-500" onClick={() => removeFeature(f.id)}><X className="h-4 w-4" /></Button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  <Button variant="outline" className="w-full h-12 rounded-xl border-dashed border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 font-bold" onClick={addFeature} disabled={editFeatures.length >= 10}><Plus className="h-4 w-4 mr-2" /> Yangi imkoniyat qo'shish</Button>
                </div>
                <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                  <div className="space-y-0.5"><p className="text-xs font-black uppercase tracking-tighter text-slate-700 dark:text-white">Mashhur (Popular)</p></div>
                  <Switch checked={!!editing.isPopular} onCheckedChange={v => setEditing({...editing, isPopular: v})} className="data-[state=checked]:bg-primary" />
                </div>
                <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                  <div className="space-y-0.5"><p className="text-xs font-black uppercase tracking-tighter text-slate-700 dark:text-white">Faol (Active)</p></div>
                  <Switch checked={editing.status === "ACTIVE"} onCheckedChange={v => setEditing({...editing, status: v ? "ACTIVE" : "INACTIVE"})} className="data-[state=checked]:bg-primary" />
                </div>
              </div>
            )}
          </div>
          <div className="bg-slate-50/50 dark:bg-white/5 p-6 border-t border-slate-100 dark:border-white/5 sticky bottom-0 z-10">
            <Button onClick={savePack} disabled={saving} className="w-full bg-gradient-primary h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] text-white shadow-lg">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "O'zgarishlarni Tasdiqlash"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-none rounded-[2.5rem] shadow-2xl">
          <AlertDialogHeader><AlertDialogTitle className="text-2xl font-black tracking-tight">O'chirishni tasdiqlaysizmi?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="bg-slate-100 dark:bg-white/5 border-none text-slate-500 rounded-2xl h-14 px-8 font-bold">Bekor qilish</AlertDialogCancel>
            <AlertDialogAction onClick={deletePack} className="bg-red-500 hover:bg-red-600 text-white rounded-2xl h-14 px-8 font-black uppercase text-xs tracking-widest shadow-lg shadow-red-500/20">Ha, o'chirilsin</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #8b5cf6; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #7c3aed; }
      `}</style>
    </div>
  );
}
