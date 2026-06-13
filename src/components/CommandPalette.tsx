import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  User as UserIcon,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";

interface Organization {
  id: string;
  name: string;
  logo_url?: string | null;
  slug: string;
}

interface UserRow {
  id: string;
  full_name: string | null;
  email: string;
  username: string | null;
  role: string;
  organization_id?: string | null;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { signOut, role: myRole } = useAuth();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpenEvent = () => setOpen(true);

    window.addEventListener("keydown", onKey);
    window.addEventListener("open-global-search", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-global-search", onOpenEvent);
    };
  }, []);

  const go = (to: string) => {
    setOpen(false);
    setSearch("");
    navigate(to);
  };

  // 1. Fetch Organizations (only for super_admin)
  const { data: orgsData } = useQuery({
    queryKey: ["organizations-search-global"],
    queryFn: async () => {
      const { data } = await api.get<any>("/organizations", { params: { size: 100 } });
      return data.content || [];
    },
    enabled: open && myRole === "super_admin",
  });
  const orgs: Organization[] = orgsData || [];

  // 2. Fetch Users (only for authorized admin/teacher roles)
  const isAuthorizedToSearchUsers = ["super_admin", "admin", "administrator", "teacher"].includes(myRole || "");
  const { data: usersData } = useQuery({
    queryKey: ["users-search-global"],
    queryFn: async () => {
      const { data } = await api.get<any>("/admin/users/all", { params: { size: 100 } });
      return Array.isArray(data) ? data : (data?.content || []);
    },
    enabled: open && isAuthorizedToSearchUsers,
  });
  const users: UserRow[] = usersData || [];

  // Dynamic quick actions depending on the role
  const getQuickActions = () => {
    const base = [
      { to: `/${myRole}/dashboard`, label: "Bosh sahifa", icon: LayoutDashboard },
      { to: `/${myRole}/profile`, label: "Profil sozlamalari", icon: UserIcon },
      { to: `/${myRole}/settings`, label: "Tizim sozlamalari", icon: Settings },
    ];

    if (myRole === "super_admin") {
      return [
        { to: "/super-admin/dashboard", label: "SuperAdmin Dashboard", icon: LayoutDashboard },
        { to: "/super-admin/organizations", label: "Tashkilotlar boshqaruvi", icon: Building2 },
        { to: "/super-admin/users", label: "Foydalanuvchilar boshqaruvi", icon: Users },
        { to: "/super-admin/settings", label: "Tizim sozlamalari", icon: Settings },
      ];
    } else if (myRole === "admin" || myRole === "administrator") {
      return [
        { to: `/${myRole}/dashboard`, label: "Admin Dashboard", icon: LayoutDashboard },
        { to: `/${myRole}/users`, label: "Foydalanuvchilar (Xodimlar & Talabalar)", icon: Users },
        { to: `/${myRole}/settings`, label: "Tizim sozlamalari", icon: Settings },
      ];
    } else if (myRole === "teacher") {
      return [
        { to: "/teacher/dashboard", label: "O'qituvchi Bosh sahifa", icon: LayoutDashboard },
        { to: "/teacher/students", label: "Mening talabalarim", icon: Users },
        { to: "/teacher/settings", label: "Sozlamalar", icon: Settings },
      ];
    }
    return base;
  };

  const quickActions = getQuickActions();

  // client-side spotlight filtering for smooth experience
  const filteredOrgs = orgs.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.slug.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUsers = users.filter((u) =>
    (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.username || "").toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadgeClasses = (role: string) => {
    switch (role.toLowerCase()) {
      case 'super_admin': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'admin': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'administrator': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'teacher': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
      case 'student': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role.toLowerCase()) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'administrator': return 'Administrator';
      case 'teacher': return "O'qituvchi";
      case 'student': return 'Talaba';
      case 'parent': return 'Ota-ona';
      case 'payment_manager': return 'Moliya Menegeri';
      default: return 'Foydalanuvchi';
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Sahifa, tashkilot yoki foydalanuvchini qidiring..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[450px] overflow-y-auto thin-scrollbar">
        <CommandEmpty>Hech narsa topilmadi</CommandEmpty>

        {/* 1. Quick Actions / Sahifalar */}
        <CommandGroup heading="Tezkor Amallar & Sahifalar">
          {quickActions.map((r) => (
            <CommandItem key={r.to} onSelect={() => go(r.to)} value={r.label} className="cursor-pointer">
              <r.icon className="mr-2.5 h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-slate-700 dark:text-slate-200">{r.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {/* 2. Organizations Results */}
        {myRole === "super_admin" && filteredOrgs.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tashkilotlar">
              {filteredOrgs.map((o) => (
                <CommandItem 
                  key={o.id} 
                  onSelect={() => go(`/super-admin/users?orgId=${o.id}`)} 
                  value={o.name}
                  className="cursor-pointer flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    {o.logo_url ? (
                      <Avatar className="h-7 w-7 border border-primary/20">
                        <img src={o.logo_url} alt={o.name} className="object-cover" />
                      </Avatar>
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-gradient-primary grid place-items-center text-white">
                        <Building2 className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{o.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono ml-2">/{o.slug}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                    Tashkilot
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* 3. Users Results */}
        {isAuthorizedToSearchUsers && filteredUsers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Foydalanuvchilar">
              {filteredUsers.map((u) => {
                const initials = (u.full_name || u.email).split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();
                return (
                  <CommandItem 
                    key={u.id} 
                    onSelect={() => {
                      if (myRole === "super_admin") {
                        go(`/super-admin/users?search=${encodeURIComponent(u.username || u.email)}`);
                      } else {
                        go(`/${myRole}/users?search=${encodeURIComponent(u.username || u.email)}`);
                      }
                    }} 
                    value={`${u.full_name} ${u.username} ${u.email}`}
                    className="cursor-pointer flex items-center justify-between py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-7 w-7 border border-primary/20">
                        <AvatarFallback className="bg-gradient-primary text-white text-[10px] font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">{u.full_name || "—"}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">@{u.username || "—"}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-semibold border ${getRoleBadgeClasses(u.role)}`}>
                      {getRoleLabel(u.role)}
                    </Badge>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        {/* 4. Global Settings & Actions */}
        <CommandGroup heading="Tizim Amallari">
          <CommandItem onSelect={() => { toggle(); setOpen(false); }} className="cursor-pointer">
            {theme === "dark" ? <Sun className="mr-2.5 h-4 w-4 text-muted-foreground" /> : <Moon className="mr-2.5 h-4 w-4 text-muted-foreground" />}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {theme === "dark" ? "Yorug' rejimga o'tish" : "Qorong'i rejimga o'tish"}
            </span>
          </CommandItem>
          <CommandItem
            onSelect={async () => {
              setOpen(false);
              await signOut();
              toast.success("Tizimdan chiqdingiz");
              navigate("/", { replace: true });
            }}
            className="text-destructive cursor-pointer"
          >
            <LogOut className="mr-2.5 h-4 w-4 text-destructive" />
            <span className="font-semibold text-destructive">Tizimdan chiqish</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
