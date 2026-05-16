import { Users, Calendar as CalendarIcon, Inbox, BookOpen, Heart, Users2 } from "lucide-react";
import RoleDashboard, { StatCard } from "@/components/RoleDashboard";
import { Card } from "@/components/ui/card";
import { useTeacherDashboard } from "@/hooks/useOptimizedQueries";

export default function TeacherDashboard() {
  const { data, isLoading } = useTeacherDashboard();

  const stats: StatCard[] = [
    { label: "Mening talabalarim", value: data?.myStudents || 0, icon: Users, color: "primary" },
    { label: "Guruhlarim", value: data?.groupsCount || 0, icon: Users2, color: "primary" },
    { label: "Ota-onalar", value: data?.parentsCount || 0, icon: Heart, color: "accent" },
    { label: "Imtihonlar", value: data?.assignedExams || 0, icon: BookOpen, color: "success" },
    { label: "Tekshirilmagan", value: data?.pendingGrades || 0, icon: Inbox, color: "secondary" },
    { label: "Tadbirlar", value: data?.eventsCount || 0, icon: CalendarIcon, color: "primary" },
  ];

  return (
    <RoleDashboard
      title="O'qituvchi paneli"
      description="Sizning darslaringiz va talabalaringiz"
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
  );
}
