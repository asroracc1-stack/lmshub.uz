import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Plus, Pencil, Trash2, MapPin, Mail, Phone, Loader2, Search, Badge } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import LogoUpload from "@/components/LogoUpload";

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: { region: string; district: string; streetAddress: string; fullAddress?: string; } | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  plan_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface Plan { id: string; name: string; price: number; }

const orgSchema = z.object({
  name: z.string({ required_error: "Tashkilot nomi majburiy" }).trim().min(2, "Nom kamida 2 ta belgi").max(100),
  slug: z.string({ required_error: "Slug majburiy" }).trim().min(2).max(50).regex(/^[a-z0-9-]+$/, "Faqat kichik harflar, raqam va '-'"),
  description: z.string().max(500).optional(),
  address: z.object({
    region: z.string().min(1, "Viloyat tanlanishi shart"),
    district: z.string().min(1, "Tuman/Shahar kiritilishi shart"),
    streetAddress: z.string().min(1, "Mahalla/Ko'cha kiritilishi shart")
  }).refine(
    (addr) => addr.region && addr.district && addr.streetAddress,
    { message: "Manzilning barcha qismlarini to'ldiring" }
  ).nullable().optional(),
  phone: z.string().max(30).optional(),
  email: z.string({ required_error: "Email majburiy" }).email("Email noto'g'ri").min(1, "Email kiritish majburiy"),
  plan_id: z.string().uuid().optional().or(z.literal("")),
});

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 50);

const REGIONS = [
  "Toshkent sh.", "Toshkent vil.", "Andijon", "Farg'ona", 
  "Namangan", "Buxoro", "Xorazm", "Samarqand", 
  "Qashqadaryo", "Surxondaryo", "Jizzax", "Sirdaryo", 
  "Qoraqalpog'iston R."
];

export default function Organizations() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize] = useState(10);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    address: { region: "", district: "", streetAddress: "" },
    phone: "",
    email: "",
    logo_url: "" as string,
    plan_id: "",
    is_active: true,
  });

  const load = async (p = page, q = search) => {
    setLoading(true);
    try {
      const [{ data }, { data: plansData }] = await Promise.all([
        api.get<any>("/organizations", { params: { page: p, size: pageSize, query: q } }),
        api.get<Plan[]>("/super-admin/packages"),
      ]);
      setOrgs(data.content || []);
      setTotalPages(data.totalPages || 0);
      setPlans(plansData || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page, search);
  }, [page, search]);

  const resetForm = () => {
    setEditing(null);
    setForm({ name: "", slug: "", description: "", address: { region: "", district: "", streetAddress: "" }, phone: "", email: "", logo_url: "", plan_id: "", is_active: true });
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (o: Organization) => {
    setEditing(o);
    setForm({
      name: o.name,
      slug: o.slug,
      description: o.description ?? "",
      address: o.address || { region: "", district: "", streetAddress: "" },
      phone: o.phone ?? "",
      email: o.email ?? "",
      logo_url: o.logo_url ?? "",
      plan_id: o.plan_id ?? "",
      is_active: o.is_active,
    });
    setOpen(true);
  };

  const submit = async () => {
    const parsed = orgSchema.safeParse(form);
    if (!parsed.success) {
      // Barcha xatolarni ko'rsatish
      const errorMessages = parsed.error.errors
        .map((err) => {
          const path = err.path.join(" → ");
          return `${path}: ${err.message}`;
        })
        .join("\n");
      
      console.error("Validation errors:", parsed.error.errors);
      toast.error(
        errorMessages.length > 100
          ? `${parsed.error.errors.length} ta xato topildi:\n${parsed.error.errors[0].message}`
          : errorMessages || "Forma noto'g'ri to'ldirilgan"
      );
      return;
    }
    setSubmitting(true);
    const payload = {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      address: parsed.data.address?.region ? parsed.data.address : null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      logoUrl: form.logo_url || null,
      planId: form.plan_id || null,
      isActive: form.is_active,
    };

    try {
      if (editing) {
        await api.put(`/organizations/${editing.id}`, payload);
        toast.success("Tashkilot muvaffaqiyatli yangilandi");
      } else {
        await api.post("/organizations", payload);
        toast.success("Tashkilot muvaffaqiyatli qo'shildi");
      }
      setOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organizations-list"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard-stats"] });
      load();
    } catch (error: any) {
      console.error("API Error:", error.response?.data);
      toast.error(error.response?.data?.message || "Saqlashda xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (o: Organization) => {
    try {
      await api.delete(`/organizations/${o.id}`);
      toast.success("O'chirildi");
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organizations-list"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard-stats"] });
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "O'chirishda xatolik");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tashkilot qidirish..."
            className="pl-9"
          />
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button variant="hero" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Yangi tashkilot
            </Button>
          </DialogTrigger>
          {/* ... (rest of the dialog remains same) */}
          <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden border-border/50">
            <DialogHeader className="p-6 pb-4 shrink-0 border-b border-border/30 bg-background/50 backdrop-blur-md z-10">
              <DialogTitle className="text-xl font-display">{editing ? "Tashkilotni tahrirlash" : "Yangi tashkilot"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-5 p-6 overflow-y-auto flex-1 custom-scrollbar">
              <LogoUpload
                orgId={editing?.id}
                currentUrl={form.logo_url || null}
                onUploaded={(url) => setForm((f) => ({ ...f, logo_url: url }))}
              />
              <div className="grid gap-2">
                <Label>Nomi *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((f) => ({
                      ...f,
                      name,
                      slug: editing ? f.slug : slugify(name),
                    }));
                  }}
                  placeholder="PDP Academy"
                />
              </div>
              <div className="grid gap-2">
                <Label>Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                  placeholder="pdp-academy"
                />
              </div>
              <div className="grid gap-2">
                <Label>Tavsif</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Qisqacha tavsif"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Telefon</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+998..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="info@..."
                  />
                </div>
              </div>
              <div className="grid gap-4 border border-border p-4 rounded-xl bg-muted/5">
                <Label className="text-base font-semibold text-emerald-700">Tashkilot manzili</Label>
                <div className="grid gap-2">
                  <Label>Viloyat / Hudud *</Label>
                  <Select
                    value={form.address.region}
                    onValueChange={(v) => setForm(f => ({ ...f, address: { ...f.address, region: v } }))}
                  >
                    <SelectTrigger className="focus:ring-emerald-500 rounded-xl h-11">
                      <SelectValue placeholder="Viloyatni tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Shahar / Tuman *</Label>
                    <Input
                      value={form.address.district}
                      onChange={(e) => setForm(f => ({ ...f, address: { ...f.address, district: e.target.value } }))}
                      placeholder="Masalan: Chilonzor tumani yoki Qo'qon shahar"
                      className="focus:ring-emerald-500 focus:border-emerald-500 rounded-xl h-11"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Mahalla / Qishloq / Ko'cha *</Label>
                    <Input
                      value={form.address.streetAddress}
                      onChange={(e) => setForm(f => ({ ...f, address: { ...f.address, streetAddress: e.target.value } }))}
                      placeholder="Masalan: Bog'ishamol ko'chasi, 12-uy"
                      className="focus:ring-emerald-500 focus:border-emerald-500 rounded-xl h-11"
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Tarif rejasi (Package)</Label>
                <Select
                  value={form.plan_id || "none"}
                  onValueChange={(v) => setForm((f) => ({ ...f, plan_id: v === "none" ? "" : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tarif tanlanmagan —</SelectItem>
                    {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {p.price?.toLocaleString("uz-UZ")} UZS</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">Faol</p>
                  <p className="text-xs text-muted-foreground">Tashkilot tizimda ishlay oladimi</p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                />
              </div>
            </div>
            <DialogFooter className="p-6 pt-4 shrink-0 border-t border-border/30 bg-background/50 backdrop-blur-md z-10">
              <Button variant="ghost" onClick={() => setOpen(false)} className="hover:bg-destructive/10 hover:text-destructive transition-colors">Bekor qilish</Button>
              <Button variant="hero" onClick={submit} disabled={submitting} className="shadow-glow">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editing ? "Saqlash" : "Tashkilot qo'shish"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-5 animate-pulse space-y-4 bg-muted/5 border border-border/30">
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 rounded-xl bg-muted/40" />
                <div className="h-8 w-16 rounded bg-muted/30" />
              </div>
              <div className="space-y-2">
                <div className="h-5 w-3/4 rounded bg-muted/50" />
                <div className="h-4 w-1/4 rounded bg-muted/30" />
              </div>
              <div className="space-y-1.5 pt-2">
                <div className="h-3 w-5/6 rounded bg-muted/30" />
                <div className="h-3 w-2/3 rounded bg-muted/20" />
              </div>
              <div className="flex justify-between border-t border-border/20 pt-3 mt-4">
                <div className="h-5 w-16 rounded-full bg-muted/40" />
                <div className="h-3 w-20 rounded bg-muted/20" />
              </div>
            </div>
          ))}
        </div>
      ) : orgs.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-display text-lg">Hali tashkilot yo'q</p>
          <p className="text-sm text-muted-foreground mb-6">Birinchi o'quv markazingizni qo'shing</p>
          <Button variant="hero" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Tashkilot qo'shish
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orgs.map((o) => (
            <div key={o.id} onClick={() => navigate(`/super-admin/users?orgId=${o.id}`)} className="glass rounded-2xl p-5 hover:border-primary/40 transition-smooth group cursor-pointer hover:scale-[1.02] hover:shadow-glow transition-all duration-300">
              <div className="flex items-start justify-between mb-3">
                {o.logo_url ? (
                  <div className="h-12 w-12 rounded-xl overflow-hidden border border-primary/30 shadow-glow">
                    <img src={o.logo_url} alt={o.name} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
                    <Building2 className="h-6 w-6 text-primary-foreground" />
                  </div>
                )}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(o); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={(e) => e.stopPropagation()}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>O'chirilsinmi?</AlertDialogTitle>
                        <AlertDialogDescription>
                          "{o.name}" tashkiloti va unga bog'liq ma'lumotlar o'chiriladi.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Bekor</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(o)} className="bg-destructive">
                          O'chirish
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <h3 className="font-display text-lg font-semibold">{o.name}</h3>
              <p className="text-xs text-muted-foreground font-mono">/{o.slug}</p>
              {o.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{o.description}</p>
              )}
              <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                {o.address && o.address.fullAddress && <p className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {o.address.fullAddress}</p>}
                {o.phone && <p className="flex items-center gap-2"><Phone className="h-3 w-3" /> {o.phone}</p>}
                {o.email && <p className="flex items-center gap-2"><Mail className="h-3 w-3" /> {o.email}</p>}
              </div>
              <div className="mt-4 flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${o.is_active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                    {o.is_active ? "Faol" : "Faolsiz"}
                  </span>
                  {o.plan_id && (
                    <Badge variant="outline" className="text-[10px] font-semibold border-primary/30 text-primary">
                      {plans.find(p => p.id === o.plan_id)?.name || "Plan"}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            Sahifa {page + 1} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Oldingi
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Keyingi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
