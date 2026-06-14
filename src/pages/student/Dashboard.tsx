import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { useStudentDashboard } from "@/hooks/useOptimizedQueries";
import { api } from "@/lib/axios";
import { Link } from "react-router-dom";
import { AdventureMap } from "@/components/gamification/AdventureMap";

import DashboardBanner from "@/components/student/dashboard/DashboardBanner";
import DailyStreakCard from "@/components/student/dashboard/DailyStreakCard";
import MetricCardsRow from "@/components/student/dashboard/MetricCardsRow";
import LearningContributionGraph from "@/components/gamification/LearningContributionGraph";
import GoalsAndAchievements from "@/components/student/dashboard/GoalsAndAchievements";
import LeaderboardAndHistory from "@/components/student/dashboard/LeaderboardAndHistory";

export default function StudentDashboard() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useStudentDashboard();

  const [mapProgress, setMapProgress] = useState<any>(null);
  const [loadingMap, setLoadingMap] = useState(true);

  const fetchMapProgress = async () => {
    try {
      const res = await api.get("/user/gamification/progress");
      setMapProgress(res.data);
    } catch (e) {
      console.error("Failed to load map progress", e);
    } finally {
      setLoadingMap(false);
    }
  };

  useEffect(() => {
    fetchMapProgress();
  }, []);


  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-red-500">{t("dynamic.referralpage.ma_lumotlarni_yuklashda_xatolik_yuz_berd")}</div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen transition-colors duration-300">
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <DashboardBanner data={data} />

      {/* Adventure Map Premium Section */}
      {mapProgress && (
        <AdventureMap
          progressData={mapProgress}
          compact={true}
          onRefresh={fetchMapProgress}
        />
      )}

      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-w-0">
        <div className="md:col-span-1 min-w-0">
          <DailyStreakCard data={data} />
        </div>
        <div className="md:col-span-3 min-w-0">
          <div className="space-y-6 min-w-0">
            <MetricCardsRow data={data} />
            <LearningContributionGraph />
          </div>
        </div>
      </div>

      <GoalsAndAchievements data={data} />
      
      <LeaderboardAndHistory data={data} />
    </div>
  );
}
