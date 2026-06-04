import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
// Supabase client import removed
import { useAuth } from "@/contexts/AuthContext";
import { Inbox, Megaphone, Plus, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios";

interface Message {
  id: string;
  subject: string;
  body: string;
  sender_id: string;
  recipient_id: string | null;
  is_broadcast: boolean;
  created_at: string;
  organization_id: string | null;
}

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
}

export default function OrgMessages() {
  const { user, role, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [orgUsers, setOrgUsers] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Message | null>(null);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    recipient_id: "",
    subject: "",
    body: "",
    is_broadcast: false,
  });

  const canBroadcast = role === "admin" || role === "administrator" || role === "super_admin";

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await api.get("/messages");
      const mapped = (data ?? []).map((m: any) => ({
        id: m.id,
        subject: m.subject,
        body: m.content,
        sender_id: m.sender?.id,
        recipient_id: m.receiver?.id || null,
        is_broadcast: m.type === "BROADCAST",
        created_at: m.sentAt,
        organization_id: m.sender?.organizationId || null,
      }));
      setMessages(mapped);

      const profMap: Record<string, Profile> = {};
      (data ?? []).forEach((m: any) => {
        if (m.sender) {
          profMap[m.sender.id] = {
            id: m.sender.id,
            username: m.sender.username,
            full_name: m.sender.fullName,
          };
        }
        if (m.receiver) {
          profMap[m.receiver.id] = {
            id: m.receiver.id,
            username: m.receiver.username,
            full_name: m.receiver.fullName,
          };
        }
      });
      setProfiles(profMap);
    } catch (e) {
      console.error("Xabarlarni yuklashda xatolik:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadOrgUsers = async () => {
    if (!profile?.organization_id) return;

    if (role === 'parent') {
      try {
        const { data } = await api.get("/parent/teachers");
        setOrgUsers(data ?? []);
      } catch (e) {
        console.error("O'qituvchilarni yuklashda xatolik:", e);
      }
      return;
    }

    try {
      const { data } = await api.get("/admin/users", {
        params: { organizationId: profile.organization_id }
      });
      const filtered = (data ?? [])
        .filter((u: any) => u.id !== user?.id)
        .map((u: any) => ({
          id: u.id,
          username: u.username,
          full_name: u.fullName,
        }));
      setOrgUsers(filtered);
    } catch (e) {
      console.error("Foydalanuvchilarni yuklashda xatolik:", e);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  useEffect(() => {
    if (open) loadOrgUsers();
  }, [open, profile?.organization_id]);

  // Realtime updates
  useEffect(() => {
    if (!user?.id) return;
    load();
  }, [user?.id]);

  const senderName = (id: string) => {
    const p = profiles[id];
    return p ? p.full_name || p.username : "Noma'lum";
  };

  const stats = useMemo(
    () => ({
      total: messages.length,
      broadcasts: messages.filter((m) => m.is_broadcast).length,
    }),
    [messages],
  );

  const send = async () => {
    if (!user?.id) return;
    if (!form.subject.trim() || !form.body.trim()) {
      toast.error("Mavzu va xabar matnini kiriting");
      return;
    }
    if (!form.is_broadcast && !form.recipient_id) {
      toast.error("Qabul qiluvchini tanlang");
      return;
    }
    setSending(true);
    try {
      const payload = {
        receiverId: form.is_broadcast ? null : form.recipient_id,
        subject: form.subject.trim(),
        content: form.body.trim(),
        type: form.is_broadcast ? "BROADCAST" : "DIRECT",
      };

      await api.post("/messages", payload);

      toast.success(form.is_broadcast ? "E'lon yuborildi" : "Xabar yuborildi");
      setOpen(false);
      setForm({ recipient_id: "", subject: "", body: "", is_broadcast: false });
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || "Xatolik yuz berdi");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Xabarlar</h1>
          <p className="text-sm text-muted-foreground">Sizga kelgan xabarlar va e'lonlar</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero">
              <Plus className="h-4 w-4" /> Yangi xabar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Yangi xabar yuborish</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {canBroadcast && (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label className="font-medium">E'lon (broadcast)</Label>
                    <p className="text-xs text-muted-foreground">
                      Tashkilotning barcha a'zolariga yuboriladi
                    </p>
                  </div>
                  <Switch
                    checked={form.is_broadcast}
                    onCheckedChange={(v) => setForm({ ...form, is_broadcast: v })}
                  />
                </div>
              )}
              {!form.is_broadcast && (
                <div>
                  <Label>Qabul qiluvchi</Label>
                  <Select
                    value={form.recipient_id}
                    onValueChange={(v) => setForm({ ...form, recipient_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Foydalanuvchini tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name || u.username} (@{u.username})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Mavzu</Label>
                <Input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Xabar mavzusi"
                />
              </div>
              <div>
                <Label>Xabar matni</Label>
                <Textarea
                  rows={5}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Xabaringizni yozing..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Bekor qilish
              </Button>
              <Button variant="hero" onClick={send} disabled={sending}>
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Yuborish
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary grid place-items-center">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Jami</p>
            <p className="font-display font-bold text-2xl">{stats.total}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent/15 text-accent grid place-items-center">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">E'lonlar</p>
            <p className="font-display font-bold text-2xl">{stats.broadcasts}</p>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-2 max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Hech qanday xabar yo'q
            </div>
          ) : (
            <ul className="space-y-1">
              {messages.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => setSelected(m)}
                    className={`w-full text-left p-3 rounded-lg transition-smooth ${
                      selected?.id === m.id ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm truncate flex-1">{m.subject}</p>
                      {m.is_broadcast && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          E'lon
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {senderName(m.sender_id)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(m.created_at).toLocaleString("uz")}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          {selected ? (
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold">{selected.subject}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {senderName(selected.sender_id)} •{" "}
                  {new Date(selected.created_at).toLocaleString("uz")}
                </p>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{selected.body}</p>
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-12">
              Xabarni o'qish uchun tanlang
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

