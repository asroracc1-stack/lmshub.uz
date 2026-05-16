import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Crown, Search, Bell, Loader2, AlertTriangle, CheckCircle2, Clock, History, Wallet, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

type Sub = {
  id: string; user_id: string; pack_id: string;
  starts_at: string; expires_at: string; is_active: boolean; status: string;
  created_at: string;
  subscription_packs: { code: string; name: string; price_uzs: number } | null;
  profiles: { full_name: string | null; username: string | null; phone: string | null; avatar_url: string | null } | null;
};
type Payment = {
  id: string; user_id: string; amount: number; status: string; created_at: string; method: string | null;
  profiles: { full_name: string | null; username: string | null } | null;
};

const STATUS_FILTERS = ["all", "active", "expiring", "expired"] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

export default function Subscriptions() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [packFilter, setPackFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const [subsRes, payRes] = await Promise.all([
      (supabase as any).from("user_subscriptions")
        .select("*, subscription_packs(code,name,price_uzs), profiles!user_subscriptions_user_id_profiles_fkey(full_name,username,phone,avatar_url)")
        .order("created_at", { ascending: false })
        .limit(500),
      (supabase as any).from("payments")
        .select("*, profiles!payments_student_id_profiles_fkey(full_name,username)")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    if (subsRes.error) toast.error(subsRes.error.message); else setSubs(subsRes.data ?? []);
    if (!payRes.error) setPayments(payRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const now = Date.now();
  const enriched = useMemo(() => subs.map((s) => {
    const exp = new Date(s.expires_at).getTime();
    const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    const live = s.is_active && exp > now;
    const expiring = live && daysLeft <= 7;
    return { ...s, daysLeft, live, expiring };
  }), [subs, now]);

  const filtered = enriched.filter((s) => {
    if (packFilter !== "all" && s.subscription_packs?.code !== packFilter) return false;
    if (statusFilter === "active" && !s.live) return false;
    if (statusFilter === "expired" && s.live) return false;
    if (statusFilter === "expiring" && !s.expiring) return false;
    if (q) {
      const hay = `${s.profiles?.full_name ?? ""} ${s.profiles?.username ?? ""} ${s.profiles?.phone ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  const stats = useMemo(() => {
    const active = enriched.filter((s) => s.live).length;
    const expired = enriched.length - active;
    const expiringSoon = enriched.filter((s) => s.expiring).length;
    const revenue = payments.filter((p) => p.status === "paid" || p.status === "completed")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return { active, expired, expiringSoon, revenue, total: enriched.length };
  }, [enriched, payments]);

  const sendReminders = async () => {
    setSending(true);
    try {
      const targets = enriched.filter((s) => s.expiring);
      if (targets.length === 0) { toast.info("Eslatma yuborish kerak bo'lganlar yo'q"); return; }
      const rows = targets.map((s) => ({
        user_id: s.user_id,
        title: "Obunangiz tez orada tugaydi",
        body: `${s.subscription_packs?.name ?? "Pack"} obunangiz ${s.daysLeft} kunda tugaydi. Yangilash uchun Obunalar sahifasiga o'ting.`,
        type: "subscription_reminder",
      }));
      const { error } = await (supabase as any).from("notifications").insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} ta foydalanuvchiga eslatma yuborildi`);
    } catch (e: any) { toast.error(e.message); }
    finally { setSending(false); }
  };

  const packCodes = Array.from(new Set(subs.map((s) => s.subscription_packs?.code).filter(Boolean) as string[]));

  // History grouped by user
  const history = useMemo(() => {
    const map = new Map<string, Sub[]>();
    enriched.forEach((s) => {
      const key = s.user_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return Array.from(map.entries())
      .map(([uid, list]) => ({ uid, list, latest: list[0] }))
      .filter((g) => g.list.length >= 2)
      .slice(0, 50);
  }, [enriched]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-500" /> Subscription Manager
          </h1>
          <p className="text-sm text-muted-foreground">Obunalarni boshqarish, eslatmalar va to'lovlar tarixi</p>
        </div>
        <Button onClick={sendReminders} disabled={sending} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
          Eslatma yuborish ({stats.expiringSoon})
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" /> Jami</div>
          <p className="text-2xl font-display font-bold mt-1">{stats.total}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" /> Faol</div>
          <p className="text-2xl font-display font-bold text-emerald-600 mt-1">{stats.active}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" /> 7 kun ichida tugaydi</div>
          <p className="text-2xl font-display font-bold text-amber-600 mt-1">{stats.expiringSoon}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-rose-500/10 to-rose-500/5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Tugagan</div>
          <p className="text-2xl font-display font-bold text-rose-600 mt-1">{stats.expired}</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-violet-500/10 to-violet-500/5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Wallet className="h-3.5 w-3.5" /> Daromad</div>
          <p className="text-2xl font-display font-bold text-violet-600 mt-1">{stats.revenue.toLocaleString()} so'm</p>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Faol obunalar</TabsTrigger>
          <TabsTrigger value="history"><History className="h-3.5 w-3.5 mr-1" /> Renewal History</TabsTrigger>
          <TabsTrigger value="payments"><Wallet className="h-3.5 w-3.5 mr-1" /> To'lovlar</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3">
          {/* Filters */}
          <Card className="p-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism, username yoki telefon" className="pl-9" />
            </div>
            <Select value={packFilter} onValueChange={setPackFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha paketlar</SelectItem>
                {packCodes.map((c) => <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha holatlar</SelectItem>
                <SelectItem value="active">Faol</SelectItem>
                <SelectItem value="expiring">Tez tugaydi</SelectItem>
                <SelectItem value="expired">Tugagan</SelectItem>
              </SelectContent>
            </Select>
          </Card>

          <Card className="overflow-hidden">
            {loading ? (
              <div className="p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
            ) : filtered.length === 0 ? (
              <p className="p-12 text-center text-muted-foreground text-sm">Obuna topilmadi</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Foydalanuvchi</TableHead>
                      <TableHead>Pack</TableHead>
                      <TableHead>Sotib olingan</TableHead>
                      <TableHead>Tugaydi</TableHead>
                      <TableHead>Qolgan</TableHead>
                      <TableHead>Holat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <p className="font-medium">{s.profiles?.full_name || s.profiles?.username || "—"}</p>
                          <p className="text-xs text-muted-foreground">{s.profiles?.phone ?? ""}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="uppercase">{s.subscription_packs?.code ?? "—"}</Badge>
                          <p className="text-xs text-muted-foreground mt-0.5">{Number(s.subscription_packs?.price_uzs ?? 0).toLocaleString()} so'm</p>
                        </TableCell>
                        <TableCell className="text-sm">{format(new Date(s.starts_at), "dd.MM.yyyy")}</TableCell>
                        <TableCell className="text-sm">{format(new Date(s.expires_at), "dd.MM.yyyy")}</TableCell>
                        <TableCell className="text-sm">
                          {s.live ? `${s.daysLeft} kun` : <span className="text-rose-500">Tugagan</span>}
                        </TableCell>
                        <TableCell>
                          {s.expiring ? <Badge className="bg-amber-500 text-white">Tez tugaydi</Badge>
                            : s.live ? <Badge className="bg-emerald-500 text-white">Active</Badge>
                            : <Badge variant="destructive">Expired</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="overflow-hidden">
            {history.length === 0 ? (
              <p className="p-12 text-center text-muted-foreground text-sm">Hali takroriy obunalar yo'q</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Foydalanuvchi</TableHead>
                      <TableHead>Renewals</TableHead>
                      <TableHead>Oxirgi pack</TableHead>
                      <TableHead>Oxirgi sana</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((g) => (
                      <TableRow key={g.uid}>
                        <TableCell className="font-medium">
                          {g.latest.profiles?.full_name || g.latest.profiles?.username || "—"}
                        </TableCell>
                        <TableCell><Badge variant="secondary">{g.list.length} marta</Badge></TableCell>
                        <TableCell><Badge variant="outline">{g.latest.subscription_packs?.code?.toUpperCase()}</Badge></TableCell>
                        <TableCell className="text-sm">{format(new Date(g.latest.created_at), "dd.MM.yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card className="overflow-hidden">
            {payments.length === 0 ? (
              <p className="p-12 text-center text-muted-foreground text-sm">To'lovlar yo'q</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Foydalanuvchi</TableHead>
                      <TableHead>Summa</TableHead>
                      <TableHead>Usul</TableHead>
                      <TableHead>Holat</TableHead>
                      <TableHead>Sana</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.profiles?.full_name || p.profiles?.username || "—"}</TableCell>
                        <TableCell>{Number(p.amount).toLocaleString()} so'm</TableCell>
                        <TableCell className="text-sm capitalize">{p.method ?? "—"}</TableCell>
                        <TableCell>
                          {p.status === "paid" || p.status === "completed"
                            ? <Badge className="bg-emerald-500 text-white">{p.status}</Badge>
                            : <Badge variant="outline">{p.status}</Badge>}
                        </TableCell>
                        <TableCell className="text-sm">{format(new Date(p.created_at), "dd.MM.yyyy HH:mm")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
