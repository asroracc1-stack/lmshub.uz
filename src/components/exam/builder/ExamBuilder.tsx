import React, {
  useState, useEffect, useCallback, useMemo, useRef
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { api } from "@/lib/axios";
import { toast } from "sonner";
import {
  Save, Eye, Play, AlertTriangle, CheckCircle2,
  Loader2, ChevronLeft, Settings2, Plus, Wand2,
  BookOpen, Layers, BarChart3, Clock, Target,
  Zap, Globe, Lock, RefreshCw, Download, Upload,
  History, Copy, Trash2, MoreHorizontal, Keyboard,
  X, ClipboardList, FlaskConical, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  PanelGroup, Panel, PanelResizeHandle,
} from "react-resizable-panels";

// Builder components
import SectionNav from "./SectionNav";
import QuestionCanvas from "./QuestionCanvas";
import SectionConfigPanel from "./SectionConfigPanel";
import QuestionTypeSelector from "./QuestionTypeSelector";
import { ValidationPanel } from "./ValidationPanel";
import StudentPreviewModal from "./StudentPreviewModal";
import {
  ExamMeta, Section, Question, ExamKind, Difficulty,
  newQuestion, newSection, uid, EXAM_KIND_CONFIG,
  QuestionType, PublishStatus,
} from "./types";

// ============================================================
// Auto-save hook
// ============================================================
const AUTOSAVE_KEY = "exam_builder_draft";
const AUTOSAVE_INTERVAL = 10_000; // 10 seconds

function useAutoSave(state: { meta: ExamMeta; sections: Section[] }, examId?: string) {
  const key = examId ? `${AUTOSAVE_KEY}_${examId}` : `${AUTOSAVE_KEY}_new`;
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const save = useCallback(() => {
    try {
      localStorage.setItem(key, JSON.stringify({ ...state, savedAt: new Date().toISOString() }));
      setLastSaved(new Date());
      setIsDirty(false);
    } catch {}
  }, [state, key]);

  const load = useCallback((): { meta: ExamMeta; sections: Section[] } | null => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [key]);

  const clear = useCallback(() => {
    try { localStorage.removeItem(key); } catch {}
  }, [key]);

  // Auto-save effect
  useEffect(() => {
    setIsDirty(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { save(); }, AUTOSAVE_INTERVAL);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [state, save]);

  return { lastSaved, isDirty, save, load, clear };
}

// ============================================================
// ExamMetaBar — top bar with exam settings
// ============================================================
interface ExamMetaBarProps {
  meta: ExamMeta;
  onChange: (patch: Partial<ExamMeta>) => void;
}

const ExamMetaBar: React.FC<ExamMetaBarProps> = ({ meta, onChange }) => {
  const kindConfig = EXAM_KIND_CONFIG[meta.kind] || EXAM_KIND_CONFIG.custom;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Kind selector */}
      <Select value={meta.kind} onValueChange={(v) => onChange({ kind: v as ExamKind })}>
        <SelectTrigger className="h-8 w-44 text-xs border-violet-200 dark:border-violet-800">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(EXAM_KIND_CONFIG).map(([k, v]) => (
            <SelectItem key={k} value={k} className="text-xs">
              {v.icon} {v.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Title */}
      <Input
        className="h-8 flex-1 min-w-48 text-sm font-semibold border-violet-200 dark:border-violet-800"
        placeholder="Exam sarlavhasi..."
        value={meta.title}
        onChange={(e) => onChange({ title: e.target.value })}
      />

      {/* Duration */}
      <div className="flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="number"
          className="h-8 w-20 text-xs"
          placeholder="60"
          value={meta.durationMinutes}
          min={1}
          onChange={(e) => onChange({ durationMinutes: parseInt(e.target.value) || 60 })}
        />
        <span className="text-xs text-muted-foreground">daq</span>
      </div>

      {/* Difficulty */}
      <Select value={meta.difficulty} onValueChange={(v) => onChange({ difficulty: v as Difficulty })}>
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="easy" className="text-xs">🟢 Oson</SelectItem>
          <SelectItem value="medium" className="text-xs">🟡 O'rta</SelectItem>
          <SelectItem value="hard" className="text-xs">🔴 Qiyin</SelectItem>
          <SelectItem value="expert" className="text-xs">⚫ Expert</SelectItem>
        </SelectContent>
      </Select>

      {/* Pack */}
      <Select value={meta.requiredPack} onValueChange={(v: any) => onChange({ requiredPack: v })}>
        <SelectTrigger className="h-8 w-24 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="free" className="text-xs">🆓 Free</SelectItem>
          <SelectItem value="pro" className="text-xs">⭐ Pro</SelectItem>
          <SelectItem value="elite" className="text-xs">👑 Elite</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

// ============================================================
// Main ExamBuilder Component
// ============================================================
interface ExamBuilderProps {
  basePath?: string;
  defaultKind?: ExamKind;
}

const ExamBuilder: React.FC<ExamBuilderProps> = ({
  basePath = "/super-admin",
  defaultKind = "reading",
}) => {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId?: string }>();
  const isEdit = !!testId;

  // ---- State ----
  const [meta, setMeta] = useState<ExamMeta>({
    title: "",
    kind: defaultKind,
    difficulty: "medium",
    durationMinutes: 60,
    passingScore: 50,
    requiredPack: "free",
    status: "draft",
    tags: [],
  });
  const [sections, setSections] = useState<Section[]>([newSection()]);
  const [activeSection, setActiveSection] = useState(0);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // UI state
  const [typeSelector, setTypeSelector] = useState<{ open: boolean; sectionIdx: number; questionId: string | null }>({
    open: false, sectionIdx: 0, questionId: null
  });
  const [showValidation, setShowValidation] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [aiTextBusy, setAiTextBusy] = useState(false);
  const [aiPdfBusy, setAiPdfBusy] = useState(false);

  // Auto-save
  const autoSaveState = useMemo(() => ({ meta, sections }), [meta, sections]);
  const { lastSaved, isDirty, save: autoSave, load: loadDraft, clear: clearDraft } = useAutoSave(autoSaveState, testId);

  // ---- Load existing exam ----
  useEffect(() => {
    if (!isEdit || !testId) {
      // Try to restore draft for new exam
      const draft = loadDraft();
      if (draft && !testId) {
        // Optionally restore draft
      }
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/admin/exams/${testId}`);
        const t = res.data;
        if (!t) { toast.error("Test topilmadi"); navigate(`${basePath}/mocks`); return; }

        setMeta({
          id: t.id,
          title: t.title || "",
          kind: (t.type?.toLowerCase() || defaultKind) as ExamKind,
          difficulty: (t.difficulty?.toLowerCase() || "medium") as Difficulty,
          durationMinutes: t.durationMinutes || t.duration_minutes || 60,
          passingScore: t.passingScore || t.passing_score || 50,
          requiredPack: t.requiredPack || t.required_pack || "free",
          status: (t.isActive ? "published" : "draft") as PublishStatus,
          audioUrl: t.audioUrl || t.audio_url,
          pdfUrl: t.pdfUrl || t.pdf_url,
          tags: t.tags ? t.tags.split(",").map((s: string) => s.trim()) : [],
        });

        if (t.passages && Array.isArray(t.passages) && t.passages.length > 0) {
          const built: Section[] = t.passages.map((p: any) => ({
            id: uid(),
            title: p.title || "",
            passage: p.content || "",
            richPassage: p.content || "",
            imageUrl: p.imageUrl || p.image_url || "",
            media: p.imageUrl ? [{ type: "image", url: p.imageUrl }] : [],
            questions: (p.questions || []).map((q: any): Question => ({
              id: uid(),
              prompt: q.text || "",
              richText: q.text || "",
              qtype: (q.questionType || q.question_type || "single_choice") as QuestionType,
              difficulty: "medium",
              points: q.points || 1,
              status: "published",
              options: (q.options || []).map((o: any) => ({
                id: uid(),
                text: o.text || "",
                isCorrect: o.isCorrect || o.is_correct || false,
                media: o.imageUrl ? [{ type: "image", url: o.imageUrl }] : undefined,
              })),
              media: q.imageUrl ? [{ type: "image", url: q.imageUrl }] : [],
              audioUrl: q.audioUrl || q.audio_url,
              explanation: q.explanation || "",
            })),
          }));
          setSections(built.length ? built : [newSection()]);
          if (built.length > 0 && built[0].questions.length > 0) {
            setActiveQuestionId(built[0].questions[0].id);
          }
        }
      } catch (e: any) {
        toast.error("Ma'lumotlarni yuklashda xatolik: " + (e?.response?.data?.message || e?.message));
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, testId]);

  // ---- Helpers ----
  const updateMeta = (patch: Partial<ExamMeta>) => setMeta((prev) => ({ ...prev, ...patch }));

  const updateSection = (si: number, patch: Partial<Section>) =>
    setSections((prev) => prev.map((s, i) => i === si ? { ...s, ...patch } : s));

  const updateQuestion = (si: number, questionId: string, patch: Partial<Question>) =>
    setSections((prev) => prev.map((s, i) => i !== si ? s : {
      ...s,
      questions: s.questions.map((q) => q.id === questionId ? { ...q, ...patch } : q),
    }));

  const addSection = () => {
    const s = newSection();
    setSections((prev) => [...prev, s]);
    setActiveSection(sections.length);
    setActiveQuestionId(s.questions[0]?.id || null);
  };

  const deleteSection = (si: number) => {
    if (sections.length === 1) { toast.error("Kamida 1 section kerak"); return; }
    setSections((prev) => prev.filter((_, i) => i !== si));
    setActiveSection(Math.max(0, si - 1));
  };

  const addQuestion = (si: number) => {
    const q = newQuestion("single_choice");
    setSections((prev) => prev.map((s, i) => i !== si ? s : {
      ...s, questions: [...s.questions, q]
    }));
    setActiveSection(si);
    setActiveQuestionId(q.id);
  };

  const deleteQuestion = (si: number, questionId: string) => {
    const s = sections[si];
    if (s.questions.length === 1) { toast.error("Kamida 1 savol kerak"); return; }
    const remaining = s.questions.filter((q) => q.id !== questionId);
    setSections((prev) => prev.map((sec, i) => i !== si ? sec : { ...sec, questions: remaining }));
    if (activeQuestionId === questionId) {
      setActiveQuestionId(remaining[0]?.id || null);
    }
  };

  // ---- Active question ----
  const activeQ = useMemo(() => {
    if (!activeQuestionId) return null;
    for (const s of sections) {
      const q = s.questions.find((q) => q.id === activeQuestionId);
      if (q) return q;
    }
    return null;
  }, [sections, activeQuestionId]);

  const activeSectionIdx = useMemo(() => {
    if (!activeQuestionId) return activeSection;
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].questions.some((q) => q.id === activeQuestionId)) return i;
    }
    return activeSection;
  }, [sections, activeQuestionId, activeSection]);

  // ---- Question type change ----
  const openTypeSelector = (si: number, questionId: string) => {
    setTypeSelector({ open: true, sectionIdx: si, questionId });
  };

  const handleTypeSelect = (type: QuestionType) => {
    if (!typeSelector.questionId) return;
    const si = typeSelector.sectionIdx;
    updateQuestion(si, typeSelector.questionId, {
      qtype: type,
      options: newQuestion(type).options,
      matchingPairs: type === "matching" ? [{ id: uid(), left: "", right: "" }] : undefined,
    });
    setTypeSelector({ open: false, sectionIdx: 0, questionId: null });
  };

  // ---- AI Import ----
  const handleAIParseText = async (text: string) => {
    if (text.trim().length < 50) { toast.error("Matn juda qisqa"); return; }
    setAiTextBusy(true);
    try {
      const res = await api.post("/admin/exams/parse-ai", { text }, { headers: { "Content-Type": "application/json" } });
      const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      if (data?.sections?.length > 0) {
        const mapped: Section[] = data.sections.map((s: any) => ({
          id: uid(),
          title: s.title || "",
          passage: s.passage || "",
          richPassage: s.passage || "",
          questions: (s.questions || []).filter((q: any) => q.prompt).map((q: any) => {
            const opts = (Array.isArray(q.options) ? q.options : []).map((o: any) => ({
              id: uid(), text: String(o),
              isCorrect: String(o).trim() === String(q.correct_answer || "").trim(),
            }));
            return {
              id: uid(), prompt: q.prompt || "",
              richText: q.prompt || "",
              qtype: q.qtype || "single_choice",
              difficulty: "medium" as Difficulty,
              points: q.points || 1,
              status: "draft" as const,
              options: opts,
              explanation: q.explanation || "",
              media: [],
            };
          }),
        }));
        setSections((prev) => {
          const updated = [...prev];
          updated[activeSectionIdx] = { ...updated[activeSectionIdx], ...mapped[0] };
          return updated;
        });
        toast.success(`AI: ${mapped[0].questions.length} savol ajratildi ✅`);
      } else {
        toast.error("AI ma'lumotni ajrata olmadi");
      }
    } catch (e: any) {
      toast.error("AI xatolik: " + (e?.response?.data?.message || e?.message));
    } finally {
      setAiTextBusy(false);
    }
  };

  const handleAIParsePdf = async (file: File) => {
    setAiPdfBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/admin/exams/analyze-pdf", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 240000,
      });
      const data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      if (data?.sections?.length > 0) {
        const mapped: Section[] = data.sections.map((s: any) => ({
          id: uid(),
          title: s.title || "",
          passage: s.passage || "",
          richPassage: s.passage || "",
          questions: (s.questions || []).filter((q: any) => q.prompt).map((q: any) => ({
            id: uid(), prompt: q.prompt || "",
            richText: q.prompt || "",
            qtype: q.qtype || "single_choice",
            difficulty: "medium" as Difficulty,
            points: q.points || 1,
            status: "draft" as const,
            options: (Array.isArray(q.options) ? q.options : []).map((o: any) => ({
              id: uid(), text: String(o),
              isCorrect: String(o).trim() === String(q.correct_answer || "").trim(),
            })),
            explanation: q.explanation || "",
            media: [],
          })),
        }));
        setSections(mapped);
        const totalQs = mapped.reduce((acc, s) => acc + s.questions.length, 0);
        toast.success(`PDF AI: ${mapped.length} bo'lim, ${totalQs} savol ✅`);
      } else {
        toast.error("AI PDF ni tahlil qila olmadi");
      }
    } catch (e: any) {
      const serverMsg = e?.response?.data;
      toast.error(typeof serverMsg === "string" && serverMsg.trim()
        ? "PDF AI: " + serverMsg
        : "PDF AI xatolik: " + (e?.response?.data?.message || e?.message));
    } finally {
      setAiPdfBusy(false);
    }
  };

  // ---- Save ----
  const buildPayload = () => ({
    title: meta.title,
    description: meta.description || null,
    type: meta.kind.toUpperCase(),
    audio_url: meta.audioUrl || null,
    pdf_url: meta.pdfUrl || null,
    duration_minutes: meta.durationMinutes,
    passing_score: meta.passingScore,
    difficulty: meta.difficulty.toUpperCase(),
    required_pack: meta.requiredPack,
    sections: sections.filter((s) => s.title.trim() || s.passage?.trim() || s.questions.length > 0).map((s) => ({
      title: s.title || "Section",
      passage: s.richPassage || s.passage || "",
      image_url: s.imageUrl || s.media?.[0]?.url || null,
      audio_url: s.audioUrl || null,
      pdf_attachment: s.pdfAttachment || null,
      time_limit_seconds: s.timeLimitSeconds || null,
      shuffle_questions: s.shuffleQuestions || false,
      shuffle_options: s.shuffleOptions || false,
      auto_numbering: s.autoNumbering !== false,
      lock_navigation: s.lockNavigation || false,
      instructions: s.instructions || null,
      color_theme: s.colorTheme || null,
      icon: s.icon || null,
      difficulty: s.difficulty || null,
      passing_score: s.passingScore || null,
      questions: s.questions.filter((q) => q.prompt.trim() || q.richText?.trim()).map((q) => ({
        prompt: q.richText || q.prompt,
        qtype: q.qtype,
        options: q.options.map((o) => ({
          text: o.text,
          is_correct: o.isCorrect,
          image_url: o.media?.url || null,
          formula: o.formula || null,
          explanation: o.explanation || null,
        })),
        image_url: q.media?.[0]?.url || null,
        audio_url: q.audioUrl || null,
        video_url: q.videoUrl || null,
        formula_latex: q.formula || null,
        points: q.points || 1,
        negative_marks: q.negativeMarks || 0,
        time_limit_seconds: q.timeLimitSeconds || null,
        explanation: q.explanation || null,
        hint: q.hint || null,
        topic: q.topic || null,
        subtopic: q.subtopic || null,
        tags: q.tags?.join(",") || null,
        difficulty: q.difficulty,
        numeric_answer: q.numericAnswer || null,
        numeric_tolerance: q.numericTolerance || null,
        fill_template: q.fillTemplate || null,
        word_limit: q.wordLimit || null,
        matching_pairs: q.matchingPairs ? JSON.stringify(q.matchingPairs) : null,
      })),
    })),
  });

  const handleSave = async () => {
    if (!meta.title.trim()) { toast.error("Sarlavha kiritilmagan"); return; }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        await api.put(`/admin/exams/${testId}`, payload);
        toast.success("Test yangilandi ✅");
      } else {
        await api.post("/admin/exams", payload);
        toast.success("Test yaratildi ✅");
      }
      clearDraft();
      navigate(`${basePath}/sat-mocks`);
    } catch (e: any) {
      toast.error("Xatolik: " + (e?.response?.data?.message || e?.message));
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await handleSave();
      toast.success("Exam nashr qilindi 🎉");
    } finally {
      setPublishing(false);
      setShowValidation(false);
    }
  };

  // ---- Stats ----
  const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0);
  const totalPoints = sections.reduce((acc, s) => acc + s.questions.reduce((a, q) => a + q.points, 0), 0);
  const issueCount = sections.reduce((acc, s) => acc + s.questions.filter((q) =>
    !q.options?.some((o) => o.isCorrect) &&
    !["essay", "short_answer", "speaking_recording", "code", "numeric", "formula"].includes(q.qtype)
  ).length, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="h-12 w-12 rounded-2xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
        </div>
        <p className="text-sm text-muted-foreground">Test yuklanmoqda...</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={500}>
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        {/* ============ TOP HEADER BAR ============ */}
        <div className="shrink-0 border-b bg-card/80 backdrop-blur-sm shadow-sm z-20">
          <div className="flex items-center gap-3 px-4 py-2.5">
            {/* Back */}
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 shrink-0 hover:bg-violet-50 dark:hover:bg-violet-950/20"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Title badge */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-md shadow-violet-500/30">
                <BookOpen className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-black text-foreground leading-none">Enterprise</p>
                <p className="text-[10px] text-muted-foreground leading-none">Exam Builder</p>
              </div>
            </div>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Meta form */}
            <div className="flex-1 min-w-0">
              <ExamMetaBar meta={meta} onChange={updateMeta} />
            </div>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Stats */}
            <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" />
                <span>{sections.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <ClipboardList className="h-3.5 w-3.5" />
                <span>{totalQuestions}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-amber-500" />
                <span>{totalPoints}</span>
              </div>
              {issueCount > 0 && (
                <Badge variant="outline" className="h-5 text-[10px] text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/20 gap-1">
                  <AlertTriangle className="h-2.5 w-2.5" /> {issueCount}
                </Badge>
              )}
            </div>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Auto-save indicator */}
            <div className="shrink-0 text-[10px] text-muted-foreground min-w-fit">
              {isDirty ? (
                <span className="flex items-center gap-1 text-amber-500">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Saqlanmoqda...
                </span>
              ) : lastSaved ? (
                <span className="flex items-center gap-1 text-emerald-500">
                  <CheckCircle2 className="h-3 w-3" /> Saqlandi
                </span>
              ) : null}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShowPreview(true)}>
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Student ko'rinishini ko'rish</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline" size="sm"
                    className="h-8 gap-1.5 text-xs text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                    onClick={() => setShowValidation(true)}
                  >
                    <BarChart3 className="h-3.5 w-3.5" /> Tahlil
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Validatsiya va nashr</TooltipContent>
              </Tooltip>

              <Button
                size="sm"
                className={cn(
                  "h-8 gap-1.5 text-xs shadow-md transition-all",
                  "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700",
                  "text-white shadow-violet-500/30"
                )}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {isEdit ? "Saqlash" : "Yaratish"}
              </Button>

              {/* More actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-xs gap-2" onClick={() => autoSave()}>
                    <Save className="h-3.5 w-3.5" /> Qo'lda saqlash (draft)
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs gap-2" onClick={() => {
                    const payload = buildPayload();
                    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = `${meta.title || "exam"}.json`; a.click();
                    URL.revokeObjectURL(url);
                  }}>
                    <Download className="h-3.5 w-3.5" /> JSON eksport
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-xs gap-2 text-rose-600" onClick={() => {
                    if (confirm("Barcha o'zgarishlarni bekor qilasizmi?")) {
                      setSections([newSection()]);
                      setMeta({ title: "", kind: defaultKind, difficulty: "medium", durationMinutes: 60, passingScore: 50, requiredPack: "free", status: "draft" });
                    }
                  }}>
                    <Trash2 className="h-3.5 w-3.5" /> Tozalash
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* ============ MAIN 3-PANEL LAYOUT ============ */}
        <div className="flex-1 min-h-0">
          <PanelGroup direction="horizontal" className="h-full">
            {/* LEFT PANEL — Section Navigation */}
            <Panel defaultSize={18} minSize={14} maxSize={28} className="border-r bg-card/50">
              <SectionNav
                sections={sections}
                activeSection={activeSectionIdx}
                activeQuestion={activeQuestionId}
                onSectionSelect={(i) => {
                  setActiveSection(i);
                  setActiveQuestionId(sections[i]?.questions[0]?.id || null);
                }}
                onQuestionSelect={(si, qId) => {
                  setActiveSection(si);
                  setActiveQuestionId(qId);
                }}
                onAddSection={addSection}
                onDeleteSection={deleteSection}
                onReorderSections={(newSections) => setSections(newSections)}
                onReorderQuestions={(si, qs) => updateSection(si, { questions: qs })}
                onAddQuestion={addQuestion}
                onDeleteQuestion={deleteQuestion}
              />
            </Panel>

            <PanelResizeHandle className="w-1 hover:w-1.5 bg-border hover:bg-violet-400/50 transition-all cursor-col-resize" />

            {/* CENTER PANEL — Question Canvas */}
            <Panel defaultSize={57} minSize={40} className="flex flex-col bg-background">
              <div className="flex-1 overflow-y-auto">
                {/* Section header */}
                {sections[activeSectionIdx] && (
                  <div className="px-5 pt-4 pb-3">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">
                        {sections[activeSectionIdx].icon || "📋"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <Input
                          className="h-8 text-sm font-semibold border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          placeholder="Section sarlavhasi..."
                          value={sections[activeSectionIdx].title}
                          onChange={(e) => updateSection(activeSectionIdx, { title: e.target.value })}
                        />
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {sections[activeSectionIdx].questions.length} savol
                      </Badge>
                    </div>

                    {/* Section passage preview */}
                    {(sections[activeSectionIdx].passage || sections[activeSectionIdx].richPassage) && (
                      <div className="px-4 py-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-xs text-slate-700 dark:text-slate-300 max-h-24 overflow-y-auto leading-relaxed mb-2">
                        <div className="flex items-center gap-1.5 mb-1 text-blue-600 dark:text-blue-400 font-semibold">
                          <BookOpen className="h-3 w-3" /> Passage
                        </div>
                        {sections[activeSectionIdx].richPassage
                          ? <div dangerouslySetInnerHTML={{ __html: sections[activeSectionIdx].richPassage! }} className="prose prose-xs dark:prose-invert max-w-none" />
                          : <p className="line-clamp-3">{sections[activeSectionIdx].passage}</p>
                        }
                      </div>
                    )}
                  </div>
                )}

                {/* Questions */}
                <div className="px-5 space-y-3 pb-24">
                  <AnimatePresence>
                    {sections[activeSectionIdx]?.questions.map((q, qi) => (
                      <motion.div
                        key={q.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                          "transition-all",
                          activeQuestionId === q.id
                            ? "ring-2 ring-violet-500/30 rounded-2xl"
                            : ""
                        )}
                        onClick={() => setActiveQuestionId(q.id)}
                      >
                        <QuestionCanvas
                          question={q}
                          questionIndex={qi}
                          onChange={(patch) => updateQuestion(activeSectionIdx, q.id, patch)}
                          onDelete={() => deleteQuestion(activeSectionIdx, q.id)}
                          onTypeChange={() => openTypeSelector(activeSectionIdx, q.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Add question button */}
                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-2 border-dashed h-14 gap-2 hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/10 hover:text-violet-600 transition-all group"
                      onClick={() => addQuestion(activeSectionIdx)}
                    >
                      <div className="h-7 w-7 rounded-xl bg-muted group-hover:bg-violet-100 dark:group-hover:bg-violet-900/40 flex items-center justify-center transition-colors">
                        <Plus className="h-4 w-4 group-hover:text-violet-600" />
                      </div>
                      <span className="text-sm font-medium">Yangi savol qo'shish</span>
                      <span className="text-xs text-muted-foreground ml-1">· Type selectorni ochadi</span>
                    </Button>
                  </motion.div>
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="w-1 hover:w-1.5 bg-border hover:bg-violet-400/50 transition-all cursor-col-resize" />

            {/* RIGHT PANEL — Section Config */}
            <Panel defaultSize={25} minSize={20} maxSize={36} className="border-l bg-card/50">
              <SectionConfigPanel
                section={sections[activeSectionIdx] || sections[0]}
                sectionIndex={activeSectionIdx}
                onChange={(patch) => updateSection(activeSectionIdx, patch)}
                onAIParseText={handleAIParseText}
                onAIParsePdf={handleAIParsePdf}
                aiTextBusy={aiTextBusy}
                aiPdfBusy={aiPdfBusy}
              />
            </Panel>
          </PanelGroup>
        </div>

        {/* ============ MODALS ============ */}
        <QuestionTypeSelector
          open={typeSelector.open}
          onClose={() => setTypeSelector({ open: false, sectionIdx: 0, questionId: null })}
          onSelect={handleTypeSelect}
          currentType={
            typeSelector.questionId
              ? sections[typeSelector.sectionIdx]?.questions.find((q) => q.id === typeSelector.questionId)?.qtype
              : undefined
          }
        />

        <ValidationPanel
          meta={meta}
          sections={sections}
          open={showValidation}
          onClose={() => setShowValidation(false)}
          onPublish={handlePublish}
          publishing={publishing}
        />

        <StudentPreviewModal
          meta={meta}
          sections={sections}
          open={showPreview}
          onClose={() => setShowPreview(false)}
        />
      </div>
    </TooltipProvider>
  );
};

export default ExamBuilder;
