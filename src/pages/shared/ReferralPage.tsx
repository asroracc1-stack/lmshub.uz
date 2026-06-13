import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { Copy, Check, Users, Gift, Coins, Share2, Send, MessageCircle } from "lucide-react";

interface ReferralInfo {
  referralCode: string;
  coins: number;
  inviteCount: number;
}

interface Invitee {
  id: string;
  fullName: string;
  email: string;
  referralCode: string;
  createdAt: string;
}

export default function ReferralPage() {
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const SITE_URL = "https://lmshub.uz";

  useEffect(() => {
    Promise.all([
      api.get("/referral/my-info").then(r => r.data),
      api.get("/referral/my-invites").then(r => r.data),
    ]).then(([infoData, invData]) => {
      setInfo(infoData);
      setInvitees(Array.isArray(invData) ? invData : []);
    }).catch((err) => {
      console.error(err);
      setError(true);
      toast.error("Ma'lumot yuklanmadi. Qayta urinib ko'ring.");
    }).finally(() => setLoading(false));
  }, []);

  const inviteLink = info ? `https://t.me/LMSHub_bot?start=${info.referralCode}` : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Link nusxalandi!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Nusxalanmadi");
    }
  };

  const shareToTelegram = () => {
    const text = encodeURIComponent(`LMSHub platformasiga qo'shiling! 🎓\nMen allaqachon foydalanayapman. Ro'yxatdan o'ting va 10 coin oling! 🎁\n${inviteLink}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${text}`, "_blank");
  };

  const shareToInstagram = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success("Link nusxalandi! Instagram story'ga qo'ying 📸");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <Gift className="w-12 h-12 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground">Ma'lumotlarni yuklashda xatolik yuz berdi.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-primary text-white text-sm hover:bg-primary/90 transition-colors"
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6" style={{ padding: '15px' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
          Do'stlaringizni taklif qiling! 🎉
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Har bir taklif uchun siz va do'stingiz <strong className="text-yellow-500">10 coin</strong> olasiz!
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-lg py-10 px-6 text-center shadow-lg"
        >
          <div className="mx-auto w-12 h-12 rounded-full bg-yellow-500/15 flex items-center justify-center mb-3">
            <Coins className="w-6 h-6 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-yellow-500">{info?.coins ?? 0}</p>
          <p className="text-sm text-muted-foreground mt-1">Jami coinlar</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-lg py-10 px-6 text-center shadow-lg"
        >
          <div className="mx-auto w-12 h-12 rounded-full bg-purple-500/15 flex items-center justify-center mb-3">
            <Users className="w-6 h-6 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-purple-500">{info?.inviteCount ?? 0}</p>
          <p className="text-sm text-muted-foreground mt-1">Taklif qilganlarim</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-lg py-10 px-6 text-center shadow-lg"
        >
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center mb-3">
            <Gift className="w-6 h-6 text-primary" />
          </div>
          <p className="text-3xl font-bold text-primary">{(info?.inviteCount ?? 0) * 10}</p>
          <p className="text-sm text-muted-foreground mt-1">Ishlab topilgan coinlar</p>
        </motion.div>
      </div>

      {/* Invite Link Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-lg p-6 shadow-lg"
      >
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
          <Share2 className="w-5 h-5 text-primary" />
          Sizning invite havolangiz
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Do'stingiz havola orqali ro'yxatdan o'tib, kamida bitta test yoki vocabulary mashqini bajarsa, ikkalangiz ham <strong className="text-yellow-500">10 coin</strong> olasiz. Coinlar orqali yangi featurelarni ochishingiz mumkin.
        </p>

        <div className="mb-2 text-xs font-semibold text-purple-500">Invite link</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm font-mono truncate select-all">
            {inviteLink}
          </div>
          <button
            onClick={handleCopy}
            className="shrink-0 w-10 h-10 rounded-xl border border-border bg-muted/50 flex items-center justify-center hover:bg-primary/20 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-purple-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>

      {/* Invitees Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-lg p-6 shadow-lg"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Taklif qilganlarim</h2>
          <span className="text-sm text-muted-foreground">
            {invitees.length} ta foydalanuvchi
          </span>
        </div>

        {invitees.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Hali hech kimni taklif qilmadingiz</p>
            <p className="text-xs mt-1">Linkni do'stlaringizga yuboring va coin oling! 🎁</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-left text-muted-foreground">
                  <th className="py-3 px-2">#</th>
                  <th className="py-3 px-2">F.I.O</th>
                  <th className="py-3 px-2">Email</th>
                  <th className="py-3 px-2">Referral Code</th>
                  <th className="py-3 px-2">Qo'shilgan sana</th>
                </tr>
              </thead>
              <tbody>
                {invitees.map((inv, idx) => (
                  <motion.tr
                    key={inv.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-2 text-muted-foreground">{idx + 1}</td>
                    <td className="py-3 px-2 font-medium">{inv.fullName}</td>
                    <td className="py-3 px-2 text-muted-foreground">{inv.email}</td>
                    <td className="py-3 px-2">
                      <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {inv.referralCode}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">{inv.createdAt}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Social Share */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-lg p-6 shadow-lg"
      >
        <h2 className="text-lg font-bold mb-1">Ijtimoiy tarmoqlarda ulashish</h2>
        <p className="text-sm text-muted-foreground mb-4">Tezkor ulashish</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={shareToTelegram}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0088cc]/15 text-[#0088cc] hover:bg-[#0088cc]/25 border border-[#0088cc]/20 transition-colors font-medium text-sm"
          >
            <Send className="w-4 h-4" />
            Telegram
          </button>
          <button
            onClick={shareToInstagram}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/15 to-pink-500/15 text-pink-500 hover:from-purple-500/25 hover:to-pink-500/25 border border-pink-500/20 transition-colors font-medium text-sm"
          >
            <MessageCircle className="w-4 h-4" />
            Instagram
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-muted/50 hover:bg-muted border border-border transition-colors font-medium text-sm"
          >
            <Copy className="w-4 h-4" />
            Linkni nusxalash
          </button>
        </div>
      </motion.div>
    </div>
  );
}
