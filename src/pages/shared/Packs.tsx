import { useEffect, useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, Sparkles, Crown, Gift, Loader2, CreditCard, Copy, Send, X,
  Plus, Pencil, Trash2, Settings, ShieldCheck, XCircle, Clock, Zap, Rocket, 
  ChevronRight, Info, Users, BarChart3, Star, Layers, TrendingUp, Infinity,
  MessageCircle, Bell, AlertTriangle, CheckCircle2, RefreshCw, Search
} from "lucide-react";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import TigerPlayer from "@/components/TigerPlayer";

type PackType = "FREE" | "PRO" | "ELITE";

interface ExamItem {
  id: string;
  title: string;
  type: string;
  difficulty?: string;
}

interface Pack {
  id: string;
  code: string;
  name: string;
  price: number;
  duration: number; // in months
  features: string[];
  isPopular: boolean;
  status: string;
  type: PackType;
  totalPurchases?: number;
  examIds?: string[];
}

interface FeatureItem {
  id: string;
  text: string;
}

interface AdminPaymentInfo {
  id: string;
  fullName: string;
  cardNumber: string;
  cardHolder: string;
  role: string;
  telegramUsername?: string;
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

const formatCard = (raw: string) => raw.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim();

export default function Packs() {
  const { user, role, profile } = useAuth();
  const queryClient = useQueryClient();
  const isSuper = role === "super_admin";
  const isManager = role === "PACK_MANAGER" || role === "payment_manager" || isSuper;

  // Checkout states
  const [checkoutPack, setCheckoutPack] = useState<Pack | null>(null);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminPaymentInfo | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // CRUD states
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Pack> | null>(null);
  const [editFeatures, setEditFeatures] = useState<FeatureItem[]>([]);
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [examSearch, setExamSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState<Pack | null>(null);

  // 1. Fetch available packages via Pack Manager API
  const { data: packs = [], isLoading: loadingPacks } = useQuery<Pack[]>({
    queryKey: ["packs-list"],
    queryFn: async () => {
      const { data } = await api.get("/pack-manager/packages");
      return (data || []).sort((a: Pack, b: Pack) => a.price - b.price);
    },
  });

  // 2. Fetch available mock exams for multi-select selector
  const { data: examsList = [] } = useQuery<ExamItem[]>({
    queryKey: ["all-exams-list"],
    queryFn: async () => {
      const { data } = await api.get("/admin/exams");
      return data || [];
    },
    enabled: isManager,
  });

  // 3. Fetch payment admins for Checkout card details
  const { data: admins = [], isLoading: loadingAdmins } = useQuery<AdminPaymentInfo[]>({
    queryKey: ["payment-admins-checkout", profile?.organization_id],
    queryFn: async () => {
      const { data } = await api.get("/payments/initiate/admins", {
        params: { organizationId: profile?.organization_id || undefined },
      });
      return data || [];
    },
    enabled: !!checkoutPack,
  });

  useEffect(() => {
    if (admins.length > 0 && !selectedAdmin) {
      setSelectedAdmin(admins[0]);
    }
  }, [admins]);

  // Set initial default amount based on checkout package
  useEffect(() => {
    if (checkoutPack) {
      setAmount(String(checkoutPack.price));
    }
  }, [checkoutPack]);

  // Handle Receipt Upload Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
  };

  // Submit Receipt Checkout
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutPack) return;
    if (!selectedAdmin) {
      toast.error("Iltimos, to'lovni qabul qiluvchi adminni tanlang");
      return;
    }
    if (!file) {
      toast.error("Iltimos, to'lov cheki rasmini yuklang");
      return;
    }

    setUploadingReceipt(true);
    try {
      // 1. Upload receipt image
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const proofUrl = uploadRes.data;

      // 2. Submit payment transaction
      await api.post("/payments/initiate", {
        studentId: user?.id,
        adminId: selectedAdmin.id,
        amount: Number(amount),
        paymentProofUrl: proofUrl,
        note: `Paket sotib olish: ${checkoutPack.name}. ${note}`,
      });

      // Confetti splash
      import("canvas-confetti").then(({ default: confetti }) => {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      });

      toast.success("To'lov cheki yuborildi! ✅", {
        description: "Admin tekshirib tasdiqlagach, paketingiz faollashadi va profilingiz Studentga aylanadi.",
      });

      setRequestSent(checkoutPack);
      setCheckoutPack(null);
      clearFile();
      setNote("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "To'lov so'rovini yuborishda xatolik yuz berdi");
    } finally {
      setUploadingReceipt(false);
    }
  };

  // Copy card utility
  const copyCard = (num: string) => {
    navigator.clipboard.writeText(num);
    toast.success("Karta raqami nusxalandi! 💳");
  };

  // CRUD Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        return api.put(`/pack-manager/packages/${payload.id}`, payload);
      }
      return api.post("/pack-manager/packages", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packs-list"] });
      setEditorOpen(false);
      setEditing(null);
      setEditFeatures([]);
      setSelectedExams([]);
      toast.success("Paket muvaffaqiyatli saqlandi! 🎉");
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.message || "Paketni saqlashda xatolik yuz berdi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/pack-manager/packages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packs-list"] });
      toast.success("Paket o'chirildi! 🗑️");
      setDeleteId(null);
    },
    onError: () => {
      toast.error("O'chirishda xatolik yuz berdi");
    },
  });

  const openNew = () => {
    setEditing({
      code: "PRO",
      name: "",
      price: 0,
      duration: 1,
      features: [""],
      isPopular: false,
      status: "ACTIVE",
      type: "PRO",
      totalPurchases: 0,
    });
    setEditFeatures([{ id: Math.random().toString(36).substr(2, 9), text: "" }]);
    setSelectedExams([]);
    setEditorOpen(true);
  };

  const openEdit = (p: Pack) => {
    setEditing({ ...p });
    setEditFeatures((p.features || [""]).map(f => ({ id: Math.random().toString(36).substr(2, 9), text: f })));
    setSelectedExams(p.examIds || []);
    setEditorOpen(true);
  };

  const addFeature = () => {
    if (editFeatures.length >= 10) return;
    setEditFeatures([...editFeatures, { id: Math.random().toString(36).substr(2, 9), text: "" }]);
  };

  const updateFeature = (id: string, text: string) => {
    setEditFeatures(editFeatures.map(f => (f.id === id ? { ...f, text } : f)));
  };

  const removeFeature = (id: string) => {
    setEditFeatures(editFeatures.filter(f => f.id !== id));
  };

  const savePack = async () => {
    if (!editing || !editing.type) return;
    if (editing.price !== undefined && editing.price < 0) {
      toast.error("Narx manfiy bo'lishi mumkin emas!");
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
      examIds: selectedExams,
    };

    saveMutation.mutate(payload);
  };

  const deletePack = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  const filteredExams = useMemo(() => {
    return examsList.filter(e => e.title.toLowerCase().includes(examSearch.toLowerCase()));
  }, [examsList, examSearch]);

  const toggleExam = (id: string) => {
    if (selectedExams.includes(id)) {
      setSelectedExams(selectedExams.filter(x => x !== id));
    } else {
      setSelectedExams([...selectedExams, id]);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto min-h-screen">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
        <div>
          <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            Obuna va Tariflar
          </Badge>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-3">
            Ta'lim Paketlari <Crown className="h-8 w-8 text-amber-500 animate-bounce" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Platformaning barcha premium xizmatlari, mock testlari va o'qish rejalari
          </p>
        </div>

        {isManager && (
          <Button onClick={openNew} className="bg-gradient-primary hover:opacity-90 text-white px-6 h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Yangi Paket Yaratish
          </Button>
        )}
      </div>

      {loadingPacks ? (
        <div className="grid md:grid-cols-3 gap-8 py-12">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-[500px] rounded-[2.5rem] bg-slate-100 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : packs.length === 0 ? (
        <Card className="p-16 text-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-[3rem] border-none shadow-xl">
          <Layers className="h-16 w-16 text-slate-400 mx-auto mb-4 animate-pulse" />
          <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-300">Hech qanday paketlar topilmadi</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Hozircha tizimda faol o'quv paketlari mavjud emas.</p>
        </Card>
      ) : (
        <div className="space-y-12">
          {/* Manager Table Mode */}
          {isManager && (
            <Card className="p-6 bg-white/60 dark:bg-slate-900/60 border border-slate-100 dark:border-white/5 backdrop-blur-xl rounded-[2.5rem] shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black tracking-tight text-slate-800 dark:text-white uppercase">
                  Boshqaruv Paneli (Paketlar Ro'yxati)
                </h3>
                <Badge variant="outline" className="text-emerald-500 border-emerald-500/20">
                  Manager Mode
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5 text-[11px] font-black uppercase tracking-widest text-slate-400">
                      <th className="py-4">Paket Nomi</th>
                      <th className="py-4">Turi</th>
                      <th className="py-4">Narxi</th>
                      <th className="py-4">Muddat</th>
                      <th className="py-4">Status</th>
                      <th className="py-4">Mocklar soni</th>
                      <th className="py-4">Sotuvlar</th>
                      <th className="py-4 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {packs.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                        <td className="py-4 font-bold text-slate-900 dark:text-white">{p.name}</td>
                        <td className="py-4">
                          <Badge variant="outline" className={cn(
                            p.type === "ELITE" && "text-amber-500 border-amber-500/20 bg-amber-500/5",
                            p.type === "PRO" && "text-primary border-primary/20 bg-primary/5",
                            p.type === "FREE" && "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                          )}>
                            {p.type}
                          </Badge>
                        </td>
                        <td className="py-4 font-black">
                          {p.price === 0 ? "Bepul" : `${p.price.toLocaleString()} UZS`}
                        </td>
                        <td className="py-4">
                          {p.duration === -1 ? "Cheksiz" : `${p.duration} oy`}
                        </td>
                        <td className="py-4">
                          <Badge className={p.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-slate-500/10 text-slate-500"}>
                            {p.status === "ACTIVE" ? "Faol" : "Draft"}
                          </Badge>
                        </td>
                        <td className="py-4 font-bold">{p.examIds?.length || 0} ta</td>
                        <td className="py-4 font-bold text-slate-500">{p.totalPurchases || 0}</td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(p)} className="h-9 w-9 rounded-xl text-primary hover:bg-primary/10">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteId(p.id)} className="h-9 w-9 rounded-xl text-red-500 hover:bg-red-500/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Premium Cards Grid for Client view */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {packs.map((p) => {
              const PackIcon = ICONS[p.type] || Zap;
              const isPopular = p.isPopular;
              const isOwn = profile?.subscriptionPackCode === p.code || (p.type === "FREE" && !profile?.subscriptionPackCode);

              return (
                <motion.div
                  key={p.id}
                  whileHover={{ y: -8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative group flex"
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black tracking-widest uppercase py-1.5 px-4 rounded-full shadow-lg shadow-amber-500/20 z-10 flex items-center gap-1.5 animate-pulse">
                      <Sparkles className="h-3 w-3" /> Eng Ommabop
                    </div>
                  )}

                  <Card className={cn(
                    "w-full p-8 rounded-[2.5rem] border flex flex-col justify-between overflow-hidden relative transition-all duration-500 shadow-xl",
                    isPopular 
                      ? "bg-slate-900 border-amber-500/30 text-white shadow-amber-500/5 dark:bg-slate-900/90" 
                      : "bg-white/80 border-slate-100 dark:bg-slate-900/40 dark:border-white/5 text-slate-800 dark:text-slate-200"
                  )}>
                    {/* Background glows */}
                    <div className={cn(
                      "absolute -right-20 -top-20 h-52 w-52 rounded-full blur-[100px] opacity-40 pointer-events-none transition-transform duration-700 group-hover:scale-150",
                      p.type === "ELITE" && "bg-amber-500",
                      p.type === "PRO" && "bg-primary",
                      p.type === "FREE" && "bg-emerald-500"
                    )} />

                    <div className="relative space-y-6">
                      <div className="flex items-center justify-between">
                        <div className={cn(
                          "h-14 w-14 rounded-2xl flex items-center justify-center border shadow-sm",
                          isPopular ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-primary/5 text-primary border-primary/10"
                        )}>
                          <PackIcon className="h-7 w-7" />
                        </div>
                        {isOwn && (
                          <Badge className="bg-emerald-500 text-white px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            Joriy Obuna
                          </Badge>
                        )}
                      </div>

                      <div>
                        <h3 className={cn("text-2xl font-black tracking-tight", isPopular ? "text-white" : "text-slate-900 dark:text-white")}>
                          {p.name}
                        </h3>
                        <p className="text-xs text-slate-400 dark:text-slate-400 mt-2 font-medium leading-relaxed">
                          {NARRATIVES[p.type] || "Premium paket imkoniyatlari"}
                        </p>
                      </div>

                      <div className="flex items-baseline gap-1 py-2">
                        <span className={cn("text-4xl font-black tracking-tight", isPopular ? "text-white" : "text-slate-900 dark:text-white")}>
                          {p.price === 0 ? "0" : p.price.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">UZS / {p.duration === -1 ? "Abadiy" : `${p.duration} oy`}</span>
                      </div>

                      <div className="border-t border-slate-100 dark:border-white/5 pt-6 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paket tarkibi:</p>
                        <div className="space-y-3">
                          {p.features.map((f, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-xs font-medium text-slate-500 dark:text-slate-300 leading-relaxed">{f}</span>
                            </div>
                          ))}
                        </div>

                        {p.examIds && p.examIds.length > 0 && (
                          <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kiritilgan mock testlar:</p>
                            <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 font-bold text-[10px]">
                              {p.examIds.length} ta IELTS Mock Testlari
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="relative pt-8 mt-auto">
                      {p.type === "FREE" ? (
                        <Button className="w-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 text-slate-600 dark:text-slate-300 h-14 rounded-2xl font-black uppercase text-xs tracking-widest" disabled>
                          Bepul Kirish
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setCheckoutPack(p)}
                          className={cn(
                            "w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]",
                            isPopular 
                              ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/20" 
                              : "bg-gradient-primary text-white shadow-primary/20"
                          )}
                        >
                          Sotib olish
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      <Dialog open={!!checkoutPack} onOpenChange={(v) => !v && setCheckoutPack(null)}>
        <DialogContent className="max-w-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[3rem] border-none shadow-2xl p-8 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="relative pb-4">
            <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary animate-pulse" />
              </div>
              To'lov va Sotib Olish
            </DialogTitle>
            <p className="text-xs text-slate-400 font-medium">To'lov chekini yuklab paketni faollashtiring</p>
          </DialogHeader>

          {checkoutPack && (
            <form onSubmit={handleCheckoutSubmit} className="space-y-5 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4">
              {/* Pack details preview */}
              <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tanlangan paket</p>
                  <p className="text-lg font-black text-slate-800 dark:text-white">{checkoutPack.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Narxi</p>
                  <p className="text-lg font-black text-primary">{checkoutPack.price.toLocaleString()} UZS</p>
                </div>
              </div>

              {/* Admin Picker */}
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Qabul qiluvchi mas'ul (Admin/Reception)</Label>
                {loadingAdmins ? (
                  <div className="h-12 w-full bg-slate-100 dark:bg-white/5 animate-pulse rounded-xl" />
                ) : (
                  <Select value={selectedAdmin?.id} onValueChange={(val) => setSelectedAdmin(admins.find(a => a.id === val) || null)}>
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 border-none">
                      <SelectValue placeholder="Adminni tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {admins.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.fullName} ({a.role.toUpperCase()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Virtual Glassmorphic Credit Card mockup */}
              {selectedAdmin && (
                <div className="relative h-44 w-full rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 text-white shadow-xl shadow-purple-600/20 overflow-hidden flex flex-col justify-between group">
                  <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/5 blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-700" />
                  
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-widest font-bold opacity-75">Qabul qiluvchi admin kartasi</p>
                      <p className="font-bold text-sm tracking-tight">{selectedAdmin.fullName}</p>
                    </div>
                    <CreditCard className="h-6 w-6 opacity-80" />
                  </div>

                  <div className="flex justify-between items-center bg-white/10 p-3.5 rounded-xl border border-white/10 backdrop-blur-md">
                    <p className="font-mono text-base font-black tracking-widest">
                      {formatCard(selectedAdmin.cardNumber)}
                    </p>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => copyCard(selectedAdmin.cardNumber)}
                      className="h-8 w-8 hover:bg-white/10 text-white rounded-lg"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-end text-xs opacity-80">
                    <div>
                      <p className="text-[8px] uppercase tracking-wider font-bold">Karta egasi</p>
                      <p className="font-bold text-[10px]">{selectedAdmin.cardHolder || selectedAdmin.fullName}</p>
                    </div>
                    <Badge variant="outline" className="text-white border-white/30 text-[9px] uppercase font-bold tracking-wider">
                      UzsCard/Humo
                    </Badge>
                  </div>
                </div>
              )}

              {/* Drag and Drop Dropzone for Receipt Upload */}
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">To'lov Cheki (Rasmi)</Label>
                
                {preview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={preview} alt="Receipt preview" className="h-16 w-16 object-cover rounded-xl" />
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">Chek rasmi tanlandi</p>
                        <p className="text-[10px] text-slate-400">{file?.name}</p>
                      </div>
                    </div>
                    <Button type="button" size="icon" onClick={clearFile} className="h-9 w-9 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border-none">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 bg-slate-50/50 hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10",
                      dragActive ? "border-primary bg-primary/5" : "border-slate-200 dark:border-white/10"
                    )}
                  >
                    <input type="file" ref={fileRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Send className="h-5 w-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Chek rasmini tortib tashlang yoki bosing</p>
                    <p className="text-[10px] text-slate-400">JPG, PNG formatlar, maksimal 5MB</p>
                  </div>
                )}
              </div>

              {/* Note / Comment */}
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">To'lovga izoh (Ixtiyoriy)</Label>
                <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Telefon raqamingiz yoki telegram username kiriting" className="bg-slate-50 dark:bg-white/5 h-12 rounded-xl border-none" />
              </div>

              <div className="pt-4 sticky bottom-0 bg-white/95 dark:bg-slate-900/95 z-10">
                <Button type="submit" disabled={uploadingReceipt} className="w-full bg-gradient-primary h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] text-white shadow-lg flex items-center justify-center gap-2">
                  {uploadingReceipt ? <Loader2 className="h-4 w-4 animate-spin" /> : "To'lov Chekini Tasdiqqa Yuborish"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Sent Modal */}
      <Dialog open={!!requestSent} onOpenChange={(v) => !v && setRequestSent(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-950 rounded-[3rem] border-none shadow-2xl p-8 text-center">
          <div className="h-20 w-20 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
            <CheckCircle2 className="h-10 w-10 animate-bounce" />
          </div>
          <h3 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">To'lov yuborildi! 🎉</h3>
          <p className="text-sm text-slate-400 font-medium mt-3 leading-relaxed">
            Tez orada mas'ul adminlar to'lovingizni tekshirib <b>{requestSent?.name}</b> paketingizni faollashtiradi va profilingiz avtomatik ravishda <b>STUDENT</b> roliga ko'tariladi. Telegram orqali xabar yuborildi!
          </p>
          <Button onClick={() => setRequestSent(null)} className="w-full mt-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl h-14 font-black uppercase text-xs tracking-widest shadow-lg shadow-emerald-500/20">
            Tushunarli
          </Button>
        </DialogContent>
      </Dialog>

      {/* Premium Package Editor Modal (Pack Manager Mode) */}
      <Dialog open={editorOpen} onOpenChange={(v) => { if (!v) { setEditorOpen(false); setEditing(null); setEditFeatures([]); } }}>
        <DialogContent className="max-w-4xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-8 pb-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                {editing?.id ? "Paketni Tahrirlash" : "Yangi Paket Yaratish"}
              </DialogTitle>
              <p className="text-xs text-slate-400 font-medium">Barcha o'quv planlari va mocklar tarkibini boshqarish</p>
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
                    <SelectContent>
                      <SelectItem value="FREE">Tekin (FREE)</SelectItem>
                      <SelectItem value="PRO">Professional (PRO)</SelectItem>
                      <SelectItem value="ELITE">Cheksiz (ELITE)</SelectItem>
                    </SelectContent>
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
                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 border-none">
                      <SelectValue placeholder="Muddat" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 oy</SelectItem>
                      <SelectItem value="3">3 oy</SelectItem>
                      <SelectItem value="6">6 oy</SelectItem>
                      <SelectItem value="12">12 oy</SelectItem>
                      <SelectItem value="-1">Cheksiz (Abadiy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Left side: features list */}
                <div className="sm:col-span-2 grid sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-white/5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-widest">Imkoniyatlar Ro'yxati</Label>
                      <Badge variant="outline" className={cn("px-2", editFeatures.length >= 10 ? "text-amber-500 border-amber-500/20" : "text-primary border-primary/20")}>{editFeatures.length} / 10</Badge>
                    </div>
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar py-1">
                      <AnimatePresence mode="popLayout">
                        {editFeatures.map((f) => (
                          <motion.div key={f.id} initial={{ opacity: 0, height: 0, x: -10 }} animate={{ opacity: 1, height: "auto", x: 0 }} exit={{ opacity: 0, height: 0, x: 10 }} className="flex gap-3 mb-3">
                            <Input className="feature-input bg-slate-50 dark:bg-white/5 h-12 rounded-xl border border-slate-100 dark:border-white/10 flex-1 text-sm" value={f.text} onChange={e => updateFeature(f.id, e.target.value)} />
                            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl bg-red-500/5 text-red-500" onClick={() => removeFeature(f.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                    <Button variant="outline" className="w-full h-12 rounded-xl border-dashed border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 font-bold" onClick={addFeature} disabled={editFeatures.length >= 10}>
                      <Plus className="h-4 w-4 mr-2" /> Yangi imkoniyat qo'shish
                    </Button>
                  </div>

                  {/* Right side: Mock exams multi-select list */}
                  <div className="space-y-4">
                    <Label className="text-[11px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-widest">Kiritiladigan Mock Testlar</Label>
                    
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input value={examSearch} onChange={e => setExamSearch(e.target.value)} placeholder="Mock testlarni qidirish..." className="bg-slate-50 dark:bg-white/5 h-10 pl-9 rounded-xl border-none" />
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar py-1">
                      {filteredExams.map((e) => {
                        const checked = selectedExams.includes(e.id);
                        return (
                          <div
                            key={e.id}
                            onClick={() => toggleExam(e.id)}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all",
                              checked 
                                ? "bg-primary/5 border-primary text-primary" 
                                : "bg-slate-50/50 border-slate-100 hover:bg-slate-50 dark:bg-white/5 dark:border-white/5"
                            )}
                          >
                            <div>
                              <p className="text-xs font-bold">{e.title}</p>
                              <Badge className="text-[8px] uppercase mt-1 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                                {e.type}
                              </Badge>
                            </div>
                            <div className={cn(
                              "h-5 w-5 rounded-md border flex items-center justify-center transition-colors",
                              checked ? "bg-primary border-primary text-white" : "border-slate-300"
                            )}>
                              {checked && <Check className="h-3 w-3" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                  <div className="space-y-0.5">
                    <p className="text-xs font-black uppercase tracking-tighter text-slate-700 dark:text-white">Mashhur (Popular)</p>
                  </div>
                  <Switch checked={!!editing.isPopular} onCheckedChange={v => setEditing({...editing, isPopular: v})} className="data-[state=checked]:bg-primary" />
                </div>

                <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                  <div className="space-y-0.5">
                    <p className="text-xs font-black uppercase tracking-tighter text-slate-700 dark:text-white">Faol (Active)</p>
                  </div>
                  <Switch checked={editing.status === "ACTIVE"} onCheckedChange={v => setEditing({...editing, status: v ? "ACTIVE" : "INACTIVE"})} className="data-[state=checked]:bg-primary" />
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50/50 dark:bg-white/5 p-6 border-t border-slate-100 dark:border-white/5 sticky bottom-0 z-10">
            <Button onClick={savePack} disabled={saveMutation.isPending} className="w-full bg-gradient-primary h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] text-white shadow-lg">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "O'zgarishlarni Tasdiqlash"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-none rounded-[2.5rem] shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight">O'chirishni tasdiqlaysizmi?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Bu paketni butunlay tizimdan o'chirasiz. Bu amalni qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
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
