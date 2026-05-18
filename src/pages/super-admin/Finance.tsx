import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
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
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useDebounce } from "@/hooks/use-debounce";
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
  RefreshCw,
} from "lucide-react";
import SuccessModal from "@/components/SuccessModal";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import TableSkeleton from "@/components/shared/TableSkeleton";
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

interface InvoicesResponse {
  content: Invoice[];
  totalPages: number;
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

const fmtAmount = (n: number, ccy: string) => n.toLocaleString("uz-UZ").replace(/,/g, " ") + " " + ccy;

export default function Finance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
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
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const debouncedSearch = useDebounce(search, 300);
  const debouncedInvoiceNumber = useDebounce(form.invoice_number, 500);

  const orgsQuery = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const response = await api.get<any>("/organizations", { params: { size: 1000 } });
      return Array.isArray(response.data) ? response.data : response.data.content || [];
    },
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const financeStatsQuery = useQuery<any>({
    queryKey: ["finance-stats"],
    queryFn: async () => {
      const response = await api.get<any>("/admin/finance/stats");
      return response.data;
    },
    staleTime: 1000 * 60 * 3,
    retry: 1,
  });

  // Handle stats errors separately
  if (financeStatsQuery.isError) {
    toast.error("Moliya statistikasi yuklashda xatolik.");
  }

  const invoicesQuery = useQuery<InvoicesResponse>({
    queryKey: ["finance-invoices", { page, search: debouncedSearch, status: filter }],
    queryFn: async () => {
      const response = await api.get<InvoicesResponse>("/admin/invoices", {
        params: {
          page,
          size: 10,
          query: debouncedSearch || undefined,
          status: filter !== "all" ? filter : undefined,
        },
      });
      return response.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  // Handle invoices errors separately
  if (invoicesQuery.isError) {
    toast.error((invoicesQuery.error as any)?.message || "Invoice ma'lumotlarini yuklashda xatolik.");
  }

  const numberCheckQuery = useQuery<boolean>({
    queryKey: ["invoice-number-check", debouncedInvoiceNumber],
    queryFn: async () => {
      const response = await api.get("/admin/invoices/check-number", { params: { number: debouncedInvoiceNumber } });
      return response.data.available;
    },
    enabled: !!debouncedInvoiceNumber && !editing,
    staleTime: 1000 * 10,
    retry: 0,
  });

  const createUpdateInvoiceMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editing) {
        return api.put(`/admin/invoices/${editing.id}`, payload);
      }
      return api.post("/admin/invoices", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["finance-stats"] });
      if (editing) {
        toast.success("Invoice yangilandi.");
      } else {
        toast.success("Yangi invoice yaratildi.");
        setSuccessMsg("Yangi hisob-faktura muvaffaqiyatli yaratildi va moliya bazasiga qo'shildi!");
        setSuccessOpen(true);
      }
      setOpen(false);
      setEditing(null);
      setPage(0);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Invoice saqlashda xatolik yuz berdi.");
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => api.patch(`/admin/invoices/${id}/paid`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["finance-stats"] });
      toast.success("Invoice to'landi deb belgilandi.");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "To'lovni belgilashda xatolik yuz berdi.");
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["finance-stats"] });
      toast.success("Invoice o'chirildi.");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Invoice o'chirishda xatolik yuz berdi.");
    },
  });

  useEffect(() => {
    if (invoicesQuery.isSuccess && invoicesQuery.data && page >= (invoicesQuery.data.totalPages ?? 1)) {
      setPage(Math.max((invoicesQuery.data.totalPages ?? 1) - 1, 0));
    }
  }, [invoicesQuery.data, page]);

  const orgs = orgsQuery.data ?? [];
  const invoices = (invoicesQuery.data as any)?.content ?? [];
  const totalPages = (invoicesQuery.data as any)?.totalPages ?? 0;

  const stats = {
    totalRevenue: (financeStatsQuery.data as any)?.totalRevenue ?? 0,
    pending: (financeStatsQuery.data as any)?.pendingAmount ?? 0,
    overdue: (financeStatsQuery.data as any)?.overdueAmount ?? 0,
    count: (invoicesQuery.data as any)?.totalPages ? (invoicesQuery.data as any)?.content?.length : invoices.length,
  };

  const monthly = (financeStatsQuery.data as any)?.monthlyRevenue ?? [];

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
      value: invoices.filter((i) => i.status === s.value).length,
      color: colors[s.value],
    })).filter((item) => item.value > 0);
  }, [invoices]);

  const orgMap = useMemo(() => new Map((orgs as any).map((org: any) => [org.id, org.name])), [orgs]);

  const resetForm = async () => {
    setEditing(null);
    let nextNum = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
    try {
      const res = await api.get("/admin/invoices/next-number");
      if (res.data.number) nextNum = res.data.number;
    } catch (e) {
      // fallback generated number remains
    }
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

  const openCreate = async () => {
    await resetForm();
    setOpen(true);
  };

  const openEdit = (inv: Invoice) => {
    setEditing(inv);
    setForm({
      organization_id: inv.organization_id,
      invoice_number: inv.invoice_number,
      amount: String(inv.amount),
      currency: inv.currency,
      status: inv.status,
      description: inv.description || "",
      due_date: inv.due_date || "",
    });
    setOpen(true);
  };

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    if (numberCheckQuery.data === false && !editing) {
      toast.error("Bu hisob raqami band. Iltimos, boshqasini kiriting.");
      return;
    }
    setSubmitting(true);
    try {
      await createUpdateInvoiceMutation.mutateAsync({
        organization_id: parsed.data.organization_id,
        invoice_number: parsed.data.invoice_number,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        status: parsed.data.status,
        description: parsed.data.description || null,
        due_date: parsed.data.due_date || null,
        paid_at: parsed.data.status === "paid" ? (editing?.paid_at ?? new Date().toISOString()) : null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const markPaid = async (id: string) => {
    await markPaidMutation.mutateAsync(id);
  };

  const remove = async (id: string) => {
    await deleteInvoiceMutation.mutateAsync(id);
  };

  const cards = [
    { label: "Jami daromad", value: fmtAmount(stats.totalRevenue, "UZS"), icon: TrendingUp, accent: "from-success to-success" },
    { label: "Kutilmoqda", value: fmtAmount(stats.pending, "UZS"), icon: Clock, accent: "from-primary to-primary-glow" },
    { label: "Muddati o'tgan", value: fmtAmount(stats.overdue, "UZS"), icon: AlertCircle, accent: "from-destructive to-destructive" },
    { label: "Hisoblar soni", value: stats.count.toString(), icon: FileText, accent: "from-secondary to-secondary-glow" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Moliya boshqaruvi</h1>
          <p className="text-sm text-muted-foreground">Hisob-fakturalar, to'lovlar va moliyaviy nazorat</p>
        </div>
        <Button variant="hero" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Yangi Invoice
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            {cards.slice(0, 3).map((c) => (
              <div key={c.label} className="rounded-3xl border border-border p-5 bg-card shadow-sm">
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="mt-3 text-3xl font-semibold">{c.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
            <div className="rounded-3xl border border-border p-5 bg-card shadow-sm min-h-[320px]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Oylik tushum</h2>
                  <p className="text-sm text-muted-foreground">Oxirgi davr bo'yicha</p>
                </div>
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
              </div>
              {financeStatsQuery.isLoading ? (
                <div className="h-[240px] grid place-items-center">
                  <Skeleton className="h-5 w-36 rounded-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthly} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 8" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))">
                      {monthly.map((entry: any, index: number) => (
                        <Cell key={entry.month} fill={index % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.75)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="rounded-3xl border border-border p-5 bg-card shadow-sm min-h-[320px]">
              <h2 className="text-lg font-semibold mb-3">Status taqsimoti</h2>
              {financeStatsQuery.isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, idx) => (
                    <Skeleton key={idx} className="h-10 rounded-full" />
                  ))}
                </div>
              ) : (
                <PieChart width={320} height={260}>
                  <Pie data={statusDistribution} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
                    {statusDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-border p-5 bg-card shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  placeholder="Invoice raqami yoki tashkilot bo'yicha qidirish..."
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={filter} onValueChange={(value) => { setFilter(value as any); setPage(0); }}>
                  <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barchasi</SelectItem>
                    {STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">Sahifa: {page + 1} / {totalPages}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border p-4 bg-card shadow-sm">
            {invoicesQuery.isLoading ? (
              <TableSkeleton rows={5} cols={6} />
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
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                          Invoice topilmadi
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoices.map((inv) => {
                        const m = statusMeta(inv.status);
                        const Icon = m.icon;
                        return (
                          <TableRow key={inv.id} className="hover:bg-muted/40">
                            <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                            <TableCell className="font-medium">{String(orgMap.get(inv.organization_id) ?? "—")}</TableCell>
                            <TableCell className="text-right font-semibold">{fmtAmount(inv.amount, inv.currency)}</TableCell>
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
                                  <Button size="icon" variant="ghost" onClick={() => markPaid(inv.id)} title="To'landi" className="text-success">
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
                                      <AlertDialogTitle>O'chirishni tasdiqlaysizmi?</AlertDialogTitle>
                                      <AlertDialogDescription>{inv.invoice_number} o'chiriladi.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Bekor</AlertDialogCancel>
                                      <AlertDialogAction className="bg-destructive" onClick={() => remove(inv.id)}>
                                        O'chirish
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {!invoicesQuery.isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="text-xs text-muted-foreground">Sahifa {page + 1} / {totalPages}</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Oldingi
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                  Keyingi
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-border p-5 bg-card shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Statistika</h2>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 rounded-3xl border border-border p-4 bg-muted/80">
                <Wallet className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Umumiy to'lovlar</p>
                  <p className="font-semibold">{fmtAmount(stats.totalRevenue, "UZS")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-3xl border border-border p-4 bg-muted/80">
                <FileText className="h-5 w-5 text-slate-700" />
                <div>
                  <p className="text-sm text-muted-foreground">Invoice soni</p>
                  <p className="font-semibold">{stats.count}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-3xl border border-border p-4 bg-muted/80">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Aktiv statuslar</p>
                  <p className="font-semibold">{invoices.filter((inv) => inv.status !== "cancelled").length}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-border p-5 bg-card shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Hisob-faktura yaratish</h2>
            <p className="text-sm text-muted-foreground">Yangi invoice qo'shish yoki mavjudini tahrirlash.</p>
            <Button className="mt-4 w-full" onClick={openCreate}>Yangi invoice</Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(newState) => { if (!newState) setEditing(null); setOpen(newState); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Invoice tahrirlash" : "Yangi invoice"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Tashkilot *</Label>
                <Select value={form.organization_id} onValueChange={(value) => setForm((s) => ({ ...s, organization_id: value }))}>
                  <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                  <SelectContent>
                    {orgs.map((org) => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Invoice raqami *</Label>
                <Input value={form.invoice_number} onChange={(e) => setForm((s) => ({ ...s, invoice_number: e.target.value }))} />
                {numberCheckQuery.isFetching ? (
                  <p className="text-xs text-muted-foreground mt-1">Tekshirilmoqda...</p>
                ) : numberCheckQuery.data === false && !editing ? (
                  <p className="text-xs text-destructive mt-1">Bu raqam band.</p>
                ) : numberCheckQuery.data === true && !editing ? (
                  <p className="text-xs text-success mt-1">Raqam mavjud.</p>
                ) : null}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Summa *</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} />
              </div>
              <div>
                <Label>Valyuta</Label>
                <Select value={form.currency} onValueChange={(value) => setForm((s) => ({ ...s, currency: value }))}>
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
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(value) => setForm((s) => ({ ...s, status: value as Invoice["status"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Muddati</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm((s) => ({ ...s, due_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-3">
              <Label>Izoh</Label>
              <Textarea rows={4} value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SuccessModal open={successOpen} onOpenChange={setSuccessOpen} title="Invoice yaratildi" message={successMsg} />
    </div>
  );
}
