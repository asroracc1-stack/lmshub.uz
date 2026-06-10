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
  Target, Landmark, Lock, Zap, Star,
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

const DIFFICULTY_META: Record<string, { labelKey: string; cls: string; icon: any }> = {
  easy:   { labelKey: "mockCategory.difficulty.easy",   cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400", icon: Leaf },
  medium: { labelKey: "mockCategory.difficulty.medium", cls: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400",        icon: Sparkles },
  hard:   { labelKey: "mockCategory.difficulty.hard",   cls: "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-400",            icon: FileText },
};

// Card theme per pack type
const PACK_THEME = {
  free: {
    card: "bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40 hover:border-emerald-300 dark:hover:border-emerald-700/60 hover:shadow-lg hover:shadow-emerald-500/5",
    badge: "bg-emerald-500 text-white border-0 shadow-sm",
    badgeLabelKey: "mockCategory.filter.free",
    badgeIcon: null,
    button: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40",
    buttonLabelKey: "mockCategory.startBtn",
    buttonIcon: ArrowRight,
    titleBar: "from-emerald-500/8 to-transparent",
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

  useEffect(() => { loadTests(); }, [kind, canManage]);

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
      return true;
    });
  }, [tests, search, difficulty, partType, access]);

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

  const categoryName = t(`mockCategory.sections.${kind}`);

  return ( <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => nav(`${basePath}/mocks`)}
            className="rounded-xl hover:bg-slate-100 dark:hover:bg-white/5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <Badge variant="outline" className="mb-1.5 font-semibold">
              <Icon className={`h-3 w-3 mr-1 ${meta.color}`} />{meta.group}
            </Badge>
            <h1 className={`text-3xl md:text-4xl font-display font-bold ${meta.color}`}>
              {t("mockCategory.title", { name: meta.group === "IELTS" ? `IELTS ${categoryName}` : categoryName })}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Access filter pills */}
          {([
            { v: "all", l: t("mockCategory.filter.all"), cnt: tests.length, cls: "border-slate-200 dark:border-white/10" },
            { v: "free", l: t("mockCategory.filter.free"), cnt: freeCnt,  cls: "border-emerald-200 text-emerald-700 dark:border-emerald-800/60 dark:text-emerald-400" },
            { v: "pack", l: t("mockCategory.filter.pack"),  cnt: proCnt + eliteCnt, cls: "border-indigo-200 text-indigo-700 dark:border-indigo-800/60 dark:text-indigo-400" },
          ] as const).map((a) => (
            <button
              key={a.v}
              onClick={() => setAccess(a.v)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-bold border transition-all duration-200",
                access === a.v
                  ? a.v === "free" ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20"
                    : a.v === "pack" ? "bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20"
                    : "bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900"
                  : cn("bg-transparent hover:bg-slate-50 dark:hover:bg-white/5", a.cls)
              )}
            >
              {a.l}
              <span className="ml-1.5 opacity-60 text-xs">({a.cnt})</span>
            </button>
          ))}
          {canManage && (
            <Button size="sm" asChild className="ml-2 rounded-xl">
              <Link to={`${basePath}/mocks/new`}><Plus className="h-4 w-4 mr-1" />{t("mockCategory.newBtn")}</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Part filter chips */}
      <div className="flex gap-2 flex-wrap">
        {[
          { v: "all",  l: t("mockCategory.part.all") },
          { v: "1",    l: t("mockCategory.part.number", { num: 1 }) },
          { v: "2",    l: t("mockCategory.part.number", { num: 2 }) },
          { v: "3",    l: t("mockCategory.part.number", { num: 3 }) },
          { v: "4",    l: t("mockCategory.part.number", { num: 4 }) },
          { v: "full", l: t("mockCategory.part.full") },
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

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* Test list */}
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-medium">{t("mockCategory.loading")}</p>
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground rounded-2xl border-dashed">
              {t("mockCategory.noTests")}
            </Card>
          ) : (
            filtered.map((test, i) => {
              const diff = DIFFICULTY_META[test.difficulty ?? "easy"] ?? DIFFICULTY_META.easy;
              const DIcon = diff.icon;
              const packType = getPackType(test.required_pack);
              const theme = PACK_THEME[packType];
              const BtnIcon = theme.buttonIcon;
              const BadgeIconComp = theme.badgeIcon;

              // Check if user can access this test based on their subscription
              const isLocked = !canAccessPack(packAccess, test.required_pack, canManage);

              return (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                >
                  <div className={cn(
                    "relative rounded-2xl overflow-hidden transition-all duration-300",
                    theme.card
                  )}>
                    {/* Top gradient bar for non-free */}
                    {packType !== "free" && (
                      <div className={cn(
                        "absolute top-0 left-0 right-0 h-0.5",
                        packType === "pro"
                          ? "bg-gradient-to-r from-indigo-400 via-violet-500 to-purple-400"
                          : "bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400"
                      )} />
                    )}

                    {/* Lock overlay watermark for locked tests */}
                    {isLocked && (
                      <div className={cn(
                        "absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center opacity-20",
                        packType === "pro" ? "bg-indigo-500" : "bg-amber-500"
                      )}>
                        <Lock className="h-4 w-4 text-white" />
                      </div>
                    )}

                    <div className="p-5 md:p-6 flex items-center justify-between gap-4 flex-wrap">
                      {/* Left: info */}
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className={cn("font-display font-bold text-xl md:text-2xl", meta.color)}>
                            {test.title}
                          </h3>

                          {/* Pack badge */}
                          <Badge className={cn("text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1", theme.badge)}>
                            {BadgeIconComp && <BadgeIconComp className="h-3 w-3" />}
                            {"badgeLabelKey" in theme ? t(theme.badgeLabelKey as string) : theme.badgeLabel}
                          </Badge>

                          {!test.is_published && (
                            <Badge variant="outline" className="uppercase text-muted-foreground border-dashed text-[9px]">
                              Draft
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="rounded-full text-[11px] font-medium bg-white/60 dark:bg-white/5">
                            <Clock className="h-3 w-3 mr-1" /> {test.duration_minutes ?? 60} {t("mockCategory.minutesShort")}
                          </Badge>
                          <Badge variant="outline" className={cn("rounded-full text-[11px] font-medium", diff.cls)}>
                            <DIcon className="h-3 w-3 mr-1" /> {t(diff.labelKey)}
                          </Badge>
                          <Badge variant="outline" className="rounded-full text-[11px] font-medium bg-white/60 dark:bg-white/5">
                            <Layers className="h-3 w-3 mr-1" />
                            {test.part_type === "full" ? t("mockCategory.part.fullLabel") : t("mockCategory.part.numberLabel", { num: test.part_type ?? 1 })}
                          </Badge>
                        </div>

                        {test.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1 opacity-80">#{test.description}</p>
                        )}
                      </div>

                      {/* Right: actions */}
                      <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
                        {/* Admin controls */}
                        {canManage && (
                          <>
                            <Button asChild size="icon" variant="outline"
                              className="rounded-xl h-10 w-10 bg-white/60 dark:bg-white/5" title={t("common.edit")}>
                              <Link to={`${basePath}/mocks/edit/${test.id}`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="icon" variant="outline"
                                  className="rounded-xl h-10 w-10 text-destructive hover:bg-destructive/10 bg-white/60 dark:bg-white/5"
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
                                  <AlertDialogAction onClick={() => onDelete(test.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    {t("common.delete")}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}

                        {/* Main CTA button */}
                        {isLocked ? (
                          <Button
                            size="lg"
                            className={cn("rounded-xl h-11 px-6 font-bold text-sm transition-all duration-300 opacity-90", theme.button)}
                            onClick={() => nav(getPacksPath())}
                          >
                            {t("mockCategory.tryBtn")} <Lock className="h-4 w-4 ml-1.5" />
                          </Button>
                        ) : (
                          <Button
                            asChild
                            size="lg"
                            className={cn(
                              "rounded-xl h-11 px-6 font-bold text-sm transition-all duration-300",
                              canManage
                                ? "bg-slate-800 hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white"
                                : theme.button
                            )}
                          >
                            <Link to={`${basePath}/mocks/take/${test.id}`}>
                              {canManage ? t("mockCategory.tryBtn") : t(theme.buttonLabelKey)}
                              <BtnIcon className="h-4 w-4 ml-1.5" />
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

        {/* Filters sidebar */}
        <Card className="p-5 h-fit lg:sticky lg:top-4 space-y-5 rounded-2xl border shadow-sm">
          <div>
            <h3 className={cn("font-display font-bold text-lg", meta.color)}>{t("mockCategory.filter.title")}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t("mockCategory.filter.foundCount", { count: filtered.length })}</p>
          </div>

          {/* Pack type mini stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: t("mockCategory.filter.free"), cnt: freeCnt, cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40" },
              { label: "Pro",   cnt: proCnt,  cls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40" },
              { label: "Elite", cnt: eliteCnt,cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40" },
            ].map(s => (
              <div key={s.label} className={cn("rounded-xl p-2 text-center", s.cls)}>
                <p className="text-lg font-black">{s.cnt}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("common.search")}</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("mockCategory.filter.searchPlaceholder")}
                className="pl-9 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("mockCategory.filter.difficulty")}</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("mockCategory.filter.allLevels")}</SelectItem>
                <SelectItem value="easy">{t("mockCategory.difficulty.easy")}</SelectItem>
                <SelectItem value="medium">{t("mockCategory.difficulty.medium")}</SelectItem>
                <SelectItem value="hard">{t("mockCategory.difficulty.hard")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("mockCategory.filter.partType")}</Label>
            <Select value={partType} onValueChange={setPartType}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("mockCategory.filter.allTypes")}</SelectItem>
                <SelectItem value="1">{t("mockCategory.part.number", { num: 1 })}</SelectItem>
                <SelectItem value="2">{t("mockCategory.part.number", { num: 2 })}</SelectItem>
                <SelectItem value="3">{t("mockCategory.part.number", { num: 3 })}</SelectItem>
                <SelectItem value="4">{t("mockCategory.part.number", { num: 4 })}</SelectItem>
                <SelectItem value="full">{t("mockCategory.part.fullLabel")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => { setSearch(""); setDifficulty("all"); setPartType("all"); setAccess("all"); }}
            >
              {t("mockCategory.filter.clearBtn")}
            </Button>
          </div>

          {/* Pack upgrade promo box */}
          {!canManage && (proCnt > 0 || eliteCnt > 0) && (
            <div className="mt-2 p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 border border-indigo-200/70 dark:border-indigo-800/40 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Star className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">{t("mockCategory.promo.premium")}</p>
                  <p className="text-[10px] text-indigo-500/80 dark:text-indigo-400/80">{t("mockCategory.promo.testsAvailable", { count: proCnt + eliteCnt })}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {t("mockCategory.promo.desc")}
              </p>
              <Button
                size="sm"
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md hover:shadow-lg hover:from-indigo-600 hover:to-violet-700 font-bold text-xs"
                onClick={() => nav(getPacksPath())}
              >
                <Crown className="h-3.5 w-3.5 mr-1.5" /> {t("mockCategory.promo.viewPlansBtn")}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
