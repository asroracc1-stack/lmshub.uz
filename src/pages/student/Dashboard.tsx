import React from "react";
import { Loader2 } from "lucide-react";
import { useStudentDashboard } from "@/hooks/useOptimizedQueries";

import DashboardBanner from "@/components/student/dashboard/DashboardBanner";
import DailyStreakCard from "@/components/student/dashboard/DailyStreakCard";
import MetricCardsRow from "@/components/student/dashboard/MetricCardsRow";
import WeeklyChart from "@/components/student/dashboard/WeeklyChart";
import GoalsAndAchievements from "@/components/student/dashboard/GoalsAndAchievements";
import LeaderboardAndHistory from "@/components/student/dashboard/LeaderboardAndHistory";

export default function StudentDashboard() {
  const { data, isLoading, error } = useStudentDashboard();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-red-500">
        Ma'lumotlarni yuklashda xatolik yuz berdi.
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
      <DashboardBanner data={data} />
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <DailyStreakCard data={data} />
        </div>
        <div className="md:col-span-3">
          <div className="space-y-6">
            <MetricCardsRow data={data} />
            <WeeklyChart data={data} />
          </div>
        </div>
      </div>

      <GoalsAndAchievements data={data} />
      
      <LeaderboardAndHistory data={data} />
    </div>
  );
}
