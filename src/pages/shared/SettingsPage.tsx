import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Globe,
  KeyRound,
  Loader2,
  Monitor,
  Moon,
  Save,
  Send,
  Shield,
  Sparkles,
  Sun,
  Settings as SettingsIcon,
} from "lucide-react";

interface Settings {
  theme: string;
  language: string;
  email_notifications: boolean;
  push_notifications: boolean;
  telegram_notifications: boolean;
  compact_mode: boolean;
}

const DEFAULTS: Settings = {
  theme: "system",
  language: "uz",
  email_notifications: true,
  push_notifications: true,
  telegram_notifications: true,
  compact_mode: false,
};

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const { theme: appTheme, setTheme } = useTheme();
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  // SuperAdmin uchun username o'zgartirish
  const [newUsername, setNewUsername] = useState("");

  const [tgUsername, setTgUsername] = useState(profile?.telegram_username ?? "");
  const [tgSaving, setTgSaving] = useState(false);

  useEffect(() => setTgUsername(profile?.telegram_username ?? ""), [profile?.telegram_username]);

  useEffect(() => {
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const save = async () => {
    setSaving(true);
    try {
      if (s.theme === "light" || s.theme === "dark") setTheme(s.theme);
      i18n.changeLanguage(s.language);
      toast.success(t("common.saved"));
    } catch {
      toast.error(t("settings.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const saveTg = async () => {
    if (!user?.id) return;
    setTgSaving(true);
    try {
      await api.put(`/admin/users/${user.id}`, {
        telegramUsername: tgUsername.trim().replace(/^@/, "") || null,
      });
      toast.success(t("common.saved"));
    } catch (e: any) {
      toast.error(e.response?.data?.message || t("settings.errorOccurred"));
    } finally {
      setTgSaving(false);
    }
  };

  const changePassword = async () => {
    if (pwdNew.length < 6) return toast.error(t("settings.passwordLength"));
    if (pwdNew !== pwdConfirm) return toast.error(t("settings.passwordMismatch"));
    setPwdSaving(true);
    try {
      const isSuperAdmin = user?.role?.toLowerCase() === "super_admin";
      if (isSuperAdmin) {
        // SuperAdmin: username + parol bir vaqtda yangilanadi
        const res = await api.put("/super-admin/profile", {
          username: newUsername.trim() || undefined,
          password: pwdNew,
        });
        // Yangi token saqlash
        if (res.data?.access_token) {
          localStorage.setItem("access_token", res.data.access_token);
        }
        toast.success(t("settings.profileUpdated"));
        setNewUsername("");
      } else {
        await api.post(`/admin/users/${user?.id}/password`, { password: pwdNew });
        toast.success(t("common.saved"));
      }
      setPwdNew("");
      setPwdConfirm("");
    } catch (e: any) {
      toast.error(e.response?.data?.message || t("settings.errorOccurred"));
    } finally {
      setPwdSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="py-4 md:py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center gap-2 mb-2">
          <SettingsIcon className="h-5 w-5 text-primary" />
          <h1 className="font-display text-2xl md:text-3xl font-bold">
            {t("settings.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </motion.div>

      {/* MacBook mockup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto w-full"
      >
        <div className="relative">
          {/* Laptop body */}
          <div className="rounded-t-2xl bg-gradient-to-b from-zinc-700 to-zinc-900 p-2 md:p-3 shadow-elegant">
            {/* Screen bezel */}
            <div className="rounded-xl bg-black p-1.5 md:p-2">
              {/* Camera notch */}
              <div className="flex justify-center pb-1">
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
              </div>
              {/* Screen content */}
              <div className="rounded-lg bg-background overflow-hidden border border-zinc-800">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/40">
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
                  </div>
                  <div className="ml-3 flex-1 max-w-xs h-5 rounded-md bg-background/80 border border-border text-[10px] text-muted-foreground flex items-center px-2">
                    🔒 lmshub.app/settings
                  </div>
                </div>

                {/* Inner content */}
                <div className="p-4 md:p-6 max-h-[70vh] overflow-y-auto">
                  <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid grid-cols-4 w-full mb-5">
                      <TabsTrigger value="general">
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        <span className="hidden sm:inline">{t("settings.tabs.general")}</span>
                      </TabsTrigger>
                      <TabsTrigger value="notifications">
                        <Bell className="h-3.5 w-3.5 mr-1.5" />
                        <span className="hidden sm:inline">{t("settings.tabs.notifications")}</span>
                      </TabsTrigger>
                      <TabsTrigger value="telegram">
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        <span className="hidden sm:inline">{t("settings.tabs.telegram")}</span>
                      </TabsTrigger>
                      <TabsTrigger value="security">
                        <Shield className="h-3.5 w-3.5 mr-1.5" />
                        <span className="hidden sm:inline">{t("settings.tabs.security")}</span>
                      </TabsTrigger>
                    </TabsList>

                    {/* GENERAL */}
                    <TabsContent value="general" className="space-y-5">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">{t("settings.theme")}</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { v: "light", label: t("settings.themeLight"), icon: Sun },
                            { v: "dark", label: t("settings.themeDark"), icon: Moon },
                            { v: "system", label: t("settings.themeSystem"), icon: Monitor },
                          ].map((opt) => (
                            <button
                              key={opt.v}
                              type="button"
                              onClick={() => {
                                setS({ ...s, theme: opt.v });
                                if (opt.v === "light" || opt.v === "dark") setTheme(opt.v);
                              }}
                              className={`flex flex-col items-center gap-1.5 p-4 rounded-lg border-2 transition-smooth ${
                                s.theme === opt.v
                                  ? "border-primary bg-primary/10 text-primary shadow-glow"
                                  : "border-border hover:border-primary/40"
                              }`}
                            >
                              <opt.icon className="h-5 w-5" />
                              <span className="text-xs font-medium">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                          <Globe className="h-4 w-4" /> {t("settings.language")}
                        </Label>
                        <Select
                          value={s.language}
                          onValueChange={(v) => {
                            setS({ ...s, language: v });
                            i18n.changeLanguage(v);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="uz">🇺🇿 O'zbek</SelectItem>
                            <SelectItem value="ru">🇷🇺 Русский</SelectItem>
                            <SelectItem value="en">🇬🇧 English</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                        <div>
                          <p className="font-medium text-sm">{t("settings.compact")}</p>
                          <p className="text-xs text-muted-foreground">
                            {t("settings.compactDesc")}
                          </p>
                        </div>
                        <Switch
                          checked={s.compact_mode}
                          onCheckedChange={(v) => setS({ ...s, compact_mode: v })}
                        />
                      </div>

                      <Button onClick={save} disabled={saving} variant="hero" className="w-full">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        {t("settings.saveAll")}
                      </Button>
                    </TabsContent>

                    {/* NOTIFICATIONS */}
                    <TabsContent value="notifications" className="space-y-3">
                      {[
                        { key: "email_notifications" as const, label: t("settings.email"), desc: t("settings.emailDesc") },
                        { key: "push_notifications" as const, label: t("settings.push"), desc: t("settings.pushDesc") },
                        { key: "telegram_notifications" as const, label: t("settings.telegram"), desc: t("settings.telegramDesc") },
                      ].map((row) => (
                        <div
                          key={row.key}
                          className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20"
                        >
                          <div>
                            <p className="font-medium text-sm">{row.label}</p>
                            <p className="text-xs text-muted-foreground">{row.desc}</p>
                          </div>
                          <Switch
                            checked={s[row.key]}
                            onCheckedChange={(v) => setS({ ...s, [row.key]: v })}
                          />
                        </div>
                      ))}
                      <Button onClick={save} disabled={saving} variant="hero" className="w-full">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        {t("settings.saveAll")}
                      </Button>
                    </TabsContent>

                    {/* TELEGRAM */}
                    <TabsContent value="telegram" className="space-y-4">
                      <p className="text-sm text-muted-foreground">{t("settings.telegramAbout")}</p>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            @
                          </span>
                          <Input
                            className="pl-7"
                            placeholder="username"
                            value={tgUsername.replace(/^@/, "")}
                            onChange={(e) => setTgUsername(e.target.value)}
                          />
                        </div>
                        <Button onClick={saveTg} disabled={tgSaving}>
                          {tgSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
                        </Button>
                      </div>
                      <a
                        href="https://t.me/LMSHub_bot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Send className="h-4 w-4" /> {t("settings.openBot")}
                      </a>
                    </TabsContent>

                    {/* SECURITY */}
                    <TabsContent value="security" className="space-y-4">
                      {/* SuperAdmin uchun username o'zgartirish */}
                      {user?.role?.toLowerCase() === "super_admin" && (
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-2 text-sm font-semibold">
                            <Shield className="h-3.5 w-3.5" /> {t("settings.newUsername")}
                          </Label>
                          <Input
                            type="text"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            placeholder={t("settings.newUsername")}
                          />
                          <p className="text-xs text-muted-foreground">
                            {t("settings.newUsernameDesc")}
                          </p>
                        </div>
                      )}

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="flex items-center gap-2 text-sm font-semibold">
                            <KeyRound className="h-3.5 w-3.5" /> {t("settings.newPassword")}
                          </Label>
                          <Input
                            type="password"
                            value={pwdNew}
                            onChange={(e) => setPwdNew(e.target.value)}
                            placeholder="••••••"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold">
                            {t("settings.confirmPassword")}
                          </Label>
                          <Input
                            type="password"
                            value={pwdConfirm}
                            onChange={(e) => setPwdConfirm(e.target.value)}
                            placeholder="••••••"
                          />
                        </div>
                      </div>
                      <Button onClick={changePassword} disabled={pwdSaving} variant="hero" className="w-full">
                        {pwdSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <KeyRound className="h-4 w-4 mr-2" />
                        )}
                        {t("settings.changePassword")}
                      </Button>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          </div>

          {/* Laptop base */}
          <div className="relative">
            <div className="h-3 md:h-4 bg-gradient-to-b from-zinc-800 to-zinc-700 rounded-b-md mx-[-1.5%]" />
            <div className="h-1.5 bg-gradient-to-b from-zinc-900 to-zinc-700 rounded-b-2xl mx-[-3%] shadow-2xl" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-1.5 bg-zinc-950 rounded-b-md" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

