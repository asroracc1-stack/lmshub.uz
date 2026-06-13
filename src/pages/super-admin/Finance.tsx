import { useTranslation } from "react-i18next";
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
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import TableSkeleton from "@/components/shared/TableSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";

interface Org {
  id: string;
  name: string;
}

interface Invoice {
  id: string;
  organization_id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled" | "pending";
  description: string | null;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
}

interface InvoicesResponse {
  content: Invoice[];
  totalPages: number;
  totalElements: number;
}

interface DashboardSummary {
  totalRevenue: number;
  pendingAmount: number;
  overdueAmount: number;
}

interface MonthlyRevenue {
  month: string;
  amount: number;
}

interface StatusDistributionItem {
  status: string;
  count: number;
  amount: number;
}

interface FinanceDashboardData {
  summary: DashboardSummary;
  monthlyRevenue: MonthlyRevenue[];
  statusDistribution: StatusDistributionItem[];
}

interface InvoicePayload {
  organization_id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  due_date: string | null;
  paid_at: string | null;
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
  const { t } = useTranslation();
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

  const orgsQuery = useQuery<Org[]>({
    queryKey: ["organizations"],
    queryFn: async () => {
      const response = await api.get<Org[] | { content: Org[] }>("/organizations", { params: { size: 1000 } });
      const data = response.data;
      return Array.isArray(data) ? data : (data as { content: Org[] }).content || [];
    },
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const dashboardQuery = useQuery<FinanceDashboardData>({
    queryKey: ["financeDashboard"],
    queryFn: async () => {
      const response = await api.get<FinanceDashboardData>("/finance/dashboard");
      return response.data;
    },
    staleTime: 1000 * 60 * 3,
    retry: 1,
  });

  useEffect(() => {
    if (dashboardQuery.isError) {
      toast.error(t("dynamic.finance.moliya_statistikasi_yuklashda_xatolik"));
    }
  }, [dashboardQuery.isError]);

  const invoicesQuery = useQuery<InvoicesResponse>({
    queryKey: ["finance-invoices", { page, search: debouncedSearch, status: filter }],
    queryFn: async () => {
      const response = await api.get<InvoicesResponse>("/finance/invoices", {
        params: {
          page,
          size: 10,
          query: debouncedSearch || undefined,
          status: filter !== "all" ? filter.toUpperCase() : undefined,
        },
      });
      const resData = response.data;
      if (resData && Array.isArray(resData.content)) {
        resData.content = resData.content.map((inv) => ({
          ...inv,
          status: (inv.status || "draft").toLowerCase() as Invoice["status"],
        }));
      }
      return resData;
    },
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 2,
    retry: 1,
  });

  useEffect(() => {
    if (invoicesQuery.isError) {
      const errorMsg = (invoicesQuery.error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Invoice ma'lumotlarini yuklashda xatolik.";
      toast.error(errorMsg);
    }
  }, [invoicesQuery.isError, invoicesQuery.error]);

  const numberCheckQuery = useQuery<boolean>({
    queryKey: ["invoice-number-check", debouncedInvoiceNumber],
    queryFn: async () => {
      const response = await api.get<{ available: boolean }>("/finance/invoices/check-number", { params: { number: debouncedInvoiceNumber } });
      return response.data.available;
    },
    enabled: !!debouncedInvoiceNumber && !editing,
    staleTime: 1000 * 10,
    retry: 0,
  });

  const createUpdateInvoiceMutation = useMutation({
    mutationFn: async (payload: InvoicePayload) => {
      if (editing) {
        return api.put<Invoice>(`/finance/invoices/${editing.id}`, payload);
      }
      return api.post<Invoice>("/finance/invoices", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["financeDashboard"] });
      if (editing) {
        toast.success(t("dynamic.finance.invoice_yangilandi"));
      } else {
        toast.success(t("dynamic.finance.yangi_invoice_yaratildi"));
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
    mutationFn: async (id: string) => api.patch<void>(`/finance/invoices/${id}/paid`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["financeDashboard"] });
      toast.success(t("dynamic.finance.invoice_to_landi_deb_belgilandi"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "To'lovni belgilashda xatolik yuz berdi.");
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: string) => api.delete<void>(`/finance/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["financeDashboard"] });
      toast.success(t("dynamic.finance.invoice_o_chirildi"));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Invoice o'chirishda xatolik yuz berdi.");
    },
  });

  useEffect(() => {
    if (invoicesQuery.isSuccess && invoicesQuery.data && page >= (invoicesQuery.data.totalPages ?? 1)) {
      setPage(Math.max((invoicesQuery.data.totalPages ?? 1) - 1, 0));
    }
  }, [invoicesQuery.data, invoicesQuery.isSuccess, page]);

  const orgs = orgsQuery.data ?? [];
  const invoices = invoicesQuery.data?.content ?? [];
  const totalPages = invoicesQuery.data?.totalPages ?? 0;

  const stats = useMemo(() => {
    return {
      totalRevenue: dashboardQuery.data?.summary.totalRevenue ?? 0,
      pending: dashboardQuery.data?.summary.pendingAmount ?? 0,
      overdue: dashboardQuery.data?.summary.overdueAmount ?? 0,
      count: invoicesQuery.data?.totalElements ?? invoices.length,
    };
  }, [dashboardQuery.data, invoicesQuery.data, invoices]);

  const monthly = useMemo(() => {
    return dashboardQuery.data?.monthlyRevenue ?? [];
  }, [dashboardQuery.data]);

  const distributionData = useMemo(() => {
    if (!dashboardQuery.data?.statusDistribution) return [];
    
    const colors: Record<string, string> = {
      PAID: "hsl(142.1 76.2% 36.3%)",
      PENDING: "hsl(37.9 92.1% 50.2%)",
      OVERDUE: "hsl(346.8 77.2% 49.8%)",
    };

    const labels: Record<string, string> = {
      PAID: "To'langan",
      PENDING: "Kutilmoqda",
      OVERDUE: "Muddati o'tgan",
    };

    return dashboardQuery.data.statusDistribution.map((item) => ({
      name: labels[item.status] || item.status,
      value: item.count,
      amount: item.amount,
      color: colors[item.status] || "hsl(var(--muted-foreground))",
    })).filter((item) => item.value > 0);
  }, [dashboardQuery.data]);

  const orgMap = useMemo(() => new Map(orgs.map((org) => [org.id, org.name])), [orgs]);

  const resetForm = async () => {
    setEditing(null);
    let nextNum = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
    try {
      const res = await api.get<{ number: string }>("/finance/invoices/next-number");
      if (res.data.number) nextNum = res.data.number;
    } catch (e) {
      // fallback
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
      toast.error(t("dynamic.finance.bu_hisob_raqami_band_iltimos_boshqasini_"));
      return;
    }
    setSubmitting(true);
    try {
      await createUpdateInvoiceMutation.mutateAsync({
        organization_id: parsed.data.organization_id,
        invoice_number: parsed.data.invoice_number,
        amount: parsed.data.amount,
        currency: parsed.data.currency,
        status: parsed.data.status.toUpperCase(),
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

  const columns = useMemo<ColumnDef<Invoice>[]>(
    () => [
      {
        accessorKey: "invoice_number",
        header: "Raqam",
        cell: (info) => <span className="font-mono text-xs">{info.getValue() as string}</span>,
      },
      {
        accessorKey: "organization_id",
        header: "Tashkilot",
        cell: (info) => <span className="font-medium">{String(orgMap.get(info.getValue() as string) ?? "—")}</span>,
      },
      {
        accessorKey: "amount",
        header: "Summa",
        cell: (info) => {
          const row = info.row.original;
          return <span className="font-semibold">{fmtAmount(row.amount, row.currency)}</span>;
        },
      },
      {
        accessorKey: "status",
        header: "Holat",
        cell: (info) => {
          const val = info.getValue() as string;
          const m = statusMeta(val);
          const Icon = m.icon;
          return (
            <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full", m.color)}>
              <Icon className="h-3 w-3" />
              {m.label}
            </span>
          );
        },
      },
      {
        accessorKey: "due_date",
        header: "Muddat",
        cell: (info) => {
          const val = info.getValue() as string;
          return <span className="text-xs text-muted-foreground">{val ? new Date(val).toLocaleDateString("uz-UZ") : "—"}</span>;
        },
      },
      {
        id: "actions",
        header: "Amallar",
        cell: (info) => {
          const inv = info.row.original;
          return (
            <div className="flex gap-1 justify-end">
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
                    <AlertDialogTitle>{t("dynamic.finance.o_chirishni_tasdiqlaysizmi")}</AlertDialogTitle>
                    <AlertDialogDescription>{inv.invoice_number} o'chiriladi.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("dynamic.usersmanager.bekor")}</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive" onClick={() => remove(inv.id)}>{t("dynamic.usersmanager.o_chirish")}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        },
      },
    ],
    [orgMap]
  );

  const table = useReactTable({
    data: invoices,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const cards = [
    { label: "Jami daromad", value: fmtAmount(stats.totalRevenue, "UZS"), icon: TrendingUp },
    { label: t("dynamic.orgpayments.kutilmoqda"), value: fmtAmount(stats.pending, "UZS"), icon: Clock },
    { label: "Muddati o'tgan", value: fmtAmount(stats.overdue, "UZS"), icon: AlertCircle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("dynamic.finance.moliya_boshqaruvi")}</h1>
          <p className="text-sm text-muted-foreground">{t("dynamic.finance.hisobfakturalar_to_lovlar_va_moliyaviy_n")}</p>
        </div>
        <Button variant="hero" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Yangi Invoice
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            {dashboardQuery.isLoading ? (
              <>
                {[...Array(3)].map((_, idx) => (
                  <div key={idx} className="rounded-3xl border border-border p-5 bg-card shadow-sm space-y-3">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-8 w-32 rounded animate-pulse" />
                  </div>
                ))}
              </>
            ) : (
              cards.map((c) => (
                <div key={c.label} className="rounded-3xl border border-border p-5 bg-card shadow-sm">
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="mt-3 text-3xl font-semibold">{c.value}</p>
                </div>
              ))
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
            <div className="rounded-3xl border border-border p-5 bg-card shadow-sm min-h-[320px]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{t("dynamic.finance.oylik_tushum")}</h2>
                  <p className="text-sm text-muted-foreground">{t("dynamic.finance.oxirgi_davr_bo_yicha")}</p>
                </div>
                <RefreshCw className="h-5 w-5 text-muted-foreground" />
              </div>
              {dashboardQuery.isLoading ? (
                <div className="h-[260px] flex flex-col justify-between p-2">
                  <Skeleton className="h-4 w-1/3 rounded animate-pulse" />
                  <Skeleton className="h-40 w-full rounded animate-pulse" />
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-12 rounded" />
                    <Skeleton className="h-4 w-12 rounded" />
                    <Skeleton className="h-4 w-12 rounded" />
                    <Skeleton className="h-4 w-12 rounded" />
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={monthly} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 8" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000000}M`} />
                    <Tooltip formatter={(value: any) => fmtAmount(Number(value), "UZS")} />
                    <Area type="monotone" dataKey="amount" stroke="hsl(var(--success))" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="rounded-3xl border border-border p-5 bg-card shadow-sm min-h-[320px]">
              <h2 className="text-lg font-semibold mb-3">{t("dynamic.finance.status_taqsimoti")}</h2>
              {dashboardQuery.isLoading ? (
                <div className="h-[260px] flex items-center justify-center">
                  <div className="relative flex items-center justify-center">
                    <Skeleton className="h-36 w-36 rounded-full border-[15px] border-muted animate-pulse" />
                    <div className="absolute h-20 w-20 rounded-full bg-card" />
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={distributionData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4}>
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any, name: any, props: any) => [`${value} ta (${fmtAmount(props.payload.amount, "UZS")})`, name]} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-border p-5 bg-card shadow-sm space-y-4">
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
                    <SelectItem value="all">{t("dynamic.finance.barchasi")}</SelectItem>
                    {STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {invoicesQuery.data && (
                  <span className="text-sm text-muted-foreground">Sahifa: {page + 1} / {totalPages}</span>
                )}
              </div>
            </div>

            {invoicesQuery.isLoading ? (
              <TableSkeleton rows={5} cols={6} />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} className={header.column.columnDef.id === "actions" || header.column.columnDef.id === "amount" ? "text-right" : ""}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-10">
                          Invoice topilmadi
                        </TableCell>
                      </TableRow>
                    ) : (
                      table.getRowModel().rows.map((row) => (
                        <TableRow key={row.id} className="hover:bg-muted/40">
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className={cell.column.columnDef.id === "actions" || cell.column.columnDef.id === "amount" ? "text-right" : ""}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

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
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-border p-5 bg-card shadow-sm">
            <h2 className="text-lg font-semibold mb-4">{t("dynamic.finance.statistika")}</h2>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 rounded-3xl border border-border p-4 bg-muted/80">
                <Wallet className="h-5 w-5 text-primary" />
                <div className="w-full">
                  <p className="text-sm text-muted-foreground">{t("dynamic.finance.umumiy_to_lovlar")}</p>
                  {dashboardQuery.isLoading ? (
                    <Skeleton className="h-5 w-24 mt-1" />
                  ) : (
                    <p className="font-semibold">{fmtAmount(stats.totalRevenue, "UZS")}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-3xl border border-border p-4 bg-muted/80">
                <FileText className="h-5 w-5 text-slate-700" />
                <div className="w-full">
                  <p className="text-sm text-muted-foreground">{t("dynamic.finance.invoice_soni")}</p>
                  {dashboardQuery.isLoading ? (
                    <Skeleton className="h-5 w-12 mt-1" />
                  ) : (
                    <p className="font-semibold">{stats.count}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-3xl border border-border p-4 bg-muted/80">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <div className="w-full">
                  <p className="text-sm text-muted-foreground">{t("dynamic.finance.aktiv_statuslar")}</p>
                  {dashboardQuery.isLoading ? (
                    <Skeleton className="h-5 w-12 mt-1" />
                  ) : (
                    <p className="font-semibold">{
                      dashboardQuery.data?.statusDistribution
                        ? dashboardQuery.data.statusDistribution.filter(x => x.status === "PAID" || x.status === "PENDING" || x.status === "OVERDUE").reduce((acc, curr) => acc + curr.count, 0)
                        : 0
                    }</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-border p-5 bg-card shadow-sm">
            <h2 className="text-lg font-semibold mb-4">{t("dynamic.finance.hisobfaktura_yaratish")}</h2>
            <p className="text-sm text-muted-foreground">{t("dynamic.finance.yangi_invoice_qo_shish_yoki_mavjudini_ta")}</p>
            <Button className="mt-4 w-full" onClick={openCreate}>{t("dynamic.finance.yangi_invoice")}</Button>
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
                <Label>{t("dynamic.finance.tashkilot_")}</Label>
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
                <Label>{t("dynamic.finance.invoice_raqami_")}</Label>
                <Input value={form.invoice_number} onChange={(e) => setForm((s) => ({ ...s, invoice_number: e.target.value }))} />
                {numberCheckQuery.isFetching ? (
                  <p className="text-xs text-muted-foreground mt-1">{t("dynamic.finance.tekshirilmoqda")}</p>
                ) : numberCheckQuery.data === false && !editing ? (
                  <p className="text-xs text-destructive mt-1">{t("dynamic.finance.bu_raqam_band")}</p>
                ) : numberCheckQuery.data === true && !editing ? (
                  <p className="text-xs text-success mt-1">{t("dynamic.finance.raqam_mavjud")}</p>
                ) : null}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>{t("dynamic.finance.summa_")}</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} />
              </div>
              <div>
                <Label>{t("dynamic.finance.valyuta")}</Label>
                <Select value={form.currency} onValueChange={(value) => setForm((s) => ({ ...s, currency: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UZS">{t("dynamic.finance.uzs")}</SelectItem>
                    <SelectItem value="USD">{t("dynamic.finance.usd")}</SelectItem>
                    <SelectItem value="EUR">{t("dynamic.finance.eur")}</SelectItem>
                    <SelectItem value="RUB">{t("dynamic.finance.rub")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>{t("dynamic.finance.status")}</Label>
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
                <Label>{t("dynamic.finance.muddati")}</Label>
                <Input type="date" value={form.due_date} onChange={(e) => setForm((s) => ({ ...s, due_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-3">
              <Label>{t("dynamic.finance.izoh")}</Label>
              <Textarea rows={4} value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("dynamic.pricingplans.bekor_qilish")}</Button>
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

