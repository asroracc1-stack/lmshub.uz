import { useTranslation } from "react-i18next";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, Users, GraduationCap, UserCog, Activity, 
  Calendar as CalendarIcon, Plus, Send, Settings, ShieldCheck, 
  Mail, Phone, MapPin, Globe, ArrowUpRight, TrendingUp,
  LayoutDashboard, UserPlus, FilePlus, BellRing, Sparkles, Crown,
  ArrowRight, Info, AlertCircle, ShoppingCart, Heart, Users2, BookOpen
} from "lucide-react";

interface MemberSubmitData {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  [key: string]: unknown;
}

interface OrgUpdateData {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  [key: string]: unknown;
}
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminDashboard, useUpcomingEvents, useDashboardMutations, useAdminDashboardStats, useAdminDashboardOverview } from "@/hooks/useOptimizedQueries";
import { Skeleton } from "@/components/ui/skeleton";
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
import { StudentCombobox } from "@/components/StudentCombobox";
import { api } from "@/lib/axios";
import WelcomeBanner from "@/components/shared/WelcomeBanner";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { data: stats, isLoading: statsLoading, isError: statsError } = useAdminDashboard();
  const { data: realStats, isLoading: realStatsLoading } = useAdminDashboardStats();
  const { data: events, isLoading: eventsLoading } = useUpcomingEvents();
  const { data: overview, isLoading: overviewLoading, isError: overviewError } = useAdminDashboardOverview();
  const { addTeacher, addStudent, generateReport, updateOrgSettings, addEvent } = useDashboardMutations();

  const isStatsLoading = statsLoading || realStatsLoading;

  const [clockSettings, setClockSettings] = useState(() => {
    const saved = localStorage.getItem("smart-clock-settings");
    return saved ? JSON.parse(saved) : { visible: true, sound: true };
  });

  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Event Quick Action Form State
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventSubmitting, setEventSubmitting] = useState(false);

  // Invoice Quick Action Selector State
  const [invoiceStudentId, setInvoiceStudentId] = useState<string | null>(null);
  const [invoiceStudentName, setInvoiceStudentName] = useState<string | null>(null);
  const [invoiceDownloading, setInvoiceDownloading] = useState(false);

  const statCards = useMemo(() => [
    { label: "O'qituvchilar", value: realStats?.totalTeachers ?? 0, growth: stats?.teacherGrowth ?? 0, icon: GraduationCap, color: "text-blue-500", bg: "bg-blue-500/10", to: "/admin/teachers", accent: "#3b82f6" },
    { label: "Talabalar",     value: realStats?.totalStudents ?? 0, growth: stats?.studentGrowth  ?? 0, icon: Users,         color: "text-purple-500", bg: "bg-purple-500/10", to: "/admin/students",  accent: "#9F86C0" },
    { label: "Ota-onalar",   value: realStats?.totalParents ?? 0, growth: 0,                          icon: Heart,         color: "text-pink-500",    bg: "bg-pink-500/10",    to: "/admin/parents",   accent: "#ec4899" },
    { label: "Administratorlar", value: realStats?.totalAdministrators ?? 0, growth: stats?.orgAdminGrowth ?? 0, icon: UserCog,   color: "text-indigo-500", bg: "bg-indigo-500/10", to: "/admin/administrators", accent: "#6366f1" },
    { label: t("dynamic.startuppitch.guruhlar"),     value: realStats?.totalGroups ?? 0, growth: 0,                          icon: Users2,        color: "text-fuchsia-500",   bg: "bg-fuchsia-500/10",    to: "/admin/groups",         accent: "#06b6d4" },
    { label: "Tadbirlar",    value: stats?.eventsCount    ?? 0, growth: stats?.eventGrowth     ?? 0, icon: CalendarIcon,  color: "text-amber-500",  bg: "bg-amber-500/10",  to: "/admin/calendar",  accent: "#f59e0b" },
    { label: "Fanlar",       value: realStats?.totalSubjects ?? 0, growth: 0,                          icon: BookOpen,      color: "text-violet-500",    bg: "bg-violet-500/10",    to: "/admin/subjects",  accent: "#7C3AED" },
    { label: "Faol Obunalar",  value: stats?.activeSubscriptions ?? 0, growth: 0,                          icon: Crown,      color: "text-emerald-500",    bg: "bg-emerald-500/10",    to: "/admin/subscription-requests",  accent: "#10b981" },
    { label: "Kutilayotgan",   value: stats?.pendingRequests ?? 0, growth: 0,                          icon: AlertCircle,      color: "text-amber-500",    bg: "bg-amber-500/10",    to: "/admin/subscription-requests",  accent: "#f59e0b" },
  ], [stats, realStats]);

  const isExpiring = stats?.subscriptionStatus === "EXPIRING" || overview?.subscription?.status === "EXPIRING";

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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t("dynamic.dashboard.ulanishda_xatolik_yuz_berdi")}</h2>
          <p className="text-slate-500 max-w-md mx-auto">{t("dynamic.dashboard.tizim_ma_lumotlarni_yuklashda_qiyinchili")}</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="mt-4 rounded-xl border-primary/20">
            Qayta urinish
          </Button>
        </div>
      </div>
    );
  }



  const handleMemberSubmit = async (data: MemberSubmitData) => {
    if (activeModal === "O'qituvchi qo'shish") {
      await addTeacher.mutateAsync(data);
    } else if (activeModal === "Talaba qo'shish") {
      await addStudent.mutateAsync(data);
    }
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventDate) {
      toast.error(t("dynamic.dashboard.iltimos_nomi_va_sanani_kiriting"));
      return;
    }
    setEventSubmitting(true);
    try {
      await addEvent.mutateAsync({
        title: eventTitle,
        description: eventDesc,
        eventDate: new Date(eventDate).toISOString(),
      });
      setActiveModal(null);
      setEventTitle("");
      setEventDesc("");
      setEventDate("");
      navigate("/admin/calendar");
    } catch (err) {
      console.error(err);
    } finally {
      setEventSubmitting(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!invoiceStudentId) {
      toast.error(t("dynamic.dashboard.iltimos_talabani_tanlang"));
      return;
    }
    setInvoiceDownloading(true);
    try {
      const response = await api.get(`/admin/invoices/generate/${invoiceStudentId}`, { responseType: 'blob' });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `LMSHub_Invoice_${invoiceStudentName || "Talaba"}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Hisob-faktura muvaffaqiyatli yuklab olindi! 🚀");
      setActiveModal(null);
      setInvoiceStudentId(null);
      setInvoiceStudentName(null);
    } catch (err) {
      console.error(err);
      toast.error(t("dynamic.dashboard.hisobfaktura_generatsiya_qilishda_xatoli"));
    } finally {
      setInvoiceDownloading(false);
    }
  };

  const handleOrgUpdate = async (data: OrgUpdateData) => {
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
        orgData={overview?.organization || stats?.organization}
        onUpdate={handleOrgUpdate}
        clockSettings={clockSettings}
        onClockUpdate={handleClockUpdate}
      />

      <SubscriptionModal 
        isOpen={activeModal === "Paket yangilash"}
        onClose={() => setActiveModal(null)}
      />

      {/* Event Yaratish Modal */}
      <Dialog open={activeModal === "Tadbir yaratish"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[480px] border-none bg-white dark:bg-slate-900 shadow-2xl rounded-2xl p-8" aria-describedby="event-desc-id">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-purple-500" /> Yangi Tadbir Yaratish
            </DialogTitle>
            <DialogDescription id="event-desc-id">{t("dynamic.dashboard.tashkilotingiz_uchun_yangi_ichki_yoki_ta")}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEventSubmit} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("dynamic.dashboard.tadbir_nomi")}</label>
              <input 
                type="text" 
                placeholder="Masalan: IELTS Mock Exam kuni" 
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:border-purple-500 dark:focus:border-purple-500 outline-none text-sm font-semibold transition-colors duration-200"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("dynamic.dashboard.tadbir_tavsifi")}</label>
              <textarea 
                placeholder="Tadbir haqida batafsil ma'lumot..." 
                value={eventDesc}
                onChange={(e) => setEventDesc(e.target.value)}
                className="w-full h-24 p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:border-purple-500 dark:focus:border-purple-500 outline-none text-sm font-medium transition-colors duration-200 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("dynamic.dashboard.sana_va_vaqt")}</label>
              <input 
                type="datetime-local" 
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 focus:border-purple-500 dark:focus:border-purple-500 outline-none text-sm font-semibold transition-colors duration-200"
                required
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="ghost" onClick={() => setActiveModal(null)} className="rounded-xl font-bold">{t("dynamic.pricingplans.bekor_qilish")}</Button>
              <Button type="submit" disabled={eventSubmitting} className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 shadow-lg shadow-purple-500/20">
                {eventSubmitting ? "Yaratilmoqda..." : "Tadbirni Yaratish 🚀"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Hisob-faktura Modal */}
      <Dialog open={activeModal === "Hisob-faktura"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-[480px] border-none bg-white dark:bg-slate-900 shadow-2xl rounded-2xl p-8" aria-describedby="invoice-desc-id">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Send className="h-5 w-5 text-amber-500" /> To'lov Hisob-Fakturasi Yaratish
            </DialogTitle>
            <DialogDescription id="invoice-desc-id">{t("dynamic.dashboard.tanlangan_talaba_uchun_premium_pdf_billi")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("dynamic.dashboard.talabani_qidirish_va_tanlash")}</label>
              <StudentCombobox 
                selectedStudentId={invoiceStudentId} 
                onSelectStudent={(id, name) => {
                  setInvoiceStudentId(id);
                  setInvoiceStudentName(name);
                }} 
              />
            </div>

            {invoiceStudentId && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
                🌟 Tanlangan talaba: <span className="font-bold">{invoiceStudentName}</span>
              </motion.div>
            )}

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="ghost" onClick={() => setActiveModal(null)} className="rounded-xl font-bold">{t("dynamic.pricingplans.bekor_qilish")}</Button>
              <Button 
                onClick={handleDownloadInvoice} 
                disabled={invoiceDownloading || !invoiceStudentId} 
                className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 shadow-lg shadow-amber-500/20 flex gap-2"
              >
                {invoiceDownloading ? "Yuklanmoqda..." : <>{t("dynamic.dashboard.hisobfakturani_yuklash")}<Plus className="h-4.5 w-4.5" /></>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Report Generation Overlay */}
      <Dialog open={generateReport.isPending}>
        <DialogContent className="sm:max-w-[400px] border-none bg-white dark:bg-slate-900 shadow-2xl rounded-2xl p-10 flex flex-col items-center justify-center text-center space-y-6" aria-describedby="report-gen-desc">
          <DialogHeader className="sr-only">
            <DialogTitle>{t("dynamic.dashboard.hisobot_tayyorlanmoqda")}</DialogTitle>
            <DialogDescription id="report-gen-desc">{t("dynamic.dashboard.tizim_joriy_tashkilot_statistikasini_yig")}</DialogDescription>
          </DialogHeader>
          <motion.div
            animate={{ rotate: [0, 2, 0, -2, 0], scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <TigerPlayer text="Tahlil qilinyapti... 🐯📊" size={200} />
          </motion.div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t("dynamic.dashboard.ma_lumotlar_tahlil_qilinmoqda")}</h3>
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
                <DialogTitle>{t("dynamic.dashboard.muvaffaqiyatli")}</DialogTitle>
                <DialogDescription id="success-brand-desc">{t("dynamic.dashboard.yangi_brendingiz_muborak")}</DialogDescription>
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
                  className="absolute -top-2 -right-2 bg-purple-500 text-white p-2 rounded-full shadow-lg"
                >
                  <ShieldCheck className="h-5 w-5" />
                </motion.div>
              </motion.div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Yangi brendingiz muborak! ✨</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t("dynamic.dashboard.tashkilot_logotipi_va_ma_lumotlari_butun")}</p>
              </div>
              <Button onClick={() => setActiveModal(null)} className="w-full h-12 rounded-lg bg-gradient-primary shadow-glow text-white font-bold uppercase text-[10px] tracking-widest">
                Davom etish
              </Button>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
      
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 dark:bg-primary/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
      
      <WelcomeBanner />

      {/* Stats Grid */}
      {isStatsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Card key={i} className="flex flex-col justify-between p-5 min-h-[145px] bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 animate-pulse relative overflow-hidden">
              <div className="flex items-start justify-between mb-3">
                <Skeleton className="h-10 w-10 rounded-lg bg-slate-200 dark:bg-slate-700" />
              </div>
              <div>
                <Skeleton className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 mb-2" />
                <Skeleton className="h-7 w-1/3 bg-slate-200 dark:bg-slate-700 mb-3" />
                <Skeleton className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="cursor-pointer"
              onClick={() => navigate(s.to)}
            >
              <Card className="flex flex-col justify-between p-5 min-h-[145px] bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden h-full">
                {/* colored top line */}
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: s.accent }} />

                <div className="flex items-start justify-between mb-3">
                  <div className={cn("p-2.5 rounded-lg transition-all group-hover:scale-110", s.bg)}>
                    <s.icon className={cn("h-5 w-5", s.color)} />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 group-hover:text-slate-500 transition-all duration-200" />
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{s.label}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-3">
                    {s.value.toLocaleString()}
                  </p>

                  <div className={cn(
                    "flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md w-fit",
                    s.growth >= 0
                      ? "text-purple-600 bg-purple-50 dark:bg-purple-500/10"
                      : "text-red-600 bg-red-50 dark:bg-red-500/10"
                  )}>
                    <TrendingUp className={cn("h-3 w-3", s.growth < 0 && "rotate-180")} />
                    {s.growth > 0 ? `+${s.growth.toFixed(1)}%` : `${s.growth.toFixed(1)}%`} bu oyda
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-8">
          {/* Organization Profile Card */}
          <Card className="p-8 border border-slate-200 dark:border-white/5 shadow-sm bg-white dark:bg-slate-900/40 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Building2 className="h-24 w-24 -rotate-12" />
            </div>
            {overviewLoading ? (
              <div className="flex flex-col md:flex-row gap-8 items-start md:items-center relative z-10 w-full animate-pulse">
                <Skeleton className="w-24 h-24 rounded-xl shrink-0" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-8 w-32" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-8 items-start md:items-center relative z-10">
                <div className="w-24 h-24 rounded-xl bg-slate-100 dark:bg-white/5 p-1 shrink-0 border border-slate-200 dark:border-white/10 shadow-inner">
                  <div className="w-full h-full rounded-lg bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden">
                    {overview?.organization?.logoUrl ? (
                      <img src={overview.organization.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="h-10 w-10 text-primary/40" />
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {overview?.organization?.name || "Tashkilot nomi"}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    {overview?.organization?.address || "Toshkent shahri, O'zbekiston"}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-lg border border-slate-100 dark:border-white/5">
                      <Mail className="h-3.5 w-3.5 text-primary/60" /> {overview?.organization?.email || "info@example.com"}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 px-3 py-2 rounded-lg border border-slate-100 dark:border-white/5">
                      <Phone className="h-3.5 w-3.5 text-primary/60" /> {overview?.organization?.phone || "+998 90 123 45 67"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Upcoming Events Card */}
          <Card className="p-8 border border-slate-200/80 dark:border-white/5 shadow-md hover:shadow-lg bg-white dark:bg-slate-900/40 rounded-2xl ring-1 ring-slate-100 dark:ring-white/5 transition-shadow duration-300">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Activity className="h-6 w-6 text-primary" /> Yaqindagi Voqealar
              </h3>
              <Button variant="ghost" className="text-[10px] font-bold uppercase tracking-widest text-primary gap-1 hover:bg-primary/5 rounded-lg px-3">{t("dynamic.finance.barchasi")}<ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            
            <div className="space-y-3">
              {overviewLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-lg bg-slate-100 dark:bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : overview?.upcomingEvents && overview.upcomingEvents.length > 0 ? (
                overview.upcomingEvents.map((ev, i) => (
                  <motion.div key={ev.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex items-center justify-between p-4 rounded-xl bg-slate-50/80 dark:bg-white/5 hover:bg-slate-100/80 dark:hover:bg-white/10 transition-all border border-slate-200/60 dark:border-white/5 group shadow-sm">
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
                    <Badge className="bg-purple-500/10 text-purple-600 border-none text-[9px] font-bold uppercase px-2 py-0.5 rounded-md">{t("dynamic.orgpayments.kutilmoqda")}</Badge>
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-gradient-to-b from-slate-50/50 to-slate-100/30 dark:from-white/[0.02] dark:to-white/[0.01] rounded-xl border border-dashed border-slate-200/60 dark:border-white/5">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.05, 1],
                      rotate: [0, 5, 0, -5, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <TigerPlayer text="Dam olish vaqti! Hozircha tadbirlar yo'q... 🐯✨" size={220} />
                  </motion.div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-widest">{t("dynamic.dashboard.tinchlik_va_osoyishtalik")}</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Sidebar Actions & Subscription */}
        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
          <Card className="p-8 border border-slate-200/80 dark:border-white/5 shadow-md hover:shadow-lg bg-white dark:bg-slate-900/40 rounded-2xl ring-1 ring-slate-100 dark:ring-white/5 transition-shadow duration-300">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-3 mb-6">
              <BellRing className="h-5 w-5 text-amber-500" /> Tezkor Amallar
            </h3>
            <div className="grid gap-2">
              {[
                { label: "O'qituvchi qo'shish", icon: GraduationCap, color: "bg-blue-500" },
                { label: "Talaba qo'shish", icon: UserPlus, color: "bg-purple-500" },
                { label: "Tadbir yaratish", icon: FilePlus, color: "bg-purple-500" },
                { label: "Hisob-faktura", icon: Send, color: "bg-amber-500" },
              ].map((q) => (
                <button 
                  key={q.label} 
                  onClick={() => handleQuickAction(q.label)} 
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
            "p-8 border border-transparent shadow-lg rounded-2xl text-white relative overflow-hidden group transition-all duration-500",
            isExpiring ? "bg-gradient-to-br from-rose-600 to-rose-700 shadow-rose-500/20 dark:shadow-rose-500/10 animate-pulse" : "bg-gradient-primary shadow-primary/20 dark:shadow-primary/10"
          )}>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <Crown className="h-24 w-24" />
            </div>
            {overviewLoading ? (
              <div className="relative z-10 space-y-6">
                <Skeleton className="w-10 h-10 rounded-lg bg-white/20" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32 bg-white/20" />
                  <Skeleton className="h-4 w-full bg-white/20" />
                </div>
                <Skeleton className="h-12 w-full rounded-lg bg-white/20" />
              </div>
            ) : (
              <div className="relative z-10 space-y-6">
                <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                  {isExpiring ? <AlertCircle className="h-5 w-5 text-white" /> : <Crown className="h-5 w-5 text-white" />}
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-xl font-bold tracking-tight">
                    {isExpiring ? "Obuna tugamoqda!" : `Plan: ${overview?.subscription?.planName || "Premium"}`}
                  </h4>
                  <p className="text-white/80 text-[11px] font-medium leading-relaxed">
                    {isExpiring 
                      ? "Sizning paketingiz muddati tugashiga oz qoldi. Imkoniyatlar o'chib qolmasligi uchun hoziroq yangilang."
                      : `Sizning joriy obuna rejangiz faol. Platformaning barcha imkoniyatlaridan cheksiz foydalaning.`}
                  </p>
                </div>
                <Button onClick={() => handleQuickAction("Paket yangilash")} className="w-full bg-white text-slate-900 hover:bg-slate-50 h-12 rounded-lg font-bold uppercase text-[10px] tracking-widest shadow-md flex gap-2 transition-transform">
                  <ShoppingCart className="h-4 w-4" /> PAKETNI YANGILASH
                </Button>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      <style>{`
        .shadow-glow { box-shadow: 0 0 15px rgba(139, 92, 246, 0.1); }
      `}</style>
    </div>
  );
}

