import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Monitor, Tablet, Moon, Sun, ChevronLeft, ChevronRight,
  Timer, X, Maximize2, Volume2, Play, FileText, BookOpen,
  CheckCircle2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Section, ExamMeta, Question } from "./types";
import { formatMathText } from "@/lib/math";
import { MediaPreview } from "./MediaUploader";

// ============================================================
// StudentPreviewModal — Exact student-view exam preview
// ============================================================

interface StudentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  meta: ExamMeta;
  sections: Section[];
}

type ViewMode = "desktop" | "tablet" | "mobile";
type ThemeMode = "light" | "dark";

const StudentPreviewModal: React.FC<StudentPreviewModalProps> = ({
  open, onClose, meta, sections
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [currentSection, setCurrentSection] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showResult, setShowResult] = useState(false);

  const section = sections[currentSection];
  const question: Question | undefined = section?.questions[currentQuestion];

  const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0);
  let globalQuestionIdx = 0;
  for (let si = 0; si < currentSection; si++) {
    globalQuestionIdx += sections[si].questions.length;
  }
  globalQuestionIdx += currentQuestion;
  const progressPct = Math.round(((globalQuestionIdx + 1) / totalQuestions) * 100);

  const widthMap: Record<ViewMode, string> = {
    desktop: "max-w-4xl",
    tablet: "max-w-md",
    mobile: "max-w-sm",
  };

  const setAnswer = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const goNext = () => {
    if (currentQuestion < section.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
      setCurrentQuestion(0);
    } else {
      setShowResult(true);
    }
  };

  const goPrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    } else if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      setCurrentQuestion(sections[currentSection - 1].questions.length - 1);
    }
  };

  const renderQuestion = (q: Question) => {
    const ans = answers[q.id];

    const questionText = q.richText || q.prompt;

    return (
      <div className="space-y-4">
        {/* Question number + difficulty */}
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            theme === "dark" ? "bg-violet-900/40 text-violet-300" : "bg-violet-100 text-violet-700"
          )}>
            Savol {globalQuestionIdx + 1}
          </span>
          <span className={cn("text-xs", theme === "dark" ? "text-slate-400" : "text-slate-400")}>
            {q.points} ball
          </span>
        </div>

        {/* Question text */}
        <div className={cn("text-sm font-medium leading-relaxed", theme === "dark" ? "text-white" : "text-slate-900")}>
          {questionText?.includes("<") ? (
            <div dangerouslySetInnerHTML={{ __html: questionText }} className="prose prose-sm dark:prose-invert max-w-none" />
          ) : (
            <>{formatMathText(questionText || "")}</>
          )}
        </div>

        {/* Question media */}
        {q.media?.[0] && (
          <div className="my-3">
            <MediaPreview media={q.media[0]} />
          </div>
        )}

        {/* Audio */}
        {q.audioUrl && <audio controls src={q.audioUrl} className="w-full" />}

        {/* Options */}
        {(q.qtype === "single_choice" || q.qtype === "listening_choice" || q.qtype === "true_false" || q.qtype === "yes_no") && (
          <div className="space-y-2">
            {(q.qtype === "true_false"
              ? [{ id: "true", text: "True", isCorrect: false }, { id: "false", text: "False", isCorrect: false }]
              : q.qtype === "yes_no"
              ? [{ id: "yes", text: "Yes", isCorrect: false }, { id: "no", text: "No", isCorrect: false }]
              : q.options
            ).map((opt, oi) => {
              const optId = opt.id || (oi === 0 ? "true" : "false");
              const isSelected = ans === optId || ans === opt.text;
              return (
                <button
                  key={optId}
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all",
                    isSelected
                      ? theme === "dark"
                        ? "border-violet-500 bg-violet-900/40 text-violet-200"
                        : "border-violet-500 bg-violet-50 text-violet-800"
                      : theme === "dark"
                      ? "border-slate-700 bg-slate-800/50 text-slate-200 hover:border-slate-500"
                      : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50/30"
                  )}
                  onClick={() => setAnswer(q.id, optId)}
                >
                  <span className={cn(
                    "shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center",
                    isSelected
                      ? "border-violet-500 bg-violet-500"
                      : theme === "dark" ? "border-slate-500" : "border-slate-300"
                  )}>
                    {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>
                  <span className="font-medium mr-1 text-xs opacity-60">{String.fromCharCode(65 + oi)}.</span>
                  {opt.media?.url && <MediaPreview media={opt.media} className="max-h-12 w-auto" />}
                  <span>{opt.text}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Multiple choice */}
        {q.qtype === "multiple_choice" && (
          <div className="space-y-2">
            {q.options.map((opt, oi) => {
              const selected = Array.isArray(ans) ? ans.includes(opt.id) : false;
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all",
                    selected
                      ? theme === "dark"
                        ? "border-violet-500 bg-violet-900/40 text-violet-200"
                        : "border-violet-500 bg-violet-50 text-violet-800"
                      : theme === "dark"
                      ? "border-slate-700 bg-slate-800/50 text-slate-200 hover:border-slate-500"
                      : "border-slate-200 bg-white text-slate-700 hover:border-violet-300"
                  )}
                  onClick={() => {
                    const cur = Array.isArray(ans) ? ans : [];
                    setAnswer(q.id, cur.includes(opt.id) ? cur.filter((id) => id !== opt.id) : [...cur, opt.id]);
                  }}
                >
                  <span className={cn(
                    "shrink-0 h-5 w-5 rounded-md border-2 flex items-center justify-center",
                    selected ? "border-violet-500 bg-violet-500" : theme === "dark" ? "border-slate-500" : "border-slate-300"
                  )}>
                    {selected && <CheckCircle2 className="h-3 w-3 text-white" />}
                  </span>
                  <span className="font-medium mr-1 text-xs opacity-60">{String.fromCharCode(65 + oi)}.</span>
                  <span>{opt.text}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Fill blank / short answer / essay */}
        {(q.qtype === "fill_blank" || q.qtype === "sentence_completion" || q.qtype === "short_answer" ||
          q.qtype === "summary_completion") && (
          <input
            type="text"
            className={cn(
              "w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all",
              theme === "dark"
                ? "bg-slate-800 border-slate-700 text-white focus:border-violet-500"
                : "bg-white border-slate-200 text-slate-900 focus:border-violet-400"
            )}
            placeholder="Javobingizni kiriting..."
            value={typeof ans === "string" ? ans : ""}
            onChange={(e) => setAnswer(q.id, e.target.value)}
          />
        )}

        {q.qtype === "essay" && (
          <textarea
            className={cn(
              "w-full px-4 py-3 rounded-xl border text-sm resize-none outline-none transition-all",
              theme === "dark"
                ? "bg-slate-800 border-slate-700 text-white focus:border-violet-500"
                : "bg-white border-slate-200 text-slate-900 focus:border-violet-400"
            )}
            rows={6}
            placeholder="Esse yozing..."
            value={typeof ans === "string" ? ans : ""}
            onChange={(e) => setAnswer(q.id, e.target.value)}
          />
        )}

        {q.qtype === "numeric" && (
          <input
            type="number"
            className={cn(
              "w-full px-4 py-3 rounded-xl border text-sm outline-none max-w-xs",
              theme === "dark"
                ? "bg-slate-800 border-slate-700 text-white"
                : "bg-white border-slate-200 text-slate-900 focus:border-violet-400"
            )}
            placeholder="Raqamli javob..."
            value={typeof ans === "string" ? ans : ""}
            onChange={(e) => setAnswer(q.id, e.target.value)}
          />
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); setCurrentSection(0); setCurrentQuestion(0); setShowResult(false); setAnswers({}); }}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Student Preview</DialogTitle>

        {/* Preview controls bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-violet-400">PREVIEW MODE</span>
            <Badge variant="outline" className="text-[10px] border-violet-500/40 text-violet-300">Student View</Badge>
          </div>

          {/* View mode */}
          <div className="flex items-center gap-1 bg-slate-700/50 rounded-lg p-0.5">
            {[
              { mode: "desktop" as ViewMode, icon: <Monitor className="h-3.5 w-3.5" /> },
              { mode: "tablet" as ViewMode, icon: <Tablet className="h-3.5 w-3.5" /> },
            ].map(({ mode, icon }) => (
              <button
                key={mode}
                className={cn("px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 transition-all",
                  viewMode === mode ? "bg-violet-600 text-white" : "text-slate-300 hover:text-white")}
                onClick={() => setViewMode(mode)}
              >
                {icon} {mode}
              </button>
            ))}
          </div>

          {/* Theme */}
          <div className="flex items-center gap-2">
            <button
              className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            </button>
            <button className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-slate-700" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className={cn("flex-1 overflow-auto flex items-start justify-center p-6",
          theme === "dark" ? "bg-slate-950" : "bg-slate-100")}>
          <div className={cn("w-full transition-all", widthMap[viewMode])}>
            {/* Exam card */}
            <div className={cn("rounded-2xl shadow-2xl overflow-hidden",
              theme === "dark" ? "bg-slate-900 text-white" : "bg-white text-slate-900")}>

              {/* Exam header */}
              <div className={cn("px-6 py-4 border-b",
                theme === "dark" ? "border-slate-700 bg-slate-800/60" : "border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50")}>
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-base font-bold">{meta.title || "Exam"}</h1>
                  <div className={cn("flex items-center gap-1.5 text-sm font-mono font-bold",
                    theme === "dark" ? "text-violet-400" : "text-violet-600")}>
                    <Timer className="h-4 w-4" />
                    {String(Math.floor(meta.durationMinutes / 60)).padStart(2, "0")}:
                    {String(meta.durationMinutes % 60).padStart(2, "0")}:00
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={progressPct} className="flex-1 h-1.5" />
                  <span className="text-xs text-muted-foreground">{globalQuestionIdx + 1}/{totalQuestions}</span>
                </div>

                {/* Section tabs */}
                {sections.length > 1 && (
                  <div className="flex gap-1 mt-2">
                    {sections.map((s, si) => (
                      <button
                        key={s.id}
                        className={cn(
                          "px-3 py-1 text-xs rounded-full transition-all",
                          currentSection === si
                            ? "bg-violet-600 text-white"
                            : theme === "dark"
                              ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        )}
                        onClick={() => { setCurrentSection(si); setCurrentQuestion(0); }}
                      >
                        {s.icon || "📋"} {s.title || `S${si + 1}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Passage (if exists) */}
              {section?.passage && (
                <div className={cn("px-6 py-4 border-b text-sm leading-relaxed max-h-48 overflow-y-auto",
                  theme === "dark" ? "border-slate-700 bg-slate-800/30 text-slate-300" : "border-slate-100 bg-slate-50/50 text-slate-700")}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <BookOpen className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-xs font-semibold text-violet-600">Reading Passage</span>
                  </div>
                  {section.richPassage
                    ? <div dangerouslySetInnerHTML={{ __html: section.richPassage }} className="prose prose-sm dark:prose-invert max-w-none" />
                    : <p className="whitespace-pre-wrap">{section.passage}</p>
                  }
                </div>
              )}

              {/* Section audio */}
              {section?.audioUrl && (
                <div className="px-6 py-3 border-b">
                  <audio controls src={section.audioUrl} className="w-full h-9" />
                </div>
              )}

              {/* Question */}
              <div className="px-6 py-5">
                {question
                  ? renderQuestion(question)
                  : <div className="text-center text-muted-foreground py-8">Savol topilmadi</div>
                }
              </div>

              {/* Navigation */}
              <div className={cn("px-6 py-4 border-t flex items-center justify-between",
                theme === "dark" ? "border-slate-700" : "border-slate-100")}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={goPrev}
                  disabled={currentSection === 0 && currentQuestion === 0}
                  className={cn("gap-1.5 text-xs",
                    theme === "dark" && "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700")}
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Orqaga
                </Button>

                {/* Question indicators */}
                <div className="flex gap-1">
                  {section?.questions.map((_, qi) => (
                    <button
                      key={qi}
                      className={cn(
                        "h-2 w-2 rounded-full transition-all",
                        qi === currentQuestion
                          ? "bg-violet-600 scale-125"
                          : answers[section.questions[qi].id]
                          ? "bg-emerald-500"
                          : theme === "dark" ? "bg-slate-600" : "bg-slate-300"
                      )}
                      onClick={() => setCurrentQuestion(qi)}
                    />
                  ))}
                </div>

                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={goNext}
                >
                  {currentSection === sections.length - 1 && currentQuestion === section?.questions.length - 1
                    ? "Tugatish"
                    : "Keyingi"
                  }
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentPreviewModal;
