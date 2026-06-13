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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  const { profile, signOut, user, loading: authLoading } = useAuth();
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
      <nav className="flex-1 min-h-0 py-3 px-2 space-y-0.5 overflow-y-auto thin-scrollbar">
        {finalNav.map((item) => {
          const hasActiveChild = item.children?.some((c) => {
            if (!c.to) return false;
            return location.pathname === c.to || location.pathname.startsWith(`${c.to}/`);
          });
          const isExpanded = manualToggle[item.label] ?? (hasActiveChild || false);

          if (item.children) {
            return (
              <div key={item.label} className="space-y-0.5">
                {/* Parent button */}
                <button
                  onClick={() =>
                    !mini && setManualToggle((prev) => ({ ...prev, [item.label]: !isExpanded }))
                  }
                  aria-expanded={isExpanded}
                  title={mini ? item.label : undefined}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                    mini ? "justify-center h-11 w-11 mx-auto px-0" : "px-3 py-2.5",
                    isExpanded || hasActiveChild
                      ? "bg-primary/10 text-primary"
                      : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <item.icon
                    size={20}
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
                      <div className="pl-4 pt-0.5 pb-1 space-y-0.5 relative">
                        {/* Vertical guide line */}
                        <div className="absolute left-[22px] top-0 bottom-2 w-px bg-slate-200 dark:bg-slate-700/60 rounded-full" />
                        {item.children.map((child) => (
                          <NavLink
                            key={child.to}
                            to={child.to!}
                            onClick={handleMobileNavClick}
                            className={({ isActive }) =>
                              cn(
                                "relative flex items-center gap-2.5 pl-5 pr-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200",
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
                                  size={15}
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
                  "group flex items-center gap-3 rounded-xl text-sm font-semibold transition-all duration-200",
                  mini ? "justify-center h-11 w-11 mx-auto px-0" : "px-3 py-2.5",
                  isActive
                    ? "bg-primary text-white shadow-glow-purple"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={20}
                    className={cn(
                      "shrink-0 transition-colors",
                      isActive
                        ? "text-white"
                        : "text-slate-400 group-hover:text-primary dark:group-hover:text-primary-glow"
                    )}
                  />
                  {!mini && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {isActive && <ChevronRight size={13} className="opacity-50 shrink-0" />}
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
          "shrink-0 border-t border-slate-200 dark:border-white/5 py-2 px-2 space-y-0.5"
        )}
      >
        <a
          href="https://t.me/LMSHub_bot"
          target="_blank"
          rel="noopener noreferrer"
          title={mini ? t("common.telegramBot") : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl text-sm font-semibold text-slate-500 dark:text-slate-400",
            "hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all duration-200",
            mini ? "justify-center h-11 w-11 mx-auto px-0" : "px-3 py-2.5"
          )}
        >
          <Send size={18} className="shrink-0 text-slate-400" />
          {!mini && (
            <span className="truncate">{t("common.telegramBot")}</span>
          )}
        </a>
        <button
          onClick={handleSignOut}
          title={mini ? t("common.logout") : undefined}
          className={cn(
            "w-full flex items-center gap-3 rounded-xl text-sm font-semibold text-red-500",
            "hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200",
            mini ? "justify-center h-11 w-11 mx-auto px-0" : "px-3 py-2.5"
          )}
        >
          <LogOut size={18} className="shrink-0" />
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
    <div
      className={cn(
        "h-screen flex w-full overflow-hidden transition-colors duration-500",
        theme === "dark" ? "bg-[#0B0714] text-slate-100" : "bg-[#FCFAFF] text-slate-900"
      )}
    >
      <TigerLoader isLoading={authLoading} />
      <CommandPalette />

      {/* ── Desktop sidebar ─────────────────────────── */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "hidden md:flex shrink-0 border-r flex-col h-full z-50 overflow-hidden",
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
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto relative thin-scrollbar">
        {/* Topbar */}
        <header
          className={cn(
            "shrink-0 h-16 border-b sticky top-0 z-30 transition-all w-full flex justify-center",
            theme === "dark"
              ? "bg-[#140D23]/60 backdrop-blur-xl border-[#2E1E52]"
              : "bg-white/80 backdrop-blur-md border-[#E8DDFB] shadow-sm"
          )}
        >
          <div className="w-full px-4 flex items-center justify-between h-full">
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

            <div className="flex items-center gap-2 md:gap-4 h-full py-2">
              <SmartClock />
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
              <div className="flex items-center gap-1.5 md:gap-3 pl-2 md:pl-4 border-l border-border h-8">
                {/* Referral button */}
                <button
                  onClick={() => navigate(`${basePath}/referral`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500 text-white hover:bg-purple-600 transition-colors text-xs font-semibold shadow-sm shadow-purple-500/30"
                  title={t("nav.referral")}
                >
                  <Gift className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t("nav.referral")}</span>
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
          className="flex-1 p-5 w-full"
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
    </div>
  );
}
