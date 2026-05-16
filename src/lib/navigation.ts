import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Calendar, 
  MessagesSquare, 
  BookOpen, 
  Wallet, 
  Users2, 
  CalendarClock, 
  Award, 
  Mic, 
  Trophy, 
  Package,
  ShieldCheck,
  FileText,
  Target,
  Landmark,
  User,
  Settings,
  Heart,
  UserCog,
  Crown,
  Activity,
  Send
} from "lucide-react";
import { TFunction } from "i18next";

export interface NavItem {
  to?: string;
  label: string;
  icon: any;
  children?: NavItem[];
}

export const getSidebarRoutes = (role: string, t: TFunction, options: { ielts?: boolean; sat?: boolean; milliy?: boolean } = {}): NavItem[] => {
  switch (role) {
    case "admin":
    case "administrator":
      const base = role === "admin" ? "/admin" : "/administrator";
      return [
        { to: `${base}/dashboard`, label: t("nav.dashboard"), icon: LayoutDashboard },
        { 
          label: "Foydalanuvchilar", 
          icon: Users,
          children: [
            { to: `${base}/users`, label: "Jami foydalanuvchilar", icon: Users2 },
            { to: `${base}/teachers`, label: "O'qituvchilar", icon: GraduationCap },
            { to: `${base}/students`, label: "Talabalar", icon: Users },
            { to: `${base}/parents`, label: "Ota-onalar", icon: Heart },
            { to: `${base}/administrators`, label: "Administratorlar", icon: ShieldCheck },
          ]
        },
        { to: `${base}/subjects`, label: t("nav.subjects"), icon: BookOpen },
        { to: `${base}/groups`, label: t("nav.groups"), icon: Users2 },
        { to: `${base}/lessons`, label: t("nav.lessons"), icon: CalendarClock },
        { to: `${base}/payments`, label: t("nav.payments"), icon: Wallet },
        { to: `${base}/calendar`, label: t("nav.calendar"), icon: Calendar },
        { to: `${base}/messages`, label: t("nav.messages"), icon: MessagesSquare },
        { to: `${base}/speaking`, label: t("nav.speaking"), icon: Mic },
        { to: `${base}/leaderboard`, label: t("nav.leaderboard"), icon: Trophy },
        { to: `${base}/packs`, label: t("nav.packs"), icon: Package },
      ];
    case "teacher":
      return [
        { to: "/teacher/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
        { to: "/teacher/students", label: t("nav.students"), icon: Users },
        { to: "/teacher/parents", label: "Ota-onalar", icon: Heart },
        { to: "/teacher/groups", label: t("nav.groups"), icon: Users2 },
        { to: "/teacher/lessons", label: t("nav.myLessons"), icon: CalendarClock },
        { to: "/teacher/grades", label: t("nav.grades"), icon: Award },
        { to: "/teacher/calendar", label: t("nav.schedule"), icon: Calendar },
        { to: "/teacher/messages", label: t("nav.messages"), icon: MessagesSquare },
        { to: "/teacher/speaking", label: t("nav.speaking"), icon: Mic },
        { to: "/teacher/leaderboard", label: t("nav.leaderboard"), icon: Trophy },
        { to: "/teacher/packs", label: t("nav.packs"), icon: Package },
      ];
    case "student":
      return [
        { to: "/student/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
        { to: "/student/lessons", label: t("nav.myLessonsStudent"), icon: CalendarClock },
        { to: "/student/grades", label: t("nav.results"), icon: Award },
        { to: "/student/speaking", label: t("nav.speaking", "AI Speaking"), icon: Mic },
        ...(options.ielts ? [{ to: "/student/mocks", label: "IELTS Mocks", icon: FileText }] : []),
        ...(options.sat ? [{ to: "/student/sat", label: "SAT", icon: Target }] : []),
        ...(options.milliy ? [{ to: "/student/national-cert", label: "Milliy sertifikat", icon: Landmark }] : []),
        { to: "/student/calendar", label: t("nav.schedule"), icon: Calendar },
        { to: "/student/payment", label: t("nav.payment"), icon: Wallet },
        { to: "/student/messages", label: t("nav.messages"), icon: MessagesSquare },
        { to: "/student/leaderboard", label: t("nav.leaderboard"), icon: Trophy },
        { to: "/student/packs", label: t("nav.packs"), icon: Package },
        { to: "/student/account", label: t("nav.account"), icon: User },
        { to: "/student/settings", label: t("nav.settings"), icon: Settings },
      ];
    case "user":
      return [
        { to: "/user/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/user/subscriptions", label: "Obunalar", icon: Package },
        { to: "/user/speaking", label: "AI Speaking", icon: Mic },
        { to: "/user/achievements", label: "Yutuqlar", icon: Award },
        { to: "/user/leaderboard", label: "Peshqadamlar", icon: Trophy },
        { to: "/user/messages", label: "Xabarlar", icon: MessagesSquare },
        { to: "/user/settings", label: "Sozlamalar", icon: Settings },
      ];
    case "parent":
      return [
        { to: "/parent/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/parent/children", label: "Farzandlarim", icon: Heart },
        { to: "/parent/leaderboard", label: "Peshqadamlar", icon: Trophy },
        { to: "/parent/packs", label: "Obunalar", icon: Package },
        { to: "/parent/messages", label: "Xabarlar", icon: MessagesSquare },
      ];
    case "super_admin":
      return [
        { to: "/super-admin/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
        { to: "/super-admin/organizations", label: t("nav.organizations"), icon: Landmark },
        { 
          label: t("nav.usersMenu"), 
          icon: Users,
          children: [
            { to: "/super-admin/users", label: t("nav.allUsers"), icon: Users2 },
            { to: "/super-admin/admins", label: t("nav.admins"), icon: ShieldCheck },
            { to: "/super-admin/administrators", label: t("nav.administrators"), icon: ShieldCheck },
            { to: "/super-admin/teachers", label: t("nav.teachers"), icon: GraduationCap },
            { to: "/super-admin/students", label: t("nav.students"), icon: Users },
            { to: "/super-admin/parents", label: t("nav.parents"), icon: Heart },
            { to: "/super-admin/regular-users", label: t("nav.regularUsers"), icon: User },
          ]
        },
        { to: "/super-admin/finance", label: t("nav.finance"), icon: Wallet },
        { to: "/super-admin/calendar", label: t("nav.calendar"), icon: Calendar },
        { to: "/super-admin/messages", label: t("nav.messages"), icon: MessagesSquare },
        { to: "/super-admin/leaderboard", label: t("nav.leaderboard"), icon: Trophy },
        { 
          label: t("nav.ieltsAi"), 
          icon: GraduationCap,
          children: [
            { to: "/super-admin/mocks", label: t("nav.mocks"), icon: FileText },
            { to: "/super-admin/speaking", label: t("nav.speakingAi"), icon: Mic },
          ]
        },
        { 
          label: t("nav.subjectsMenu"), 
          icon: Target,
          children: [
            { to: "/super-admin/sat", label: t("nav.sat"), icon: Target },
            { to: "/super-admin/national-cert", label: t("nav.nationalCert"), icon: Landmark },
          ]
        },
        { to: "/super-admin/groups", label: t("nav.groups"), icon: Users2 },
        { to: "/super-admin/packs", label: t("nav.packs"), icon: Package },
        { to: "/super-admin/packages", label: t("nav.pricingPlans"), icon: Package },
        { to: "/super-admin/telegram", label: t("common.telegramBot"), icon: Send },
        { to: "/super-admin/activity", label: t("nav.activityLogs"), icon: Activity },
      ];
    case "payment_manager":
      return [
        { to: "/pack-manager/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/pack-manager/payments", label: "To'lovlar", icon: Wallet },
        { to: "/pack-manager/subscriptions", label: "Obunalar", icon: Crown },
        { to: "/pack-manager/packs", label: "Packlar", icon: Package },
        { to: "/pack-manager/mocks", label: "Mock testlar", icon: FileText },
        { to: "/pack-manager/chat", label: "Xabarlar", icon: MessagesSquare },
      ];
    default:
      return [];
  }
};
