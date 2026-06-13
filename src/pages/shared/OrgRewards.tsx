import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Coins, Gift, Loader2, Plus, Trash2, Award, Send } from "lucide-react";

interface Reward {
  id: string;
  title: string;
  description: string | null;
  cost_coins: number;
  icon: string | null;
  stock: number | null;
  is_active: boolean;
}

interface Student {
  id: string;
  full_name: string | null;
  username: string;
  coins: number | null;
}

export default function OrgRewards() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // create reward
  const [openReward, setOpenReward] = useState(false);
  const [rTitle, setRTitle] = useState("");
  const [rDesc, setRDesc] = useState("");
  const [rCost, setRCost] = useState("100");
  const [rIcon, setRIcon] = useState("🎁");

  // award coins
  const [openAward, setOpenAward] = useState(false);
  const [studentId, setStudentId] = useState<string>("");
  const [coinAmount, setCoinAmount] = useState("10");
  const [coinReason, setCoinReason] = useState("");

  const load = async () => {
    if (!profile?.organization_id) return;
    setLoading(true);
    const [{ data: rws }, { data: roles }] = await Promise.all([
      supabase.from("rewards").select("*").eq("organization_id", profile.organization_id).order("cost_coins"),
      supabase.from("user_roles").select("user_id").eq("organization_id", profile.organization_id).eq("role", "student"),
    ]);
    setRewards((rws ?? []) as Reward[]);
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, username, coins")
        .in("id", ids)
        .order("full_name");
      setStudents((profs ?? []) as Student[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.organization_id]);

  const createReward = async () => {
    if (!profile?.organization_id) return;
    if (!rTitle.trim()) return toast.error(t("dynamic.orgrewards.sovg_a_nomi_kerak"));
    const { error } = await supabase.from("rewards").insert({
      organization_id: profile.organization_id,
      title: rTitle.trim(),
      description: rDesc.trim() || null,
      cost_coins: Number(rCost) || 0,
      icon: rIcon || "🎁",
      created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success(t("dynamic.orgrewards.sovg_a_qo_shildi"));
    setRTitle(""); setRDesc(""); setRCost("100"); setRIcon("🎁");
    setOpenReward(false);
    load();
  };

  const removeReward = async (id: string) => {
    if (!confirm(t("dynamic.orgrewards.o_chirish"))) return;
    await supabase.from("rewards").delete().eq("id", id);
    toast.success(t("dynamic.usersmanager.o_chirildi"));
    load();
  };

  const awardCoins = async () => {
    if (!studentId) return toast.error(t("dynamic.orgrewards.talabani_tanlang"));
    const amt = Number(coinAmount);
    if (!amt) return toast.error(t("dynamic.orgrewards.miqdorni_kiriting"));
    if (!coinReason.trim()) return toast.error(t("dynamic.orgrewards.sabab_kiriting"));
    const { error } = await supabase.rpc("award_coins" as any, {
      _student_id: studentId,
      _amount: amt,
      _reason: coinReason.trim(),
      _source: "manual",
    });
    if (error) return toast.error(error.message);
    toast.success(`${amt} coin berildi`);
    setCoinAmount("10"); setCoinReason(""); setStudentId("");
    setOpenAward(false);
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("dynamic.orgrewards.coin_va_sovg_alar")}</h1>
          <p className="text-muted-foreground">{t("dynamic.orgrewards.talabalarni_rag_batlantirish_tizimi")}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={openAward} onOpenChange={setOpenAward}>
            <DialogTrigger asChild>
              <Button variant="outline"><Award className="h-4 w-4" />{t("dynamic.orgrewards.coin_berish")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("dynamic.orgrewards.talabaga_coin_berish")}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>{t("dynamic.orgrewards.talaba")}</Label>
                  <Select value={studentId} onValueChange={setStudentId}>
                    <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.full_name || s.username} ({s.coins ?? 0} coin)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{t("dynamic.orgrewards.miqdor_manfiy_ham_mumkin")}</Label>
                    <Input type="number" value={coinAmount} onChange={(e) => setCoinAmount(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>{t("dynamic.smartdashboard.sabab")}</Label>
                  <Textarea rows={2} value={coinReason} onChange={(e) => setCoinReason(e.target.value)} placeholder={t("dynamic.usersmanager.olimpiada_g_olibi")} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={awardCoins}><Send className="h-4 w-4" />{t("dynamic.orgrewards.berish")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={openReward} onOpenChange={setOpenReward}>
            <DialogTrigger asChild>
              <Button variant="hero"><Plus className="h-4 w-4" />{t("dynamic.orgrewards.sovg_a_qo_shish")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("dynamic.orgrewards.yangi_sovg_a")}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-[80px,1fr] gap-3">
                  <div>
                    <Label>{t("dynamic.orgrewards.emoji")}</Label>
                    <Input value={rIcon} onChange={(e) => setRIcon(e.target.value)} maxLength={4} className="text-center text-2xl" />
                  </div>
                  <div>
                    <Label>{t("dynamic.orgsubjects.nom_")}</Label>
                    <Input value={rTitle} onChange={(e) => setRTitle(e.target.value)} placeholder="Bepul oylik to'lov" />
                  </div>
                </div>
                <div>
                  <Label>{t("dynamic.telegramlinks.tavsif")}</Label>
                  <Textarea rows={2} value={rDesc} onChange={(e) => setRDesc(e.target.value)} />
                </div>
                <div>
                  <Label>{t("dynamic.orgrewards.narx_coin")}</Label>
                  <Input type="number" value={rCost} onChange={(e) => setRCost(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={createReward}>{t("dynamic.usersmanager.saqlash")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Top students */}
      <div>
        <h2 className="font-display font-semibold text-lg mb-3">🏆 Eng faol talabalar</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...students].sort((a, b) => (b.coins ?? 0) - (a.coins ?? 0)).slice(0, 4).map((s, i) => (
            <Card key={s.id} className="p-4 flex items-center gap-3">
              <span className="text-2xl">{["🥇", "🥈", "🥉", "🎖️"][i]}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{s.full_name || s.username}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Coins className="h-3 w-3" /> {(s.coins ?? 0).toLocaleString("uz-UZ")}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Rewards grid */}
      <div>
        <h2 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" /> Sovg'alar katalogi
        </h2>
        {rewards.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">{t("dynamic.orgrewards.hali_sovg_alar_yo_q_birinchi_sovg_ani_qo")}</Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((r) => (
              <Card key={r.id} className="p-5 group">
                <div className="flex items-start justify-between">
                  <div className="text-3xl mb-2">{r.icon ?? "🎁"}</div>
                  <Button size="icon" variant="ghost" onClick={() => removeReward(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <p className="font-display font-semibold">{r.title}</p>
                {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                <Badge className="bg-primary/15 text-primary border-primary/30 mt-3">
                  <Coins className="h-3 w-3 mr-1" /> {r.cost_coins}
                </Badge>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

