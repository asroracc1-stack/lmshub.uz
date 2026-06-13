import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { roleHomePath, AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Mail,
  User as UserIcon,
  AtSign,
  Lock,
  CheckCircle2,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import Lanyard from "@/components/Lanyard/Lanyard";
import GoogleSignInButton from "@/components/GoogleSignInButton";

const formSchema = z.object({
  full_name: z.string().trim().min(2, "F.I.O kamida 2 ta belgi").max(100),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_.-]{3,40}$/, "Username 3-40 belgi (a-z, 0-9, _.-)"),
  email: z.string().trim().toLowerCase().email("Email noto'g'ri").max(255),
  password: z
    .string()
    .min(8, "Parol kamida 8 ta belgi")
    .max(100)
    .regex(/[A-Za-z]/, "Kamida 1 ta harf")
    .regex(/\d/, "Kamida 1 ta raqam"),
});

function strengthOf(pwd: string) {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (pwd.length >= 12) s++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s++;
  if (/\d/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  const labels = ["—", "Zaif", "O'rtacha", "Yaxshi", "Kuchli", "A'lo"];
  const colors = [
    "bg-muted",
    "bg-destructive",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-fuchsia-400",
  ];
  return { score: s, label: labels[s], color: colors[s] };
}

type Step = "form" | "otp" | "done";

export default function SignUp() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const otpRequestedAt = useRef<number>(0);

  const [form, setForm] = useState({
    full_name: "",
    username: "",
    email: "",
    password: "",
  });
  const [otp, setOtp] = useState("");

  const strength = useMemo(() => strengthOf(form.password), [form.password]);

  // Already logged in → bounce to home
  useEffect(() => {
    if (!loading && user && role) {
      navigate(roleHomePath[role as AppRole], { replace: true });
    }
  }, [user, role, loading, navigate]);

  // Resend countdown
  useEffect(() => {
    if (step !== "otp") return;
    const id = setInterval(() => {
      const left = Math.max(
        0,
        60 - Math.floor((Date.now() - otpRequestedAt.current) / 1000),
      );
      setResendIn(left);
    }, 500);
    return () => clearInterval(id);
  }, [step]);

  const sendOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) throw error;
    otpRequestedAt.current = Date.now();
    setResendIn(60);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("signup-request", {
        body: parsed.data,
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);

      // Bypass email confirmation — sign in directly
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (signInErr) throw signInErr;

      // Apply referral code from ?invite=
      const inviteCode = new URLSearchParams(window.location.search).get("invite");
      if (inviteCode) {
        await (supabase.rpc as any)("apply_referral", { _code: inviteCode });
      }

      setStep("done");
      toast.success("Akkaunt yaratildi! Xush kelibsiz 🎉");
      setTimeout(() => navigate("/user/dashboard", { replace: true }), 600);
    } catch (err: any) {
      const msg = err?.message ?? "Xatolik yuz berdi, qayta urinib ko'ring";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (code: string) => {
    if (code.length !== 6) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: form.email,
        token: code,
        type: "email",
      });
      if (error) throw error;
      setStep("done");
      toast.success("Akkauntingiz tasdiqlandi! Xush kelibsiz 🎉");
      // AuthContext will detect the session and the redirect effect above
      // will route to /user/dashboard.
      setTimeout(() => navigate("/user/dashboard", { replace: true }), 800);
    } catch (err: any) {
      toast.error(err?.message ?? "Kod noto'g'ri yoki muddati tugagan");
      setOtp("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0) return;
    try {
      await sendOtp(form.email);
      toast.success(t("dynamic.signup.yangi_kod_yuborildi"));
    } catch (err: any) {
      toast.error(err?.message ?? "Kod yuborilmadi");
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0B0714] text-foreground">
      {/* Background — premium gradient + glow blobs + grid */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(159,134,192,0.18), transparent 60%), radial-gradient(ellipse 70% 50% at 80% 100%, rgba(231,198,255,0.12), transparent 60%), #0B0714",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse 60% 50% at 50% 50%, black, transparent 80%)",
          }}
        />
        <motion.div
          className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full blur-3xl"
          style={{ background: "rgba(159,134,192,0.35)" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full blur-3xl"
          style={{ background: "rgba(36,0,70,0.4)" }}
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Bosh sahifa
        </Link>
      </div>

      {/* Split layout */}
      <div className="relative z-10 grid min-h-[calc(100vh-80px)] gap-6 px-4 pb-12 lg:grid-cols-2">
        {/* LEFT: Lanyard */}
        <div className="relative hidden lg:flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0">
            <Lanyard position={[0, 0, 18]} gravity={[0, -40, 0]} fov={20} transparent />
          </div>
        </div>

        {/* RIGHT: Card */}
        <div className="flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-2xl"
        >
          <div
            className="relative overflow-hidden rounded-3xl border border-white/10 p-8 shadow-2xl"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
            }}
          >
            {/* gradient ring */}
            <div
              className="pointer-events-none absolute inset-0 rounded-3xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(159,134,192,0.25), transparent 40%, rgba(36,0,70,0.30))",
                mask: "linear-gradient(black, black) content-box, linear-gradient(black, black)",
                WebkitMask:
                  "linear-gradient(black, black) content-box, linear-gradient(black, black)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
                padding: "1px",
              }}
            />

            <div className="relative">
              <div className="mb-7 flex flex-col items-center">
                <BrandLogo size={64} className="mb-4" />
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-white/70">
                  <Sparkles className="h-3 w-3 text-fuchsia-400" />
                  Premium ro'yxatdan o'tish
                </div>
              </div>

              <AnimatePresence mode="wait">
                {step === "form" && (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="text-center mb-6">
                      <h1 className="bg-gradient-to-br from-white via-white to-indigo-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                        Akkaunt yarating
                      </h1>
                      <p className="mt-2 text-sm text-white/60">
                        Bir necha soniya — va siz tayyorsiz ✨
                      </p>
                    </div>

                    <div className="mb-5 space-y-3">
                      <GoogleSignInButton label="Google bilan ro'yxatdan o'tish" />
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-transparent px-3 text-white/40">{t("dynamic.signup.yoki_email_bilan")}</span>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleCreate} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FieldWrap icon={UserIcon} label={t("dynamic.sharedprofile.to_liq_ism")}>
                        <Input
                          value={form.full_name}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, full_name: e.target.value }))
                          }
                          placeholder="Ali Valiyev"
                          autoComplete="name"
                          required
                          className="h-12 border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-white/30 focus-visible:ring-indigo-400/40"
                        />
                      </FieldWrap>

                      <FieldWrap icon={AtSign} label="Username">
                        <Input
                          value={form.username}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              username: e.target.value.toLowerCase(),
                            }))
                          }
                          placeholder="ali_valiyev"
                          autoComplete="username"
                          required
                          className="h-12 border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-white/30 focus-visible:ring-indigo-400/40"
                        />
                      </FieldWrap>

                      <FieldWrap icon={Mail} label={t("dynamic.profile.email")}>
                        <Input
                          type="email"
                          value={form.email}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, email: e.target.value }))
                          }
                          placeholder="ali@example.com"
                          autoComplete="email"
                          required
                          className="h-12 border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-white/30 focus-visible:ring-indigo-400/40"
                        />
                      </FieldWrap>

                      <FieldWrap icon={Lock} label="Parol">
                        <Input
                          type={showPwd ? "text" : "password"}
                          value={form.password}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, password: e.target.value }))
                          }
                          placeholder="Kuchli parol"
                          autoComplete="new-password"
                          required
                          className="h-12 border-white/10 bg-white/[0.04] pl-10 pr-11 text-white placeholder:text-white/30 focus-visible:ring-indigo-400/40"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80"
                          tabIndex={-1}
                        >
                          {showPwd ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </FieldWrap>
                      </div>

                      {form.password && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="space-y-1.5"
                        >
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                  i <= strength.score
                                    ? strength.color
                                    : "bg-white/10"
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-white/50">
                            Parol darajasi: {strength.label}
                          </p>
                        </motion.div>
                      )}

                      <Button
                        type="submit"
                        disabled={submitting}
                        className="group relative h-12 w-full overflow-hidden rounded-xl border-0 text-sm font-semibold text-white transition-all hover:shadow-glow-purple bg-gradient-premium"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Yuborilmoqda...
                          </>
                        ) : (
                          <>
                            Davom etish
                            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </>
                        )}
                      </Button>

                      <p className="pt-2 text-center text-xs text-white/50">
                        Allaqachon akkauntingiz bormi?{" "}
                        <Link
                          to="/auth"
                          className="font-medium text-fuchsia-300 hover:text-fuchsia-200"
                        >
                          Kirish
                        </Link>
                      </p>
                    </form>
                  </motion.div>
                )}

                {step === "otp" && (
                  <motion.div
                    key="otp"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="text-center mb-7">
                      <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 200,
                          damping: 15,
                        }}
                        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(34,211,238,0.20))",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <Mail className="h-7 w-7 text-fuchsia-300" />
                      </motion.div>
                      <h1 className="bg-gradient-to-br from-white to-fuchsia-200 bg-clip-text text-2xl font-bold text-transparent">
                        Emailingizni tekshiring
                      </h1>
                      <p className="mt-2 text-sm text-white/60">
                        Tasdiqlash kodi yuborildi:
                      </p>
                      <p className="mt-1 text-sm font-medium text-white">
                        {form.email}
                      </p>
                    </div>

                    <div className="flex justify-center mb-6">
                      <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={(v) => {
                          setOtp(v);
                          if (v.length === 6) handleVerify(v);
                        }}
                        disabled={submitting}
                      >
                        <InputOTPGroup className="gap-2">
                          {[0, 1, 2, 3, 4, 5].map((i) => (
                            <InputOTPSlot
                              key={i}
                              index={i}
                              className="h-14 w-12 rounded-xl border border-white/10 bg-white/[0.04] text-xl font-bold text-white first:rounded-l-xl last:rounded-r-xl data-[active=true]:border-fuchsia-400/60 data-[active=true]:ring-2 data-[active=true]:ring-fuchsia-400/30"
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    {submitting && (
                      <div className="flex items-center justify-center gap-2 text-sm text-white/60">
                        <Loader2 className="h-4 w-4 animate-spin" />{t("dynamic.finance.tekshirilmoqda")}</div>
                    )}

                    <div className="mt-4 text-center">
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendIn > 0}
                        className="inline-flex items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        {resendIn > 0
                          ? `Qayta yuborish (${resendIn}s)`
                          : "Kodni qayta yuborish"}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setStep("form")}
                      className="mt-6 flex items-center justify-center gap-1.5 w-full text-xs text-white/40 hover:text-white/70 transition-colors"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Email manzilini o'zgartirish
                    </button>
                  </motion.div>
                )}

                {step === "done" && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-8 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 12,
                      }}
                      className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-fuchsia-400 shadow-[0_0_60px_rgba(34,211,238,0.5)]"
                    >
                      <CheckCircle2 className="h-10 w-10 text-white" />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-white">
                      Tabriklaymiz!
                    </h1>
                    <p className="mt-2 text-sm text-white/60">
                      Akkauntingiz yaratildi. Panelingizga yo'naltirilmoqda...
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-white/40">
                <ShieldCheck className="h-3 w-3 text-purple-400/70" />
                Ma'lumotlaringiz shifrlangan holda himoyalangan
              </div>
            </div>
          </div>
        </motion.div>
        </div>
      </div>
    </div>
  );
}

function FieldWrap({
  icon: Icon,
  label,
  children,
}: {
  icon: any;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-white/70">{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        {children}
      </div>
    </div>
  );
}

