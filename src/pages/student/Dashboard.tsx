import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Calendar as CalendarIcon,
  Coins,
  Award,
  Users2,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import RoleDashboard from "@/components/RoleDashboard";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useStudentDashboard } from "@/hooks/useOptimizedQueries";
import WelcomeBanner from "@/components/shared/WelcomeBanner";

// ─── Yordamchi: sanani "30-may, 2026" formatga o'tkazish ──────────────────
function formatExamDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("uz-UZ", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── Yordamchi: UZS summani formatlash ────────────────────────────────────
// pendingBalance backend dan Double (number) kabi keladi
function formatUZS(amount: number | null | undefined): string {
  if (amount == null || amount === 0) return "0 so'm";
  // Math.round — floatingpoint artefaktlaridan tozalash (masalan: 9000000.000001)
  return new Intl.NumberFormat("uz-UZ").format(Math.round(amount)) + " so'm";
}

// ─── Skeleton karta komponenti ─────────────────────────────────────────────
function StatCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-28 rounded" />
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-20 rounded" />
    </div>
  );
}

// ─── Skeleton grid (6 ta karta) ────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ─── Asosiy komponent ──────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { data, isLoading, isError } = useStudentDashboard();
  const [prevCoins, setPrevCoins] = useState<number | null>(null);
  const [showExplosion, setShowExplosion] = useState(false);

  // Coin yutganda confetti effekti
  useEffect(() => {
    if (data?.coins !== undefined) {
      if (prevCoins !== null && data.coins > prevCoins) {
        setShowExplosion(true);
        toast.success(
          `Tabriklaymiz! Sizga ${data.coins - prevCoins} ta coin sovg'a qilindi! 🪙✨`,
          {
            description: "SuperAdmin tomonidan rag'batlantirildingiz.",
            duration: 5000,
          }
        );
        setTimeout(() => setShowExplosion(false), 3000);
      }
      setPrevCoins(data.coins);
    }
  }, [data?.coins]);

  // ── Yuklanish holati ────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <WelcomeBanner />
        <div className="space-y-4 p-6">
          <div className="space-y-1">
            <Skeleton className="h-6 w-40 rounded" />
            <Skeleton className="h-3 w-64 rounded" />
          </div>
          <DashboardSkeleton />
        </div>
      </>
    );
  }

  // ── Xatolik holati ──────────────────────────────────────────────────────
  if (isError) {
    return (
      <>
        <WelcomeBanner />
        <div className="p-6">
          <Card className="p-6 text-center text-muted-foreground">
            <p className="text-sm">
              Ma'lumotlarni yuklashda xatolik yuz berdi. Sahifani yangilang.
            </p>
          </Card>
        </div>
      </>
    );
  }

  // ── Band Score ko'rinishi ───────────────────────────────────────────────
  const bandScoreDisplay =
    data?.averageBandScore != null
      ? data.averageBandScore.toFixed(1)
      : "—";

  // ── Keyingi imtihon ko'rinishi ──────────────────────────────────────────
  const nextExamDisplay = formatExamDate(data?.nextExamDate);

  // ── Statistika kartalari ────────────────────────────────────────────────
  const stats = [
    {
      label: "Guruhlarim",
      value: data?.myGroupsCount ?? 0,
      icon: Users2,
      color: "primary" as const,
    },
    {
      label: "Topshirilgan Mocklar",
      value: data?.mockExamsCount ?? 0,
      icon: GraduationCap,
      color: "primary" as const,
    },
    {
      label: "O'rtacha Band Score",
      value: bandScoreDisplay,
      icon: Award,
      color: "success" as const,
    },
    {
      label: "Balans / To'lovlar",
      value: formatUZS(data?.pendingBalance),
      icon: CreditCard,
      color: "warning" as const,
    },
    {
      label: "Coinlar",
      value: (
        <div className="relative inline-block">
          <span>{data?.coins ?? 0}</span>
          {showExplosion && (
            <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 1, scale: 0 }}
                  animate={{
                    opacity: 0,
                    scale: 1.5,
                    x: Math.cos((i * Math.PI * 2) / 8) * 40,
                    y: Math.sin((i * Math.PI * 2) / 8) * 40,
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="absolute text-yellow-500 text-lg"
                >
                  🪙
                </motion.span>
              ))}
            </motion.div>
          )}
        </div>
      ),
      icon: Coins,
      color: "accent" as const,
    },
    {
      label: "Keyingi Imtihon",
      value: nextExamDisplay,
      icon: CalendarIcon,
      color: "secondary" as const,
      // nextExamLabel — maqsad band score yoki "IELTS imtihon"
      ...(data?.nextExamLabel ? { trend: data.nextExamLabel } : {}),
    },
  ];

  return (
    <>
      <WelcomeBanner />
      <RoleDashboard
        stats={stats}
      >
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6">
            <h3 className="font-display font-semibold text-lg mb-3">
              Bugungi jadval
            </h3>
            <p className="text-sm text-muted-foreground">
              Darslar va vazifalar moduli tez orada ishga tushiriladi.
            </p>
          </Card>
        </motion.div>
      </RoleDashboard>
    </>
  );
}

