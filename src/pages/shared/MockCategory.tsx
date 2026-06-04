import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import SectionGuard from "@/components/SectionGuard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, ArrowRight, BookOpen, Clock, Crown, FileText, Headphones,
  Layers, Leaf, Loader2, Mic, PenLine, Plus, Search, Sparkles, Pencil, Trash2,
  Target, Landmark,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type Kind = "listening" | "reading" | "writing" | "speaking" | "sat" | "national_cert";

const META: Record<Kind, { icon: any; label: string; color: string; group: string }> = {
  listening:     { icon: Headphones, label: "Listening",         color: "text-emerald-600", group: "IELTS" },
  reading:       { icon: BookOpen,   label: "Reading",           color: "text-blue-600",    group: "IELTS" },
  writing:       { icon: PenLine,    label: "Writing",           color: "text-orange-600",  group: "IELTS" },
  speaking:      { icon: Mic,        label: "Speaking",          color: "text-pink-600",    group: "IELTS" },
  sat:           { icon: Target,     label: "SAT",               color: "text-violet-600",  group: "SAT" },
  national_cert: { icon: Landmark,   label: "Milliy sertifikat", color: "text-amber-600",   group: "Milliy" },
};

const DIFFICULTY_META: Record<string, { label: string; cls: string; icon: any }> = {
  easy:   { label: "Oson",  cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", icon: Leaf },
  medium: { label: "O'rta", cls: "bg-amber-500/15 text-amber-700 border-amber-500/30",      icon: Sparkles },
  hard:   { label: "Qiyin", cls: "bg-rose-500/15 text-rose-700 border-rose-500/30",          icon: FileText },
};

export default function MockCategory({ basePath = "/user", forcedKind }: { basePath?: string; forcedKind?: Kind }) {
  const { kind: paramKind } = useParams<{ kind: Kind }>();
  const kind = forcedKind || paramKind;
  const nav = useNavigate();
  const { role } = useAuth();
  const canManage = role === "super_admin" || role === "payment_manager";
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [partType, setPartType] = useState<string>("all");
  const [access, setAccess] = useState<"all" | "free" | "pack">("all");

  const loadTests = async () => {
    if (!kind) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/exams?type=${kind.toUpperCase()}`);
      // Mapping API response (durationMinutes -> duration_minutes etc) to fit existing UI
      const mappedData = data.map((d: any) => ({
          ...d,
          duration_minutes: d.duration_minutes || d.durationMinutes,
          is_published: d.is_active || d.isActive,
          part_type: "full" // mock value, map appropriately if needed
      }));
      setTests(mappedData);
    } catch (e) {
      toast.error("Testlarni yuklashda xatolik");
    }
    setLoading(false);
  };

  useEffect(() => { loadTests(); }, [kind, canManage]);

  const onDelete = async (id: string) => {
    try {
      await api.delete(`/admin/exams/${id}`);
      toast.success("Test o'chirildi");
      setTests((p) => p.filter((t) => t.id !== id));
    } catch (e: any) { toast.error("O'chirishda xatolik yuz berdi"); }
  };

  const filtered = useMemo(() => {
    return tests.filter((t) => {
      if (search && !`${t.title} ${t.description ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (difficulty !== "all" && (t.difficulty ?? "easy") !== difficulty) return false;
      if (partType !== "all" && String(t.part_type ?? "all") !== partType) return false;
      if (access === "free" && t.required_pack && t.required_pack !== "free") return false;
      if (access === "pack" && (!t.required_pack || t.required_pack === "free")) return false;
      return true;
    });
  }, [tests, search, difficulty, partType, access]);

  if (!kind || !META[kind as Kind]) {
    return <div className="p-8 text-center text-muted-foreground">Noma'lum bo'lim</div>;
  }
  const meta = META[kind as Kind];
  const Icon = meta.icon;

  // USER roli uchun tegishli bo'lim ochilgan-ochilmaganini tekshiramiz
  const sectionKey =
    meta.group === "IELTS" ? "ielts" : meta.group === "SAT" ? "sat" : "milliy";

  return (
    <SectionGuard section={sectionKey} title={`${meta.label} bo'limi`}>
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => nav(`${basePath}/mocks`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <Badge variant="outline" className="mb-1.5"><Icon className={`h-3 w-3 mr-1 ${meta.color}`} />{meta.group}</Badge>
            <h1 className={`text-3xl md:text-4xl font-display font-bold ${meta.color}`}>
              {meta.group === "IELTS" ? `IELTS ${meta.label}` : meta.label} Testlari
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(["all", "free", "pack"] as const).map((a) => (
            <Button
              key={a}
              size="sm"
              variant={access === a ? "default" : "outline"}
              onClick={() => setAccess(a)}
              className="rounded-full"
            >
              {a === "all" ? "Barchasi" : a === "free" ? "Bepul" : "Pack"}
            </Button>
          ))}
          {canManage && (
            <Button size="sm" asChild className="ml-2"><Link to={`${basePath}/mocks/new`}><Plus className="h-4 w-4 mr-1" />Yangi</Link></Button>
          )}
        </div>
      </div>

      {/* Quick part filter chips */}
      <div className="flex gap-2 flex-wrap">
        {[
          { v: "all",  l: "Barcha testlar" },
          { v: "1",    l: "1-qism" },
          { v: "2",    l: "2-qism" },
          { v: "3",    l: "3-qism" },
          { v: "4",    l: "4-qism" },
          { v: "full", l: "To'liq testlar" },
        ].map((c) => (
          <Button
            key={c.v}
            size="sm"
            variant={partType === c.v ? "default" : "outline"}
            onClick={() => setPartType(c.v)}
            className="rounded-full"
          >
            {c.l}
          </Button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Test list */}
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              Hozircha mos testlar yo'q
            </Card>
          ) : (
            filtered.map((t, i) => {
              const diff = DIFFICULTY_META[t.difficulty ?? "easy"] ?? DIFFICULTY_META.easy;
              const DIcon = diff.icon;
              const isPack = t.required_pack && t.required_pack !== "free";
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="p-5 md:p-6 hover:shadow-elegant transition-smooth flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className={`font-display font-bold text-xl md:text-2xl ${meta.color}`}>{t.title}</h3>
                        <Badge variant="outline" className={isPack ? "uppercase text-amber-700 border-amber-500/40" : "uppercase text-emerald-700 border-emerald-500/40"}>
                          {isPack ? <><Crown className="h-3 w-3 mr-1" />Pack</> : "Bepul"}
                        </Badge>
                        {!t.is_published && (
                          <Badge variant="outline" className="uppercase text-muted-foreground border-dashed">Draft</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="rounded-full">
                          <Clock className="h-3 w-3 mr-1" /> {t.duration_minutes ?? 60} daq
                        </Badge>
                        <Badge variant="outline" className={`rounded-full ${diff.cls}`}>
                          <DIcon className="h-3 w-3 mr-1" /> {diff.label}
                        </Badge>
                        <Badge variant="outline" className="rounded-full">
                          <Layers className="h-3 w-3 mr-1" /> {t.part_type === "full" ? "To'liq" : `${t.part_type ?? 1} qism`}
                        </Badge>
                      </div>
                      {t.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">#{t.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {canManage && (
                        <>
                          <Button asChild size="icon" variant="outline" className="rounded-xl" title="Tahrirlash">
                            <Link to={`${basePath}/mocks/edit/${t.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="outline" className="rounded-xl text-destructive hover:bg-destructive/10" title="O'chirish">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Testni o'chirish?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  "{t.title}" testi va unga tegishli barcha savollar butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(t.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  O'chirish
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                      <Button asChild size="lg" className="rounded-xl">
                        <Link to={`${basePath}/mocks/take/${t.id}`}>
                          {canManage ? "Sinab ko'rish" : "Boshlash"} <ArrowRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Filters sidebar */}
        <Card className="p-5 h-fit lg:sticky lg:top-4 space-y-5">
          <div>
            <h3 className={`font-display font-bold text-lg ${meta.color}`}>Testlarni filtrlash</h3>
            <p className="text-xs text-muted-foreground mt-1">{filtered.length} ta test topildi</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Qidiruv</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Sarlavha yoki tag qidiring..."
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Qiyinlik</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha darajalar</SelectItem>
                <SelectItem value="easy">Oson</SelectItem>
                <SelectItem value="medium">O'rta</SelectItem>
                <SelectItem value="hard">Qiyin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Part turi</Label>
            <Select value={partType} onValueChange={setPartType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha turlar</SelectItem>
                <SelectItem value="1">1-qism</SelectItem>
                <SelectItem value="2">2-qism</SelectItem>
                <SelectItem value="3">3-qism</SelectItem>
                <SelectItem value="4">4-qism</SelectItem>
                <SelectItem value="full">To'liq</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => { /* applied automatically */ }}>Qo'llash</Button>
            <Button
              variant="outline"
              onClick={() => { setSearch(""); setDifficulty("all"); setPartType("all"); setAccess("all"); }}
            >
              Tozalash
            </Button>
          </div>
        </Card>
      </div>
    </div>
    </SectionGuard>
  );
}

