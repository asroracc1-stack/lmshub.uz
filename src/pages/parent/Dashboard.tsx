import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TigerPlayer from "@/components/TigerPlayer";
import {
  Heart, Users, Coins, Award, CalendarCheck2,
  ChevronDown, TrendingUp, BookOpen, Star,
} from "lucide-react";

interface Child {
  id: string;
  fullName: string | null;
  username: string;
  avatarUrl: string | null;
  coins: number;
}

interface GradeItem {
  score: number;
  maxScore: number;
  subjectName?: string;
  lesson?: { title?: string };
}

interface AttItem {
  status: string;
}

const GRADIENT_BY_IDX = [
  "from-rose-500 to-pink-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
];

export default function ParentDashboard() {
  const { user, profile } = useAuth();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ─── Fetch children ────────────────────────────────────────────────────────
  const { data: children = [], isLoading: childrenLoading } = useQuery<Child[]>({
    queryKey: ["parent-children", user?.id],
    queryFn: async () => {
      const { data } = await api.get("/admin/parents/my-children");
      return data;
    },
    staleTime: 60_000,
    enabled: !!user,
  });

  const activeChild = selectedChildId
    ? children.find(c => c.id === selectedChildId) ?? children[0]
    : children[0];

  // ─── Fetch grades for active child ────────────────────────────────────────
  const { data: grades = [], isLoading: gradesLoading } = useQuery<GradeItem[]>({
    queryKey: ["child-grades", activeChild?.id],
    queryFn: async () => {
      const { data } = await api.get(`/parent/children/${activeChild!.id}/grades`);
      return Array.isArray(data) ? data : (data.content ?? []);
    },
    enabled: !!activeChild?.id,
    staleTime: 60_000,
  });

  // ─── Fetch attendance for active child ────────────────────────────────────
  const { data: attendance = [] } = useQuery<AttItem[]>({
    queryKey: ["child-attendance", activeChild?.id],
    queryFn: async () => {
      const { data } = await api.get(`/parent/children/${activeChild!.id}/attendance`);
      return Array.isArray(data) ? data : (data.content ?? []);
    },
    enabled: !!activeChild?.id,
    staleTime: 60_000,
  });

  // ─── Computed stats ────────────────────────────────────────────────────────
  const avgGrade = grades.length
    ? Math.round(grades.reduce((s, g) => s + (g.score / Math.max(1, g.maxScore)) * 100, 0) / grades.length)
    : null;

  const attendanceRate = attendance.length
    ? Math.round((attendance.filter(a => a.status === "PRESENT").length / attendance.length) * 100)
    : null;

  if (childrenLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <TigerPlayer text="Farzandlar ma'lumoti yuklanmoqda..." size={200} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative overflow-hidden rounded-2xl p-6
                        bg-gradient-to-br from-rose-500 via-pink-500 to-purple-600 text-white shadow-xl">
          {/* Decorative blobs */}
          <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full
                          bg-white/10 blur-2xl" />
          <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full
                          bg-white/10 blur-2xl" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-white/20 backdrop-blur-sm
                            grid place-items-center ring-2 ring-white/30">
              <Heart className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">
                Xush kelibsiz, {profile?.full_name || profile?.username || "Ota-ona"} 👋
              </h1>
              <p className="text-white/80 text-sm mt-0.5">
                {children.length > 0
                  ? `${children.length} ta farzandingizni kuzatib boring`
                  : "Hozircha farzand bog'lanmagan"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── No children ────────────────────────────────────────────────── */}
      {children.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200 dark:border-white/10">
          <Users className="h-14 w-14 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Farzandlar hali bog'lanmagan
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Administrator yoki tizim boshqaruvchisiga murojaat qiling
          </p>
        </Card>
      ) : (
        <>
          {/* ─── Child selector ─────────────────────────────────────────── */}
          {children.length > 1 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="relative">
              <button
                onClick={() => setDropdownOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl
                           glass border border-slate-200 dark:border-white/10
                           text-slate-900 dark:text-white font-medium hover:bg-slate-50
                           dark:hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg bg-gradient-to-br
                                  ${GRADIENT_BY_IDX[children.indexOf(activeChild!) % 4] || "from-pink-500 to-rose-600"}
                                  grid place-items-center text-white font-bold text-sm`}>
                    {(activeChild?.fullName || activeChild?.username || "?")[0].toUpperCase()}
                  </div>
                  <span>{activeChild?.fullName || activeChild?.username}</span>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-200
                                        ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    className="absolute top-full mt-2 left-0 right-0 z-20 rounded-xl overflow-hidden
                               glass border border-slate-200 dark:border-white/10 shadow-xl"
                  >
                    {children.map((c, idx) => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedChildId(c.id); setDropdownOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left
                                   hover:bg-slate-100 dark:hover:bg-white/5 transition-colors
                                   ${c.id === activeChild?.id ? "bg-primary/10" : ""}`}
                      >
                        <div className={`h-8 w-8 rounded-lg bg-gradient-to-br
                                        ${GRADIENT_BY_IDX[idx % 4]}
                                        grid place-items-center text-white font-bold text-sm`}>
                          {(c.fullName || c.username || "?")[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white text-sm">
                          {c.fullName || c.username}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ─── Stats grid ─────────────────────────────────────────────── */}
          <motion.div
            key={activeChild?.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <StatCard
              icon={Coins}
              label="Coinlar"
              value={activeChild?.coins ?? 0}
              suffix=""
              color="text-amber-500"
              bg="bg-amber-500/10"
              border="border-amber-500/20"
            />
            <StatCard
              icon={Award}
              label="O'rtacha baho"
              value={avgGrade !== null ? avgGrade : "—"}
              suffix={avgGrade !== null ? "%" : ""}
              color="text-emerald-500"
              bg="bg-emerald-500/10"
              border="border-emerald-500/20"
              loading={gradesLoading}
            />
            <StatCard
              icon={CalendarCheck2}
              label="Davomat"
              value={attendanceRate !== null ? attendanceRate : "—"}
              suffix={attendanceRate !== null ? "%" : ""}
              color="text-violet-500"
              bg="bg-violet-500/10"
              border="border-violet-500/20"
            />
            <StatCard
              icon={BookOpen}
              label="Baholar soni"
              value={grades.length}
              suffix=" ta"
              color="text-blue-500"
              bg="bg-blue-500/10"
              border="border-blue-500/20"
            />
          </motion.div>

          {/* ─── Latest grades ───────────────────────────────────────────── */}
          {grades.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-5 w-5 text-amber-500" />
                <h2 className="font-bold text-slate-900 dark:text-white">
                  So'nggi baholar
                </h2>
              </div>
              <div className="space-y-2">
                {grades.slice(0, 5).map((g, i) => {
                  const pct = Math.round((g.score / Math.max(1, g.maxScore)) * 100);
                  const color = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-rose-500";
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                          {g.lesson?.title || g.subjectName || `Baho ${i + 1}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-24 h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: i * 0.05 + 0.2, duration: 0.5 }}
                            className={`h-full rounded-full ${color}`}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-12 text-right">
                          {g.score}/{g.maxScore}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ─── Attendance trend ─────────────────────────────────────────── */}
          {attendance.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                <h2 className="font-bold text-slate-900 dark:text-white">Davomat holati</h2>
                <Badge className={`ml-auto text-xs ${
                  (attendanceRate ?? 0) >= 80
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20"
                }`}>
                  {attendanceRate}% davomat
                </Badge>
              </div>
              <div className="flex gap-1 flex-wrap">
                {attendance.slice(-30).map((a, i) => (
                  <div
                    key={i}
                    title={a.status}
                    className={`h-5 w-5 rounded-sm ${
                      a.status === "PRESENT"
                        ? "bg-emerald-500"
                        : a.status === "LATE"
                        ? "bg-amber-400"
                        : "bg-rose-400"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-sm bg-emerald-500 inline-block" /> Keldi
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-sm bg-amber-400 inline-block" /> Kech
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-sm bg-rose-400 inline-block" /> Kelmadi
                </span>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Stat Card Component ─────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, suffix = "", color, bg, border, loading = false,
}: {
  icon: any; label: string; value: string | number; suffix?: string;
  color: string; bg: string; border: string; loading?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass rounded-xl p-4 border ${border}`}
    >
      <div className={`h-10 w-10 rounded-xl ${bg} grid place-items-center mb-3`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      {loading ? (
        <div className="h-7 w-16 rounded-lg bg-slate-200 dark:bg-white/10 animate-pulse mb-1" />
      ) : (
        <p className={`text-2xl font-bold ${color}`}>
          {value}{suffix}
        </p>
      )}
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
    </motion.div>
  );
}
