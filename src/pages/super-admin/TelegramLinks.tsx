import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Send, Loader2 } from "lucide-react";

interface Row {
  id: string;
  kind: "bot" | "channel";
  name: string;
  username: string;
  bot_token: string | null;
  description: string | null;
  is_active: boolean;
}

const empty: Partial<Row> = {
  kind: "bot",
  name: "Telegram bot",
  username: "",
  bot_token: "",
  description: "",
  is_active: true,
};

export default function TelegramLinksPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Row>>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Row[]>("/bot-settings");
      setRows(data || []);
    } catch (e) {
      toast.error("Yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    setEditing(empty);
    setOpen(true);
  };
  const startEdit = (r: Row) => {
    setEditing(r);
    setOpen(true);
  };

  const save = async () => {
    if (!editing.username?.trim()) return toast.error("Username kerak");
    if (!editing.name?.trim()) return toast.error("Nom kerak");
    setSaving(true);
    const payload = {
      kind: editing.kind,
      bot_name: editing.name,
      username: editing.username.replace(/^@/, ""),
      bot_token: editing.kind === "bot" ? editing.bot_token : null,
      welcome_message: editing.description,
      is_active: editing.is_active,
    };
    try {
      if (editing.id) {
        await api.post("/bot-settings", { ...payload, id: editing.id });
      } else {
        await api.post("/bot-settings", payload);
      }
      toast.success("Saqlandi");
      setOpen(false);
      load();
    } catch (e) {
      toast.error("Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("O'chirilsinmi?")) return;
    try {
      await api.delete(`/bot-settings/${id}`);
      toast.success("O'chirildi");
      load();
    } catch (e) {
      toast.error("O'chirishda xatolik");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Send className="h-7 w-7 text-sky-500" /> Telegram bot va kanallar
          </h1>
          <p className="text-sm text-muted-foreground">
            Foydalanuvchilarga ko'rinadigan bot/kanal havolalari
          </p>
        </div>
        <Button onClick={startNew}>
          <Plus className="h-4 w-4 mr-2" /> Yangi qo'shish
        </Button>
      </div>

      {loading ? (
        <Loader2 className="h-7 w-7 animate-spin text-primary mx-auto my-12" />
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Hali bot yoki kanal qo'shilmagan
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((r) => (
            <Card key={r.id} className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-12 rounded-xl grid place-items-center bg-sky-500 text-white">
                  <Send className="h-6 w-6 -rotate-12" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{r.name}</p>
                    <Badge variant={r.kind === "channel" ? "secondary" : "default"}>
                      {r.kind === "channel" ? "Kanal" : "Bot"}
                    </Badge>
                    {!r.is_active && <Badge variant="outline">Faolsiz</Badge>}
                  </div>
                  <a
                    href={`https://t.me/${r.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-sky-600 hover:underline"
                  >
                    @{r.username}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => remove(r.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing.id ? "Tahrirlash" : "Yangi qo'shish"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Tur</Label>
              <Select
                value={editing.kind ?? "bot"}
                onValueChange={(v) => setEditing((e) => ({ ...e, kind: v as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bot">Bot</SelectItem>
                  <SelectItem value="channel">Kanal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nomi</Label>
              <Input
                value={editing.name ?? ""}
                onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))}
                placeholder="Telegram bot"
              />
            </div>
            <div>
              <Label>Username (@siz)</Label>
              <Input
                value={editing.username ?? ""}
                onChange={(e) =>
                  setEditing((s) => ({ ...s, username: e.target.value.replace(/^@/, "") }))
                }
                placeholder="lmshub_bot"
              />
            </div>
            {editing.kind === "bot" && (
              <div>
                <Label>Bot tokeni (ixtiyoriy)</Label>
                <Input
                  type="password"
                  value={editing.bot_token ?? ""}
                  onChange={(e) => setEditing((s) => ({ ...s, bot_token: e.target.value }))}
                  placeholder="123456:ABC..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Token faqat super admin uchun saqlanadi.
                </p>
              </div>
            )}
            <div>
              <Label>Tavsif</Label>
              <Textarea
                rows={3}
                value={editing.description ?? ""}
                onChange={(e) => setEditing((s) => ({ ...s, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Faol</Label>
              <Switch
                checked={editing.is_active ?? true}
                onCheckedChange={(v) => setEditing((s) => ({ ...s, is_active: v }))}
              />
            </div>
            <Button onClick={save} disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Saqlash
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
