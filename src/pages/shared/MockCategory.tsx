import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "@/lib/axios";
import { useAuth } from "@/contexts/AuthContext";
import { usePackAccess, canAccessPack } from "@/hooks/usePackAccess";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

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
  Target, Landmark, Lock, Zap, Star, CheckCircle2, ChevronLeft, ChevronRight, History
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type Kind = "listening" | "reading" | "writing" | "speaking" | "sat" | "national_cert";

const META: Record<Kind, { icon: any; label: string; color: string; group: string }> = {
  listening:     { icon: Headphones, label: "Listening",         color: "text-purple-600", group: "IELTS" },
  reading:       { icon: BookOpen,   label: "Reading",           color: "text-blue-600",    group: "IELTS" },
  writing:       { icon: PenLine,    label: "Writing",           color: "text-orange-600",  group: "IELTS" },
  speaking:      { icon: Mic,        label: "Speaking",          color: "text-pink-600",    group: "IELTS" },
  sat:           { icon: Target,     label: "SAT",               color: "text-violet-600",  group: "SAT" },
  national_cert: { icon: Landmark,   label: "Milliy Sertifikat", color: "text-amber-600",   group: "Milliy" },
};

const DIFFICULTY_META: Record<string, { labelKey: string; cls: string; icon: any }> = {
  easy:   { labelKey: "mockCategory.difficulty.easy",   cls: "bg-purple-500/15 text-purple-700 border-purple-500/30 dark:text-purple-400", icon: Leaf },
  medium: { labelKey: "mockCategory.difficulty.medium", cls: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400",        icon: Sparkles },
  hard:   { labelKey: "mockCategory.difficulty.hard",   cls: "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-400",            icon: FileText },
};

// Card theme per pack type
const PACK_THEME = {
  free: {
    card: "bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/40 hover:border-purple-300 dark:hover:border-purple-700/60 hover:shadow-lg hover:shadow-purple-500/5",
    badge: "bg-purple-500 text-white border-0 shadow-sm",
    badgeLabelKey: "mockCategory.filter.free",
    badgeIcon: null,
    button: "bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40",
    buttonLabelKey: "mockCategory.startBtn",
    buttonIcon: ArrowRight,
    titleBar: "from-purple-500/8 to-transparent",
  },
  pro: {
    card: "bg-gradient-to-br from-indigo-50/80 via-violet-50/50 to-purple-50/80 dark:from-indigo-950/40 dark:via-violet-950/30 dark:to-purple-950/40 border border-indigo-200/70 dark:border-indigo-800/50 hover:border-indigo-400/80 dark:hover:border-indigo-600/60 hover:shadow-lg hover:shadow-indigo-500/10",
    badge: "bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-0 shadow-md shadow-indigo-500/30",
    badgeLabel: "PRO",
    badgeIcon: Zap,
    button: "bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50",
    buttonLabelKey: "mockCategory.viewPackBtn",
    buttonIcon: Crown,
    titleBar: "from-indigo-500/10 to-transparent",
  },
  elite: {
    card: "bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-yellow-50/80 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-yellow-950/40 border border-amber-200/70 dark:border-amber-800/50 hover:border-amber-400/80 dark:hover:border-amber-600/60 hover:shadow-lg hover:shadow-amber-500/10",
    badge: "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-md shadow-amber-500/30",
    badgeLabel: "ELITE",
    badgeIcon: Crown,
    button: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50",
    buttonLabelKey: "mockCategory.viewPackBtn",
    buttonIcon: Crown,
    titleBar: "from-amber-500/10 to-transparent",
  },
};

export default function MockCategory({ basePath = "/user", forcedKind }: { basePath?: string; forcedKind?: Kind }) {
  const { t } = useTranslation();
  const { kind: paramKind } = useParams<{ kind: Kind }>();
  const kind = forcedKind || paramKind;
  const nav = useNavigate();
  const { role } = useAuth();
  const canManage = role === "super_admin" || role === "payment_manager";
  const packAccess = usePackAccess();
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [partType, setPartType] = useState<string>("all");
  const [access, setAccess] = useState<"all" | "free" | "pack">("all");
  const [attempts, setAttempts] = useState<any[]>([]);
  const [showOnlyCompleted, setShowOnlyCompleted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [requiredPackType, setRequiredPackType] = useState("pro");

  const loadTests = async () => {
    if (!kind) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/exams?type=${kind.toUpperCase()}`);
      const mappedData = data.map((d: any) => ({
        ...d,
        duration_minutes: d.duration_minutes || d.durationMinutes,
        is_published: d.is_active || d.isActive,
        required_pack: (d.required_pack || d.requiredPack || "free").toLowerCase(),
        part_type: "full",
      }));
      setTests(mappedData);
    } catch (e) {
      toast.error(t("mockCategory.loadError"));
    }
    setLoading(false);
  };

  const loadAttempts = async () => {
    try {
      const { data } = await api.get("/student/exams/attempts");
      // Normalize: ensure examId is always a string for comparison
      const normalized = (Array.isArray(data) ? data : []).map((a: any) => ({
        ...a,
        examId: String(a.examId ?? a.exam_id ?? ""),
      }));
      setAttempts(normalized);
    } catch (e: any) {
      console.warn("Attempts load failed (may not be logged in as student):", e?.response?.status, e?.message);
    }
  };

  useEffect(() => { loadTests(); loadAttempts(); }, [kind, canManage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, difficulty, partType, access, showOnlyCompleted]);

  const onDelete = async (id: string) => {
    try {
      await api.delete(`/admin/exams/${id}`);
      toast.success(t("mockCategory.deleteSuccess"));
      setTests((p) => p.filter((t) => t.id !== id));
    } catch (e: any) { toast.error(t("mockCategory.deleteError")); }
  };

  const filtered = useMemo(() => {
    return tests.filter((t) => {
      if (search && !`${t.title} ${t.description ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (difficulty !== "all" && (t.difficulty ?? "easy") !== difficulty) return false;
      if (partType !== "all" && String(t.part_type ?? "all") !== partType) return false;
      if (access === "free" && t.required_pack && t.required_pack !== "free") return false;
      if (access === "pack" && (!t.required_pack || t.required_pack === "free")) return false;
      if (showOnlyCompleted && !attempts.some(a => String(a.examId) === String(t.id))) return false;
      return true;
    });
  }, [tests, search, difficulty, partType, access, showOnlyCompleted, attempts]);

  const paginatedTests = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);
  
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  if (!kind || !META[kind as Kind]) {
    return <div className="p-8 text-center text-muted-foreground">{t("mockCategory.unknownSection")}</div>;
  }
  const meta = META[kind as Kind];
  const Icon = meta.icon;

  const getPackType = (required_pack: string): "free" | "pro" | "elite" => {
    const p = (required_pack || "free").toLowerCase();
    if (p === "pro") return "pro";
    if (p === "elite") return "elite";
    return "free";
  };

  const getPacksPath = () => {
    if (basePath === "/user") return "/user/subscriptions";
    return `${basePath}/packs`;
  };

  const freeCnt = tests.filter(t => getPackType(t.required_pack) === "free").length;
  const proCnt  = tests.filter(t => getPackType(t.required_pack) === "pro").length;
  const eliteCnt= tests.filter(t => getPackType(t.required_pack) === "elite").length;

  const categoryName = kind === "speaking" ? t("dynamic.speakingpartners.speaking") : kind === "national_cert" ? t("dynamic.usersmanager.milliy_sertifikat") : t(`mockCategory.sections.${kind}`);

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => nav(`${basePath}/practice`)}
            className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c0817] text-slate-700 dark:text-slate-200 font-bold text-xs gap-1.5 h-11 px-4">
            <ArrowLeft className="h-4 w-4" />
            Orqaga
          </Button>
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
              {t("mockCategory.title", { name: meta.group === "IELTS" ? `IELTS ${categoryName}` : categoryName })}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Top Bajarilganlar pill button */}
          <Button
            asChild
            className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 shadow-md shadow-indigo-500/20"
          >
            <Link to={`${basePath}/reading/history`}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Bajarilganlar ({attempts.length})
            </Link>
          </Button>

          {canManage && (
            <Button size="sm" asChild className="rounded-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs">
              <Link to={`${basePath}/mocks/new`}><Plus className="h-4 w-4 mr-1" />{t("mockCategory.newBtn")}</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Category filter pills & Access filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-wrap">
        {/* Part filter chips */}
        <div className="flex gap-2 flex-wrap">
          {[
            { v: "all",  l: "Barcha testlar" },
            { v: "1",    l: "1-qism" },
            { v: "2",    l: "2-qism" },
            { v: "3",    l: "3-qism" },
            { v: "full", l: "To'liq testlar" },
          ].map((c) => (
            <button
              key={c.v}
              onClick={() => setPartType(c.v)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-extrabold transition-all duration-200",
                partType === c.v
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200"
              )}
            >
              {c.l}
            </button>
          ))}
        </div>

        {/* Access filter pills */}
        <div className="flex gap-2 flex-wrap">
          {[
            { v: "all", l: "Barchasi" },
            { v: "free", l: "Bepul" },
            { v: "pack", l: "Pack" },
          ].map((a) => (
            <button
              key={a.v}
              onClick={() => setAccess(a.v as any)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-extrabold transition-all duration-200 border",
                access === a.v
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20"
                  : "bg-white dark:bg-[#0c0817] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
              )}
            >
              {a.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Test list */}
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              <p className="text-sm text-muted-foreground font-medium">{t("mockCategory.loading")}</p>
            </div>
          ) : paginatedTests.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground rounded-3xl border-dashed">
              {t("mockCategory.noTests")}
            </Card>
          ) : (
            paginatedTests.map((test, i) => {
              const diff = DIFFICULTY_META[test.difficulty ?? "easy"] ?? DIFFICULTY_META.easy;
              const DIcon = diff.icon;
              const packType = getPackType(test.required_pack);
              const attempt = attempts.find(a => String(a.examId) === String(test.id));
              const isLocked = !packAccess.loading && !canAccessPack(packAccess, test.required_pack, canManage);

              return (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                >
                  <div className="relative rounded-3xl border border-slate-200/80 dark:border-slate-800/60 bg-white dark:bg-[#0c0817] p-6 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                    
                    {/* Top Right Corner Badge */}
                    <div className="absolute top-4 right-4">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border",
                        packType === "free"
                          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-300/60 dark:border-emerald-800/50"
                          : packType === "pro"
                          ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-300/60 dark:border-indigo-800/50"
                          : "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-300/60 dark:border-amber-800/50"
                      )}>
                        {packType === "free" ? "BEPUL" : packType.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                      {/* Left: Info */}
                      <div className="space-y-3 flex-1 min-w-0 pr-16">
                        <h3 className="text-xl md:text-2xl font-black text-indigo-600 dark:text-indigo-400 truncate">
                          {test.title.startsWith("Test") ? test.title : `Test ${i + 1} | ${test.title}`}
                        </h3>

                        {/* Metadata badges row */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {attempt ? (
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-200/60 font-extrabold px-2.5 py-1 rounded-full">
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-indigo-500" />
                              Bajarildi · {attempt.totalScore ?? attempt.overallBand ?? 0}/{attempt.maxScore ?? 13}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 font-semibold px-2.5 py-1 rounded-full">
                              ⚡ Yechilmagan
                            </Badge>
                          )}

                          <Badge variant="outline" className="rounded-full bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-2.5 py-1">
                            <Clock className="h-3.5 w-3.5 mr-1 text-slate-400" />
                            {test.duration_minutes ?? 20} daq
                          </Badge>

                          <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 font-semibold", diff.cls)}>
                            ⚡ {t(diff.labelKey)}
                          </Badge>

                          <Badge variant="outline" className="rounded-full bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-2.5 py-1">
                            <BookOpen className="h-3.5 w-3.5 mr-1 text-slate-400" />
                            {test.part_type === "full" ? "To'liq test" : `${test.part_type ?? 1} qism`}
                          </Badge>
                        </div>

                        {/* Topic tags row */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 px-2.5 py-0.5 rounded-md">
                            #To'g'ri/Noto'g'ri/Berilmagan
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 px-2.5 py-0.5 rounded-md">
                            #gap filling
                          </span>
                          {test.description && (
                            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 px-2.5 py-0.5 rounded-md">
                              #{test.description}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2.5 shrink-0 pt-2 md:pt-0">
                        {canManage && (
                          <>
                            <Button asChild size="icon" variant="outline"
                              className="rounded-xl h-10 w-10 border-slate-200 dark:border-slate-800" title={t("common.edit")}>
                              <Link to={`${basePath}/mocks/edit/${test.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="outline"
                                  className="rounded-xl h-10 w-10 text-rose-500 border-rose-200 hover:bg-rose-50"
                                  title={t("common.delete")}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t("mockCategory.deleteConfirmTitle")}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t("mockCategory.deleteConfirmDesc", { title: test.title })}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => onDelete(test.id)} className="bg-rose-500 text-white">
                                    {t("common.delete")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}

                        {isLocked ? (
                          <Button
                            size="lg"
                            className="rounded-xl h-11 px-6 font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-md"
                            onClick={() => {
                              setRequiredPackType(test.required_pack || "pro");
                              setLockModalOpen(true);
                            }}
                          >
                            Tarif kerak <Lock className="h-4 w-4 ml-1.5" />
                          </Button>
                        ) : attempt ? (
                          <>
                            <Button
                              asChild
                              variant="outline"
                              className="rounded-xl h-11 px-5 font-extrabold text-xs gap-1.5 border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                            >
                              <Link to={`${basePath}/mocks/take/${test.id}?review=true&attemptId=${attempt.id}`}>
                                Ko'rib chiqish
                              </Link>
                            </Button>
                            <Button
                              asChild
                              className="rounded-xl h-11 px-5 font-extrabold text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
                            >
                              <Link to={`${basePath}/mocks/take/${test.id}?retake=true`}>
                                Qaytadan
                              </Link>
                            </Button>
                          </>
                        ) : (
                          <Button
                            asChild
                            className="rounded-xl h-11 px-6 font-extrabold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20"
                          >
                            <Link to={`${basePath}/mocks/take/${test.id}`}>
                              Boshlash <ArrowRight className="h-4 w-4 ml-1.5" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Right Filters sidebar */}
        <Card className="p-6 h-fit lg:sticky lg:top-4 space-y-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/60 bg-white dark:bg-[#0c0817] shadow-sm">
          <div>
            <h3 className="font-display font-black text-xl text-indigo-600 dark:text-indigo-400">
              Testlarni filtrlash
            </h3>
            <p className="text-xs text-slate-400 font-semibold mt-1">
              {filtered.length} ta test topildi
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Qidiruv</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Sarlavha yoki tag qidiring..."
                className="pl-9 rounded-xl border-slate-200 dark:border-slate-800 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Qiyinlik</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha darajalar</SelectItem>
                <SelectItem value="easy">Oson</SelectItem>
                <SelectItem value="medium">O'rta</SelectItem>
                <SelectItem value="hard">Qiyin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Savol turi</Label>
            <Select value={partType} onValueChange={setPartType}>
              <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha turlar</SelectItem>
                <SelectItem value="1">1-qism</SelectItem>
                <SelectItem value="2">2-qism</SelectItem>
                <SelectItem value="3">3-qism</SelectItem>
                <SelectItem value="full">To'liq testlar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs h-11 shadow-md shadow-indigo-500/20"
              onClick={() => setCurrentPage(1)}
            >
              Qo'llash
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-extrabold text-xs h-11 px-4"
              onClick={() => { setSearch(""); setDifficulty("all"); setPartType("all"); setAccess("all"); }}
            >
              Tozalash
            </Button>
          </div>
        </Card>
      </div>

      {/* Premium Lock Modal */}
      <AlertDialog open={lockModalOpen} onOpenChange={setLockModalOpen}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-none rounded-[2.5rem] shadow-2xl max-w-md p-6 text-center">
          <div className="h-16 w-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <Lock className="h-8 w-8 animate-pulse" />
          </div>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black tracking-tight text-slate-800 dark:text-white">
              Bu mock premium paket uchun mavjud
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-400 mt-2">
              Ushbu mock test yopiq hisoblanadi. Uni boshlash uchun sizda faol <span className="font-bold text-indigo-500 uppercase">{requiredPackType}</span> obuna paketi bo'lishi talab qilinadi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <AlertDialogCancel className="bg-slate-100 dark:bg-white/5 border-none text-slate-500 rounded-xl h-12 px-6 font-bold flex-1 sm:flex-none">
              Bekor qilish
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setLockModalOpen(false); nav(getPacksPath()); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-6 font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-500/20 flex-1 sm:flex-none"
            >
              Tariflarni ko'rish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
