import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { AppRole } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  RefreshCcw,
  Crown,
  Sparkles,
  ShieldCheck,
  Users,
  User,
  Trophy,
  Star,
  Medal,
  Flame,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "dotlottie-wc": any;
    }
  }
}

type Period = "daily" | "monthly" | "six_months" | "yearly";

interface Row {
  id: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  coins: number;
  rank: number;
}

interface LeaderboardProps {
  defaultRole?: AppRole;
  isGlobal?: boolean;
}

const ALL_ROLE_TABS: { value: AppRole; label: string; icon: LucideIcon; emoji: string }[] = [
  { value: "student", label: "Talabalar",        icon: Users,       emoji: "🎓" },
  { value: "user",    label: "Mustaqil userlar",  icon: Sparkles,    emoji: "✨" },
  { value: "teacher", label: "O'qituvchilar",    icon: ShieldCheck,  emoji: "👨‍🏫" },
];

// left=2nd, center=1st, right=3rd
const PODIUM_ORDER = [1, 0, 2];

const formatCoins = (coins: number) =>
  `${Number(coins || 0).toLocaleString("uz-UZ")} ⭐`;

const getDisplayName = (row?: Row | null) =>
  row?.fullName?.trim() || row?.username?.trim() || "Nomsiz";

const getInitials = (row?: Row | null) => {
  const name = getDisplayName(row);
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
};

const PODIUM_CONFIG = [
  {
    place: 2,
    size: "h-[170px]",
    avatarSize: "h-16 w-16",
    ringColor: "ring-[#60b8f0]",
    badgeBg: "bg-gradient-to-br from-[#60b8f0] to-[#3a9de0]",
    badgeShadow: "shadow-[0_0_12px_rgba(96,184,240,0.6)]",
    cardBg: "bg-gradient-to-b from-[#1e4a6e]/80 to-[#162d45]/90",
    cardBorder: "border-[#60b8f0]/30",
    nameColor: "text-[#60b8f0]",
    icon: "🥈",
    mt: "mt-8",
  },
  {
    place: 1,
    size: "h-[220px]",
    avatarSize: "h-24 w-24",
    ringColor: "ring-[#ffd700]",
    badgeBg: "bg-gradient-to-br from-[#ffd700] to-[#f59e0b]",
    badgeShadow: "shadow-[0_0_20px_rgba(255,215,0,0.7)]",
    cardBg: "bg-gradient-to-b from-[#3d6b1e]/80 to-[#243f12]/90",
    cardBorder: "border-[#ffd700]/40",
    nameColor: "text-[#ffd700]",
    icon: "👑",
    mt: "mt-0",
  },
  {
    place: 3,
    size: "h-[150px]",
    avatarSize: "h-14 w-14",
    ringColor: "ring-[#cd7f32]",
    badgeBg: "bg-gradient-to-br from-[#cd7f32] to-[#a05c1a]",
    badgeShadow: "shadow-[0_0_12px_rgba(205,127,50,0.5)]",
    cardBg: "bg-gradient-to-b from-[#4a2e1a]/80 to-[#2d1c0f]/90",
    cardBorder: "border-[#cd7f32]/30",
    nameColor: "text-[#cd7f32]",
    icon: "🥉",
    mt: "mt-12",
  },
];

// ── Podium Card ────────────────────────────────────────────
function PodiumCard({ row, cfg, isLoading }: { row: Row | null; cfg: typeof PODIUM_CONFIG[number]; isLoading: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: cfg.place * 0.1, duration: 0.4, ease: "easeOut" }}
      className={cn(
        "relative flex flex-col items-center gap-2 rounded-3xl border backdrop-blur-sm px-3 py-4",
        "transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl",
        cfg.size, cfg.cardBg, cfg.cardBorder, cfg.mt
      )}
    >
      {/* Place icon on top */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl select-none drop-shadow-lg">
        {cfg.icon}
      </div>

      {/* Avatar */}
      {isLoading ? (
        <div className={cn("rounded-full bg-white/10 animate-pulse shrink-0", cfg.avatarSize)} />
      ) : row ? (
        <div className="relative">
          <Avatar
            className={cn(
              "ring-4 ring-offset-2 ring-offset-transparent shadow-2xl shrink-0",
              cfg.avatarSize, cfg.ringColor
            )}
          >
            {row.avatarUrl
              ? <AvatarImage src={row.avatarUrl} className="object-cover" />
              : <AvatarFallback className="text-lg font-black bg-white/10 text-white">
                  {getInitials(row)}
                </AvatarFallback>
            }
          </Avatar>
          {/* Rank badge */}
          <div
            className={cn(
              "absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full",
              "text-[11px] font-black text-white border-2 border-black/20",
              cfg.badgeBg, cfg.badgeShadow
            )}
          >
            {cfg.place}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "rounded-full border-2 border-dashed border-white/20 flex items-center justify-center bg-white/5 shrink-0",
            cfg.avatarSize
          )}
        >
          <User className="h-6 w-6 text-white/30" />
        </div>
      )}

      {/* Name & Score */}
      {row ? (
        <div className="flex flex-col items-center gap-0.5 w-full mt-1">
          <p className={cn("text-[11px] sm:text-xs font-black text-center line-clamp-2 leading-tight", cfg.nameColor)}>
            {getDisplayName(row)}
          </p>
          <p className="text-[10px] sm:text-[11px] font-bold text-white/70 text-center">
            {formatCoins(row.coins)}
          </p>
        </div>
      ) : (
        <p className="text-[10px] text-white/20 font-medium mt-1">—</p>
      )}
    </motion.div>
  );
}

// ── Rank Row (all ranks shown in list) ────────────────────
function RankRow({ row, index, isCurrentUser }: { row: Row; index: number; isCurrentUser: boolean }) {
  const { t } = useTranslation();
  // Medal config for top-3
  const medalConfig: Record<number, { icon: string; rankColor: string; rowBg: string; avatarRing: string }> = {
    1: {
      icon: "🥇",
      rankColor: "text-[#ffd700]",
      rowBg: "bg-amber-50/60 dark:bg-amber-900/10",
      avatarRing: "ring-2 ring-[#ffd700]/60",
    },
    2: {
      icon: "🥈",
      rankColor: "text-[#a8c0d6]",
      rowBg: "bg-slate-50/80 dark:bg-slate-800/20",
      avatarRing: "ring-2 ring-[#a8c0d6]/60",
    },
    3: {
      icon: "🥉",
      rankColor: "text-[#cd7f32]",
      rowBg: "bg-orange-50/40 dark:bg-orange-900/10",
      avatarRing: "ring-2 ring-[#cd7f32]/50",
    },
  };

  const medal = medalConfig[row.rank];
  const rankColors: Record<number, string> = {
    4: "text-[#fbbf24]", 5: "text-[#f59e0b]", 6: "text-[#E7C6FF]",
    7: "text-[#60b8f0]", 8: "text-[#a78bfa]", 9: "text-[#f472b6]", 10: "text-[#4ade80]",
  };
  const rankColor = medal?.rankColor ?? rankColors[row.rank] ?? "text-slate-400 dark:text-slate-500";

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.3 }}
      className={cn(
        "flex items-center gap-3 sm:gap-4 px-4 py-3.5 border-b transition-colors last:border-0",
        "border-slate-100 dark:border-white/5",
        medal && !isCurrentUser ? medal.rowBg : "",
        isCurrentUser
          ? "bg-purple-50/80 dark:bg-purple-900/15"
          : !medal ? "hover:bg-slate-50/60 dark:hover:bg-white/[0.03]" : ""
      )}
    >
      {/* Rank badge */}
      <div className={cn(
        "w-10 shrink-0 flex items-center justify-center font-black tabular-nums",
        rankColor
      )}>
        {medal ? (
          <span className="text-xl leading-none select-none">{medal.icon}</span>
        ) : row.rank <= 10 ? (
          <span className="flex items-center gap-0.5 text-sm">
            <Crown className="h-3 w-3" />
            {row.rank}
          </span>
        ) : (
          <span className="text-sm text-slate-400 dark:text-slate-500">{row.rank}</span>
        )}
      </div>

      {/* Avatar */}
      <Avatar className={cn(
        "h-10 w-10 shrink-0 shadow-sm border border-slate-200 dark:border-white/10",
        medal ? medal.avatarRing : ""
      )}>
        {row.avatarUrl && <AvatarImage src={row.avatarUrl} className="object-cover" />}
        <AvatarFallback className={cn(
          "text-[11px] font-bold",
          medal
            ? "text-white bg-slate-600/60"
            : "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800"
        )}>
          {getInitials(row)}
        </AvatarFallback>
      </Avatar>

      {/* Name */}
      <div className="min-w-0 flex-1">
        <p className={cn(
          "truncate text-sm font-bold flex items-center gap-1.5",
          medal ? rankColor : "text-slate-800 dark:text-slate-100"
        )}>
          {getDisplayName(row)}
          {isCurrentUser && (
            <span className="inline-flex items-center rounded-full bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 text-[9px] font-black text-purple-700 dark:text-purple-400 uppercase tracking-wider">
              Siz
            </span>
          )}
        </p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
          @{row.username ?? "—"}
        </p>
      </div>

      {/* Score */}
      <div className="shrink-0 flex flex-col items-end gap-0.5">
        <div className="flex items-center gap-1">
          <Star className={cn("h-3.5 w-3.5 fill-amber-400", medal ? "text-amber-400" : "text-amber-400")} />
          <span className="text-sm font-black text-amber-500 dark:text-amber-400 tabular-nums">
            {Number(row.coins || 0).toLocaleString("uz-UZ")}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{t("dynamic.leaderboard.stars")}</span>
      </div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────
export default function Leaderboard({
  defaultRole = "student", isGlobal = false }: LeaderboardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const PERIODS = useMemo((): { value: Period; label: string; emoji: string }[] => [
    { value: "daily",      label: "Kunlik",   emoji: "☀️" },
    { value: "monthly",    label: t("dynamic.grantcoins.oylik"),    emoji: "📅" },
    { value: "six_months", label: "6 Oylik",  emoji: "🗓️" },
    { value: "yearly",     label: t("dynamic.grantcoins.yillik"),   emoji: "🏆" },
  ], [t]);

  const isRegularUser = user?.role === "user";
  const initialRole: AppRole = isRegularUser ? "user" : defaultRole;

  const [period, setPeriod]   = useState<Period>("daily");
  const [role, setRole]       = useState<AppRole>(initialRole);
  const [rows, setRows]       = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const podiumRows  = useMemo(() => PODIUM_ORDER.map((i) => rows[i] ?? null), [rows]);
  const listRows    = rows.slice(3);
  const currentUser = rows.find((r) => r.id === user?.id);

  const ROLE_TABS = isRegularUser
    ? ALL_ROLE_TABS.filter((t) => t.value === "user")
    : ALL_ROLE_TABS;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any[]>("/leaderboard", {
        params: { period, role, isGlobal },
      });
      const ranked = (res.data || []).map((row: any, idx: number) => ({
        id: row.id,
        // Backend returns SNAKE_CASE due to spring.jackson.property-naming-strategy=SNAKE_CASE
        fullName:  row.fullName  ?? row.full_name  ?? null,
        username:  row.username  ?? null,
        avatarUrl: row.avatarUrl ?? row.avatar_url ?? null,
        coins:     Number(row.coins ?? 0),
        rank:      row.rank || idx + 1,
      })) as Row[];
      setRows(ranked);
    } catch (err: any) {
      console.error("Leaderboard load error", err);
      setRows([]);
      setError("Ma'lumotlar yuklanmadi. Qayta urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  }, [period, role, isGlobal]);

  useEffect(() => { load(); }, [load]);

  // ── Error ──────────────────────────────────────────────────
  if (error && rows.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-5 text-red-500">
          <RefreshCcw className="h-8 w-8" />
        </div>
        <p className="font-semibold text-slate-600 dark:text-slate-300">{error}</p>
        <button
          onClick={load}
          className="rounded-xl bg-[#4ab658] px-6 py-2.5 font-bold text-white hover:bg-[#3d9849] transition-colors"
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  // ── Initial loading ────────────────────────────────────────
  if (loading && rows.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2">
        <div className="h-14 w-14 rounded-full border-4 border-[#4ab658]/30 border-t-[#4ab658] animate-spin" />
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 animate-pulse mt-3">{t("dynamic.mylessons.yuklanmoqda")}</p>
      </div>
    );
  }

  const activePeriodLabel = PERIODS.find((p) => p.value === period)?.label ?? "";

  return (
    <div
      className={cn(
        "w-full pb-10 transition-opacity duration-300 space-y-4",
        loading ? "opacity-50 pointer-events-none" : "opacity-100"
      )}
    >
      {/* ══════════════════════════════════════════════════════════
          HERO SECTION — dark green gradient
      ══════════════════════════════════════════════════════════ */}
      <div className="relative rounded-[28px] overflow-hidden bg-gradient-to-b from-[#1a4d2e] via-[#1f5c36] to-[#16432a] shadow-2xl">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-white/[0.03]" />
          <div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-white/[0.04]" />
          <div className="absolute top-10 right-20 h-24 w-24 rounded-full bg-[#4ab658]/10" />
        </div>

        {/* Title */}
        <div className="pt-8 pb-2 px-6 text-center relative z-10">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Flame className="h-6 w-6 text-amber-400" />
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-lg">{t("dynamic.leaderboardandhistory.peshqadamlar")}</h1>
            <Flame className="h-6 w-6 text-amber-400" />
          </div>
          <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">
            {activePeriodLabel} reytingi
          </p>
        </div>

        {/* ── PODIUM ───────────────────────────────────────────── */}
        <div className="relative z-10 flex items-end justify-center gap-3 sm:gap-5 px-4 sm:px-10 mt-6 min-h-[230px]">
          {podiumRows.map((row, idx) => (
            <div key={row?.id ?? `empty-${idx}`} className="flex-1 max-w-[140px]">
              <PodiumCard
                row={row}
                cfg={PODIUM_CONFIG[idx]}
                isLoading={loading}
              />
            </div>
          ))}
        </div>

        {/* ── PERIOD TABS ──────────────────────────────────────── */}
        <div className="relative z-10 px-4 sm:px-6 pb-1 mt-6">
          <div className="flex w-full rounded-2xl bg-black/20 p-1 gap-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "flex-1 flex flex-col items-center py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-200",
                  period === p.value
                    ? "bg-white/20 text-white shadow-sm scale-[1.03]"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                )}
              >
                <span className="text-base leading-none">{p.emoji}</span>
                <span className="mt-0.5">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── ROLE TABS ────────────────────────────────────────── */}
        {ROLE_TABS.length > 1 && (
          <div className="relative z-10 px-4 sm:px-6 pb-5 mt-2">
            <div className="flex w-full rounded-2xl bg-black/20 p-1 gap-0.5">
              {ROLE_TABS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-200",
                    role === r.value
                      ? "bg-white/20 text-white shadow-sm scale-[1.03]"
                      : "text-white/40 hover:text-white/70 hover:bg-white/5"
                  )}
                >
                  <span>{r.emoji}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {ROLE_TABS.length <= 1 && <div className="pb-5" />}
      </div>

      {/* ══════════════════════════════════════════════════════════
          MY POSITION BAR (if not in top 3)
      ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {currentUser && currentUser.rank > 3 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 mx-0"
          >
            <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border border-purple-200 dark:border-purple-800/40 px-4 py-3 shadow-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 font-black text-sm">
                #{currentUser.rank}
              </div>
              <Avatar className="h-9 w-9 shrink-0 border-2 border-purple-300 dark:border-purple-700">
                {currentUser.avatarUrl && <AvatarImage src={currentUser.avatarUrl} />}
                <AvatarFallback className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/50">
                  {getInitials(currentUser)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800 dark:text-white">
                  {getDisplayName(currentUser)}
                </p>
                <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                  Sizning o'rningiz
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                <span className="text-sm font-black text-amber-500">
                  {Number(currentUser.coins).toLocaleString("uz-UZ")}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════
          LIST (4th place and beyond)
      ══════════════════════════════════════════════════════════ */}
      <div className="mt-3 rounded-2xl bg-white dark:bg-[#111c14] border border-slate-100 dark:border-white/[0.06] shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.02]">
          <Medal className="h-4 w-4 text-[#4ab658]" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            To'liq reyting
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 px-4 text-center">
            <div className="rounded-full bg-slate-50 dark:bg-white/5 p-6 shadow-inner border border-slate-100 dark:border-white/5">
              <Trophy className="h-10 w-10 text-[#4ab658] opacity-70" />
            </div>
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
              Hozircha ma'lumot yo'q
            </h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 max-w-[260px]">
              Faollik ortishi bilan bu yerda ko'rinasiz!
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <div key={`${period}-${role}`}>
              {rows.map((row, i) => (
                <RankRow
                  key={row.id}
                  row={row}
                  index={i}
                  isCurrentUser={row.id === user?.id}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
