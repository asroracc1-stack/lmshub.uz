import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Newspaper } from "lucide-react";
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
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<NewsItem> | null>(null);

  const newsQuery = useQuery<NewsItem[]>({
    queryKey: ["lms-news"],
    queryFn: async () => {
      const response = await api.get<NewsItem[]>("/news");
      return response.data || [];
    },
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  if (newsQuery.isError) {
    toast.error((newsQuery.error as any)?.message || "Yangiliklarni yuklashda xatolik yuz berdi.");
  }

  const createUpdateMutation = useMutation({
    mutationFn: async (payload: Partial<NewsItem>) => {
      if (payload.id) {
        return api.put(`/news/${payload.id}`, payload);
      }
      return api.post("/news", payload);
    },
    onSuccess: (_, variables) => {
      toast.success(variables.id ? "Yangilandi" : "Qo'shildi");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["lms-news"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Saqlashda xatolik yuz berdi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/news/${id}`);
    },
    onSuccess: () => {
      toast.success(t("dynamic.usersmanager.o_chirildi"));
      queryClient.invalidateQueries({ queryKey: ["lms-news"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "O'chirishda xatolik yuz berdi");
    },
  });

  const save = async () => {
    if (!editing?.title || !editing?.content) return toast.error(t("dynamic.lmsnews.barcha_maydonlarni_to_ldiring"));
    await createUpdateMutation.mutateAsync(editing);
  };

  const remove = async (id: string) => {
    if (!confirm(t("dynamic.usersmanager.o_chirilsinmi"))) return;
    await deleteMutation.mutateAsync(id);
  };

  const items = newsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("dynamic.lmsnews.yangiliklar_va_e_lonlar")}</h1>
          <p className="text-muted-foreground">{t("dynamic.lmsnews.butun_tizim_uchun_umumiy_xabarlar")}</p>
        </div>
        <Button variant="hero" onClick={() => { setEditing({}); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Yangi e'lon
        </Button>
      </div>

      {newsQuery.isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
          {[...Array(3)].map((_, idx) => (
            <Card key={idx} className="overflow-hidden glass flex flex-col h-[380px]">
              <Skeleton className="h-48 w-full rounded-none" />
              <div className="p-5 flex-1 flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-full flex-1" />
                <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">{t("dynamic.lmsnews.hali_yangiliklar_yo_q")}</Card>
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
              <Label>{t("dynamic.lmsnews.sarlavha_")}</Label>
              <Input value={editing?.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Muhim yangilik..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t("dynamic.lmsnews.kategoriya")}</Label>
                <Input value={editing?.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} placeholder="Masalan: Tanlov" />
              </div>
              <div className="grid gap-2">
                <Label>{t("dynamic.lmsnews.rasm_url_ixtiyoriy")}</Label>
                <Input value={editing?.image_url || ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://..." />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t("dynamic.lmsnews.mazmuni_")}</Label>
              <Textarea rows={5} value={editing?.content || ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} placeholder="Batafsil ma'lumot..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("dynamic.usersmanager.bekor")}</Button>
            <Button variant="hero" onClick={save} disabled={createUpdateMutation.isPending}>
              {createUpdateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} {editing?.id ? "Saqlash" : "Chop etish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

