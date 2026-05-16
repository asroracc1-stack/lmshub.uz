import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BookOpen, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface Subject {
  id: string; name: string; code: string | null; description: string | null; color: string;
}

const COLORS = ["primary", "secondary", "accent", "success", "warning", "destructive"];

export default function OrgSubjects() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("primary");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("subjects").select("*").order("name");
    setItems((data ?? []) as Subject[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const reset = () => {
    setEditing(null); setName(""); setCode(""); setDescription(""); setColor("primary");
  };

  const openEdit = (s: Subject) => {
    setEditing(s); setName(s.name); setCode(s.code ?? ""); setDescription(s.description ?? ""); setColor(s.color);
    setOpen(true);
  };

  const submit = async () => {
    if (!name.trim()) return toast.error("Nom kiriting");
    if (!profile?.organization_id) return toast.error("Tashkilot aniqlanmadi");
    setSaving(true);
    const payload = { name: name.trim(), code: code.trim() || null, description: description.trim() || null, color, organization_id: profile.organization_id };
    const { error } = editing
      ? await supabase.from("subjects").update(payload).eq("id", editing.id)
      : await supabase.from("subjects").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Yangilandi" : "Yaratildi");
    setOpen(false); reset(); load();
  };

  const remove = async (s: Subject) => {
    const { error } = await supabase.from("subjects").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("O'chirildi"); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Fanlar</h1>
          <p className="text-muted-foreground">Tashkilot fanlarini boshqaring</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild>
            <Button variant="hero"><Plus className="h-4 w-4" /> Yangi fan</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Tahrirlash" : "Yangi fan"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid gap-2"><Label>Nom *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Matematika" /></div>
              <div className="grid gap-2"><Label>Kod</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="MATH101" /></div>
              <div className="grid gap-2"><Label>Tavsif</Label>
                <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              <div className="grid gap-2"><Label>Rang</Label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setColor(c)}
                      className={`h-8 w-8 rounded-lg border-2 bg-${c} ${color === c ? "border-foreground" : "border-transparent"}`} />
                  ))}
                </div>
              </div>
              <Button onClick={submit} disabled={saving} className="w-full" variant="hero">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Saqlash
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Fanlar yo'q. Birinchi fanni yarating.</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <Card key={s.id} className="p-5 group hover:shadow-elegant transition-smooth">
              <div className="flex items-start justify-between">
                <div className={`h-10 w-10 rounded-lg bg-${s.color}/15 grid place-items-center`}>
                  <BookOpen className={`h-5 w-5 text-${s.color}`} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-smooth">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>O'chirilsinmi?</AlertDialogTitle>
                        <AlertDialogDescription>"{s.name}" fani o'chiriladi.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Bekor</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(s)}>O'chirish</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <h3 className="font-display font-semibold text-lg mt-3">{s.name}</h3>
              {s.code && <p className="text-xs text-muted-foreground mt-1">{s.code}</p>}
              {s.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{s.description}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
