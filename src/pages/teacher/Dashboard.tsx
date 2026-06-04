import { Users, BookOpen, Users2 } from "lucide-react";
import RoleDashboard, { StatCard } from "@/components/RoleDashboard";
import { Card } from "@/components/ui/card";
import { useTeacherDashboard } from "@/hooks/useOptimizedQueries";
import { motion } from "framer-motion";
import WelcomeBanner from "@/components/shared/WelcomeBanner";

export default function TeacherDashboard() {
  const { data, isLoading } = useTeacherDashboard();

  const stats: StatCard[] = [
    { label: "Talabalarim", value: data?.myStudentsCount ?? 0, icon: Users, color: "primary" },
    { label: "Guruhlarim", value: data?.myGroupsCount ?? 0, icon: Users2, color: "primary" },
    { label: "Darslarim", value: data?.myLessonsCount ?? 0, icon: BookOpen, color: "success" },
  ];

  return (
    <>
      <WelcomeBanner />
      <RoleDashboard
        stats={stats}
      >
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6">
            <h3 className="font-display font-semibold text-lg mb-3">Bugungi vazifalar</h3>
            <p className="text-sm text-muted-foreground">
              Darslar va vazifalar moduli tez orada ishga tushiriladi.
            </p>
          </Card>
        </motion.div>
      </RoleDashboard>
    </>
  );
}

