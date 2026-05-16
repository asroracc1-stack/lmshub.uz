import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Newspaper, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  category: string;
  created_at: string;
}

export default function LMSNews() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<NewsItem> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<NewsItem[]>("/news");
      setItems(data);
    } catch (e) {
      toast.error("Yangiliklarni yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.title || !editing?.content) return toast.error("Barcha maydonlarni to'ldiring");
    setSaving(true);
    try {
      if (editing.id) {
        await api.put(`/news/${editing.id}`, editing);
        toast.success("Yangilandi");
      } else {
        await api.post("/news", editing);
        toast.success("Qo'shildi");
      }
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
      await api.delete(`/news/${id}`);
      toast.success("O'chirildi");
      load();
    } catch (e) {
      toast.error("O'chirishda xatolik");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Yangiliklar va E'lonlar</h1>
          <p className="text-muted-foreground">Butun tizim uchun umumiy xabarlar</p>
        </div>
        <Button variant="hero" onClick={() => { setEditing({}); setOpen(true); }}>
          <Plus className="h-4 w-4" /> Yangi e'lon
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Hali yangiliklar yo'q</Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden glass flex flex-col">
              {item.image_url ? (
                <img src={item.image_url} alt={item.title} className="h-48 w-full object-cover" />
              ) : (
                <div className="h-48 w-full bg-muted grid place-items-center"><Newspaper className="h-12 w-12 text-muted-foreground/30" /></div>
              )}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-widest text-primary font-bold">{item.category || "Umumiy"}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(item.created_at), "dd.MM.yyyy")}</span>
                </div>
                <h3 className="font-display text-lg font-bold mb-2 line-clamp-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3 flex-1">{item.content}</p>
                <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/50">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(item); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Tahrirlash" : "Yangi e'lon"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Sarlavha *</Label>
              <Input value={editing?.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Muhim yangilik..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Kategoriya</Label>
                <Input value={editing?.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="Masalan: Tanlov" />
              </div>
              <div className="grid gap-2">
                <Label>Rasm URL (ixtiyoriy)</Label>
                <Input value={editing?.image_url || ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://..." />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Mazmuni *</Label>
              <Textarea rows={5} value={editing?.content || ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} placeholder="Batafsil ma'lumot..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Bekor</Button>
            <Button variant="hero" onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} {editing?.id ? "Saqlash" : "Chop etish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
