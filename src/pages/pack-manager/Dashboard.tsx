import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Clock, CheckCircle2, AlertTriangle, Crown, TrendingUp, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

export default function PackManagerDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    rejected: 0,
    activeSubs: 0,
    expiredSubs: 0,
    monthRevenue: 0,
    todayRevenue: 0,
    todayCount: 0,
  });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(); since.setDate(1); since.setHours(0,0,0,0);
      const today = new Date(); today.setHours(0,0,0,0);

      const [{ data: payments }, { data: subs }] = await Promise.all([
        (supabase as any).from("payments").select("id,amount,status,created_at,student_id,pack_id").order("created_at", { ascending: false }).limit(500),
        (supabase as any).from("user_subscriptions").select("id,is_active,expires_at").limit(2000),
      ]);

      const paid = (payments || []).filter((p: any) => p.status === "paid" || p.status === "completed");
      const monthRevenue = paid.filter((p: any) => new Date(p.created_at) >= since).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const todayPaid = paid.filter((p: any) => new Date(p.created_at) >= today);

      const now = Date.now();
      const activeSubs = (subs || []).filter((s: any) => s.is_active && new Date(s.expires_at).getTime() > now).length;
      const expiredSubs = (subs || []).filter((s: any) => new Date(s.expires_at).getTime() <= now).length;

      setStats({
        total: payments?.length || 0,
        pending: (payments || []).filter((p: any) => p.status === "pending").length,
        paid: paid.length,
        rejected: (payments || []).filter((p: any) => p.status === "rejected").length,
        activeSubs,
        expiredSubs,
        monthRevenue,
        todayRevenue: todayPaid.reduce((s: number, p: any) => s + Number(p.amount || 0), 0),
        todayCount: todayPaid.length,
      });

      // Recent pending
      const pendingIds = (payments || []).filter((p: any) => p.status === "pending").slice(0, 8);
      if (pendingIds.length) {
        const userIds = Array.from(new Set(pendingIds.map((p: any) => p.student_id)));
        const { data: profs } = await (supabase as any).from("profiles").select("id,full_name,username").in("id", userIds);
        const map = new Map((profs || []).map((p: any) => [p.id, p]));
        setRecent(pendingIds.map((p: any) => ({ ...p, profile: map.get(p.student_id) })));
      } else setRecent([]);
      setLoading(false);
    })();
  }, []);

  const Stat = ({ icon: Icon, label, value, color }: any) => (
    <Card className={`p-5 bg-gradient-to-br ${color} border border-border/50 hover:shadow-glow transition-smooth`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" /> {label}</div>
      <p className="text-2xl md:text-3xl font-display font-bold mt-2">{value}</p>
    </Card>
  );

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">
          Pack Manager Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">To'lovlar, obunalar va aktivatsiyalar boshqaruvi</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <Stat icon={Wallet} label="Jami to'lovlar" value={stats.total} color="from-blue-500/10 to-blue-500/5" />
        <Stat icon={Clock} label="Kutilayotgan" value={stats.pending} color="from-amber-500/15 to-amber-500/5" />
        <Stat icon={CheckCircle2} label="Tasdiqlangan" value={stats.paid} color="from-emerald-500/15 to-emerald-500/5" />
        <Stat icon={AlertTriangle} label="Rad etilgan" value={stats.rejected} color="from-rose-500/10 to-rose-500/5" />
        <Stat icon={Crown} label="Faol obunalar" value={stats.activeSubs} color="from-violet-500/15 to-violet-500/5" />
        <Stat icon={Clock} label="Tugagan obunalar" value={stats.expiredSubs} color="from-slate-500/10 to-slate-500/5" />
        <Stat icon={TrendingUp} label="Bugungi" value={`${stats.todayCount} · ${stats.todayRevenue.toLocaleString()} so'm`} color="from-cyan-500/15 to-cyan-500/5" />
        <Stat icon={TrendingUp} label="Oylik daromad" value={`${stats.monthRevenue.toLocaleString()} so'm`} color="from-emerald-500/20 to-blue-500/10" />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-amber-500" /> Kutilayotgan to'lovlar</h2>
          <Link to="/pack-manager/payments" className="text-xs text-emerald-500 hover:underline">Hammasini ko'rish →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Kutilayotgan to'lovlar yo'q ✨</p>
        ) : (
          <div className="divide-y divide-border/50">
            {recent.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{p.profile?.full_name || p.profile?.username || "—"}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(p.created_at), "dd.MM.yyyy HH:mm")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display font-semibold">{Number(p.amount).toLocaleString()} so'm</span>
                  <Badge className="bg-amber-500 text-white">Pending</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
