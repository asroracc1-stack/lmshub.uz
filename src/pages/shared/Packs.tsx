import { useTranslation } from "react-i18next";
import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, Sparkles, Crown, Gift, Loader2, CreditCard, Copy, Send, X,
  Plus, Pencil, Trash2, Settings, ShieldCheck, XCircle, Clock, Zap, Rocket, 
  ChevronRight, Info, Users, BarChart3, Star, Layers, Package, TrendingUp, Infinity,
  MessageCircle, Bell, AlertTriangle, CheckCircle2, RefreshCw, Search, Globe,
  BookOpen, ArrowUpRight, Lock
} from "lucide-react";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { usePackAccess } from "@/hooks/usePackAccess";
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
  oldPrice?: number;
  discountPercent?: number;
  duration: number; // in months
  durationDays?: number; // in days
  colorAndDesign?: string;
  icon?: string;
  accessAllMocks?: boolean;
  accessSatMocks?: boolean;
  accessNatMocks?: boolean;
  accessIeltsMocks?: boolean;
  accessCustomMocks?: boolean;
  accessAllBooks?: boolean;
  features: string[];
  isPopular: boolean;
  status: string;
  type: PackType;
  totalPurchases?: number;
  examIds?: string[];
  allowedBookIds?: string[];
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
  ELITE: Crown,
  Rocket: Rocket,
  Zap: Zap,
  Crown: Crown,
  Gift: Gift,
  Star: Star,
  Sparkles: Sparkles
};

const NARRATIVES: Record<string, string> = {
  FREE: "Platforma bilan tanishish va birinchi qadamni qo'shish uchun. IELTS dunyosiga bepul chiptangiz.",
  PRO: "Haqiqiy natija uchun. AI yordamida xatolaringizni tahlil qiling va tezroq o'sing.",
  ELITE: "Hech qanday chegara yo'q. Shaxsiy mentor va barcha premium imkoniyatlar sizning ixtiyoringizda."
};

const formatCard = (raw: string) => raw.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim();

export default function Packs() {
  const { t } = useTranslation();
  const { user, role, profile } = useAuth();
  const queryClient = useQueryClient();
  const isSuper = role === "super_admin";
  const isManager = role === "PACK_MANAGER" || role === "payment_manager" || isSuper;

  // This is the proven source of truth — used across the entire app
  const packAccess = usePackAccess();

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

  const [customDescription, setCustomDescription] = useState("");
  const [customImageUrl, setCustomImageUrl] = useState("");

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
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [examSearch, setExamSearch] = useState("");
  const [bookSearch, setBookSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState<Pack | null>(null);
  const [viewMode, setViewMode] = useState<"all" | "my">("all");
  const [searchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("view") === "my") {
      setViewMode("my");
    }
  }, [searchParams]);

  // Fetch current user active subscriptions (list - for "My subscriptions" view)
  const { data: mySubscriptions = [] } = useQuery({
    queryKey: ["my-subscriptions-packs"],
    queryFn: async () => {
      const { data } = await api.get("/profile/my-subscriptions");
      return Array.isArray(data) ? data : (data?.content || data?.items || data?.subscriptions || []);
    },
    enabled: !!user && !isManager,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 10000,
  });

  /**
   * PRIMARY SOURCE OF TRUTH — backenddan kelgan aktiv subscription.
   * Polling: har 10 soniyada. Telegram tasdiqlangandan keyin avtomatik yangilanadi.
   * Button holati FAQAT shu ma'lumot asosida hisoblanadi.
   */
  const { data: activeSubscription } = useQuery({
    queryKey: ["my-active-subscription"],
    queryFn: async () => {
      const { data } = await api.get("/profile/my-subscription");
      return data || null;
    },
    enabled: !!user && !isManager,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 10000,
  });

  // Fetch pending payment requests
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ["my-pending-requests"],
    queryFn: async () => {
      const { data } = await api.get("/profile/my-subscription-requests").catch(() => ({ data: [] }));
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user && !isManager,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 10000,
  });

  /**
   * ACTIVE subscription computed once from backend data.
   * Single source of truth — hech qachon local state ishlatilmaydi.
   *
   * activeSubInfo.packType: "PRO" | "ELITE" | "FREE" | null
   * activeSubInfo.isActive: true/false
   * activeSubInfo.packageId: string | null
   * activeSubInfo.expiresAt: string | null
   */
  const activeSubInfo = useMemo(() => {
    if (isManager) return { isActive: false, packType: null as string | null, packageId: null as string | null, expiresAt: null as string | null };
    if (!activeSubscription) return { isActive: false, packType: null as string | null, packageId: null as string | null, expiresAt: null as string | null };

    const now = new Date();
    const status = (activeSubscription.status || "").toUpperCase();
    const hasActive: boolean =
      activeSubscription.hasActive === true ||
      activeSubscription.has_active === true ||
      activeSubscription.isActive === true ||
      status === "ACTIVE";

    const expiresAt: string | null =
      activeSubscription.expiresAt ||
      activeSubscription.expire_date ||
      activeSubscription.expireDate ||
      null;

    const notExpired = !expiresAt || new Date(expiresAt) > now;

    const packType: string | null = hasActive && notExpired
      ? (activeSubscription.packType ||
         activeSubscription.pack_type ||
         activeSubscription.packageType ||
         activeSubscription.type ||
         null)
      : null;

    const packageId: string | null = hasActive && notExpired
      ? (activeSubscription.packageId ||
         activeSubscription.packId ||
         activeSubscription.pack_id ||
         null)
      : null;

    return {
      isActive: hasActive && notExpired,
      packType: packType ? packType.toUpperCase() : null,
      packageId,
      expiresAt,
    };
  }, [activeSubscription, isManager]);

  /**
   * SINGLE SOURCE OF TRUTH — backend activeSubInfo asosida pack holati.
   * Hech qachon local state yoki cache ishlatilmaydi.
   *
   * Returns: 'ACTIVE' | 'PENDING' | 'LOWER_TIER' | 'UPGRADE' | 'NONE'
   * - 'ACTIVE'     : Bu paket foydalanuvchining hozirgi aktiv paketi
   * - 'LOWER_TIER' : Foydalanuvchi bundan yuqori paketga ega (masalan PRO ishlatayapti, FREE karta)
   * - 'UPGRADE'    : Foydalanuvchi bundan pastroq paketda (masalan PRO ishlatayapti, ELITE karta)
   * - 'PENDING'    : To'lov kutilmoqda
   * - 'NONE'       : Subscription yo'q
   */
  const getPackStatus = (p: Pack): 'ACTIVE' | 'PENDING' | 'LOWER_TIER' | 'UPGRADE' | 'NONE' => {
    if (isManager) return 'NONE';
    const pType = p.type.toUpperCase() as "FREE" | "PRO" | "ELITE";

    // FREE pack is always active (no subscription needed)
    if (pType === "FREE") {
      // If user has PRO/ELITE, FREE is a lower tier
      if (activeSubInfo.isActive && activeSubInfo.packType && activeSubInfo.packType !== "FREE") {
        return 'LOWER_TIER';
      }
      return 'ACTIVE';
    }

    // Tier hierarchy: FREE < PRO < ELITE
    const tierLevel: Record<string, number> = { FREE: 0, PRO: 1, ELITE: 2 };
    const userTier = activeSubInfo.isActive && activeSubInfo.packType
      ? (tierLevel[activeSubInfo.packType] ?? -1)
      : -1;
    const cardTier = tierLevel[pType] ?? 0;

    // Check if this exact pack is the user's active subscription
    if (activeSubInfo.isActive) {
      // Exact packageId match (most precise)
      if (activeSubInfo.packageId && activeSubInfo.packageId === p.id) {
        return 'ACTIVE';
      }
      // packType match
      if (activeSubInfo.packType === pType) {
        return 'ACTIVE';
      }
      // User has higher tier — this card is a lower tier
      if (userTier > cardTier) {
        return 'LOWER_TIER';
      }
      // User has lower tier — this card is an upgrade
      if (userTier < cardTier) {
        return 'UPGRADE';
      }
    }

    // Check pending requests
    for (const req of pendingRequests) {
      const reqPackType: string = (
        req.packType || req.pack_type || req.packageType || req.type || ""
      ).toUpperCase();
      const reqPackId: string = (req.packId || req.pack_id || req.packageId || req.package_id || "").toString();
      const reqPackCode: string = (req.packCode || req.pack_code || req.packageCode || req.code || "").toString();
      const reqPackName: string = (req.packName || req.pack_name || req.packageName || "").toUpperCase();

      const reqMatches =
        reqPackId === p.id ||
        reqPackCode === p.code ||
        reqPackType === pType ||
        reqPackName.includes(pType);

      const reqStatus: string = (req.status || "").toUpperCase();
      if (reqMatches && reqStatus === "PENDING") return 'PENDING';
    }

    return 'NONE';
  };

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
        oldPrice: p.oldPrice ?? p.old_price,
        discountPercent: p.discountPercent ?? p.discount_percent,
        duration: p.duration,
        durationDays: p.durationDays ?? p.duration_days ?? 30,
        colorAndDesign: p.colorAndDesign ?? p.color_and_design,
        icon: p.icon,
        accessAllMocks: p.accessAllMocks ?? p.access_all_mocks ?? false,
        accessSatMocks: p.accessSatMocks ?? p.access_sat_mocks ?? false,
        accessNatMocks: p.accessNatMocks ?? p.access_nat_mocks ?? false,
        accessIeltsMocks: p.accessIeltsMocks ?? p.access_ielts_mocks ?? false,
        accessCustomMocks: p.accessCustomMocks ?? p.access_custom_mocks ?? false,
        accessAllBooks: p.accessAllBooks ?? p.access_all_books ?? false,
        features: p.features || [],
        isPopular: p.isPopular ?? p.is_popular ?? false,
        status: p.status,
        type: p.type,
        totalPurchases: p.totalPurchases ?? p.total_purchases ?? 0,
        examIds: p.examIds ?? p.exam_ids ?? [],
        allowedBookIds: p.allowedBookIds ?? p.allowed_book_ids ?? [],
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

  // Fetch available library materials for checklist
  const { data: libraryBooksList = [] } = useQuery<any[]>({
    queryKey: ["all-library-materials"],
    queryFn: async () => {
      const { data } = await api.get("/library/materials", { params: { size: 500 } });
      return data.content || [];
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
      toast.error(t("dynamic.packs.iltimos_to_lovni_qabul_qiluvchi_adminni_"));
      return;
    }
    if (!file) {
      toast.error(t("dynamic.payment.iltimos_to_lov_cheki_rasmini_yuklang"));
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
      toast.error(t("dynamic.packs.iltimos_ismingiz_telefon_raqamingiz_va_e"));
      return;
    }
    if (!file) {
      toast.error(t("dynamic.payment.iltimos_to_lov_cheki_rasmini_yuklang"));
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
      toast.error(t("dynamic.packs.iltimos_ismingiz_telefon_raqamingiz_va_e"));
      return;
    }
    if (!file) {
      toast.error(t("dynamic.payment.iltimos_to_lov_cheki_rasmini_yuklang"));
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
      toast.error(t("dynamic.packs.o_chirishda_xatolik_yuz_berdi"));
    },
  });

  const openNew = () => {
    setCustomDescription("");
    setCustomImageUrl("");
    setEditing({
      code: "PRO",
      name: "",
      price: 0,
      oldPrice: 0,
      discountPercent: 0,
      duration: 1,
      durationDays: 30,
      colorAndDesign: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500",
      icon: "Zap",
      accessAllMocks: false,
      accessSatMocks: false,
      accessNatMocks: false,
      accessIeltsMocks: false,
      accessCustomMocks: false,
      accessAllBooks: false,
      features: [""],
      isPopular: false,
      status: "ACTIVE",
      type: "PRO",
      totalPurchases: 0,
    });
    setEditFeatures([{ id: Math.random().toString(36).substr(2, 9), text: "" }]);
    setSelectedExams([]);
    setSelectedBooks([]);
    setEditorOpen(true);
  };

  const openEdit = (p: Pack) => {
    const featuresRaw = p.features || [];
    const descItem = featuresRaw.find(f => f.startsWith("desc::"));
    setCustomDescription(descItem ? descItem.replace("desc::", "") : "");

    let imgUrl = "";
    let gradColor = p.colorAndDesign || "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500";
    if (p.colorAndDesign && p.colorAndDesign.includes("||")) {
      const parts = p.colorAndDesign.split("||");
      const imgPart = parts.find(x => x.startsWith("imageUrl::"));
      const gradPart = parts.find(x => x.startsWith("gradient::"));
      if (imgPart) imgUrl = imgPart.replace("imageUrl::", "");
      if (gradPart) gradColor = gradPart.replace("gradient::", "");
    } else if (p.colorAndDesign && p.colorAndDesign.startsWith("http")) {
      imgUrl = p.colorAndDesign;
    }
    setCustomImageUrl(imgUrl);

    setEditing({
      ...p,
      colorAndDesign: gradColor,
      features: featuresRaw.filter(f => !f.startsWith("desc::"))
    });
    
    const filteredFeats = featuresRaw.filter(f => !f.startsWith("desc::"));
    setEditFeatures(
      filteredFeats.length > 0 
        ? filteredFeats.map(f => ({ id: Math.random().toString(36).substr(2, 9), text: f }))
        : [{ id: Math.random().toString(36).substr(2, 9), text: "" }]
    );
    setSelectedExams(p.examIds || []);
    setSelectedBooks(p.allowedBookIds || []);
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
      toast.error(t("dynamic.packs.narx_manfiy_bo_lishi_mumkin_emas"));
      return;
    }

    const cleanFeatures = editFeatures.map(f => f.text.trim()).filter(f => f !== "");
    if (customDescription.trim()) {
      cleanFeatures.unshift(`desc::${customDescription.trim()}`);
    }
    
    if (cleanFeatures.length === 0) {
      toast.error(t("dynamic.packs.kamida_bitta_imkoniyat_kiritishingiz_sha"));
      return;
    }

    let finalColorAndDesign = editing.colorAndDesign || "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500";
    if (customImageUrl.trim()) {
      let baseGrad = finalColorAndDesign;
      if (finalColorAndDesign.includes("||")) {
        const parts = finalColorAndDesign.split("||");
        const gradPart = parts.find(x => x.startsWith("gradient::"));
        baseGrad = gradPart ? gradPart.replace("gradient::", "") : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500";
      }
      finalColorAndDesign = `imageUrl::${customImageUrl.trim()}||gradient::${baseGrad}`;
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
      oldPrice: editing.type === "FREE" ? 0 : (editing.oldPrice ? Number(editing.oldPrice) : null),
      discountPercent: editing.type === "FREE" ? 0 : (editing.discountPercent ? Number(editing.discountPercent) : null),
      duration: Number(editing.duration),
      durationDays: Number(editing.durationDays || 30),
      colorAndDesign: finalColorAndDesign,
      icon: editing.icon || "Zap",
      accessAllMocks: !!editing.accessAllMocks,
      accessSatMocks: !!editing.accessSatMocks,
      accessNatMocks: !!editing.accessNatMocks,
      accessIeltsMocks: !!editing.accessIeltsMocks,
      accessCustomMocks: !!editing.accessCustomMocks,
      accessAllBooks: !!editing.accessAllBooks,
      features: cleanFeatures,
      isPopular: editing.isPopular ?? false,
      status: editing.status ?? "ACTIVE",
      totalPurchases: Number(editing.totalPurchases || 0),
      examIds: selectedExams,
      allowedBookIds: selectedBooks,
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
      {viewMode === "my" ? (
        <div className="space-y-6">
          {/* Back Link */}
          <button
            onClick={() => setViewMode("all")}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-semibold transition-colors"
          >
            <ChevronRight className="h-4 w-4 rotate-180" /> Packlar
          </button>

          {/* Title */}
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Mening Packlarim
          </h1>

          {mySubscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              {/* Box Icon */}
              <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-6 border border-slate-200/50 dark:border-white/5">
                <Package className="h-12 w-12 text-slate-400" strokeWidth={1.5} />
              </div>
              
              <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold mb-6">
                Siz hali hech qanday pack sotib olmadingiz.
              </p>

              <Button
                onClick={() => setViewMode("all")}
                className="bg-[#52B788] hover:bg-[#409c6f] text-white px-8 h-12 rounded-xl font-bold text-sm tracking-wide shadow-md"
              >
                Barcha packlar
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mySubscriptions.map((sub: any) => {
                const isActive = sub.status === "ACTIVE" || sub.isActive === true;
                const startsDate = sub.startsAt ? new Date(sub.startsAt).toLocaleDateString("uz-UZ") : "—";
                const expiresDate = sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString("uz-UZ") : "—";

                return (
                  <div 
                    key={sub.id}
                    className={cn(
                      "p-6 rounded-[2.5rem] border transition-all flex flex-col gap-4 relative overflow-hidden bg-white dark:bg-slate-900/60 shadow-lg",
                      isActive 
                        ? "border-emerald-500/30 shadow-emerald-500/[0.03] dark:shadow-none" 
                        : "border-slate-100 dark:border-slate-800/80 opacity-85"
                    )}
                  >
                    {isActive && (
                      <div className="absolute right-0 top-0 h-16 w-16 bg-emerald-500/10 rounded-bl-[2.5rem] flex items-center justify-center pl-4 pb-4">
                        <Check className="h-5 w-5 text-emerald-500" strokeWidth={3} />
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5 pr-6">
                      <span className={cn(
                        "px-2.5 py-0.5 text-[9px] font-black tracking-widest uppercase rounded-lg shadow-sm w-fit",
                        sub.packType === "ELITE" && "bg-amber-500 text-white",
                        sub.packType === "PRO" && "bg-purple-500 text-white",
                        sub.packType === "FREE" && "bg-slate-500 text-white"
                      )}>
                        {sub.packType}
                      </span>
                      <h4 className="text-xl font-black text-slate-800 dark:text-white leading-tight">
                        {sub.packName}
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800/50 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Boshlanish vaqti</p>
                        <p className="font-bold text-slate-700 dark:text-slate-300 mt-1">{startsDate}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Tugash vaqti</p>
                        <p className="font-bold text-slate-700 dark:text-slate-300 mt-1">{expiresDate}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 mt-1">
                      <Badge 
                        className={cn(
                          "text-[10px] font-black uppercase tracking-wider px-3 py-1.5 border-none rounded-xl",
                          isActive 
                            ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25" 
                            : "bg-slate-500/15 text-slate-500 hover:bg-slate-500/25"
                        )}
                      >
                        {isActive ? "Faol" : "Muddati tugagan"}
                      </Badge>

                      {isActive && sub.remainingDays !== undefined && (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider block">Qolgan muddat</span>
                          <span className="text-sm font-black text-emerald-500">{sub.remainingDays} kun</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-100 dark:border-white/5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Barcha Packlar
          </h1>
          <p className="text-slate-500 dark:text-slate-450 mt-1 text-sm font-medium">
            Pack sotib olib, barcha testlarga kiring
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-stretch md:self-auto">
          <Button
            onClick={() => setViewMode("my")}
            className="bg-purple-600/15 hover:bg-purple-600/25 text-purple-650 dark:text-purple-400 border border-purple-500/20 hover:border-purple-500/35 px-5 h-11 rounded-xl font-bold text-xs tracking-wide shadow-md flex items-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Layers className="h-4 w-4" /> Mening Paketlarim
          </Button>

          {isManager && (
            <Button 
              onClick={openNew} 
              className="bg-[#6B28D9] hover:bg-[#581C87] text-white px-5 h-11 rounded-xl font-bold text-xs tracking-wide shadow-md flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Yangi paket yaratish
            </Button>
          )}
        </div>
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
          <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-300">{t("dynamic.packs.hech_qanday_paketlar_topilmadi")}</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2">{t("dynamic.packs.hozircha_tizimda_faol_o_quv_paketlari_ma")}</p>
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
                      <th className="py-4">{t("dynamic.packs.paket_nomi")}</th>
                      <th className="py-4">{t("dynamic.packs.turi")}</th>
                      <th className="py-4">{t("dynamic.packs.narxi")}</th>
                      <th className="py-4">{t("dynamic.packs.muddat")}</th>
                      <th className="py-4">{t("dynamic.finance.status")}</th>
                      <th className="py-4">{t("dynamic.packs.mocklar_soni")}</th>
                      <th className="py-4">{t("dynamic.packs.sotuvlar")}</th>
                      <th className="py-4 text-right">{t("dynamic.usersmanager.amallar")}</th>
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

          {/* ELITE banner — foydalanuvchi eng yuqori tarifda bo'lsa */}
          {activeSubInfo.isActive && activeSubInfo.packType === "ELITE" && (
            <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 shadow-sm">
              <Crown className="h-5 w-5 shrink-0 text-amber-500" />
              <p className="text-sm font-bold">
                Siz eng yuqori tarifdan — <span className="font-black">ELITE</span> — foydalanmoqdasiz. Barcha imkoniyatlar ochiq! 🎉
              </p>
            </div>
          )}

          {/* Premium Cards Grid for Client view */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {packs.map((p) => {
              // SINGLE SOURCE OF TRUTH — faqat backend activeSubInfo asosida
              const packStatus = getPackStatus(p);
              const isOwn      = packStatus === 'ACTIVE';
              const isPending  = packStatus === 'PENDING';
              const isLower    = packStatus === 'LOWER_TIER';   // user has higher plan
              const isUpgrade  = packStatus === 'UPGRADE';       // user can upgrade

              const isElite = p.type === "ELITE";
              const isPro   = p.type === "PRO";
              const isFree  = p.type === "FREE";

              const oldPriceVal = p.oldPrice || (isPro ? 99000 : isElite ? 199000 : 0);
              const priceVal    = p.price;
              const discountVal = p.discountPercent !== null && p.discountPercent !== undefined && p.discountPercent > 0
                ? p.discountPercent
                : (oldPriceVal > priceVal
                    ? Math.round(((oldPriceVal - priceVal) / oldPriceVal) * 100)
                    : 0);

              const bgImageMap: Record<string, string> = {
                FREE: "/green_gift_box.png",
                PRO:  "/purple_rocket.png",
                ELITE: "/gold_diamond.png"
              };
              const bgImage = bgImageMap[p.type] || "/placeholder.svg";

              const badgeBgMap: Record<string, string> = {
                FREE:  "bg-[#52B788] text-white",
                PRO:   "bg-[#7209B7] text-white",
                ELITE: "bg-[#F77F00] text-white"
              };

              const checkColorMap: Record<string, string> = {
                FREE:  "text-[#52B788]",
                PRO:   "text-[#7209B7]",
                ELITE: "text-[#F77F00]"
              };

              const cleanFeatures = p.features
                .filter(f => !f.startsWith("desc::"))
                .map(f => ({ text: f, active: !f.trim().toLowerCase().startsWith("x ") }));

              const durationText = isFree
                ? "Cheksiz"
                : `${p.durationDays || (p.duration ? p.duration * 30 : 30)} kun`;

              // ── Button renderer ──────────────────────────────────────────────
              // RULE: button holati FAQAT backenddan kelgan activeSubInfo asosida.
              // Hech qachon "Sotib olish" ACTIVE subscription uchun chiqmaydi.
              const renderActionButton = () => {
                // FREE pack — always shown as activated (no purchase needed)
                if (isFree) {
                  return (
                    <Button
                      disabled
                      className="h-10 px-6 rounded-xl font-extrabold uppercase text-[10px] tracking-wider border-none bg-emerald-600 text-white shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-default opacity-100"
                    >
                      Faollashgan <Check className="h-3.5 w-3.5" />
                    </Button>
                  );
                }

                // This card is the user's active subscription
                if (isOwn) {
                  return (
                    <Button
                      disabled
                      style={{ cursor: 'not-allowed' }}
                      className="h-10 px-6 rounded-xl font-extrabold uppercase text-[10px] tracking-wider border-none bg-emerald-600 text-white shadow-md shadow-emerald-500/20 flex items-center gap-1.5 opacity-100"
                    >
                      ✅ Sotib olingan <Check className="h-3.5 w-3.5" />
                    </Button>
                  );
                }

                // User already has a HIGHER plan — this card is redundant
                if (isLower) {
                  return (
                    <Button
                      disabled
                      style={{ cursor: 'not-allowed' }}
                      className="h-10 px-6 rounded-xl font-extrabold uppercase text-[10px] tracking-wider border-none bg-slate-400/80 dark:bg-slate-600/80 text-white flex items-center gap-1.5 opacity-100"
                    >
                      <Check className="h-3.5 w-3.5" /> Oldingi paket
                    </Button>
                  );
                }

                // Payment pending for this pack
                if (isPending) {
                  return (
                    <Button
                      disabled
                      style={{ cursor: 'not-allowed' }}
                      className="h-10 px-6 rounded-xl font-extrabold uppercase text-[10px] tracking-wider border-none bg-amber-500 text-white shadow-md shadow-amber-500/20 flex items-center gap-1.5 opacity-100"
                    >
                      ⏳ Kutilmoqda
                    </Button>
                  );
                }

                // User can upgrade to this higher tier
                if (isUpgrade) {
                  return (
                    <Button
                      onClick={() => setCheckoutPack(p)}
                      className={cn(
                        "h-10 px-6 rounded-xl font-extrabold uppercase text-[10px] tracking-wider shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-white border-none flex items-center gap-1.5",
                        isElite
                          ? "bg-[#F77F00] hover:bg-[#D96E00] shadow-orange-500/20"
                          : "bg-[#7209B7] hover:bg-[#5E079B] shadow-purple-500/20"
                      )}
                    >
                      ⬆ Yangilash <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  );
                }

                // No subscription at all — show buy button
                return (
                  <Button
                    onClick={() => setCheckoutPack(p)}
                    className={cn(
                      "h-10 px-6 rounded-xl font-extrabold uppercase text-[10px] tracking-wider shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] text-white border-none flex items-center gap-1.5",
                      isPro
                        ? "bg-[#7209B7] hover:bg-[#5E079B] shadow-purple-500/20"
                        : "bg-[#F77F00] hover:bg-[#D96E00] shadow-orange-500/20"
                    )}
                  >
                    Sotib olish <ArrowUpRight className="h-3.5 w-3.5" />
                  </Button>
                );
              };
              // ────────────────────────────────────────────────────────────────

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
                        size="icon" variant="ghost"
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); openEdit(p); }}
                        className="h-8 w-8 rounded-full text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors"
                        title="Tahrirlash"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setDeleteId(p.id); }}
                        className="h-8 w-8 rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                        title={t("dynamic.usersmanager.o_chirish")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <div className={cn(
                    "w-full rounded-[2.5rem] border flex flex-col justify-between overflow-hidden relative transition-all duration-500 shadow-xl bg-white dark:bg-slate-900/60 hover:shadow-2xl hover:shadow-slate-150/40 dark:hover:shadow-none",
                    isOwn
                      ? "border-emerald-500/50 shadow-emerald-500/10 ring-1 ring-emerald-500/20"
                      : "border-slate-100 dark:border-slate-800/80"
                  )}>
                    {/* Card Cover Image Container */}
                    <div className="relative w-full aspect-[4/3] overflow-hidden rounded-t-[2.5rem]">
                      <img
                        src={bgImage}
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-black/10" />

                      {/* Top-Left Category Badge */}
                      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                        <span className={cn("px-3 py-1 text-[10px] font-black tracking-wider uppercase rounded-lg shadow-sm", badgeBgMap[p.type] || "bg-slate-500 text-white")}>
                          {p.type === "FREE" ? "BEPUL" : p.type}
                        </span>
                        {isOwn && (
                          <span className="bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 border border-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Aktiv
                          </span>
                        )}
                      </div>

                      {/* Discount badge (only if non-zero) */}
                      {discountVal > 0 && (
                        <div className="absolute top-4 right-4 z-10">
                          <span className="bg-[#FF3B30] text-white text-xs font-black px-2.5 py-1 rounded-full shadow-sm">
                            -{discountVal}%
                          </span>
                        </div>
                      )}

                      {/* Price overlay */}
                      <div className="absolute left-6 bottom-6 text-white z-10 flex flex-col justify-end">
                        {isFree ? (
                          <>
                            <h3 className="text-3xl font-black tracking-tight leading-none mb-1">FREE</h3>
                            <p className="text-xs font-semibold text-white/80 mb-3">Boshlang'ich paket</p>
                            <div className="text-3xl font-black tracking-tight leading-none">
                              0 <span className="text-xl font-bold">so'm</span>
                            </div>
                            <p className="text-xs font-semibold text-white/80 mt-1">Butunlay bepul</p>
                          </>
                        ) : (
                          <>
                            {oldPriceVal > 0 && (
                              <p className="line-through text-white/60 text-sm font-semibold mb-1">
                                {oldPriceVal.toLocaleString()} so'm
                              </p>
                            )}
                            <div className="text-3xl font-black tracking-tight leading-none">
                              {priceVal.toLocaleString()} <span className="text-xl font-bold">so'm</span>
                            </div>
                            <p className="text-xs font-semibold text-white/80 mt-1.5">
                              {p.durationDays || 30} kun uchun
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-8 flex flex-col gap-6 flex-1 justify-between">
                      <div className="space-y-4">
                        {cleanFeatures.map((f, idx) => {
                          const isX = f.text.trim().toLowerCase().startsWith("x ");
                          const displayText = isX ? f.text.trim().substring(2).trim() : f.text;
                          return (
                            <div key={idx} className="flex items-start gap-3">
                              {isX ? (
                                <X className="h-4.5 w-4.5 text-slate-400 shrink-0 mt-0.5" strokeWidth={3} />
                              ) : (
                                <Check className={cn("h-4.5 w-4.5 shrink-0 mt-0.5", checkColorMap[p.type] || "text-[#52B788]")} strokeWidth={3} />
                              )}
                              <span className={cn(
                                "text-sm",
                                isX ? "text-slate-400 font-medium" : "text-slate-800 dark:text-slate-200 font-semibold"
                              )}>
                                {displayText}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-6 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <Clock className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                          <span className="text-sm font-semibold">{durationText}</span>
                        </div>

                        {/* ACTION BUTTON — single source of truth */}
                        {renderActionButton()}
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
            <p className="text-xs text-slate-400 font-medium mt-1">{t("dynamic.packs.ma_lumotlaringizni_to_ldiring_va_to_lovn")}</p>
          </DialogHeader>

          {checkoutPack && (
            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1 py-4">
              {/* Pack details preview */}
              <div className="p-5 bg-gradient-to-r from-purple-500/10 to-violet-500/10 dark:from-purple-500/5 dark:to-violet-500/5 rounded-2xl border border-purple-500/20 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-purple-500 dark:text-purple-400">{t("dynamic.packs.tanlangan_tarif")}</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white">{checkoutPack.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t("dynamic.packs.narxi")}</p>
                  <p className="text-xl font-black text-purple-500">{checkoutPack.price.toLocaleString()} UZS</p>
                </div>
              </div>

              {/* Client Info Fields */}
              <div className="space-y-4">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">{t("dynamic.packs.sizning_ma_lumotlaringiz")}</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t("dynamic.packs.ism_familiya")}</Label>
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
                      <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{t("dynamic.packs.telefon_raqam")}</Label>
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
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">{t("dynamic.packs.to_lov_uchun_karta_ma_lumotlari")}</h4>
                <div className="relative h-40 w-full rounded-2xl bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-6 text-white shadow-xl overflow-hidden flex flex-col justify-between group border border-purple-500/20">
                  <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-purple-500/5 blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-700" />
                  
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-widest font-bold text-purple-400/80">{t("dynamic.packs.karta_egasi_ahror_fayzullayev")}</p>
                      <p className="font-bold text-sm tracking-tight text-slate-200">{t("dynamic.packs.ahror_fayzullayev")}</p>
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
                    <span className="text-[8px] uppercase tracking-wider font-bold text-slate-400">{t("dynamic.packs.to_lov_tizimi")}</span>
                    <Badge variant="outline" className="text-purple-400 border-purple-500/30 text-[9px] uppercase font-bold tracking-wider">
                      HUMO
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Receipt File Upload */}
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">{t("dynamic.packs.to_lov_cheki_rasm_yoki_chek")}</Label>
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
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-350">{t("dynamic.packs.to_lov_chekini_yuklang")}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{t("dynamic.packs.bosing_yoki_bu_yerga_sudrab_olib_keling_")}</p>
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
            Tez orada mas'ul adminlar to'lovingizni tekshirib <b>{requestSent?.name}</b>{t("dynamic.packs.paketingizni_faollashtiradi_va_profiling")}<b>{t("dynamic.packs.student")}</b> roliga ko'tariladi. Telegram orqali xabar yuborildi!
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
              <p className="text-xs text-slate-400 font-medium">{t("dynamic.packs.barcha_o_quv_planlari_va_mocklar_tarkibi")}</p>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6 custom-scrollbar scroll-smooth">
            {editing && (
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">{t("dynamic.packs.paket_turi_kod")}</Label>
                  <Select value={editing.type} onValueChange={(v: PackType) => setEditing({...editing, type: v, code: v, price: v === "FREE" ? 0 : (editing.price || 0)})}>
                    <SelectTrigger className={cn("h-12 rounded-xl bg-slate-50 dark:bg-white/5 border-none", editing.type === "ELITE" && "ring-2 ring-amber-500/50", editing.type === "PRO" && "ring-2 ring-primary/50")}>
                      <SelectValue placeholder="Turini tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FREE">{t("dynamic.packs.tekin_free")}</SelectItem>
                      <SelectItem value="PRO">{t("dynamic.packs.professional_pro")}</SelectItem>
                      <SelectItem value="ELITE">{t("dynamic.packs.cheksiz_elite")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">{t("dynamic.packs.paket_nomi")}</Label>
                  <Input className="bg-slate-50 dark:bg-white/5 h-12 rounded-xl border-none font-bold" value={editing.name} onChange={e => setEditing({...editing, name: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Paket Rasmi (Image URL)</Label>
                  <Input className="bg-slate-50 dark:bg-white/5 h-12 rounded-xl border-none font-bold" value={customImageUrl} onChange={e => setCustomImageUrl(e.target.value)} placeholder="e.g. https://images.unsplash.com/... yoki bo'sh qoldiring" />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Paket Tavsifi (Description)</Label>
                  <Input className="bg-slate-50 dark:bg-white/5 h-12 rounded-xl border-none font-bold" value={customDescription} onChange={e => setCustomDescription(e.target.value)} placeholder="e.g. Ushbu paket orqali premium writing testlaridan foydalana olasiz." />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">{t("dynamic.packs.narx_uzs")}</Label>
                  <Input type="number" className="bg-slate-50 dark:bg-white/5 h-12 rounded-xl border-none disabled:opacity-50 font-bold text-primary" value={editing.price} disabled={editing.type === "FREE"} onChange={e => setEditing({...editing, price: +e.target.value})} />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Eski Narxi (UZS)</Label>
                  <Input type="number" className="bg-slate-50 dark:bg-white/5 h-12 rounded-xl border-none disabled:opacity-50 text-slate-400 font-medium" value={editing.oldPrice || 0} disabled={editing.type === "FREE"} onChange={e => setEditing({...editing, oldPrice: +e.target.value})} />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Chegirma Foizi (%)</Label>
                  <Input type="number" className="bg-slate-50 dark:bg-white/5 h-12 rounded-xl border-none disabled:opacity-50 text-red-500 font-bold" value={editing.discountPercent || 0} disabled={editing.type === "FREE"} onChange={e => setEditing({...editing, discountPercent: +e.target.value})} />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Davomiyligi (kunlarda)</Label>
                  <Input type="number" className="bg-slate-50 dark:bg-white/5 h-12 rounded-xl border-none font-bold" value={editing.durationDays || 30} onChange={e => setEditing({...editing, durationDays: +e.target.value})} />
                </div>

                {/* Range & color presets */}
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Dizayn ranglari (Tailwind / CSS gradient)</Label>
                  <Input className="bg-slate-50 dark:bg-white/5 h-12 rounded-xl border border-slate-100 dark:border-white/10 font-mono text-xs" value={editing.colorAndDesign || ""} onChange={e => setEditing({...editing, colorAndDesign: e.target.value})} placeholder="e.g. bg-gradient-to-r from-purple-500 via-pink-500 to-red-500" />
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { name: "Neon Sunset", value: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" },
                      { name: "Ocean Breeze", value: "bg-gradient-to-r from-blue-600 via-teal-500 to-emerald-500" },
                      { name: "Sunset Fire", value: "bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500" },
                      { name: "Royal Indigo", value: "bg-gradient-to-r from-[#4f46e5] to-[#6366f1]" },
                      { name: "Amethyst", value: "bg-gradient-to-b from-[#9F86C0] to-[#240046]" },
                      { name: "Dark Nebula", value: "bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900" }
                    ].map(preset => (
                      <Button
                        key={preset.name}
                        type="button"
                        size="sm"
                        variant="outline"
                        className={cn("text-[10px] h-8 rounded-lg", editing.colorAndDesign === preset.value && "border-primary bg-primary/5 text-primary")}
                        onClick={() => setEditing({...editing, colorAndDesign: preset.value})}
                      >
                        <span className={cn("w-3 h-3 rounded-full mr-1.5 inline-block border border-white/20", preset.value)} />
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Icon Selection */}
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Paket Ikonkasi</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Rocket", "Zap", "Crown", "Gift", "Star", "Sparkles"].map(iconName => {
                      const IconComponent = ICONS[iconName];
                      return (
                        <Button
                          key={iconName}
                          type="button"
                          variant="outline"
                          className={cn("h-11 px-4 rounded-xl text-xs font-semibold", editing.icon === iconName && "border-primary bg-primary/10 text-primary")}
                          onClick={() => setEditing({...editing, icon: iconName})}
                        >
                          <IconComponent className="h-4 w-4 mr-2" />
                          {iconName}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Access control settings */}
                <div className="sm:col-span-2 border-t border-slate-100 dark:border-white/5 pt-4 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" /> Ruxsatlar va Access Nazorati
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Mock Access switches */}
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">MOCK TESTS ACCESS</p>
                      
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold">Barcha Mock Testlarga Ruxsat</Label>
                        <Switch checked={!!editing.accessAllMocks} onCheckedChange={v => setEditing({...editing, accessAllMocks: v})} />
                      </div>
                      
                      {!editing.accessAllMocks && (
                        <div className="space-y-2 border-t border-slate-100 dark:border-white/5 pt-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">SAT Mock Testlari</Label>
                            <Switch checked={!!editing.accessSatMocks} onCheckedChange={v => setEditing({...editing, accessSatMocks: v})} />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Milliy Sertifikat Mock Testlari</Label>
                            <Switch checked={!!editing.accessNatMocks} onCheckedChange={v => setEditing({...editing, accessNatMocks: v})} />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">IELTS Mock Testlari</Label>
                            <Switch checked={!!editing.accessIeltsMocks} onCheckedChange={v => setEditing({...editing, accessIeltsMocks: v})} />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Custom Mock Testlari</Label>
                            <Switch checked={!!editing.accessCustomMocks} onCheckedChange={v => setEditing({...editing, accessCustomMocks: v})} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Book Access switches */}
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">KUTUBXONA ACCESS</p>
                      
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold">Barcha Kitoblarga Ruxsat</Label>
                        <Switch checked={!!editing.accessAllBooks} onCheckedChange={v => setEditing({...editing, accessAllBooks: v})} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Left side: features list */}
                <div className="sm:col-span-2 grid sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-white/5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-widest">{t("dynamic.packs.imkoniyatlar_ro_yxati")}</Label>
                      <Badge variant="outline" className={cn("px-2", editFeatures.length >= 10 ? "text-amber-500 border-amber-500/20" : "text-primary border-primary/20")}>{editFeatures.length} / 10</Badge>
                    </div>
                    <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar py-1">
                      <AnimatePresence mode="popLayout">
                        {editFeatures.map((f) => (
                          <motion.div key={f.id} initial={{ opacity: 0, height: 0, x: -10 }} animate={{ opacity: 1, height: "auto", x: 0 }} exit={{ opacity: 0, height: 0, x: 10 }} className="flex gap-3 mb-3">
                            <Input className="feature-input bg-slate-50 dark:bg-white/5 h-12 rounded-xl border border-slate-100 dark:border-white/10 flex-1 text-sm font-semibold" value={f.text} onChange={e => updateFeature(f.id, e.target.value)} />
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
                    <Label className="text-[11px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-widest">{t("dynamic.packs.kiritiladigan_mock_testlar")}</Label>
                    
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

                {/* Allowed Books Multi-select List */}
                <div className="sm:col-span-2 space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                  <Label className="text-[11px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-widest">Ruxsat Beriladigan Kutubxona Materiallari (Faqat tanlangan kitoblar uchun)</Label>
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input value={bookSearch} onChange={e => setBookSearch(e.target.value)} placeholder="Kitoblarni qidirish..." className="bg-slate-50 dark:bg-white/5 h-10 pl-9 rounded-xl border-none" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar py-1">
                    {libraryBooksList.filter((b: any) => b.title?.toLowerCase().includes(bookSearch.toLowerCase())).map((b: any) => {
                      const checked = selectedBooks.includes(b.id);
                      return (
                        <div
                          key={b.id}
                          onClick={() => {
                            if (selectedBooks.includes(b.id)) {
                              setSelectedBooks(selectedBooks.filter(id => id !== b.id));
                            } else {
                              setSelectedBooks([...selectedBooks, b.id]);
                            }
                          }}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all",
                            checked 
                              ? "bg-purple-500/5 border-purple-500 text-purple-650" 
                              : "bg-slate-50/50 border-slate-100 hover:bg-slate-50 dark:bg-white/5 dark:border-white/5"
                          )}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="text-xs font-bold truncate">{b.title}</p>
                            <p className="text-[9px] text-slate-400 truncate">{b.author || "Muallif noma'lum"}</p>
                          </div>
                          <div className={cn(
                            "h-5 w-5 rounded-md border flex items-center justify-center transition-colors shrink-0",
                            checked ? "bg-purple-500 border-purple-500 text-white" : "border-slate-300"
                          )}>
                            {checked && <Check className="h-3 w-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                  <div className="space-y-0.5">
                    <p className="text-xs font-black uppercase tracking-tighter text-slate-700 dark:text-white">{t("dynamic.packs.mashhur_popular")}</p>
                  </div>
                  <Switch checked={!!editing.isPopular} onCheckedChange={v => setEditing({...editing, isPopular: v})} className="data-[state=checked]:bg-primary" />
                </div>

                <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                  <div className="space-y-0.5">
                    <p className="text-xs font-black uppercase tracking-tighter text-slate-700 dark:text-white">{t("dynamic.packs.faol_active")}</p>
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
            <AlertDialogTitle className="text-2xl font-black tracking-tight">{t("dynamic.finance.o_chirishni_tasdiqlaysizmi")}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Bu paketni butunlay tizimdan o'chirasiz. Bu amalni qaytarib bo'lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #8b5cf6; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #7c3aed; }
      `}</style>
    </div>
  );
}

