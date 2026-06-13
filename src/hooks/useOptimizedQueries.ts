import i18next from "i18next";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { toast } from "sonner";

// Custom type interfaces
export interface SuperAdminStats {
  organizations: number;
  totalUsers: number;
  teachers: number;
  students: number;
  admins: number;
  administrators: number;
  parents: number;
  totalSubjects?: number;
}

export interface MonthPoint {
  month: string;
  users: number;
}

export interface OrgPoint {
  name: string;
  users: number;
}

export interface AdminStatsDto {
  teachersCount: number;
  studentsCount: number;
  parentsCount: number;        // ← ota-onalar soni
  superAdminsCount: number;
  orgAdminsCount: number;
  eventsCount: number;
  teacherGrowth: number;
  studentGrowth: number;
  superAdminGrowth: number;
  orgAdminGrowth: number;
  eventGrowth: number;
  organization: {
    id: string;
    name: string;
    email: string;
    phone: string;
    logoUrl?: string;
    address?: string | {
      region?: string;
      district?: string;
      street_address?: string;
      full_address?: string;
    };
  } | null;
  subscriptionStatus: "ACTIVE" | "EXPIRING" | "EXPIRED";
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  type: string;
  color?: string;
}

export interface SuperAdminDashboardResponse {
  stats: {
    organizations: number;
    totalUsers: number;
    teachers: number;
    students: number;
    admins: number;
    administrators: number;
    users: number;
    parents: number;
    groups: number;
    totalSubjects: number;
    totalRevenue: number;
  };
  growth: MonthPoint[];
  topOrgs: OrgPoint[];
  recentActivity: {
    id: string;
    action: string;
    actor: string;
    at: string;
  }[];
}

// 1. Super Admin Dashboard Stats Hook
export function useSuperAdminDashboard() {
  return useQuery<SuperAdminDashboardResponse>({
    queryKey: ["super-admin-dashboard-stats"],
    queryFn: async () => {
      const response = await api.get<SuperAdminDashboardResponse>("/super-admin/stats");
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// 2. Admin Dashboard Stats Hook - Unified Summary
export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const response = await api.get<AdminStatsDto>("/admin/dashboard/summary");
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}

export interface AdminDashboardStatsDto {
  totalTeachers: number;
  totalStudents: number;
  totalParents: number;
  totalAdministrators: number;
  totalGroups: number;
  totalSubjects: number;
}

export function useAdminDashboardStats() {
  return useQuery({
    queryKey: ["admin-dashboard-realtime-stats"],
    queryFn: async () => {
      const response = await api.get<AdminDashboardStatsDto>("/admin/dashboard/stats");
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}

export interface AdminDashboardOverviewDto {
  organization: {
    name: string;
    address: string;
    email: string;
    phone: string;
    logoUrl?: string;
  };
  upcomingEvents: Array<{
    id: string;
    title: string;
    startsAt: string;
    endsAt?: string;
    location: string;
  }>;
  subscription: {
    planName: string;
    status: "ACTIVE" | "EXPIRING" | "EXPIRED";
    expiresAt: string;
  };
}

export function useAdminDashboardOverview() {
  return useQuery({
    queryKey: ["admin-dashboard-overview"],
    queryFn: async () => {
      const response = await api.get<AdminDashboardOverviewDto>("/admin/dashboard/overview");
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}

// 2.1 General Organization Hook
export function useOrganization(orgId?: string | null) {
  return useQuery({
    queryKey: ["organization", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const response = await api.get(`/admin/organization/settings`);
      return response.data;
    },
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000,
  });
}

// 3. Upcoming Events Hook
export function useUpcomingEvents() {
  return useQuery({
    queryKey: ["upcoming-events"],
    queryFn: async () => {
      const response = await api.get<CalendarEvent[]>("/admin/dashboard/events/upcoming");
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// 3.1 🔴 ETISHMAYOTGAN HOOK: Teacher Dashboard Stats Hook (Vercel Build xatosini tuzatish)
export function useTeacherDashboard() {
  return useQuery({
    queryKey: ["teacher-dashboard-stats"],
    queryFn: async () => {
      const response = await api.get("/teacher/dashboard/summary");
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}

// 4. Quick Action Mutations
export function useDashboardMutations() {
  const queryClient = useQueryClient();

  const addTeacher = useMutation({
    mutationFn: async (data: any) => await api.post("/admin/users", { ...data, role: "TEACHER" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard-stats"] });
      toast.success("O'qituvchi muvaffaqiyatli qo'shildi! 🐯🚀");
    },
    onError: () => toast.error(i18next.t("dynamic.useoptimizedqueries.o_qituvchi_qo_shishda_xatolik")),
  });

  const addStudent = useMutation({
    mutationFn: async (data: any) => await api.post("/admin/users", { ...data, role: "STUDENT" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard-stats"] });
      toast.success("Talaba muvaffaqiyatli qo'shildi! 🐯🚀");
    },
    onError: () => toast.error(i18next.t("dynamic.useoptimizedqueries.talaba_qo_shishda_xatolik")),
  });

  const generateReport = useMutation({
    mutationFn: async () => {
      const response = await api.get("/admin/reports/generate", { responseType: "blob" });
      return response.data;
    },
    onSuccess: async (data: any) => {
      if (data instanceof Blob && data.type === "application/json") {
        const text = await data.text();
        console.error("Server returned JSON error instead of PDF:", text);
        toast.error(i18next.t("dynamic.useoptimizedqueries.hisobot_tayyorlashda_xatolik_yuz_berdi"));
        return;
      }
      
      const blob = new Blob([data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "organization-report.pdf");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Hisobot muvaffaqiyatli tayyorlandi va yuklab olindi! 🐯📊");
    },
    onError: () => toast.error(i18next.t("dynamic.useoptimizedqueries.hisobot_tayyorlashda_xatolik_yuz_berdi")),
  });

  const updateOrgSettings = useMutation({
    mutationFn: async (data: any) => await api.put("/admin/organization/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      toast.success(i18next.t("dynamic.useoptimizedqueries.tashkilot_sozlamalari_yangilandi"));
    },
    onError: () => toast.error(i18next.t("dynamic.useoptimizedqueries.sozlamalarni_saqlashda_xatolik")),
  });

  const addEvent = useMutation({
    mutationFn: async (data: { title: string; description: string; eventDate: string }) => 
      await api.post("/admin/events", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
      toast.success("Tadbir muvaffaqiyatli yaratildi! 🐯🎉");
    },
    onError: () => toast.error(i18next.t("dynamic.useoptimizedqueries.tadbir_yaratishda_xatolik")),
  });

  return { addTeacher, addStudent, generateReport, updateOrgSettings, addEvent };
}

// 5. Student Dashboard — Typed interface & hook
export interface ChartPointDto {
  day: string;
  reading: number;
  listening: number;
  writing: number;
  speaking: number;
}

export interface GoalDto {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  progress: number | null;
  isCompleted: boolean;
}

export interface AchievementDto {
  id: string;
  title: string;
  description: string;
  date: string;
  iconType: string;
}

export interface LeaderboardDto {
  rank: number;
  name: string;
  avatarUrl: string | null;
  bandScore: number;
  isCurrentUser: boolean;
}

export interface RecentTestDto {
  id: string;
  title: string;
  subtitle: string;
  type: string;
  score: number;
  date: string;
}

export interface StudentIeltsDashboardDto {
  targetBand: number;
  currentBand: number | null;
  progressPercentage: number;
  dailyStreak: number;
  longestStreak: number;
  weekChecklist: boolean[];
  targetBandTrend: string;
  averageScoreTrend: string;
  daysUntilExam: number;
  totalPracticeTime: string;
  weeklyResults: ChartPointDto[];
  todayGoals: GoalDto[];
  achievements: AchievementDto[];
  leaderboard: LeaderboardDto[];
  recentTests: RecentTestDto[];
  isPremium: boolean;
  takenTestsCount: number;
  overallProgress: number;
}

export function useStudentDashboard() {
  return useQuery<StudentIeltsDashboardDto>({
    queryKey: ["student-ielts-dashboard-stats"],
    queryFn: async () => {
      const response = await api.get<any>("/student/ielts-dashboard/summary");
      const d = response.data;
      return {
        targetBand: d.target_band ?? d.targetBand ?? 0,
        currentBand: d.current_band ?? d.currentBand ?? 0,
        progressPercentage: d.progress_percentage ?? d.progressPercentage ?? 0,
        dailyStreak: d.daily_streak ?? d.dailyStreak ?? 0,
        longestStreak: d.longest_streak ?? d.longestStreak ?? 0,
        weekChecklist: d.week_checklist ?? d.weekChecklist ?? [],
        targetBandTrend: d.target_band_trend ?? d.targetBandTrend ?? "",
        averageScoreTrend: d.average_score_trend ?? d.averageScoreTrend ?? "",
        daysUntilExam: d.days_until_exam ?? d.daysUntilExam ?? 0,
        totalPracticeTime: d.total_practice_time ?? d.totalPracticeTime ?? "0h",
        weeklyResults: (d.weekly_results ?? d.weeklyResults ?? []).map((w: any) => ({
          ...w
        })),
        todayGoals: (d.today_goals ?? d.todayGoals ?? []).map((g: any) => ({
          ...g,
          isCompleted: g.is_completed ?? g.isCompleted ?? false
        })),
        achievements: (d.achievements ?? []).map((a: any) => ({
          ...a,
          iconType: a.icon_type ?? a.iconType ?? ""
        })),
        leaderboard: (d.leaderboard ?? []).map((l: any) => ({
          ...l,
          bandScore: l.band_score ?? l.bandScore ?? 0,
          isCurrentUser: l.is_current_user ?? l.isCurrentUser ?? false,
          avatarUrl: l.avatar_url ?? l.avatarUrl ?? null
        })),
        recentTests: (d.recent_tests ?? d.recentTests ?? []).map((t: any) => ({
          ...t,
          score: t.score ?? 0
        })),
        isPremium: d.is_premium ?? d.isPremium ?? false,
        takenTestsCount: d.taken_tests_count ?? d.takenTestsCount ?? 0,
        overallProgress: d.overall_progress ?? d.overallProgress ?? 0,
      } as StudentIeltsDashboardDto;
    },
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}

// Prefetch Manager
export function usePrefetchHelper() {
  const queryClient = useQueryClient();

  const prefetchRouteData = async (to: string) => {
    const prefetch = async (key: string[], url: string) => {
      await queryClient.prefetchQuery({
        queryKey: key,
        queryFn: async () => {
          const response = await api.get(url);
          return response.data;
        },
      });
    };

    if (to === "/super-admin/dashboard") await prefetch(["super-admin-dashboard-stats"], "/super-admin/stats");
    if (to === "/admin/dashboard") {
      await prefetch(["admin-dashboard-overview"], "/admin/dashboard/overview");
    }
    // O'qituvchi navigatsiyasi uchun prefetch qo'shildi
    if (to === "/teacher/dashboard") {
      await prefetch(["teacher-dashboard-stats"], "/teacher/dashboard/summary");
    }
  };

  return { prefetchRouteData };
}