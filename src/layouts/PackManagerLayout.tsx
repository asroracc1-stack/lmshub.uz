import { useTranslation } from "react-i18next";
import { useCallback, useState, Suspense } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Wallet,
  Crown,
  Clock,
  History,
  LogOut,
  Menu,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Package,
  FileText,
  MessagesSquare,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import NotificationsBell from "@/components/NotificationsBell";
import BrandLogo from "@/components/BrandLogo";
import ProfileMenu from "@/components/ProfileMenu";
import MobileSidebarDrawer from "@/components/MobileSidebarDrawer";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function PackManagerLayout() {
  const { t } = useTranslation();
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  usePageTitle();
  const [mobileOpen, setMobileOpen] = useState(false);
  const openMobileMenu = useCallback(() => setMobileOpen(true), []);
  const closeMobileMenu = useCallback(() => setMobileOpen(false), []);
  const [collapsed, setCollapsed] = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem("pm_sidebar_collapsed") === "1",
  );
  const toggleCollapsed = () =>
    setCollapsed((v) => {
      const n = !v;
      localStorage.setItem("pm_sidebar_collapsed", n ? "1" : "0");
      return n;
    });

  const nav = [
    { to: "/pack-manager/dashboard", label: t("dynamic.dashboard.dashboard"), icon: LayoutDashboard },
    { to: "/pack-manager/payments", label: "To'lovlar (Sales)", icon: Wallet },
    { to: "/pack-manager/subscriptions", label: "Obunalar", icon: Crown },
    { to: "/pack-manager/subscription-requests", label: "Obuna so'rovlari", icon: FileText },
    { to: "/pack-manager/packs", label: "Tariflar (Packs)", icon: Package },
    { to: "/pack-manager/mocks", label: "Imtihon paketlari", icon: FileText },
  ];

  const handleSignOut = async () => {
    await signOut();
    toast.success(t("dynamic.packmanagerlayout.chiqdingiz"));
    navigate("/", { replace: true });
  };

  const SidebarContent = ({ mini = false }: { mini?: boolean }) => (
    <>
      <div className="p-4 border-b border-sidebar-border shrink-0 flex items-center justify-between gap-2">
        <div className={cn("flex items-center gap-2 min-w-0", mini ? "justify-center w-full flex-col" : "flex-col items-start")}>
          <BrandLogo size={mini ? 36 : 56} />
          {!mini && (
            <p className="text-[11px] uppercase tracking-wider text-purple-500 font-semibold">{t("dynamic.packmanagerlayout.pack_manager")}</p>
          )}
        </div>
        {!mini && (
          <button
            onClick={toggleCollapsed}
            className="hidden md:flex p-1.5 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-smooth"
            aria-label="Yashirish"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 min-h-0 p-2 space-y-1 overflow-y-auto">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            onClick={closeMobileMenu}
            title={mini ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth",
                mini && "justify-center px-2",
                isActive
                  ? "bg-gradient-to-r from-purple-500/20 to-blue-500/10 text-purple-600 dark:text-purple-400 shadow-glow"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60",
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-purple-500")} />
                {!mini && <span className="flex-1">{item.label}</span>}
                {!mini && isActive && <ChevronRight className="h-3.5 w-3.5 text-purple-500" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-sidebar-border shrink-0">
        <button
          onClick={handleSignOut}
          title={mini ? "Chiqish" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-smooth",
            mini && "justify-center px-2",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" /> {!mini && "Chiqish"}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside
        className={cn(
          "hidden md:flex shrink-0 border-r border-sidebar-border bg-sidebar flex-col h-screen sticky top-0 transition-all duration-300",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <SidebarContent mini={collapsed} />
      </aside>

      <MobileSidebarDrawer open={mobileOpen} onClose={closeMobileMenu} routeKey={location.pathname}>
        <SidebarContent />
      </MobileSidebarDrawer>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card/40 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={openMobileMenu} aria-label="Menyu">
              <Menu className="h-5 w-5" />
            </Button>
            {collapsed && (
              <Button variant="ghost" size="icon" className="hidden md:flex" onClick={toggleCollapsed}>
                <PanelLeftOpen className="h-5 w-5" />
              </Button>
            )}
            <div className="hidden sm:block">
              <p className="text-xs uppercase tracking-wider text-purple-500 font-semibold">{t("dynamic.packmanagerlayout.pack_manager_panel")}</p>
              <p className="font-display font-semibold text-sm">
                Salom, {profile?.full_name || profile?.username || "Manager"} 💚
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <NotificationsBell />
            <ProfileMenu role={"payment_manager" as any} basePath="/pack-manager" />
          </div>
        </header>

        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          className="flex-1 p-4 md:p-6 overflow-y-auto"
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
