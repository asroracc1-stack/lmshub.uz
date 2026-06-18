import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus, Search, Target, Clock, FileText, Edit2, Trash2, Eye,
  BookOpen, BarChart3, Loader2, Copy, CheckCircle2, Lock, Globe,
  ChevronRight, Layers, Zap, TrendingUp
} from "lucide-react";

interface SatMock {
  id: string;
  title: string;
  description?: string;
  duration: number;
  difficulty: string;
  requiredPack: string;
  isPublished: boolean;
  totalQuestions: number;
  createdAt: string;
  sections?: { title: string; questionCount: number }[];
}

const DIFF_CONFIG: Record<string, { label: string; cls: string }> = {
  easy:   { label: "Oson",    cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  medium: { label: "O'rta",   cls: "bg-amber-100 text-amber-700 border-amber-200" },
  hard:   { label: "Qiyin",   cls: "bg-rose-100 text-rose-700 border-rose-200" },
};

export default function SatMocks() {
  const navigate = useNavigate();
  const [mocks, setMocks] = useState<SatMock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/exams", { params: { type: "sat", size: 100 } });
      const data = res.data?.content || res.data || [];
      setMocks(data.map((d: any) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        duration: d.duration || 60,
        difficulty: d.difficulty || "medium",
        requiredPack: d.requiredPack || "free",
        isPublished: d.isPublished ?? true,
        totalQuestions: d.totalQuestions || (d.sections || []).reduce((s: number, sec: any) => s + (sec.questions?.length || 0), 0),
        createdAt: d.createdAt,
        sections: d.sections?.map((s: any) => ({ title: s.title, questionCount: s.questions?.length || 0 })),
      })));
    } catch {
      setMocks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await api.delete(`/admin/exams/${id}`);
      setMocks(prev => prev.filter(m => m.id !== id));
      toast.success("SAT Mock o'chirildi");
    } catch (e: any) {
      toast.error("O'chirishda xatolik: " + (e?.response?.data?.message || e?.message));
    } finally {
      setDeleting(null);
    }
  };

  const handleDuplicate = async (mock: SatMock) => {
    try {
      const res = await api.post(`/admin/exams/${mock.id}/duplicate`);
      toast.success("Mock nusxalandi ✅");
      load();
    } catch {
      toast.error("Nusxalashda xatolik");
    }
  };

  const filtered = mocks.filter(m =>
    !search || m.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
              <Target className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">SAT Mock Testlar</h1>
              <p className="text-sm text-muted-foreground">Digital SAT formatida professional mock testlar</p>
            </div>
          </div>
        </div>
        <Button
          onClick={() => navigate("/super-admin/sat-mocks/new")}
          className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25"
        >
          <Plus className="h-4 w-4" />
          Yangi SAT Mock
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Jami mocklar", value: mocks.length, icon: Layers, color: "text-violet-600" },
          { label: "Umumiy savollar", value: mocks.reduce((s, m) => s + m.totalQuestions, 0), icon: FileText, color: "text-blue-600" },
          { label: "Nashr qilingan", value: mocks.filter(m => m.isPublished).length, icon: Globe, color: "text-emerald-600" },
          { label: "O'rtacha vaqt", value: mocks.length ? Math.round(mocks.reduce((s, m) => s + m.duration, 0) / mocks.length) + " daq" : "—", icon: Clock, color: "text-amber-600" },
        ].map(stat => (
          <Card key={stat.label} className="p-4 flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center bg-current/10", stat.color)}>
              <stat.icon className={cn("h-5 w-5", stat.color)} />
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Mock nomi bo'yicha qidirish..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Mock List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="h-20 w-20 rounded-2xl bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center">
            <Target className="h-10 w-10 text-violet-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-700 dark:text-slate-200">SAT Mocklar yo'q</p>
            <p className="text-sm text-muted-foreground mt-1">Birinchi SAT Mock testni yarating</p>
          </div>
          <Button
            onClick={() => navigate("/super-admin/sat-mocks/new")}
            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Plus className="h-4 w-4" /> Yangi SAT Mock yaratish
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((mock, i) => {
              const diff = DIFF_CONFIG[mock.difficulty] || DIFF_CONFIG.medium;
              return (
                <motion.div
                  key={mock.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="p-5 hover:shadow-lg transition-shadow group border border-violet-100 dark:border-violet-900/30 hover:border-violet-300 dark:hover:border-violet-700/50">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 dark:text-white truncate group-hover:text-violet-600 transition-colors">
                          {mock.title}
                        </h3>
                        {mock.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{mock.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {mock.isPublished ? (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <Globe className="h-3 w-3" /> Nashr
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full border">
                            <Lock className="h-3 w-3" /> Yashirin
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="outline" className={cn("text-xs", diff.cls)}>
                        {diff.label}
                      </Badge>
                      <Badge variant="outline" className="text-xs gap-1">
                        <Clock className="h-3 w-3" /> {mock.duration} daq
                      </Badge>
                      <Badge variant="outline" className="text-xs gap-1">
                        <FileText className="h-3 w-3" /> {mock.totalQuestions} savol
                      </Badge>
                      {mock.requiredPack !== "free" && (
                        <Badge className="text-xs gap-1 bg-amber-500 text-white border-0">
                          <Zap className="h-3 w-3" /> {mock.requiredPack.toUpperCase()}
                        </Badge>
                      )}
                    </div>

                    {/* Sections preview */}
                    {mock.sections && mock.sections.length > 0 && (
                      <div className="mb-4 p-3 rounded-lg bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 space-y-1.5">
                        {mock.sections.slice(0, 3).map((sec, si) => (
                          <div key={si} className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 dark:text-slate-400 font-medium truncate">{sec.title || `Modul ${si + 1}`}</span>
                            <span className="text-violet-600 font-bold shrink-0 ml-2">{sec.questionCount} savol</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs"
                        onClick={() => navigate(`/super-admin/sat-mocks/edit/${mock.id}`)}
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Tahrirlash
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => navigate(`/super-admin/mocks/take/${mock.id}`)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => handleDuplicate(mock)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs text-rose-600 hover:bg-rose-50 hover:border-rose-300">
                            {deleting === mock.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Mock o'chirilsinmi?</AlertDialogTitle>
                            <AlertDialogDescription>
                              "{mock.title}" mock testi butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Bekor</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-rose-600 hover:bg-rose-700"
                              onClick={() => handleDelete(mock.id)}
                            >
                              O'chirish
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
