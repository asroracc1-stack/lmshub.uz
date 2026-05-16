import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Pencil,
  Trash2,
  KeyRound,
  Search,
  Loader2,
  Send,
  CreditCard,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { api } from "@/lib/axios";
import TigerLoader from "@/components/TigerLoader";
import { usePackAccess } from "@/hooks/usePackAccess";

interface AdminRow {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  telegram_username: string | null;
  telegram_chat_id: string | null;
  payment_card_number: string | null;
  payment_card_owner: string | null;
  roles: string[];
}

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Login kamida 3 ta belgi bo'lishi kerak")
    .max(40)
    .regex(/^[a-z0-9_.-]+$/, "Login faqat kichik harflar, sonlar va _ . - belgilari bo'lishi mumkin"),
  password: z.string().min(6, "Parol kamida 6 ta belgi bo'lishi kerak").max(100),
  full_name: z.string().trim().min(2, "Ism juda qisqa").max(100),
  email: z.string().email("Noto'g'ri email formati").or(z.literal("")),
  phone: z.string().regex(/^\+?[0-9\s-]{7,20}$/, "Noto'g'ri telefon formati").or(z.literal("")),
});

const blank = {
  username: "",
  password: "",
  full_name: "",
  email: "",
  phone: "",
  telegram_username: "",
  telegram_chat_id: "",
  payment_card_number: "",
  payment_card_owner: "",
};

export default function AdminAdministrators() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [pwdTarget, setPwdTarget] = useState<AdminRow | null>(null);
  const [delTarget, setDelTarget] = useState<AdminRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(blank);
  const [newPwd, setNewPwd] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/users/by-role/ADMINISTRATOR');
      const data = response.data.content || response.data;
      setRows(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Failed to load administrators:", error);
      if (error.response?.status >= 500) setGlobalError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(blank);
    setOpen(true);
  };

  const openEdit = (r: AdminRow) => {
    setEditing(r);
    setForm({
      username: r.username,
      password: "",
      full_name: r.full_name || "",
      email: r.email || "",
      phone: r.phone || "",
      telegram_username: r.telegram_username || "",
      telegram_chat_id: r.telegram_chat_id || "",
      payment_card_number: r.payment_card_number || "",
      payment_card_owner: r.payment_card_owner || "",
    });
    setOpen(true);
  };

  const submit = async () => {
    const parsed = schema.safeParse({
      ...form,
      password: editing ? "dummy-pass" : form.password // Skip pass check for edit if empty
    });
    
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    try {
      // Sanitize inputs as requested
      const sanitizedPhone = form.phone.trim().replaceAll(' ', '');
      const sanitizedCard = form.payment_card_number.trim().replaceAll(' ', '');

      const payload = {
        full_name: form.full_name,
        email: form.email || null,
        phone_number: sanitizedPhone || null,
        telegram_username: form.telegram_username || null,
        telegram_chat_id: form.telegram_chat_id || null,
        card_number: sanitizedCard || null,
        card_holder: form.payment_card_owner || null,
        role: "ADMINISTRATOR", // Standardized Uppercase
        username: form.username.toLowerCase(),
      };

      if (editing) {
        await api.put(`/admin/users/${editing.id}`, payload);
      } else {
        await api.post('/admin/users', {
          ...payload,
          password: form.password,
        });
      }
      
      toast.success("Administrator saqlandi! 💜");
      setOpen(false);
      load();
    } catch (error: any) {
      console.error("Submit error:", error);
      if (error.response?.status >= 500) setGlobalError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!delTarget) return;
    try {
      await api.delete(`/admin/users/${delTarget.id}`);
      toast.success("Administrator o'chirildi");
      setDelTarget(null);
      load();
    } catch (error: any) {
      console.error("Delete error:", error);
      if (error.response?.status >= 500) setGlobalError(true);
    }
  };

  const resetPassword = async () => {
    if (!pwdTarget || newPwd.length < 6)
      return toast.error("Parol kamida 6 ta belgi");
    setSubmitting(true);
    try {
      await api.post(`/admin/users/${pwdTarget.id}/password`, {
        password: newPwd 
      });
      toast.success("Parol yangilandi! 🔐");
      setPwdTarget(null);
      setNewPwd("");
    } catch (error: any) {
      console.error("Reset pass error:", error);
      if (error.response?.status >= 500) setGlobalError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = rows.filter((m) => {
    const q = search.toLowerCase();
    return (
      (m.username || "").toLowerCase().includes(q) ||
      (m.full_name || "").toLowerCase().includes(q) ||
      (m.email || "").toLowerCase().includes(q)
    );
  });

  const [globalError, setGlobalError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-6xl mx-auto"
    >
      <TigerLoader isLoading={loading} text="Administratorlar ro'yxatini tekshiryapman... 🐯🔎" />
      <TigerLoader 
        isLoading={globalError} 
        text="Backend'da nosozlik, lekin men hozir to'g'irlayman! 🐯🛠️" 
      />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">
              {t("administrators.title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("administrators.desc")}</p>
          </div>
        </div>
        <Button onClick={openCreate} variant="hero">
          <Plus className="h-4 w-4 mr-1" /> {t("members.addNew")}
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-12 w-12 rounded-full mb-3" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          {t("administrators.noAdmins")}
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => {
            const initials = (m.full_name || m.username)
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();
            return (
              <Card
                key={m.id}
                className="p-5 flex flex-col gap-3 hover:shadow-glow transition-smooth border-primary/20"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-14 w-14 border-2 border-primary/30">
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">
                      {m.full_name || m.username}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">@{m.username}</p>
                    {m.telegram_username && (
                      <p className="text-xs text-primary mt-1 flex items-center gap-1">
                        <Send className="h-3 w-3" /> @{m.telegram_username}
                      </p>
                    )}
                    {m.payment_card_number && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />{" "}
                        {m.payment_card_number.replace(/(\d{4})(?=\d)/g, "$1 ")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 pt-2 border-t border-border">
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => openEdit(m)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> {t("common.edit")}
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => setPwdTarget(m)}>
                    <KeyRound className="h-3.5 w-3.5 mr-1" /> {t("members.password")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDelTarget(m)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent 
          className="max-w-lg p-0 overflow-hidden border-none shadow-2xl rounded-xl flex flex-col max-h-[90vh]"
          aria-describedby="admin-dialog-description"
        >
          <DialogHeader className="p-8 pb-4 shrink-0 bg-white dark:bg-slate-900">
            <DialogTitle>
              {editing ? t("common.edit") : t("members.addNew")} — Administrator
            </DialogTitle>
            <DialogDescription id="admin-dialog-description" className="text-sm text-muted-foreground">
              Tizim administratorlarini boshqarish: ma'lumotlarni to'g'ri va to'liq kiriting.
            </DialogDescription>
          </DialogHeader>

          <form 
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            className="flex-1 overflow-hidden flex flex-col"
          >
            <div className="flex-1 overflow-y-auto px-8 py-4 space-y-4 thin-scrollbar">
            {!editing && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">
                    {t("members.username")} *
                  </Label>
                  <Input
                    value={form.username}
                    onChange={(e) =>
                      setForm({ ...form, username: e.target.value.toLowerCase() })
                    }
                    placeholder="masalan: admin_az"
                    className="rounded-lg h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">
                    {t("members.password")} *
                  </Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="rounded-lg h-11"
                  />
                </div>
              </>
            )}
            {editing && (
              <div>
                <Label>{t("members.username")}</Label>
                <Input value={editing.username} disabled />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider opacity-70">
                {t("members.fullName")} *
              </Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="rounded-lg h-11"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider opacity-70">{t("members.email")}</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="rounded-lg h-11"
                  placeholder="example@mail.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider opacity-70">{t("members.phone")}</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="rounded-lg h-11"
                  placeholder="+998 90 123 45 67"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border space-y-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                💳 {t("members.card")}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">{t("members.card")}</Label>
                  <Input
                    placeholder="8600 1234 5678 9012"
                    value={form.payment_card_number}
                    onChange={(e) =>
                      setForm({ ...form, payment_card_number: e.target.value })
                    }
                    className="rounded-lg h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">{t("members.cardOwner")}</Label>
                  <Input
                    value={form.payment_card_owner}
                    onChange={(e) =>
                      setForm({ ...form, payment_card_owner: e.target.value })
                    }
                    className="rounded-lg h-11"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border space-y-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                ✈️ Telegram
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">{t("members.telegramUsername")}</Label>
                  <Input
                    placeholder="username"
                    value={form.telegram_username}
                    onChange={(e) =>
                      setForm({ ...form, telegram_username: e.target.value.replace(/^@/, "") })
                    }
                    className="rounded-lg h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Chat ID</Label>
                  <Input
                    value={form.telegram_chat_id}
                    onChange={(e) =>
                      setForm({ ...form, telegram_chat_id: e.target.value })
                    }
                    className="rounded-lg h-11"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="p-8 pt-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/80 backdrop-blur-md shrink-0 sticky bottom-0">
            <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting} variant="hero">
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

      {/* Reset password */}
      <Dialog open={!!pwdTarget} onOpenChange={(v) => !v && (setPwdTarget(null), setNewPwd(""))}>
        <DialogContent className="max-w-sm" aria-describedby="reset-password-description">
          <DialogHeader>
            <DialogTitle>{t("members.passwordReset")}</DialogTitle>
            <DialogDescription id="reset-password-description">
              Yangi parolni kiriting: @{pwdTarget?.username}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); resetPassword(); }}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider opacity-70">
                  {t("settings.newPassword")}
                </Label>
                <Input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="rounded-lg"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button variant="ghost" type="button" onClick={() => setPwdTarget(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={submitting} variant="hero">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!delTarget} onOpenChange={(v) => !v && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("members.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold">@{delTarget?.username}</span> —{" "}
              {t("members.deleteWarn")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
