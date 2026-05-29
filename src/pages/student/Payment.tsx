import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Copy,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Send,
  Receipt,
  ShieldCheck,
  Crown,
  Users,
  Sparkles,
  Wifi,
  Pencil,
  X,
  Save,
} from "lucide-react";

const formatCard = (raw?: string) => {
  if (!raw) return "—";
  const cleaned = raw.replace(/\D/g, "");
  const matches = cleaned.match(/.{1,4}/g);
  return matches ? matches.join(" ") : cleaned;
};

interface AdminPaymentInfo {
  id: string;
  full_name: string;
  card_number: string;
  card_holder: string;
  role: string;
  telegram_username?: string;
}

interface PaymentTransactionDto {
  id: string;
  student_id: string;
  student_name: string;
  payer_id: string;
  payer_name: string;
  admin_id: string;
  admin_name: string;
  amount: number;
  payment_proof_url: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  organization_id: string;
  note?: string;
  created_at: string;
}

interface Child {
  id: string;
  fullName: string | null;
  username: string;
  avatarUrl: string | null;
  coins: number;
  organizationId?: string;
}

const statusMeta = (s: string) => {
  switch (s) {
    case "PENDING":
    case "pending":
      return { label: "Kutilmoqda", icon: Clock, className: "bg-warning/15 text-warning border-warning/30 animate-pulse" };
    case "APPROVED":
    case "completed":
    case "paid":
      return { label: "Tasdiqlandi", icon: CheckCircle2, className: "bg-success/15 text-success border-success/30" };
    case "REJECTED":
    case "rejected":
    case "failed":
      return { label: "Rad etildi", icon: XCircle, className: "bg-destructive/15 text-destructive border-destructive/30" };
    default:
      return { label: s, icon: Clock, className: "bg-muted text-muted-foreground border-border" };
  }
};

export default function StudentPayment() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const [selectedAdmin, setSelectedAdmin] = useState<AdminPaymentInfo | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Edit mode state
  const [editingTx, setEditingTx] = useState<PaymentTransactionDto | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const editFileRef = useRef<HTMLInputElement>(null);

  const isParent = user?.role === "parent";

  // 1. Fetch Children for Parents
  const { data: children = [], isLoading: childrenLoading } = useQuery<Child[]>({
    queryKey: ["parent-children", user?.id],
    queryFn: async () => {
      const { data } = await api.get("/admin/parents/my-children");
      return data;
    },
    enabled: isParent && !!user?.id,
  });

  useEffect(() => {
    if (isParent && children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, isParent, selectedChildId]);

  const selectedChild = children.find((c) => c.id === selectedChildId);
  const selectedChildOrgId = selectedChild?.organizationId;
  const effectiveOrgId = isParent ? selectedChildOrgId : profile?.organization_id;

  // 2. Fetch Admins available for payment
  const { data: admins = [], isLoading: adminsLoading } = useQuery<AdminPaymentInfo[]>({
    queryKey: ["payment-admins", effectiveOrgId],
    queryFn: async () => {
      const { data } = await api.get("/payments/organization-cards", {
        params: { organizationId: effectiveOrgId || undefined },
      });
      return data || [];
    },
    enabled: !!effectiveOrgId,
  });

  useEffect(() => {
    if (admins.length > 0 && !selectedAdmin) {
      setSelectedAdmin(admins[0]);
    }
  }, [admins, selectedAdmin]);

  // 3. Fetch Payment History
  const { data: history = [], isLoading: historyLoading } = useQuery<PaymentTransactionDto[]>({
    queryKey: ["payment-history", user?.id],
    queryFn: async () => {
      const { data } = await api.get("/payments/history");
      return data || [];
    },
    enabled: !!user?.id,
  });

  const copyCard = async (cardNumber: string) => {
    if (!cardNumber) return;
    await navigator.clipboard.writeText(cardNumber.replace(/\s/g, ""));
    toast.success("Karta raqami nusxalandi! 💳");
  };

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
      onPickFile(e.dataTransfer.files[0]);
    }
  };

  const onPickFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Iltimos, faqat rasm fayl yuklang (JPG, PNG)");
    if (f.size > 5 * 1024 * 1024) return toast.error("Rasm hajmi 5MB dan kichik bo'lishi kerak");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const initiateMutation = useMutation({
    mutationFn: async (payload: { amount: number; note: string; payment_proof_url: string; admin_id: string; student_id: string }) => {
      return api.post("/payments/initiate", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-history"] });
      toast.success("To'lov so'rovi muvaffaqiyatli yuborildi! 🎉");
      setAmount("");
      setNote("");
      setFile(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (error: unknown) => {
      const errMsg = error && typeof error === "object" && "response" in error
        ? (error as { response: { data?: { message?: string } } }).response.data?.message
        : "To'lovni yuborishda xatolik yuz berdi";
      toast.error(errMsg || "To'lovni yuborishda xatolik yuz berdi");
    },
  });

  const submit = async () => {
    if (!user?.id || !effectiveOrgId) return toast.error("Tashkilot aniqlanmadi");
    if (!selectedAdmin) return toast.error("Iltimos, to'lov qabul qiluvchi adminni tanlang");
    const amt = Number(amount);
    if (!amt || amt < 1000) return toast.error("Summa kamida 1 000 so'm bo'lishi kerak");
    if (!file) return toast.error("Iltimos, to'lov cheki rasmini yuklang");

    const effectiveStudentId = isParent ? selectedChildId : user.id;
    if (!effectiveStudentId) return toast.error("Talaba aniqlanmadi");

    if (isUploading || initiateMutation.isPending) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Upload using Spring Boot backend REST file upload API
      const res = await api.post("/files/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      const publicUrl = res.data;

      // Call Spring Boot backend initiate endpoint
      await initiateMutation.mutateAsync({
        amount: amt,
        note: note || "",
        payment_proof_url: publicUrl,
        admin_id: selectedAdmin.id,
        student_id: effectiveStudentId,
      });

    } catch (e: unknown) {
      const errMsg = e && typeof e === "object" && "response" in e
        ? (e as { response: { data?: { message?: string } } }).response.data?.message
        : (e as Error).message || "Chekni yuklashda xatolik";
      toast.error(errMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const openEditModal = (tx: PaymentTransactionDto) => {
    setEditingTx(tx);
    setEditAmount(String(tx.amount));
    setEditNote(tx.note || "");
    setEditFile(null);
    setEditPreview(null);
  };

  const onPickEditFile = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Faqat rasm fayl yuklang (JPG, PNG)");
    if (f.size > 5 * 1024 * 1024) return toast.error("Rasm hajmi 5MB dan kichik bo'lishi kerak");
    setEditFile(f);
    setEditPreview(URL.createObjectURL(f));
  };

  const saveEdit = async () => {
    if (!editingTx) return;
    const amt = Number(editAmount);
    if (!amt || amt < 1000) return toast.error("Summa kamida 1 000 so'm bo'lishi kerak");
    setEditSaving(true);
    try {
      let newProofUrl: string | undefined;
      // Upload new receipt if changed
      if (editFile) {
        const formData = new FormData();
        formData.append("file", editFile);
        const uploadRes = await api.post("/files/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        newProofUrl = uploadRes.data;
      }

      await api.put(`/payments/${editingTx.id}`, {
        amount: amt,
        note: editNote,
        ...(newProofUrl ? { payment_proof_url: newProofUrl } : {}),
      });
      toast.success("To'lov muvaffaqiyatli tahrirlandi! ✏️");
      queryClient.invalidateQueries({ queryKey: ["payment-history"] });
      setEditingTx(null);
      setEditFile(null);
      setEditPreview(null);
    } catch (e: any) {
      const msg = e?.response?.data?.message || "Tahrirlashda xatolik";
      toast.error(msg);
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2.5">
          <CreditCard className="h-8 w-8 text-primary" /> To'lov va Cheklar
        </h1>
        <p className="text-muted-foreground mt-1">
          Tashkilot admini kartasiga to'lov qiling va chek skrinshotini yuklang
        </p>
      </div>

      {/* Parent Child Selector */}
      {isParent && children.length > 0 && (
        <Card className="p-5 bg-gradient-to-r from-primary/10 via-card to-card border-primary/20">
          <Label className="text-sm font-semibold mb-3 flex items-center gap-2 text-primary">
            <Users className="h-4 w-4" /> Qaysi farzandingiz uchun to'lov qilyapsiz?
          </Label>
          <div className="flex flex-wrap gap-3">
            {children.map((c) => {
              const active = selectedChildId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedChildId(c.id)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : "border-border hover:border-primary/40 bg-card text-card-foreground"
                  }`}
                >
                  <div className={`h-8 w-8 rounded-lg grid place-items-center text-sm font-bold ${
                    active ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                  }`}>
                    {(c.fullName || c.username || "?")[0].toUpperCase()}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-medium text-sm truncate">{c.fullName || c.username}</p>
                    <p className={`text-[10px] ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      Talaba
                    </p>
                  </div>
                  {active && <CheckCircle2 className="h-4 w-4 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Admin/Receiver Selector */}
      {adminsLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i)=> (
            <div key={i} className="p-4 rounded-2xl border-border bg-card animate-pulse h-28" />
          ))}
        </div>
      ) : admins.length > 1 && (
        <div>
          <Label className="mb-3 block text-sm font-semibold">Qabul qiluvchi Admin / Kassa</Label>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {admins.map((admin) => {
              const active = selectedAdmin?.id === admin.id;
              const Icon = admin.role.toLowerCase() === "admin" ? Crown : ShieldCheck;
              return (
                <button
                  key={admin.id}
                  type="button"
                  onClick={() => setSelectedAdmin(admin)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all relative overflow-hidden ${
                    active
                      ? "border-primary bg-primary/5 shadow-xl shadow-primary/10"
                      : "border-border hover:border-primary/40 bg-card shadow-sm"
                  }`}
                >
                  {active && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 rounded-bl-xl text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Tanlangan
                    </div>
                  )}
                  <div className="flex items-start gap-3.5">
                    <div className={`h-12 w-12 rounded-xl grid place-items-center shrink-0 ${
                      admin.role.toLowerCase() === "admin" ? "bg-warning/20 text-warning" : "bg-primary/20 text-primary"
                    }`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="font-display font-bold text-base truncate">{admin.full_name}</p>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5">
                        {admin.role.toLowerCase() === "admin" ? "Tashkilot Rahbari" : "Administrator"}
                      </p>
                      <p className="text-xs font-mono text-primary font-semibold mt-1">
                        {formatCard(admin.card_number)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Physical Card Mock-up */}
        <div className="lg:col-span-5 space-y-4">
          <Label className="text-sm font-semibold block">To'lov rekvizitlari (Haqiqiy Karta)</Label>
          {selectedAdmin ? (
            <motion.div
              key={selectedAdmin.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="relative group"
            >
              {/* Ambient Glow */}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-secondary to-accent rounded-[28px] blur-xl opacity-30 group-hover:opacity-50 transition duration-500" />
              
              <Card className="relative p-7 rounded-[24px] bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 text-white shadow-2xl border border-white/15 overflow-hidden backdrop-blur-xl">
                {/* Holographic / Glassmorphism Overlays */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none" />

                <div className="relative z-10 space-y-8">
                  {/* Card Header: Chip & Contactless */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* EMV Microchip */}
                      <div className="w-12 h-10 rounded-lg bg-gradient-to-br from-amber-200 via-amber-400 to-amber-500 p-1 shadow-inner flex flex-col justify-between border border-amber-600/40 opacity-90">
                        <div className="w-full h-[1px] bg-amber-700/30" />
                        <div className="w-full h-[1px] bg-amber-700/30" />
                        <div className="w-full h-[1px] bg-amber-700/30" />
                      </div>
                      {/* Contactless Wave */}
                      <Wifi className="h-6 w-6 text-white/70 rotate-90" />
                    </div>

                    <Badge className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3 py-1 text-xs tracking-widest backdrop-blur-md">
                      UZCARD / HUMO
                    </Badge>
                  </div>

                  {/* Card Number */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] uppercase tracking-widest text-white/60 font-medium">Karta Raqami</p>
                    <div className="flex items-center justify-between gap-4 bg-white/5 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                      <p className="font-mono text-2xl tracking-widest font-bold drop-shadow-md text-white">
                        {formatCard(selectedAdmin.card_number)}
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyCard(selectedAdmin.card_number)}
                        className="h-8 w-8 text-white hover:bg-white/20 hover:text-white transition-smooth shrink-0"
                        title="Karta raqamini nusxalash"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Card Holder & Role */}
                  <div className="flex items-end justify-between pt-2 border-t border-white/10">
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-white/60 font-medium mb-1">Karta Egasi</p>
                      <p className="font-display font-bold text-lg tracking-wide uppercase text-white drop-shadow">
                        {selectedAdmin.card_holder || selectedAdmin.full_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-widest text-white/60 font-medium mb-1">Qabul Qiluvchi</p>
                      <p className="font-medium text-sm text-white/90">
                        {selectedAdmin.role.toLowerCase() === "admin" ? "Tashkilot Admini" : "Administrator"}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ) : (
            <Card className="p-8 grid place-items-center text-center text-muted-foreground min-h-[260px] rounded-[24px]">
              <div>
                <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30 animate-pulse" />
                <p className="font-medium">Karta rekvizitlari mavjud emas.</p>
                <p className="text-xs mt-1">Admin o'z profilida karta raqamini sozlashi kerak.</p>
              </div>
            </Card>
          )}

          <AlertCard />
        </div>

        {/* Dropzone & Form */}
        <div className="lg:col-span-7">
          <Card className="p-7 space-y-6 shadow-xl border-border/80 rounded-[24px] bg-card/60 backdrop-blur-xl">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-xl">To'lov chekini yuborish</h2>
                <p className="text-xs text-muted-foreground">To'lov skrinshotini yuklang va tasdiqlashga yuboring</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Summa (UZS) *</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1000"
                    step="1000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Masalan: 500 000"
                    className="pl-4 pr-12 font-mono font-semibold text-lg h-12 rounded-xl"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground uppercase">
                    UZS
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Izoh (Ixtiyoriy)</Label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Qaysi oy yoki guruh uchun..."
                  className="h-12 rounded-xl"
                />
              </div>
            </div>

            {/* Drag and Drop Dropzone */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Chek yoki Skrinshot rasmi *</Label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />

              {preview ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative rounded-2xl overflow-hidden border-2 border-primary/30 bg-muted/20 p-2 shadow-inner group"
                >
                  <img
                    src={preview}
                    alt="Chek"
                    className="w-full h-64 object-contain rounded-xl bg-black/5"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-sm">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="shadow-lg rounded-xl font-medium"
                      onClick={() => fileRef.current?.click()}
                    >
                      Boshqa rasm tanlash
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="shadow-lg rounded-xl font-medium"
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                    >
                      O'chirish
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all flex flex-col items-center justify-center gap-3 text-center min-h-[220px] ${
                    dragActive
                      ? "border-primary bg-primary/10 scale-[1.01]"
                      : "border-border hover:border-primary/50 hover:bg-card/80 bg-card/40"
                  }`}
                >
                  <div className={`h-16 w-16 rounded-2xl grid place-items-center transition-transform duration-300 ${
                    dragActive ? "bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/30" : "bg-primary/10 text-primary"
                  }`}>
                    <Upload className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-base text-card-foreground">
                      {dragActive ? "Chekni bu yerga tashlang!" : "Chek rasmini yuklash uchun bosing yoki tashlang"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG fayllar (maksimal 5MB)</p>
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="hero"
              size="lg"
              className="w-full h-14 rounded-xl font-display font-bold text-lg shadow-xl shadow-primary/20"
              onClick={submit}
              disabled={isUploading || initiateMutation.isPending || !selectedAdmin}
            >
              {isUploading || initiateMutation.isPending ? (
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
              ) : (
                <Send className="h-5 w-5 mr-2" />
              )}
              {isUploading || initiateMutation.isPending ? "Yuborilmoqda..." : "Tasdiqlashga yuborish"}
            </Button>

            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-success" />
              To'lov cheki tashkilot ma'muriyatiga va Telegram bot orqali adminga zudlik bilan yetkaziladi.
            </p>
          </Card>
        </div>
      </div>

      {/* Payment History Section */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="font-display font-bold text-2xl flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" /> Mening to'lovlarim tarixi
          </h2>
          <Badge variant="outline" className="text-xs font-mono py-1 px-3 rounded-full">
            Jami: {history.length} ta so'rov
          </Badge>
        </div>

        {historyLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : history.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground rounded-2xl border-dashed">
            <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-lg">Hali to'lov so'rovlari yuborilmagan</p>
            <p className="text-xs mt-1">Yuqoridagi shakl orqali birinchi to'lov chekini yuklang.</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {history.map((tx) => {
              const m = statusMeta(tx.status);
              const Icon = m.icon;
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className={`p-5 rounded-2xl space-y-4 hover:shadow-md transition-all border duration-300 ${
                    tx.status === "APPROVED" || tx.status === "completed" || tx.status === "paid"
                      ? "border-amber-500/25 dark:border-amber-500/35 bg-amber-500/[0.04] dark:bg-amber-500/[0.08] hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/5" 
                      : tx.status === "REJECTED" || tx.status === "rejected" || tx.status === "failed"
                      ? "border-destructive/20 bg-destructive/[0.02] dark:bg-destructive/[0.05]"
                      : "border-border/60 bg-card/40 backdrop-blur-sm"
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary shrink-0">
                          <CreditCard className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-mono font-bold text-lg text-card-foreground">
                            {tx.amount.toLocaleString("uz-UZ")} UZS
                          </p>
                          <p className="text-[11px] text-muted-foreground font-medium">
                            {tx.admin_name} ({tx.admin_name ? "Admin" : "Qabul qiluvchi"})
                          </p>
                        </div>
                      </div>

                      <Badge className={m.className}>
                        <Icon className="h-3 w-3 mr-1" />
                        {m.label}
                      </Badge>
                    </div>

                    {tx.note && (
                      <p className="text-xs bg-muted/40 p-2.5 rounded-xl border border-border text-muted-foreground">
                        {tx.note}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/40">
                      <span>{new Date(tx.created_at).toLocaleString("uz-UZ")}</span>
                      <div className="flex items-center gap-3">
                        {tx.status === "PENDING" && (
                          <button
                            onClick={() => openEditModal(tx)}
                            className="text-primary hover:text-primary/80 font-medium flex items-center gap-1 hover:underline"
                          >
                            <Pencil className="h-3 w-3" /> Tahrirlash
                          </button>
                        )}
                        <a
                          href={
                            tx.payment_proof_url && (tx.payment_proof_url.startsWith("http") || tx.payment_proof_url.startsWith("/api/v1"))
                              ? tx.payment_proof_url
                              : `https://hicoderx.supabase.co/storage/v1/object/public/receipts/${tx.payment_proof_url}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline font-medium"
                        >
                          Chekni ko'rish ↗
                        </a>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Payment Modal */}
      <AnimatePresence>
        {editingTx && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setEditingTx(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <Card className="p-6 rounded-2xl space-y-5 shadow-2xl border-primary/20 bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
                      <Pencil className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg">To'lovni tahrirlash</h3>
                      <p className="text-xs text-muted-foreground">Faqat kutilmoqda holatdagi to'lovlar</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setEditingTx(null)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Receipt Image Preview - Clickable to Replace */}
                <input
                  ref={editFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPickEditFile(e.target.files?.[0] ?? null)}
                />
                <div
                  className="rounded-xl overflow-hidden border-2 border-dashed border-border/60 bg-muted/20 cursor-pointer group relative hover:border-primary/50 transition-all"
                  onClick={() => editFileRef.current?.click()}
                >
                  {(editPreview || editingTx.payment_proof_url) ? (
                    <>
                      <img
                        src={
                          editPreview
                            ? editPreview
                            : editingTx.payment_proof_url.startsWith("http") || editingTx.payment_proof_url.startsWith("/api/v1")
                              ? editingTx.payment_proof_url
                              : `https://hicoderx.supabase.co/storage/v1/object/public/receipts/${editingTx.payment_proof_url}`
                        }
                        alt="To'lov cheki"
                        className="w-full max-h-48 object-contain bg-black/5"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                        <Upload className="h-8 w-8 text-white" />
                        <p className="text-white text-sm font-medium">Yangi chek yuklash</p>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="h-8 w-8" />
                      <p className="text-sm font-medium">Chek rasmini yuklang</p>
                    </div>
                  )}
                  <div className="px-3 py-2 text-[11px] text-muted-foreground flex items-center gap-1.5 border-t border-border/40">
                    <Receipt className="h-3 w-3" />
                    {editFile ? `✅ Yangi chek: ${editFile.name}` : "Bosing va yangi chek yuklang"}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Summa (UZS)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="1000"
                        step="1000"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="pl-4 pr-12 font-mono font-semibold text-lg h-12 rounded-xl"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground uppercase">UZS</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Izoh</Label>
                    <Input
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Qaysi oy yoki guruh uchun..."
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-12 rounded-xl"
                    onClick={() => setEditingTx(null)}
                    disabled={editSaving}
                  >
                    Bekor qilish
                  </Button>
                  <Button
                    variant="hero"
                    className="flex-1 h-12 rounded-xl font-bold shadow-lg shadow-primary/20"
                    onClick={saveEdit}
                    disabled={editSaving}
                  >
                    {editSaving ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <Save className="h-5 w-5 mr-2" />
                    )}
                    {editSaving ? "Saqlanmoqda..." : "Saqlash"}
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AlertCard() {
  return (
    <Card className="p-5 rounded-[24px] bg-warning/10 border border-warning/20 text-warning-foreground space-y-2 shadow-sm">
      <div className="flex items-center gap-2 font-display font-bold text-sm text-warning">
        <Sparkles className="h-4 w-4" /> Diqqat, To'lov Qoidalari:
      </div>
      <p className="text-xs leading-relaxed opacity-90">
        To'lovni amalga oshirayotganda karta egasining ismini va karta raqamini diqqat bilan tekshiring. To'lov o'tgach, chekni (skrinshotni) saqlab qoling va ushbu sahifadan yuklang.
      </p>
    </Card>
  );
}
