import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  price_suffix: string | null;
  features: string[];
  cta_label: string;
  cta_link: string;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
}

const empty: Omit<Plan, "id"> = {
  name: "",
  description: "",
  price_monthly: 0,
  price_yearly: 0,
  currency: "UZS",
  price_suffix: "so'm",
  features: [],
  cta_label: "Boshlash",
  cta_link: "/auth",
  is_popular: false,
  is_active: true,
  sort_order: 0,
};

export default function PricingPlansAdmin() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [featuresText, setFeaturesText] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<any[]>("/admin/pricing-plans");
      // Backend uses spring.jackson.property-naming-strategy=SNAKE_CASE, so responses are in snake_case
      setPlans(data || []);
    } catch (error: any) {
      console.error("Load error:", error);
      toast.error(error.response?.data?.message || "Yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setFeaturesText("");
    setOpen(true);
  };

  const openEdit = (p: Plan) => {
    setEditing(p);
    const { id, ...rest } = p;
    setForm(rest);
    setFeaturesText(p.features.join("\n"));
    setOpen(true);
  };


const save = async () => {
    const features = featuresText.split("\n").map((s) => s.trim()).filter(Boolean);
    
    if (!form.name.trim()) { 
      toast.error(t("dynamic.pricingplans.nom_kiriting")); 
      return; 
    }
    
    // Send in snake_case to match backend DTO
    const payload = {
      name: form.name,
      description: form.description || null,
      price_monthly: form.price_monthly,
      price_yearly: form.price_yearly,
      currency: form.currency,
      price_suffix: form.price_suffix || null,
      features,
      cta_label: form.cta_label,
      cta_link: form.cta_link,
      is_popular: form.is_popular,
      is_active: form.is_active,
      sort_order: form.sort_order,
    };

    try {
      if (editing) {
        await api.put(`/admin/pricing-plans/${editing.id}`, payload);
        toast.success(t("dynamic.pricingplans.plan_muvaffaqiyatli_yangilandi"));
      } else {
        await api.post("/admin/pricing-plans", payload);
        toast.success(t("dynamic.pricingplans.yangi_reja_qo_shildi"));
      }
      setOpen(false);
      load();
    } catch (error: any) {
      console.error("Save error:", error.response?.data);
      toast.error(error.response?.data?.message || "Xatolik yuz berdi");
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t("dynamic.usersmanager.o_chirilsinmi"))) return;
    try {
      await api.delete(`/admin/pricing-plans/${id}`);
      toast.success(t("dynamic.usersmanager.o_chirildi"));
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Xatolik yuz berdi");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("dynamic.pricingplans.narxlar_pricing_plans")}</h1>
          <p className="text-sm text-muted-foreground">{t("dynamic.pricingplans.landing_sahifasidagi_narxlar_rejasini_bo")}</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />{t("dynamic.pricingplans.yangi_reja")}</Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Yuklanmoqda…</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => (
            <Card key={p.id} className={p.is_popular ? "border-primary/60" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    {p.name}
                    {p.is_popular && <Star className="h-4 w-4 text-primary fill-primary" />}
                  </span>
                  <span className={`text-[10px] px-2 py-1 rounded-full ${p.is_active ? "bg-purple-500/15 text-purple-500" : "bg-muted text-muted-foreground"}`}>
                    {p.is_active ? "Faol" : "Yashirin"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">{p.description}</p>
                <div className="flex gap-3 text-xs">
                  <span><b>{t("dynamic.pricingplans.oylik")}</b> {p.price_monthly}</span>
                  <span><b>{t("dynamic.pricingplans.yillik")}</b> {p.price_yearly}</span>
                </div>
                <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                  {p.features.slice(0, 4).map((f, i) => <li key={i}>{f}</li>)}
                </ul>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5 mr-1" />{t("dynamic.pricingplans.tahrir")}</Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(p.id)}><Trash2 className="h-3.5 w-3.5 mr-1" />{t("dynamic.pricingplans.o_chir")}</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Rejani tahrirlash" : "Yangi reja"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("dynamic.pricingplans.nom")}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>{t("dynamic.pricingplans.tartib")}</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>{t("dynamic.telegramlinks.tavsif")}</Label>
              <Textarea rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>{t("dynamic.pricingplans.oylik_narx")}</Label>
                <Input type="number" value={form.price_monthly} onChange={(e) => setForm({ ...form, price_monthly: Number(e.target.value) })} />
              </div>
              <div>
                <Label>{t("dynamic.pricingplans.yillik_narx")}</Label>
                <Input type="number" value={form.price_yearly} onChange={(e) => setForm({ ...form, price_yearly: Number(e.target.value) })} />
              </div>
              <div>
                <Label>{t("dynamic.pricingplans.valyuta_suffix")}</Label>
                <Input value={form.price_suffix || ""} onChange={(e) => setForm({ ...form, price_suffix: e.target.value })} placeholder="so'm" />
              </div>
            </div>
            <div>
              <Label>{t("dynamic.pricingplans.imkoniyatlar_har_biri_yangi_qatorda")}</Label>
              <Textarea rows={5} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} placeholder="Cheksiz mock testlar&#10;AI Speaking" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("dynamic.pricingplans.cta_matni")}</Label>
                <Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} />
              </div>
              <div>
                <Label>{t("dynamic.pricingplans.cta_havolasi")}</Label>
                <Input value={form.cta_link} onChange={(e) => setForm({ ...form, cta_link: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_popular} onCheckedChange={(v) => setForm({ ...form, is_popular: v })} />
                Tavsiya etiladi
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />{t("dynamic.usersmanager.faol")}</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("dynamic.pricingplans.bekor_qilish")}</Button>
            <Button onClick={save}>{t("dynamic.usersmanager.saqlash")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

