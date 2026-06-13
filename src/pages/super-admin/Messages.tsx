import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessagesSquare,
  Plus,
  Search,
  Send,
  Megaphone,
  Inbox,
  Trash2,
  Loader2,
  Building2,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Profile { id: string; full_name: string | null; username: string; avatar_url: string | null; organization_id: string | null }
interface Org { id: string; name: string }
interface Message {
  id: string;
  sender: { id: string; full_name: string; email: string } | null;
  receiver: { id: string; full_name: string; email: string } | null;
  subject: string;
  content: string;
  is_read: boolean;
  type: "DIRECT" | "BROADCAST";
  sent_at: string;
}

const schema = z.object({
  subject: z.string().trim().min(2, "Mavzu kerak").max(200),
  content: z.string().trim().min(2, "Matn kerak").max(5000),
  targetType: z.enum(["direct", "broadcast_org", "broadcast_all"]),
  receiver_id: z.string().optional(),
  organization_id: z.string().optional(),
});

const initials = (s: string) => s.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const timeAgo = (iso: string) => {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "hozir";
  if (m < 60) return `${m} daq`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat`;
  return `${Math.floor(h / 24)} kun`;
};

export default function Messages() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "sent" | "broadcast">("all");
  const [active, setActive] = useState<Message | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    content: "",
    targetType: "direct" as "direct" | "broadcast_org" | "broadcast_all",
    organization_id: "",
    receiver_id: "",
  });

  useEffect(() => {
    const fetchUsers = async () => {
      if (form.targetType === "broadcast_all") return;
      try {
        let url = "/admin/users";
        if (form.targetType === "broadcast_org" && form.organization_id) {
          url += `?organizationId=${form.organization_id}`;
        } else if (form.targetType === "broadcast_org" && !form.organization_id) {
          setProfiles([]);
          return;
        }
        const res = await api.get<Profile[]>(url);
        setProfiles(res.data);
      } catch (error) {
        console.error("Foydalanuvchilarni yuklashda xatolik:", error);
      }
    };
    if (open) fetchUsers();
  }, [form.targetType, form.organization_id, open]);

  const load = async () => {
    setLoading(true);
    try {
      const [msgRes, orgRes] = await Promise.all([
        api.get<Message[]>("/messages"),
        api.get<any>("/organizations?size=1000"),
      ]);
      setMessages(Array.isArray(msgRes.data) ? msgRes.data : (msgRes.data as any)?.content || []);
      setOrgs(Array.isArray(orgRes.data) ? orgRes.data : orgRes.data?.content || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const profMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const orgMap = useMemo(() => new Map(orgs.map((o) => [o.id, o.name])), [orgs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (tab === "sent" && m.sender?.id !== user?.id) return false;
      if (tab === "broadcast" && m.type !== "BROADCAST") return false;
      if (!q) return true;
      return (
        m.subject.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q) ||
        (m.receiver?.full_name ?? m.receiver?.email ?? "").toLowerCase().includes(q) ||
        (m.sender?.full_name ?? m.sender?.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [messages, search, tab, user]);

  const stats = useMemo(() => ({
    total: messages.length,
    broadcasts: messages.filter((m) => m.type === "BROADCAST").length,
    sent: messages.filter((m) => m.sender?.id === user?.id).length,
  }), [messages, user]);

  const resetForm = () => {
    setForm({ subject: "", content: "", targetType: "direct", organization_id: "", receiver_id: "" });
  };

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    if (!user) return;

    setSubmitting(true);
    try {
      await api.post("/messages", {
        subject: parsed.data.subject,
        content: parsed.data.content,
        type: parsed.data.targetType === "broadcast_all" ? "BROADCAST" : "DIRECT",
        receiverId: parsed.data.receiver_id || null,
      });
      toast.success(t("dynamic.messages.xabar_yuborildi"));
      setOpen(false);
      resetForm();
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (m: Message) => {
    try {
      await api.delete(`/messages/${m.id}`);
      toast.success(t("dynamic.usersmanager.o_chirildi"));
      if (active?.id === m.id) setActive(null);
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Xatolik yuz berdi");
    }
  };

  const cards = [
    { label: "Jami xabarlar", value: stats.total, icon: MessagesSquare, accent: "from-primary to-primary-glow" },
    { label: "Yuborilganlar", value: stats.sent, icon: Send, accent: "from-secondary to-secondary-glow" },
    { label: "Broadcast", value: stats.broadcasts, icon: Megaphone, accent: "from-accent to-accent" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("dynamic.messages.xabarlar")}</h1>
          <p className="text-muted-foreground">{t("dynamic.messages.foydalanuvchilarga_xabar_yo_llash")}</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button variant="hero"><Plus className="h-4 w-4" />{t("dynamic.messages.yangi_xabar")}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("dynamic.messages.yangi_xabar_yuborish")}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label>{t("dynamic.messages.yo_naltirish")}</Label>
                <Select value={form.targetType} onValueChange={(v: "direct" | "broadcast_org" | "broadcast_all") => setForm((f) => ({ ...f, targetType: v, organization_id: "", receiver_id: "" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct"><div className="flex items-center gap-2"><UserIcon className="h-3.5 w-3.5" />{t("dynamic.messages.bitta_foydalanuvchiga")}</div></SelectItem>
                    <SelectItem value="broadcast_org"><div className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" />{t("dynamic.messages.tashkilot_a_zolariga")}</div></SelectItem>
                    <SelectItem value="broadcast_all"><div className="flex items-center gap-2"><Megaphone className="h-3.5 w-3.5" />{t("dynamic.messages.hammasiga_broadcast")}</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.targetType === "broadcast_org" && (
                <div className="grid gap-2">
                  <Label>{t("dynamic.messages.tashkilotni_tanlang")}</Label>
                  <Select value={form.organization_id} onValueChange={(v) => setForm((f) => ({ ...f, organization_id: v, receiver_id: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Tashkilotni tanlang..." /></SelectTrigger>
                    <SelectContent className="max-h-56">
                      {orgs.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(form.targetType === "direct" || (form.targetType === "broadcast_org" && form.organization_id)) && (
                <div className="grid gap-2">
                  <Label>{t("dynamic.messages.qabul_qiluvchi")}</Label>
                  <Select value={form.receiver_id} onValueChange={(v) => setForm((f) => ({ ...f, receiver_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Foydalanuvchi tanlang..." /></SelectTrigger>
                    <SelectContent className="max-h-56">
                      {profiles.filter((p) => p.id !== user?.id).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name ?? p.username} <span className="text-muted-foreground">@{p.username}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}              <div className="grid gap-2">
                <Label>{t("dynamic.messages.mavzu_")}</Label>
                <Input value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Xabar mavzusi" />
              </div>
              <div className="grid gap-2">
                <Label>{t("dynamic.messages.matn_")}</Label>
                <Textarea rows={6} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} placeholder="Xabar matnini yozing..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>{t("dynamic.usersmanager.bekor")}</Button>
              <Button variant="hero" onClick={submit} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Yuborish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-2xl p-4 md:p-5"
          >
            <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${c.accent} grid place-items-center shadow-glow`}>
              <c.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <p className="mt-3 text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
            <p className="font-display text-2xl font-bold mt-1">{c.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Inbox layout */}
      <div className="grid lg:grid-cols-5 gap-4 h-[600px]">
        <div className="glass rounded-2xl lg:col-span-2 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..." className="pl-9 h-9" />
            </div>
            <div className="flex gap-1">
              {(["all", "sent", "broadcast"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "flex-1 px-2 py-1.5 text-xs rounded-md transition-smooth",
                    tab === t ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  {t === "all" ? "Hammasi" : t === "sent" ? "Yuborilgan" : "Broadcast"}
                </button>
              ))}
            </div>
          </div>
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-sm text-muted-foreground">{t("dynamic.messages.xabarlar_yo_q")}</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((m) => {
                  const isMine = m.sender?.id === user?.id;
                  const other = isMine ? m.receiver : m.sender;
                  return (
                    <li key={m.id}>
                      <button
                        onClick={() => setActive(m)}
                        className={cn(
                          "w-full text-left p-3 hover:bg-muted/40 transition-smooth flex gap-3",
                          active?.id === m.id && "bg-primary/10"
                        )}
                      >
                        <Avatar className="h-9 w-9 shrink-0">
                          {other?.avatar_url && <AvatarImage src={other.avatar_url} />}
                          <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                            {initials(other?.full_name ?? other?.email ?? "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate">
                              {isMine && <span className="text-muted-foreground">→ </span>}
                              {other?.full_name ?? other?.username ?? "—"}
                            </p>
                            <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(m.sent_at)}</span>
                          </div>
                          <p className="text-xs font-medium truncate">{m.subject}</p>
                          <p className="text-xs text-muted-foreground truncate">{m.content}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </div>

        {/* Detail */}
        <div className="glass rounded-2xl lg:col-span-3 flex flex-col overflow-hidden">
          {active ? (
            <>
              <div className="p-4 border-b border-border flex items-start justify-between gap-3">
                <div className="flex gap-3 min-w-0 flex-1">
                  {(() => {
                    const isMine = active.sender?.id === user?.id;
                    const other = isMine ? active.receiver : active.sender;
                    return (
                      <>
                        <Avatar className="h-12 w-12 shrink-0 border border-primary/30">
                          <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                            {initials(other?.full_name ?? other?.email ?? "?")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-display text-lg font-semibold truncate">{active.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {isMine ? "Yuborildi: " : "Yuboruvchi: "}
                            <span className="text-foreground font-medium">
                              {other?.full_name ?? other?.email ?? "—"}
                            </span>
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(active.sent_at).toLocaleString()}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="text-destructive shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("dynamic.usersmanager.o_chirilsinmi")}</AlertDialogTitle>
                      <AlertDialogDescription>{t("dynamic.messages.xabar_o_chiriladi")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("dynamic.usersmanager.bekor")}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove(active)} className="bg-destructive">{t("dynamic.usersmanager.o_chirish")}</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <ScrollArea className="flex-1 p-6">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{active.content}</p>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 grid place-items-center text-center p-8">
              <div>
                <MessagesSquare className="h-14 w-14 text-muted-foreground mx-auto mb-4 opacity-40" />
                <p className="font-display text-lg">{t("dynamic.messages.xabar_tanlang")}</p>
                <p className="text-sm text-muted-foreground">{t("dynamic.messages.yoki_yangi_xabar_yuboring")}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

