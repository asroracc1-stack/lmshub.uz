import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AvatarUpload from "@/components/AvatarUpload";
import { roleLabel } from "@/lib/auth";

const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Ism kiritilishi shart").max(100),
  email: z.string().trim().email("Email noto'g'ri").max(255).or(z.literal("")),
  phone: z.string().trim().max(30).or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  current: z.string().min(1, "Joriy parol kiritilishi shart"),
  next: z.string().min(6, "Yangi parol kamida 6 ta belgi bo'lishi kerak"),
  confirm: z.string().min(6, "Parolni tasdiqlash kamida 6 ta belgi bo'lishi kerak"),
}).refine((data) => data.next === data.confirm, {
  message: "Parollar mos emas",
  path: ["confirm"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function SharedProfile() {
  const { profile, refresh, role, user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: "", email: "", phone: "" },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: "", next: "", confirm: "" },
  });

  useEffect(() => {
    if (profile) {
      resetProfile({
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
      });
    }
  }, [profile, resetProfile]);

  const onSaveProfile = async (data: ProfileFormValues) => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: data.full_name,
        email: data.email || null,
        phone: data.phone || null,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profil muvaffaqiyatli yangilandi ✨");
    refresh();
  };

  const onSavePassword = async (data: PasswordFormValues) => {
    if (!user?.email) return;
    setSavingPwd(true);
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: data.current,
    });
    if (signErr) {
      setSavingPwd(false);
      toast.error("Joriy parol noto'g'ri kiritildi");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: data.next });
    setSavingPwd(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Parol muvaffaqiyatli o'zgartirildi 🔐");
    resetPassword({ current: "", next: "", confirm: "" });
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold">Profil</h1>
        <p className="text-sm text-muted-foreground">
          {role && roleLabel[role]} • @{profile.username}
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <AvatarUpload
              userId={profile.id}
              currentUrl={profile.avatar_url}
              initials={(profile.full_name || profile.username).split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
              onUploaded={() => refresh()}
            />
            <div>
              <p className="font-display font-semibold text-lg">
                {profile.full_name || profile.username}
              </p>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit(onSaveProfile)} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <Label>To'liq ism</Label>
                <Input {...registerProfile("full_name")} />
                {profileErrors.full_name && (
                  <p className="text-xs text-destructive">{profileErrors.full_name.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" {...registerProfile("email")} />
                {profileErrors.email && (
                  <p className="text-xs text-destructive">{profileErrors.email.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Telefon</Label>
                <Input {...registerProfile("phone")} />
                {profileErrors.phone && (
                  <p className="text-xs text-destructive">{profileErrors.phone.message}</p>
                )}
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Saqlash
            </Button>
          </form>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-6 space-y-4">
          <h3 className="font-display font-semibold text-lg">Parolni o'zgartirish</h3>
          <form onSubmit={handlePasswordSubmit(onSavePassword)} className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Joriy parol</Label>
                <Input type="password" {...registerPassword("current")} />
                {passwordErrors.current && (
                  <p className="text-xs text-destructive">{passwordErrors.current.message}</p>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Yangi parol</Label>
                  <Input type="password" {...registerPassword("next")} />
                  {passwordErrors.next && (
                    <p className="text-xs text-destructive">{passwordErrors.next.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Tasdiqlash</Label>
                  <Input type="password" {...registerPassword("confirm")} />
                  {passwordErrors.confirm && (
                    <p className="text-xs text-destructive">{passwordErrors.confirm.message}</p>
                  )}
                </div>
              </div>
            </div>
            <Button type="submit" disabled={savingPwd} variant="secondary">
              {savingPwd && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              O'zgartirish
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
