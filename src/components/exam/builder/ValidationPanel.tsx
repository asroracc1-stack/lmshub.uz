import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, CheckCircle2, X, ChevronDown, ChevronUp,
  Eye, EyeOff, BarChart3, Layers, FileText, Clock, Star,
  Zap, Image as ImageIcon, Volume2, Video, Lightbulb,
  ShieldCheck, RefreshCw, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Section, ExamMeta, PublishStatus } from "./types";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// ============================================================
// ValidationPanel — Full validation report before publishing
// ============================================================

interface ValidationIssue {
  type: "error" | "warning" | "info";
  section?: string;
  question?: string;
  message: string;
}

interface ExamAnalytics {
  totalQuestions: number;
  totalPoints: number;
  sectionCount: number;
  difficultyDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  mediaUsage: { images: number; audio: number; video: number };
  estimatedDurationMinutes: number;
  sectionsWithPassage: number;
  sectionsWithAudio: number;
  publishReadyScore: number;
}

function analyzeExam(meta: ExamMeta, sections: Section[]): ExamAnalytics {
  let totalQ = 0, totalPts = 0, images = 0, audio = 0, video = 0;
  const diff: Record<string, number> = { easy: 0, medium: 0, hard: 0, expert: 0 };
  const types: Record<string, number> = {};
  let passageSections = 0, audioSections = 0;

  for (const s of sections) {
    if (s.passage || s.richPassage) passageSections++;
    if (s.audioUrl) audioSections++;
    for (const q of s.questions) {
      totalQ++;
      totalPts += q.points || 1;
      diff[q.difficulty] = (diff[q.difficulty] || 0) + 1;
      types[q.qtype] = (types[q.qtype] || 0) + 1;
      if (q.media?.length) images += q.media.length;
      if (q.audioUrl) audio++;
      if (q.videoUrl) video++;
    }
  }

  const estimatedDuration = Math.round(totalQ * 1.5);
  const readyScore = Math.min(100, Math.round(
    (totalQ > 0 ? 30 : 0) +
    (meta.title.length > 3 ? 20 : 0) +
    (sections.length > 0 ? 20 : 0) +
    (passageSections > 0 ? 15 : 0) +
    (meta.durationMinutes > 0 ? 15 : 0)
  ));

  return {
    totalQuestions: totalQ,
    totalPoints: totalPts,
    sectionCount: sections.length,
    difficultyDistribution: diff,
    typeDistribution: types,
    mediaUsage: { images, audio, video },
    estimatedDurationMinutes: estimatedDuration,
    sectionsWithPassage: passageSections,
    sectionsWithAudio: audioSections,
    publishReadyScore: readyScore,
  };
}

function validateExam(meta: ExamMeta, sections: Section[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!meta.title.trim()) {
    issues.push({ type: "error", message: "Exam sarlavhasi kiritilmagan" });
  }
  if (meta.durationMinutes <= 0) {
    issues.push({ type: "error", message: "Exam davomiyligi belgilanmagan" });
  }
  if (sections.length === 0) {
    issues.push({ type: "error", message: "Kamida 1 ta section kerak" });
    return issues;
  }

  for (let si = 0; si < sections.length; si++) {
    const s = sections[si];
    const sLabel = `Section ${si + 1}: "${s.title || "Nomsiz"}"`;

    if (!s.title.trim()) {
      issues.push({ type: "warning", section: sLabel, message: "Section sarlavhasi bo'sh" });
    }
    if (s.questions.length === 0) {
      issues.push({ type: "error", section: sLabel, message: "Bu section da savol yo'q" });
      continue;
    }

    for (let qi = 0; qi < s.questions.length; qi++) {
      const q = s.questions[qi];
      const qLabel = `Savol ${qi + 1}`;

      if (!q.prompt.trim() && !q.richText?.trim()) {
        issues.push({ type: "error", section: sLabel, question: qLabel, message: "Savol matni bo'sh" });
      }
      if (q.points <= 0) {
        issues.push({ type: "warning", section: sLabel, question: qLabel, message: "Ball 0 yoki salbiy" });
      }

      const needsOptions = !["essay", "short_answer", "speaking_recording", "code", "fill_blank", "sentence_completion", "summary_completion", "numeric", "formula"].includes(q.qtype);
      if (needsOptions) {
        if (!q.options || q.options.length < 2) {
          issues.push({ type: "error", section: sLabel, question: qLabel, message: "Kamida 2 variant kerak" });
        } else if (!q.options.some((o) => o.isCorrect)) {
          issues.push({ type: "error", section: sLabel, question: qLabel, message: "To'g'ri javob belgilanmagan" });
        }
        const texts = q.options.map((o) => o.text.trim().toLowerCase()).filter(Boolean);
        const hasDuplicate = texts.length !== new Set(texts).size;
        if (hasDuplicate) {
          issues.push({ type: "warning", section: sLabel, question: qLabel, message: "Takroriy variant matni bor" });
        }
      }
      if (q.qtype === "matching" && (!q.matchingPairs || q.matchingPairs.length < 2)) {
        issues.push({ type: "error", section: sLabel, question: qLabel, message: "Matching uchun kamida 2 juft kerak" });
      }
    }
  }

  // Info
  const analytics = analyzeExam(meta, sections);
  if (analytics.estimatedDurationMinutes > meta.durationMinutes * 1.5) {
    issues.push({ type: "warning", message: `Savollar soni va davomiylik mos kelmaydi (taxminan ${analytics.estimatedDurationMinutes} daq kerak)` });
  }

  return issues;
}

// ============================================================
// Validation Panel Component
// ============================================================

interface ValidationPanelProps {
  meta: ExamMeta;
  sections: Section[];
  open: boolean;
  onClose: () => void;
  onPublish: () => void;
  publishing?: boolean;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  meta, sections, open, onClose, onPublish, publishing = false
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const issues = useMemo(() => validateExam(meta, sections), [meta, sections]);
  const analytics = useMemo(() => analyzeExam(meta, sections), [meta, sections]);

  const errors = issues.filter((i) => i.type === "error");
  const warnings = issues.filter((i) => i.type === "warning");
  const canPublish = errors.length === 0;

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const scoreColor = analytics.publishReadyScore >= 80 ? "text-emerald-600" :
    analytics.publishReadyScore >= 50 ? "text-amber-600" : "text-rose-600";

  const difficultyColors: Record<string, string> = {
    easy: "bg-emerald-500", medium: "bg-amber-500", hard: "bg-rose-500", expert: "bg-purple-500"
  };
  const totalQForDiff = Object.values(analytics.difficultyDistribution).reduce((a, b) => a + b, 0) || 1;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Exam Validation</DialogTitle>

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b bg-gradient-to-r from-violet-500/5 to-purple-500/5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold">Exam Tahlili & Validatsiya</h2>
              <p className="text-xs text-muted-foreground">{meta.title || "Nomsiz exam"}</p>
            </div>
            <div className={cn("text-3xl font-black", scoreColor)}>
              {analytics.publishReadyScore}%
            </div>
          </div>
          <Progress value={analytics.publishReadyScore} className="h-2"
            style={{ "--progress-color": analytics.publishReadyScore >= 80 ? "#10b981" : analytics.publishReadyScore >= 50 ? "#f59e0b" : "#ef4444" } as any}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: <FileText className="h-4 w-4 text-violet-500" />, label: "Savollar", value: analytics.totalQuestions },
              { icon: <Layers className="h-4 w-4 text-blue-500" />, label: "Sections", value: analytics.sectionCount },
              { icon: <Star className="h-4 w-4 text-amber-500" />, label: "Jami ball", value: analytics.totalPoints },
              { icon: <Clock className="h-4 w-4 text-emerald-500" />, label: "Davomiylik", value: `${meta.durationMinutes} daq` },
              { icon: <Clock className="h-4 w-4 text-teal-500" />, label: "Taxminiy", value: `${analytics.estimatedDurationMinutes} daq` },
              { icon: <ImageIcon className="h-4 w-4 text-rose-500" />, label: "Rasmlar", value: analytics.mediaUsage.images },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-2 p-2.5 rounded-xl border bg-card">
                {stat.icon}
                <div>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                  <p className="text-sm font-bold">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Difficulty distribution */}
          <div className="p-3 rounded-xl border bg-card">
            <p className="text-xs font-semibold mb-2">Qiyinlik taqsimoti</p>
            <div className="space-y-1.5">
              {Object.entries(analytics.difficultyDistribution).map(([d, count]) => (
                count > 0 && (
                  <div key={d} className="flex items-center gap-2">
                    <span className="text-[10px] w-12 capitalize text-muted-foreground">{d}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", difficultyColors[d])}
                        style={{ width: `${(count / totalQForDiff) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold w-6 text-right">{count}</span>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Question types */}
          {Object.keys(analytics.typeDistribution).length > 0 && (
            <div className="p-3 rounded-xl border bg-card">
              <p className="text-xs font-semibold mb-2">Savol turlari</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(analytics.typeDistribution).map(([type, count]) => (
                  <Badge key={type} variant="outline" className="text-[10px] gap-1">
                    {type.replace(/_/g, " ")} <span className="font-bold">{count}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Issues */}
          {issues.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                {errors.length > 0
                  ? <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                  : <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />
                }
                {errors.length} xato · {warnings.length} ogohlantirish
              </p>
              {issues.map((issue, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-2 p-2.5 rounded-xl border text-xs",
                    issue.type === "error"
                      ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-800 dark:text-rose-400"
                      : issue.type === "warning"
                      ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400"
                      : "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400"
                  )}
                >
                  {issue.type === "error"
                    ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    : <Zap className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  }
                  <div>
                    {issue.section && <span className="font-semibold">{issue.section} → </span>}
                    {issue.question && <span className="font-semibold">{issue.question}: </span>}
                    {issue.message}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All good */}
          {errors.length === 0 && warnings.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="font-bold text-emerald-600">Exam nashr qilishga tayyor!</p>
              <p className="text-xs text-muted-foreground">Barcha tekshiruvlar muvaffaqiyatli o'tdi</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex items-center justify-between gap-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Yopish
          </Button>
          {errors.length > 0 && (
            <p className="text-xs text-rose-500 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> {errors.length} xato hal qilinmagan
            </p>
          )}
          <Button
            type="button"
            size="sm"
            className={cn("gap-1.5",
              canPublish
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md"
                : "opacity-50 cursor-not-allowed"
            )}
            disabled={!canPublish || publishing}
            onClick={onPublish}
          >
            {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {publishing ? "Nashr qilinmoqda..." : "Nashr qilish"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { validateExam, analyzeExam };
export type { ValidationIssue, ExamAnalytics };
