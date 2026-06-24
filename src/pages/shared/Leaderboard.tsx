import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
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
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Calendar,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Period = "daily" | "weekly" | "monthly" | "all_time";

interface Row {
  id: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  coins: number;
  rank: number;
  xp: number;
  level: number;
  achievementCount: number;
  testsCompleted: number;
  streak: number;
  joinDate: string;
}

interface CurrentUserStats {
  rank: number;
  coins: number;
  usersAbove: number;
  usersBelow: number;
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

const PODIUM_ORDER = [1, 0, 2]; // index 1 is 1st, index 0 is 2nd, index 2 is 3rd

const formatCoins = (coins: number) =>
  `${Number(coins || 0).toLocaleString("uz-UZ")} 🪙`;

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
    size: "h-[180px]",
    avatarSize: "h-16 w-16",
    ringColor: "ring-[#60b8f0]",
    badgeBg: "bg-gradient-to-br from-[#60b8f0] to-[#3a9de0]",
    badgeShadow: "shadow-[0_0_12px_rgba(96,184,240,0.6)]",
    cardBg: "bg-gradient-to-b from-[#1e4a6e]/90 to-[#102235]/95",
    cardBorder: "border-[#60b8f0]/40",
    nameColor: "text-[#90caf9]",
    icon: "🥈",
    mt: "mt-8",
    glow: "shadow-[0_0_15px_rgba(96,184,240,0.2)]",
  },
  {
    place: 1,
    size: "h-[230px]",
    avatarSize: "h-24 w-24",
    ringColor: "ring-[#ffd700]",
    badgeBg: "bg-gradient-to-br from-[#ffd700] to-[#f59e0b]",
    badgeShadow: "shadow-[0_0_20px_rgba(255,215,0,0.7)]",
    cardBg: "bg-gradient-to-b from-[#3a5d1b]/95 to-[#1c320a]/98",
    cardBorder: "border-[#ffd700]/50",
    nameColor: "text-[#ffe082]",
    icon: "🥇",
    mt: "mt-0",
    glow: "shadow-[0_0_30px_rgba(255,215,0,0.35)]",
  },
  {
    place: 3,
    size: "h-[160px]",
    avatarSize: "h-14 w-14",
    ringColor: "ring-[#cd7f32]",
    badgeBg: "bg-gradient-to-br from-[#cd7f32] to-[#a05c1a]",
    badgeShadow: "shadow-[0_0_12px_rgba(205,127,50,0.5)]",
    cardBg: "bg-gradient-to-b from-[#4e2f18]/90 to-[#27150a]/95",
    cardBorder: "border-[#cd7f32]/40",
    nameColor: "text-[#ffcc80]",
    icon: "🥉",
    mt: "mt-12",
    glow: "shadow-[0_0_15px_rgba(205,127,50,0.15)]",
  },
];

// ── Podium Card Component ────────────────────────────────────────────
function PodiumCard({ row, cfg, isLoading, onClick }: { row: Row | null; cfg: typeof PODIUM_CONFIG[number]; isLoading: boolean; onClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: cfg.place * 0.1, duration: 0.5, ease: "easeOut" }}
      onClick={() => row && onClick()}
      className={cn(
        "relative flex flex-col items-center gap-2 rounded-[24px] border backdrop-blur-md px-3 py-4 cursor-pointer",
        "transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl active:scale-[0.98]",
        cfg.size, cfg.cardBg, cfg.cardBorder, cfg.mt, cfg.glow
      )}
    >
      {/* Crown or Special Element on Rank #1 */}
      {cfg.place === 1 && !isLoading && row && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-3xl select-none animate-bounce" style={{ animationDuration: '3s' }}>
          👑
        </div>
      )}

      {/* Place badge on Top */}
      {cfg.place !== 1 && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl select-none drop-shadow-lg">
          {cfg.icon}
        </div>
      )}

      {/* Avatar */}
      {isLoading ? (
        <div className={cn("rounded-full bg-white/10 animate-pulse shrink-0", cfg.avatarSize)} />
      ) : row ? (
        <div className="relative">
          <Avatar
            className={cn(
              "ring-4 ring-offset-2 ring-offset-transparent shadow-2xl shrink-0 transition-transform duration-300 hover:rotate-6",
              cfg.avatarSize, cfg.ringColor
            )}
          >
            {row.avatarUrl ? (
              <AvatarImage src={row.avatarUrl} className="object-cover" />
            ) : (
              <AvatarFallback className="text-lg font-black bg-slate-700 text-white">
                {getInitials(row)}
              </AvatarFallback>
            )}
          </Avatar>
          
          {/* Rank Badge */}
          <div
            className={cn(
              "absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full",
              "text-[10px] font-black text-white border border-white/20",
              cfg.badgeBg, cfg.badgeShadow
            )}
          >
            {cfg.place}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "rounded-full border-2 border-dashed border-white/10 flex items-center justify-center bg-white/5 shrink-0",
            cfg.avatarSize
          )}
        >
          <User className="h-6 w-6 text-white/20" />
        </div>
      )}

      {/* Profile Name & Coin Info */}
      {row ? (
        <div className="flex flex-col items-center gap-1 w-full mt-2">
          <p className={cn("text-xs font-black text-center line-clamp-1 leading-tight", cfg.nameColor)}>
            {getDisplayName(row)}
          </p>
          <div className="flex items-center gap-0.5 bg-black/30 rounded-full px-2 py-0.5 border border-white/5">
            <span className="text-[10px] font-bold text-amber-400 tabular-nums">
              {formatCoins(row.coins)}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-white/10 font-medium mt-2">—</p>
      )}
    </motion.div>
  );
}

// ── Rank Row Component (List view) ────────────────────
function RankRow({ row, index, isCurrentUser, onClick }: { row: Row; index: number; isCurrentUser: boolean; onClick: () => void }) {
  const { t } = useTranslation();
  
  // Medal mappings for top rows
  const medalConfig: Record<number, { icon: string; rankColor: string; rowBg: string; avatarRing: string }> = {
    1: {
      icon: "🥇",
      rankColor: "text-[#ffd700]",
      rowBg: "bg-amber-500/5 border-amber-500/20",
      avatarRing: "ring-2 ring-[#ffd700]/60",
    },
    2: {
      icon: "🥈",
      rankColor: "text-[#a8c0d6]",
      rowBg: "bg-slate-500/5 border-slate-500/10",
      avatarRing: "ring-2 ring-[#a8c0d6]/60",
    },
    3: {
      icon: "🥉",
      rankColor: "text-[#cd7f32]",
      rowBg: "bg-orange-500/5 border-orange-500/10",
      avatarRing: "ring-2 ring-[#cd7f32]/50",
    },
  };

  const medal = medalConfig[row.rank];
  const rankColors: Record<number, string> = {
    4: "text-[#fbbf24]", 5: "text-[#f59e0b]", 6: "text-[#a78bfa]"
  };
  const rankColor = medal?.rankColor ?? rankColors[row.rank] ?? "text-slate-400 dark:text-slate-500";

  return (
    <motion.div
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 sm:gap-4 px-4 py-3.5 border-b transition-all duration-200 cursor-pointer active:scale-[0.99]",
        "border-slate-100 dark:border-white/[0.04] rounded-xl my-0.5",
        isCurrentUser
          ? "bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/15"
          : medal 
            ? cn("hover:bg-slate-50/80 dark:hover:bg-white/[0.03] border", medal.rowBg)
            : "hover:bg-slate-50/60 dark:hover:bg-white/[0.02] border border-transparent"
      )}
    >
      {/* Rank indicator */}
      <div className={cn(
        "w-8 shrink-0 flex items-center justify-center font-black tabular-nums text-base",
        rankColor
      )}>
        {medal ? (
          <span className="text-xl select-none">{medal.icon}</span>
        ) : (
          <span>{row.rank}</span>
        )}
      </div>

      {/* Avatar */}
      <Avatar className={cn(
        "h-10 w-10 shrink-0 shadow-md border border-slate-200 dark:border-white/10",
        medal ? medal.avatarRing : ""
      )}>
        {row.avatarUrl && <AvatarImage src={row.avatarUrl} className="object-cover" />}
        <AvatarFallback className="text-[11px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800">
          {getInitials(row)}
        </AvatarFallback>
      </Avatar>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          {getDisplayName(row)}
          {isCurrentUser && (
            <span className="inline-flex items-center rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              {t("leaderboardPage.you")}
            </span>
          )}
          {row.streak >= 7 && (
            <span className="inline-flex items-center gap-0.5 text-amber-500 text-xs font-bold" title={`${row.streak} kunlik faollik`}>
              <Flame className="h-3.5 w-3.5 fill-amber-500" />
              {row.streak}
            </span>
          )}
        </p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
          @{row.username ?? "user"} • Level {row.level}
        </p>
      </div>

      {/* Stats right side */}
      <div className="shrink-0 flex items-center gap-3">
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-sm font-black text-amber-500 dark:text-amber-400 tabular-nums">
              {Number(row.coins || 0).toLocaleString("uz-UZ")}
            </span>
          </div>
          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold block">{row.xp} XP</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Profile Popup Modal Component ──────────────────────────────────
function UserProfilePopup({ user, rank, onClose }: { user: Row; rank: number; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-sm rounded-[32px] bg-white dark:bg-[#111c14] border border-slate-200 dark:border-white/10 shadow-2xl p-6 overflow-hidden"
      >
        {/* Background glow effects */}
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-r from-emerald-600 to-teal-700 opacity-20 blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4 text-slate-500 dark:text-slate-400" />
        </button>

        {/* Header Avatar and Names */}
        <div className="flex flex-col items-center text-center mt-4">
          <Avatar className="h-20 w-20 ring-4 ring-emerald-500/40 shadow-xl">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} className="object-cover" />}
            <AvatarFallback className="text-2xl font-black bg-slate-100 dark:bg-slate-800 text-slate-500">
              {getInitials(user)}
            </AvatarFallback>
          </Avatar>

          <h3 className="text-lg font-black text-slate-800 dark:text-white mt-3">
            {getDisplayName(user)}
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
            @{user.username ?? "user"}
          </p>

          <div className="flex gap-2 mt-4">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
              Level {user.level}
            </span>
            {user.streak >= 3 && (
              <span className="px-3 py-1 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[10px] font-black uppercase tracking-wider border border-orange-500/20 flex items-center gap-0.5">
                <Flame className="h-3 w-3 fill-orange-500 text-orange-500" />
                {t("leaderboardPage.activeDays", { count: user.streak })}
              </span>
            )}
          </div>
        </div>

        {/* User Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mt-6 border-t border-slate-100 dark:border-white/5 pt-5">
          <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-white/[0.02] p-3 rounded-2xl border border-slate-100 dark:border-white/5">
            <Trophy className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">{t("leaderboardPage.rank")}</p>
              <p className="text-sm font-black text-slate-700 dark:text-white">#{rank}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-white/[0.02] p-3 rounded-2xl border border-slate-100 dark:border-white/5">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">{t("leaderboardPage.coins")}</p>
              <p className="text-sm font-black text-slate-700 dark:text-white">{Number(user.coins).toLocaleString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-white/[0.02] p-3 rounded-2xl border border-slate-100 dark:border-white/5">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">{t("leaderboardPage.xp")}</p>
              <p className="text-sm font-black text-slate-700 dark:text-white">{user.xp} XP</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-white/[0.02] p-3 rounded-2xl border border-slate-100 dark:border-white/5">
            <Medal className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">{t("leaderboardPage.achievements")}</p>
              <p className="text-sm font-black text-slate-700 dark:text-white">{user.achievementCount}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between bg-slate-50 dark:bg-white/[0.02] px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">{t("leaderboardPage.joinDate")}</span>
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-white">{user.joinDate}</span>
        </div>

        <div className="mt-1 flex items-center justify-between bg-slate-50 dark:bg-white/[0.02] px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">{t("leaderboardPage.completedTests")}</span>
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-white">{t("leaderboardPage.testsCount", { count: user.testsCompleted })}</span>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Leaderboard Component ─────────────────────────────────────────
export default function Leaderboard({ defaultRole = "student", isGlobal = false }: LeaderboardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const PERIODS = useMemo((): { value: Period; label: string; emoji: string }[] => [
    { value: "daily",    label: t("leaderboardPage.daily"),     emoji: "☀️" },
    { value: "weekly",   label: t("leaderboardPage.weekly"),    emoji: "📅" },
    { value: "monthly",  label: t("leaderboardPage.monthly"),   emoji: "🗓️" },
    { value: "all_time", label: t("leaderboardPage.allTime"),   emoji: "🏆" },
  ], [t]);

  const isRegularUser = user?.role === "user";
  const initialRole: AppRole = isRegularUser ? "user" : defaultRole;

  const [period, setPeriod]   = useState<Period>("all_time");
  const [role, setRole]       = useState<AppRole>(initialRole);
  const [rows, setRows]       = useState<Row[]>([]);
  const [currentUserStats, setCurrentUserStats] = useState<CurrentUserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const activePeriodRatingLabel = useMemo(() => {
    switch (period) {
      case "daily": return t("leaderboardPage.dailyRating");
      case "weekly": return t("leaderboardPage.weeklyRating");
      case "monthly": return t("leaderboardPage.monthlyRating");
      case "all_time": return t("leaderboardPage.allTimeRating");
      default: return "";
    }
  }, [period, t]);
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const PAGE_SIZE = 50;

  // Selected profile state for popup
  const [selectedUser, setSelectedUser] = useState<Row | null>(null);

  const podiumRows  = useMemo(() => PODIUM_ORDER.map((i) => rows[i] ?? null), [rows]);
  const listRows    = useMemo(() => rows.slice(3), [rows]);

  const ROLE_TABS = useMemo(() => {
    const allTabs = [
      { value: "student" as AppRole, label: t("leaderboardPage.students"),     icon: Users,       emoji: "🎓" },
      { value: "user" as AppRole,    label: t("leaderboardPage.regularUsers"), icon: Sparkles,    emoji: "✨" },
      { value: "teacher" as AppRole, label: t("leaderboardPage.teachers"),     icon: ShieldCheck,  emoji: "👨‍🏫" },
    ];
    return isRegularUser ? allTabs.filter((t) => t.value === "user") : allTabs;
  }, [isRegularUser, t]);

  const load = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ users: any[]; currentUserStats: any; totalPages: number; totalElements: number }>("/leaderboard", {
        params: { period, role, isGlobal, page, size: PAGE_SIZE },
      });
      
      const payload = res.data;
      const mapped = (payload.users || []).map((row: any, idx: number) => ({
        id: row.id,
        fullName:  row.fullName  ?? row.full_name  ?? null,
        username:  row.username  ?? null,
        avatarUrl: row.avatarUrl ?? row.avatar_url ?? null,
        coins:     Number(row.coins ?? 0),
        xp:        Number(row.xp ?? 0),
        level:     Number(row.level ?? 1),
        achievementCount: Number(row.achievementCount ?? row.achievement_count ?? 0),
        testsCompleted: Number(row.testsCompleted ?? row.tests_completed ?? 0),
        streak:    Number(row.streak ?? 3),
        joinDate:  row.joinDate ?? row.join_date ?? "—",
        rank:      row.rank || (page * PAGE_SIZE) + idx + 1,
      })) as Row[];

      setRows(mapped);
      setTotalPages(payload.totalPages || 1);
      setTotalElements(payload.totalElements || 0);

      if (payload.currentUserStats) {
        setCurrentUserStats({
          rank: payload.currentUserStats.rank,
          coins: payload.currentUserStats.coins,
          usersAbove: payload.currentUserStats.usersAbove,
          usersBelow: payload.currentUserStats.usersBelow,
        });
      }
    } catch (err: any) {
      console.error("Leaderboard load error", err);
      setError(t("leaderboardPage.errorLoading"));
    } finally {
      setLoading(false);
    }
  }, [period, role, isGlobal, page]);

  useEffect(() => {
    load(true);
  }, [load]);

  // Automatic updates loop (every 15 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      load(false); // background fetch without showing skeleton/spinner to preserve active state
    }, 15000);
    return () => clearInterval(timer);
  }, [load]);

  const activePeriodLabel = PERIODS.find((p) => p.value === period)?.label ?? "";

  return (
    <div className="w-full pb-24 transition-all duration-300 space-y-4">
      {/* ══════════════════════════════════════════════════════════
          HERO / PODIUM CARD BLOCK
      ══════════════════════════════════════════════════════════ */}
      <div className="relative rounded-[28px] overflow-hidden bg-gradient-to-b from-[#162a1c] via-[#0f2415] to-[#0a180e] border border-emerald-500/10 shadow-2xl p-6">
        {/* Glowing background shapes */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-emerald-500/[0.03] blur-3xl animate-pulse" />
          <div className="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-teal-500/[0.04] blur-2xl" />
        </div>

        {/* Hero Title */}
        <div className="text-center relative z-10 py-2">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Flame className="h-7 w-7 text-amber-500 animate-pulse" />
            <h1 className="text-3xl font-black text-white tracking-tight bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300 drop-shadow-md">
              {t("leaderboardPage.title")}
            </h1>
            <Flame className="h-7 w-7 text-amber-500 animate-pulse" />
          </div>
          <p className="text-emerald-500/70 text-[10px] font-black uppercase tracking-widest">
            {activePeriodRatingLabel}
          </p>
        </div>

        {/* ── PODIUM DISPLAY ───────────────────────────────────────────── */}
        <div className="relative z-10 flex items-end justify-center gap-3 sm:gap-6 px-2 sm:px-6 mt-8 min-h-[250px]">
          {podiumRows.map((row, idx) => {
            const config = PODIUM_CONFIG[idx];
            return (
              <div key={row?.id ?? `empty-${idx}`} className="flex-1 max-w-[130px] sm:max-w-[160px]">
                <PodiumCard
                  row={row}
                  cfg={config}
                  isLoading={loading}
                  onClick={() => row && setSelectedUser(row)}
                />
              </div>
            );
          })}
        </div>

        {/* ── PERIOD FILTERS ──────────────────────────────────────── */}
        <div className="relative z-10 mt-8">
          <div className="flex w-full rounded-2xl bg-black/45 p-1 border border-white/5 gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => { setPeriod(p.value); setPage(0); }}
                className={cn(
                  "flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-200",
                  period === p.value
                    ? "bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)] scale-[1.02]"
                    : "text-white/40 hover:text-white/80 hover:bg-white/5"
                )}
              >
                <span className="text-sm leading-none">{p.emoji}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── ROLE SELECTORS ────────────────────────────────────────── */}
        {ROLE_TABS.length > 1 && (
          <div className="relative z-10 mt-3">
            <div className="flex w-full rounded-2xl bg-black/45 p-1 border border-white/5 gap-1">
              {ROLE_TABS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => { setRole(r.value); setPage(0); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-200",
                    role === r.value
                      ? "bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)] scale-[1.02]"
                      : "text-white/40 hover:text-white/80 hover:bg-white/5"
                  )}
                >
                  <span>{r.emoji}</span>
                  <span>{r.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          CURRENT USER STICKY POSITION BAR
      ══════════════════════════════════════════════════════════ */}
      {currentUserStats && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-4 z-40 mx-auto w-full"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-3xl bg-gradient-to-r from-purple-900/90 to-indigo-950/90 backdrop-blur-md border border-purple-500/40 p-4 shadow-2xl">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-400 font-black text-lg border border-purple-500/30">
                #{currentUserStats.rank}
              </div>
              <Avatar className="h-10 w-10 shrink-0 border-2 border-purple-400">
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                <AvatarFallback className="text-xs font-black text-purple-200 bg-purple-950">
                  {user?.fullName?.substring(0, 2).toUpperCase() || "ME"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">
                  {user?.fullName || user?.username || "Siz"}
                </p>
                <p className="text-[10px] font-black text-purple-300 uppercase tracking-widest">
                  {t("leaderboardPage.yourPosition")}
                </p>
              </div>
            </div>

            {/* Position Details */}
            <div className="flex items-center gap-4 sm:gap-6 justify-between w-full sm:w-auto border-t border-purple-500/20 pt-2 sm:pt-0 sm:border-0">
              <div className="text-center sm:text-right">
                <p className="text-[9px] text-purple-300 font-black uppercase">{t("leaderboardPage.above")}</p>
                <p className="text-sm font-black text-purple-200">{t("leaderboardPage.aboveCount", { count: currentUserStats.usersAbove })}</p>
              </div>
              <div className="text-center sm:text-right">
                <p className="text-[9px] text-purple-300 font-black uppercase">{t("leaderboardPage.below")}</p>
                <p className="text-sm font-black text-purple-200">{t("leaderboardPage.belowCount", { count: currentUserStats.usersBelow })}</p>
              </div>
              <div className="flex items-center gap-1.5 bg-black/40 rounded-2xl px-3 py-1.5 border border-purple-500/30">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-black text-amber-400 tabular-nums">
                  {Number(currentUserStats.coins).toLocaleString("uz-UZ")}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════════════
          FULL RANKING LISTING
      ══════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl bg-white dark:bg-[#111c14] border border-slate-100 dark:border-white/[0.05] shadow-xl overflow-hidden p-2 sm:p-4">
        {/* Section Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-white/[0.05] bg-slate-50/50 dark:bg-white/[0.01] rounded-t-xl">
          <div className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-emerald-500" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {t("leaderboardPage.fullRanking")}
            </span>
          </div>
          {totalElements > 0 && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase">
              {t("leaderboardPage.totalUsers", { count: totalElements })}
            </span>
          )}
        </div>

        {/* Content Render */}
        {loading && rows.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="h-10 w-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
            <p className="text-xs text-slate-400 font-semibold animate-pulse">{t("leaderboardPage.loading")}</p>
          </div>
        ) : error && rows.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">{error}</p>
            <button
              onClick={() => load(true)}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all"
            >
              {t("leaderboardPage.tryAgain")}
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 px-4 text-center">
            <div className="rounded-full bg-slate-50 dark:bg-white/5 p-6 border border-slate-100 dark:border-white/5 shadow-inner">
              <Trophy className="h-12 w-12 text-emerald-500/60" />
            </div>
            <h3 className="text-base font-black text-slate-700 dark:text-slate-200">{t("leaderboardPage.noDataTitle")}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[260px]">
              {t("leaderboardPage.noDataDesc")}
            </p>
          </div>
        ) : (
          <div>
            <AnimatePresence mode="wait">
              <div key={`${period}-${role}-${page}`} className="divide-y divide-slate-50 dark:divide-white/[0.02]">
                {rows.map((row, i) => (
                  <RankRow
                    key={row.id}
                    row={row}
                    index={i}
                    isCurrentUser={row.id === user?.id}
                    onClick={() => setSelectedUser(row)}
                  />
                ))}
              </div>
            </AnimatePresence>

            {/* Pagination Actions */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/[0.05] pt-4 mt-2 px-3">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t("leaderboardPage.previous")}
                </button>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold">
                  {t("leaderboardPage.page")} {page + 1} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                >
                  {t("leaderboardPage.next")}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── POPUP DETAIL DIALOG ───────────────────────────────────────── */}
      <AnimatePresence>
        {selectedUser && (
          <UserProfilePopup
            user={selectedUser}
            rank={selectedUser.rank}
            onClose={() => setSelectedUser(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
