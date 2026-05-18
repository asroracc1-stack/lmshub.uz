import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, Search, CheckCircle2, XCircle, Eye, Send, Wallet } from "lucide-react";

type Filter = "pending" | "paid" | "rejected" | "all";

export default function PackManagerPayments({ initialFilter = "pending" as Filter }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);
  const [rejecting, setRejecting] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: itemsData = [], isLoading: loadingPayments, refetch: load } = useQuery({
    queryKey: ["payments-list"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payments")
        .select("*, profiles!payments_student_id_profiles_fkey(full_name,username,telegram_username,phone), subscription_packs:pack_id(name,code,price_uzs)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    placeholderData: (previousData) => previousData,
  });

  const items = itemsData;
  const loading = loadingPayments;

  // realtime
  useEffect(() => {
    const ch = supabase
      .channel("pm-payments")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => items.filter((p) => {
    if (filter !== "all" && p.status !== filter && !(filter === "paid" && p.status === "completed")) return false;
    if (q) {
      const hay = `${p.profiles?.full_name ?? ""} ${p.profiles?.username ?? ""} ${p.profiles?.telegram_username ?? ""} ${p.subscription_packs?.name ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [items, filter, q]);

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("approve_payment", { _payment_id: id, _comment: null });
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments-list"] });
      toast.success("✅ To'lov tasdiqlandi va pack faollashtirildi");
      setBusyId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Xatolik yuz berdi");
      setBusyId(null);
    },
  });

  const approve = async (id: string) => {
    setBusyId(id);
    approveMutation.mutate(id);
  };

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string, reason: string }) => {
      const { error } = await (supabase as any).rpc("reject_payment", { _payment_id: id, _reason: reason });
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments-list"] });
      toast.success("To'lov rad etildi");
      setBusyId(null);
      setRejecting(null);
      setRejectReason("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Xatolik yuz berdi");
      setBusyId(null);
    },
  });

  const submitReject = async () => {
    if (!rejecting) return;
    setBusyId(rejecting.id);
    rejectMutation.mutate({ id: rejecting.id, reason: rejectReason || "Tasdiqlanmadi" });
  };

  const StatusBadge = ({ s }: { s: string }) => {
    if (s === "paid" || s === "completed") return <Badge className="bg-emerald-500 text-white">Approved</Badge>;
    if (s === "rejected") return <Badge variant="destructive">Rejected</Badge>;
    return <Badge className="bg-amber-500 text-white">Pending</Badge>;
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6 text-emerald-500" /> Payment Requests
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Tasdiqlash, rad etish va tarix</p>
      </div>

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Foydalanuvchi, telegram, pack" className="pl-9" />
        </div>
        <Select value={filter} onValueChange={(v: Filter) => setFilter(v)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Kutilayotgan</SelectItem>
            <SelectItem value="paid">Tasdiqlangan</SelectItem>
            <SelectItem value="rejected">Rad etilgan</SelectItem>
            <SelectItem value="all">Barchasi</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <p className="p-12 text-center text-muted-foreground text-sm">To'lovlar topilmadi</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Foydalanuvchi</TableHead>
                  <TableHead>Pack</TableHead>
                  <TableHead>Summa</TableHead>
                  <TableHead>Telegram</TableHead>
                  <TableHead>Sana</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{p.profiles?.full_name || p.profiles?.username || "—"}</p>
                      <p className="text-xs text-muted-foreground">{p.profiles?.phone ?? ""}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.subscription_packs?.name || p.subscription_packs?.code || "—"}</Badge>
                    </TableCell>
                    <TableCell className="font-display font-semibold">{Number(p.amount).toLocaleString()} so'm</TableCell>
                    <TableCell>
                      {p.profiles?.telegram_username ? (
                        <a href={`https://t.me/${p.profiles.telegram_username.replace(/^@/, "")}`} target="_blank" rel="noreferrer"
                           className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1">
                          <Send className="h-3 w-3" /> @{p.profiles.telegram_username.replace(/^@/, "")}
                        </a>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-xs">{format(new Date(p.created_at), "dd.MM.yyyy HH:mm")}</TableCell>
                    <TableCell><StatusBadge s={p.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.receipt_url && (
                          <Button size="sm" variant="ghost" onClick={() => setViewing(p)} title="Chekni ko'rish">
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {p.status === "pending" && (
                          <>
                            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white"
                                    disabled={busyId === p.id} onClick={() => approve(p.id)}>
                              {busyId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve</>}
                            </Button>
                            <Button size="sm" variant="destructive" disabled={busyId === p.id}
                                    onClick={() => { setRejecting(p); setRejectReason(""); }}>
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Chek</DialogTitle></DialogHeader>
          {viewing?.receipt_url && (
            <img src={viewing.receipt_url} alt="Receipt" className="rounded-lg max-h-[70vh] mx-auto" />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>To'lovni rad etish</DialogTitle>
            <DialogDescription>Sabab foydalanuvchiga yuboriladi</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Sababini yozing..." rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Bekor qilish</Button>
            <Button variant="destructive" onClick={submitReject} disabled={busyId === rejecting?.id}>
              {busyId === rejecting?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rad etish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
