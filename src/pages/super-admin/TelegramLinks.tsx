import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Skeleton } from "@/components/ui/skeleton";
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
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Row>>(empty);

  const botsQuery = useQuery<Row[]>({
    queryKey: ["telegram-bots"],
    queryFn: async () => {
      const response = await api.get<Row[]>("/bot-settings");
      return response.data || [];
    },
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  if (botsQuery.isError) {
    toast.error((botsQuery.error as any)?.message || "Telegram botlarini yuklashda xatolik yuz berdi.");
  }

  const createUpdateMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editing.id) {
        return api.post("/bot-settings", { ...payload, id: editing.id });
      }
      return api.post("/bot-settings", payload);
    },
    onSuccess: () => {
      toast.success(editing.id ? "Yangilandi" : "Saqlandi");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["telegram-bots"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Saqlashda xatolik yuz berdi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/bot-settings/${id}`);
    },
    onSuccess: () => {
      toast.success("O'chirildi");
      queryClient.invalidateQueries({ queryKey: ["telegram-bots"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "O'chirishda xatolik yuz berdi");
    },
  });

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

    const payload = {
      kind: editing.kind,
      botName: editing.name,
      username: editing.username.replace(/^@/, ""),
      botToken: editing.kind === "bot" ? editing.bot_token : null,
      welcomeMessage: editing.description,
      isActive: editing.is_active,
    };

    await createUpdateMutation.mutateAsync(payload);
  };

  const remove = async (id: string) => {
    if (!confirm("O'chirilsinmi?")) return;
    await deleteMutation.mutateAsync(id);
  };

  const rows = botsQuery.data ?? [];

  return (
    <div className="space-y-6 w-full">
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

      {botsQuery.isLoading ? (
        <div className="grid gap-3 py-4">
          {[...Array(3)].map((_, idx) => (
            <Card key={idx} className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-9 w-9 rounded-md" />
              </div>
            </Card>
          ))}
        </div>
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
            <Button onClick={save} disabled={createUpdateMutation.isPending} className="w-full">
              {createUpdateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Saqlash
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

