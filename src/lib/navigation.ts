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
  Send,
  Presentation,
  Gift
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
      return [
        { to: "/admin/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
        { 
          label: t("nav.usersMenu"), 
          icon: Users,
          children: [
            { to: "/admin/users", label: t("nav.allUsers"), icon: Users2 },
            { to: "/admin/teachers", label: t("nav.teachers"), icon: GraduationCap },
            { to: "/admin/students", label: t("nav.students"), icon: Users },
            { to: "/admin/parents", label: t("nav.parents"), icon: Heart },
            { to: "/admin/administrators", label: t("nav.administrators"), icon: ShieldCheck },
          ]
        },
        { to: "/admin/subjects", label: t("nav.subjects"), icon: BookOpen },
        { to: "/admin/groups", label: t("nav.groups"), icon: Users2 },
        { to: "/admin/lessons", label: t("nav.lessons"), icon: CalendarClock },
        { to: "/admin/payments", label: t("nav.payments"), icon: Wallet },
        // { to: "/admin/payment-requests", label: t("nav.paymentRequests", "To'lov so'rovlari"), icon: Wallet },
        { to: "/admin/calendar", label: t("nav.calendar"), icon: Calendar },
        { to: "/admin/messages", label: t("nav.messages"), icon: MessagesSquare },
        { to: "/admin/leaderboard", label: t("nav.leaderboard"), icon: Trophy },
        // { to: "/admin/packs", label: t("nav.packs"), icon: Package },
        { to: "/admin/referral", label: t("nav.referral"), icon: Gift },
      ];
    case "administrator":
      return [
        { to: "/administrator/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
        { 
          label: t("nav.usersMenu"), 
          icon: Users,
          children: [
            { to: "/administrator/teachers", label: t("nav.teachers"), icon: GraduationCap },
            { to: "/administrator/students", label: t("nav.students"), icon: Users },
            { to: "/administrator/parents", label: t("nav.parents"), icon: Heart },
          ]
        },
        { to: "/administrator/subjects", label: t("nav.subjects"), icon: BookOpen },
        { to: "/administrator/groups", label: t("nav.groups"), icon: Users2 },
        { to: "/administrator/lessons", label: t("nav.lessons"), icon: CalendarClock },
        { to: "/administrator/payments", label: t("nav.payments"), icon: Wallet },
        // { to: "/administrator/payment-requests", label: t("nav.paymentRequests", "To'lov so'rovlari"), icon: Wallet },
        { to: "/administrator/calendar", label: t("nav.calendar"), icon: Calendar },
        { to: "/administrator/messages", label: t("nav.messages"), icon: MessagesSquare },
        { to: "/administrator/leaderboard", label: t("nav.leaderboard"), icon: Trophy },
        // { to: "/administrator/packs", label: t("nav.packs"), icon: Package },
        { to: "/administrator/referral", label: t("nav.referral"), icon: Gift },
      ];
    case "teacher":
      return [
        { to: "/teacher/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
        { to: "/teacher/smart-dashboard", label: t("nav.smartDashboard"), icon: Award },
        // { to: "/teacher/syllabus", label: "Syllabus (Mavzular)", icon: BookOpen }, // Hozircha yopib turildi
        { to: "/teacher/students", label: t("nav.students"), icon: Users },
        { to: "/teacher/parents", label: t("nav.parents"), icon: Heart },
        { to: "/teacher/groups", label: t("nav.groups"), icon: Users2 },
        { to: "/teacher/lessons", label: t("nav.myLessons"), icon: CalendarClock },
        { to: "/teacher/grades", label: t("nav.grades"), icon: Award },
        { to: "/teacher/calendar", label: t("nav.schedule"), icon: Calendar },
        // { to: "/teacher/chat", label: "Real-time Chat", icon: MessagesSquare }, // Hozircha yopib turildi
        { to: "/teacher/messages", label: t("nav.messages"), icon: MessagesSquare },
        { to: "/teacher/leaderboard", label: t("nav.leaderboard"), icon: Trophy },
        // { to: "/teacher/packs", label: t("nav.packs"), icon: Package },
        { to: "/teacher/referral", label: t("nav.referral"), icon: Gift },
      ];
    case "student":
    return [
      { to: "/student/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
      { to: "/student/lessons", label: t("nav.myLessonsStudent"), icon: CalendarClock },
      { to: "/student/grades", label: t("nav.results"), icon: Award },
      { to: "/student/calendar", label: t("nav.schedule"), icon: Calendar },
      { to: "/student/payment", label: t("nav.payment"), icon: Wallet },
      { to: "/student/messages", label: t("nav.messages"), icon: MessagesSquare },
      { to: "/student/achievements", label: t("nav.achievements"), icon: Award },
      { to: "/student/leaderboard", label: t("nav.leaderboard"), icon: Trophy },
      // { to: "/student/packs", label: t("nav.packs"), icon: Package },
      { to: "/student/account", label: t("nav.account"), icon: User },
      { to: "/student/settings", label: t("nav.settings"), icon: Settings },
      { to: "/student/referral", label: t("nav.referral"), icon: Gift },
    ];
    case "user":
      return [
        { to: "/user/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
        // { to: "/user/mocks", label: t("nav.mocks"), icon: FileText },
        { to: "/user/sat", label: t("nav.sat"), icon: Target },
        { to: "/user/national-cert", label: t("nav.nationalCert"), icon: Landmark },
        { to: "/user/subscriptions", label: t("nav.subscriptions"), icon: Package },
        { to: "/user/achievements", label: t("nav.achievements"), icon: Award },
        { to: "/user/leaderboard", label: t("nav.leaderboard"), icon: Trophy },
        { to: "/user/messages", label: t("nav.messages"), icon: MessagesSquare },
        { to: "/user/settings", label: t("nav.settings"), icon: Settings },
        { to: "/user/referral", label: t("nav.referral"), icon: Gift },
      ];
    case "parent":
      return [
        { to: "/parent/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
        { to: "/parent/children", label: t("nav.myChildren"), icon: Heart },
        { to: "/parent/calendar", label: t("nav.calendar"), icon: Calendar },
        { to: "/parent/messages", label: t("nav.messages"), icon: MessagesSquare },
        { to: "/parent/payment", label: t("nav.payment"), icon: Wallet },
        // { to: "/parent/packs", label: "Obunalar", icon: Package },
        { to: "/parent/profile", label: t("common.profile"), icon: User },
        { to: "/parent/settings", label: t("nav.settings"), icon: Settings },
        { to: "/parent/referral", label: t("nav.referral"), icon: Gift },
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
            { to: "/super-admin/pack-managers", label: t("nav.packManagers"), icon: ShieldCheck },
          ]
        },
        { to: "/super-admin/finance", label: t("nav.finance"), icon: Wallet },
        // { to: "/super-admin/payment-requests", label: t("nav.paymentRequests", "To'lov so'rovlari"), icon: Wallet },
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
        { to: "/super-admin/pitch", label: t("nav.pitchPresentation"), icon: Presentation },
        { to: "/super-admin/activity", label: t("nav.activityLogs"), icon: Activity },
        { to: "/super-admin/referral", label: t("nav.referral"), icon: Gift },
      ];
    case "payment_manager":
      return [
        { to: "/pack-manager/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
        { to: "/pack-manager/payments", label: t("nav.paymentsSales"), icon: Wallet },
        { to: "/pack-manager/subscriptions", label: t("nav.subscriptions"), icon: Crown },
        { to: "/pack-manager/packs", label: t("nav.pricingPacks"), icon: Package },
        { to: "/pack-manager/mocks", label: t("nav.examPacks"), icon: FileText },
        { to: "/pack-manager/referral", label: t("nav.referral"), icon: Gift },
      ];
    default:
      return [];
  }
};
