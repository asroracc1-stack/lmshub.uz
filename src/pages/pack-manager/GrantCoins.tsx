import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Coins, Trophy, Gift, Clock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TigerPlayer from "@/components/TigerPlayer";

type Period = "week" | "month" | "6month" | "year" | "all";

interface Row {
  id: string;
  fullName: string | null;
  username: string;
  avatar_url: string | null;
  coins: number;
  rank: number;
}

export default function GrantCoinsPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<Period>("week");
  const [target, setTarget] = useState<Row | null>(null);
  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState("Eng faol foydalanuvchi mukofoti 🏆");

  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: async () => {
      const res = await api.get("/leaderboard/regular-users", {
        params: { period, limit: 100 }
      });
      return res.data as Row[];
    },
    retry: 1
  });

  const grantMutation = useMutation({
    mutationFn: async (payload: { userId: string, amount: number, reason: string }) => {
      return api.post("/super-admin/grant-coins", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      toast.success(`✅ ${target?.fullName ?? target?.username} ga ${amount} coin berildi`);
      setTarget(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Xatolik yuz berdi");
    }
  });

  const handleGrant = () => {
    if (!target || amount <= 0) return;
    grantMutation.mutate({
      userId: target.id, // User ID field name in LeaderboardDto is 'id'
      amount,
      reason
    });
  };

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Gift className="h-7 w-7 text-purple-500" /> Faol foydalanuvchilarga sovg'a
        </h1>
        <p className="text-sm text-muted-foreground">
          Mashq vaqti bo'yicha eng faollar — istalganiga coin yuboring
        </p>
      </div>

      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList className="grid grid-cols-5 max-w-2xl">
          <TabsTrigger value="week">Haftalik</TabsTrigger>
          <TabsTrigger value="month">Oylik</TabsTrigger>
          <TabsTrigger value="6month">6 oylik</TabsTrigger>
          <TabsTrigger value="year">Yillik</TabsTrigger>
          <TabsTrigger value="all">Umumiy</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <TigerPlayer text="Global peshqadamlar yuklanmoqda..." className="py-12" />
      ) : isError ? (
        <Card className="p-12 text-center space-y-4">
          <p className="text-destructive font-medium">Ma'lumotlarni yuklashda xatolik yuz berdi</p>
          <Button onClick={() => refetch()} variant="outline" className="mx-auto">
            Qayta urinish
          </Button>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Hali ma'lumot yo'q
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className="p-3 flex items-center gap-3">
              <div className="w-10 text-center font-bold text-lg">
                {r.rank === 1
                  ? "🥇"
                  : r.rank === 2
                    ? "🥈"
                    : r.rank === 3
                      ? "🥉"
                      : `#${r.rank}`}
              </div>
              <Avatar className="h-10 w-10">
                <AvatarImage src={r.avatar_url ?? undefined} />
                <AvatarFallback>
                  {(r.fullName ?? r.username)[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{r.fullName ?? r.username}</p>
                <p className="text-xs text-muted-foreground">@{r.username}</p>
              </div>
              <Badge variant="outline" className="gap-1">
                <Coins className="h-3 w-3 text-amber-500" />
                {r.coins} coin
              </Badge>
              {role === "super_admin" && (
                <Button size="sm" onClick={() => setTarget(r)}>
                  <Gift className="h-4 w-4 mr-1" /> Coin ber
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Coin berish</DialogTitle>
          </DialogHeader>
          {target && (
            <div className="space-y-3">
              <div className="rounded-lg border p-3 flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={target.avatar_url ?? undefined} />
                  <AvatarFallback>
                    {(target.fullName ?? target.username)[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{target.fullName ?? target.username}</p>
                  <p className="text-xs text-muted-foreground">@{target.username}</p>
                </div>
              </div>
              <div>
                <Label>Coin miqdori</Label>
                <Input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(parseInt(e.target.value || "0"))}
                />
              </div>
              <div>
                <Label>Sabab</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <Button onClick={handleGrant} disabled={grantMutation.isPending} className="w-full">
                {grantMutation.isPending && <TigerPlayer text="" size={24} className="mr-2" />}
                <Trophy className="h-4 w-4 mr-2" /> Yuborish
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

