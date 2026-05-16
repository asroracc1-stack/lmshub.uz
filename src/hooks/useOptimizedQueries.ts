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
    address?: string;
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

// 1. Super Admin Dashboard Stats Hook
export function useSuperAdminDashboard() {
  return useQuery({
    queryKey: ["super-admin-dashboard-stats"],
    queryFn: async () => {
      const response = await api.get("/super-admin/stats");
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

// 4. Quick Action Mutations
export function useDashboardMutations() {
  const queryClient = useQueryClient();

  const addTeacher = useMutation({
    mutationFn: async (data: any) => await api.post("/admin/users", { ...data, role: "TEACHER" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      toast.success("O'qituvchi muvaffaqiyatli qo'shildi! 🐯🚀");
    },
    onError: () => toast.error("O'qituvchi qo'shishda xatolik!"),
  });

  const addStudent = useMutation({
    mutationFn: async (data: any) => await api.post("/admin/users", { ...data, role: "STUDENT" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
      toast.success("Talaba muvaffaqiyatli qo'shildi! 🐯🚀");
    },
    onError: () => toast.error("Talaba qo'shishda xatolik!"),
  });

  const generateReport = useMutation({
    mutationFn: async () => {
      const response = await api.get("/admin/reports/generate", { responseType: "blob" });
      return response.data;
    },
    onSuccess: (data) => {
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "organization-report.pdf");
      document.body.appendChild(link);
      link.click();
      toast.success("Hisobot muvaffaqiyatli tayyorlandi va yuklab olindi!");
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

  return { addTeacher, addStudent, generateReport, updateOrgSettings };
}

// 5. Student Dashboard Stats Hook
export function useStudentDashboard() {
  return useQuery({
    queryKey: ["student-dashboard-stats"],
    queryFn: async () => {
      const response = await api.get("/student/dashboard/summary");
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
      await prefetch(["admin-dashboard-stats"], "/admin/dashboard/summary");
      await prefetch(["upcoming-events"], "/admin/dashboard/events/upcoming");
    }
  };

  return { prefetchRouteData };
}
