import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Filter, Trash2, Edit, Eye, Upload, X, ChevronDown,
  BookOpen, ImageIcon, FileText, Loader2, CheckCircle2, XCircle,
  Download, Database, Layers, Tag, BarChart3, Clock, Star,
  AlertCircle, Copy, RefreshCw, BookMarked, GraduationCap, Target, Landmark,
  Sparkles, Wand2, BrainCircuit, ChevronRight, ArrowLeft, Save, ListChecks,
  Grid3X3, List, SortAsc, SortDesc, Check
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatMathText } from "@/lib/math";

// ─── Types ───────────────────────────────────────────────────────────────────
export type ExamType = "SAT" | "NATIONAL_CERT" | "IELTS" | "GENERAL";
export type QuestionType =
  | "MCQ" | "MULTI_SELECT" | "TRUE_FALSE" | "YES_NO_NG" | "MATCHING"
  | "FILL_BLANK" | "SHORT_ANSWER" | "ESSAY" | "READING" | "LISTENING" | "IMAGE_BASED";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type ContentBlockType = "PARAGRAPH" | "IMAGE" | "TABLE" | "FORMULA" | "LIST" | "QUOTE";

export interface ContentBlock {
  type: ContentBlockType;
  value: string;
  caption?: string;
}

export interface QuestionOption {
  id?: string;
  label: string;
  textContent: string;
  imageUrl?: string;
  isCorrect: boolean;
}

export interface QuestionImage {
  id?: string;
  imageUrl: string;
  sortOrder: number;
  caption?: string;
}

export interface Question {
  id?: string;
  examType: ExamType;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  questionType: QuestionType;
  contentBlocks: ContentBlock[];
  rawText: string;
  options: QuestionOption[];
  correctAnswer: string;
  explanation: string;
  explanationImage?: string;
  images: QuestionImage[];
  tags: string[];
  passageText?: string;
  audioUrl?: string;
  createdAt?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const EXAM_TYPES: { value: ExamType; label: string; icon: string; color: string }[] = [
  { value: "SAT", label: "SAT", icon: "🎯", color: "blue" },
  { value: "NATIONAL_CERT", label: "Milliy Sertifikat", icon: "🏛️", color: "green" },
  { value: "IELTS", label: "IELTS", icon: "📚", color: "purple" },
  { value: "GENERAL", label: "Umumiy", icon: "📝", color: "gray" },
];

const QUESTION_TYPES: { value: QuestionType; label: string; desc: string }[] = [
  { value: "MCQ", label: "Bir javobli test", desc: "A/B/C/D variantlar" },
  { value: "MULTI_SELECT", label: "Ko'p javobli test", desc: "Bir nechta to'g'ri javob" },
  { value: "TRUE_FALSE", label: "True / False", desc: "Ha yoki yo'q" },
  { value: "YES_NO_NG", label: "Yes / No / Not Given", desc: "IELTS uslubi" },
  { value: "MATCHING", label: "Matching", desc: "Juftlashtirish" },
  { value: "FILL_BLANK", label: "Bo'sh joyni to'ldirish", desc: "Gap to'ldirish" },
  { value: "SHORT_ANSWER", label: "Qisqa javob", desc: "1-3 so'zlik javob" },
  { value: "ESSAY", label: "Essay / Writing", desc: "Yozma ish" },
  { value: "READING", label: "Reading passage", desc: "Matn asosidagi" },
  { value: "LISTENING", label: "Listening", desc: "Audio asosidagi" },
  { value: "IMAGE_BASED", label: "Rasm asosidagi", desc: "Rasm/grafik asosidagi" },
];

const DIFFICULTIES: { value: Difficulty; label: string; color: string }[] = [
  { value: "EASY", label: "Oson", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 border-emerald-200" },
  { value: "MEDIUM", label: "O'rta", color: "text-amber-600 bg-amber-50 dark:bg-amber-950 border-amber-200" },
  { value: "HARD", label: "Qiyin", color: "text-rose-600 bg-rose-50 dark:bg-rose-950 border-rose-200" },
];

const SAT_SUBJECTS = ["Math", "Reading & Writing", "Evidence-Based Reading"];
const NATIONAL_CERT_SUBJECTS = ["Matematika", "Ona tili", "Ingliz tili", "Fizika", "Kimyo", "Biologiya", "Tarix", "Geografiya"];
const IELTS_SUBJECTS = ["Reading", "Listening", "Writing", "Speaking"];
const GENERAL_SUBJECTS = ["Matematika", "Ingliz tili", "Fizika", "Kimyo", "Biologiya"];

function getSubjectsForExam(examType: ExamType): string[] {
  switch (examType) {
    case "SAT": return SAT_SUBJECTS;
    case "NATIONAL_CERT": return NATIONAL_CERT_SUBJECTS;
    case "IELTS": return IELTS_SUBJECTS;
    default: return GENERAL_SUBJECTS;
  }
}

function newQuestion(): Question {
  return {
    examType: "SAT",
    subject: "Math",
    topic: "",
    difficulty: "MEDIUM",
    questionType: "MCQ",
    contentBlocks: [{ type: "PARAGRAPH", value: "" }],
    rawText: "",
    options: [
      { label: "A", textContent: "", isCorrect: false },
      { label: "B", textContent: "", isCorrect: false },
      { label: "C", textContent: "", isCorrect: false },
      { label: "D", textContent: "", isCorrect: false },
    ],
    correctAnswer: "",
    explanation: "",
    images: [],
    tags: [],
  };
}

// ─── API helpers ─────────────────────────────────────────────────────────────
function mapApiToQuestion(item: any): Question {
  let contentBlocks: ContentBlock[] = [{ type: "PARAGRAPH", value: item.text || "" }];
  if (item.richContent) {
    try { contentBlocks = JSON.parse(item.richContent); } catch { /* keep default */ }
  }
  return {
    id: item.id,
    examType: (item.examCategory || "GENERAL") as ExamType,
    subject: item.subject || "",
    topic: item.topic || "",
    difficulty: (item.difficulty?.toUpperCase() || "MEDIUM") as Difficulty,
    questionType: (item.questionType?.toUpperCase() || "MCQ") as QuestionType,
    contentBlocks,
    rawText: item.text || "",
    options: (item.options || []).map((o: any) => ({
      id: o.id,
      label: o.positionOrder !== null ? ["A","B","C","D","E","F"][o.positionOrder] || String(o.positionOrder + 1) : "A",
      textContent: o.text || "",
      imageUrl: o.imageUrl || "",
      isCorrect: !!o.isCorrect,
    })),
    correctAnswer: item.correctAnswer || "",
    explanation: item.explanation || "",
    images: [],
    tags: item.tags ? item.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
    passageText: item.passageText || "",
    audioUrl: item.audioUrl || "",
    createdAt: item.createdAt ? item.createdAt.split("T")[0] : "",
  };
}

function mapQuestionToApi(q: Question) {
  return {
    subject: q.subject,
    topic: q.topic,
    examCategory: q.examType,
    questionType: q.questionType.toLowerCase(),
    difficulty: q.difficulty.toLowerCase(),
    text: q.rawText || q.contentBlocks.find(b => b.type === "PARAGRAPH")?.value || "",
    richContent: JSON.stringify(q.contentBlocks),
    passageText: q.passageText || "",
    audioUrl: q.audioUrl || "",
    correctAnswer: q.correctAnswer || "",
    explanation: q.explanation || "",
    points: 1,
    tags: q.tags.join(","),
    options: q.options.map((o, i) => ({
      text: o.textContent,
      isCorrect: o.isCorrect,
      positionOrder: i,
      imageUrl: o.imageUrl || "",
    })),
  };
}


// ─── Helper: Difficulty badge ─────────────────────────────────────────────────
function DifficultyBadge({ d }: { d: Difficulty }) {
  const cfg = DIFFICULTIES.find(x => x.value === d)!;
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold border", cfg.color)}>
      {cfg.label}
    </span>
  );
}

// ─── Helper: Exam type badge ──────────────────────────────────────────────────
function ExamBadge({ type }: { type: ExamType }) {
  const cfg = EXAM_TYPES.find(x => x.value === type)!;
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
    green: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300",
    purple: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300",
    gray: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold border", colors[cfg.color])}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Content Block Editor ─────────────────────────────────────────────────────
function ContentBlockEditor({
  blocks, onChange, uploadImage
}: {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  uploadImage: (file: File) => Promise<string | null>;
}) {
  const addBlock = (type: ContentBlockType) => {
    onChange([...blocks, { type, value: "" }]);
  };
  const updateBlock = (i: number, patch: Partial<ContentBlock>) => {
    onChange(blocks.map((b, idx) => idx === i ? { ...b, ...patch } : b));
  };
  const removeBlock = (i: number) => {
    onChange(blocks.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <div key={i} className="relative group flex gap-2">
          <div className="flex-1">
            {block.type === "PARAGRAPH" && (
              <div className="space-y-1.5">
                <Textarea
                  rows={3}
                  placeholder="Savol matni (LaTeX uchun $...$ yoki $$...$$)"
                  value={block.value}
                  onChange={e => updateBlock(i, { value: e.target.value })}
                  className="resize-none font-mono text-sm"
                />
                {block.value && (
                  <div className="p-2 border rounded bg-slate-50 dark:bg-slate-900/60 text-sm">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Savol matni preview:</span>
                    <div className="leading-relaxed">{formatMathText(block.value)}</div>
                  </div>
                )}
              </div>
            )}
            {block.type === "FORMULA" && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">∑ Formula</span>
                </div>
                <Input
                  placeholder="LaTeX formula: e.g. x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}"
                  value={block.value}
                  onChange={e => updateBlock(i, { value: e.target.value })}
                  className="font-mono text-sm"
                />
                {block.value && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border text-sm">
                    <span className="text-xs text-muted-foreground block mb-1">Formula Preview:</span>
                    <div className="overflow-x-auto">{formatMathText(`$$${block.value}$$`)}</div>
                  </div>
                )}
              </div>
            )}
            {block.type === "IMAGE" && (
              <div className="space-y-2">
                <label className="cursor-pointer">
                  <input type="file" accept="image/png,image/jpg,image/jpeg,image/svg+xml,image/webp" hidden
                    onChange={async e => {
                      if (e.target.files?.[0]) {
                        const url = await uploadImage(e.target.files[0]);
                        if (url) updateBlock(i, { value: url });
                      }
                    }}
                  />
                  {block.value ? (
                    <img src={block.value} alt="block" className="max-h-48 rounded border object-contain" />
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/30 transition-colors">
                      <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Rasm yuklash uchun bosing</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, SVG, WEBP</p>
                    </div>
                  )}
                </label>
                <Input
                  placeholder="Rasm izohi (caption)"
                  value={block.caption || ""}
                  onChange={e => updateBlock(i, { caption: e.target.value })}
                  className="text-xs"
                />
              </div>
            )}
            {block.type === "TABLE" && (
              <Textarea
                rows={5}
                placeholder="Jadval (Markdown formatida):\n| A | B | C |\n|---|---|---|\n| 1 | 2 | 3 |"
                value={block.value}
                onChange={e => updateBlock(i, { value: e.target.value })}
                className="font-mono text-xs resize-none"
              />
            )}
            {block.type === "LIST" && (
              <Textarea
                rows={4}
                placeholder="Ro'yxat (har satr alohida element):\n- Birinchi element\n- Ikkinchi element"
                value={block.value}
                onChange={e => updateBlock(i, { value: e.target.value })}
                className="font-mono text-sm resize-none"
              />
            )}
            {block.type === "QUOTE" && (
              <Textarea
                rows={3}
                placeholder="Iqtibos / Reading passage matni..."
                value={block.value}
                onChange={e => updateBlock(i, { value: e.target.value })}
                className="border-l-4 border-primary pl-3 text-sm italic resize-none"
              />
            )}
          </div>
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 shrink-0 text-rose-500 opacity-0 group-hover:opacity-100 mt-1"
            onClick={() => removeBlock(i)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}

      {/* Add block buttons */}
      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-dashed">
        <span className="text-xs text-muted-foreground self-center mr-1">Blok qo'shish:</span>
        {([
          { type: "PARAGRAPH" as ContentBlockType, label: "Matn", icon: "📝" },
          { type: "FORMULA" as ContentBlockType, label: "Formula", icon: "∑" },
          { type: "IMAGE" as ContentBlockType, label: "Rasm", icon: "🖼️" },
          { type: "TABLE" as ContentBlockType, label: "Jadval", icon: "⊞" },
          { type: "LIST" as ContentBlockType, label: "Ro'yxat", icon: "•" },
          { type: "QUOTE" as ContentBlockType, label: "Iqtibos", icon: "❝" },
        ] as const).map(b => (
          <Button
            key={b.type}
            variant="outline" size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => addBlock(b.type)}
          >
            <span>{b.icon}</span> {b.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ─── Option Editor ────────────────────────────────────────────────────────────
function OptionEditor({
  options, questionType, onChange, uploadImage
}: {
  options: QuestionOption[];
  questionType: QuestionType;
  onChange: (opts: QuestionOption[]) => void;
  uploadImage: (f: File) => Promise<string | null>;
}) {
  const isMulti = questionType === "MULTI_SELECT";
  const isTF = questionType === "TRUE_FALSE";
  const isYN = questionType === "YES_NO_NG";

  // For TF / YN types, use fixed options
  if (isTF) {
    const vals = ["True", "False"];
    return (
      <div className="flex gap-3">
        {vals.map(v => {
          const opt = options.find(o => o.label === v) || { label: v, textContent: v, isCorrect: false };
          return (
            <Button
              key={v}
              variant={opt.isCorrect ? "default" : "outline"}
              className={cn("flex-1 h-10", opt.isCorrect && "bg-emerald-600 hover:bg-emerald-700")}
              onClick={() => onChange([
                { label: "True", textContent: "True", isCorrect: v === "True" },
                { label: "False", textContent: "False", isCorrect: v === "False" },
              ])}
            >
              {opt.isCorrect ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2 text-muted-foreground" />}
              {v}
            </Button>
          );
        })}
      </div>
    );
  }
  if (isYN) {
    const vals = ["Yes", "No", "Not Given"];
    return (
      <div className="flex gap-2 flex-wrap">
        {vals.map(v => {
          const opt = options.find(o => o.label === v) || { label: v, textContent: v, isCorrect: false };
          return (
            <Button
              key={v}
              variant={opt.isCorrect ? "default" : "outline"}
              className={cn("flex-1 h-10 min-w-[80px]", opt.isCorrect && "bg-emerald-600 hover:bg-emerald-700")}
              onClick={() => onChange(vals.map(lbl => ({ label: lbl, textContent: lbl, isCorrect: lbl === v })))}
            >
              {v}
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {options.map((opt, oi) => (
        <div key={oi} className="flex items-start gap-2">
          {/* Correct toggle */}
          <button
            type="button"
            className={cn(
              "h-8 w-8 shrink-0 rounded-full border-2 flex items-center justify-center transition-all font-bold text-sm mt-1",
              opt.isCorrect
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "border-slate-300 dark:border-slate-600 text-slate-400 hover:border-emerald-400"
            )}
            onClick={() => {
              const next = options.map((o, i) => ({
                ...o,
                isCorrect: isMulti ? (i === oi ? !o.isCorrect : o.isCorrect) : i === oi,
              }));
              onChange(next);
            }}
          >
            {opt.isCorrect ? <Check className="h-4 w-4" /> : opt.label}
          </button>

          <div className="flex-1 space-y-1.5">
            <Input
              placeholder={`${opt.label} varianti matni...`}
              value={opt.textContent}
              className="h-9 text-sm"
              onChange={e => onChange(options.map((o, i) => i === oi ? { ...o, textContent: e.target.value } : o))}
            />
            {opt.textContent && (
              <div className="text-xs text-muted-foreground pl-1 mt-1">
                Variant preview: {formatMathText(opt.textContent)}
              </div>
            )}
            {/* Option image */}
            {opt.imageUrl ? (
              <div className="flex items-center gap-2">
                <img src={opt.imageUrl} alt="opt" className="h-12 w-auto rounded border object-contain" />
                <Button
                  variant="ghost" size="sm" className="h-7 text-rose-500 text-xs"
                  onClick={() => onChange(options.map((o, i) => i === oi ? { ...o, imageUrl: "" } : o))}
                >
                  <X className="h-3 w-3 mr-1" /> O'chirish
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer inline-flex">
                <input
                  type="file" accept="image/*" hidden
                  onChange={async e => {
                    if (e.target.files?.[0]) {
                      const url = await uploadImage(e.target.files[0]);
                      if (url) onChange(options.map((o, i) => i === oi ? { ...o, imageUrl: url } : o));
                    }
                  }}
                />
                <span className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 px-2 py-1 rounded border border-dashed hover:border-primary">
                  <ImageIcon className="h-3 w-3" /> Rasm qo'shish
                </span>
              </label>
            )}
          </div>

          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 shrink-0 text-rose-400 hover:text-rose-600 mt-1"
            onClick={() => onChange(options.filter((_, i) => i !== oi))}
            disabled={options.length <= 2}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline" size="sm"
        className="w-full border-dashed h-8 text-xs"
        onClick={() => {
          const labels = ["A", "B", "C", "D", "E", "F"];
          const label = labels[options.length] || `${options.length + 1}`;
          onChange([...options, { label, textContent: "", isCorrect: false }]);
        }}
      >
        <Plus className="h-3.5 w-3.5 mr-1" /> Variant qo'shish
      </Button>
    </div>
  );
}

// ─── Question Form Modal ──────────────────────────────────────────────────────
function QuestionFormModal({
  open, onClose, initial, onSave
}: {
  open: boolean;
  onClose: () => void;
  initial?: Question;
  onSave: (q: Question) => Promise<void>;
}) {
  const [q, setQ] = useState<Question>(initial || newQuestion());
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/files/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      return res.data;
    } catch {
      toast.error("Rasm yuklab bo'lmadi");
      return null;
    }
  };

  const patch = (p: Partial<Question>) => setQ(prev => ({ ...prev, ...p }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !q.tags.includes(t)) patch({ tags: [...q.tags, t] });
    setTagInput("");
  };

  const handleSave = async () => {
    if (!q.rawText.trim() && q.contentBlocks.every(b => !b.value.trim())) {
      toast.error("Savol matni kiritilmagan");
      return;
    }
    setSaving(true);
    try {
      // Build rawText from first paragraph block if empty
      if (!q.rawText.trim()) {
        const firstPara = q.contentBlocks.find(b => b.type === "PARAGRAPH");
        if (firstPara) patch({ rawText: firstPara.value });
      }
      await onSave(q);
      onClose();
    } catch (e: any) {
      toast.error("Saqlashda xatolik: " + (e?.response?.data?.message || e?.message || "Noma'lum xato"));
    } finally {
      setSaving(false);
    }
  };

  const subjects = getSubjectsForExam(q.examType);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookMarked className="h-5 w-5 text-primary" />
            {initial?.id ? "Savolni tahrirlash" : "Yangi savol yaratish"}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-6">
          {/* Meta fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-xl border">
            {/* Exam type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Imtihon turi</Label>
              <Select value={q.examType} onValueChange={v => patch({ examType: v as ExamType, subject: getSubjectsForExam(v as ExamType)[0] })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_TYPES.map(et => (
                    <SelectItem key={et.value} value={et.value}>
                      {et.icon} {et.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fan</Label>
              <Select value={q.subject} onValueChange={v => patch({ subject: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Difficulty */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qiyinlik</Label>
              <Select value={q.difficulty} onValueChange={v => patch({ difficulty: v as Difficulty })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Question type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Savol turi</Label>
              <Select value={q.questionType} onValueChange={v => patch({ questionType: v as QuestionType })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map(qt => (
                    <SelectItem key={qt.value} value={qt.value}>{qt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Topic */}
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Mavzu (Topic)</Label>
            <Input
              placeholder="Masalan: Quadratic Equations, Geometriya, Present Perfect..."
              value={q.topic}
              onChange={e => patch({ topic: e.target.value })}
            />
          </div>

          {/* Tabs: Content / Options / Explanation / Extras */}
          <Tabs defaultValue="content" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 h-10">
              <TabsTrigger value="content" className="text-xs gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Savol matni
              </TabsTrigger>
              <TabsTrigger value="options" className="text-xs gap-1.5">
                <ListChecks className="h-3.5 w-3.5" /> Variantlar
              </TabsTrigger>
              <TabsTrigger value="explanation" className="text-xs gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> Izoh
              </TabsTrigger>
              <TabsTrigger value="extras" className="text-xs gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Qo'shimcha
              </TabsTrigger>
            </TabsList>

            {/* Content tab */}
            <TabsContent value="content" className="space-y-4 mt-0">
              {/* Passage (for Reading/Listening) */}
              {(q.questionType === "READING" || q.questionType === "LISTENING") && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    {q.questionType === "READING" ? "Reading Passage" : "Audio transcript / Task description"}
                  </Label>
                  <Textarea
                    rows={8}
                    placeholder="Asosiy matn (passage) bu yerga..."
                    value={q.passageText || ""}
                    onChange={e => patch({ passageText: e.target.value })}
                    className="font-serif text-sm leading-relaxed"
                  />
                </div>
              )}

              {/* Rich content blocks */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Savol kontent bloklari</Label>
                <p className="text-xs text-muted-foreground">
                  Matn, formula, rasm, jadval, ro'yxat kabi bloklarni birlashtiring
                </p>
                <ContentBlockEditor
                  blocks={q.contentBlocks}
                  onChange={blocks => patch({ contentBlocks: blocks })}
                  uploadImage={uploadImage}
                />
              </div>

              {/* Question images */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-violet-500" />
                  Savol rasmlari (bir nechta)
                </Label>
                <div className="flex flex-wrap gap-3">
                  {q.images.map((img, ii) => (
                    <div key={ii} className="relative group">
                      <img src={img.imageUrl} alt="q-img" className="h-24 w-auto rounded-lg border object-contain bg-slate-50" />
                      <button
                        className="absolute top-1 right-1 p-0.5 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => patch({ images: q.images.filter((_, i) => i !== ii) })}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="cursor-pointer">
                    <input type="file" accept="image/png,image/jpg,image/jpeg,image/svg+xml,image/webp" multiple hidden
                      onChange={async e => {
                        const files = Array.from(e.target.files || []);
                        for (const file of files) {
                          const url = await uploadImage(file);
                          if (url) {
                            patch({
                              images: [
                                ...q.images,
                                { imageUrl: url, sortOrder: q.images.length }
                              ]
                            });
                          }
                        }
                      }}
                    />
                    <div className="h-24 w-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:text-primary hover:border-primary transition-colors cursor-pointer">
                      <Plus className="h-6 w-6" />
                      <span className="text-xs mt-1">Rasm</span>
                    </div>
                  </label>
                </div>
              </div>
            </TabsContent>

            {/* Options tab */}
            <TabsContent value="options" className="mt-0 space-y-4">
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Yashil tugmani bosish orqali to'g'ri javob(lar)ni belgilang. Variantlarga rasm ham qo'shish mumkin.
                </p>
              </div>
              <OptionEditor
                options={q.options}
                questionType={q.questionType}
                onChange={opts => patch({ options: opts })}
                uploadImage={uploadImage}
              />

              {/* Correct answer text (for fill/short) */}
              {(q.questionType === "FILL_BLANK" || q.questionType === "SHORT_ANSWER") && (
                <div className="space-y-1.5 pt-2 border-t">
                  <Label className="text-sm font-semibold text-emerald-700">To'g'ri javob</Label>
                  <Input
                    placeholder="To'g'ri javob matni..."
                    value={q.correctAnswer}
                    onChange={e => patch({ correctAnswer: e.target.value })}
                    className="border-emerald-300 focus:border-emerald-500"
                  />
                </div>
              )}
            </TabsContent>

            {/* Explanation tab */}
            <TabsContent value="explanation" className="mt-0 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Izoh (Explanation)</Label>
                <p className="text-xs text-muted-foreground">
                  Student natijani ko'rganda bu izohni ko'radi. LaTeX formulalari uchun $...$ yoki $$...$$ dan foydalaning.
                </p>
                <Textarea
                  rows={6}
                  placeholder="Yechim tushuntirishi... Masalan: Pifagor teoremasi asosida: a² + b² = c²..."
                  value={q.explanation}
                  onChange={e => patch({ explanation: e.target.value })}
                  className="font-serif text-sm"
                />
                {q.explanation && (
                  <div className="p-2.5 border border-dashed rounded-lg bg-violet-500/5 dark:bg-violet-950/10 text-sm mt-2">
                    <span className="text-[10px] uppercase font-bold text-violet-650 dark:text-violet-400 block mb-1">Izoh preview:</span>
                    <div className="leading-relaxed">{formatMathText(q.explanation)}</div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" /> Izoh rasmi
                </Label>
                {q.explanationImage ? (
                  <div className="flex items-center gap-3">
                    <img src={q.explanationImage} alt="expl" className="max-h-32 rounded border" />
                    <Button
                      variant="ghost" size="sm" className="text-rose-500"
                      onClick={() => patch({ explanationImage: "" })}
                    >
                      <X className="h-4 w-4 mr-1" /> O'chirish
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" hidden
                      onChange={async e => {
                        if (e.target.files?.[0]) {
                          const url = await uploadImage(e.target.files[0]);
                          if (url) patch({ explanationImage: url });
                        }
                      }}
                    />
                    <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/30 transition-colors">
                      <ImageIcon className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">Izoh rasmi yuklash</p>
                    </div>
                  </label>
                )}
              </div>
            </TabsContent>

            {/* Extras tab */}
            <TabsContent value="extras" className="mt-0 space-y-4">
              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Teglar (Tags)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Tag kiriting va Enter bosing..."
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())}
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {q.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                      {tag}
                      <button onClick={() => patch({ tags: q.tags.filter(t => t !== tag) })}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Audio URL (for listening) */}
              {q.questionType === "LISTENING" && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Audio URL</Label>
                  <Input
                    placeholder="Audio fayl URL..."
                    value={q.audioUrl || ""}
                    onChange={e => patch({ audioUrl: e.target.value })}
                  />
                  {q.audioUrl && (
                    <audio controls src={q.audioUrl} className="w-full mt-2" />
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="px-6 pb-6 border-t pt-4 sticky bottom-0 bg-background/95 backdrop-blur">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Bekor qilish
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-purple-500/20"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {initial?.id ? "Yangilash" : "Saqlash"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Question Preview Modal ───────────────────────────────────────────────────
function QuestionPreviewModal({ open, onClose, question }: { open: boolean; onClose: () => void; question: Question | null }) {
  if (!question) return null;
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Savol ko'rinishi (Student view)
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex flex-wrap gap-2">
            <ExamBadge type={question.examType} />
            <DifficultyBadge d={question.difficulty} />
            <Badge variant="outline">{question.subject}</Badge>
            {question.topic && <Badge variant="outline" className="text-muted-foreground">{question.topic}</Badge>}
          </div>

          {/* Passage */}
          {question.passageText && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-l-4 border-l-blue-400">
              <p className="text-xs font-semibold text-blue-600 mb-2">PASSAGE</p>
              <div className="text-sm leading-relaxed font-serif">{formatMathText(question.passageText)}</div>
            </div>
          )}

          {/* Content blocks */}
          <div className="space-y-3">
            {question.contentBlocks.map((block, i) => (
              <div key={i}>
                {block.type === "PARAGRAPH" && (
                  <div className="text-base leading-relaxed font-medium">{formatMathText(block.value)}</div>
                )}
                {block.type === "FORMULA" && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border text-center text-blue-800 dark:text-blue-200">
                    {formatMathText(`$$${block.value}$$`)}
                  </div>
                )}
                {block.type === "IMAGE" && block.value && (
                  <div className="text-center">
                    <img src={block.value} alt={block.caption || "Question image"} className="max-h-64 mx-auto rounded-lg border object-contain" />
                    {block.caption && <p className="text-xs text-muted-foreground mt-1">{block.caption}</p>}
                  </div>
                )}
                {block.type === "TABLE" && (
                  <pre className="text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded border overflow-auto">{block.value}</pre>
                )}
                {block.type === "LIST" && (
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {block.value.split("\n").filter(Boolean).map((line, li) => (
                      <li key={li}>{line.replace(/^[-*]\s*/, "")}</li>
                    ))}
                  </ul>
                )}
                {block.type === "QUOTE" && (
                  <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground text-sm">
                    {block.value}
                  </blockquote>
                )}
              </div>
            ))}
          </div>

          {/* Images */}
          {question.images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {question.images.map((img, i) => (
                <img key={i} src={img.imageUrl} alt={`img-${i}`} className="max-h-48 rounded-lg border object-contain" />
              ))}
            </div>
          )}

          {/* Options */}
          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Variantlar</p>
            {question.options.map((opt, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  opt.isCorrect
                    ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700"
                    : "bg-background border-border"
                )}
              >
                <span className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                  opt.isCorrect ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                )}>
                  {opt.isCorrect ? <Check className="h-4 w-4" /> : opt.label}
                </span>
                <div className="flex-1">
                  {opt.textContent && <span className="text-sm">{formatMathText(opt.textContent)}</span>}
                  {opt.imageUrl && <img src={opt.imageUrl} alt={`opt-${i}`} className="mt-1 h-16 rounded border object-contain" />}
                </div>
                {opt.isCorrect && (
                  <Badge className="bg-emerald-500 text-white text-xs">To'g'ri</Badge>
                )}
              </div>
            ))}
          </div>

          {/* Explanation */}
          {question.explanation && (
            <div className="p-4 bg-violet-50 dark:bg-violet-950/30 rounded-lg border border-violet-200 dark:border-violet-800 space-y-2">
              <p className="text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Izoh (Explanation)
              </p>
              <div className="text-sm font-serif leading-relaxed text-violet-900 dark:text-violet-100">{formatMathText(question.explanation)}</div>
              {question.explanationImage && (
                <img src={question.explanationImage} alt="expl" className="max-h-32 rounded border mt-2" />
              )}
            </div>
          )}

          {/* Tags */}
          {question.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t">
              {question.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── LMSHub Import Modal (Validation Engine) ─────────────────────────────────────────────────────────
function LmsImportModal({
  open, onClose, onSuccess
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [parsing, setParsing] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [examType, setExamType] = useState<ExamType>("SAT");
  const [subject, setSubject] = useState("Math");

  const handleFile = async (file: File) => {
    setParsing(true);
    setImportFile(file);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/super-admin/question-bank/import-preview", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });
      
      setReport(res.data);
      setStep("review");
      
      if (res.data.valid) {
        toast.success("Hujjat tekshiruvdan o'tdi!");
      } else {
        toast.error("Hujjatda xatoliklar topildi, import to'xtatildi!");
      }
    } catch (e: any) {
      toast.error("Import tahlil xatolik: " + (e?.response?.data || e?.message));
    } finally {
      setParsing(false);
    }
  };

  const confirmImport = async () => {
    if (!importFile) return;
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      await api.post("/super-admin/question-bank/import-commit", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Imtihon muvaffaqiyatli saqlandi va barcha qoidalardan o'tdi! ✅");
      onSuccess();
      onClose();
      setStep("upload");
      setReport(null);
      setImportFile(null);
    } catch (e: any) {
      toast.error("Saqlashda xatolik: " + (e?.response?.data || e?.message));
    } finally {
      setParsing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-violet-500" />
            LMSHub Deterministic Import
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Imtihon turi</Label>
                <Select value={examType} onValueChange={v => { setExamType(v as ExamType); setSubject(getSubjectsForExam(v as ExamType)[0]); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXAM_TYPES.map(et => <SelectItem key={et.value} value={et.value}>{et.icon} {et.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fan</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {getSubjectsForExam(examType).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <label className="cursor-pointer block">
              <input type="file" accept="application/pdf, text/html, .html" hidden
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <div className="border-2 border-dashed border-violet-400/50 rounded-xl p-12 text-center bg-violet-500/5 hover:bg-violet-500/10 transition-colors">
                {parsing ? (
                  <div className="space-y-3">
                    <Loader2 className="h-12 w-12 mx-auto text-violet-500 animate-spin" />
                    <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
                      Validation Engine tekshirmoqda...
                    </p>
                    <p className="text-xs text-muted-foreground">Fayl 40+ xavfsizlik qoidalaridan o'tmoqda</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="mx-auto w-16 h-16 rounded-full bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center border">
                      <FileText className="h-8 w-8 text-violet-500" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 dark:text-slate-200">LMSHub HTML faylini yuklash</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Tizim HTML strukturasini tekshiradi va 100% to'g'ri ishlashini kafolatlaydi. (Hech qanday AI yo'q)
                      </p>
                    </div>
                    <Badge variant="outline" className="text-violet-600 mt-2">.HTML & .PDF formati</Badge>
                  </div>
                )}
              </div>
            </label>
          </div>
        )}

        {step === "review" && report && (
          <div className="space-y-4 py-4">
            <div className={cn("flex items-start gap-3 p-4 rounded-lg border", report.valid ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200")}>
              {report.valid ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className={cn("text-base font-bold", report.valid ? "text-emerald-800" : "text-rose-800")}>
                  {report.valid ? "Import tasdiqlandi" : "Import xatoliklar tufayli to'xtatildi"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Topilgan savollar: <b>{report.parseResult?.questions?.length || 0} ta</b> | Media: <b>{report.parseResult?.mediaAssets?.length || 0} ta</b>
                </p>
              </div>
            </div>

            {/* Errors Panel */}
            {report.errors?.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                <p className="text-xs font-bold text-rose-600 uppercase tracking-wide">Qattiq Xatoliklar (Errors):</p>
                {report.errors.map((err: any, i: number) => (
                  <div key={i} className="p-3 bg-white dark:bg-slate-900 border-l-4 border-l-rose-500 rounded text-sm shadow-sm flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{err.message}</p>
                      <p className="text-xs text-muted-foreground">ID: {err.targetId} | Rule: {err.ruleName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Warnings Panel */}
            {report.warnings?.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">Ogohlantirishlar (Warnings):</p>
                {report.warnings.map((warn: any, i: number) => (
                  <div key={i} className="p-3 bg-white dark:bg-slate-900 border-l-4 border-l-amber-500 rounded text-sm shadow-sm flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{warn.message}</p>
                      <p className="text-xs text-muted-foreground">ID: {warn.targetId} | Rule: {warn.ruleName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => { setStep("upload"); setReport(null); setImportFile(null); }}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Boshqa fayl tanlash
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-300"
                onClick={confirmImport}
                disabled={!report.valid || parsing}
              >
                {parsing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
                Tasdiqlash va Ma'lumotlar bazasiga yozish
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Stats Card ───────────────────────────────────────────────────────────────
function StatsCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <Card className={cn("p-4 flex items-center gap-4 border", color)}>
      <div className="h-11 w-11 rounded-xl flex items-center justify-center bg-current/10 shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
      </div>
    </Card>
  );
}

// ─── Main Question Bank Page ──────────────────────────────────────────────────
export default function QuestionBank() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState("");
  const [filterExam, setFilterExam] = useState<ExamType | "ALL">("ALL");
  const [filterDiff, setFilterDiff] = useState<Difficulty | "ALL">("ALL");
  const [filterType, setFilterType] = useState<QuestionType | "ALL">("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "difficulty">("newest");
  const [apiStats, setApiStats] = useState<any>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [previewQ, setPreviewQ] = useState<Question | null>(null);
  const [showPdfImport, setShowPdfImport] = useState(false);

  // ─── Load questions from API ───────────────────────────────────────────────
  const loadQuestions = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, size: 20 };
      if (search) params.search = search;
      if (filterExam !== "ALL") params.examCategory = filterExam;
      if (filterDiff !== "ALL") params.difficulty = filterDiff.toLowerCase();
      if (filterType !== "ALL") params.questionType = filterType.toLowerCase();

      const res = await api.get("/super-admin/question-bank", { params });
      const data = res.data;
      setQuestions((data.content || []).map(mapApiToQuestion));
      setTotalPages(data.totalPages || 0);
      setTotalItems(data.totalElements || 0);
      setCurrentPage(data.number || 0);
    } catch (e: any) {
      // If API not yet available, show empty state
      if (e?.response?.status !== 404) {
        toast.error("Savollarni yuklashda xatolik");
      }
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [search, filterExam, filterDiff, filterType]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const res = await api.get("/super-admin/question-bank/stats");
      setApiStats(res.data);
    } catch { /* ignore */ }
  }, []);

  // Initial load + filter changes
  useEffect(() => {
    loadQuestions(0);
  }, [loadQuestions]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Filter + search (client-side sort on loaded data)
  const filtered = questions.sort((a, b) => {
    if (sortBy === "difficulty") {
      const order = { EASY: 0, MEDIUM: 1, HARD: 2 };
      return order[a.difficulty] - order[b.difficulty];
    }
    if (sortBy === "oldest") return (a.createdAt || "") < (b.createdAt || "") ? -1 : 1;
    return (b.createdAt || "") < (a.createdAt || "") ? -1 : 1;
  });

  const stats = {
    total: apiStats?.total ?? totalItems,
    sat: apiStats?.byCategory?.SAT ?? questions.filter(q => q.examType === "SAT").length,
    natCert: apiStats?.byCategory?.MILLIY_SERTIFIKAT ?? questions.filter(q => q.examType === "NATIONAL_CERT").length,
    ielts: apiStats?.byCategory?.IELTS ?? questions.filter(q => q.examType === "IELTS").length,
    withImages: questions.filter(q => q.images.length > 0).length,
  };

  const handleSaveQuestion = async (q: Question) => {
    const payload = mapQuestionToApi(q);
    if (q.id) {
      const res = await api.put(`/super-admin/question-bank/${q.id}`, payload);
      setQuestions(prev => prev.map(p => p.id === q.id ? mapApiToQuestion(res.data) : p));
      toast.success("Savol yangilandi ✅");
    } else {
      const res = await api.post("/super-admin/question-bank", payload);
      setQuestions(prev => [mapApiToQuestion(res.data), ...prev]);
      setTotalItems(t => t + 1);
      toast.success("Savol yaratildi ✅");
    }
    loadStats();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu savolni o'chirasizmi?")) return;
    try {
      await api.delete(`/super-admin/question-bank/${id}`);
      setQuestions(prev => prev.filter(q => q.id !== id));
      setTotalItems(t => Math.max(0, t - 1));
      toast.success("Savol o'chirildi");
      loadStats();
    } catch (e: any) {
      toast.error("O'chirishda xatolik: " + (e?.response?.data?.message || e?.message));
    }
  };

  const handleDuplicate = async (q: Question) => {
    try {
      const payload = { ...mapQuestionToApi(q), topic: `${q.topic} (nusxa)` };
      const res = await api.post("/super-admin/question-bank", payload);
      setQuestions(prev => [mapApiToQuestion(res.data), ...prev]);
      setTotalItems(t => t + 1);
      toast.success("Savol nusxalandi ✅");
    } catch {
      toast.error("Nusxalashda xatolik");
    }
  };

  const handleImportSuccess = () => {
    loadQuestions(0);
    loadStats();
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-black bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Professional Question Bank
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            SAT • Milliy Sertifikat • IELTS savollar banki — rasmlar, formulalar, diagrammalar bilan
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setShowPdfImport(true)}
            className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950"
          >
            <Layers className="h-4 w-4" />
            LMS HTML Import
          </Button>
          <Button
            onClick={() => { setEditingQ(null); setShowCreate(true); }}
            className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-purple-500/25"
          >
            <Plus className="h-4 w-4" />
            Yangi savol
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatsCard
          label="Jami savollar"
          value={stats.total}
          icon={<Database className="h-5 w-5 text-violet-600" />}
          color="border-violet-200 dark:border-violet-800"
        />
        <StatsCard
          label="SAT savollar"
          value={stats.sat}
          icon={<Target className="h-5 w-5 text-blue-600" />}
          color="border-blue-200 dark:border-blue-800"
        />
        <StatsCard
          label="Milliy Sertifikat"
          value={stats.natCert}
          icon={<Landmark className="h-5 w-5 text-green-600" />}
          color="border-green-200 dark:border-green-800"
        />
        <StatsCard
          label="IELTS savollar"
          value={stats.ielts}
          icon={<GraduationCap className="h-5 w-5 text-purple-600" />}
          color="border-purple-200 dark:border-purple-800"
        />
        <StatsCard
          label="Rasmli savollar"
          value={stats.withImages}
          icon={<ImageIcon className="h-5 w-5 text-amber-600" />}
          color="border-amber-200 dark:border-amber-800"
        />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Savol matni, mavzu yoki teg bo'yicha qidirish..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Exam type filter */}
          <Select value={filterExam} onValueChange={v => setFilterExam(v as any)}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="Imtihon turi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Barcha turlar</SelectItem>
              {EXAM_TYPES.map(et => (
                <SelectItem key={et.value} value={et.value}>{et.icon} {et.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Difficulty filter */}
          <Select value={filterDiff} onValueChange={v => setFilterDiff(v as any)}>
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder="Qiyinlik" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Barcha</SelectItem>
              {DIFFICULTIES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Question type filter */}
          <Select value={filterType} onValueChange={v => setFilterType(v as any)}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="Savol turi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Barcha turlar</SelectItem>
              {QUESTION_TYPES.map(qt => <SelectItem key={qt.value} value={qt.value}>{qt.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Yangi avval</SelectItem>
              <SelectItem value="oldest">Eski avval</SelectItem>
              <SelectItem value="difficulty">Qiyinlik</SelectItem>
            </SelectContent>
          </Select>

          {/* View mode */}
          <div className="flex rounded-lg border overflow-hidden">
            <button
              className={cn("p-2 transition-colors", viewMode === "list" ? "bg-primary text-white" : "hover:bg-muted")}
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-primary text-white" : "hover:bg-muted")}
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Active filters */}
        {(filterExam !== "ALL" || filterDiff !== "ALL" || filterType !== "ALL" || search) && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t flex-wrap">
            <span className="text-xs text-muted-foreground">{filtered.length} ta natija</span>
            {search && (
              <Badge variant="secondary" className="gap-1 text-xs">
                "{search}" <button onClick={() => setSearch("")}><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {filterExam !== "ALL" && (
              <Badge variant="secondary" className="gap-1 text-xs">
                {filterExam} <button onClick={() => setFilterExam("ALL")}><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {filterDiff !== "ALL" && (
              <Badge variant="secondary" className="gap-1 text-xs">
                {filterDiff} <button onClick={() => setFilterDiff("ALL")}><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {filterType !== "ALL" && (
              <Badge variant="secondary" className="gap-1 text-xs">
                {filterType} <button onClick={() => setFilterType("ALL")}><X className="h-3 w-3" /></button>
              </Badge>
            )}
            <button
              className="text-xs text-rose-500 hover:text-rose-700 ml-auto"
              onClick={() => { setSearch(""); setFilterExam("ALL"); setFilterDiff("ALL"); setFilterType("ALL"); }}
            >
              Hammasini tozalash
            </button>
          </div>
        )}
      </Card>

      {/* Questions list */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center space-y-4">
          <div className="h-20 w-20 mx-auto bg-muted rounded-full flex items-center justify-center">
            <Database className="h-10 w-10 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-lg">Savollar topilmadi</p>
            <p className="text-muted-foreground text-sm">Filtrlarni o'zgartiring yoki yangi savol qo'shing</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
            <Plus className="h-4 w-4 mr-2" /> Birinchi savolni yarating
          </Button>
        </div>
      ) : (
        <div className={cn(
          viewMode === "grid" ? "grid md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-3"
        )}>
          <AnimatePresence>
            {filtered.map((q, idx) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card className={cn(
                  "group hover:shadow-md transition-all duration-200 border hover:border-primary/40",
                  viewMode === "grid" ? "p-4 space-y-3" : "p-4"
                )}>
                  {viewMode === "list" ? (
                    <div className="flex items-start gap-4">
                      {/* Left: Number & type */}
                      <div className="shrink-0 text-center w-8">
                        <span className="text-xs font-bold text-muted-foreground">
                          #{filtered.indexOf(q) + 1}
                        </span>
                      </div>

                      {/* Middle: Content */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <ExamBadge type={q.examType} />
                          <DifficultyBadge d={q.difficulty} />
                          <Badge variant="outline" className="text-xs">{q.subject}</Badge>
                          {q.topic && <span className="text-xs text-muted-foreground">• {q.topic}</span>}
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            {QUESTION_TYPES.find(t => t.value === q.questionType)?.label || q.questionType}
                          </Badge>
                          {q.images.length > 0 && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <ImageIcon className="h-3 w-3" /> {q.images.length} rasm
                            </Badge>
                          )}
                        </div>

                        {/* Question text preview */}
                        <div className="text-sm font-medium leading-relaxed line-clamp-2 text-foreground">
                          {formatMathText(q.rawText || q.contentBlocks.find(b => b.type === "PARAGRAPH")?.value || "")}
                        </div>

                        {/* Options preview */}
                        <div className="flex flex-wrap gap-1.5">
                          {q.options.slice(0, 4).map(opt => (
                            <span
                              key={opt.label}
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full border",
                                opt.isCorrect
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 font-semibold"
                                  : "bg-muted text-muted-foreground border-border"
                              )}
                            >
                              {opt.label}{opt.isCorrect ? " ✓" : ""}
                              {opt.imageUrl && " 🖼️"}
                            </span>
                          ))}
                        </div>

                        {/* Tags */}
                        {q.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {q.tags.slice(0, 4).map(tag => (
                              <span key={tag} className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-muted-foreground">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => setPreviewQ(q)}
                          title="Ko'rish"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                          onClick={() => { setEditingQ(q); setShowCreate(true); }}
                          title="Tahrirlash"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                          onClick={() => handleDuplicate(q)}
                          title="Nusxalash"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                          onClick={() => q.id && handleDelete(q.id)}
                          title="O'chirish"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Grid view */
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        <ExamBadge type={q.examType} />
                        <DifficultyBadge d={q.difficulty} />
                      </div>
                      <p className="text-sm font-medium line-clamp-3">
                        {q.rawText || q.contentBlocks.find(b => b.type === "PARAGRAPH")?.value}
                      </p>
                      {q.images.length > 0 && (
                        <img src={q.images[0].imageUrl} alt="q" className="h-20 w-full object-contain rounded border bg-muted/30" />
                      )}
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs flex-1">{q.subject}</Badge>
                        {q.topic && <span className="text-xs text-muted-foreground truncate">{q.topic}</span>}
                      </div>
                      <div className="flex gap-1 pt-1 border-t">
                        <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={() => setPreviewQ(q)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Ko'rish
                        </Button>
                        <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={() => { setEditingQ(q); setShowCreate(true); }}>
                          <Edit className="h-3.5 w-3.5 mr-1" /> Tahrirlash
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => q.id && handleDelete(q.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      <QuestionFormModal
        open={showCreate}
        onClose={() => { setShowCreate(false); setEditingQ(null); }}
        initial={editingQ || undefined}
        onSave={handleSaveQuestion}
      />
      <QuestionPreviewModal
        open={!!previewQ}
        onClose={() => setPreviewQ(null)}
        question={previewQ}
      />
      <LmsImportModal
        open={showPdfImport}
        onClose={() => setShowPdfImport(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}
