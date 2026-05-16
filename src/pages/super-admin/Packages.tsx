import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/axios";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Package, Plus, Pencil, Trash2, Loader2, Users, Building2, GraduationCap } from "lucide-react";

interface SubscriptionPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  maxOrganizations: number | null;
  maxStudents: number | null;
  maxTeachers: number | null;
}

export default function Packages() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionPackage | null>(null);
  
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    maxOrganizations: "",
    maxStudents: "",
    maxTeachers: ""
  });

  const { data: packages = [], isLoading } = useQuery<SubscriptionPackage[]>({
    queryKey: ["packages"],
    queryFn: async () => {
      const { data } = await api.get("/super-admin/packages");
      return data;
    }
  });

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editing) {
        return api.put(`/super-admin/packages/${editing.id}`, payload);
      }
      return api.post("/super-admin/packages", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success(editing ? "Tarif muvaffaqiyatli yangilandi! 👑" : "Yangi tarif qo'shildi! 🎉");
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Xatolik yuz berdi");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/super-admin/packages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success("Tarif muvaffaqiyatli o'chirildi!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "O'chirishda xatolik yuz berdi");
    }
  });

  const resetForm = () => {
    setEditing(null);
    setForm({
      name: "",
      description: "",
      price: "",
      maxOrganizations: "",
      maxStudents: "",
      maxTeachers: ""
    });
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (pkg: SubscriptionPackage) => {
    setEditing(pkg);
    setForm({
      name: pkg.name,
      description: pkg.description || "",
      price: pkg.price.toString(),
      maxOrganizations: pkg.maxOrganizations?.toString() || "",
      maxStudents: pkg.maxStudents?.toString() || "",
      maxTeachers: pkg.maxTeachers?.toString() || ""
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name || !form.price) {
      toast.error("Nomi va narxi kiritilishi shart!");
      return;
    }
    mutation.mutate({
      name: form.name,
      description: form.description || null,
      price: parseFloat(form.price),
      maxOrganizations: form.maxOrganizations ? parseInt(form.maxOrganizations) : null,
      maxStudents: form.maxStudents ? parseInt(form.maxStudents) : null,
      maxTeachers: form.maxTeachers ? parseInt(form.maxTeachers) : null
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
            Tariflar boshqaruvi
          </h1>
          <p className="text-muted-foreground text-sm">Tizimdagi narxlar va paketlarni to'liq nazorat qiling</p>
        </div>
        
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button variant="hero" className="shadow-glow shadow-emerald-500/20" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Yangi tarif qo'shish
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden border-emerald-500/20 bg-white dark:bg-slate-900 transition-all duration-300">
            <DialogHeader className="p-6 pb-4 shrink-0 border-b border-border/30 bg-background/50 backdrop-blur-md z-10">
              <DialogTitle className="text-xl font-display flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-500" />
                {editing ? "Tarifni tahrirlash" : "Yangi tarif yaratish"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-5 p-6 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid gap-2">
                <Label>Tarif nomi *</Label>
                <Input 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  placeholder="Masalan: Premium Plan"
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 transition-all duration-300"
                />
              </div>
              
              <div className="grid gap-2">
                <Label>Oylik narxi (UZS) *</Label>
                <Input 
                  type="number"
                  value={form.price} 
                  onChange={e => setForm({...form, price: e.target.value})} 
                  placeholder="Masalan: 500000"
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-mono transition-all duration-300"
                />
              </div>

              <div className="grid gap-4 border border-emerald-500/10 p-4 rounded-xl bg-emerald-500/5">
                <Label className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Limitlar va Cheklovlar</Label>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-xs">Tashkilotlar (Filiallar)</Label>
                    <Input 
                      type="number"
                      value={form.maxOrganizations} 
                      onChange={e => setForm({...form, maxOrganizations: e.target.value})} 
                      placeholder="Cheksiz"
                      className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 h-9 transition-all duration-300"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs">Maksimal Talabalar</Label>
                    <Input 
                      type="number"
                      value={form.maxStudents} 
                      onChange={e => setForm({...form, maxStudents: e.target.value})} 
                      placeholder="Cheksiz"
                      className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 h-9 transition-all duration-300"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs">Maksimal O'qituvchilar</Label>
                    <Input 
                      type="number"
                      value={form.maxTeachers} 
                      onChange={e => setForm({...form, maxTeachers: e.target.value})} 
                      placeholder="Cheksiz"
                      className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 h-9 transition-all duration-300"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Tavsifi</Label>
                <Textarea 
                  value={form.description} 
                  onChange={e => setForm({...form, description: e.target.value})} 
                  placeholder="Tarif haqida qo'shimcha ma'lumotlar"
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 resize-none transition-all duration-300"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="p-6 pt-4 shrink-0 border-t border-border/30 bg-background/50 backdrop-blur-md z-10">
              <Button variant="ghost" onClick={() => setOpen(false)} className="hover:text-destructive">Bekor qilish</Button>
              <Button variant="hero" onClick={submit} disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editing ? "Saqlash" : "Yaratish"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white dark:bg-slate-900/50 rounded-2xl p-2 border border-slate-200 dark:border-slate-800 transition-all duration-500">
        {isLoading ? (
          <div className="py-20 flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-slate-900 dark:text-slate-100 font-bold">Nomi</TableHead>
                <TableHead className="text-slate-900 dark:text-slate-100 font-bold">Narxi (UZS)</TableHead>
                <TableHead className="text-center text-slate-900 dark:text-slate-100 font-bold">Tashkilot limit</TableHead>
                <TableHead className="text-center text-slate-900 dark:text-slate-100 font-bold">Talaba limit</TableHead>
                <TableHead className="text-center text-slate-900 dark:text-slate-100 font-bold">O'qituvchi limit</TableHead>
                <TableHead className="text-right text-slate-900 dark:text-slate-100 font-bold">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    Hozircha hech qanday tarif qo'shilmagan
                  </TableCell>
                </TableRow>
              ) : (
                packages.map(pkg => (
                  <TableRow key={pkg.id} className="group transition-colors">
                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
                          <Package className="h-4 w-4" />
                        </div>
                        {pkg.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-slate-900 dark:text-slate-100">
                      {pkg.price.toLocaleString("uz-UZ")} 
                    </TableCell>
                    <TableCell className="text-center text-slate-900 dark:text-slate-100">
                      {pkg.maxOrganizations || <span className="text-muted-foreground dark:text-slate-500 text-xs italic">Cheksiz</span>}
                    </TableCell>
                    <TableCell className="text-center text-slate-900 dark:text-slate-100">
                      {pkg.maxStudents || <span className="text-muted-foreground dark:text-slate-500 text-xs italic">Cheksiz</span>}
                    </TableCell>
                    <TableCell className="text-center text-slate-900 dark:text-slate-100">
                      {pkg.maxTeachers || <span className="text-muted-foreground dark:text-slate-500 text-xs italic">Cheksiz</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="text-blue-500 hover:text-blue-600 hover:bg-blue-500/10" onClick={() => openEdit(pkg)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>O'chirilsinmi?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Agar "{pkg.name}" tarifiga ulangan tashkilotlar bo'lsa, uni o'chirish imkonsiz bo'ladi.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(pkg.id)} className="bg-destructive hover:bg-destructive/90">
                                O'chirish
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
