import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Activity, Plus, Pencil, Trash2, KeyRound, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuditRow {
  id: string;
  userId: string | null;
  username: string | null;
  action: string;
  objectType: string;
  objectId: string | null;
  details: string | null;
  createdAt: string;
}

import TigerPlayer from "@/components/TigerPlayer";
import { formatDistanceToNow } from "date-fns";
import { uz } from "date-fns/locale";

const actionMeta: Record<string, { icon: typeof Plus; color: string; label: string; bgColor: string }> = {
  CREATE: { icon: Plus, color: "text-emerald-500", label: "CREATE", bgColor: "bg-emerald-500/15" },
  UPDATE: { icon: Pencil, color: "text-amber-500", label: "UPDATE", bgColor: "bg-amber-500/15" },
  DELETE: { icon: Trash2, color: "text-rose-500", label: "DELETE", bgColor: "bg-rose-500/15" },
  LOGIN: { icon: KeyRound, color: "text-violet-500", label: "LOGIN", bgColor: "bg-violet-500/15" },
  LOGOUT: { icon: LogOut, color: "text-slate-500", label: "LOGOUT", bgColor: "bg-slate-500/15" },
};

import { LogOut } from "lucide-react";

function getActionMeta(action: string) {
  const normalized = action.toUpperCase();
  return actionMeta[normalized] || { icon: Activity, color: "text-muted-foreground", label: action, bgColor: "bg-muted" };
}

const formatDate = (date: any) => {
  if (!date) return "—";
  try {
    const d = Array.isArray(date) 
      ? new Date(date[0], date[1] - 1, date[2], date[3] || 0, date[4] || 0, date[5] || 0) 
      : new Date(date);
    if (isNaN(d.getTime())) return "—";
    return formatDistanceToNow(d, { addSuffix: true, locale: uz });
  } catch (e) {
    return "—";
  }
};

export default function AuditLogs() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize] = useState(20);

  const load = async (p = page, q = search) => {
    setLoading(true);
    try {
      const { data } = await api.get<any>("/admin/audit-logs", { params: { page: p, size: pageSize, query: q } });
      setRows(data.content || []);
      setTotalPages(data.totalPages || 0);
    } catch (e) {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page, search);
  }, [page, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Audit jurnali</h1>
        <p className="text-slate-500 dark:text-slate-400">Tizimdagi barcha muhim amallar tarixi</p>
      </div>

      <div className="glass dark:bg-slate-900/50 dark:border-slate-800 rounded-2xl p-4 transition-all duration-500">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Amal, obyekt yoki foydalanuvchi bo'yicha qidirish..."
            className="pl-10 h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-xl shadow-sm transition-all duration-500"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <TigerPlayer text="Loglarni tekshiryapman..." size={200} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-200 dark:border-slate-800 transition-all duration-500">
                  <TableHead className="font-bold text-slate-900 dark:text-slate-300 dark:bg-slate-900/50">Amal</TableHead>
                  <TableHead className="font-bold text-slate-900 dark:text-slate-300 dark:bg-slate-900/50">Obyekt</TableHead>
                  <TableHead className="font-bold text-slate-900 dark:text-slate-300 dark:bg-slate-900/50">Foydalanuvchi</TableHead>
                  <TableHead className="font-bold text-slate-900 dark:text-slate-300 dark:bg-slate-900/50">Tafsilotlar</TableHead>
                  <TableHead className="text-right font-bold text-slate-900 dark:text-slate-300 dark:bg-slate-900/50">Vaqt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Yozuv topilmadi
                    </TableCell>
                  </TableRow>
                ) : rows.map((r) => {
                  const meta = getActionMeta(r.action);
                  const Icon = meta.icon;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-7 w-7 rounded-lg grid place-items-center", meta.bgColor, meta.color)}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter", meta.bgColor, meta.color)}>
                            {meta.label}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                          {r.objectType}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-bold text-slate-900 dark:text-slate-200">@{r.username || "tizim"}</TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate font-medium">
                        {r.details || "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-500 dark:text-slate-500 font-bold">
                        {formatDate(r.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Sahifa {page + 1} / {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-500"
              >
                Oldingi
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-500"
              >
                Keyingi
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
