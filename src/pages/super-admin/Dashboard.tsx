import { motion } from "framer-motion";
import {
  Building2,
  Users,
  GraduationCap,
  UserCog,
  TrendingUp,
  ArrowUpRight,
  Activity,
  Server,
  Zap,
  RefreshCw,
  Heart,
  Users2,
  Wallet,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  organizations: number;
  totalUsers: number;
  teachers: number;
  students: number;
  admins: number;
  administrators: number;
  users: number;
  parents: number;
  groups: number;
  totalRevenue: number;
}

interface MonthPoint {
  month: string;
  users: number;
}

interface OrgPoint {
  name: string;
  users: number;
}

const MONTH_LABELS = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];

import { useSuperAdminDashboard } from "@/hooks/useOptimizedQueries";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { toast } from "sonner";

export default function SuperAdminDashboard() {
  const qc = useQueryClient();
  const { data, isLoading } = useSuperAdminDashboard();

  const rawStats = data?.stats || {};
  const stats = {
    organizations: rawStats.organizations || 0,
    totalUsers: rawStats.totalUsers ?? rawStats.total_users ?? 0,
    teachers: rawStats.teachers || 0,
    students: rawStats.students || 0,
    admins: rawStats.admins || 0,
    administrators: rawStats.administrators || 0,
    users: rawStats.users || 0,
    parents: rawStats.parents || 0,
    groups: rawStats.groups || 0,
    totalRevenue: rawStats.totalRevenue ?? rawStats.total_revenue ?? 0,
  };
  const growth = data?.growth ?? [];
  const topOrgs = data?.topOrgs ?? [];
  const recentActivity = data?.recentActivity ?? [];
  const loading = isLoading;

  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ["system-health"],
    queryFn: async () => {
      const res = await api.get("/admin/system/health");
      return res.data;
    },
    refetchInterval: 30000,
  });

  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      await api.post("/admin/system/clear-cache");
    },
    onSuccess: () => {
      toast.success("Tizim keshi tozalandi va yangilandi!");
      qc.invalidateQueries({ queryKey: ["super-admin-dashboard-stats"] });
    },
    onError: () => {
      toast.error("Xatolik yuz berdi");
    }
  });

  const cards = [
    { label: "Jami tushum", value: stats.totalRevenue.toLocaleString() + " UZS", icon: Wallet, accent: "from-amber-500 to-yellow-500" },
    { label: "Tashkilotlar", value: stats.organizations, icon: Building2, accent: "from-primary to-primary-glow" },
    { label: "Jami foydalanuvchilar", value: stats.totalUsers, icon: Users, accent: "from-secondary to-secondary-glow" },
    { label: "O'qituvchilar", value: stats.teachers, icon: GraduationCap, accent: "from-accent to-accent" },
    { label: "Talabalar", value: stats.students, icon: Users, accent: "from-primary to-secondary" },
    { label: "Adminlar", value: stats.admins, icon: UserCog, accent: "from-secondary to-accent" },
    { label: "Administratorlar", value: stats.administrators, icon: UserCog, accent: "from-primary to-accent" },
    { label: "Ota-onalar", value: stats.parents, icon: Heart, accent: "from-pink-500 to-rose-500" },
    { label: "Guruhlar", value: stats.groups, icon: Users2, accent: "from-emerald-400 to-teal-500" },
    { label: "Oddiy Userlar", value: stats.users, icon: Users, accent: "from-blue-500 to-cyan-500" },
  ];

  const roleDistribution = [
    { name: "Talabalar", value: stats.students, color: "hsl(var(--primary))" },
    { name: "O'qituvchilar", value: stats.teachers, color: "hsl(var(--secondary))" },
    { name: "Adminlar", value: stats.admins, color: "hsl(var(--accent))" },
    { name: "Administratorlar", value: stats.administrators, color: "hsl(var(--warning))" },
    { name: "Ota-onalar", value: stats.parents, color: "#ec4899" },
    { name: "Userlar", value: stats.users, color: "#3b82f6" },
  ].filter((r) => r.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Tizim bo'yicha real-time statistika</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-2xl p-4 md:p-5 hover:border-primary/40 transition-smooth flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className={`h-9 w-9 md:h-10 md:w-10 rounded-xl bg-gradient-to-br ${c.accent} grid place-items-center shadow-glow`}>
                  <c.icon className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
                </div>
                <span className="text-[10px] md:text-xs text-success flex items-center gap-0.5">
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </div>
              <p className="mt-3 md:mt-4 text-[10px] md:text-xs uppercase tracking-wider text-slate-600 dark:text-muted-foreground line-clamp-1">{c.label}</p>
            </div>
            {loading ? (
              <div className="mt-1 space-y-1">
                <Skeleton className="h-8 w-2/3" />
              </div>
            ) : (
              <p className="font-display text-2xl md:text-3xl font-bold mt-1">{c.value}</p>
            )}
          </motion.div>
        ))}

        {/* Server Health Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: cards.length * 0.05 }}
          className="glass rounded-2xl p-4 md:p-5 hover:border-emerald-500/40 transition-smooth flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between">
              <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-gradient-premium grid place-items-center shadow-glow-emerald">
                <Server className="h-4 w-4 md:h-5 md:w-5 text-white" />
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Online</span>
              </div>
            </div>
            <p className="mt-3 md:mt-4 text-[10px] md:text-xs uppercase tracking-wider text-slate-600 dark:text-muted-foreground line-clamp-1">Server holati</p>
          </div>
          {healthLoading ? (
            <Skeleton className="h-8 w-2/3 mt-1" />
          ) : (
            <p className="font-mono text-sm md:text-base font-bold mt-1 text-foreground/80">
              UP: {healthData?.uptime || "N/A"}
            </p>
          )}
        </motion.div>

        {/* Active Sessions Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: (cards.length + 1) * 0.05 }}
          className="glass rounded-2xl p-4 md:p-5 hover:border-emerald-500/40 transition-smooth flex flex-col justify-between relative overflow-hidden"
        >
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
          <div>
            <div className="flex items-start justify-between">
              <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-gradient-premium grid place-items-center shadow-glow-emerald">
                <Zap className="h-4 w-4 md:h-5 md:w-5 text-white" />
              </div>
            </div>
            <p className="mt-3 md:mt-4 text-[10px] md:text-xs uppercase tracking-wider text-slate-600 dark:text-muted-foreground line-clamp-1">Hozir Onlayn</p>
          </div>
          {healthLoading ? (
            <Skeleton className="h-8 w-1/3 mt-1" />
          ) : (
            <div className="flex items-baseline gap-1 mt-1">
              <p className="font-display text-2xl md:text-3xl font-bold text-emerald-500">{healthData?.activeSessions || 0}</p>
              <span className="text-[10px] font-semibold text-muted-foreground">kishi</span>
            </div>
          )}
        </motion.div>

        {/* Quick Action Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: (cards.length + 2) * 0.05 }}
          className="glass rounded-2xl p-4 md:p-5 hover:border-emerald-500/40 transition-smooth flex flex-col items-center justify-center cursor-pointer group"
          onClick={() => clearCacheMutation.mutate()}
        >
          <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors mb-2">
            <RefreshCw className={`h-5 w-5 text-emerald-500 ${clearCacheMutation.isPending ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          </div>
          <p className="text-xs md:text-sm font-bold text-center">Tizimni<br/>yangilash</p>
          <p className="text-[9px] text-muted-foreground mt-1 text-center">Keshni tozalash</p>
        </motion.div>

      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg font-semibold">O'sish dinamikasi</h3>
              <p className="text-xs text-muted-foreground">Foydalanuvchilarning kumulativ soni (oxirgi 6 oy)</p>
            </div>
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          {loading ? (
            <div className="h-[280px] w-full flex flex-col gap-2">
              <div className="flex-1 w-full bg-muted/10 rounded-xl animate-pulse" />
              <div className="h-4 w-full flex justify-between gap-4">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={growth}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} height={30} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} width={40} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                  }}
                />
                <Area type="monotone" dataKey="users" stroke="hsl(var(--primary))" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass rounded-2xl p-6">
          <h3 className="font-display text-lg font-semibold mb-4">Rollar taqsimoti</h3>
          {loading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : roleDistribution.length === 0 ? (
            <div className="h-[280px] grid place-items-center text-sm text-muted-foreground">
              Ma'lumot yo'q
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={roleDistribution}
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {roleDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="hsl(var(--background))" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <h3 className="font-display text-lg font-semibold mb-4">Top tashkilotlar</h3>
          {loading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : topOrgs.length === 0 ? (
            <div className="h-[260px] grid place-items-center text-sm text-muted-foreground">
              Tashkilotlarda hali foydalanuvchilar yo'q
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topOrgs} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} height={30} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="users" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold">So'nggi faollik</h3>
            <Activity className="h-4 w-4 text-primary" />
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Hali faollik yo'q</p>
          ) : (
            <ul className="space-y-2.5">
              {recentActivity.map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span className="font-mono text-xs text-primary truncate">{a.action}</span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-auto">
                    @{a.actor}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
