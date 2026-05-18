import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  Clock,
  Receipt,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PaymentTxRow {
  id: string;
  studentId: string;
  studentName: string;
  payerId: string;
  payerName: string;
  adminId: string;
  adminName: string;
  amount: number;
  paymentProofUrl: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  organizationId: string;
  note?: string;
  createdAt: string;
}

const columnHelper = createColumnHelper<PaymentTxRow>();

export default function PaymentRequests() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [selectedTx, setSelectedTx] = useState<PaymentTxRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["payment-requests", profile?.organization_id, statusFilter],
    queryFn: async () => {
      const { data } = await api.get<any>("/admin/payments/manage", {
        params: {
          organizationId: profile?.organization_id || undefined,
          status: statusFilter,
          size: 100,
        },
      });
      return data?.content || [];
    },
  });

  const transactions: PaymentTxRow[] = Array.isArray(data) ? data : [];

  const filteredTx = transactions.filter((tx) =>
    tx.studentName.toLowerCase().includes(search.toLowerCase()) ||
    tx.payerName.toLowerCase().includes(search.toLowerCase()) ||
    (tx.note && tx.note.toLowerCase().includes(search.toLowerCase()))
  );

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/admin/payments/manage/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-requests"] });
      toast.success("To'lov muvaffaqiyatli tasdiqlandi!");
      setModalOpen(false);
      setSelectedTx(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Xatolik yuz berdi");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(`/admin/payments/manage/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-requests"] });
      toast.success("To'lov rad etildi.");
      setModalOpen(false);
      setSelectedTx(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Xatolik yuz berdi");
    },
  });

  const getProofUrl = (path: string) => {
    if (path.startsWith("http")) return path;
    const { data } = supabase.storage.from("receipts").getPublicUrl(path);
    return data.publicUrl;
  };

  const columns = [
    columnHelper.accessor("studentName", {
      header: "Talaba",
      cell: (info) => (
        <div>
          <p className="font-semibold">{info.getValue()}</p>
          <p className="text-xs text-muted-foreground font-mono">
            To'lovchi: {info.row.original.payerName}
          </p>
        </div>
      ),
    }),
    columnHelper.accessor("amount", {
      header: "Miqdor",
      cell: (info) => (
        <span className="font-mono font-bold text-base">
          {info.getValue().toLocaleString("uz-UZ")} so'm
        </span>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Holat",
      cell: (info) => {
        const s = info.getValue();
        if (s === "APPROVED") {
          return (
            <Badge className="bg-success/15 text-success border-success/30">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Tasdiqlangan
            </Badge>
          );
        }
        if (s === "REJECTED") {
          return (
            <Badge className="bg-destructive/15 text-destructive border-destructive/30">
              <XCircle className="h-3 w-3 mr-1" /> Rad etilgan
            </Badge>
          );
        }
        return (
          <Badge className="bg-warning/15 text-warning border-warning/30 animate-pulse">
            <Clock className="h-3 w-3 mr-1" /> Kutilmoqda
          </Badge>
        );
      },
    }),
    columnHelper.accessor("note", {
      header: "Izoh",
      cell: (info) => (
        <span className="text-xs text-muted-foreground max-w-xs truncate block">
          {info.getValue() || "—"}
        </span>
      ),
    }),
    columnHelper.accessor("createdAt", {
      header: "Sana",
      cell: (info) => (
        <span className="text-xs text-muted-foreground">
          {new Date(info.getValue()).toLocaleString("uz-UZ")}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: () => <div className="text-right">Chek / Amallar</div>,
      cell: (info) => (
        <div className="text-right">
          <Button
            size="sm"
            variant="outline"
            className="hover:border-primary hover:bg-primary/10 transition-smooth"
            onClick={() => {
              setSelectedTx(info.row.original);
              setModalOpen(true);
            }}
          >
            <Eye className="h-4 w-4 mr-1.5 text-primary" /> Chekni ko'rish
          </Button>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data: filteredTx,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Receipt className="h-8 w-8 text-primary" /> To'lov so'rovlari
          </h1>
          <p className="text-muted-foreground">
            Talaba va ota-onalar tomonidan yuklangan to'lov cheklarini tekshirish va tasdiqlash
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Holat bo'yicha" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Barchasi</SelectItem>
              <SelectItem value="PENDING">Kutilmoqda</SelectItem>
              <SelectItem value="APPROVED">Tasdiqlangan</SelectItem>
              <SelectItem value="REJECTED">Rad etilgan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="glass rounded-2xl p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Talaba yoki ota-ona ismi bo'yicha qidirish..."
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3 py-8">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-16 w-full bg-muted/40 animate-pulse rounded-xl"
              />
            ))}
          </div>
        ) : filteredTx.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground space-y-2">
            <Receipt className="h-12 w-12 mx-auto opacity-30" />
            <p className="font-medium text-lg">To'lov so'rovlari topilmadi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead key={header.id}>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedTx && (
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent className="max-w-2xl bg-card border-border shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-display flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" /> To'lov chekini tekshirish
                </DialogTitle>
              </DialogHeader>

              <div className="grid md:grid-cols-2 gap-6 my-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Talaba</p>
                    <p className="font-semibold text-lg">{selectedTx.studentName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">To'lovchi (Payer)</p>
                    <p className="font-medium">{selectedTx.payerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Qabul qiluvchi Admin</p>
                    <p className="font-medium">{selectedTx.adminName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">To'lov miqdori</p>
                    <p className="font-mono text-2xl font-bold text-primary">
                      {selectedTx.amount.toLocaleString("uz-UZ")} UZS
                    </p>
                  </div>
                  {selectedTx.note && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Izoh</p>
                      <p className="text-sm bg-muted/40 p-3 rounded-lg border border-border">
                        {selectedTx.note}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Yuborilgan sana</p>
                    <p className="text-sm">
                      {new Date(selectedTx.createdAt).toLocaleString("uz-UZ")}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center bg-muted/20 p-2 rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Chek / Skrinshot rasmi</p>
                  <div className="relative w-full h-72 rounded-lg overflow-hidden flex items-center justify-center bg-black/5">
                    <img
                      src={getProofUrl(selectedTx.paymentProofUrl)}
                      alt="Chek"
                      className="max-w-full max-h-full object-contain hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <a
                    href={getProofUrl(selectedTx.paymentProofUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline mt-2 block"
                  >
                    To'liq o'lchamda ochish ↗
                  </a>
                </div>
              </div>

              <DialogFooter className="flex items-center justify-end gap-3 border-t border-border pt-4">
                {selectedTx.status === "PENDING" ? (
                  <>
                    <Button
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => rejectMutation.mutate(selectedTx.id)}
                      disabled={rejectMutation.isPending || approveMutation.isPending}
                    >
                      {rejectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-1" />
                      )}
                      Rad etish
                    </Button>
                    <Button
                      variant="hero"
                      className="bg-success hover:bg-success/90 text-white"
                      onClick={() => approveMutation.mutate(selectedTx.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                      )}
                      Tasdiqlash
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" onClick={() => setModalOpen(false)}>
                    Yopish
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
