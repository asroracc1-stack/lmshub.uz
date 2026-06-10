import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  User as UserIcon,
  Settings,
  ShieldCheck,
  Activity,
  Wallet,
  Bell,
  LogOut,
  Users,
  Sun,
  Moon,
  Globe,
  ChevronRight,
  Gift,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/axios";
import { usePrefetchHelper } from "@/hooks/useOptimizedQueries";

type Role = "super_admin" | "admin" | "administrator" | "teacher" | "student" | "user" | "parent" | "payment_manager";

interface ProfileMenuProps {
  role: Role;
  basePath: string;
}

const langs = [
  { code: "uz", label: "O'zbek", flag: "🇺🇿" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

export default function ProfileMenu({ role, basePath }: ProfileMenuProps) {
  const { profile, user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { prefetchRouteData } = usePrefetchHelper();

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || profile?.username || "User";
  const displayEmail = user?.email || profile?.email || "user@example.com";

  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  const handleSignOut = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      console.warn("Logout error on backend, clearing frontend anyway.");
    }
    await signOut();
    toast.success(t("common.logout"));
    navigate("/signin", { replace: true });
  };

  const go = (p: string) => navigate(p);

  const roleBadgeEmojis: Record<Role, string> = {
    super_admin: "👑 ",
    admin: "⭐ ",
    administrator: "🛡 ",
    teacher: "🎓 ",
    student: "🎒 ",
    user: "🔥 ",
    parent: "👨‍👩‍👧 ",
    payment_manager: "💼 ",
  };

  const roleBadgeClass: Record<Role, string> = {
    super_admin: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    admin: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    administrator: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    teacher: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    student: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    user: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    parent: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
    payment_manager: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex items-center gap-2 rounded-full p-0.5 hover:ring-2 hover:ring-emerald-500/30 transition-all outline-none">
          <Avatar className="h-9 w-9 border border-emerald-500/30 shadow-glow-emerald">
            <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
            <AvatarFallback className="bg-gradient-premium text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={12}
        className="w-80 p-0 overflow-hidden border-border/40 bg-card/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] rounded-2xl animate-in fade-in-0 zoom-in-95"
      >
        {/* Header - Real-time Data */}
        <div className="p-5 border-b border-border/40 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-14 w-14 border-2 border-emerald-500/20 shadow-glow-emerald">
                <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
                <AvatarFallback className="bg-gradient-premium text-white font-bold text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-card" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold truncate text-base leading-tight">
                {displayName}
              </p>
              <p className="text-xs text-muted-foreground truncate mb-1.5">{displayEmail}</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${roleBadgeClass[role]}`}>
                {roleBadgeEmojis[role] + t("roles." + role)}
              </span>
            </div>
          </div>
        </div>

        <div className="p-2 space-y-0.5">
          {/* Profile */}
          <DropdownMenuItem onClick={() => go(`${basePath}/profile`)} className="rounded-xl gap-3 cursor-pointer py-3 focus:bg-emerald-500/10 focus:text-emerald-600 dark:focus:text-emerald-400 group">
            <UserIcon className="h-4.5 w-4.5 text-muted-foreground group-focus:text-emerald-500 transition-colors" />
            <span className="text-sm font-medium">{t("common.profile")}</span>
          </DropdownMenuItem>

          {/* Referral */}
          <DropdownMenuItem onClick={() => go(`${basePath}/referral`)} className="rounded-xl gap-3 cursor-pointer py-3 focus:bg-emerald-500/10 focus:text-emerald-600 dark:focus:text-emerald-400 group">
            <Gift className="h-4.5 w-4.5 text-muted-foreground group-focus:text-emerald-500 transition-colors" />
            <span className="text-sm font-medium">{t("nav.referral")}</span>
            <span className="ml-auto text-[10px] font-bold text-emerald-500 uppercase tracking-widest">+10 🪙</span>
          </DropdownMenuItem>

          {role === "super_admin" && (
            <>
              <DropdownMenuItem onClick={() => go(`${basePath}/subscriptions`)} className="rounded-xl gap-3 cursor-pointer py-3 focus:bg-emerald-500/10 focus:text-emerald-600 dark:focus:text-emerald-400 group">
                <Wallet className="h-4.5 w-4.5 text-muted-foreground group-focus:text-emerald-500 transition-colors" />
                <span className="text-sm font-medium">{t("nav.subscriptionManagement")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => go(`${basePath}/admins`)} className="rounded-xl gap-3 cursor-pointer py-3 focus:bg-emerald-500/10 focus:text-emerald-600 dark:focus:text-emerald-400 group">
                <Users className="h-4.5 w-4.5 text-muted-foreground group-focus:text-emerald-500 transition-colors" />
                <span className="text-sm font-medium">{t("nav.packManagers")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => go(`${basePath}/activity`)} className="rounded-xl gap-3 cursor-pointer py-3 focus:bg-emerald-500/10 focus:text-emerald-600 dark:focus:text-emerald-400 group">
                <ShieldCheck className="h-4.5 w-4.5 text-muted-foreground group-focus:text-emerald-500 transition-colors" />
                <span className="text-sm font-medium">{t("nav.securityCenter")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { prefetchRouteData(`${basePath}/activity`); go(`${basePath}/activity`); }} className="rounded-xl gap-3 cursor-pointer py-3 focus:bg-emerald-500/10 focus:text-emerald-600 dark:focus:text-emerald-400 group">
                <Activity className="h-4.5 w-4.5 text-muted-foreground group-focus:text-emerald-500 transition-colors" />
                <span className="text-sm font-medium">{t("nav.systemLogs")}</span>
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuItem onClick={() => go(`${basePath}/settings`)} className="rounded-xl gap-3 cursor-pointer py-3 focus:bg-emerald-500/10 focus:text-emerald-600 dark:focus:text-emerald-400 group">
            <Settings className="h-4.5 w-4.5 text-muted-foreground group-focus:text-emerald-500 transition-colors" />
            <span className="text-sm font-medium">{t("nav.settings")}</span>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => go(`${basePath}/notifications`)} className="rounded-xl gap-3 cursor-pointer py-3 focus:bg-emerald-500/10 focus:text-emerald-600 dark:focus:text-emerald-400 group">
            <Bell className="h-4.5 w-4.5 text-muted-foreground group-focus:text-emerald-500 transition-colors" />
            <span className="text-sm font-medium">{t("nav.notifications")}</span>
          </DropdownMenuItem>

          {/* Theme Toggle */}
          <DropdownMenuItem 
            onClick={(e) => {
              e.preventDefault();
              setTheme(theme === "dark" ? "light" : "dark");
            }} 
            className="rounded-xl gap-3 cursor-pointer py-3 focus:bg-emerald-500/10 focus:text-emerald-600 dark:focus:text-emerald-400 group"
          >
            {theme === "dark" ? <Sun className="h-4.5 w-4.5 text-muted-foreground group-focus:text-emerald-500 transition-colors" /> : <Moon className="h-4.5 w-4.5 text-muted-foreground group-focus:text-emerald-500 transition-colors" />}
            <span className="text-sm font-medium">{theme === "dark" ? t("settings.themeLight", "Kunduzgi mavzu") : t("settings.themeDark", "Tungi mavzu")}</span>
            <div className="ml-auto w-8 h-4.5 rounded-full bg-slate-200 dark:bg-slate-700 relative flex items-center px-0.5">
               <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all ${theme === "dark" ? 'ml-auto' : ''}`} />
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-border/40 my-1.5" />
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("settings.language", "Dastur tili")}
          </div>
          <div className="grid grid-cols-3 gap-1 px-2 pb-1">
            {langs.map((l) => (
              <DropdownMenuItem
                key={l.code}
                onClick={() => i18n.changeLanguage(l.code)}
                className={`flex flex-col items-center justify-center gap-1 py-2 rounded-xl cursor-pointer ${
                  i18n.language === l.code ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold ring-1 ring-emerald-500/20" : ""
                }`}
              >
                <span className="text-xl leading-none">{l.flag}</span>
                <span className="text-[10px] uppercase tracking-wider">{l.code}</span>
              </DropdownMenuItem>
            ))}
          </div>
        </div>

        <DropdownMenuSeparator className="bg-border/40 my-1.5" />
        <div className="p-2">
          <DropdownMenuItem
            onClick={handleSignOut}
            className="rounded-xl gap-3 cursor-pointer py-3 text-destructive focus:text-destructive focus:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4.5 w-4.5" />
            <span className="text-sm font-bold">{t("common.logout")}</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
