import { useTranslation } from "react-i18next";
import { Users, BookOpen, Users2 } from "lucide-react";
import RoleDashboard, { StatCard } from "@/components/RoleDashboard";
import { Card } from "@/components/ui/card";
import { useTeacherDashboard } from "@/hooks/useOptimizedQueries";
import { motion } from "framer-motion";
import WelcomeBanner from "@/components/shared/WelcomeBanner";

export default function TeacherDashboard() {
  const { t } = useTranslation();
  const { data, isLoading } = useTeacherDashboard();

  const stats: StatCard[] = [
    { label: "Talabalarim", value: isLoading ? "..." : (data?.myStudentsCount ?? 0), icon: Users, color: "primary" },
    { label: "Guruhlarim", value: isLoading ? "..." : (data?.myGroupsCount ?? 0), icon: Users2, color: "primary" },
    { label: "Darslarim", value: isLoading ? "..." : (data?.myLessonsCount ?? 0), icon: BookOpen, color: "success" },
  ];

  return (
    <>
      <WelcomeBanner />
      <RoleDashboard
        stats={stats}
      >
        {isLoading ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 animate-pulse" />
            ))}
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6">
              <h3 className="font-display font-semibold text-lg mb-3">{t("dynamic.dashboard.bugungi_vazifalar")}</h3>
              <p className="text-sm text-muted-foreground">
                Darslar va vazifalar moduli tez orada ishga tushiriladi.
              </p>
            </Card>
          </motion.div>
        )}
      </RoleDashboard>
    </>
  );
}

