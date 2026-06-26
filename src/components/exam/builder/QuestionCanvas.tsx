import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, GripVertical, Check, X,
  ChevronDown, Image as ImageIcon, Volume2, AlertCircle,
  ToggleLeft, CheckSquare, ArrowUpDown, AlignJustify,
  Move, Mic, Calculator, Code, Lightbulb, Target,
  Tags, BookOpen, Brain, Timer, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Question, OptionState, QuestionType, Difficulty,
  newOption, uid, MatchingPair, MatrixColumn, MatrixRow,
  QUESTION_TYPE_CONFIGS,
} from "./types";
import RichTextEditor, { SimpleFormulaInput } from "./RichTextEditor";
import { MediaUploader, MediaPreview } from "./MediaUploader";
import { formatMathText } from "@/lib/math";
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ============================================================
// QuestionCanvas — Central editing panel for a single question
// ============================================================

interface QuestionCanvasProps {
  question: Question;
  questionIndex: number;
  onChange: (patch: Partial<Question>) => void;
  onDelete: () => void;
  onTypeChange: () => void;
}

// ============================================================
// Sortable Option Row
// ============================================================
interface SortableOptionProps {
  option: OptionState;
  index: number;
  qtype: QuestionType;
  onChange: (patch: Partial<OptionState>) => void;
  onDelete: () => void;
  onToggleCorrect: () => void;
  onUploadImage: (file: File) => Promise<string | null>;
}

const SortableOption: React.FC<SortableOptionProps> = ({
  option, index, qtype, onChange, onDelete, onToggleCorrect, onUploadImage
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: option.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [showMedia, setShowMedia] = useState(!!option.media?.url);
  const [showFormula, setShowFormula] = useState(!!option.formula);

  const isMulti = qtype === "multiple_choice";
  const isCorrect = option.isCorrect;

  return (
    <div ref={setNodeRef} style={style} className={cn("group", isDragging && "opacity-50 shadow-lg z-50")}>
      <div className={cn(
        "flex items-start gap-2 p-2.5 rounded-xl border transition-all",
        isCorrect
          ? "border-emerald-300 bg-emerald-50/60 dark:border-emerald-700/60 dark:bg-emerald-950/20"
          : "border-border bg-card hover:bg-muted/30"
      )}>
        {/* Drag handle */}
        <div {...attributes} {...listeners}
          className="mt-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0">
          <GripVertical className="h-3.5 w-3.5" />
        </div>

        {/* Correct indicator */}
        <button
          type="button"
          className={cn(
            "mt-1.5 shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
            isCorrect
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "border-muted-foreground/40 hover:border-emerald-400"
          )}
          onClick={onToggleCorrect}
          title={isCorrect ? "To'g'ri javob" : "To'g'ri javob sifatida belgilash"}
        >
          {isCorrect && <Check className="h-3.5 w-3.5" />}
        </button>

        {/* Option label */}
        <div className="mt-2 shrink-0 w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
          {String.fromCharCode(65 + index)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Main text input */}
          <Input
            className={cn("text-sm h-8 border-0 bg-transparent px-0 focus-visible:ring-0 font-medium")}
            placeholder="Variant matni..."
            value={option.text}
            onChange={(e) => onChange({ text: e.target.value })}
          />

          {/* Rich text preview */}
          {option.text && option.text.includes("<") && (
            <div
              className="text-xs text-muted-foreground px-1 prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: option.text }}
            />
          )}

          {/* Formula */}
          {showFormula && (
            <SimpleFormulaInput
              value={option.formula || ""}
              onChange={(v) => onChange({ formula: v })}
              placeholder="$\\frac{x}{y}$"
              className="mt-1"
            />
          )}

          {/* Media preview */}
          {option.media?.url && (
            <div className="mt-1">
              <MediaPreview media={option.media} />
            </div>
          )}

          {/* Explanation */}
          {option.explanation !== undefined && (
            <Input
              className="text-xs h-7 text-muted-foreground"
              placeholder="Variant uchun izoh (ixtiyoriy)..."
              value={option.explanation}
              onChange={(e) => onChange({ explanation: e.target.value })}
            />
          )}
        </div>

        {/* Option actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Formula toggle */}
          <button
            type="button"
            title="Formula qo'shish"
            className={cn("h-7 w-7 rounded-md flex items-center justify-center text-xs transition-colors",
              showFormula ? "bg-violet-100 text-violet-600" : "hover:bg-muted text-muted-foreground")}
            onClick={() => setShowFormula(!showFormula)}
          >
            ∑
          </button>

          {/* Image upload */}
          <label title="Rasm qo'shish" className="cursor-pointer">
            <input type="file" accept="image/*" hidden onChange={async (e) => {
              if (!e.target.files?.[0]) return;
              const url = await onUploadImage(e.target.files[0]);
              if (url) onChange({ media: { type: "image", url } });
            }} />
            <span className={cn("h-7 w-7 rounded-md flex items-center justify-center transition-colors",
              option.media?.url ? "bg-blue-100 text-blue-600" : "hover:bg-muted text-muted-foreground")}>
              <ImageIcon className="h-3 w-3" />
            </span>
          </label>

          {/* Delete */}
          <button
            type="button"
            className="h-7 w-7 rounded-md flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 opacity-0 group-hover:opacity-100 transition-all"
            onClick={onDelete}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Matching Pair Row
// ============================================================
const MatchingPairRow: React.FC<{
  pair: MatchingPair; index: number;
  onChange: (p: Partial<MatchingPair>) => void;
  onDelete: () => void;
}> = ({ pair, index, onChange, onDelete }) => (
  <div className="flex items-center gap-2 p-2 border rounded-lg bg-card">
    <span className="w-6 text-xs font-bold text-center text-muted-foreground shrink-0">{index + 1}</span>
    <Input className="flex-1 h-8 text-sm" placeholder="Chap (savol)..." value={pair.left}
      onChange={(e) => onChange({ left: e.target.value })} />
    <span className="text-muted-foreground">↔</span>
    <Input className="flex-1 h-8 text-sm" placeholder="O'ng (javob)..." value={pair.right}
      onChange={(e) => onChange({ right: e.target.value })} />
    <button type="button" className="text-rose-500 hover:bg-rose-50 h-8 w-8 flex items-center justify-center rounded-md"
      onClick={onDelete}>
      <X className="h-3.5 w-3.5" />
    </button>
  </div>
);

// ============================================================
// Main QuestionCanvas
// ============================================================
const QuestionCanvas: React.FC<QuestionCanvasProps> = ({
  question, questionIndex, onChange, onDelete, onTypeChange
}) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHint, setShowHint] = useState(!!question.hint);
  const [activeTab, setActiveTab] = useState<"question" | "options" | "media" | "meta">("question");

  const typeConfig = QUESTION_TYPE_CONFIGS.find((c) => c.type === question.qtype);

  // -------- Option handlers --------
  const handleOptionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = question.options.findIndex((o) => o.id === active.id);
    const newIdx = question.options.findIndex((o) => o.id === over.id);
    onChange({ options: arrayMove(question.options, oldIdx, newIdx) });
  };

  const toggleCorrect = (oi: number) => {
    const newOpts = [...question.options];
    if (question.qtype === "single_choice" || question.qtype === "true_false" || question.qtype === "yes_no" || question.qtype === "listening_choice") {
      newOpts.forEach((o, i) => (newOpts[i] = { ...o, isCorrect: i === oi }));
    } else {
      newOpts[oi] = { ...newOpts[oi], isCorrect: !newOpts[oi].isCorrect };
    }
    onChange({ options: newOpts });
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const { api } = await import("@/lib/axios");
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/files/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      return res.data;
    } catch { return null; }
  };

  // -------- Matching --------
  const addMatchingPair = () => {
    const pair: MatchingPair = { id: uid(), left: "", right: "" };
    onChange({ matchingPairs: [...(question.matchingPairs || []), pair] });
  };
  const updateMatchingPair = (i: number, p: Partial<MatchingPair>) => {
    const pairs = [...(question.matchingPairs || [])];
    pairs[i] = { ...pairs[i], ...p };
    onChange({ matchingPairs: pairs });
  };
  const deleteMatchingPair = (i: number) => {
    onChange({ matchingPairs: (question.matchingPairs || []).filter((_, idx) => idx !== i) });
  };

  const renderOptionsSection = () => {
    const qtype = question.qtype;

    // True/False and Yes/No — fixed options
    if (qtype === "true_false" || qtype === "yes_no") {
      const labels = qtype === "true_false" ? ["True", "False"] : ["Yes", "No"];
      return (
        <div className="space-y-2">
          {labels.map((label, i) => {
            const opt = question.options[i] || newOption({ text: label });
            return (
              <div key={i} className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all",
                opt.isCorrect ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" : "border-border bg-card"
              )}>
                <button className={cn("h-6 w-6 rounded-full border-2 flex items-center justify-center",
                  opt.isCorrect ? "bg-emerald-500 border-emerald-500 text-white" : "border-muted-foreground/40")}
                  onClick={() => toggleCorrect(i)}>
                  {opt.isCorrect && <Check className="h-3.5 w-3.5" />}
                </button>
                <span className="font-semibold text-sm">{label}</span>
                {i === 0 ? <ToggleLeft className="ml-auto h-4 w-4 text-muted-foreground" /> : null}
              </div>
            );
          })}
        </div>
      );
    }

    // Matching
    if (qtype === "matching" || qtype === "information_matching") {
      return (
        <div className="space-y-2">
          {(question.matchingPairs || []).map((pair, i) => (
            <MatchingPairRow key={pair.id} pair={pair} index={i}
              onChange={(p) => updateMatchingPair(i, p)}
              onDelete={() => deleteMatchingPair(i)} />
          ))}
          <Button type="button" variant="outline" size="sm" className="w-full border-dashed gap-1.5 text-xs" onClick={addMatchingPair}>
            <Plus className="h-3.5 w-3.5" /> Juft qo'shish
          </Button>
        </div>
      );
    }

    // Ordering
    if (qtype === "ordering") {
      return (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">To'g'ri tartibda kiriting (yuqoridan pastga):</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleOptionDragEnd}>
            <SortableContext items={question.options.map((o) => o.id)} strategy={verticalListSortingStrategy}>
              {question.options.map((opt, oi) => (
                <SortableOption key={opt.id} option={opt} index={oi} qtype={qtype}
                  onChange={(p) => {
                    const opts = [...question.options];
                    opts[oi] = { ...opts[oi], ...p };
                    onChange({ options: opts });
                  }}
                  onDelete={() => onChange({ options: question.options.filter((_, i) => i !== oi) })}
                  onToggleCorrect={() => {}}
                  onUploadImage={uploadImage}
                />
              ))}
            </SortableContext>
          </DndContext>
          <Button type="button" variant="outline" size="sm" className="w-full border-dashed gap-1.5 text-xs"
            onClick={() => onChange({ options: [...question.options, newOption({ text: `Variant ${question.options.length + 1}`, isCorrect: false })] })}>
            <Plus className="h-3.5 w-3.5" /> Element qo'shish
          </Button>
        </div>
      );
    }

    // Fill blank — show template input
    if (qtype === "fill_blank" || qtype === "sentence_completion" || qtype === "summary_completion") {
      return (
        <div className="space-y-3">
          <div>
            <Label className="text-xs font-medium text-muted-foreground">To'g'ri javob(lar)</Label>
            {(question.options.length === 0
              ? [newOption({ text: "", isCorrect: true })]
              : question.options
            ).map((opt, oi) => (
              <div key={opt.id || oi} className="flex items-center gap-2 mt-1.5">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <Input
                  className="flex-1 h-8 text-sm"
                  placeholder="To'g'ri javob..."
                  value={opt.text}
                  onChange={(e) => {
                    const opts = question.options.length ? [...question.options] : [newOption({ text: "", isCorrect: true })];
                    if (opts[oi]) opts[oi] = { ...opts[oi], text: e.target.value };
                    onChange({ options: opts });
                  }}
                />
                {oi > 0 && <button type="button" className="text-rose-500" onClick={() => onChange({ options: question.options.filter((_, i) => i !== oi) })}>
                  <X className="h-3.5 w-3.5" />
                </button>}
              </div>
            ))}
            <button type="button" className="text-xs text-violet-600 hover:underline mt-1 flex items-center gap-1"
              onClick={() => onChange({ options: [...(question.options.length ? question.options : [newOption({ isCorrect: true })]), newOption({ text: "", isCorrect: true })] })}>
              <Plus className="h-3 w-3" /> Alternativ javob qo'shish
            </button>
          </div>
        </div>
      );
    }

    // Essay/Short Answer/Speaking — no options needed
    if (["essay", "short_answer", "speaking_recording", "code", "numeric", "formula"].includes(qtype)) {
      return (
        <div className="p-3 border rounded-xl bg-muted/20 text-center text-sm text-muted-foreground">
          <span className="text-2xl">
            {qtype === "essay" ? "📝" : qtype === "speaking_recording" ? "🎤" : qtype === "code" ? "💻" : qtype === "numeric" ? "🔢" : "∑"}
          </span>
          <p className="mt-1 text-xs">Bu savol turi uchun variant kerak emas.</p>
          {qtype === "numeric" && (
            <div className="mt-3 flex flex-col gap-2">
              <Input type="number" placeholder="To'g'ri raqamli javob"
                value={question.numericAnswer || ""}
                onChange={(e) => onChange({ numericAnswer: parseFloat(e.target.value) })}
                className="max-w-xs mx-auto text-sm"
              />
              <Input type="number" placeholder="Qabul qilinadigan xato (±)"
                value={question.numericTolerance || ""}
                onChange={(e) => onChange({ numericTolerance: parseFloat(e.target.value) })}
                className="max-w-xs mx-auto text-sm"
              />
            </div>
          )}
          {qtype === "formula" && (
            <div className="mt-3 max-w-xs mx-auto">
              <SimpleFormulaInput
                value={question.formula || ""}
                onChange={(v) => onChange({ formula: v })}
                placeholder="To'g'ri formula (LaTeX)..."
              />
            </div>
          )}
          {qtype === "essay" && (
            <div className="mt-3 grid grid-cols-2 gap-2 max-w-xs mx-auto">
              <div>
                <Label className="text-[10px]">Min so'z</Label>
                <Input type="number" value={question.wordLimit || ""} onChange={(e) => onChange({ wordLimit: parseInt(e.target.value) })} className="h-8 text-sm mt-0.5" />
              </div>
              <div>
                <Label className="text-[10px]">Max so'z</Label>
                <Input type="number" value="" className="h-8 text-sm mt-0.5" placeholder="cheksiz" />
              </div>
            </div>
          )}
        </div>
      );
    }

    // Default: choice-based with sortable options
    const hasOptions = ["single_choice", "multiple_choice", "drag_drop", "listening_choice", "audio_based", "video_based", "custom", "map_labeling", "diagram_labeling", "paragraph_heading"].includes(qtype);
    if (!hasOptions) return null;

    return (
      <div className="space-y-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleOptionDragEnd}>
          <SortableContext items={question.options.map((o) => o.id)} strategy={verticalListSortingStrategy}>
            {question.options.map((opt, oi) => (
              <SortableOption
                key={opt.id}
                option={opt}
                index={oi}
                qtype={qtype}
                onChange={(p) => {
                  const opts = [...question.options];
                  opts[oi] = { ...opts[oi], ...p };
                  onChange({ options: opts });
                }}
                onDelete={() => onChange({ options: question.options.filter((_, i) => i !== oi) })}
                onToggleCorrect={() => toggleCorrect(oi)}
                onUploadImage={uploadImage}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Add option */}
        <Button type="button" variant="outline" size="sm"
          className="w-full border-dashed gap-1.5 text-xs hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20"
          onClick={() => onChange({ options: [...question.options, newOption({ text: "", isCorrect: false })] })}>
          <Plus className="h-3.5 w-3.5" /> Variant qo'shish
        </Button>
      </div>
    );
  };

  const difficultyColors = {
    easy: "bg-emerald-100 text-emerald-700 border-emerald-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    hard: "bg-rose-100 text-rose-700 border-rose-200",
    expert: "bg-purple-100 text-purple-700 border-purple-200",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-0 rounded-2xl border bg-card shadow-sm overflow-hidden"
    >
      {/* Question header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-gradient-to-r from-violet-500/5 to-purple-500/5">
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {questionIndex + 1}
        </div>

        {/* Type badge - clickable to change */}
        <button
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-background hover:bg-violet-50 dark:hover:bg-violet-950/20 hover:border-violet-300 transition-all text-xs font-medium group"
          onClick={onTypeChange}
        >
          <span className="text-sm">{typeConfig?.icon}</span>
          <span>{typeConfig?.label || question.qtype}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-violet-600 transition-colors" />
        </button>

        {/* Difficulty */}
        <Badge
          variant="outline"
          className={cn("text-[10px] font-medium capitalize cursor-pointer select-none",
            difficultyColors[question.difficulty] || difficultyColors.medium)}
          onClick={() => {
            const order: Difficulty[] = ["easy", "medium", "hard", "expert"];
            const next = order[(order.indexOf(question.difficulty) + 1) % order.length];
            onChange({ difficulty: next });
          }}
        >
          {question.difficulty}
        </Badge>

        {/* Points */}
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 text-amber-500" />
          <Input
            type="number"
            className="h-6 w-12 text-xs text-center p-0 border-0 bg-transparent focus-visible:ring-0 font-semibold"
            value={question.points}
            min={0}
            onChange={(e) => onChange({ points: parseFloat(e.target.value) || 1 })}
          />
          <span className="text-[10px] text-muted-foreground">ball</span>
        </div>

        {/* Status */}
        <button
          type="button"
          className={cn("ml-auto text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize",
            question.status === "published" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
            question.status === "archived" ? "bg-slate-50 text-slate-500 border-slate-200" :
            "bg-amber-50 text-amber-600 border-amber-200")}
          onClick={() => {
            const next = question.status === "draft" ? "published" : question.status === "published" ? "archived" : "draft";
            onChange({ status: next });
          }}
        >
          {question.status}
        </button>

        {/* Delete question */}
        <button type="button"
          className="h-7 w-7 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
          onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="h-9 mt-3 mb-0 bg-muted/40">
            <TabsTrigger value="question" className="text-xs h-7">Savol</TabsTrigger>
            <TabsTrigger value="options" className="text-xs h-7">Javoblar</TabsTrigger>
            <TabsTrigger value="media" className="text-xs h-7">Media</TabsTrigger>
            <TabsTrigger value="meta" className="text-xs h-7">Meta</TabsTrigger>
          </TabsList>

          {/* ---- Question Tab ---- */}
          <TabsContent value="question" className="mt-3 space-y-3 pb-4">
            {/* Main question input */}
            <div>
              <Label className="text-xs text-muted-foreground font-medium mb-1.5 block">Savol matni</Label>
              <RichTextEditor
                value={question.richText || question.prompt}
                onChange={(html) => onChange({ richText: html, prompt: html.replace(/<[^>]*>/g, "") })}
                placeholder="Savol matnini kiriting... (LaTeX uchun ∑ tugmasini bosing)"
                minHeight={80}
              />
            </div>

            {/* Formula (for formula type) */}
            {question.qtype === "formula" && (
              <div>
                <Label className="text-xs text-muted-foreground font-medium mb-1.5 block">Savol formulasi (LaTeX)</Label>
                <SimpleFormulaInput
                  value={question.formula || ""}
                  onChange={(v) => onChange({ formula: v })}
                  placeholder="$\int_0^\infty f(x)dx$"
                />
              </div>
            )}

            {/* Fill blank template */}
            {(question.qtype === "fill_blank" || question.qtype === "sentence_completion") && (
              <div>
                <Label className="text-xs text-muted-foreground font-medium mb-1.5 block">Bo'sh joy shablon (ixtiyoriy)</Label>
                <Input
                  className="text-sm"
                  placeholder="Masalan: The river is located in ____ country."
                  value={question.fillTemplate || ""}
                  onChange={(e) => onChange({ fillTemplate: e.target.value })}
                />
                <p className="text-[10px] text-muted-foreground mt-1">____ yoki [BLANK] orqali bo'sh joyni belgilang</p>
              </div>
            )}

            {/* Explanation */}
            <div>
              <Label className="text-xs text-muted-foreground font-medium mb-1.5 block">Tushuntirish (ixtiyoriy)</Label>
              <RichTextEditor
                value={question.explanation || ""}
                onChange={(html) => onChange({ explanation: html })}
                placeholder="To'g'ri javobni tushuntirish..."
                minHeight={50}
                showFormulaBar={true}
              />
            </div>

            {/* Hint */}
            {showHint ? (
              <div>
                <Label className="text-xs text-muted-foreground font-medium mb-1.5 block">Maslahat (Hint)</Label>
                <Input
                  className="text-sm"
                  placeholder="Talabaga maslahat..."
                  value={question.hint || ""}
                  onChange={(e) => onChange({ hint: e.target.value })}
                />
              </div>
            ) : (
              <button type="button"
                className="text-xs text-muted-foreground hover:text-violet-600 flex items-center gap-1"
                onClick={() => setShowHint(true)}>
                <Lightbulb className="h-3 w-3" /> Maslahat qo'shish
              </button>
            )}
          </TabsContent>

          {/* ---- Options Tab ---- */}
          <TabsContent value="options" className="mt-3 pb-4">
            {renderOptionsSection()}
          </TabsContent>

          {/* ---- Media Tab ---- */}
          <TabsContent value="media" className="mt-3 space-y-3 pb-4">
            <MediaUploader
              value={question.media?.[0]}
              onChange={(m) => onChange({ media: m ? [m] : [] })}
              accept="image"
              label="Savol rasmi"
              showPosition
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground font-medium mb-1.5 block">Audio URL</Label>
                <Input className="text-sm" placeholder="https://..." value={question.audioUrl || ""}
                  onChange={(e) => onChange({ audioUrl: e.target.value })} />
                {question.audioUrl && <audio controls src={question.audioUrl} className="mt-1 w-full h-9" />}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-medium mb-1.5 block">Video URL</Label>
                <Input className="text-sm" placeholder="https://youtube.com/..." value={question.videoUrl || ""}
                  onChange={(e) => onChange({ videoUrl: e.target.value })} />
              </div>
            </div>
          </TabsContent>

          {/* ---- Meta Tab ---- */}
          <TabsContent value="meta" className="mt-3 space-y-3 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground font-medium mb-1.5 block">Mavzu</Label>
                <Input className="text-sm h-8" placeholder="Grammar, Reading..."
                  value={question.topic || ""} onChange={(e) => onChange({ topic: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-medium mb-1.5 block">Quyi mavzu</Label>
                <Input className="text-sm h-8" placeholder="Tenses, Vocabulary..."
                  value={question.subtopic || ""} onChange={(e) => onChange({ subtopic: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-medium mb-1.5 block">Salbiy ball</Label>
                <Input type="number" className="text-sm h-8" placeholder="0"
                  value={question.negativeMarks || ""} onChange={(e) => onChange({ negativeMarks: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-medium mb-1.5 block">Vaqt (soniya)</Label>
                <Input type="number" className="text-sm h-8" placeholder="cheksiz"
                  value={question.timeLimitSeconds || ""} onChange={(e) => onChange({ timeLimitSeconds: parseInt(e.target.value) || undefined })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground font-medium mb-1.5 block">Teglar (vergul bilan)</Label>
                <Input className="text-sm h-8" placeholder="grammar, advanced, tenses..."
                  value={(question.tags || []).join(", ")}
                  onChange={(e) => onChange({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground font-medium mb-1.5 block">O'rganish maqsadi</Label>
                <Input className="text-sm h-8" placeholder="Student can identify..."
                  value={question.learningObjective || ""} onChange={(e) => onChange({ learningObjective: e.target.value })} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
};

export default QuestionCanvas;
