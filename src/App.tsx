import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { 
  createBrowserRouter, 
  createRoutesFromElements, 
  RouterProvider, 
  Navigate, 
  Route, 
  Routes 
} from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import OfflineBanner from "@/components/OfflineBanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import SectionGuard from "@/components/SectionGuard";
import { usePackAccess } from "@/hooks/usePackAccess";
import { XAxis, YAxis } from "recharts";

// Silence Recharts defaultProps warning globally in React 18+
if (!(window as any).__console_patched) {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Support for defaultProps will be removed from function components")
    ) {
      return; // Ignore Recharts defaultProps warning
    }
    if (originalConsoleError) {
      originalConsoleError.apply(console, args);
    }
  };
  (window as any).__console_patched = true;
}

// Silence Recharts defaultProps warning globally in React 18+
try {
  if (XAxis) {
    (XAxis as any).defaultProps = {
      ...XAxis.defaultProps,
      width: 0,
      height: 0,
    };
  }
  if (YAxis) {
    (YAxis as any).defaultProps = {
      ...YAxis.defaultProps,
      width: 0,
      height: 0,
    };
  }
} catch (e) {
  // Safe fallback
}

import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar as CalendarIcon,
  MessagesSquare,
  User as UserIcon,
  BookOpen,
  Wallet,
  Users2,
  CalendarClock,
  Award,
  Settings as SettingsIcon,
  Coins,
  Gift,
  ShieldCheck,
  Trophy,
  Heart,
  Users as UsersIcon,
  Crown,
  FileText,
  Mic,
  Package,
  Headset,
  Target,
  Landmark,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Forbidden from "./pages/Forbidden";
import RoleLayout from "./layouts/RoleLayout";
import BotLogin from "./pages/BotLogin";

const PMDashboard = lazy(() => import("./pages/pack-manager/Dashboard"));
const PMPayments = lazy(() => import("./pages/pack-manager/Payments"));
const PMPending = lazy(() => import("./pages/pack-manager/Pending"));
const PMSubscriptions = lazy(() => import("./pages/pack-manager/Subscriptions"));
const PMPacks = lazy(() => import("./pages/pack-manager/Packs"));
const PMHistory = lazy(() => import("./pages/pack-manager/History"));
const PMChat = lazy(() => import("./pages/pack-manager/Chat"));

// Lazy-loaded pages (code splitting)
const SuperAdminDashboard = lazy(() => import("./pages/super-admin/Dashboard"));
const Organizations = lazy(() => import("./pages/super-admin/Organizations"));
const AllUsers = lazy(() => import("./pages/super-admin/AllUsers"));
const RegularUsers = lazy(() => import("./pages/super-admin/RegularUsers"));
const Admins = lazy(() => import("./pages/super-admin/Admins"));
const Administrators = lazy(() => import("./pages/super-admin/Administrators"));
const PackManagers = lazy(() => import("./pages/super-admin/PackManagers"));
const Teachers = lazy(() => import("./pages/super-admin/Teachers"));
const Students = lazy(() => import("./pages/super-admin/Students"));
const Profile = lazy(() => import("./pages/super-admin/Profile"));
const AuditLogs = lazy(() => import("./pages/super-admin/AuditLogs"));
const Finance = lazy(() => import("./pages/super-admin/Finance"));
const CalendarPage = lazy(() => import("./pages/super-admin/Calendar"));
const Messages = lazy(() => import("./pages/super-admin/Messages"));
const Subscriptions = lazy(() => import("./pages/super-admin/Subscriptions"));
const PaymentReceivers = lazy(() => import("./pages/super-admin/PaymentReceivers"));
const SuperAdminPackages = lazy(() => import("./pages/super-admin/Packages"));
const TelegramLinks = lazy(() => import("./pages/super-admin/TelegramLinks"));
const LMSNews = lazy(() => import("./pages/super-admin/LMSNews"));
const SuperAdminParents = lazy(() => import("./pages/super-admin/Parents"));
const StartupPitch = lazy(() => import("./pages/super-admin/StartupPitch"));
const QuestionBank = lazy(() => import("./pages/super-admin/QuestionBank"));
const SatMocks = lazy(() => import("./pages/super-admin/SatMocks"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const PaymentRequests = lazy(() => import("./pages/admin/PaymentRequests"));
const SubscriptionRequests = lazy(() => import("./pages/admin/SubscriptionRequests"));

const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const Library = lazy(() => import("./pages/shared/Library"));
const LibraryCategoryDetail = lazy(() => import("./pages/shared/LibraryCategoryDetail"));
const PdfViewerPage = lazy(() => import("./pages/shared/PdfViewerPage"));
const LibraryManage = lazy(() => import("./pages/super-admin/LibraryManage"));
const LibraryForm = lazy(() => import("./pages/super-admin/LibraryForm"));
const AdminAdministrators = lazy(() => import("./pages/admin/Administrators"));
const TeacherDashboard = lazy(() => import("./pages/teacher/Dashboard"));
const SmartDashboard = lazy(() => import("./pages/teacher/SmartDashboard"));
const Syllabus = lazy(() => import("./pages/teacher/Syllabus"));
const MyLessons = lazy(() => import("./pages/MyLessons"));
const RealTimeChat = lazy(() => import("./pages/shared/RealTimeChat"));
const StudentDashboard = lazy(() => import("./pages/student/Dashboard"));
const AdministratorDashboard = lazy(() => import("./pages/administrator/Dashboard"));
const ParentDashboard = lazy(() => import("./pages/parent/Dashboard"));

const MembersList = lazy(() => import("./pages/shared/MembersList"));
const OrgEvents = lazy(() => import("./pages/shared/OrgEvents"));
const OrgMessages = lazy(() => import("./pages/shared/OrgMessages"));
const OrgPayments = lazy(() => import("./pages/shared/OrgPayments"));
const SharedProfile = lazy(() => import("./pages/shared/SharedProfile"));
const StudentPayment = lazy(() => import("./pages/student/Payment"));
const OrgSubjects = lazy(() => import("./pages/shared/OrgSubjects"));
const OrgGroups = lazy(() => import("./pages/shared/OrgGroups"));
const OrgLessons = lazy(() => import("./pages/shared/OrgLessons"));
const AttendancePage = lazy(() => import("./pages/shared/AttendancePage"));
const TeacherGrades = lazy(() => import("./pages/teacher/Grades"));
const StudentGrades = lazy(() => import("./pages/student/Grades"));
const StudentMyCourses = lazy(() => import("./pages/student/MyCourses"));
const SettingsPage = lazy(() => import("./pages/shared/SettingsPage"));
const StudentCoins = lazy(() => import("./pages/student/Coins"));
const OrgRewards = lazy(() => import("./pages/shared/OrgRewards"));
const Leaderboard = lazy(() => import("./pages/shared/Leaderboard"));
const Packs = lazy(() => import("./pages/shared/Packs"));
const MockTests = lazy(() => import("./pages/shared/MockTests"));
const MockCategory = lazy(() => import("./pages/shared/MockCategory"));
const MockTake = lazy(() => import("./pages/shared/MockTake"));
const MockEditor = lazy(() => import("./pages/shared/MockEditor"));
const AISpeaking = lazy(() => import("./pages/shared/AISpeaking"));
const SpeakingHub = lazy(() => import("./pages/shared/SpeakingHub"));
const SpeakingTopics = lazy(() => import("./pages/shared/SpeakingTopics"));
const SpeakingTopicDetail = lazy(() => import("./pages/shared/SpeakingTopicDetail"));
const SpeakingPartners = lazy(() => import("./pages/shared/SpeakingPartners"));
const NotificationsPage = lazy(() => import("./pages/shared/NotificationsPage"));
const ReferralPage = lazy(() => import("./pages/shared/ReferralPage"));
const UserChat = lazy(() => import("./pages/user/UserChat"));
const UserDashboard = lazy(() => import("./pages/user/UserDashboard"));
const UserAccount = lazy(() => import("./pages/user/Account"));
const UserAchievements = lazy(() => import("./pages/user/Achievements"));
const UserLeaderboard = lazy(() => import("./pages/user/UserLeaderboard"));
const TelegramLinksPage = lazy(() => import("./pages/super-admin/TelegramLinks"));
const PMGrantCoins = lazy(() => import("./pages/pack-manager/GrantCoins"));
const AdventureMapFull = lazy(() => import("./pages/student/Map/AdvancedAdventureMap"));
const GamificationAdmin = lazy(() => import("./pages/admin/GamificationAdmin"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep query data fresh for 5 minutes to reduce backend load
      staleTime: 300_000,
      // Keep cached data for quick navigations
      cacheTime: 300_000,
      gcTime: 300_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: { retry: 0 },
  },
});

const AppRoutes = () => {
  const { t } = useTranslation();
  const { role } = useAuth();

  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route errorElement={<ErrorBoundary />}>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/bot-login" element={<BotLogin />} />
        <Route path="/signin" element={<Auth defaultMode="signin" />} />
        <Route path="/signup" element={<Auth defaultMode="signup" />} />
        <Route path="/pitch-debug" element={<StartupPitch />} />

        {/* Super Admin */}
        <Route path="/super-admin" element={<ProtectedRoute allow={["super_admin"]}><RoleLayout role="super_admin" basePath="/super-admin" /></ProtectedRoute>}>
          <Route index element={<SuperAdminDashboard />} />
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="organizations" element={<Organizations />} />
          <Route path="users" element={<AllUsers />} />
          <Route path="regular-users" element={<RegularUsers />} />
          <Route path="admins" element={<Admins />} />
          <Route path="teachers" element={<Teachers />} />
          <Route path="students" element={<Students />} />
          <Route path="activity" element={<AuditLogs />} />
          <Route path="administrators" element={<Administrators />} />
          <Route path="pack-managers" element={<PackManagers />} />
          <Route path="finance" element={<Finance />} />
          <Route path="payment-requests" element={<PaymentRequests />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="messages" element={<Messages />} />
          <Route path="leaderboard" element={<Leaderboard defaultRole="student" />} />
          <Route path="mocks" element={<MockTests basePath="/super-admin" />} />
          <Route path="mocks/new" element={<MockEditor basePath="/super-admin" />} />
          <Route path="mocks/edit/:testId" element={<MockEditor basePath="/super-admin" />} />
          <Route path="mocks/c/:kind" element={<MockCategory basePath="/super-admin" />} />
          <Route path="mocks/take/:testId" element={<MockTake />} />
          <Route path="sat" element={<MockCategory basePath="/super-admin" forcedKind="sat" />} />
          <Route path="national-cert" element={<MockCategory basePath="/super-admin" forcedKind="national_cert" />} />
          <Route path="sat-mocks" element={<SatMocks />} />
          <Route path="sat-mocks/new" element={<MockEditor basePath="/super-admin" defaultKind="sat" />} />
          <Route path="sat-mocks/edit/:testId" element={<MockEditor basePath="/super-admin" defaultKind="sat" />} />
          <Route path="milliy-mocks" element={<MockCategory basePath="/super-admin" forcedKind="national_cert" />} />
          <Route path="milliy-mocks/new" element={<MockEditor basePath="/super-admin" defaultKind="national_cert" />} />
          <Route path="packs" element={<Packs />} />
          <Route path="subscriptions" element={<Subscriptions />} />
          <Route path="subscription-requests" element={<SubscriptionRequests />} />
          <Route path="payment-receivers" element={<PaymentReceivers />} />
          <Route path="packages" element={<SuperAdminPackages />} />
          <Route path="speaking" element={<SpeakingHub basePath="/super-admin" />} />
          <Route path="speaking/ai" element={<AISpeaking />} />
          <Route path="speaking/topics" element={<SpeakingTopics basePath="/super-admin" />} />
          <Route path="speaking/topics/:slug" element={<SpeakingTopicDetail basePath="/super-admin" />} />
          <Route path="speaking/partners" element={<SpeakingPartners />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<Profile />} />
          <Route path="telegram" element={<TelegramLinks />} />
          <Route path="pitch" element={<StartupPitch />} />
          <Route path="news" element={<LMSNews />} />
          <Route path="parents" element={<SuperAdminParents />} />
          <Route path="groups" element={<OrgGroups />} />
          <Route path="grant-coins" element={<PMGrantCoins />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="referral" element={<ReferralPage />} />
          <Route path="gamification" element={<GamificationAdmin />} />
          <Route path="question-bank" element={<QuestionBank />} />
          <Route path="library" element={<Library />} />
          <Route path="library/adabiy-kitoblar" element={<LibraryCategoryDetail code="adabiy_kitoblar" />} />
          <Route path="library/maktab-darsliklari" element={<LibraryCategoryDetail code="maktab_darsliklari" />} />
          <Route path="library/oquv-qollanmalar" element={<LibraryCategoryDetail code="oquv_qollanmalar" />} />
          <Route path="library/category/:code" element={<LibraryCategoryDetail />} />
          <Route path="library/read/:materialId" element={<PdfViewerPage />} />
          <Route path="library-manage" element={<LibraryManage />} />
          <Route path="library-manage/create" element={<LibraryForm />} />
          <Route path="library-manage/edit/:id" element={<LibraryForm />} />
        </Route>

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute allow={["admin", "administrator", "teacher"]}><RoleLayout role="admin" basePath="/admin" /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="administrators" element={<AdminAdministrators />} />
          <Route path="parents" element={<SuperAdminParents />} />
          <Route path="teachers" element={<MembersList role="teacher" title={t("nav.teachers")} description="" canManage />} />
          <Route path="students" element={<MembersList role="student" title={t("nav.students")} description="" canManage />} />
          <Route path="subjects" element={<OrgSubjects />} />
          <Route path="groups" element={<OrgGroups />} />
          <Route path="lessons" element={<OrgLessons canManage basePath="/admin" />} />
          <Route path="attendance/:lessonId" element={<AttendancePage />} />
          <Route path="calendar" element={<OrgEvents canManage />} />
          <Route path="messages" element={<OrgMessages />} />
          <Route path="payments" element={<OrgPayments />} />
          <Route path="payment-requests" element={<PaymentRequests />} />
          <Route path="profile" element={<SharedProfile />} />
          <Route path="rewards" element={<OrgRewards />} />
          <Route path="leaderboard" element={<Leaderboard defaultRole="student" />} />
          <Route path="packs" element={<Packs />} />
          <Route path="speaking" element={<SpeakingHub basePath="/admin" />} />
          <Route path="speaking/ai" element={<AISpeaking />} />
          <Route path="speaking/topics" element={<SpeakingTopics basePath="/admin" />} />
          <Route path="speaking/topics/:slug" element={<SpeakingTopicDetail basePath="/admin" />} />
          <Route path="speaking/partners" element={<SpeakingPartners />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="referral" element={<ReferralPage />} />
          <Route path="gamification" element={<GamificationAdmin />} />
          <Route path="library" element={<Library />} />
          <Route path="library/adabiy-kitoblar" element={<LibraryCategoryDetail code="adabiy_kitoblar" />} />
          <Route path="library/maktab-darsliklari" element={<LibraryCategoryDetail code="maktab_darsliklari" />} />
          <Route path="library/oquv-qollanmalar" element={<LibraryCategoryDetail code="oquv_qollanmalar" />} />
          <Route path="library/category/:code" element={<LibraryCategoryDetail />} />
          <Route path="library/read/:materialId" element={<PdfViewerPage />} />
        </Route>

        {/* Administrator */}
        <Route path="/administrator" element={<ProtectedRoute allow={["administrator"]}><RoleLayout role="administrator" basePath="/administrator" /></ProtectedRoute>}>
          <Route index element={<AdministratorDashboard />} />
          <Route path="dashboard" element={<AdministratorDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="administrators" element={<AdminAdministrators />} />
          <Route path="teachers" element={<MembersList role="teacher" title={t("nav.teachers")} description="" canManage />} />
          <Route path="students" element={<MembersList role="student" title={t("nav.students")} description="" canManage />} />
          <Route path="parents" element={<SuperAdminParents />} />
          <Route path="subjects" element={<OrgSubjects />} />
          <Route path="groups" element={<OrgGroups />} />
          <Route path="lessons" element={<OrgLessons canManage basePath="/administrator" />} />
          <Route path="attendance/:lessonId" element={<AttendancePage />} />
          <Route path="calendar" element={<OrgEvents canManage />} />
          <Route path="messages" element={<OrgMessages />} />
          <Route path="payments" element={<OrgPayments />} />
          <Route path="profile" element={<SharedProfile />} />
          <Route path="rewards" element={<OrgRewards />} />
          <Route path="leaderboard" element={<Leaderboard defaultRole="student" />} />
          <Route path="packs" element={<Packs />} />
          <Route path="speaking" element={<SpeakingHub basePath="/administrator" />} />
          <Route path="speaking/ai" element={<AISpeaking />} />
          <Route path="speaking/topics" element={<SpeakingTopics basePath="/administrator" />} />
          <Route path="speaking/topics/:slug" element={<SpeakingTopicDetail basePath="/administrator" />} />
          <Route path="speaking/partners" element={<SpeakingPartners />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="referral" element={<ReferralPage />} />
          <Route path="library" element={<Library />} />
          <Route path="library/adabiy-kitoblar" element={<LibraryCategoryDetail code="adabiy_kitoblar" />} />
          <Route path="library/maktab-darsliklari" element={<LibraryCategoryDetail code="maktab_darsliklari" />} />
          <Route path="library/oquv-qollanmalar" element={<LibraryCategoryDetail code="oquv_qollanmalar" />} />
          <Route path="library/category/:code" element={<LibraryCategoryDetail />} />
          <Route path="library/read/:materialId" element={<PdfViewerPage />} />
        </Route>

        {/* Teacher */}
        <Route path="/teacher" element={<ProtectedRoute allow={["teacher"]}><RoleLayout role="teacher" basePath="/teacher" /></ProtectedRoute>}>
          <Route index element={<TeacherDashboard />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="smart-dashboard" element={<SmartDashboard />} />
          <Route path="syllabus" element={<Syllabus />} />
          <Route path="students" element={<MembersList role="student" title={t("nav.myStudents")} description="" canManage />} />
          <Route path="parents" element={<SuperAdminParents />} />
          <Route path="groups" element={<OrgGroups />} />
          <Route path="lessons" element={<OrgLessons canManage basePath="/teacher" filter="teacher" />} />
          <Route path="attendance/:lessonId" element={<AttendancePage />} />
          <Route path="grades" element={<TeacherGrades />} />
          <Route path="calendar" element={<OrgEvents />} />
          <Route path="chat" element={<RealTimeChat />} />
          <Route path="messages" element={<OrgMessages />} />
          <Route path="profile" element={<SharedProfile />} />
          <Route path="leaderboard" element={<Leaderboard defaultRole="student" />} />
          <Route path="packs" element={<Packs />} />
          <Route path="speaking" element={<SpeakingHub basePath="/teacher" />} />
          <Route path="speaking/ai" element={<AISpeaking />} />
          <Route path="speaking/topics" element={<SpeakingTopics basePath="/teacher" />} />
          <Route path="speaking/topics/:slug" element={<SpeakingTopicDetail basePath="/teacher" />} />
          <Route path="speaking/partners" element={<SpeakingPartners />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="referral" element={<ReferralPage />} />
          <Route path="library" element={<Library />} />
          <Route path="library/adabiy-kitoblar" element={<LibraryCategoryDetail code="adabiy_kitoblar" />} />
          <Route path="library/maktab-darsliklari" element={<LibraryCategoryDetail code="maktab_darsliklari" />} />
          <Route path="library/oquv-qollanmalar" element={<LibraryCategoryDetail code="oquv_qollanmalar" />} />
          <Route path="library/category/:code" element={<LibraryCategoryDetail />} />
          <Route path="library/read/:materialId" element={<PdfViewerPage />} />
        </Route>

        {/* Student Role */}
        <Route path="/student" element={<ProtectedRoute allow={["student"]}><RoleLayout role="student" basePath="/student" /></ProtectedRoute>}>
          <Route index element={<StudentDashboard />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="teachers" element={<MembersList role="teacher" title={t("nav.myTeachers")} description="" />} />
          <Route path="lessons" element={<StudentMyCourses />} />
          <Route path="grades" element={<StudentGrades />} />
          <Route path="calendar" element={<OrgEvents />} />
          <Route path="messages" element={<OrgMessages />} />
          <Route path="payment" element={<StudentPayment />} />
          <Route path="coins" element={<StudentCoins />} />
          <Route path="leaderboard" element={<UserLeaderboard />} />
          <Route path="account" element={<UserAccount />} />
          <Route path="achievements" element={<UserAchievements />} />
          <Route path="profile" element={<SharedProfile />} />
          <Route path="mocks" element={<MockTests basePath="/student" />} />
          <Route path="mocks/c/:kind" element={<MockCategory basePath="/student" />} />
          <Route path="mocks/take/:testId" element={<MockTake />} />
          <Route path="sat" element={<Navigate to="/student/mocks/c/sat" replace />} />
          <Route path="national-cert" element={<Navigate to="/student/mocks/c/national_cert" replace />} />
          <Route path="speaking" element={<SpeakingHub basePath="/student" />} />
          <Route path="speaking/ai" element={<AISpeaking />} />
          <Route path="speaking/topics" element={<SpeakingTopics basePath="/student" />} />
          <Route path="speaking/topics/:slug" element={<SpeakingTopicDetail basePath="/student" />} />
          <Route path="speaking/partners" element={<SpeakingPartners />} />
          <Route path="packs" element={<Packs />} />
          <Route path="subscriptions" element={<Navigate to="/student/packs" replace />} />
          <Route path="chat" element={<UserChat />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="referral" element={<ReferralPage />} />
          <Route path="map" element={<AdventureMapFull />} />
          <Route path="library" element={<Library />} />
          <Route path="library/adabiy-kitoblar" element={<LibraryCategoryDetail code="adabiy_kitoblar" />} />
          <Route path="library/maktab-darsliklari" element={<LibraryCategoryDetail code="maktab_darsliklari" />} />
          <Route path="library/oquv-qollanmalar" element={<LibraryCategoryDetail code="oquv_qollanmalar" />} />
          <Route path="library/category/:code" element={<LibraryCategoryDetail />} />
          <Route path="library/read/:materialId" element={<PdfViewerPage />} />
        </Route>

        {/* Regular User Role */}
        <Route path="/user" element={<ProtectedRoute allow={["user"]}><RoleLayout role="user" basePath="/user" /></ProtectedRoute>}>
          <Route index element={<UserDashboard />} />
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="profile" element={<UserAccount />} />
          <Route path="subscriptions" element={<Packs />} />
          <Route path="mocks" element={<MockTests basePath="/user" />} />
          <Route path="mocks/c/:kind" element={<MockCategory basePath="/user" />} />
          <Route path="mocks/take/:testId" element={<MockTake />} />
          <Route path="sat" element={<Navigate to="/user/mocks/c/sat" replace />} />
          <Route path="national-cert" element={<Navigate to="/user/mocks/c/national_cert" replace />} />
          <Route path="speaking" element={<SpeakingHub basePath="/user" />} />
          <Route path="achievements" element={<UserAchievements />} />
          <Route path="leaderboard" element={<UserLeaderboard />} />
          <Route path="messages" element={<UserChat />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="referral" element={<ReferralPage />} />
          <Route path="map" element={<AdventureMapFull />} />
          <Route path="library" element={<Library />} />
          <Route path="library/adabiy-kitoblar" element={<LibraryCategoryDetail code="adabiy_kitoblar" />} />
          <Route path="library/maktab-darsliklari" element={<LibraryCategoryDetail code="maktab_darsliklari" />} />
          <Route path="library/oquv-qollanmalar" element={<LibraryCategoryDetail code="oquv_qollanmalar" />} />
          <Route path="library/category/:code" element={<LibraryCategoryDetail />} />
          <Route path="library/read/:materialId" element={<PdfViewerPage />} />
        </Route>

        {/* Parent */}
        <Route path="/parent" element={<ProtectedRoute allow={["parent"]}><RoleLayout role="parent" basePath="/parent" /></ProtectedRoute>}>
          <Route index element={<ParentDashboard />} />
          <Route path="dashboard" element={<ParentDashboard />} />
          <Route path="children" element={<ParentDashboard />} />
          <Route path="payment" element={<StudentPayment />} />
          <Route path="messages" element={<OrgMessages />} />
          <Route path="leaderboard" element={<Leaderboard defaultRole="student" />} />
          <Route path="profile" element={<SharedProfile />} />
          <Route path="packs" element={<Packs />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="calendar" element={<OrgEvents />} />
          <Route path="speaking" element={<SpeakingHub basePath="/parent" />} />
          <Route path="speaking/ai" element={<AISpeaking />} />
          <Route path="speaking/topics" element={<SpeakingTopics basePath="/parent" />} />
          <Route path="speaking/topics/:slug" element={<SpeakingTopicDetail basePath="/parent" />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="referral" element={<ReferralPage />} />
        </Route>


        {/* Pack Manager */}
        <Route path="/pack-manager" element={<ProtectedRoute allow={["payment_manager"]}><RoleLayout role="payment_manager" basePath="/pack-manager" /></ProtectedRoute>}>
          <Route index element={<PMDashboard />} />
          <Route path="dashboard" element={<PMDashboard />} />
          <Route path="payments" element={<PMPayments />} />
          <Route path="pending" element={<PMPending />} />
          <Route path="subscriptions" element={<PMSubscriptions />} />
          <Route path="subscription-requests" element={<SubscriptionRequests />} />
          <Route path="packs" element={<PMPacks />} />
          <Route path="history" element={<PMHistory />} />
          <Route path="chat" element={<PMChat />} />
          <Route path="messages" element={<PMChat />} />
          <Route path="grant-coins" element={<PMGrantCoins />} />
          <Route path="mocks" element={<MockTests basePath="/pack-manager" />} />
          <Route path="mocks/new" element={<MockEditor basePath="/pack-manager" />} />
          <Route path="mocks/edit/:testId" element={<MockEditor basePath="/pack-manager" />} />
          <Route path="mocks/c/:kind" element={<MockCategory basePath="/pack-manager" />} />
          <Route path="mocks/take/:testId" element={<MockTake />} />
          <Route path="profile" element={<SharedProfile />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="referral" element={<ReferralPage />} />
        </Route>

        <Route path="/403" element={<Forbidden />} />
        <Route path="/unauthorized" element={<Forbidden />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    )
  );


  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-[9999]">
          <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
      }
    >
      <RouterProvider router={router} />
    </Suspense>
  );
};


import { GoogleOAuthProvider } from "@react-oauth/google";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" richColors closeButton />
        <OfflineBanner />
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "145237994758-tdo9e1hbpk55qhuho7kn09miov4jf161.apps.googleusercontent.com"}>
          <AuthProvider>
            {/* AppRoutes komponentini ErrorBoundary bilan o'rash */}
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </AuthProvider>
        </GoogleOAuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
