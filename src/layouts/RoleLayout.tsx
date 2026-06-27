import { useCallback, useState, useMemo, useEffect, Suspense } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import {
  LogOut,
  ChevronRight,
  ChevronDown,
  Menu,
  Search,
  Send,
  PanelLeftClose,
  PanelLeftOpen,
  Gift,
  Star,
  CircleDollarSign,
  Crown,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import NotificationsBell from "@/components/NotificationsBell";
import Logo from "@/components/Logo";
import ProfileMenu from "@/components/ProfileMenu";
import MobileSidebarDrawer from "@/components/MobileSidebarDrawer";
import SmartClock from "@/components/SmartClock";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePrefetchHelper, useOrganization } from "@/hooks/useOptimizedQueries";
import { getSidebarRoutes, NavItem } from "@/lib/navigation";
import { usePackAccess } from "@/hooks/usePackAccess";
import TigerLoader from "@/components/TigerLoader";
import CommandPalette from "@/components/CommandPalette";
import confetti from "canvas-confetti";
import { DotLottiePlayer } from "@dotlottie/react-player";
import { VoiceAssistantProvider } from "@/contexts/VoiceAssistantContext";
import VoiceAssistantButton from "@/components/voice/VoiceAssistantButton";
import VoiceAssistantPanel from "@/components/voice/VoiceAssistantPanel";

type Role = "admin" | "administrator" | "teacher" | "student" | "user" | "parent" | "super_admin" | "payment_manager";

interface RoleLayoutProps {
  brand?: string;
  subtitle?: string;
  nav?: NavItem[];
  role?: Role;
  basePath?: string;
}

export default function RoleLayout({
  brand = "LMSHub",
  subtitle,
  nav: initialNav,
  role = "user",
  basePath = "/user",
}: RoleLayoutProps) {
  const { profile, signOut, user, loading: authLoading, refresh: refreshAuth } = useAuth();
  const [showCoinsModal, setShowCoinsModal] = useState(false);

  const [showMySubscriptionsModal, setShowMySubscriptionsModal] = useState(false);
  const [mySubscriptions, setMySubscriptions] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");

  const fetchMySubscriptions = async () => {
    try {
      setLoadingSubscriptions(true);
      const [subsRes, reqsRes] = await Promise.all([
        api.get("/profile/my-subscriptions"),
        api.get("/profile/my-subscription-requests").catch(() => ({ data: [] }))
      ]);
      setMySubscriptions(subsRes.data || []);
      setMyRequests(reqsRes.data || []);
    } catch (e) {
      console.error("Error fetching subscriptions:", e);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  useEffect(() => {
    if (showMySubscriptionsModal) {
      fetchMySubscriptions();
    }
  }, [showMySubscriptionsModal]);

  useEffect(() => {
    if (localStorage.getItem("show_first_login_coins_modal") === "true") {
      setShowCoinsModal(true);
      setTimeout(() => {
        try {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
        } catch (e) {
          console.error(e);
        }
      }, 500);
    }
  }, []);

  const handleCollectCoins = async () => {
    localStorage.removeItem("show_first_login_coins_modal");
    setShowCoinsModal(false);
    try {
      await refreshAuth();
    } catch (e) {
      console.error(e);
    }
  };

  const { theme } = useTheme();
  const { data: orgData } = useOrganization(
    role === "admin" || role === "super_admin" ? profile?.organization_id : null
  );
  const { prefetchRouteData } = usePrefetchHelper();
  const navigate = useNavigate();
  const location = useLocation();
  usePageTitle();
  const { t } = useTranslation();
  const packAccess = usePackAccess();

  /* ── Mobile drawer ──────────────────────────────────── */
  const [mobileOpen, setMobileOpen] = useState(false);
  const openMobileMenu = useCallback(() => setMobileOpen(true), []);
  const closeMobileMenu = useCallback(() => setMobileOpen(false), []);
  const handleMobileNavClick = useCallback(() => setMobileOpen(false), []);

  /* ── Desktop sidebar collapse ───────────────────────── */
  const STORAGE_KEY = `rl_sidebar_collapsed_${role}`;
  const [collapsed, setCollapsed] = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1"
  );
  const toggleCollapsed = () =>
    setCollapsed((v) => {
      const n = !v;
      localStorage.setItem(STORAGE_KEY, n ? "1" : "0");
      return n;
    });

  /* ── Submenu open/close ─────────────────────────────── */
  const [manualToggle, setManualToggle] = useState<Record<string, boolean>>({});
  const finalNav = useMemo(() => {
    if (initialNav) return initialNav;
    return getSidebarRoutes(role, t, packAccess);
  }, [initialNav, role, t, packAccess]);

  useEffect(() => {
    const loginToast = sessionStorage.getItem("loginToast");
    if (loginToast) {
      sessionStorage.removeItem("loginToast");
      if (loginToast === "google") {
        toast.success("Google orqali muvaffaqiyatli kirdingiz");
      } else {
        toast.success("Muvaffaqiyatli kirdingiz");
      }
    }
  }, []);

  useEffect(() => {
    const updatedToggles: Record<string, boolean> = {};
    finalNav.forEach((item) => {
      if (item.children) {
        const isActive = item.children.some((c) => location.pathname === c.to);
        updatedToggles[item.label] = isActive;
      }
    });
    setManualToggle(updatedToggles);
  }, [location.pathname, finalNav]);

  /* ── Display name ───────────────────────────────────── */
  const displayName = (() => {
    if (profile?.full_name) return profile.full_name;
    const meta = user?.user_metadata;
    if (meta?.full_name) return meta.full_name;
    if (meta?.name) return meta.name;
    if (meta?.display_name) return meta.display_name;
    if (profile?.username) return profile.username;
    if (user?.email) return user.email.split("@")[0];
    return "User";
  })();

  const handleSignOut = async () => {
    await signOut();
    toast.success(t("common.logout"));
    navigate("/", { replace: true });
  };

  /* ════════════════════════════════════════════════════
     SIDEBAR RENDER FUNCTION
     mini=true  → icon only (desktop collapsed)
     mini=false → full (desktop expanded + mobile)
  ════════════════════════════════════════════════════ */
  const renderSidebarContent = (mini = false, isMobile = false) => (
    <div className="flex flex-col h-full">

      {/* ── Header: Logo & Toggle (desktop only) ─────────────────────── */}
      <div 
        className={cn(
          "shrink-0 h-16 flex items-center border-b border-sidebar-border transition-all duration-300 select-none",
          mini ? "justify-center px-2" : "justify-between px-3"
        )}
      >
        {/* Expanded State: Logo + Close button */}
        {!mini ? (
          <>
            <div className="flex items-center gap-2 overflow-hidden flex-1 opacity-100">
              <Logo
                size={54}
                showText={true}
                variant={theme === "dark" ? "dark" : "light"}
              />
            </div>
            {!isMobile && (
              <button
                onClick={() => setCollapsed(true)}
                className="flex items-center justify-center h-8 w-8 shrink-0 rounded-lg border border-border/60
                  bg-background/40 hover:bg-primary/10 hover:border-primary/40
                  text-muted-foreground hover:text-primary transition-all duration-200 cursor-pointer"
                title={t("common.hideMenu")}
                aria-label={t("common.hideMenu")}
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          /* Collapsed (Mini) State: Click to open */
          <div 
            onClick={!isMobile ? () => setCollapsed(false) : undefined}
            className={cn(
              "flex items-center justify-center transition-all duration-300",
              !isMobile && "cursor-pointer hover:scale-105"
            )}
            title={t("common.showMenu")}
          >
            <Logo
              size={36}
              showText={false}
              variant={theme === "dark" ? "dark" : "light"}
            />
          </div>
        )}
      </div>

      {/* ── Nav items ─────────────────────────────────── */}
      <nav className="flex-1 min-h-0 py-3 px-3 space-y-1 overflow-y-auto thin-scrollbar">
        {finalNav.map((item) => {
          const hasActiveChild = item.children?.some((c) => {
            if (!c.to) return false;
            return location.pathname === c.to || location.pathname.startsWith(`${c.to}/`);
          });
          const isExpanded = manualToggle[item.label] ?? (hasActiveChild || false);

          if (item.children) {
            return (
              <div key={item.label} className="space-y-1">
                {/* Parent button */}
                <button
                  onClick={() =>
                    !mini && setManualToggle((prev) => ({ ...prev, [item.label]: !isExpanded }))
                  }
                  aria-expanded={isExpanded}
                  title={mini ? item.label : undefined}
                  className={cn(
                    "w-full flex items-center gap-4 rounded-2xl text-[15px] font-medium transition-all duration-200 group",
                    mini ? "justify-center h-11 w-11 mx-auto px-0" : "px-4 py-3",
                    isExpanded || hasActiveChild
                      ? "bg-primary/10 text-primary"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <item.icon
                    size={22}
                    className={cn(
                      "shrink-0 transition-colors",
                      isExpanded || hasActiveChild
                        ? "text-primary"
                        : "text-slate-400 group-hover:text-purple-500"
                    )}
                  />
                  {!mini && (
                    <>
                      <span className="flex-1 text-left truncate font-semibold">{item.label}</span>
                      <ChevronDown
                        size={14}
                        className={cn("shrink-0 transition-transform duration-300 text-slate-400", isExpanded && "rotate-180")}
                      />
                    </>
                  )}
                </button>

                {/* Children */}
                <AnimatePresence initial={false}>
                  {isExpanded && !mini && (
                    <motion.div
                      key="sub"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="pl-4 pt-1 pb-1 space-y-0.5 relative">
                        {/* Vertical guide line */}
                        <div className="absolute left-[22px] top-0 bottom-2 w-px bg-slate-200 dark:bg-slate-700/60 rounded-full" />
                        {item.children.map((child) => (
                          <NavLink
                            key={child.to}
                            to={child.to!}
                            onClick={handleMobileNavClick}
                            className={({ isActive }) =>
                              cn(
                                "relative flex items-center gap-4 pl-7 pr-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
                                isActive
                                  ? "bg-primary/10 text-primary font-semibold"
                                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5"
                              )
                            }
                          >
                            {({ isActive }) => (
                              <>
                                {isActive && (
                                  <motion.div
                                    layoutId={`active-child-dot-${item.label}`}
                                    className="absolute left-[10px] w-1.5 h-1.5 rounded-full bg-primary"
                                  />
                                )}
                                <child.icon
                                  size={17}
                                  className={cn(isActive ? "text-primary" : "text-slate-400")}
                                />
                                <span className="truncate">{child.label}</span>
                              </>
                            )}
                          </NavLink>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          /* ── Leaf nav item ─── */
          return (
            <NavLink
              key={item.to}
              to={item.to!}
              end
              onClick={handleMobileNavClick}
              onMouseEnter={() => item.to && prefetchRouteData(item.to)}
              title={mini ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-4 rounded-2xl text-[15px] font-semibold transition-all duration-200",
                  mini ? "justify-center h-11 w-11 mx-auto px-0" : "px-4 py-3",
                  isActive
                    ? "bg-primary text-white shadow-glow-purple"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative flex items-center">
                    <item.icon
                      size={22}
                      className={cn(
                        "shrink-0 transition-colors",
                        isActive
                          ? "text-white"
                          : "text-slate-400 group-hover:text-primary dark:group-hover:text-primary-glow"
                      )}
                    />
                    {mini && item.badge && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                      </span>
                    )}
                  </div>
                  {!mini && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-[6px] text-[10px] font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 shadow-sm leading-none ml-auto shrink-0 select-none">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* ── Footer: Telegram + Logout ─────────────────── */}
      <div
        className={cn(
          "shrink-0 border-t border-slate-200 dark:border-white/5 py-3 px-3 space-y-1"
        )}
      >
        <a
          href="https://t.me/LMSHub_bot"
          target="_blank"
          rel="noopener noreferrer"
          title={mini ? t("common.telegramBot") : undefined}
          className={cn(
            "flex items-center gap-4 rounded-2xl text-[15px] font-semibold text-slate-500 dark:text-slate-400",
            "hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all duration-200",
            mini ? "justify-center h-11 w-11 mx-auto px-0" : "px-4 py-3"
          )}
        >
          <Send size={20} className="shrink-0 text-slate-400" />
          {!mini && (
            <span className="truncate">{t("common.telegramBot")}</span>
          )}
        </a>
        <button
          onClick={handleSignOut}
          title={mini ? t("common.logout") : undefined}
          className={cn(
            "w-full flex items-center gap-4 rounded-2xl text-[15px] font-semibold text-red-500",
            "hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200",
            mini ? "justify-center h-11 w-11 mx-auto px-0" : "px-4 py-3"
          )}
        >
          <LogOut size={20} className="shrink-0" />
          {!mini && (
            <span className="truncate">{t("common.logout")}</span>
          )}
        </button>
      </div>
    </div>
  );

  /* ── Exam page — no layout ──────────────────────────── */
  const isExamPage =
    location.pathname.includes("/exam") || location.pathname.includes("/take");
  if (isExamPage) {
    return (
      <div className="w-full min-h-screen bg-[#FCFAFF] dark:bg-[#0B0714] text-slate-900 dark:text-slate-100 overflow-x-hidden">
        <Outlet />
      </div>
    );
  }

  /* ════════════════════════════════════════════════════
     MAIN LAYOUT
  ════════════════════════════════════════════════════ */
  return (
    <VoiceAssistantProvider>
      <div
        className={cn(
          "h-screen flex w-full overflow-hidden transition-colors duration-500 p-0 gap-0 md:p-3 md:gap-3",
          theme === "dark" ? "bg-[#080410] text-slate-100" : "bg-[#F3F4F6] text-slate-900"
        )}
      >
      <TigerLoader isLoading={authLoading} />
      <CommandPalette />

      {/* ── Desktop sidebar ─────────────────────────── */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "hidden md:flex shrink-0 border flex-col h-full overflow-hidden rounded-[16px]",
          theme === "dark"
            ? "bg-[#140D23] border-[#2E1E52] shadow-2xl"
            : "bg-white border-[#E8DDFB] shadow-xl shadow-purple-100/40"
        )}
      >
        {renderSidebarContent(collapsed, false)}
      </motion.aside>

      {/* ── Mobile drawer ───────────────────────────── */}
      <MobileSidebarDrawer
        open={mobileOpen}
        onClose={closeMobileMenu}
        routeKey={location.pathname}
      >
        {renderSidebarContent(false, true)}
      </MobileSidebarDrawer>

      {/* ── Main content ────────────────────────────── */}
      <div 
        className={cn(
          "flex-1 flex flex-col min-w-0 h-full overflow-y-auto overflow-x-hidden relative thin-scrollbar rounded-none border-0 md:rounded-[16px] md:border",
          theme === "dark"
            ? "bg-[#140D23] md:border-[#2E1E52] shadow-2xl"
            : "bg-white md:border-[#E8DDFB] shadow-xl shadow-purple-100/40"
        )}
      >
        {/* Topbar */}
        <header
          className={cn(
            "shrink-0 h-14 sm:h-16 border-b sticky top-0 z-30 transition-all w-full flex justify-center rounded-none md:rounded-t-[16px]",
            theme === "dark"
              ? "bg-[#140D23]/60 backdrop-blur-xl border-[#2E1E52]"
              : "bg-white/80 backdrop-blur-md border-[#E8DDFB]"
          )}
        >
          <div className="w-full px-3 sm:px-4 flex items-center justify-between h-full">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-xl h-9 w-9"
                onClick={openMobileMenu}
                aria-label="Menyu"
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Greeting */}
              <div className="hidden sm:block">
                <p className="font-bold text-sm tracking-tight text-foreground">
                  {t("common.hello")}, {displayName} 👋
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 h-full py-2">
              <VoiceAssistantButton />
              <div className="hidden sm:block">
                <SmartClock />
              </div>

              {/* Mobile Coins: visible in place of clock on mobile */}
              <div 
                className="flex sm:hidden items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border/60 bg-white/50 dark:bg-slate-900/50 shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                onClick={() => navigate(`${basePath}/achievements`)}
                title="Sizning tangalaringiz"
              >
                <CircleDollarSign className="w-4 h-4 text-emerald-500" />
                <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">{profile?.coins || 0}</span>
              </div>

              {/* Gamification Stats */}
              <div className="hidden sm:flex items-center gap-2 px-1">
                <div 
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-white/50 dark:bg-slate-900/50 shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => navigate(`${basePath}/achievements`)}
                  title="Sizning tangalaringiz"
                >
                  <CircleDollarSign className="w-4 h-4 text-emerald-500" />
                  <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">{profile?.coins || 0}</span>
                </div>
                <div 
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 bg-white/50 dark:bg-slate-900/50 shadow-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  onClick={() => navigate(`${basePath}/achievements`)}
                  title="Yutuqlar"
                >
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">0</span>
                </div>
              </div>

              <button
                onClick={() => window.dispatchEvent(new Event("open-global-search"))}
                className="hidden lg:flex items-center gap-2 px-3 h-9 rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="font-bold">{t("common.search")}...</span>
                <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-white dark:bg-white/15 border-slate-100 dark:border-white/10 px-1.5 font-mono text-[9px] font-medium opacity-100">
                  <span>⌘</span>K
                </kbd>
              </button>
              <div className="flex items-center gap-1 sm:gap-1.5 md:gap-3 pl-1.5 sm:pl-2 md:pl-4 border-l border-border h-8">
                {/* Mening Paketlarim button */}
                <button
                  onClick={() => navigate(`${basePath}/packs?view=my`)}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-650 text-white hover:opacity-90 transition-opacity shadow-sm shadow-indigo-500/20"
                  title="Mening Paketlarim"
                >
                  <Crown className="h-3.5 w-3.5" />
                </button>
                {/* Referral button */}
                <button
                  onClick={() => navigate(`${basePath}/referral`)}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500 text-white hover:bg-purple-600 transition-colors shadow-sm shadow-purple-500/30"
                  title={t("nav.referral")}
                >
                  <Gift className="h-3.5 w-3.5" />
                </button>
                <NotificationsBell />
                <ProfileMenu role={role} basePath={basePath} />
              </div>
            </div>
          </div>
        </header>

        {/* Page */}
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex-1 p-3 sm:p-4 md:p-5 w-full"
        >
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[200px]">
                <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </motion.main>
      </div>

      {/* First Login Coins Reward Modal */}
      <AnimatePresence>
        {showCoinsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-md overflow-hidden rounded-[24px] border border-amber-500/30 bg-[#160E26] p-8 text-center shadow-2xl shadow-amber-500/10"
            >
              <div className="absolute -top-40 -left-40 h-[300px] w-[300px] rounded-full bg-amber-500/10 blur-[80px]" />
              <div className="absolute -bottom-40 -right-40 h-[300px] w-[300px] rounded-full bg-purple-500/10 blur-[80px]" />
              
              <div className="relative mx-auto mb-6 flex h-40 w-40 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-2xl animate-pulse" />
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 3,
                    ease: "easeInOut"
                  }}
                  className="z-10"
                >
                  <DotLottiePlayer
                    src="https://lottie.host/05a8da46-bffb-4416-a160-0b16adbce445/CxzFkSjThh.lottie"
                    autoplay
                    loop
                    className="h-32 w-32"
                  />
                </motion.div>
              </div>

              <motion.h3 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-display text-2xl font-extrabold tracking-tight text-white"
              >
                Tabriklaymiz! 🎉
              </motion.h3>

              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-3 text-sm text-slate-300 leading-relaxed"
              >
                Tizimga muvaffaqiyatli kirganingiz uchun sizga <span className="font-bold text-amber-400">10 LMSHub Coin</span> berildi! Tangalarni testlar va boshqa imkoniyatlar uchun ishlatishingiz mumkin.
              </motion.p>

              <motion.div 
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="mx-auto mt-6 flex max-w-fit items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-6 py-2.5 shadow-inner"
              >
                <CircleDollarSign className="h-6 w-6 text-amber-400" />
                <span className="text-xl font-black text-amber-300 tracking-wider">+10 COINS</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-8"
              >
                <Button
                  onClick={handleCollectCoins}
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-base rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] border-none"
                >
                  Qabul qilish 🪙
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mening Paketlarim (My Subscriptions) Modal */}
      <Dialog open={showMySubscriptionsModal} onOpenChange={setShowMySubscriptionsModal}>
        <DialogContent className="max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] border-none shadow-2xl p-6">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-white/5">
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2.5">
              <Crown className="h-5 w-5 text-amber-500" />
              Mening Paketlarim
            </DialogTitle>
          </DialogHeader>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("active")}
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                activeTab === "active" ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              Aktiv Paketlar
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={cn(
                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                activeTab === "history" ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              So'rovlar tarixi
            </button>
          </div>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto thin-scrollbar">
            {loadingSubscriptions ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              </div>
            ) : activeTab === "active" ? (
              mySubscriptions.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Crown className="h-10 w-10 text-slate-350 mx-auto opacity-55" />
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Sizda hali faol paketlar mavjud emas.</p>
                  <Button size="sm" onClick={() => { setShowMySubscriptionsModal(false); navigate(`${basePath}/packs`); }} className="bg-primary text-white text-xs rounded-xl mt-2 font-bold px-4">
                    Paket sotib olish
                  </Button>
                </div>
              ) : (
                mySubscriptions.map((sub: any) => {
                  const isActive = sub.status === "ACTIVE";
                  const isExpired = sub.status === "EXPIRED";
                  
                  return (
                    <div 
                      key={sub.id} 
                      className={cn(
                        "p-4 rounded-2xl border transition-all duration-300 flex flex-col gap-2.5 bg-slate-50/50 dark:bg-white/5",
                        isActive ? "border-emerald-500/20 shadow-emerald-500/5 bg-emerald-500/5" : "border-slate-200 dark:border-white/5"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-450">{sub.packType}</span>
                          <h4 className="text-sm font-black text-slate-800 dark:text-white">{sub.packName}</h4>
                        </div>
                        <Badge className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                          isActive && "bg-emerald-500 text-white border-none",
                          isExpired && "bg-rose-500 text-white border-none",
                          sub.status === "INACTIVE" && "bg-slate-500 text-white border-none"
                        )}>
                          {isActive ? "Faol" : isExpired ? "Muddati tugagan" : "Nofaol"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 dark:border-white/5 pt-2 font-semibold text-slate-500 dark:text-slate-400">
                        <div>
                          <p className="text-[9px] uppercase font-black text-slate-450">Boshlandi</p>
                          <p className="text-slate-800 dark:text-slate-200 mt-0.5">
                            {sub.startsAt ? new Date(sub.startsAt).toLocaleDateString() : "Noma'lum"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase font-black text-slate-450">Tugaydi</p>
                          <p className="text-slate-800 dark:text-slate-200 mt-0.5">
                            {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : "Noma'lum"}
                          </p>
                        </div>
                      </div>

                      {isActive && (
                        <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl p-2 text-center text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 mt-1 border border-emerald-500/10">
                          <Clock className="w-3.5 h-3.5" />
                          {sub.remainingDays} kun qoldi
                        </div>
                      )}
                    </div>
                  );
                })
              )
            ) : (
              myRequests.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Clock className="h-10 w-10 text-slate-350 mx-auto opacity-55" />
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">So'rovlar tarixi bo'sh.</p>
                </div>
              ) : (
                myRequests.map((req: any) => (
                  <div key={req.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold">{req.packName}</h4>
                      <Badge className={cn(
                        "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                        req.status === "PENDING" && "bg-amber-500 text-white",
                        req.status === "APPROVED" && "bg-emerald-500 text-white",
                        req.status === "REJECTED" && "bg-rose-500 text-white"
                      )}>
                        {req.status === "PENDING" ? "Kutilmoqda" : req.status === "APPROVED" ? "Tasdiqlangan" : "Rad etilgan"}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-500">{new Date(req.requestedAt).toLocaleString()}</p>
                    {req.status === "REJECTED" && req.rejectionReason && (
                      <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-500/10 p-2 rounded-lg mt-1 font-medium">
                        Sabab: {req.rejectionReason}
                      </p>
                    )}
                  </div>
                ))
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    <VoiceAssistantPanel />
    </VoiceAssistantProvider>
  );
}
