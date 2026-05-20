import { useState, useEffect, FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { roleHomePath, AppRole } from "@/lib/auth";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff, User as UserIcon, Lock, Mail, Shield, ArrowLeft } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { usePrefetchHelper } from "@/hooks/useOptimizedQueries";
import { useGoogleLogin } from "@react-oauth/google";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";

interface UserData {
  id: string;
  email: string;
  role: string;
  username?: string;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  avatarUrl?: string;
  avatar_url?: string;
  organizationId?: string | null;
  organization_id?: string | null;
  phone?: string | null;
}

interface LoginResponseData {
  access_token: string;
  token_type?: string;
  role?: string;
  organization_id?: string | null;
  user: UserData;
}

interface AuthProps {
  defaultMode?: "signin" | "signup";
}

export default function Auth({ defaultMode = "signin" }: AuthProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, loading, setAuth } = useAuth();
  const { t } = useTranslation();

  const [isSignIn, setIsSignIn] = useState(defaultMode === "signin");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [successMode, setSuccessMode] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const { prefetchRouteData } = usePrefetchHelper();

  // Form State
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  // Auto-clear session if requested in URL
  useEffect(() => {
    if (window.location.search.includes("clear") || window.location.search.includes("logout")) {
      localStorage.clear();
      window.location.href = "/auth";
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user && role && !successMode) {
      navigate(roleHomePath[role] || "/dashboard", { replace: true });
    }
  }, [user, role, loading, navigate, successMode]);

  // Handle URL changes
  useEffect(() => {
    if (location.pathname === "/signup") {
      setIsSignIn(false);
    } else if (location.pathname === "/auth" || location.pathname === "/signin") {
      setIsSignIn(true);
    }
  }, [location.pathname]);

  const toggleMode = () => {
    setIsSignIn(!isSignIn);
    navigate(isSignIn ? "/signup" : "/signin", { replace: true });
  };

  const handleAuthSuccess = (data: LoginResponseData, isSignup: boolean) => {
    const { access_token, user: userData } = data;
    if (!access_token) throw new Error("Token topilmadi");

    localStorage.setItem("access_token", access_token);
    localStorage.setItem("user", JSON.stringify(userData));
    setAuth(access_token, userData);

    let targetPath = "/dashboard";
    const roleUpper = (userData.role || "").toUpperCase();

    switch (roleUpper) {
      case "SUPER_ADMIN":
        targetPath = "/super-admin/dashboard";
        break;
      case "ADMIN":
        targetPath = "/admin/dashboard";
        break;
      case "ADMINISTRATOR":
        targetPath = "/administrator/dashboard";
        break;
      case "PACK_MANAGER":
      case "PAYMENT_MANAGER":
        targetPath = "/pack-manager/dashboard";
        break;
      case "TEACHER":
        targetPath = "/teacher/dashboard";
        break;
      case "STUDENT":
        targetPath = "/student/dashboard";
        break;
      case "PARENT":
        targetPath = "/parent/dashboard";
        break;
      case "USER":
        targetPath = "/user/dashboard";
        break;
      default:
        const isSuperAdmin = userData.username?.toLowerCase() === "asror"
          || userData.username?.toLowerCase() === "asrorsuper" 
          || userData.username?.toLowerCase() === "asrorsuperadmin";
        if (isSuperAdmin) {
          targetPath = "/super-admin/dashboard";
        } else {
          targetPath = "/dashboard";
        }
    }

    if (isSignup) {
      setSuccessMode(true);
      setTimeout(() => {
        window.location.href = targetPath;
      }, 1500);
    } else {
      window.location.href = targetPath;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (isSignIn) {
        const response = await api.post<LoginResponseData>("/auth/login", {
          username_or_email: username.trim() || email.trim(),
          password,
        });
        handleAuthSuccess(response.data, false);
      } else {
        if (phone && phone.length < 8) {
          toast.error("Iltimos, to'g'ri telefon raqam kiriting!");
          setPhoneError(true);
          setSubmitting(false);
          return;
        }
        setPhoneError(false);

        if (password.length < 6) {
          toast.error("Parol kamida 6 ta belgidan iborat bo'lishi kerak");
          setSubmitting(false);
          return;
        }

        const cleanPhone = phone.replace(/\D/g, "");
        const response = await api.post<LoginResponseData>("/auth/register", {
          email: email.trim(),
          username: username.trim(),
          fullName: fullName.trim(),
          phone: "+" + cleanPhone,
          password,
          confirmPassword: password, // Sending same password as confirmation
          otpCode: "777777", // Default bypass as requested previously
        });
        handleAuthSuccess(response.data, true);
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      if (apiErr.response?.status === 401) {
        toast.error("Login yoki parol noto'g'ri. Iltimos tekshirib qayta kiriting!");
      } else {
        toast.error(apiErr.response?.data?.message || apiErr.message || (isSignIn ? "Login yoki parol noto'g'ri. Iltimos tekshirib qayta kiriting!" : "Xatolik yuz berdi"));
      }
    } finally {
      if (!successMode) setSubmitting(false);
    }
  };

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await api.post<LoginResponseData>("/auth/google", { token: tokenResponse.access_token });
        handleAuthSuccess(res.data, false);
      } catch (err: unknown) {
        const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
        const errorMsg = apiErr.response?.data?.message || apiErr.message || "Google auth failed";
        toast.error(errorMsg);
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => setGoogleLoading(false)
  });

  const handleGoogleAuth = () => {
    setGoogleLoading(true);
    login();
  };

  if (successMode) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#030712]">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <DotLottieReact src="https://lottie.host/05a8da46-bffb-4416-a160-0b16adbce445/CxzFkSjThh.lottie" loop autoplay className="w-[300px] h-[300px]" />
          <h2 className="text-3xl font-bold text-white mt-6 tracking-tight">Muvaffaqiyatli!</h2>
          <p className="text-emerald-500 mt-3 font-medium">Dashboardga yo'naltirilmoqdasiz...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full grid grid-cols-1 lg:grid-cols-2 bg-white dark:bg-[#030712] selection:bg-emerald-500/30 selection:text-emerald-900 dark:selection:text-emerald-200 overflow-hidden">
      
      {/* LEFT COLUMN: Auth Forms */}
      <div className="relative flex flex-col items-center justify-center p-4 sm:p-8 md:p-12 pt-24 lg:pt-12 z-10 h-full overflow-hidden">
        
        {/* Top Controls: Back Button centered on mobile, top-left on large screens */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 lg:top-10 lg:left-10 lg:translate-x-0 z-20">
          <Link 
            to="/"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[10px] font-bold transition-all duration-300 shadow-md",
              "bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-200",
              "dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
            )}
          >
            <ArrowLeft className="w-3 h-3" />
            {t("auth.backToLanding")}
          </Link>
        </div>

        <div className="w-full max-w-md mx-auto flex flex-col justify-center h-full max-h-screen py-2 sm:py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={isSignIn ? "signin" : "signup"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="space-y-6 sm:space-y-10"
            >
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  <Logo size={64} showText variant="dark" />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <AnimatePresence mode="popLayout">
                  {!isSignIn && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: "auto" }} 
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 sm:space-y-4 overflow-hidden"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <Input 
                          value={fullName} 
                          onChange={(e) => setFullName(e.target.value)} 
                          placeholder={t("auth.fullName")} 
                          required 
                          className="h-12 sm:h-14 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus-visible:ring-0"
                        />
                        <div className="relative">
                          <PhoneInput
                            country={'uz'}
                            value={phone}
                            onChange={val => setPhone(val)}
                            containerClass="w-full"
                            inputClass={`!w-full !h-12 sm:!h-14 !rounded-xl !bg-slate-50 dark:!bg-slate-900/50 !border-slate-200 dark:!border-slate-800 !text-slate-900 dark:!text-white focus:!border-emerald-500 !shadow-none`}
                            buttonClass="!bg-transparent !border-none !rounded-l-xl !pl-3"
                            dropdownClass="!bg-white dark:!bg-slate-900 !text-slate-900 dark:!text-white !border-slate-200 dark:!border-slate-800"
                          />
                        </div>
                      </div>
                      <Input 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        placeholder={t("auth.email")} 
                        type="email"
                        required 
                        className="h-12 sm:h-14 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus-visible:ring-0"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                  <Input 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    placeholder={t("auth.username")} 
                    required 
                    className="pl-12 h-12 sm:h-14 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus-visible:ring-0 transition-all"
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                  <Input 
                    type={showPwd ? "text" : "password"} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder={t("auth.password")} 
                    required 
                    className="pl-12 pr-12 h-12 sm:h-14 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-emerald-500 focus-visible:ring-0 transition-all"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 dark:hover:text-white transition-colors">
                    {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                <Button 
                  type="submit" 
                  disabled={submitting} 
                  className="w-full h-12 sm:h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-emerald-600/20 transition-all duration-300"
                >
                  {submitting ? <Loader2 className="animate-spin h-6 w-6" /> : (isSignIn ? t("auth.signIn") : t("auth.signUp"))}
                </Button>
              </form>

              {/* Social Login */}
              <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t("auth.or")}</span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </div>
                <Button 
                  onClick={handleGoogleAuth}
                  disabled={googleLoading}
                  variant="outline"
                  className="w-full h-11 sm:h-13 bg-white dark:bg-transparent border-slate-200 dark:border-slate-800 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold rounded-xl flex items-center justify-center gap-3 transition-all text-sm sm:text-base"
                >
                  {googleLoading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  {t("auth.googleBtn")}
                </Button>
              </div>

              <div className="mt-4 sm:mt-6 text-center">
                <p className="text-slate-500 dark:text-slate-400 font-medium text-sm sm:text-base">
                  {isSignIn ? t("auth.noAccount") : t("auth.haveAccount")}
                  <button onClick={toggleMode} className="ml-2 text-emerald-600 dark:text-emerald-500 font-bold hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                    {isSignIn ? t("auth.signUp") : t("auth.signIn")}
                  </button>
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT COLUMN: Illustration & Branding */}
      <div className="hidden lg:flex relative bg-white dark:bg-slate-900/40 items-center justify-center overflow-hidden border-l border-slate-100 dark:border-slate-800 h-full">
        
        {/* Premium Glow Effects - "Oychi" (Moon) aesthetic */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-100 dark:bg-emerald-500/10 blur-[130px] rounded-full z-0 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-emerald-200/60 dark:bg-emerald-500/20 blur-[90px] rounded-full z-0" />

        <div className="relative z-10 w-full max-w-lg px-10 flex flex-col items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={isSignIn ? "signin-lottie" : "signup-lottie"}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="flex flex-col items-center text-center"
            >
              <DotLottieReact 
                src={isSignIn 
                  ? "https://lottie.host/a3366e14-1d32-4a7b-8a52-1c9be2a09e50/EkKAp2D7Rn.lottie" 
                  : "https://lottie.host/cce3255b-22d3-4c52-859f-bf0f9dccbda6/sXaP26Fbhu.lottie"
                }
                loop 
                autoplay 
                className="w-[450px] h-[450px] mix-blend-multiply" 
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Decorative Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-[0.2]" />
      </div>

    </div>
  );
}
