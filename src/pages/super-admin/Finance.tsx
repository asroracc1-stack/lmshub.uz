import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Wallet,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  TrendingUp,
  CircleCheck,
  Clock,
  AlertCircle,
  FileText,
  Search,
  CheckCircle2,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import SuccessModal from "@/components/SuccessModal";
import TigerPlayer from "@/components/TigerPlayer";
import { useDebounce } from "@/hooks/use-debounce";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Org { id: string; name: string }
interface Invoice {
  id: string;
  organization_id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  description: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

const STATUSES = [
  { value: "draft", label: "Qoralama", color: "bg-muted text-muted-foreground", icon: FileText },
  { value: "sent", label: "Yuborilgan", color: "bg-primary/15 text-primary", icon: Clock },
  { value: "paid", label: "To'langan", color: "bg-success/15 text-success", icon: CircleCheck },
  { value: "overdue", label: "Muddati o'tgan", color: "bg-destructive/15 text-destructive", icon: AlertCircle },
  { value: "cancelled", label: "Bekor qilingan", color: "bg-muted text-muted-foreground line-through", icon: Trash2 },
] as const;

const statusMeta = (s: string) => STATUSES.find((x) => x.value === s?.toLowerCase()) ?? STATUSES[0];

const schema = z.object({
  organization_id: z.string().uuid("Tashkilot tanlang"),
  invoice_number: z.string().trim().min(1, "Hisob raqami kerak").max(50),
  amount: z.coerce.number().min(0, "Manfiy bo'lmasin"),
  currency: z.enum(["UZS", "USD", "EUR", "RUB"]),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
  description: z.string().max(500).optional(),
  due_date: z.string().optional(),
});

const fmtAmount = (n: number, ccy: string) =>
  n.toLocaleString("uz-UZ").replace(/,/g, " ") + " " + ccy;

export default function Finance() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize] = useState(10);
  const [filter, setFilter] = useState<"all" | Invoice["status"]>("all");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [form, setForm] = useState({
    organization_id: "",
    invoice_number: "",
    amount: "",
    currency: "UZS",
    status: "draft" as Invoice["status"],
    description: "",
    due_date: "",
  });
  const [serverStats, setServerStats] = useState<any>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [numberAvailable, setNumberAvailable] = useState<boolean | null>(null);
  const [checkingNumber, setCheckingNumber] = useState(false);

  const debouncedInvoiceNumber = useDebounce(form.invoice_number, 500);

  useEffect(() => {
    const checkNum = async () => {
      if (!debouncedInvoiceNumber || editing) {
        setNumberAvailable(null);
        return;
      }
      setCheckingNumber(true);
      try {
        const res = await api.get("/admin/invoices/check-number", { params: { number: debouncedInvoiceNumber } });
        setNumberAvailable(res.data.available);
      } catch (e) {
        setNumberAvailable(null);
      } finally {
        setCheckingNumber(false);
      }
    };
    checkNum();
  }, [debouncedInvoiceNumber, editing]);

  const load = async (p = page, q = search, s = filter) => {
    setLoading(true);
    try {
      const [invRes, orgRes, statsRes] = await Promise.all([
        api.get<any>("/admin/invoices", { params: { page: p, size: pageSize, query: q, status: s } }),
        api.get<any>("/organizations", { params: { size: 1000 } }),
        api.get<any>("/admin/finance/stats"),
      ]);
      setItems(invRes.data.content || []);
      setTotalPages(invRes.data.totalPages || 0);
      setOrgs(Array.isArray(orgRes.data) ? orgRes.data : (orgRes.data.content || []));
      setServerStats(statsRes.data);
    } catch (error: any) {
      toast.error("Moliya ma'lumotlarini yuklashda texnik xatolik yuz berdi. Backend loglarini tekshiring.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page, search, filter); }, [page, search, filter]);

  const orgMap = useMemo(() => new Map(orgs.map((o) => [o.id, o.name])), [orgs]);

  const stats = useMemo(() => {
    return {
      totalRevenue: serverStats?.totalRevenue || 0,
      pending: serverStats?.pendingAmount || 0,
      overdue: serverStats?.overdueAmount || 0,
      count: items.length, // local pagination count or total depends
    };
  }, [serverStats, items.length]);

  const monthly = useMemo(() => {
    return serverStats?.monthlyRevenue || [];
  }, [serverStats]);

  const statusDistribution = useMemo(() => {
    const colors: Record<string, string> = {
      paid: "hsl(var(--success))",
      sent: "hsl(var(--primary))",
      overdue: "hsl(var(--destructive))",
      draft: "hsl(var(--muted-foreground))",
      cancelled: "hsl(var(--muted-foreground))",
    };
    return STATUSES.map((s) => ({
      name: s.label,
      value: items.filter((i) => i.status === s.value).length,
      color: colors[s.value],
    })).filter((s) => s.value > 0);
  }, [items]);

  const resetForm = async () => {
    setEditing(null);
    setNumberAvailable(null);
    let nextNum = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
    try {
      const res = await api.get("/admin/invoices/next-number");
      if (res.data.number) nextNum = res.data.number;
    } catch (e) {}

    setForm({
      organization_id: "",
      invoice_number: nextNum,
      amount: "",
      currency: "UZS",
      status: "draft",
      description: "",
      due_date: "",
    });
  };

  const openCreate = () => { resetForm(); setOpen(true); };

  const openEdit = (inv: Invoice) => {
    setEditing(inv);
    setForm({
      organization_id: inv.organization_id,
      invoice_number: inv.invoice_number,
      amount: String(inv.amount),
      currency: inv.currency,
      status: inv.status,
      description: inv.description ?? "",
      due_date: inv.due_date ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    if (numberAvailable === false && !editing) {
      toast.error("Bu hisob raqami band. Iltimos, boshqasini kiriting.");
      return;
    }
    setSubmitting(true);
    const payload = {
      organization_id: parsed.data.organization_id,
      invoice_number: parsed.data.invoice_number,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      status: parsed.data.status.toUpperCase(),
      description: parsed.data.description || null,
      due_date: parsed.data.due_date || null,
      paid_at: parsed.data.status === "paid" ? (editing?.paid_at ?? new Date().toISOString()) : null,
    };
    try {
      if (editing) {
        await api.put(`/admin/invoices/${editing.id}`, payload);
        toast.success("Yangilandi");
      } else {
        const res = await api.post("/admin/invoices", payload);
        setSuccessMsg("Yangi hisob-faktura muvaffaqiyatli yaratildi va moliya bazasiga qo'shildi!");
        setSuccessOpen(true);
      }
      setOpen(false);
      resetForm();
      load();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Xatolik yuz berdi";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const markPaid = async (inv: Invoice) => {
    try {
      await api.patch(`/admin/invoices/${inv.id}/paid`);
      toast.success("To'langan deb belgilandi");
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Xatolik yuz berdi");
    }
  };

  const remove = async (inv: Invoice) => {
    try {
      await api.delete(`/admin/invoices/${inv.id}`);
      toast.success("O'chirildi");
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "O'chirishda xatolik");
    }
  };

  const cards = [
    { label: "Jami daromad", value: fmtAmount(stats.totalRevenue, "UZS"), icon: TrendingUp, accent: "from-success to-success" },
    { label: "Kutilmoqda", value: fmtAmount(stats.pending, "UZS"), icon: Clock, accent: "from-primary to-primary-glow" },
    { label: "Muddati o'tgan", value: fmtAmount(stats.overdue, "UZS"), icon: AlertCircle, accent: "from-destructive to-destructive" },
    { label: "Hisoblar soni", value: stats.count.toString(), icon: FileText, accent: "from-secondary to-secondary-glow" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Moliya</h1>
          <p className="text-muted-foreground">Tashkilotlar uchun hisob-fakturalar</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button variant="hero" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Yangi hisob
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Hisobni tahrirlash" : "Yangi hisob"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label>Tashkilot *</Label>
                <Select value={form.organization_id} onValueChange={(v) => setForm((f) => ({ ...f, organization_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                  <SelectContent>
                    {orgs.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Raqam *</Label>
                    <button 
                      type="button"
                      onClick={async () => {
                        const res = await api.get("/admin/invoices/next-number");
                        setForm(f => ({ ...f, invoice_number: res.data.number }));
                      }}
                      className="text-[10px] text-primary flex items-center gap-1 hover:underline"
                    >
                      <RefreshCw className="h-2.5 w-2.5" /> Generatsiya
                    </button>
                  </div>
                  <div className="relative">
                    <Input 
                      value={form.invoice_number} 
                      onChange={(e) => setForm((f) => ({ ...f, invoice_number: e.target.value.toUpperCase() }))} 
                      className={cn(
                        numberAvailable === false && !editing && "border-destructive ring-destructive",
                        numberAvailable === true && !editing && "border-emerald-500 ring-emerald-500"
                      )}
                    />
                    {checkingNumber && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    {numberAvailable === true && !editing && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500" />}
                    {numberAvailable === false && !editing && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-destructive" />}
                  </div>
                  {numberAvailable === false && !editing && (
                    <p className="text-[10px] text-destructive animate-in fade-in slide-in-from-top-1">Bu raqam band</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Holat</Label>
                  <Select value={form.status} onValueChange={(v: Invoice["status"]) => setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-2 col-span-2">
                  <Label>Summa *</Label>
                  <Input type="number" min="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" />
                </div>
                <div className="grid gap-2">
                  <Label>Valyuta</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UZS">UZS</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="RUB">RUB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>To'lov muddati</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Tavsif</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Hisob haqida..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Bekor</Button>
              <Button variant="hero" onClick={submit} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Saqlash" : "Qo'shish"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-2xl p-4 md:p-5"
          >
            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${c.accent} grid place-items-center shadow-glow`}>
              <c.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <p className="mt-3 text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
            {loading ? (
              <div className="flex items-center gap-2 mt-1">
                <div className="scale-50 -ml-6 -mt-2">
                  <TigerPlayer text="" size={60} />
                </div>
                <Skeleton className="h-7 w-20" />
              </div>
            ) : (
              <p className="font-display text-lg md:text-2xl font-bold mt-1 truncate">{c.value}</p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <h3 className="font-display text-lg font-semibold mb-4">Oylik daromad (UZS)</h3>
          {loading ? <Skeleton className="h-[260px] w-full" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
                  formatter={(v: number) => fmtAmount(v, "UZS")}
                />
                <Bar dataKey="amount" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display text-lg font-semibold mb-4">Holatlar</h3>
          {loading ? <Skeleton className="h-[260px] w-full" /> : statusDistribution.length === 0 ? (
            <div className="h-[260px] grid place-items-center text-sm text-muted-foreground">Ma'lumot yo'q</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusDistribution} innerRadius={45} outerRadius={85} paddingAngle={4} dataKey="value">
                  {statusDistribution.map((e, i) => <Cell key={i} fill={e.color} stroke="hsl(var(--background))" strokeWidth={2} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Filters + table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..." className="pl-9" />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="all">Hammasi</TabsTrigger>
              <TabsTrigger value="sent">Kutilmoqda</TabsTrigger>
              <TabsTrigger value="paid">To'langan</TabsTrigger>
              <TabsTrigger value="overdue">Muddati o'tgan</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {loading ? (
          <div className="p-12">
            <TigerPlayer text="Ma'lumotlar saralanmoqda..." size={180} />
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <TigerPlayer text="Ma'lumot topilmadi" size={160} />
            <p className="text-sm text-muted-foreground">Tanlangan filtr yoki qidiruv bo'yicha hisoblar mavjud emas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Raqam</TableHead>
                  <TableHead>Tashkilot</TableHead>
                  <TableHead className="text-right">Summa</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead>Muddat</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((inv) => {
                  const m = statusMeta(inv.status);
                  const Icon = m.icon;
                  return (
                    <TableRow key={inv.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                      <TableCell className="font-medium">{orgMap.get(inv.organization_id) ?? "—"}</TableCell>
                      <TableCell className="text-right font-semibold">{fmtAmount(Number(inv.amount), inv.currency)}</TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full", m.color)}>
                          <Icon className="h-3 w-3" />
                          {m.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {inv.status !== "paid" && (
                            <Button size="icon" variant="ghost" onClick={() => markPaid(inv)} title="To'landi" className="text-success">
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" onClick={() => openEdit(inv)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>O'chirilsinmi?</AlertDialogTitle>
                                <AlertDialogDescription>{inv.invoice_number} hisobi o'chiriladi.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Bekor</AlertDialogCancel>
                                <AlertDialogAction onClick={() => remove(inv)} className="bg-destructive">O'chirish</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border/50">
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

      <SuccessModal 
        open={successOpen} 
        onOpenChange={setSuccessOpen} 
        title="Muvaffaqiyatli!"
        message={successMsg} 
      />
    </div>
  );
}
