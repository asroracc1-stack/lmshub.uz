import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronRight, Plus, Trash2, GripVertical,
  Clock, Shuffle, Settings2, Music, FileText, Image as ImageIcon,
  AlertTriangle, CheckCircle2, BookOpen, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Section, Question } from "./types";
import {
  DndContext, DragEndEvent, PointerSensor, useSensor, useSensors,
  closestCenter
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ============================================================
// Section Navigation — Left panel showing all sections + questions
// ============================================================

interface SectionNavProps {
  sections: Section[];
  activeSection: number;
  activeQuestion: string | null;
  onSectionSelect: (i: number) => void;
  onQuestionSelect: (sectionIdx: number, questionId: string) => void;
  onAddSection: () => void;
  onDeleteSection: (i: number) => void;
  onReorderSections: (sections: Section[]) => void;
  onReorderQuestions: (sectionIdx: number, questions: Question[]) => void;
  onAddQuestion: (sectionIdx: number) => void;
  onDeleteQuestion: (sectionIdx: number, questionId: string) => void;
}

// ============================================================
// Sortable Section Item
// ============================================================
interface SortableSectionProps {
  section: Section;
  sectionIdx: number;
  isActive: boolean;
  activeQuestion: string | null;
  onSectionSelect: () => void;
  onQuestionSelect: (questionId: string) => void;
  onDeleteSection: () => void;
  onAddQuestion: () => void;
  onDeleteQuestion: (id: string) => void;
  onReorderQuestions: (questions: Question[]) => void;
}

const SortableSection: React.FC<SortableSectionProps> = ({
  section, sectionIdx, isActive, activeQuestion,
  onSectionSelect, onQuestionSelect, onDeleteSection,
  onAddQuestion, onDeleteQuestion, onReorderQuestions,
}) => {
  const [expanded, setExpanded] = useState(true);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleQDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = section.questions.findIndex((q) => q.id === active.id);
    const newIdx = section.questions.findIndex((q) => q.id === over.id);
    onReorderQuestions(arrayMove(section.questions, oldIdx, newIdx));
  };

  const hasIssues = section.questions.some((q) =>
    !q.options?.some((o) => o.isCorrect) && !["essay", "short_answer", "speaking_recording", "code"].includes(q.qtype)
  );

  const sectionHasMedia = !!(section.audioUrl || section.imageUrl || section.pdfAttachment);

  return (
    <div ref={setNodeRef} style={style} className={cn("transition-opacity", isDragging && "opacity-50")}>
      {/* Section header */}
      <div
        className={cn(
          "group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer select-none transition-all",
          isActive
            ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"
            : "hover:bg-muted/60 text-foreground"
        )}
        onClick={() => { onSectionSelect(); setExpanded(!expanded); }}
      >
        {/* Drag handle */}
        <div
          {...attributes} {...listeners}
          className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>

        {/* Expand toggle */}
        <button
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>

        {/* Section info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <Layers className="h-3 w-3 shrink-0 opacity-60" />
            <span className="text-xs font-semibold truncate">
              {section.title || `Section ${sectionIdx + 1}`}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-muted-foreground">{section.questions.length} savol</span>
            {sectionHasMedia && <Music className="h-2.5 w-2.5 text-muted-foreground" />}
            {section.timeLimitSeconds && <Clock className="h-2.5 w-2.5 text-muted-foreground" />}
            {hasIssues && <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />}
          </div>
        </div>

        {/* Delete */}
        <button
          className="opacity-0 group-hover:opacity-100 shrink-0 h-5 w-5 flex items-center justify-center rounded hover:bg-rose-100 dark:hover:bg-rose-950/30 text-rose-500"
          onClick={(e) => { e.stopPropagation(); onDeleteSection(); }}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Questions list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden ml-4 border-l border-border/60 pl-2 mt-0.5 space-y-0.5"
          >
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleQDragEnd}>
              <SortableContext items={section.questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                {section.questions.map((q, qi) => (
                  <SortableQuestion
                    key={q.id}
                    question={q}
                    questionIdx={qi}
                    isActive={activeQuestion === q.id}
                    onClick={() => onQuestionSelect(q.id)}
                    onDelete={() => onDeleteQuestion(q.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {/* Add question */}
            <button
              className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors mt-0.5"
              onClick={onAddQuestion}
            >
              <Plus className="h-3 w-3" />
              Savol qo'shish
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================
// Sortable Question Item
// ============================================================
const QTYPE_ICONS: Record<string, string> = {
  single_choice: "◉", multiple_choice: "☑", true_false: "⊤", yes_no: "✓",
  fill_blank: "___", essay: "📝", short_answer: "✏", matching: "↔",
  ordering: "⇅", drag_drop: "↕", listening_choice: "🎧", speaking_recording: "🎤",
  numeric: "🔢", formula: "∑", matrix: "⊠", hotspot: "🎯", code: "💻",
  default: "?"
};

const STATUS_COLORS: Record<string, string> = {
  draft: "text-amber-500", published: "text-emerald-500", archived: "text-slate-400"
};

interface SortableQuestionProps {
  question: Question;
  questionIdx: number;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

const SortableQuestion: React.FC<SortableQuestionProps> = ({
  question, questionIdx, isActive, onClick, onDelete
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const hasCorrect = question.options?.some((o) => o.isCorrect) ||
    ["essay", "short_answer", "speaking_recording", "code", "numeric"].includes(question.qtype);

  const icon = QTYPE_ICONS[question.qtype] || QTYPE_ICONS.default;

  return (
    <div
      ref={setNodeRef} style={style}
      className={cn(
        "group flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer transition-all text-xs",
        isActive
          ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"
          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
        isDragging && "opacity-50 shadow-md"
      )}
      onClick={onClick}
    >
      <div {...attributes} {...listeners}
        className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing shrink-0"
        onClick={(e) => e.stopPropagation()}>
        <GripVertical className="h-3 w-3" />
      </div>
      <span className="shrink-0 text-[10px] font-mono opacity-60">{questionIdx + 1}.</span>
      <span className="shrink-0">{icon}</span>
      <span className="truncate flex-1">
        {question.prompt
          ? question.prompt.replace(/<[^>]*>/g, "").substring(0, 30) || `Savol ${questionIdx + 1}`
          : `Savol ${questionIdx + 1}`
        }
      </span>
      {!hasCorrect && (
        <AlertTriangle className="h-2.5 w-2.5 text-amber-500 shrink-0" />
      )}
      <button
        className="opacity-0 group-hover:opacity-100 shrink-0 h-4 w-4 flex items-center justify-center rounded hover:bg-rose-100 dark:hover:bg-rose-950/30 text-rose-500"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
      >
        <Trash2 className="h-2.5 w-2.5" />
      </button>
    </div>
  );
};

// ============================================================
// Main SectionNav
// ============================================================
const SectionNav: React.FC<SectionNavProps> = ({
  sections, activeSection, activeQuestion,
  onSectionSelect, onQuestionSelect,
  onAddSection, onDeleteSection,
  onReorderSections, onReorderQuestions,
  onAddQuestion, onDeleteQuestion,
}) => {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = sections.findIndex((s) => s.id === active.id);
    const newIdx = sections.findIndex((s) => s.id === over.id);
    onReorderSections(arrayMove(sections, oldIdx, newIdx));
  };

  const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0);
  const issueCount = sections.reduce((acc, s) =>
    acc + s.questions.filter((q) =>
      !q.options?.some((o) => o.isCorrect) &&
      !["essay", "short_answer", "speaking_recording", "code", "numeric", "formula"].includes(q.qtype)
    ).length, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-foreground">Sections</p>
          <p className="text-[10px] text-muted-foreground">{sections.length} bo'lim · {totalQuestions} savol</p>
        </div>
        <div className="flex items-center gap-1">
          {issueCount > 0 && (
            <Badge variant="outline" className="h-5 text-[10px] text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/20 gap-1">
              <AlertTriangle className="h-2.5 w-2.5" /> {issueCount}
            </Badge>
          )}
        </div>
      </div>

      {/* Sections list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {sections.map((section, si) => (
              <SortableSection
                key={section.id}
                section={section}
                sectionIdx={si}
                isActive={activeSection === si}
                activeQuestion={activeQuestion}
                onSectionSelect={() => onSectionSelect(si)}
                onQuestionSelect={(qId) => onQuestionSelect(si, qId)}
                onDeleteSection={() => onDeleteSection(si)}
                onAddQuestion={() => onAddQuestion(si)}
                onDeleteQuestion={(id) => onDeleteQuestion(si, id)}
                onReorderQuestions={(qs) => onReorderQuestions(si, qs)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Add section */}
      <div className="p-2 border-t">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-xs border-dashed hover:bg-violet-50 dark:hover:bg-violet-950/20 hover:border-violet-400 hover:text-violet-600"
          onClick={onAddSection}
        >
          <Plus className="h-3.5 w-3.5" />
          Yangi Section
        </Button>
      </div>
    </div>
  );
};

export default SectionNav;
