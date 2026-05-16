import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { AppRole } from "@/lib/auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Trophy, Medal, Award, Loader2, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

type Period = "week" | "month" | "6month" | "year" | "all";

interface Row {
  id: string;
  fullName: string | null;
  username: string;
  avatarUrl: string | null;
  coins: number;
  rank: number;
}

const RANK_STYLES: Record<number, { ring: string; bg: string; icon: any; label: string }> = {
  1: { ring: "ring-yellow-400", bg: "bg-yellow-400/10", icon: Trophy, label: "text-yellow-500" },
  2: { ring: "ring-zinc-300", bg: "bg-zinc-300/10", icon: Medal, label: "text-zinc-400" },
  3: { ring: "ring-amber-600", bg: "bg-amber-600/10", icon: Award, label: "text-amber-600" },
};

export default function Leaderboard({ defaultRole = "student", isGlobal = false }: { defaultRole?: AppRole, isGlobal?: boolean }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("week");
  const [role, setRole] = useState<AppRole>(defaultRole);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const periodMap: Record<Period, string> = {
          week: "weekly",
          month: "monthly",
          "6month": "all_time",
          year: "yearly",
          all: "all_time",
        };
        const res = await api.get<Omit<Row, "rank">[]>(`/leaderboard`, {
          params: { period: periodMap[period], role, isGlobal }
        });
        const ranked = res.data.map((r, i) => ({ ...r, rank: i + 1 }));
        setRows(ranked as Row[]);
      } catch (error) {
        console.error("Leaderboard load error", error);
        setRows([]);
      }
      setLoading(false);
    };
    load();
  }, [period, role, isGlobal]);

  const ROLE_TABS: { v: AppRole; label: string }[] = [
    { v: "student", label: t("roles.student") },
    { v: "user", label: "Mustaqil foydalanuvchilar" },
    { v: "teacher", label: t("roles.teacher") },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 px-2 sm:px-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-500 to-amber-600 grid place-items-center shadow-glow ring-1 ring-yellow-400/40">
          <Trophy className="h-5 w-5 text-white drop-shadow" />
        </div>
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
            {isGlobal ? "Global Peshqadamlar (Mustaqil foydalanuvchilar)" : t("leaderboard.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isGlobal ? "Google orqali kirgan barcha foydalanuvchilar orasida eng yaxshilar" : t("leaderboard.subtitle")}
          </p>
        </div>
      </motion.div>

      {/* Period tabs */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl mx-auto">
          <TabsTrigger value="week">{t("leaderboard.week")}</TabsTrigger>
          <TabsTrigger value="month">{t("leaderboard.month")}</TabsTrigger>
          <TabsTrigger value="6month">{t("leaderboard.halfYear")}</TabsTrigger>
          <TabsTrigger value="year">{t("leaderboard.year")}</TabsTrigger>
          <TabsTrigger value="all">{t("leaderboard.all")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Role chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {ROLE_TABS.map((r) => (
          <button
            key={r.v}
            onClick={() => setRole(r.v)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-smooth hover:-translate-y-0.5",
              role === r.v
                ? "border-primary bg-primary text-primary-foreground shadow-glow"
                : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Podium for top 3 */}
      {!loading && rows.length >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3 md:gap-8 max-w-3xl mx-auto items-end pt-6"
        >
          {[rows[1], rows[0], rows[2]].map((r, idx) => {
            const realRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
            const isFirst = realRank === 1;
            const s = RANK_STYLES[realRank];
            const Icon = s.icon;
            const heights = ["h-32", "h-44", "h-28"];
            const glow = isFirst
              ? "shadow-[0_0_60px_-10px_hsl(45_95%_55%/0.55)]"
              : realRank === 2
              ? "shadow-[0_0_40px_-12px_hsl(0_0%_85%/0.45)]"
              : "shadow-[0_0_40px_-12px_hsl(35_90%_50%/0.45)]";
            return (
              <motion.div
                key={r.id}
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 280, damping: 18 }}
                className="flex flex-col items-center justify-end"
              >
                <div className="flex flex-col items-center mb-2 relative">
                  {isFirst && (
                    <motion.div
                      animate={{ y: [0, -3, 0], rotate: [-4, 4, -4] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute -top-7 text-2xl"
                      aria-hidden
                    >
                      👑
                    </motion.div>
                  )}
                  <div className={cn("rounded-full p-[3px] bg-gradient-to-br", isFirst ? "from-yellow-300 via-amber-500 to-yellow-600" : realRank === 2 ? "from-zinc-200 to-zinc-400" : "from-amber-500 to-amber-700", glow)}>
                    <Avatar className={cn("border-2 border-background", isFirst ? "h-20 w-20 md:h-24 md:w-24" : "h-14 w-14 md:h-16 md:w-16")}>
                      {r.avatarUrl && <AvatarImage src={r.avatarUrl} />}
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold">
                        {(r.fullName || r.username || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <p className="mt-3 font-semibold text-sm text-center line-clamp-1 max-w-[140px]">
                    {r.fullName || r.username}
                  </p>
                  <span className={cn("mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold", s.bg, s.label)}>
                    <Coins className="h-3 w-3" /> {r.coins} XP
                  </span>
                </div>
                <div
                  className={cn(
                    "w-full rounded-t-2xl border-t-2 grid place-items-start pt-3 font-display font-bold text-3xl backdrop-blur-sm",
                    heights[idx],
                    s.bg,
                    s.label,
                    s.ring.replace("ring-", "border-"),
                    glow,
                  )}
                >
                  <div className="w-full text-center">
                    <Icon className={cn("h-6 w-6 inline-block", s.label)} />
                    <div>#{realRank}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* List */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="py-16 grid place-items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">{t("leaderboard.empty")}</div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((r) => {
              const isMe = r.id === user?.id;
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-smooth hover:bg-muted/30",
                    isMe && "bg-primary/5 border-l-4 border-primary",
                  )}
                >
                  <div
                    className={cn(
                      "h-8 w-8 grid place-items-center rounded-full font-bold text-sm",
                      r.rank <= 3
                        ? RANK_STYLES[r.rank].bg + " " + RANK_STYLES[r.rank].label
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {r.rank}
                  </div>
                  <Avatar className="h-9 w-9">
                    {r.avatarUrl && <AvatarImage src={r.avatarUrl} />}
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                      {(r.fullName || r.username || "?").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {r.fullName || r.username}
                      {isMe && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-primary">
                          ({t("leaderboard.you")})
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">@{r.username}</p>
                  </div>
                  <div className="flex items-center gap-1 font-semibold text-sm">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    {r.coins}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
