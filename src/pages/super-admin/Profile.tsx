import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  User as UserIcon,
  Lock,
  AtSign,
  Shield,
  Mail,
  Phone,
  CheckCircle2,
  Sparkles,
  LogOut,
  AlertTriangle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/axios";
import AvatarUpload from "@/components/AvatarUpload";
import SuccessModal from "@/components/SuccessModal";
import { formatPhoneNumber } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "F.I.O kamida 2 ta belgi").max(100),
  email: z.string().email().or(z.literal("")).optional(),
  phone: z.string().max(30).optional(),
});

const usernameSchema = z.string().regex(/^[a-z0-9_.-]{3,40}$/, "Username 3-40 belgi (a-z, 0-9, _.-)");

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

function SectionCard({
  icon: Icon,
  title,
  desc,
  children,
  index = 0,
}: {
  icon: any;
  title: string;
  desc?: string;
  children: React.ReactNode;
  index?: number;
}) {
  return (
    <motion.section
      custom={index}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={fadeUp}
      className="group relative rounded-2xl p-[1px] bg-gradient-to-br from-primary/30 via-border/40 to-secondary/30 hover:from-primary/60 hover:to-secondary/60 transition-all duration-500"
    >
      <div className="rounded-2xl glass dark:bg-slate-900/50 dark:border-slate-800 p-6 md:p-7 h-full transition-all duration-500">
        <div className="flex items-start gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary grid place-items-center shadow-glow shrink-0">
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold leading-tight text-slate-900 dark:text-white">{title}</h2>
            {desc && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>}
          </div>
        </div>
        {children}
      </div>
    </motion.section>
  );
}

const passwordSchema = z.object({
  current: z.string().min(1, "Joriy parolni kiriting"),
  next: z.string().min(8, "Yangi parol kamida 8 ta belgi"),
  confirm: z.string().min(1, "Parolni tasdiqlang"),
}).refine((data) => data.next === data.confirm, {
  message: "Parollar mos emas",
  path: ["confirm"],
});

export default function Profile() {
  const { t } = useTranslation();
  const { profile, refresh, setAuth, signOut, role } = useAuth();
  const [successOpen, setSuccessOpen] = useState(false);
  const [twoFAOpen, setTwoFAOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Super Admin bo'lsa, maxsus endpoint ishlatamiz
  const isSuperAdmin = role === "super_admin";

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
    },
  });

  const usernameForm = useForm({
    resolver: zodResolver(z.object({ username: usernameSchema })),
    defaultValues: { username: "" },
  });

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: "", next: "", confirm: "" },
  });

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        full_name: profile.full_name ?? "",
        email: profile.email ?? "",
        phone: profile.phone ?? "",
      });
      usernameForm.reset({ username: profile.username });
    }
  }, [profile, profileForm, usernameForm]);

  const onUpdateProfile = async (data: any) => {
    try {
      const res = await api.put("/profile/update", {
        fullName: data.full_name,
        email: data.email,
        phoneNumber: data.phone,
      });
      setSuccessMsg(res.data.message);
      setSuccessOpen(true);
      refresh();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Xatolik yuz berdi");
    }
  };

  const onUpdateUsername = async (data: any) => {
    try {
      if (isSuperAdmin) {
        // SuperAdmin uchun maxsus endpoint — token yangilanadi va logout qilinadi
        const res = await api.put("/super-admin/profile", {
          username: data.username,
          password: null, // faqat username
        });
        // Yangi tokenni saqlash
        if (res.data?.access_token) {
          localStorage.setItem('access_token', res.data.access_token);
        }
        toast.success(t("dynamic.profile.username_yangilandi_qayta_kirish_kerak"));
        await new Promise(r => setTimeout(r, 1500));
        await signOut();
      } else {
        const res = await api.patch("/profile/username", {
          username: data.username,
        });
        setSuccessMsg(res.data.message);
        setSuccessOpen(true);
        if (res.data.token) {
          const savedUser = localStorage.getItem('user');
          if (savedUser) {
            const userData = JSON.parse(savedUser);
            userData.username = data.username;
            setAuth(res.data.token, userData);
          }
        }
        refresh();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Xatolik yuz berdi");
    }
  };

  const onChangePassword = async (data: any) => {
    try {
      if (isSuperAdmin) {
        // SuperAdmin uchun maxsus endpoint — token yangilanadi va logout qilinadi
        const res = await api.put("/super-admin/profile", {
          username: null, // faqat parol
          password: data.next,
        });
        if (res.data?.access_token) {
          localStorage.setItem('access_token', res.data.access_token);
        }
        toast.success(t("dynamic.profile.parol_yangilandi_qayta_kirish_kerak"));
        await new Promise(r => setTimeout(r, 1500));
        await signOut();
      } else {
        const payload = {
          currentPassword: data.current,
          newPassword: data.next,
        };
        await api.post("/profile/change-password", payload);
        setSuccessMsg("Parol yangilandi!");
        setSuccessOpen(true);
        passwordForm.reset({ current: "", next: "", confirm: "" });
      }
    } catch (e: any) {
      const msg = "Kechirasiz, parolni yangilashda xatolik yuz berdi. Iltimos, barcha maydonlarni to'g'ri to'ldiring.";
      toast.error(e.response?.data?.message || msg);
    }
  };

  const initials = (profile?.full_name || profile?.username || "S A")
    .split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();

  if (!profile) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative">

      <div className="relative mx-auto w-full w-full px-2 sm:px-4 py-6 md:py-10 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-2 transition-all duration-500"
        >
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{t("dynamic.sharedprofile.profil")}<span className="text-purple-500">{t("dynamic.profile.sozlamalari")}</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base font-medium">
            Shaxsiy ma'lumotlar va xavfsizlik parametrlarini boshqaring
          </p>
        </motion.div>

        {/* Hero profile card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="relative rounded-3xl p-[1.5px] bg-gradient-to-br from-primary/60 via-secondary/40 to-accent/60 shadow-elegant transition-all duration-500"
        >
          <div className="rounded-3xl glass dark:bg-slate-900/50 dark:border-slate-800 p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Simplified Avatar with single elegant glow */}
              <div className="relative group">
                <div className="absolute -inset-2 rounded-full bg-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-smooth" />
                <AvatarUpload
                  userId={profile.id}
                  currentUrl={profile.avatar_url}
                  initials={initials}
                  onUploaded={() => refresh()}
                  size="lg"
                />
                <span className="absolute bottom-2 right-2 h-4 w-4 rounded-full bg-purple-500 ring-4 ring-white dark:ring-slate-900 shadow-lg" />
              </div>

              {/* Identity Section */}
              <div className="flex-1 min-w-0 text-center md:text-left space-y-3">
                <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
                  <h2 className="font-display text-2xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                    {profile.full_name || profile.username}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 px-3 py-1 text-xs font-bold border border-purple-500/20">
                      <Shield className="h-3.5 w-3.5" />{t("dynamic.superadminlayout.super_admin")}</span>
                  </div>
                </div>

                <div className="mt-4 grid sm:grid-cols-2 gap-2 max-w-md mx-auto md:mx-0">
                  <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-xs">
                    <Mail className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                    <span className="truncate text-slate-700 dark:text-slate-200 font-semibold">{profile.email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 px-3 py-2 text-xs">
                    <Phone className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                    <span className="truncate text-slate-700 dark:text-slate-200 font-semibold">{profile.phone || "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Form sections grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          <SectionCard icon={UserIcon} title="Shaxsiy ma'lumotlar" desc="Hisob nomi, aloqa kanallari" index={0}>
            <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="grid gap-4">
              <div className="grid gap-2">
                <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">{t("dynamic.profile.fio")}</Label>
                <Input
                  {...profileForm.register("full_name")}
                  className="h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 transition-all duration-500"
                />
                {profileForm.formState.errors.full_name && (
                  <p className="text-[10px] text-destructive">{profileForm.formState.errors.full_name.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">{t("dynamic.profile.email")}</Label>
                <Input
                  type="email"
                  {...profileForm.register("email")}
                  className="h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 transition-all duration-500"
                />
                {profileForm.formState.errors.email && (
                  <p className="text-[10px] text-destructive">{profileForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">{t("dynamic.profile.telefon")}</Label>
                <Input
                  {...profileForm.register("phone", {
                    onChange: (e) => {
                      e.target.value = formatPhoneNumber(e.target.value);
                    }
                  })}
                  placeholder="+998..."
                  className="h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 transition-all duration-500"
                />
                {profileForm.formState.errors.phone && (
                  <p className="text-[10px] text-destructive">{profileForm.formState.errors.phone.message}</p>
                )}
              </div>
              <Button type="submit" variant="hero" disabled={profileForm.formState.isSubmitting} className="w-full sm:w-auto">
                {profileForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Profilni saqlash
              </Button>
            </form>
          </SectionCard>

          <SectionCard icon={AtSign} title="Username" desc="Hisob identifikatori" index={1}>
            {isSuperAdmin && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                  Username o'zgartirilsa, tizimdan <strong>{t("dynamic.profile.avtomatik_chiqarilasiz")}</strong>. Yangi username bilan qayta kiring.
                </p>
              </div>
            )}
            <form onSubmit={usernameForm.handleSubmit(onUpdateUsername)} className="grid gap-3">
              <Input
                {...usernameForm.register("username")}
                className="font-mono h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 transition-all duration-500"
              />
              {usernameForm.formState.errors.username && (
                <p className="text-[10px] text-destructive">{usernameForm.formState.errors.username.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Username o'zgartirilsa JWT token yangilanadi.
              </p>
              <Button type="submit" variant="hero" disabled={usernameForm.formState.isSubmitting} className="w-full sm:w-auto">
                {usernameForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isSuperAdmin ? (
                  <><LogOut className="h-4 w-4 mr-1.5" />{t("dynamic.profile.yangilab_chiqish")}</>
                ) : "Yangilash"}
              </Button>
            </form>
          </SectionCard>

          <SectionCard
            icon={Lock}
            title={t("dynamic.sharedprofile.parolni_o_zgartirish")}
            desc="Hisob xavfsizligini yangilab turing"
            index={2}
          >
            {isSuperAdmin && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                  Parol o'zgartirilsa, tizimdan <strong>{t("dynamic.profile.avtomatik_chiqarilasiz")}</strong>. Yangi parol bilan qayta kiring.
                </p>
              </div>
            )}
            <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="grid gap-4">
              <div className="grid sm:grid-cols-3 gap-3">
                {!isSuperAdmin && (
                  <div className="grid gap-2">
                    <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">{t("dynamic.profile.joriy_parol")}</Label>
                    <Input
                      type="password"
                      {...passwordForm.register("current")}
                      autoComplete="new-password"
                      className="h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 transition-all duration-500"
                    />
                    {passwordForm.formState.errors.current && (
                      <p className="text-[10px] text-destructive">{passwordForm.formState.errors.current.message}</p>
                    )}
                  </div>
                )}
                <div className="grid gap-2">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">{t("dynamic.usersmanager.yangi_parol")}</Label>
                  <Input
                    type="password"
                    {...passwordForm.register("next")}
                    autoComplete="new-password"
                    className="h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 transition-all duration-500"
                  />
                  {passwordForm.formState.errors.next && (
                    <p className="text-[10px] text-destructive">{passwordForm.formState.errors.next.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">{t("dynamic.profile.tasdiqlash")}</Label>
                  <Input
                    type="password"
                    {...passwordForm.register("confirm")}
                    autoComplete="new-password"
                    className="h-11 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 transition-all duration-500"
                  />
                  {passwordForm.formState.errors.confirm && (
                    <p className="text-[10px] text-destructive">{passwordForm.formState.errors.confirm.message}</p>
                  )}
                </div>
              </div>
              <Button type="submit" variant="hero" disabled={passwordForm.formState.isSubmitting} className="w-full sm:w-auto">
                {passwordForm.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isSuperAdmin ? (
                  <><LogOut className="h-4 w-4 mr-1.5" />{t("dynamic.profile.yangilab_chiqish")}</>
                ) : "Parolni saqlash"}
              </Button>
            </form>
          </SectionCard>

          <SectionCard
            icon={Shield}
            title="Xavfsizlik holati"
            desc="Sessiyalar va himoya parametrlari"
            index={3}
          >
            <div className="grid gap-3 text-sm">
              {[
                { label: "2FA autentifikatsiya", value: "Faollashtirish", tone: "action", onClick: () => setTwoFAOpen(true) },
                { label: "Faol sessiya", value: "Joriy qurilma", tone: "ok" },
                { label: "Oxirgi kirish", value: profile.last_login_at ? new Date(profile.last_login_at).toLocaleString() : "Hozir", tone: "ok" },
                { label: "Tilni tanlash", value: "O'zbek", tone: "muted" },
              ].map((row) => (
                <div
                  key={row.label}
                  onClick={row.onClick}
                  className={`flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-white/10 transition-smooth ${row.onClick ? "cursor-pointer" : ""}`}
                >
                  <span className="text-slate-500 dark:text-slate-400 font-medium">{row.label}</span>
                  <span
                    className={
                      row.tone === "ok"
                        ? "text-purple-500 font-medium"
                        : row.tone === "action"
                        ? "text-primary font-bold hover:underline"
                        : "text-foreground/70"
                    }
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      <SuccessModal 
        open={successOpen} 
        onOpenChange={setSuccessOpen} 
        message={successMsg} 
      />

      <Dialog open={twoFAOpen} onOpenChange={setTwoFAOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dynamic.profile.2fa_autentifikatsiya")}</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center space-y-4">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">{t("dynamic.profile.tez_orada")}</h3>
              <p className="text-muted-foreground text-sm">
                Ikki bosqichli xavfsizlik tizimi keyingi yangilanishlarda qo'shiladi.
              </p>
            </div>
            <Button onClick={() => setTwoFAOpen(false)} variant="hero" className="w-full">
              Tushunarli
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

