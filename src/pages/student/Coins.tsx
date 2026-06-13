import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Coins, Gift, TrendingUp, TrendingDown, Sparkles, Lock } from "lucide-react";

interface Tx {
  id: string;
  amount: number;
  reason: string;
  source: string;
  created_at: string;
}

interface Reward {
  id: string;
  title: string;
  description: string | null;
  cost_coins: number;
  icon: string | null;
  stock: number | null;
}

interface Grant {
  id: string;
  title: string;
  description: string | null;
  coins_spent: number;
  status: string;
  created_at: string;
}

export default function StudentCoins() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [balance, setBalance] = useState(0);
  const [tx, setTx] = useState<Tx[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);

  const [claiming, setClaiming] = useState<string | null>(null);

  const load = async () => {
    if (!user?.id || !profile?.organization_id) return;
    setLoading(true);
    const [{ data: prof }, { data: txs }, { data: rws }, { data: grs }] = await Promise.all([
      supabase.from("profiles").select("coins").eq("id", user.id).maybeSingle(),
      supabase.from("coin_transactions").select("*").eq("student_id", user.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("rewards").select("*").eq("organization_id", profile.organization_id).eq("is_active", true).order("cost_coins"),
      supabase.from("reward_grants").select("*").eq("student_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setBalance((prof as any)?.coins ?? 0);
    setTx((txs ?? []) as Tx[]);
    setRewards((rws ?? []) as Reward[]);
    setGrants((grs ?? []) as Grant[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, profile?.organization_id]);

  const claim = async (r: Reward) => {
    if (balance < r.cost_coins) return toast.error(t("dynamic.coins.coin_yetarli_emas"));
    if (!confirm(`"${r.title}" sovg'asini olasizmi? ${r.cost_coins} coin yechiladi.`)) return;
    setClaiming(r.id);
    const { error } = await supabase.rpc("claim_reward", { _reward_id: r.id });
    setClaiming(null);
    if (error) return toast.error(error.message);
    toast.success("🎉 Sovg'a buyurtma qilindi! Admin tez orada topshiradi.");
    load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">{t("dynamic.coins.mening_coinlarim")}</h1>
        <p className="text-muted-foreground">{t("dynamic.coins.yaxshi_natijalar_uchun_coin_to_plang_va_")}</p>
      </div>

      {/* Balance card */}
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="p-8 bg-gradient-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-white/5" />
          <div className="relative flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm uppercase tracking-wider opacity-80">{t("dynamic.coins.joriy_balans")}</p>
              <p className="font-display text-6xl font-bold mt-2 flex items-center gap-3">
                <Coins className="h-12 w-12" />
                {balance.toLocaleString("uz-UZ")}
              </p>
              <p className="text-sm opacity-80 mt-1">{t("dynamic.coins.coin")}</p>
            </div>
            <div className="text-right text-sm opacity-90">
              <p>✨ Yaxshi baholar uchun: <b>{t("dynamic.coins.5")}</b></p>
              <p>📚 Davomat uchun: <b>{t("dynamic.coins.3")}</b></p>
              <p>❌ Kelmaslik: <b>-3</b></p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Rewards */}
      <div>
        <h2 className="font-display font-semibold text-xl mb-3 flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" /> Mavjud sovg'alar
        </h2>
        {rewards.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">{t("dynamic.coins.hali_sovg_alar_yo_q")}</Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((r) => {
              const canAfford = balance >= r.cost_coins;
              const out = r.stock !== null && r.stock <= 0;
              const need = Math.max(0, r.cost_coins - balance);
              return (
                <Card key={r.id} className={`p-5 flex flex-col transition-smooth ${canAfford && !out ? "hover:shadow-glow hover:-translate-y-0.5 border-primary/40" : "opacity-70"}`}>
                  <div className="text-3xl mb-2">{r.icon ?? "🎁"}</div>
                  <p className="font-display font-semibold">{r.title}</p>
                  {r.description && <p className="text-xs text-muted-foreground mt-1 flex-1">{r.description}</p>}
                  <div className="flex items-center justify-between mt-4">
                    <Badge className="bg-primary/15 text-primary border-primary/30">
                      <Coins className="h-3 w-3 mr-1" /> {r.cost_coins}
                    </Badge>
                    {r.stock !== null && (
                      <span className="text-xs text-muted-foreground">{r.stock} dona</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={canAfford && !out ? "hero" : "outline"}
                    className="mt-3 w-full"
                    disabled={!canAfford || out || claiming === r.id}
                    onClick={() => claim(r)}
                  >
                    {claiming === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> :
                      out ? "Tugagan" :
                      canAfford ? <><Gift className="h-4 w-4" />{t("dynamic.coins.olish")}</> :
                      <><Lock className="h-3.5 w-3.5" /> Yana {need} coin kerak</>}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* My grants */}
      {grants.length > 0 && (
        <div>
          <h2 className="font-display font-semibold text-xl mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Mening sovg'alarim
          </h2>
          <div className="grid gap-2">
            {grants.map((g) => (
              <Card key={g.id} className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-medium">{g.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(g.created_at).toLocaleDateString("uz-UZ")} · {g.coins_spent} coin
                  </p>
                </div>
                <Badge variant="outline">{g.status}</Badge>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div>
        <h2 className="font-display font-semibold text-xl mb-3">{t("dynamic.coins.so_nggi_tranzaksiyalar")}</h2>
        {tx.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">{t("dynamic.coins.hali_tranzaksiyalar_yo_q")}</Card>
        ) : (
          <div className="grid gap-2">
            {tx.map((t) => {
              const positive = t.amount > 0;
              const Icon = positive ? TrendingUp : TrendingDown;
              return (
                <Card key={t.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg grid place-items-center ${
                      positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleString("uz-UZ")} · {t.source}
                      </p>
                    </div>
                  </div>
                  <p className={`font-display font-bold ${positive ? "text-success" : "text-destructive"}`}>
                    {positive ? "+" : ""}{t.amount}
                  </p>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

