import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useStudentDashboard } from "@/hooks/useOptimizedQueries";
import { api } from "@/lib/axios";
import { motion } from "framer-motion";

import DashboardBanner from "@/components/student/dashboard/DashboardBanner";
import { AdventureMap } from "@/components/gamification/AdventureMap";
import LearningContributionGraph from "@/components/gamification/LearningContributionGraph";
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

  if (isLoading || loadingMap) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-red-500">
        {t("dynamic.referralpage.ma_lumotlarni_yuklashda_xatolik_yuz_berd")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <DashboardBanner data={data} />

      {/* Adventure Map Premium Section */}
      {mapProgress && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <AdventureMap
            progressData={mapProgress}
            compact={true}
            onRefresh={fetchMapProgress}
          />
        </motion.div>
      )}
      
      {/* GitHub-like Learning Activity heatmap */}
      <LearningContributionGraph />
      
      {/* Premium 3-column stats, plan, and payment cards */}
      <LeaderboardAndHistory data={data} />
    </div>
  );
}
