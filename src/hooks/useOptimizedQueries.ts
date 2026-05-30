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
    onError: () => toast.error("O'qituvchi qo'shishda xatolik!"),
  });

  const addStudent = useMutation({
    mutationFn: async (data: any) => await api.post("/admin/users", { ...data, role: "STUDENT" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-dashboard-stats"] });
      toast.success("Talaba muvaffaqiyatli qo'shildi! 🐯🚀");
    },
    onError: () => toast.error("Talaba qo'shishda xatolik!"),
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
        toast.error("Hisobot tayyorlashda xatolik yuz berdi!");
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
    onError: () => toast.error("Hisobot tayyorlashda xatolik yuz berdi!"),
  });

  const updateOrgSettings = useMutation({
    mutationFn: async (data: any) => await api.put("/admin/organization/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      toast.success("Tashkilot sozlamalari yangilandi!");
    },
    onError: () => toast.error("Sozlamalarni saqlashda xatolik!"),
  });

  const addEvent = useMutation({
    mutationFn: async (data: { title: string; description: string; eventDate: string }) => 
      await api.post("/admin/events", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
      toast.success("Tadbir muvaffaqiyatli yaratildi! 🐯🎉");
    },
    onError: () => toast.error("Tadbir yaratishda xatolik!"),
  });

  return { addTeacher, addStudent, generateReport, updateOrgSettings, addEvent };
}

// 5. Student Dashboard — Typed interface & hook
export interface StudentDashboardSummary {
  /** Talaba a'zo bo'lgan faol guruhlar soni (group_members jadvali) */
  myGroupsCount: number;
  /** Talaba topshirgan jami mock imtihonlari soni (student_attempts jadvali) */
  mockExamsCount: number;
  /**
   * O'rtacha IELTS Band Score (1 kasr bilan, masalan: 6.5).
   * Agar imtihon topshirilmagan bo'lsa null qaytadi → frontend "—" ko'rsatadi.
   */
  averageBandScore: number | null;
  /**
   * To'lanmagan invoicelar yig'indisi UZS da (PENDING + SENT + OVERDUE).
   * 0 bo'lishi mumkin — qarzdorligi yo'q degani.
   */
  pendingBalance: number;
  /** Foydalanuvchining yig'gan coinlari */
  coins: number;
  /**
   * Keyingi IELTS imtihon sanasi (YYYY-MM-DD format).
   * Belgilanmagan bo'lsa null qaytadi → frontend "—" ko'rsatadi.
   */
  nextExamDate: string | null;
  /** Keyingi imtihon label-i (masalan: "Maqsad: 7.0 band") */
  nextExamLabel: string | null;
}

export function useStudentDashboard() {
  return useQuery<StudentDashboardSummary>({
    queryKey: ["student-dashboard-stats"],
    queryFn: async () => {
      const response = await api.get<StudentDashboardSummary>("/student/dashboard/summary");
      return response.data;
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