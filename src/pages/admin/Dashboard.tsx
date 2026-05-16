import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, Users, GraduationCap, UserCog, Activity, 
  Calendar as CalendarIcon, Plus, Send, Settings, ShieldCheck, 
  Mail, Phone, MapPin, Globe, ArrowUpRight, TrendingUp,
  LayoutDashboard, UserPlus, FilePlus, BellRing, Sparkles, Crown,
  ArrowRight, Info, AlertCircle, ShoppingCart
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminDashboard, useUpcomingEvents, useDashboardMutations } from "@/hooks/useOptimizedQueries";
import { toast } from "sonner";
import TigerPlayer from "@/components/TigerPlayer";
import AddMemberModal from "@/components/AddMemberModal";
import OrganizationSettingsModal from "@/components/OrganizationSettingsModal";
import SubscriptionModal from "@/components/SubscriptionModal";
import { cn } from "@/lib/utils";
import { StatsSkeleton, ListSkeleton } from "@/components/Skeletons";
import { format } from "date-fns";
import { uz } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function AdminDashboard() {
  const { profile } = useAuth();
  const { data: stats, isLoading: statsLoading, isError: statsError } = useAdminDashboard();
  const { data: events, isLoading: eventsLoading } = useUpcomingEvents();
  const { addTeacher, addStudent, generateReport, updateOrgSettings } = useDashboardMutations();

  const [clockSettings, setClockSettings] = useState(() => {
    const saved = localStorage.getItem("smart-clock-settings");
    return saved ? JSON.parse(saved) : { visible: true, sound: true };
  });

  const [activeModal, setActiveModal] = useState<string | null>(null);

  const statCards = useMemo(() => [
    { label: "O'qituvchilar", value: stats?.teachersCount || 0, growth: stats?.teacherGrowth || 0, icon: GraduationCap, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Talabalar", value: stats?.studentsCount || 0, growth: stats?.studentGrowth || 0, icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Adminlar", value: stats?.superAdminsCount || 0, growth: stats?.superAdminGrowth || 0, icon: ShieldCheck, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Administratorlar", value: stats?.orgAdminsCount || 0, growth: stats?.orgAdminGrowth || 0, icon: UserCog, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { label: "Tadbirlar", value: stats?.eventsCount || 0, growth: stats?.eventGrowth || 0, icon: CalendarIcon, color: "text-amber-500", bg: "bg-amber-500/10" },
  ], [stats]);

  const isExpiring = stats?.subscriptionStatus === "EXPIRING";

  const handleClockUpdate = (settings: { visible: boolean; sound: boolean }) => {
    setClockSettings(settings);
    localStorage.setItem("smart-clock-settings", JSON.stringify(settings));
    window.dispatchEvent(new Event("storage")); // Trigger sync with SmartClock component
  };

  const handleQuickAction = (label: string) => {
    setActiveModal(label);
  };

  if (statsError) {
    return (
      <div className="p-6 lg:p-10 space-y-10 bg-slate-50 dark:bg-slate-950 min-h-screen flex flex-col items-center justify-center">
        <motion.div 
          initial={{ rotate: -5 }}
          animate={{ rotate: 5 }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: "mirror" }}
        >
          <TigerPlayer text="Serverni ta'mirlayapman, biroz kuting... 🐯🛠️" size={300} />
        </motion.div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Ulanishda xatolik yuz berdi</h2>
          <p className="text-slate-500 max-w-md mx-auto">Tizim ma'lumotlarni yuklashda qiyinchilikka duch keldi. Iltimos, bir ozdan so'ng qayta urinib ko'ring.</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="mt-4 rounded-xl border-primary/20">
            Qayta urinish
          </Button>
        </div>
      </div>
    );
  }

  if (statsLoading || eventsLoading) {
    return (
      <div className="p-6 lg:p-10 space-y-10 bg-slate-50 dark:bg-slate-950 min-h-screen flex flex-col items-center justify-center">
      <motion.div 
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        <TigerPlayer text="Hamma narsa hisoblandi, raqamlar joyida! 🐯📊" size={300} />
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-ping -z-10" />
      </motion.div>
      <div className="w-full max-w-5xl space-y-8 mt-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-white/50 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
      </div>
    );
  }

  const handleMemberSubmit = async (data: any) => {
    if (activeModal === "O'qituvchi qo'shish") {
      await addTeacher.mutateAsync(data);
    } else if (activeModal === "Talaba qo'shish") {
      await addStudent.mutateAsync(data);
    }
  };

  const handleOrgUpdate = async (data: any) => {
    await updateOrgSettings.mutateAsync(data);
    setActiveModal("success-branding");
  };

  const getModalType = () => {
    if (activeModal === "O'qituvchi qo'shish") return "teacher";
    if (activeModal === "Talaba qo'shish") return "student";
    return null;
  };

  return (
    <div className="p-6 lg:p-10 space-y-10 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-500 font-sans relative overflow-hidden">

      <AddMemberModal 
        isOpen={activeModal === "O'qituvchi qo'shish" || activeModal === "Talaba qo'shish"}
        type={getModalType()}
        onClose={() => setActiveModal(null)}
        onSubmit={handleMemberSubmit}
      />

      <OrganizationSettingsModal 
        isOpen={activeModal === "settings"}
        onClose={() => setActiveModal(null)}
        orgData={stats?.organization}
        onUpdate={handleOrgUpdate}
        clockSettings={clockSettings}
        onClockUpdate={handleClockUpdate}
      />

      <SubscriptionModal 
        isOpen={activeModal === "Paket yangilash"}
        onClose={() => setActiveModal(null)}
      />
      
      {/* Report Generation Overlay */}
      <Dialog open={generateReport.isPending}>
        <DialogContent className="sm:max-w-[400px] border-none bg-white dark:bg-slate-900 shadow-2xl rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-6" aria-describedby="report-gen-desc">
          <DialogHeader className="sr-only">
            <DialogTitle>Hisobot Tayyorlanmoqda</DialogTitle>
            <DialogDescription id="report-gen-desc">Tizim joriy tashkilot statistikasini yig'moqda.</DialogDescription>
          </DialogHeader>
          <motion.div
            animate={{ rotate: [0, 2, 0, -2, 0], scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <TigerPlayer text="Tahlil qilinyapti... 🐯📊" size={200} />
          </motion.div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Ma'lumotlar tahlil qilinmoqda</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Tizim joriy tashkilot statistikasini yig'moqda. Iltimos, kutib turing.</p>
          </div>
          <div className="w-full h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Branding Tiger */}
      <AnimatePresence>
        {activeModal === "success-branding" && (
          <Dialog open={true} onOpenChange={() => setActiveModal(null)}>
            <DialogContent className="sm:max-w-[400px] border-none bg-white dark:bg-slate-900 shadow-2xl rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-6" aria-describedby="success-brand-desc">
              <DialogHeader className="sr-only">
                <DialogTitle>Muvaffaqiyatli!</DialogTitle>
                <DialogDescription id="success-brand-desc">Yangi brendingiz muborak!</DialogDescription>
              </DialogHeader>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative"
              >
                <TigerPlayer text="Ajoyib! 🐯👍" size={180} />
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="absolute -top-2 -right-2 bg-emerald-500 text-white p-2 rounded-full shadow-lg"
                >
                  <ShieldCheck className="h-5 w-5" />
                </motion.div>
              </motion.div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Yangi brendingiz muborak! ✨</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Tashkilot logotipi va ma'lumotlari butun platforma bo'ylab muvaffaqiyatli yangilandi.</p>
              </div>
              <Button onClick={() => setActiveModal(null)} className="w-full h-12 rounded-lg bg-gradient-primary shadow-glow text-white font-bold uppercase text-[10px] tracking-widest">
                Davom etish
              </Button>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
      
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 dark:bg-primary/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
      
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-primary/10 text-primary border-none text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full">Tashkilot Admini</Badge>
            <Badge variant="outline" className="text-muted-foreground border-slate-200 dark:border-white/10 text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full">
              {stats?.organization?.name || "PDP"}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Tizim Boshqaruvi</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Xush kelibsiz, {profile?.full_name?.split(' ')[0]}! Bugungi ko'rsatkichlar bilan tanishing.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => setActiveModal("settings")}
            className="h-11 rounded-lg bg-white/80 dark:bg-white/5 backdrop-blur-md border-slate-200 dark:border-white/5 gap-2 font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Settings className="h-4 w-4" /> Sozlamalar
          </Button>
          <Button 
            onClick={() => generateReport.mutate()}
            disabled={generateReport.isPending}
            className="h-11 rounded-lg bg-gradient-primary shadow-md text-white font-bold uppercase tracking-widest text-[10px] px-8 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {generateReport.isPending ? "Tayyorlanmoqda..." : "Hisobot Yaratish"}
          </Button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {statCards.map((s, i) => (
          <motion.div 
            key={s.label} 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.1 }}
            className="cursor-default"
          >
            <Card className="p-6 border border-slate-200 dark:border-white/5 shadow-sm bg-white dark:bg-slate-900/40 rounded-xl group hover:shadow-md transition-all duration-300 relative overflow-hidden">
              <div className="relative flex items-center justify-between mb-4">
                <div className={cn("p-3 rounded-lg transition-colors", s.bg)}>
                  <s.icon className={cn("h-5 w-5", s.color)} />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{s.label}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {s.value}
                  </p>
                </div>
              </div>
              <div className={cn(
                "relative flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md w-fit transition-colors",
                s.growth >= 0 
                  ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" 
                  : "text-red-600 bg-red-50 dark:bg-red-500/10"
              )}>
                <TrendingUp className={cn("h-3 w-3", s.growth < 0 && "rotate-180")} /> 
                {s.growth > 0 ? `+${s.growth.toFixed(1)}%` : `${s.growth.toFixed(1)}%`} bu oyda
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-8">
          {/* Organization Profile Card */}
          <Card className="p-8 border border-slate-200 dark:border-white/5 shadow-sm bg-white dark:bg-slate-900/40 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Building2 className="h-24 w-24 -rotate-12" />
            </div>
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center relative z-10">
              <div className="w-24 h-24 rounded-xl bg-slate-100 dark:bg-white/5 p-1 shrink-0 border border-slate-200 dark:border-white/10 shadow-inner">
                <div className="w-full h-full rounded-lg bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden">
                  {stats?.organization?.logoUrl ? (
                    <img src={stats.organization.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="h-10 w-10 text-primary/40" />
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{stats?.organization?.name || "Tashkilot nomi"}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> {stats?.organization?.address || "Toshkent shahri, O'zbekiston"}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-lg border border-slate-100 dark:border-white/5">
                    <Mail className="h-3.5 w-3.5 text-primary/60" /> {stats?.organization?.email || "info@example.com"}
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-lg border border-slate-100 dark:border-white/5">
                    <Phone className="h-3.5 w-3.5 text-primary/60" /> {stats?.organization?.phone || "+998 90 123 45 67"}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Upcoming Events Card */}
          <Card className="p-8 border border-slate-200 dark:border-white/5 shadow-sm bg-white dark:bg-slate-900/40 rounded-xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Activity className="h-6 w-6 text-primary" /> Yaqindagi Voqealar
              </h3>
              <Button variant="ghost" className="text-[10px] font-bold uppercase tracking-widest text-primary gap-1 hover:bg-primary/5 rounded-lg px-3">
                Barchasi <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            
            <div className="space-y-3">
              {events && events.length > 0 ? (
                events.map((ev, i) => (
                  <motion.div key={ev.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-all border border-slate-100 dark:border-white/5 group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-white dark:bg-white/10 flex flex-col items-center justify-center border border-slate-100 dark:border-white/5 shadow-sm group-hover:border-primary/30 transition-colors">
                        <p className="text-[9px] font-bold uppercase text-primary leading-none mb-1">{format(new Date(ev.startsAt), "MMM", { locale: uz })}</p>
                        <p className="text-base font-bold text-slate-900 dark:text-white leading-none">{format(new Date(ev.startsAt), "d")}</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{ev.title}</p>
                        <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                          <MapPin className="h-3 w-3" /> {ev.location || "Asosiy bino"} • {format(new Date(ev.startsAt), "HH:mm")}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-bold uppercase px-2 py-0.5 rounded-md">Kutilmoqda</Badge>
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.05, 1],
                      rotate: [0, 5, 0, -5, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <TigerPlayer text="Dam olish vaqti! Hozircha tadbirlar yo'q... 🐯✨" size={220} />
                  </motion.div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Tinchlik va osoyishtalik</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Sidebar Actions & Subscription */}
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
          <Card className="p-8 border border-slate-200 dark:border-white/5 shadow-sm bg-white dark:bg-slate-900/40 rounded-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-3 mb-6">
              <BellRing className="h-5 w-5 text-amber-500" /> Tezkor Amallar
            </h3>
            <div className="grid gap-2">
              {[
                { label: "O'qituvchi qo'shish", icon: GraduationCap, color: "bg-blue-500" },
                { label: "Talaba qo'shish", icon: UserPlus, color: "bg-emerald-500" },
                { label: "Tadbir yaratish", icon: FilePlus, color: "bg-purple-500" },
                { label: "Hisob-faktura", icon: Send, color: "bg-amber-500" },
              ].map((q) => (
                <button 
                  key={q.label} 
                  onClick={() => {
                    if (q.label.includes("qo'shish")) {
                      handleQuickAction(q.label);
                    } else {
                      toast.info(`${q.label} moduli tez orada qo'shiladi... 🐯`, {
                        className: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-bold"
                      });
                    }
                  }} 
                  className="flex items-center gap-3.5 p-3.5 rounded-lg bg-slate-50 dark:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 hover:bg-white dark:hover:bg-white/10 transition-all duration-200 group text-left shadow-sm"
                >
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105", q.color)}>
                    <q.icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{q.label}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card className={cn(
            "p-8 border border-transparent shadow-lg rounded-xl text-white relative overflow-hidden group transition-all duration-500",
            isExpiring ? "bg-gradient-to-br from-rose-600 to-rose-700 shadow-rose-200 animate-pulse" : "bg-gradient-primary"
          )}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Crown className="h-24 w-24" />
            </div>
            <div className="relative z-10 space-y-6">
              <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                {isExpiring ? <AlertCircle className="h-5 w-5 text-white" /> : <Crown className="h-5 w-5 text-white" />}
              </div>
              <div className="space-y-1.5">
                <h4 className="text-xl font-bold tracking-tight">{isExpiring ? "Obuna tugamoqda!" : "Premium Obuna"}</h4>
                <p className="text-white/80 text-[11px] font-medium leading-relaxed">
                  {isExpiring 
                    ? "Sizning paketingiz muddati tugashiga oz qoldi. Imkoniyatlar o'chib qolmasligi uchun hoziroq yangilang."
                    : "Platformaning barcha imkoniyatlaridan cheksiz foydalaning va natijangizni 2 barobar oshiring."}
                </p>
              </div>
              <Button onClick={() => handleQuickAction("Paket yangilash")} className="w-full bg-white text-slate-900 hover:bg-slate-50 h-12 rounded-lg font-bold uppercase text-[10px] tracking-widest shadow-md flex gap-2 transition-transform">
                <ShoppingCart className="h-4 w-4" /> PAKETNI YANGILASH
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>

      <style>{`
        .shadow-glow { box-shadow: 0 0 15px rgba(139, 92, 246, 0.1); }
      `}</style>
    </div>
  );
}
