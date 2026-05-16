import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Heart, Plus, Search, Trash2, Users,
  Phone, Mail, CheckCircle2, XCircle, UserPlus,
} from "lucide-react";
import { motion } from "framer-motion";
import TigerPlayer from "@/components/TigerPlayer";
import { formatDistanceToNow } from "date-fns";
import { uz } from "date-fns/locale";

interface Parent {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phoneNumber: string;
  active: boolean;
  createdAt: any;
  childrenNames: string[];
}

interface ParentsPage {
  content: Parent[];
  totalPages: number;
  totalElements: number;
}

const safeDate = (d: any) => {
  if (!d) return "—";
  try {
    const dt = Array.isArray(d)
      ? new Date(d[0], d[1] - 1, d[2], d[3] || 0, d[4] || 0)
      : new Date(d);
    return isNaN(dt.getTime()) ? "—" : formatDistanceToNow(dt, { addSuffix: true, locale: uz });
  } catch { return "—"; }
};

export default function ParentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: "", phoneOrUsername: "", email: "",
    password: "", studentId: "", relationship: "OTA-ONA",
  });

  const { data, isLoading, isError } = useQuery<ParentsPage>({
    queryKey: ["parents", page, search],
    queryFn: async () => {
      const { data } = await api.get("/admin/parents", {
        params: { page, size: 20, query: search || undefined },
      });
      return data;
    },
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => api.post("/admin/parents", payload),
    onSuccess: () => {
      toast.success("Ota-ona muvaffaqiyatli qo'shildi!");
      qc.invalidateQueries({ queryKey: ["parents"] });
      setOpen(false);
      setForm({ fullName: "", phoneOrUsername: "", email: "", password: "", studentId: "", relationship: "OTA-ONA" });
    },
    onError: () => toast.error("Xatolik yuz berdi"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/parents/${id}`),
    onSuccess: () => {
      toast.success("O'chirildi");
      qc.invalidateQueries({ queryKey: ["parents"] });
    },
    onError: () => toast.error("O'chirib bo'lmadi"),
  });

  const parents = data?.content ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600
                          grid place-items-center shadow-lg shadow-pink-500/25">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Ota-onalar
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Jami {data?.totalElements ?? 0} ta ota-ona ro'yxatda
            </p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)}
          className="gap-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600
                     hover:to-rose-700 text-white border-0 shadow-lg shadow-pink-500/25">
          <UserPlus className="h-4 w-4" /> Yangi ota-ona
        </Button>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Ism, telefon yoki email bo'yicha qidirish..."
          className="pl-10 h-11 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10
                     rounded-xl shadow-sm text-slate-900 dark:text-white"
        />
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <TigerPlayer text="Ota-onalar yuklanmoqda..." size={180} />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-16 w-16 rounded-2xl bg-rose-500/10 grid place-items-center">
              <XCircle className="h-8 w-8 text-rose-500" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Ma'lumotlarni yuklashda xatolik
            </p>
          </div>
        ) : parents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Users className="h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">Ota-ona topilmadi</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-200 dark:border-white/5">
                <TableHead className="font-bold text-slate-900 dark:text-slate-200">F.I.O</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-200">Farzandlari</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-200">Aloqa</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-200">Holati</TableHead>
                <TableHead className="font-bold text-slate-900 dark:text-slate-200">Qo'shilgan</TableHead>
                <TableHead className="text-right font-bold text-slate-900 dark:text-slate-200">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parents.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/3"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600
                                      grid place-items-center text-white font-bold text-sm shrink-0">
                        {(p.fullName || p.username || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white text-sm">
                          {p.fullName || "—"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">@{p.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {p.childrenNames?.length > 0
                        ? p.childrenNames.map((name, idx) => (
                          <Badge key={idx} variant="secondary"
                            className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                            {name}
                          </Badge>
                        ))
                        : <span className="text-xs text-slate-400">Bog'lanmagan</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {p.phoneNumber && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <Phone className="h-3 w-3" /> {p.phoneNumber}
                        </div>
                      )}
                      {p.email && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-500">
                          <Mail className="h-3 w-3" /> {p.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.active ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Faol</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <XCircle className="h-4 w-4 text-slate-400" />
                        <span className="text-xs font-medium text-slate-500">Nofaol</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {safeDate(p.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10"
                      onClick={() => {
                        if (confirm(`"${p.fullName}" ni o'chirmoqchimisiz?`)) {
                          deleteMutation.mutate(p.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {(data?.totalPages ?? 0) > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-white/5">
            <p className="text-xs text-slate-500">Sahifa {page + 1} / {data?.totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="rounded-xl border-slate-200 dark:border-white/10">
                Oldingi
              </Button>
              <Button variant="outline" size="sm" disabled={page >= (data?.totalPages ?? 1) - 1}
                onClick={() => setPage(p => p + 1)}
                className="rounded-xl border-slate-200 dark:border-white/10">
                Keyingi
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600
                              grid place-items-center">
                <Plus className="h-4 w-4 text-white" />
              </div>
              Yangi ota-ona qo'shish
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {[
              { id: "fullName", label: "To'liq ismi", placeholder: "Abdullayev Jasur", type: "text" },
              { id: "phoneOrUsername", label: "Telefon / Username *", placeholder: "+998901234567", type: "text" },
              { id: "email", label: "Email (ixtiyoriy)", placeholder: "parent@example.com", type: "email" },
              { id: "password", label: "Parol (bo'sh qolsa: Parent@123)", placeholder: "••••••••", type: "password" },
              { id: "studentId", label: "Farzand ID (UUID, ixtiyoriy)", placeholder: "uuid...", type: "text" },
            ].map(({ id, label, placeholder, type }) => (
              <div key={id} className="space-y-1.5">
                <Label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {label}
                </Label>
                <Input
                  id={id}
                  type={type}
                  placeholder={placeholder}
                  value={(form as any)[id]}
                  onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
                  className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10
                             text-slate-900 dark:text-white rounded-xl h-10"
                />
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}
              className="border-slate-200 dark:border-white/10">
              Bekor
            </Button>
            <Button
              disabled={!form.phoneOrUsername || createMutation.isPending}
              onClick={() => createMutation.mutate(form)}
              className="bg-gradient-to-r from-pink-500 to-rose-600 text-white border-0">
              {createMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
