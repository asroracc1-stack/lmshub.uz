import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Loader2, Send, Coins } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { inviteLink, REFERRAL_BONUS } from "@/lib/branding";
import DonationCard from "@/components/DonationCard";
import AvatarUpload from "@/components/AvatarUpload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function UserAccount() {
  const { user, profile, refresh } = useAuth();
  const [refCount, setRefCount] = useState(0);
  const [referrer, setReferrer] = useState<string | null>(null);
  const [invited, setInvited] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [profile?.id]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: invList }, { data: ref }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, full_name, created_at")
          .eq("referred_by", user.id)
          .order("created_at", { ascending: false }),
        (profile as any)?.referred_by
          ? supabase
              .from("profiles")
              .select("username, full_name")
              .eq("id", (profile as any).referred_by)
              .maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      setInvited(invList ?? []);
      setRefCount((invList ?? []).length);
      setReferrer((ref as any)?.full_name ?? (ref as any)?.username ?? null);
      setLoading(false);
    })();
  }, [user?.id, (profile as any)?.referred_by]);

  const code = (profile as any)?.referral_code ?? "—";
  const link = code !== "—" ? inviteLink(code) : "";

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success("Nusxalandi");
  };

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone })
      .eq("id", user.id);
    setSavingProfile(false);
    if (error) return toast.error(error.message);
    toast.success("Profil saqlandi");
    refresh();
  };

  const sendFeedback = async () => {
    if (!fbBody.trim()) return toast.error("Matn kiriting");
    if (!user) return;
    setSendingFb(true);
    const { error } = await supabase.from("user_feedback").insert({
      user_id: user.id,
      subject: fbSubject || null,
      body: fbBody,
    });
    setSendingFb(false);
    if (error) return toast.error(error.message);
    setFbBody("");
    setFbSubject("");
    toast.success("Rahmat! Izohingiz qabul qilindi.");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <h1 className="font-display text-2xl md:text-3xl font-bold">Hisob</h1>

      <Tabs defaultValue="profile">
        <TabsList className="grid grid-cols-3 w-full max-w-xl">
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="invites">Takliflar</TabsTrigger>
          <TabsTrigger value="feedback">Izoh qoldirish</TabsTrigger>
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
                <Label>To'liq ism</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <Label>Username</Label>
                <Input value={profile?.username ?? ""} disabled />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={profile?.email ?? ""} disabled />
              </div>
            </div>
            <Button onClick={saveProfile} disabled={savingProfile}>
              {savingProfile && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Saqlash
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="invites" className="mt-6 space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-4">
              <p className="text-xs uppercase text-muted-foreground">Mening kodim</p>
              <p className="font-mono font-bold text-xl mt-1">{code}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase text-muted-foreground">Coin</p>
              <p className="font-display font-bold text-2xl mt-1 flex items-center gap-1">
                <Coins className="h-5 w-5 text-amber-500" />
                {profile?.coins ?? 0}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase text-muted-foreground">Jami referral</p>
              <p className="font-display font-bold text-2xl mt-1">{refCount}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase text-muted-foreground">Meni taklif qilgan</p>
              <p className="font-medium mt-1 truncate">{referrer ?? "Hech kim"}</p>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-display font-semibold text-lg">Sizning invite havolangiz</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Do'stingiz havola orqali ro'yxatdan o'tib kamida bitta test yoki vocabulary
              mashqini bajarsa, ikkalangiz ham {REFERRAL_BONUS} coin olasiz. Coinlar orqali
              yangi featurelarni ochishingiz mumkin.
            </p>
            <Label className="mt-4 block">Invite link</Label>
            <div className="flex gap-2 mt-1">
              <Input value={link} readOnly />
              <Button variant="outline" size="icon" onClick={() => copy(link)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-semibold text-lg">Taklif qilganlarim</h3>
              <span className="text-sm text-muted-foreground">{invited.length} ta foydalanuvchi</span>
            </div>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto my-6" />
            ) : invited.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                Hali hech kimni taklif qilmagansiz
              </p>
            ) : (
              <div className="space-y-2">
                {invited.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{u.full_name ?? u.username}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("uz-UZ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="mt-6 space-y-4">
          <DonationCard />
          <Card className="p-6 space-y-3">
            <h3 className="font-display font-semibold text-lg">Izoh qoldirish</h3>
            <p className="text-sm text-muted-foreground">Taklif yoki muammo yozib qoldiring</p>
            <div>
              <Label>Mavzu (ixtiyoriy)</Label>
              <Input value={fbSubject} onChange={(e) => setFbSubject(e.target.value)} />
            </div>
            <div>
              <Label>Izoh</Label>
              <Textarea
                rows={5}
                value={fbBody}
                onChange={(e) => setFbBody(e.target.value)}
                placeholder="Yozing..."
              />
            </div>
            <Button onClick={sendFeedback} disabled={sendingFb}>
              {sendingFb ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Yuborish
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
