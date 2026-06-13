import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Search,
  Send,
  ShieldCheck,
  Loader2,
  Wallet,
  Building2,
  Star,
  Landmark,
} from "lucide-react";

interface Receiver {
  id: string;
  full_name: string;
  card_number: string | null;
  card_holder: string | null;
  telegram_username: string | null;
  telegram_chat_id: string | null;
  payment_purpose: string | null;
  active: boolean;
  is_default: boolean;
  organization: Org | null;
  created_at: string;
}

interface Org { id: string; name: string }

const empty = (): Partial<Receiver> => ({
  organization: null,
  full_name: "",
  payment_purpose: "",
  card_number: "",
  card_holder: "",
  telegram_username: "",
  telegram_chat_id: "",
  active: true,
  is_default: false,
});

export default function PaymentReceivers() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Receiver[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Receiver>>(empty());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Receiver | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: rs }, { data: os }] = await Promise.all([
        api.get<Receiver[]>("/payment-receivers"),
        api.get<any>("/organizations?size=1000"), // get all for dropdown
      ]);
      setItems(Array.isArray(rs) ? rs : (rs as any)?.content || []);
      setOrgs(Array.isArray(os) ? os : os?.content || []);
    } catch (e) {
      toast.error(t("dynamic.paymentreceivers.yuklashda_xatolik"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const orgName = (org: Org | null) =>
    org ? org.name : "Global (Barcha)";

  const filtered = useMemo(() => items.filter((r) => {
    if (!q) return true;
    const hay = `${r.full_name} ${r.card_number} ${orgName(r.organization)}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  }), [items, q, orgs]);

  const openCreate = () => { setForm(empty()); setOpen(true); };
  const openEdit = (r: Receiver) => { setForm(r); setOpen(true); };

  const save = async () => {
    if (!form.full_name?.trim()) return toast.error("Ism/Nomi kerak");
    setSaving(true);
    try {
      const payload = {
        ...form,
        card_number: form.card_number?.trim() || null,
        organization: form.organization ? { id: form.organization.id } : null,
      };
      if (form.id) {
        await api.put(`/payment-receivers/${form.id}`, payload);
      } else {
        await api.post("/payment-receivers", payload);
      }
      toast.success(t("dynamic.paymentreceivers.saqlandi"));
      setOpen(false);
      load();
    } catch (e) {
      console.error("Save error:", e);
      toast.error((e as any).response?.data?.message || "Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (r: Receiver) => {
    try {
      await api.put(`/payment-receivers/${r.id}`, { ...r, active: !r.active });
      load();
    } catch (e) {
      console.error("Toggle error:", e);
      toast.error((e as any).response?.data?.message || "Xatolik");
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/payment-receivers/${confirmDelete.id}`);
      toast.success(t("dynamic.usersmanager.o_chirildi"));
      setConfirmDelete(null);
      load();
    } catch (e) {
      console.error("Delete error:", e);
      toast.error((e as any).response?.data?.message || "O'chirishda xatolik");
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" /> Payment Receivers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tashkilot/admin uchun to'lov qabul qiluvchilarni boshqarish
          </p>
        </div>
        <Button variant="hero" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Yangi qabul qiluvchi
        </Button>
      </div>

      <Card className="p-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Ism, karta, tashkilot, telegram..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <CreditCard className="h-10 w-10 mx-auto opacity-40 mb-2" />
          Hali qabul qiluvchilar yo'q
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <Card key={r.id} className="p-5 space-y-4 relative overflow-hidden hover:shadow-glow transition-smooth">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-primary grid place-items-center shrink-0">
                  <Landmark className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold truncate">{r.full_name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> {orgName(r.organization)}
                  </p>
                </div>
                {r.is_default && <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30 border-none">{t("dynamic.paymentreceivers.asosiy")}</Badge>}
              </div>

              <div className="rounded-lg bg-gradient-primary p-4 text-primary-foreground">
                <div className="flex items-center justify-between mb-1">
                  <CreditCard className="h-4 w-4 opacity-70" />
                  <span className="text-[10px] opacity-70 uppercase">{r.payment_purpose || "HISOB RAQAMI"}</span>
                </div>
                <p className="font-mono text-lg tracking-wider">
                  {r.card_number ? r.card_number.replace(/(.{4})/g, "$1 ").trim() : "0000 0000 0000 0000"}
                </p>
                {r.card_holder && <p className="text-xs mt-2 opacity-80 uppercase tracking-widest">{r.card_holder}</p>}
              </div>

              {r.telegram_username && (
                <div className="bg-secondary/40 rounded-md p-2 flex items-center gap-2">
                  <Send className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-mono">@{r.telegram_username}</span>
                </div>
              )}

              <div className="pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-xs">
                  <Switch checked={r.active} onCheckedChange={() => toggleActive(r)} />
                  <span className="text-muted-foreground">{r.active ? "Aktiv" : "Nofaol"}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive"
                          onClick={() => setConfirmDelete(r)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Tahrirlash" : "Yangi qabul qiluvchi"}</DialogTitle>
            <DialogDescription>{t("dynamic.paymentreceivers.karta__telegram_ma_lumotlari")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>{t("dynamic.paymentreceivers.fio_yoki_nomi_")}</Label>
              <Input value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Masalan: Asror, Payme yoki Kassir" />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t("dynamic.usersmanager.tashkilot")}</Label>
                <Select
                  value={form.organization?.id ?? "global"}
                  onValueChange={(v) => setForm({ ...form, organization: v === "global" ? null : { id: v, name: orgs.find(o=>o.id === v)?.name || "" } })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">{t("dynamic.paymentreceivers.global_barcha")}</SelectItem>
                    {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>{t("dynamic.paymentreceivers.to_lov_maqsadi")}</Label>
                <Select value={form.payment_purpose ?? "TOLOV"} onValueChange={(v) => setForm({ ...form, payment_purpose: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOLOV">{t("dynamic.paymentreceivers.oylik_to_lov")}</SelectItem>
                    <SelectItem value="KITOB">{t("dynamic.paymentreceivers.kitob_uchun")}</SelectItem>
                    <SelectItem value="FORM">{t("dynamic.paymentreceivers.forma_uchun")}</SelectItem>
                    <SelectItem value="BOSHQA">{t("dynamic.paymentreceivers.boshqa")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t("dynamic.usersmanager.karta_raqami")}</Label>
                <Input
                  value={form.card_number ?? ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setForm({ ...form, card_number: val });
                  }}
                  placeholder="8600 1234 5678 9012"
                  maxLength={16}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("dynamic.usersmanager.karta_egasi")}</Label>
                <Input
                  value={form.card_holder ?? ""}
                  onChange={(e) => setForm({ ...form, card_holder: e.target.value.toUpperCase() })}
                  placeholder="ASROR..."
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t("dynamic.usersmanager.telegram_username")}</Label>
                <Input
                  value={form.telegram_username ?? ""}
                  onChange={(e) => setForm({ ...form, telegram_username: e.target.value })}
                  placeholder="@username"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{t("dynamic.usersmanager.telegram_chat_id")}</Label>
                <Input
                  value={form.telegram_chat_id ?? ""}
                  onChange={(e) => setForm({ ...form, telegram_chat_id: e.target.value })}
                  placeholder="Masalan: 12345678"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={!!form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                  <Label className="cursor-pointer">{t("dynamic.paymentreceivers.aktiv")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={!!form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} />
                  <Label className="cursor-pointer">{t("dynamic.paymentreceivers.asosiy_default")}</Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("dynamic.usersmanager.bekor")}</Button>
            <Button variant="hero" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dynamic.paymentreceivers.o_chirishni_tasdiqlang")}</DialogTitle>
            <DialogDescription>
              "{confirmDelete?.full_name}" qabul qiluvchisi o'chiriladi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>{t("dynamic.usersmanager.bekor")}</Button>
            <Button variant="destructive" onClick={remove}>{t("dynamic.usersmanager.o_chirish")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

