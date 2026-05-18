import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  LayoutDashboard, Building2, Users, GraduationCap, UserCog,
  Calendar as CalendarIcon, MessagesSquare, Wallet, Settings,
  User as UserIcon, LogOut, ChevronRight, ChevronDown, Activity,
  Menu, Search, Send, ShieldCheck, Trophy, FileText, Crown,
  Mic, Package, CreditCard, Target, Landmark, PanelLeftClose,
  PanelLeftOpen, Newspaper, Map, UserSquare, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import NotificationsBell from "@/components/NotificationsBell";
import CommandPalette from "@/components/CommandPalette";
import BrandLogo from "@/components/BrandLogo";
import ProfileMenu from "@/components/ProfileMenu";
import MobileSidebarDrawer from "@/components/MobileSidebarDrawer";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePrefetchHelper } from "@/hooks/useOptimizedQueries";
import TigerPlayer from "@/components/TigerPlayer";
import SmartClock from "@/components/SmartClock";

interface NavItem {
  to?: string;
  label: string;
  icon: any;
  children?: { to: string; label: string; icon: any }[];
}

export default function SuperAdminLayout() {
  const { profile, signOut } = useAuth();
  const { prefetchRouteData } = usePrefetchHelper();
  const navigate = useNavigate();
  const location = useLocation();
  usePageTitle();
  const { t } = useTranslation();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem("sa_sidebar_collapsed") === "1");
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Track manually toggled state for sections
  const [manualToggle, setManualToggle] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 800);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const toggleCollapsed = () => setCollapsed((v) => {
    const n = !v;
    localStorage.setItem("sa_sidebar_collapsed", n ? "1" : "0");
    return n;
  });

  const closeMobileMenu = useCallback(() => setMobileOpen(false), []);

  const nav: NavItem[] = [
    { to: "/super-admin/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { to: "/super-admin/organizations", label: t("nav.organizations"), icon: Building2 },
    { 
      label: "Barcha foydalanuvchilar", 
      icon: Users,
      children: [
        { to: "/super-admin/users", label: "Foydalanuvchilar", icon: UserSquare },
        { to: "/super-admin/regular-users", label: "Userlar", icon: UserIcon },
        { to: "/super-admin/admins", label: "Adminlar", icon: Shield },
        { to: "/super-admin/administrators", label: "Administratorlar", icon: ShieldCheck },
        { to: "/super-admin/teachers", label: "O'qituvchilar", icon: GraduationCap },
        { to: "/super-admin/students", label: "Talabalar", icon: UserIcon },
      ]
    },
    { to: "/super-admin/finance", label: t("nav.finance"), icon: Wallet },
    { to: "/super-admin/payment-receivers", label: t("nav.paymentReceivers"), icon: CreditCard },
    { to: "/super-admin/calendar", label: t("nav.calendar"), icon: CalendarIcon },
    { to: "/super-admin/messages", label: t("nav.messages"), icon: MessagesSquare },
    { to: "/super-admin/leaderboard", label: t("nav.leaderboard"), icon: Trophy },
    { to: "/super-admin/mocks", label: t("nav.ielts"), icon: FileText },
    { to: "/super-admin/speaking", label: t("nav.speaking"), icon: Mic },
    { to: "/super-admin/packs", label: t("nav.packs"), icon: Package },
    { to: "/super-admin/pricing-plans", label: t("nav.pricingPlans"), icon: CreditCard },
    { to: "/super-admin/news", label: "Yangiliklar", icon: Newspaper },
  ];

  const handleSignOut = async () => {
    await signOut();
    toast.success(t("common.logout"));
    navigate("/", { replace: true });
  };

  const SidebarContent = ({ mini = false }: { mini?: boolean }) => (
    <>
      <div className="p-4 border-b border-sidebar-border shrink-0 flex items-center justify-between gap-2">
        <div className={cn("flex items-center gap-2 min-w-0", mini && "justify-center w-full")}>
          <BrandLogo size={mini ? 38 : 56} />
          {!mini && <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-black">{t("roles.super_admin")}</p>}
        </div>
        {!mini && (
          <button onClick={toggleCollapsed} className="hidden md:flex p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-all">
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 min-h-0 p-2 space-y-1 overflow-y-auto thin-scrollbar">
        {nav.map((item) => {
          const hasActiveChild = item.children?.some(c => location.pathname === c.to);
          const isExpanded = manualToggle[item.label] ?? hasActiveChild;
          
          if (item.children) {
            return (
              <div key={item.label} className="space-y-1">
                <button
                  onClick={() => setManualToggle(prev => ({ ...prev, [item.label]: !isExpanded }))}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
                    mini && "justify-center px-2",
                    isExpanded ? "bg-primary/5 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", isExpanded ? "text-primary" : "text-muted-foreground")} />
                  {!mini && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-500", isExpanded && "rotate-180")} />
                    </>
                  )}
                </button>
                <AnimatePresence>
                  {isExpanded && !mini && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden pl-8 space-y-1 mt-1"
                    >
                      {item.children.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          onClick={closeMobileMenu}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-300",
                              isActive
                                ? "bg-gradient-primary text-white shadow-glow shadow-primary/20 scale-[1.02]"
                                : "text-muted-foreground hover:bg-sidebar-accent/40 hover:text-foreground",
                            )
                          }
                        >
                          <child.icon className="h-3.5 w-3.5 shrink-0" />
                          <span>{child.label}</span>
                        </NavLink>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to!}
              onClick={closeMobileMenu}
              onMouseEnter={() => prefetchRouteData(item.to!)}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
                  mini && "justify-center px-2",
                  isActive
                    ? "bg-primary text-white shadow-glow shadow-primary/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-white" : "text-muted-foreground group-hover:text-primary")} />
                  {!mini && <span className="flex-1">{item.label}</span>}
                  {!mini && isActive && <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-2 border-t border-sidebar-border shrink-0 space-y-1">
        <button onClick={handleSignOut} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-smooth", mini && "justify-center px-2")}>
          <LogOut className="h-4 w-4 shrink-0" /> {!mini && t("common.logout")}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex w-full bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      <CommandPalette />

      {/* Desktop Sidebar */}
      <aside className={cn("hidden md:flex shrink-0 border-r border-sidebar-border bg-white dark:bg-slate-900/50 backdrop-blur-3xl flex-col h-screen sticky top-0 transition-all duration-500 z-40", collapsed ? "w-20" : "w-64")}>
        <SidebarContent mini={collapsed} />
      </aside>

      {/* Mobile Drawer */}
      <MobileSidebarDrawer open={mobileOpen} onClose={closeMobileMenu} routeKey={location.pathname}>
        <SidebarContent />
      </MobileSidebarDrawer>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-20 border-b border-slate-100 dark:border-white/5 bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl flex items-center justify-center sticky top-0 z-30 w-full">
          <div className="w-full max-w-[1440px] px-6 flex items-center justify-between h-full">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></Button>
              {collapsed && <Button variant="ghost" size="icon" className="hidden md:flex" onClick={toggleCollapsed}><PanelLeftOpen className="h-5 w-5" /></Button>}
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest text-primary">Super Admin</p>
                <h2 className="font-black text-slate-900 dark:text-white">{t("common.hello")}, {profile?.full_name?.split(' ')[0] || "Asror"}! 👋</h2>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
                className="hidden lg:flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 text-xs text-slate-500 hover:border-primary/30 transition-all"
              >
                <Search className="h-4 w-4" />
                <span className="font-bold">{t("common.search")}...</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-white/10 border border-slate-100 dark:border-white/10 text-[10px] font-black">⌘K</kbd>
              </button>
              <SmartClock />
              <NotificationsBell />
              <ProfileMenu role="super_admin" basePath="/super-admin" />
            </div>
          </div>
        </header>

        {/* Tiger Guide Animation */}
        <AnimatePresence>
          {isTransitioning && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="fixed bottom-10 right-10 z-50 pointer-events-none"
            >
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-4 rounded-3xl shadow-2xl border border-primary/20 flex items-center gap-4">
                <div className="scale-50 -m-8">
                  <TigerPlayer text="" size={150} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary">Yo'lbarscha</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {manualToggle["Barcha foydalanuvchilar"] === false ? "Yashirdim! 🐯" : "Yangi bo'limni tayyorlayapman... 🐯"}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 p-6 lg:p-10 w-full max-w-[1440px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
