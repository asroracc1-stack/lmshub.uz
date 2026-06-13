import { useEffect, useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, Sparkles, Crown, Gift, Loader2, CreditCard, Copy, Send, X,
  Plus, Pencil, Trash2, Settings, ShieldCheck, XCircle, Clock, Zap, Rocket, 
  ChevronRight, Info, Users, BarChart3, Star, Layers, TrendingUp, Infinity,
  MessageCircle, Bell, AlertTriangle, CheckCircle2, RefreshCw, Search, Globe
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

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  useEffect(() => {
    if (profile) {
      setClientName(profile.full_name || "");
      setClientPhone(profile.phone || "");
      setClientEmail(profile.email || "");
    }
  }, [profile, checkoutPack]);

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
      return (data || []).map((p: any) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        price: p.price,
        duration: p.duration,
        features: p.features || [],
        isPopular: p.isPopular ?? p.is_popular ?? false,
        status: p.status,
        type: p.type,
        totalPurchases: p.totalPurchases ?? p.total_purchases ?? 0,
        examIds: p.examIds ?? p.exam_ids ?? [],
      })).sort((a: Pack, b: Pack) => a.price - b.price);
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

  const handleSiteSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!checkoutPack) return;
    if (!clientName.trim() || !clientPhone.trim() || !clientEmail.trim()) {
      toast.error("Iltimos, ismingiz, telefon raqamingiz va emailingizni to'liq kiriting");
      return;
    }
    if (!file) {
      toast.error("Iltimos, to'lov cheki rasmini yuklang");
      return;
    }

    setUploadingReceipt(true);
    try {
      // 1. Update user profile details
      await api.put("/profile/update", {
        fullName: clientName,
        email: clientEmail,
        phoneNumber: clientPhone
      });

      // 2. Upload receipt image
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const proofUrl = uploadRes.data;

      // 3. Submit subscription request
      await api.post("/admin/subscription-requests/submit", {
        pack_id: checkoutPack.id,
        receipt_url: proofUrl
      });

      // Confetti splash
      import("canvas-confetti").then(({ default: confetti }) => {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      });

      toast.success("So'rovingiz muvaffaqiyatli yuborildi! ✅", {
        description: "Admin tekshirib tasdiqlagach, obunangiz faollashtiriladi.",
      });

      setRequestSent(checkoutPack);
      setCheckoutPack(null);
      clearFile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "So'rov yuborishda xatolik yuz berdi");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleTelegramSubmit = async () => {
    if (!checkoutPack) return;
    if (!clientName.trim() || !clientPhone.trim() || !clientEmail.trim()) {
      toast.error("Iltimos, ismingiz, telefon raqamingiz va emailingizni to'liq kiriting");
      return;
    }
    if (!file) {
      toast.error("Iltimos, to'lov cheki rasmini yuklang");
      return;
    }

    setUploadingReceipt(true);
    try {
      // 1. Update profile details and submit request to DB
      await api.put("/profile/update", {
        fullName: clientName,
        email: clientEmail,
        phoneNumber: clientPhone
      });

      // 2. Upload receipt image
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const proofUrl = uploadRes.data;

      await api.post("/admin/subscription-requests/submit", {
        pack_id: checkoutPack.id,
        receipt_url: proofUrl
      });

      // 3. Open Telegram link
      const messageText = `🚀 Yangi Obuna So'rovi (LMSHub)

👤 Foydalanuvchi: ${clientName}
📧 Gmail: ${clientEmail}
📞 Telefon: ${clientPhone}
📦 Tarif: ${checkoutPack.name}
💰 Narxi: ${checkoutPack.price.toLocaleString()} UZS`;

      window.open(`https://t.me/asror_programmer?text=${encodeURIComponent(messageText)}`, "_blank");

      // Confetti
      import("canvas-confetti").then(({ default: confetti }) => {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      });

      toast.success("Telegram orqali yuborildi! 🚀", {
        description: "Telegram ochildi, xabarni yuboring va admin tasdiqlashini kuting.",
      });

      setRequestSent(checkoutPack);
      setCheckoutPack(null);
      clearFile();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "So'rov yuborishda xatolik yuz berdi");
    } finally {
      setUploadingReceipt(false);
    }
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

    // Generate unique code: TYPE-timestamp (only on create)
    const uniqueCode = editing.id 
      ? (editing.code || editing.type)  // keep existing code on edit
      : `${editing.type}-${Date.now()}`;

    const payload = {
      id: editing.id,
      name: editing.name,
      type: editing.type,
      code: uniqueCode,
      price: editing.type === "FREE" ? 0 : Number(editing.price),
      duration: Number(editing.duration),
      features: cleanFeatures,
      isPopular: editing.isPopular ?? false,
      status: editing.status ?? "ACTIVE",
      totalPurchases: Number(editing.totalPurchases || 0),
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
    <div className="p-2 space-y-6 w-full min-h-screen">
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
                <Badge variant="outline" className="text-purple-500 border-purple-500/20">
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
                            p.type === "FREE" && "text-purple-500 border-purple-500/20 bg-purple-500/5"
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
                          <Badge className={p.status === "ACTIVE" ? "bg-purple-500/10 text-purple-500 border-purple-500/20" : "bg-slate-500/10 text-slate-500"}>
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
              const PackIcon = p.type === "FREE" ? Gift : p.type === "ELITE" ? Zap : Crown;
              const isOwn = profile?.subscriptionPackCode === p.code || (p.type === "FREE" && !profile?.subscriptionPackCode);
              
              const isElite = p.type === "ELITE";
              const isPro = p.type === "PRO";
              const isFree = p.type === "FREE";

              const displayFeatures = isFree ? [
                { text: "5 ta test yaratish", active: true },
                { text: "Basic statistika", active: true },
                { text: "Leaderboard", active: true },
                { text: "AI tekshiruv", active: false },
                { text: "Premium mock testlar", active: false },
                { text: "Natijalar tahlili", active: false }
              ] : isElite ? [
                { text: "50 ta mock test / oy", active: true },
                { text: "IELTS testlari", active: true },
                { text: "SAT testlari", active: true },
                { text: "AI analiz va tekshiruv", active: true },
                { text: "Natijalar tahlili", active: true },
                { text: "Priority qo'llab-quvvatlash", active: true }
              ] : isPro ? [
                { text: "Cheksiz testlar", active: true },
                { text: "Cheksiz mock testlar", active: true },
                { text: "AI Coach (shaxsay mentor)", active: true },
                { text: "Premium analytics", active: true },
                { text: "Telegram bot integratsiyasi", active: true },
                { text: "Rasmiy sertifikat", active: true }
              ] : p.features.map(f => ({ text: f, active: !f.startsWith("x ") }));

              const packSubtitles: Record<string, string> = {
                FREE: "Boshlang'ich paket",
                ELITE: "Eng ko'p tanlangan",
                PRO: "Cheksiz imkoniyatlar"
              };

              return (
                <motion.div
                  key={p.id}
                  whileHover={{ y: -8, scale: 1.015 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative group flex"
                >
                  {/* Super Admin / Manager Action controls overlay */}
                  {isManager && (
                    <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-xl opacity-80 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          openEdit(p);
                        }}
                        className="h-8 w-8 rounded-full text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors"
                        title="Tahrirlash"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setDeleteId(p.id);
                        }}
                        className="h-8 w-8 rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                        title="O'chirish"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Neon border glow effect */}
                  <div className={cn(
                    "absolute inset-0 rounded-[2.5rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none",
                    isFree && "bg-slate-400/20",
                    isElite && "bg-purple-500/40",
                    isPro && "bg-indigo-500/40"
                  )} />

                  {/* Elite "MOST POPULAR" centered badge */}
                  {isElite && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#9F86C0] text-white text-[9px] font-black tracking-widest uppercase py-1.5 px-4 rounded-full shadow-lg z-10 flex items-center gap-1 border border-purple-450/20">
                      <Star className="h-3 w-3 fill-white text-white" /> MOST POPULAR
                    </div>
                  )}

                  <div className={cn(
                    "w-full rounded-[2.5rem] border flex flex-col justify-between overflow-hidden relative transition-all duration-500 shadow-2xl bg-white dark:bg-slate-900/60",
                    isFree && "border-slate-200 dark:border-slate-800",
                    isElite && "border-2 border-[#9F86C0] dark:border-purple-500/50 shadow-purple-500/5",
                    isPro && "border-2 border-[#6366f1] dark:border-indigo-500/50 shadow-indigo-500/5"
                  )}>
                    {/* Top half wrapper */}
                    <div className={cn(
                      "p-8 pb-6 relative flex flex-col gap-4",
                      isFree && "bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800/50",
                      isElite && "bg-gradient-to-b from-[#9F86C0] to-[#240046] text-white",
                      isPro && "bg-gradient-to-b from-[#4f46e5] to-[#6366f1] text-white"
                    )}>
                      {/* Circle icon container */}
                      <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center shadow-sm",
                        isFree 
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          : "bg-white/20 text-white backdrop-blur-md"
                      )}>
                        <PackIcon className="h-6 w-6" />
                      </div>

                      {/* Header Titles */}
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className={cn(
                            "text-2xl font-black tracking-tight",
                            isFree ? "text-slate-900 dark:text-white" : "text-white"
                          )}>
                            {p.name}
                          </h3>
                          {isOwn && (
                            <Badge className={cn(
                              "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                              isFree 
                                ? "bg-purple-500/10 text-purple-500 border-purple-500/20" 
                                : "bg-white text-purple-600 border-white/20 shadow-sm"
                            )}>
                              Joriy Obuna
                            </Badge>
                          )}
                        </div>
                        <p className={cn(
                          "text-[11px] font-bold mt-1.5",
                          isFree ? "text-slate-400 dark:text-slate-500" : "text-white/80"
                        )}>
                          {packSubtitles[p.type] || "Premium paket imkoniyatlari"}
                        </p>
                      </div>

                      {/* Price Section */}
                      <div className="mt-1">
                        <div className="flex items-baseline gap-1">
                          <span className={cn(
                            "text-3xl font-black tracking-tight",
                            isFree ? "text-slate-950 dark:text-white" : "text-white"
                          )}>
                            {p.price === 0 ? "0" : p.price.toLocaleString()}
                          </span>
                          <span className={cn(
                            "text-[10px] font-black tracking-wider uppercase",
                            isFree ? "text-slate-500" : "text-white/80"
                          )}>
                            UZS
                          </span>
                        </div>
                        {!isFree && (
                          <div className={cn(
                            "text-[10px] font-bold mt-0.5",
                            isFree ? "text-slate-400" : "text-white/70"
                          )}>
                            / oy
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom half container */}
                    <div className="p-8 flex flex-col gap-6 flex-1 justify-between bg-white dark:bg-slate-900">
                      {/* Features List */}
                      <div className="space-y-4">
                        {displayFeatures.map((f, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                              f.active 
                                ? (isPro 
                                    ? "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400"
                                    : "bg-purple-500/10 text-purple-500 dark:text-purple-400")
                                : "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-650"
                            )}>
                              {f.active ? (
                                <Check className="h-3 w-3" strokeWidth={3} />
                              ) : (
                                <X className="h-3 w-3" strokeWidth={3} />
                              )}
                            </div>
                            <span className={cn(
                              "text-xs font-semibold tracking-tight",
                              f.active 
                                ? "text-slate-750 dark:text-slate-200" 
                                : "text-slate-400 dark:text-slate-550 line-through opacity-70"
                            )}>
                              {f.text}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Action Button & Period Text */}
                      <div className="flex flex-col items-center gap-2.5 pt-2">
                        {isFree ? (
                          <>
                            <Button className="w-full bg-transparent border border-[#9F86C0] hover:bg-purple-500/5 text-[#9F86C0] h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-transform duration-300 hover:scale-[1.02] shadow-none">
                              Boshlash
                            </Button>
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider">Doimiy bepul</span>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() => setCheckoutPack(p)}
                              className={cn(
                                "w-full h-12 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-white border-none",
                                isElite 
                                  ? "bg-gradient-to-r from-purple-500 to-violet-500 shadow-purple-500/20 hover:shadow-purple-500/40" 
                                  : "bg-gradient-to-r from-indigo-500 to-purple-600 shadow-indigo-500/20 hover:shadow-indigo-500/40"
                              )}
                            >
                              {isElite ? "Obuna bo'lish" : "Pro olish"}
                            </Button>
                            <span className={cn(
                              "text-[9px] font-bold tracking-wider flex items-center gap-1",
                              isElite ? "text-[#9F86C0]" : "text-[#6366f1]"
                            )}>
                              <Check className="h-3 w-3" strokeWidth={3} /> 7 kunlik bepul sinov
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      <Dialog open={!!checkoutPack} onOpenChange={(v) => !v && setCheckoutPack(null)}>
        <DialogContent className="max-w-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[3rem] border-none shadow-2xl p-8 overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="relative pb-4 border-b border-slate-100 dark:border-white/5">
            <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-purple-500 animate-pulse" />
              </div>
              Tarifni Sotib Olish
            </DialogTitle>
            <p className="text-xs text-slate-400 font-medium mt-1">Ma'lumotlaringizni to'ldiring va to'lovni tasdiqlang</p>
          </DialogHeader>

          {checkoutPack && (
            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1 py-4">
              {/* Pack details preview */}
              <div className="p-5 bg-gradient-to-r from-purple-500/10 to-violet-500/10 dark:from-purple-500/5 dark:to-violet-500/5 rounded-2xl border border-purple-500/20 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-purple-500 dark:text-purple-400">Tanlangan tarif</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white">{checkoutPack.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Narxi</p>
                  <p className="text-xl font-black text-purple-500">{checkoutPack.price.toLocaleString()} UZS</p>
                </div>
              </div>

              {/* Client Info Fields */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Sizning ma'lumotlaringiz</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ism Familiya</Label>
                    <Input 
                      value={clientName} 
                      onChange={e => setClientName(e.target.value)} 
                      placeholder="Ism va familiyangizni kiriting" 
                      className="bg-slate-50 dark:bg-white/5 h-11 rounded-xl border-none text-sm font-semibold" 
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Gmail / Email</Label>
                      <Input 
                        type="email"
                        value={clientEmail} 
                        onChange={e => setClientEmail(e.target.value)} 
                        placeholder="example@gmail.com" 
                        className="bg-slate-50 dark:bg-white/5 h-11 rounded-xl border-none text-sm font-semibold" 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Telefon Raqam</Label>
                      <Input 
                        value={clientPhone} 
                        onChange={e => setClientPhone(e.target.value)} 
                        placeholder="+998 90 123 4567" 
                        className="bg-slate-50 dark:bg-white/5 h-11 rounded-xl border-none text-sm font-semibold" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment card */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">To'lov uchun karta ma'lumotlari</h4>
                <div className="relative h-40 w-full rounded-2xl bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-6 text-white shadow-xl overflow-hidden flex flex-col justify-between group border border-purple-500/20">
                  <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-purple-500/5 blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-700" />
                  
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-widest font-bold text-purple-400/80">Karta egasi (Ahror Fayzullayev)</p>
                      <p className="font-bold text-sm tracking-tight text-slate-200">Ahror Fayzullayev</p>
                    </div>
                    <CreditCard className="h-5 w-5 text-purple-500" />
                  </div>

                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5 backdrop-blur-md">
                    <p className="font-mono text-base font-black tracking-widest text-slate-100">
                      9860 1701 0590 7738
                    </p>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => copyCard("9860170105907738")}
                      className="h-8 w-8 hover:bg-white/10 text-purple-400 rounded-lg border-none"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex justify-between items-end text-xs">
                    <span className="text-[8px] uppercase tracking-wider font-bold text-slate-400">To'lov tizimi</span>
                    <Badge variant="outline" className="text-purple-400 border-purple-500/30 text-[9px] uppercase font-bold tracking-wider">
                      HUMO
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Receipt File Upload */}
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">To'lov cheki (Rasm yoki Chek)</Label>
                {preview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 p-3 bg-slate-50 dark:bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={preview} alt="Receipt Preview" className="w-14 h-14 object-cover rounded-xl" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-[200px]">{file?.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{(file!.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <Button type="button" size="icon" variant="ghost" onClick={clearFile} className="h-8 w-8 text-red-500 rounded-lg hover:bg-red-500/10">
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
                      "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2",
                      dragActive
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-slate-200 dark:border-white/15 hover:border-purple-500/50 hover:bg-slate-50/50 dark:hover:bg-white/5"
                    )}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                      <Send className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-350">To'lov chekini yuklang</p>
                      <p className="text-[10px] text-slate-400 mt-1">Bosing yoki bu yerga sudrab olib keling (PNG, JPG)</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <Button 
                  onClick={handleTelegramSubmit}
                  disabled={uploadingReceipt} 
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white h-13 rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg flex items-center justify-center gap-2 transition-all duration-300"
                >
                  {uploadingReceipt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Telegram Orqali Yuborish
                </Button>

                <Button 
                  onClick={() => handleSiteSubmit()}
                  disabled={uploadingReceipt} 
                  variant="outline"
                  className="w-full h-13 rounded-xl font-bold uppercase tracking-wider text-xs border border-slate-200 dark:border-white/10 flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-300"
                >
                  {uploadingReceipt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4 text-primary" />}
                  Sayt Orqali So'rov Yuborish
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Sent Modal */}
      <Dialog open={!!requestSent} onOpenChange={(v) => !v && setRequestSent(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-950 rounded-[3rem] border-none shadow-2xl p-8 text-center">
          <div className="h-20 w-20 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto mb-6 border border-purple-500/20">
            <CheckCircle2 className="h-10 w-10 animate-bounce" />
          </div>
          <h3 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">To'lov yuborildi! 🎉</h3>
          <p className="text-sm text-slate-400 font-medium mt-3 leading-relaxed">
            Tez orada mas'ul adminlar to'lovingizni tekshirib <b>{requestSent?.name}</b> paketingizni faollashtiradi va profilingiz avtomatik ravishda <b>STUDENT</b> roliga ko'tariladi. Telegram orqali xabar yuborildi!
          </p>
          <Button onClick={() => setRequestSent(null)} className="w-full mt-8 bg-purple-500 hover:bg-purple-600 text-white rounded-2xl h-14 font-black uppercase text-xs tracking-widest shadow-lg shadow-purple-500/20">
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

