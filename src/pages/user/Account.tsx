import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Loader2, Send, Coins } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { REFERRAL_BONUS } from "@/lib/branding";
import DonationCard from "@/components/DonationCard";
import AvatarUpload from "@/components/AvatarUpload";
import { api } from "@/lib/axios";

export default function UserAccount() {
  const { t } = useTranslation();
  const { user, profile, refresh } = useAuth();
  const [refCount, setRefCount] = useState(0);
  const [referrer, setReferrer] = useState<string | null>(null);
  const [invited, setInvited] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string>("—");
  const [userCoins, setUserCoins] = useState<number>(profile?.coins ?? 0);

  // profile form
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  // feedback
  const [fbSubject, setFbSubject] = useState("");
  const [fbBody, setFbBody] = useState("");
  const [sendingFb, setSendingFb] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    if (profile?.coins !== undefined) {
      setUserCoins(profile.coins);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [infoRes, invitesRes] = await Promise.all([
          api.get("/referral/my-info"),
          api.get("/referral/my-invites"),
        ]);
        const info = infoRes.data;
        const invList = invitesRes.data;

        setReferralCode(info.referralCode || "—");
        setUserCoins(info.coins || 0);
        setRefCount(info.inviteCount || 0);
        setReferrer(info.referredByName || null);
        setInvited(Array.isArray(invList) ? invList : []);
      } catch (err) {
        console.error("Failed to load referral data", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const link = referralCode !== "—" ? `https://t.me/LMSHub_bot?start=${referralCode}` : "";

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success(t("common.copied", "Nusxalandi"));
  };

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await api.put("/profile/update", {
        fullName,
        phone,
      });
      toast.success(t("settings.profileUpdated", "Profil saqlandi"));
      refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const sendFeedback = async () => {
    if (!fbBody.trim()) return toast.error(t("account.pleaseEnterText", "Matn kiriting"));
    if (!user) return;
    setSendingFb(true);
    try {
      await api.post("/support/feedback", {
        subject: fbSubject || null,
        message: fbBody,
      });
      setFbBody("");
      setFbSubject("");
      toast.success(t("account.feedbackSuccess", "Rahmat! Izohingiz qabul qilindi."));
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to send feedback");
    } finally {
      setSendingFb(false);
    }
  };

  return (
    <div className="space-y-6 w-full text-foreground">
      <h1 className="font-display text-2xl md:text-3xl font-bold">{t("nav.account")}</h1>

      <Tabs defaultValue="profile">
        <TabsList className="grid grid-cols-3 w-full max-w-xl">
          <TabsTrigger value="profile">{t("common.profile")}</TabsTrigger>
          <TabsTrigger value="invites">{t("account.invites", "Takliflar")}</TabsTrigger>
          <TabsTrigger value="feedback">{t("account.feedback", "Izoh qoldirish")}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-4">
          <Card className="p-6 space-y-4">
            {user && (
              <AvatarUpload
                userId={user.id}
                currentUrl={profile?.avatar_url ?? null}
                initials={(profile?.full_name ?? profile?.username ?? "U")[0]?.toUpperCase()}
                onUploaded={() => refresh()}
              />
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-700 dark:text-slate-200 font-semibold mb-1.5 block">{t("auth.fullName")}</Label>
                <Input 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)}
                  className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950/60 border-slate-200 dark:border-white/10 focus:border-purple-500 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-slate-700 dark:text-slate-200 font-semibold mb-1.5 block">{t("account.phone", "Telefon")}</Label>
                <Input 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)}
                  className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950/60 border-slate-200 dark:border-white/10 focus:border-purple-500 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-slate-700 dark:text-slate-200 font-semibold mb-1.5 block">{t("account.username", "Username")}</Label>
                <Input 
                  value={profile?.username ?? ""} 
                  disabled 
                  className="text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-white/5 opacity-70 cursor-not-allowed rounded-xl"
                />
              </div>
              <div>
                <Label className="text-slate-700 dark:text-slate-200 font-semibold mb-1.5 block">{t("auth.email")}</Label>
                <Input 
                  value={profile?.email ?? ""} 
                  disabled 
                  className="text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-white/5 opacity-70 cursor-not-allowed rounded-xl"
                />
              </div>
            </div>
            <Button onClick={saveProfile} disabled={savingProfile}>
              {savingProfile && <Loader2 className="h-4 w-4 animate-spin mr-2" />} {t("common.save", "Saqlash")}
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="invites" className="mt-6 space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-slate-900 dark:text-slate-100">
            <Card className="p-4 bg-white dark:bg-slate-950/40 border-slate-200 dark:border-white/10">
              <p className="text-xs uppercase text-slate-500 dark:text-slate-400">{t("account.myCode", "Mening kodim")}</p>
              <p className="font-mono font-bold text-xl mt-1 text-slate-900 dark:text-white">{referralCode}</p>
            </Card>
            <Card className="p-4 bg-white dark:bg-slate-950/40 border-slate-200 dark:border-white/10">
              <p className="text-xs uppercase text-slate-500 dark:text-slate-400">{t("account.coins", "Coin")}</p>
              <p className="font-display font-bold text-2xl mt-1 flex items-center gap-1 text-slate-900 dark:text-white">
                <Coins className="h-5 w-5 text-amber-500" />
                {userCoins}
              </p>
            </Card>
            <Card className="p-4 bg-white dark:bg-slate-950/40 border-slate-200 dark:border-white/10">
              <p className="text-xs uppercase text-slate-500 dark:text-slate-400">{t("account.totalReferral", "Jami referral")}</p>
              <p className="font-display font-bold text-2xl mt-1 text-slate-900 dark:text-white">{refCount}</p>
            </Card>
            <Card className="p-4 bg-white dark:bg-slate-950/40 border-slate-200 dark:border-white/10">
              <p className="text-xs uppercase text-slate-500 dark:text-slate-400">{t("account.referredBy", "Meni taklif qilgan")}</p>
              <p className="font-medium mt-1 truncate text-slate-900 dark:text-white">{referrer ?? t("account.noOne", "Hech kim")}</p>
            </Card>
          </div>

          <Card className="p-6 bg-white dark:bg-slate-950/40 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100">
            <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white">{t("account.inviteLinkTitle", "Sizning invite havolangiz")}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {t("account.inviteLinkDesc", { count: REFERRAL_BONUS })}
            </p>
            <Label className="mt-4 block text-slate-700 dark:text-slate-200 font-semibold mb-1.5">{t("account.inviteLinkLabel", "Invite link")}</Label>
            <div className="flex gap-2 mt-1">
              <Input 
                value={link} 
                readOnly 
                className="text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-white/10 font-mono text-sm rounded-xl"
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => copy(link)}
                className="border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Copy className="h-4 w-4 text-slate-700 dark:text-slate-300" />
              </Button>
            </div>
          </Card>

          <Card className="p-6 bg-white dark:bg-slate-950/40 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white">{t("account.myInvites", "Taklif qilganlarim")}</h3>
              <span className="text-sm text-slate-500 dark:text-slate-400">{t("account.userCount", { count: invited.length })}</span>
            </div>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto my-6" />
            ) : invited.length === 0 ? (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-6">
                {t("account.noInvitesYet", "Hali hech kimni taklif qilmagansiz")}
              </p>
            ) : (
              <div className="space-y-2">
                {invited.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-white dark:bg-slate-900/30"
                  >
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{u.fullName ?? u.username}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">@{u.username}</p>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {u.createdAt ? u.createdAt : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="mt-6 space-y-4">
          <DonationCard />
          <Card className="p-6 space-y-3 bg-white dark:bg-slate-950/40 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100">
            <h3 className="font-display font-semibold text-lg text-slate-900 dark:text-white">{t("account.feedback", "Izoh qoldirish")}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t("account.feedbackDesc", "Taklif yoki muammo yozib qoldiring")}</p>
            <div>
              <Label className="text-slate-700 dark:text-slate-200 font-semibold mb-1.5 block">{t("account.feedbackSubject", "Mavzu (ixtiyoriy)")}</Label>
              <Input 
                value={fbSubject} 
                onChange={(e) => setFbSubject(e.target.value)}
                className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950/60 border-slate-200 dark:border-white/10 focus:border-purple-500 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-slate-700 dark:text-slate-200 font-semibold mb-1.5 block">{t("account.feedbackComment", "Izoh")}</Label>
              <Textarea
                rows={5}
                value={fbBody}
                onChange={(e) => setFbBody(e.target.value)}
                placeholder={t("account.feedbackPlaceholder", "Yozing...")}
                className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950/60 border-slate-200 dark:border-white/10 focus:border-purple-500 rounded-xl"
              />
            </div>
            <Button onClick={sendFeedback} disabled={sendingFb}>
              {sendingFb ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {t("account.sendBtn", "Yuborish")}
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

