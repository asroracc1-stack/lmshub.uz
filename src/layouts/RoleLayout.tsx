import { useCallback, useState, ComponentType, useMemo, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import TigerPlayer from "@/components/TigerPlayer";
import NotificationsBell from "@/components/NotificationsBell";
import BrandLogo from "@/components/BrandLogo";
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

export default function RoleLayout({ brand = "LMSHub", subtitle, nav: initialNav, role = "user", basePath = "/user" }: RoleLayoutProps) {
  const { profile, signOut, user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const { data: orgData } = useOrganization(profile?.organization_id);
  const { prefetchRouteData } = usePrefetchHelper();
  const navigate = useNavigate();
  const location = useLocation();
  usePageTitle();
  const { t } = useTranslation();
  const packAccess = usePackAccess();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const openMobileMenu = useCallback(() => setMobileOpen(true), []);
  const closeMobileMenu = useCallback(() => setMobileOpen(false), []);
  
  const STORAGE_KEY = `rl_sidebar_collapsed_${role}`;
  const [collapsed, setCollapsed] = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "1",
  );

  const [manualToggle, setManualToggle] = useState<Record<string, boolean>>({});

  const toggleCollapsed = () =>
    setCollapsed((v) => {
      const n = !v;
      localStorage.setItem(STORAGE_KEY, n ? "1" : "0");
      return n;
    });

  const finalNav = useMemo(() => {
    if (initialNav) return initialNav;
    return getSidebarRoutes(role, t, packAccess);
  }, [initialNav, role, t, packAccess]);

  // Auto-collapse logic when navigating to non-child routes
  useEffect(() => {
    const updatedToggles: Record<string, boolean> = {};
    finalNav.forEach(item => {
      if (item.children) {
        const isActive = item.children.some(c => location.pathname === c.to);
        updatedToggles[item.label] = isActive;
      }
    });
    setManualToggle(updatedToggles);
  }, [location.pathname, finalNav]);

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

  const SidebarContent = ({ mini = false }: { mini?: boolean }) => (
    <>
      <div className="p-6 border-b border-sidebar-border shrink-0 flex items-center justify-between gap-3">
        <div className={cn("flex items-center gap-3 min-w-0", mini ? "justify-center" : "")}>
          <Logo 
            size={mini ? 36 : 52} 
            showText={!mini} 
            variant={theme === "dark" ? "light" : "dark"} 
            className="transition-all duration-300"
          />
        </div>
        {!mini && (
          <button
            onClick={toggleCollapsed}
            className="hidden md:flex p-2 rounded-lg hover:bg-slate-100/80 dark:hover:bg-sidebar-accent text-slate-400 hover:text-slate-600 dark:hover:text-foreground transition-all"
            aria-label="Menyuni yashirish"
          >
            <PanelLeftClose size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 min-h-0 p-3 space-y-1 overflow-y-auto thin-scrollbar">
        {finalNav.map((item) => {
          const hasActiveChild = item.children?.some(c => {
            if (!c.to) return false;
            return location.pathname === c.to || location.pathname.startsWith(`${c.to}/`);
          });
          const isExpanded = manualToggle[item.label] ?? (hasActiveChild || false);

          return item.children ? (
            <div key={item.label} className="space-y-1">
              <button
                onClick={() => setManualToggle(prev => ({ ...prev, [item.label]: !isExpanded }))}
                aria-expanded={isExpanded}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  mini && "justify-center px-2",
                  isExpanded || hasActiveChild 
                    ? "bg-primary/10 text-primary font-bold" 
                    : "text-slate-500 hover:bg-slate-100/30 dark:hover:bg-sidebar-accent/20"
                )}
              >
                <item.icon size={20} className={cn("shrink-0", (isExpanded || hasActiveChild) ? "text-primary" : "text-slate-400")} />
                {!mini && (
                  <>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    <ChevronDown size={14} className={cn("transition-transform duration-300", isExpanded && "rotate-180")} />
                  </>
                )}
              </button>
              <AnimatePresence>
                {isExpanded && !mini && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    role="region"
                    aria-label={`${item.label} submenu`}
                    className="overflow-hidden pl-8 space-y-1 relative"
                  >
                    {/* Hierarchical line */}
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800" />
                    
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to!}
                        onClick={closeMobileMenu}
                        className={({ isActive }) =>
                          cn(
                            "relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200",
                            isActive
                              ? "bg-primary/10 text-primary font-bold shadow-sm"
                              : "text-slate-500 hover:text-slate-900 dark:hover:text-foreground hover:bg-slate-50 dark:hover:bg-sidebar-accent/20",
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <motion.div 
                                layoutId="active-dot"
                                className="absolute -left-[17px] w-2 h-2 rounded-full bg-primary" 
                              />
                            )}
                            <child.icon size={16} className={cn(isActive ? "text-primary" : "text-slate-400")} />
                            <span>{child.label}</span>
                          </>
                        )}
                      </NavLink>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <NavLink
              key={item.to}
              to={item.to!}
              end
              onClick={closeMobileMenu}
              onMouseEnter={() => item.to && prefetchRouteData(item.to)}
              title={mini ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-300",
                  mini && "justify-center px-2",
                  isActive
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} className={cn("shrink-0 transition-colors", !isActive ? "text-slate-400 group-hover:text-emerald-500 dark:group-hover:text-emerald-400" : "text-white")} />
                  {!mini && <span className="flex-1 truncate">{item.label}</span>}
                  {!mini && isActive && <ChevronRight size={14} className="opacity-60" />}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-200 dark:border-white/5 space-y-1 shrink-0">
        <a
          href="https://t.me/CRMSystme_bot"
          target="_blank"
          rel="noopener noreferrer"
          title={mini ? (role === 'user' ? "Telegram bot" : t("common.telegramBot")) : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all",
            mini && "justify-center px-2",
          )}
        >
          <Send size={18} className="shrink-0 text-slate-400" /> {!mini && (role === 'user' ? "Telegram bot" : t("common.telegramBot"))}
        </a>
        <button
          onClick={handleSignOut}
          title={mini ? (role === 'user' ? "Chiqish" : t("common.logout")) : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all",
            mini && "justify-center px-2",
          )}
        >
          <LogOut size={18} className="shrink-0" /> {!mini && (role === 'user' ? "Chiqish" : t("common.logout"))}
        </button>
      </div>
    </>
  );

  const isExamPage = location.pathname.includes('/exam') || location.pathname.includes('/take');
  if (isExamPage) {
    return (
      <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden">
        <Outlet />
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen flex w-full transition-colors duration-500",
      theme === "dark" ? "bg-[#020617] text-slate-100" : "bg-slate-50 text-slate-900"
    )}>
      <TigerLoader isLoading={authLoading} />
      <CommandPalette />
      
      <aside
        className={cn(
          "hidden md:flex shrink-0 border-r flex-col h-screen sticky top-0 transition-all duration-300 z-40",
          collapsed ? "w-20" : "w-64",
          "border-r transition-all duration-500 z-50",
          theme === "dark" 
            ? "bg-slate-950 border-white/5 shadow-2xl" 
            : "bg-white border-slate-200 shadow-xl shadow-slate-200/40"
        )}
      >
        <SidebarContent mini={collapsed} />
      </aside>

      <MobileSidebarDrawer open={mobileOpen} onClose={closeMobileMenu} routeKey={location.pathname}>
        <SidebarContent />
      </MobileSidebarDrawer>

      <div className="flex-1 flex flex-col min-w-0">
        <header className={cn(
          "h-16 border-b sticky top-0 z-30 transition-all w-full flex justify-center",
          theme === "dark"
            ? "bg-slate-950/50 backdrop-blur-xl border-white/5"
            : "bg-white/80 backdrop-blur-md border-slate-200 shadow-sm"
        )}>
          <div className="w-full max-w-[1440px] px-4 md:px-8 flex items-center justify-between h-full">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-lg"
                onClick={openMobileMenu}
                aria-label="Menyu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              {collapsed && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden md:flex rounded-lg"
                  onClick={toggleCollapsed}
                  aria-label="Menyuni ochish"
                  title="Menyuni ochish"
                >
                  <PanelLeftOpen className="h-5 w-5" />
                </Button>
              )}
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
                <NotificationsBell />
                <ProfileMenu role={role} basePath={basePath} />
              </div>
            </div>
          </div>
        </header>

        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 p-4 md:p-8 w-full max-w-[1440px] mx-auto"
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}
