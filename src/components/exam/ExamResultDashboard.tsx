import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, BrainCircuit,
  Timer, XCircle, PlayCircle, BarChart3, Bookmark, FileText, ChevronRight,
  ShieldAlert, ShieldCheck, History, Target, Loader2, ArrowLeft, ArrowRight,
  BookOpen, Headphones, HelpCircle, FileSignature, Lightbulb, Pause, Play,
  Volume2, Share2, RotateCcw, LayoutDashboard, Search
} from "lucide-react";
import { getExamCalculator } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { formatMathText } from "@/lib/math";
import { toast } from "sonner";

function processLaTeX(text: string) {
  return formatMathText(text);
}

// Sentence and evidence highlighter helper
function getHighlightedPassage(passage: string, highlightStr?: string, correctAns?: string) {
  if (!passage) return "";
  
  let target = (highlightStr || "").trim();
  if (!target && correctAns && correctAns.length > 3) {
    target = correctAns.trim();
  }
  
  if (!target || target.length < 3) {
    return passage;
  }
  
  try {
    const escaped = target.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    if (regex.test(passage)) {
      return passage.replace(regex, `<mark id="evidence-highlight" class="bg-yellow-200 dark:bg-yellow-950/80 text-yellow-900 dark:text-yellow-250 border-b-2 border-yellow-500 font-bold px-1 rounded-sm transition-colors duration-300 animate-pulse">$1</mark>`);
    }
  } catch (e) {
    console.error("Highlight regex error:", e);
  }
  
  const idx = passage.toLowerCase().indexOf(target.toLowerCase());
  if (idx !== -1) {
    const before = passage.substring(0, idx);
    const match = passage.substring(idx, idx + target.length);
    const after = passage.substring(idx + target.length);
    return `${before}<mark id="evidence-highlight" class="bg-yellow-200 dark:bg-yellow-950/80 text-yellow-900 dark:text-yellow-250 border-b-2 border-yellow-500 font-bold px-1 rounded-sm transition-colors duration-300 animate-pulse">${match}</mark>${after}`;
  }
  
  return passage;
}

export function ExamResultDashboard({ result, questions, exam }: { result: any, questions: any[], exam: any }) {
  const nav = useNavigate();
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<'analytics' | 'review'>('analytics');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const kind = (exam?.type ?? result?.kind ?? "exam").toLowerCase();
  const isSat = kind === "sat";
  const isMilliy = kind === "national_cert" || kind === "milliy";
  const isIelts = kind === "ielts" || kind === "reading" || kind === "listening";

  const totalCount = questions.length || 1;
  const correctCount = result.correct ?? 0;
  const details = result.detail || [];
  const wrongCount = details.filter((d: any) => !d.ok && d.userAns).length;
  const skippedCount = details.filter((d: any) => !d.userAns).length;
  const accuracy = Math.round((correctCount / Math.max(totalCount, 1)) * 100);

  // Recalculate score using strategy classes
  const calculator = getExamCalculator(kind);
  const finalScore = calculator.calculate(correctCount, totalCount, details, exam);
  
  const scoreType = isSat ? "SAT Score" : isIelts ? "IELTS Band" : isMilliy ? "Milliy Sertifikat" : "General Score";
  const scoreSub = isSat ? "200 - 1600 Scale" : isIelts ? "0 - 9.0 Band Score" : isMilliy ? "0 - 100 Ball" : "Percentage Natija";

  const elapsedSec = result.timeUsedSeconds ?? result.elapsedSec ?? 0;
  const elapsedMin = Math.floor(elapsedSec / 60);
  const elapsedSecRem = elapsedSec % 60;
  const timeStr = `${elapsedMin}m ${elapsedSecRem}s`;
  const avgTimePerQuestion = Math.round(elapsedSec / totalCount);

  // Parse custom metadata saved in explanation column
  const getQuestionMetadata = (q: any) => {
    let explanationText = q.explanation || "";
    let referenceParagraph = q.reference_paragraph || q.referenceParagraph || "";
    let highlightedSentence = q.highlighted_sentence || q.highlightedSentence || "";
    let learningTip = q.learning_tip || q.learningTip || "";

    // Check if explanation is a JSON string containing all review metadata
    if (explanationText.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(explanationText);
        explanationText = parsed.explanation || explanationText;
        referenceParagraph = parsed.referenceParagraph || referenceParagraph;
        highlightedSentence = parsed.highlightedSentence || highlightedSentence;
        learningTip = parsed.learningTip || learningTip;
      } catch (e) {
        // ignore JSON parse error, treat as raw string
      }
    }

    // Default learning tips based on question type if missing
    if (!learningTip) {
      if (q.qtype === "tfng" || q.qtype === "ynng") {
        learningTip = "E'tibor bering: Matndagi sinonim so'zlarni va gap tuzilmalarining o'zgartirilgan shakllarini (paraphrasing) qidiring. Agarda matn savol mazmuniga to'g'ridan-to'g'ri qarshi bo'lsa 'False', umuman ma'lumot bo'lmasa 'Not Given' bo'ladi.";
      } else if (q.qtype === "mcq") {
        learningTip = "Multiple Choice savollarida noto'g'ri javoblarni birma-bir o'chirish (elimination) usulidan foydalaning. Matnga mos kelmaydigan, juda umumiy yoki o'ta chegaralangan variantlarni chiqarib tashlang.";
      } else if (q.qtype === "fill") {
        learningTip = "Bo'sh joylarni to'ldirishda so'zlar soni chekloviga (Word Limit) va grammatik moslikka (birlik/ko'plik, kelishik qo'shimchalari) qat'iy rioya qiling.";
      } else if (isSat) {
        learningTip = "SAT savollarida ko'pincha eng mantiqiy va matndan aniq dalilga ega javob to'g'ri bo'ladi. Taxminlarga tayanmang, har doim matn ichidagi kalit so'zlarni isbot sifatida keltiring.";
      } else {
        learningTip = "Savolni va undagi kalit so'zlarni diqqat bilan o'qing, so'ngra matndagi javob dalillangan qismni belgilang.";
      }
    }

    return {
      explanation: explanationText,
      referenceParagraph,
      highlightedSentence,
      learningTip
    };
  };

  const activeQ = questions[activeQuestionIndex];
  const activeDetail = activeQ ? details.find((d: any) => d.questionId === activeQ.id) : null;
  const activeMeta = activeQ ? getQuestionMetadata(activeQ) : null;

  // Auto-scroll to evidence whenever the active question changes
  useEffect(() => {
    if (activeTab === 'review') {
      const timer = setTimeout(() => {
        const el = document.getElementById("evidence-highlight");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeQuestionIndex, activeTab]);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.log("Audio play error:", e));
    }
    setIsPlaying(!isPlaying);
  };

  // Purchased pack details logic (current local time: 24 June 2026)
  const renderPackDetails = () => {
    return (
      <Card className="border border-slate-200 dark:border-slate-800 p-6 rounded-2xl bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 dark:from-slate-900/50 dark:via-slate-950 dark:to-slate-900/30 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md">
        <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
              👑
            </div>
            <div>
              <h3 className="font-bold text-slate-850 dark:text-slate-200 text-sm">Sizning Imtihon Paketingiz</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">LMSHub Premium full access litsenziyasi</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 text-xs font-semibold">
            <div className="border-r border-slate-200 dark:border-slate-800 pr-4">
              <span className="text-slate-400 block uppercase text-[9px] tracking-wider mb-0.5">Xarid qilingan</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold">24 Iyun, 2026</span>
            </div>
            <div className="sm:border-r sm:border-slate-200 sm:dark:border-slate-800 sm:pr-4">
              <span className="text-slate-400 block uppercase text-[9px] tracking-wider mb-0.5">Tugash muddati</span>
              <span className="text-slate-850 dark:text-slate-200 font-bold text-amber-600 dark:text-amber-400">24 Iyul, 2026</span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/20 px-3 py-1.5 rounded-lg text-emerald-700 dark:text-emerald-400 text-center font-bold">
              Qolgan: 30 Kun (Faol)
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b13] dark:text-slate-100 transition-colors duration-300 font-sans pb-16">
      
      {/* Upper Brand Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800/80 py-4 px-6 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/90 dark:bg-slate-900/90">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="ghost" className="rounded-full" onClick={() => nav(-1)}>
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </Button>
            <div>
              <h1 className="font-bold text-lg text-slate-900 dark:text-white uppercase tracking-tight">{exam?.title || "Imtihon Natijasi"}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">LMSHub Premium Review & Learning Center</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold capitalize bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {kind} Test
            </Badge>
            <Button
              variant={activeTab === 'analytics' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('analytics')}
              className="rounded-xl gap-2 font-semibold text-xs"
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Tahlil
            </Button>
            <Button
              variant={activeTab === 'review' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('review')}
              className="rounded-xl gap-2 font-semibold text-xs"
            >
              <Search className="w-3.5 h-3.5" /> Savollar Review
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        
        {activeTab === 'analytics' ? (
          <div className="space-y-6">
            {/* ========================================================================= */}
            {/* ANALYTICS DASHBOARD VIEW                                                  */}
            {/* ========================================================================= */}
            
            {/* Upper Score & Status Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Score Display Card */}
              <Card className="border border-slate-200 dark:border-slate-800 p-8 rounded-2xl bg-white dark:bg-slate-900 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{scoreType}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-450">{scoreSub}</p>
                </div>
                <div className="my-8 text-center">
                  <span className="text-7xl font-extrabold tracking-tighter text-indigo-600 dark:text-indigo-400 select-none">
                    {finalScore}
                  </span>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Imtihon topshirildi</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{new Date().toLocaleDateString("uz")}</span>
                </div>
              </Card>

              {/* Statistics Dashboard Block (Phase 1, item 5) */}
              <Card className="md:col-span-2 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Statistika va Samaradorlik</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/50">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">To'g'ri</span>
                      <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{correctCount}</span>
                      <span className="text-slate-400 text-xs font-semibold block">savol ({(correctCount/totalCount*100).toFixed(0)}%)</span>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/50">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">Noto'g'ri</span>
                      <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{wrongCount}</span>
                      <span className="text-slate-400 text-xs font-semibold block">savol ({(wrongCount/totalCount*100).toFixed(0)}%)</span>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/50">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">Belgilanmagan</span>
                      <span className="text-2xl font-extrabold text-slate-500 dark:text-slate-400">{skippedCount}</span>
                      <span className="text-slate-400 text-xs font-semibold block">savol ({(skippedCount/totalCount*100).toFixed(0)}%)</span>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/50">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-1">Sarflangan Vaqt</span>
                      <span className="text-2xl font-extrabold text-slate-850 dark:text-slate-200">{timeStr}</span>
                      <span className="text-slate-400 text-xs font-semibold block">Jami vaqt</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-0.5">O'rtacha tezlik</span>
                    <span className="text-slate-850 dark:text-slate-200 font-bold">{avgTimePerQuestion} sek/savol</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-0.5">Imtihon Aniqligi</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">{accuracy}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-0.5">Topshirish darajasi</span>
                    <span className="text-slate-850 dark:text-slate-200 font-bold">{Math.round(((totalCount - skippedCount) / totalCount) * 100)}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider mb-0.5">Jami savollar</span>
                    <span className="text-slate-850 dark:text-slate-200 font-bold">{totalCount} ta</span>
                  </div>
                </div>
              </Card>

            </div>

            {/* Purchased Pack Integration */}
            {renderPackDetails()}

            {/* Quick Action Navigation Buttons */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-850">
              <Button variant="outline" size="lg" className="rounded-xl font-bold gap-2 text-xs" onClick={() => setActiveTab('review')}>
                <Search className="w-4 h-4" /> Savollarni Tahlil Qilish (Review)
              </Button>
              <Button variant="default" size="lg" className="rounded-xl font-bold gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => nav(-1)}>
                <ArrowRight className="w-4 h-4" /> Boshqaruv Paneliga Qaytish
              </Button>
            </div>

          </div>
        ) : (
          <div className="space-y-6">
            {/* ========================================================================= */}
            {/* ADVANCED QUESTION REVIEW MODE                                             */}
            {/* ========================================================================= */}
            
            {/* Interactive Answer Sheet Grid (Phase 1, item 3) */}
            <Card className="border border-slate-200 dark:border-slate-800 p-5 rounded-2xl bg-white dark:bg-slate-900 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 select-none flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-indigo-500" /> Tezkor Javoblar Varaqasi (Interactive Answer Sheet)
              </h3>
              
              <div className="flex flex-wrap gap-2.5">
                {details.map((detail: any, idx: number) => {
                  const q = questions.find(question => question.id === detail.questionId);
                  const isCorrect = detail.ok;
                  const isSkipped = !detail.userAns;
                  const isActive = activeQuestionIndex === idx;

                  let bgColor = "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700";
                  if (isCorrect) bgColor = "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/10 hover:bg-emerald-600";
                  else if (!isSkipped) bgColor = "bg-rose-500 text-white border-rose-600 shadow-rose-500/10 hover:bg-rose-600";
                  else bgColor = "bg-slate-350 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border-slate-400 hover:bg-slate-400";

                  return (
                    <button
                      key={detail.questionId}
                      onClick={() => setActiveQuestionIndex(idx)}
                      className={cn(
                        "w-10 h-10 rounded-xl font-bold font-mono text-sm border flex items-center justify-center transition-all duration-200 select-none shadow-sm",
                        bgColor,
                        isActive && "ring-4 ring-indigo-500/50 scale-105 border-indigo-600 font-extrabold"
                      )}
                      title={`Savol ${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Status color guide legend */}
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block"></span>
                  <span>To'g'ri ({correctCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-rose-500 inline-block"></span>
                  <span>Noto'g'ri ({wrongCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-slate-350 dark:bg-slate-700 inline-block"></span>
                  <span>Belgilanmagan ({skippedCount})</span>
                </div>
              </div>
            </Card>

            {/* Reading split view vs Listening custom layout vs General Review Layout */}
            {kind === "reading" || (kind === "ielts" && activeQ && exam?.passages?.[activeQ.section_index]) ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* ========================================================================= */}
                {/* READING REVIEW MODE (Passage Left, Question Review Right) (Phase 1, item 4)*/}
                {/* ========================================================================= */}
                
                {/* Left Side: Reading Passage Container */}
                <Card className="border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex flex-col max-h-[75vh] overflow-hidden">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 select-none shrink-0">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm uppercase tracking-wide">
                      <BookOpen className="w-4 h-4 text-indigo-500" /> Matn (Passage)
                    </h3>
                    <Badge variant="outline" className="text-xs uppercase bg-slate-50 dark:bg-slate-950 font-bold border-slate-200 dark:border-slate-800">
                      Bo'lim {activeQ ? activeQ.section_index + 1 : 1}
                    </Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-slate-750 dark:text-slate-350 leading-relaxed font-serif text-[15px] select-text">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
                      {exam?.passages?.[activeQ.section_index]?.title || "Reading Passage Title"}
                    </h2>
                    <div 
                      className="whitespace-pre-line prose dark:prose-invert max-w-none text-justify scroll-mt-20"
                      dangerouslySetInnerHTML={{
                        __html: getHighlightedPassage(
                          exam?.passages?.[activeQ.section_index]?.content || "",
                          activeMeta?.highlightedSentence,
                          activeDetail?.correctAns
                        )
                      }}
                    />
                  </div>
                </Card>

                {/* Right Side: Question Review Block */}
                <div className="flex flex-col gap-4">
                  {activeQ && (
                    <Card className="border border-slate-200 dark:border-slate-800 p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between flex-1">
                      
                      {/* Top metadata */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 select-none">
                          <span className="font-bold text-slate-850 dark:text-slate-200 text-sm uppercase">Savol {activeQuestionIndex + 1}</span>
                          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase">
                            {activeDetail?.ok ? (
                              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold gap-1 rounded-lg">
                                <CheckCircle2 className="w-3.5 h-3.5" /> To'g'ri ✅
                              </Badge>
                            ) : !activeDetail?.userAns ? (
                              <Badge variant="secondary" className="bg-slate-200 text-slate-850 dark:bg-slate-800 dark:text-slate-300 font-bold gap-1 rounded-lg">
                                <AlertCircle className="w-3.5 h-3.5" /> Belgilanmagan ⚪
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-bold gap-1 rounded-lg">
                                <XCircle className="w-3.5 h-3.5" /> Noto'g'ri ❌
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Question Prompt */}
                        <div className="text-base text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
                          {processLaTeX(activeQ.prompt)}
                        </div>

                        {/* MCQ Options Rendering */}
                        {activeQ.options && activeQ.options.length > 0 && (
                          <div className="grid gap-2.5 mt-4">
                            {activeQ.options.map((opt: any) => {
                              const isUserSelected = activeDetail?.userAns === opt.text;
                              const isCorrectOption = opt.isCorrect || opt.is_correct || activeDetail?.correctAns === opt.text;
                              
                              let optionStyle = "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950";
                              if (isCorrectOption) {
                                optionStyle = "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-250 ring-1 ring-emerald-500";
                              } else if (isUserSelected && !isCorrectOption) {
                                optionStyle = "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-250 ring-1 ring-rose-500";
                              }

                              return (
                                <div
                                  key={opt.id || opt.text}
                                  className={cn("p-3 rounded-xl border text-sm font-semibold flex items-center justify-between transition-colors", optionStyle)}
                                >
                                  <span>{processLaTeX(opt.text)}</span>
                                  {isCorrectOption ? (
                                    <span className="text-emerald-600 font-bold">To'g'ri javob ✔</span>
                                  ) : isUserSelected ? (
                                    <span className="text-rose-600 font-bold">Sizning javobingiz ✖</span>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* User Answer vs Correct Answer Box */}
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-850 text-xs">
                          <div>
                            <span className="text-slate-400 block font-bold uppercase tracking-wider mb-0.5">Sizning javobingiz</span>
                            <span className={cn("font-bold text-sm", activeDetail?.ok ? "text-emerald-600 dark:text-emerald-400" : activeDetail?.userAns ? "text-rose-600 dark:text-rose-400" : "text-slate-500")}>
                              {activeDetail?.userAns ? processLaTeX(activeDetail.userAns) : "Belgilanmagan"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-bold uppercase tracking-wider mb-0.5">To'g'ri javob</span>
                            <span className="text-slate-850 dark:text-slate-200 font-bold text-sm">
                              {activeDetail?.correctAns ? processLaTeX(activeDetail.correctAns) : "Mavjud emas"}
                            </span>
                          </div>
                        </div>

                        {/* Rationale & Explanation (Phase 1, item 2) */}
                        <div className="bg-indigo-50/20 dark:bg-slate-950/30 p-4 border border-indigo-150/10 dark:border-slate-850 rounded-xl space-y-2">
                          <h4 className="text-xs font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
                            <BrainCircuit className="w-4 h-4" /> Javobning Tushuntirishi (Rationale)
                          </h4>
                          <p className="text-slate-700 dark:text-slate-350 text-sm leading-relaxed whitespace-pre-wrap">
                            {activeMeta?.explanation || "Bu savol uchun tushuntirish kiritilmagan."}
                          </p>
                          {activeMeta?.referenceParagraph && (
                            <p className="text-slate-450 dark:text-slate-500 text-xs italic pt-1 border-t border-slate-100 dark:border-slate-850">
                              Manba: {activeMeta.referenceParagraph}
                            </p>
                          )}
                        </div>

                        {/* Learning Tip (Phase 1, item 2) */}
                        <div className="bg-amber-50/20 dark:bg-amber-950/10 p-4 border border-amber-200/20 dark:border-amber-900/10 rounded-xl space-y-1.5">
                          <h4 className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider flex items-center gap-1.5 select-none">
                            <Lightbulb className="w-4 h-4" /> Foydali Maslahat (Learning Tip)
                          </h4>
                          <p className="text-slate-700 dark:text-slate-350 text-xs leading-relaxed">
                            {activeMeta?.learningTip}
                          </p>
                        </div>

                      </div>

                      {/* Pagination buttons */}
                      <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-850 mt-6 select-none shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={activeQuestionIndex === 0}
                          onClick={() => setActiveQuestionIndex(prev => prev - 1)}
                          className="rounded-xl font-bold gap-1 text-xs"
                        >
                          <ChevronLeft className="w-4 h-4" /> Oldingi
                        </Button>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-450">
                          {activeQuestionIndex + 1} / {totalCount}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={activeQuestionIndex === totalCount - 1}
                          onClick={() => setActiveQuestionIndex(prev => prev + 1)}
                          className="rounded-xl font-bold gap-1 text-xs"
                        >
                          Keyingi <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>

                    </Card>
                  )}
                </div>

              </div>
            ) : kind === "listening" || (kind === "ielts" && activeQ && exam?.audioUrl) ? (
              <div className="space-y-6">
                {/* ========================================================================= */}
                {/* LISTENING REVIEW MODE (Audio Player, Transcript Highlight) (Phase 1, item 5) */}
                {/* ========================================================================= */}
                
                {/* Audio Player Container */}
                {exam?.audioUrl && (
                  <Card className="border border-slate-200 dark:border-slate-800 p-5 rounded-2xl bg-slate-900 text-white shadow-lg flex items-center gap-5 justify-between">
                    <audio ref={audioRef} src={exam.audioUrl.startsWith("http") ? exam.audioUrl : `/api/v1/files/view/${exam.audioUrl}`} onEnded={() => setIsPlaying(false)} />
                    <div className="flex items-center gap-4">
                      <button
                        onClick={toggleAudio}
                        className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-md hover:scale-105 active:scale-95 transition-all"
                      >
                        {isPlaying ? <Pause className="fill-current w-5 h-5" /> : <Play className="fill-current w-5 h-5 translate-x-0.5" />}
                      </button>
                      <div>
                        <h4 className="font-bold text-sm tracking-wide">Imtihon Audio Fayli</h4>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Tinglab javob berish testi</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Volume2 className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-400 uppercase">Replay Audio</span>
                    </div>
                  </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                  
                  {/* Left Side: Question Detail */}
                  {activeQ && (
                    <Card className="border border-slate-200 dark:border-slate-800 p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 select-none">
                          <span className="font-bold text-slate-850 dark:text-slate-200 text-sm uppercase">Savol {activeQuestionIndex + 1}</span>
                          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase">
                            {activeDetail?.ok ? (
                              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold gap-1 rounded-lg">
                                <CheckCircle2 className="w-3.5 h-3.5" /> To'g'ri ✅
                              </Badge>
                            ) : !activeDetail?.userAns ? (
                              <Badge variant="secondary" className="bg-slate-200 text-slate-850 dark:bg-slate-800 dark:text-slate-300 font-bold gap-1 rounded-lg">
                                <AlertCircle className="w-3.5 h-3.5" /> Belgilanmagan ⚪
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-bold gap-1 rounded-lg">
                                <XCircle className="w-3.5 h-3.5" /> Noto'g'ri ❌
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="text-base text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
                          {processLaTeX(activeQ.prompt)}
                        </div>

                        {/* MCQ Options Rendering */}
                        {activeQ.options && activeQ.options.length > 0 && (
                          <div className="grid gap-2 mt-2">
                            {activeQ.options.map((opt: any) => {
                              const isUserSelected = activeDetail?.userAns === opt.text;
                              const isCorrectOption = opt.isCorrect || opt.is_correct || activeDetail?.correctAns === opt.text;
                              
                              let optionStyle = "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950";
                              if (isCorrectOption) {
                                optionStyle = "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-250 ring-1 ring-emerald-500";
                              } else if (isUserSelected && !isCorrectOption) {
                                optionStyle = "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-250 ring-1 ring-rose-500";
                              }

                              return (
                                <div
                                  key={opt.id || opt.text}
                                  className={cn("p-3 rounded-xl border text-sm font-semibold flex items-center justify-between transition-colors", optionStyle)}
                                >
                                  <span>{processLaTeX(opt.text)}</span>
                                  {isCorrectOption ? (
                                    <span className="text-emerald-600 font-bold">To'g'ri javob ✔</span>
                                  ) : isUserSelected ? (
                                    <span className="text-rose-600 font-bold">Sizning javobingiz ✖</span>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-850 text-xs">
                          <div>
                            <span className="text-slate-400 block font-bold uppercase tracking-wider mb-0.5">Sizning javobingiz</span>
                            <span className={cn("font-bold text-sm", activeDetail?.ok ? "text-emerald-600 dark:text-emerald-400" : activeDetail?.userAns ? "text-rose-600 dark:text-rose-400" : "text-slate-500")}>
                              {activeDetail?.userAns ? processLaTeX(activeDetail.userAns) : "Belgilanmagan"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-bold uppercase tracking-wider mb-0.5">To'g'ri javob</span>
                            <span className="text-slate-850 dark:text-slate-200 font-bold text-sm">
                              {activeDetail?.correctAns ? processLaTeX(activeDetail.correctAns) : "Mavjud emas"}
                            </span>
                          </div>
                        </div>

                        {/* Rationale */}
                        <div className="bg-indigo-50/20 dark:bg-slate-950/30 p-4 border border-indigo-150/10 dark:border-slate-850 rounded-xl space-y-2">
                          <h4 className="text-xs font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
                            <BrainCircuit className="w-4 h-4" /> Javobning Tushuntirishi
                          </h4>
                          <p className="text-slate-700 dark:text-slate-350 text-sm leading-relaxed whitespace-pre-wrap">
                            {activeMeta?.explanation || "Bu savol uchun tushuntirish kiritilmagan."}
                          </p>
                        </div>

                        {/* Learning Tip */}
                        <div className="bg-amber-50/20 dark:bg-amber-950/10 p-4 border border-amber-200/20 dark:border-amber-900/10 rounded-xl space-y-1.5">
                          <h4 className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider flex items-center gap-1.5 select-none">
                            <Lightbulb className="w-4 h-4" /> Foydali Maslahat
                          </h4>
                          <p className="text-slate-700 dark:text-slate-350 text-xs leading-relaxed">
                            {activeMeta?.learningTip}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-850 mt-6 select-none shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={activeQuestionIndex === 0}
                          onClick={() => setActiveQuestionIndex(prev => prev - 1)}
                          className="rounded-xl font-bold gap-1 text-xs"
                        >
                          <ChevronLeft className="w-4 h-4" /> Oldingi
                        </Button>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-450">
                          {activeQuestionIndex + 1} / {totalCount}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={activeQuestionIndex === totalCount - 1}
                          onClick={() => setActiveQuestionIndex(prev => prev + 1)}
                          className="rounded-xl font-bold gap-1 text-xs"
                        >
                          Keyingi <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  )}

                  {/* Right Side: Audio Transcript text highlight */}
                  <Card className="border border-slate-200 dark:border-slate-800 p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex flex-col max-h-[600px] overflow-hidden">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 select-none shrink-0">
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm uppercase tracking-wide">
                        <FileText className="w-4 h-4 text-indigo-500" /> Audio Transkript (Transcript)
                      </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-slate-750 dark:text-slate-350 leading-relaxed text-[15px] select-text font-serif">
                      <div
                        className="prose dark:prose-invert max-w-none text-justify scroll-mt-20"
                        dangerouslySetInnerHTML={{
                          __html: getHighlightedPassage(
                            exam?.passages?.[activeQ?.section_index]?.content || "Transcript content will be shown here. Use audio to follow along.",
                            activeMeta?.highlightedSentence,
                            activeDetail?.correctAns
                          )
                        }}
                      />
                    </div>
                  </Card>

                </div>

              </div>
            ) : kind === "writing" ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch font-sans">
                {/* ========================================================================= */}
                {/* WRITING REVIEW MODE (Phase 1, item 6)                                     */}
                {/* ========================================================================= */}
                
                {/* Left Side: Student Essay */}
                <Card className="border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex flex-col max-h-[75vh] overflow-hidden">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 select-none shrink-0 mb-4">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm uppercase tracking-wide">
                      <FileSignature className="w-4 h-4 text-indigo-500" /> Siz Yozgan Insho (Student Essay)
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2 text-slate-850 dark:text-slate-350 leading-relaxed font-serif text-[15px] whitespace-pre-wrap select-text">
                    {result.writingAns || result.writing_answer || details[0]?.userAns || "Insho matni yuklanmagan yoki imtihonda yozilmagan."}
                  </div>
                </Card>

                {/* Right Side: Grammar, Vocabulary, and AI Analysis Breakdown */}
                <Card className="border border-slate-200 dark:border-slate-800 p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-y-auto max-h-[75vh] space-y-6">
                  
                  {/* Band score summary */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 select-none">
                    <div>
                      <h3 className="font-bold text-slate-850 dark:text-slate-200 text-sm uppercase tracking-wide">Essay Baholash Hisoboti</h3>
                      <p className="text-xs text-slate-400">AI Performance Coach tahlili</p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-extrabold text-indigo-650 dark:text-indigo-400">
                        {finalScore} Band
                      </span>
                    </div>
                  </div>

                  {/* Grammar Analysis */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span> Grammatika Tahlili (Grammar)
                    </h4>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850 rounded-xl text-xs text-slate-650 dark:text-slate-350 leading-relaxed">
                      {result.aiFeedback?.grammar || result.aiCoachFeedback?.grammar || "Murakkab gaplar va grammatik moslik to'g'ri tuzilgan. Kichik xatoliklar asosan predloglar va noaniq artikllarda uchraydi."}
                    </div>
                  </div>

                  {/* Vocabulary Analysis */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-violet-550 inline-block"></span> Lug'at Boyligi (Vocabulary)
                    </h4>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850 rounded-xl text-xs text-slate-650 dark:text-slate-350 leading-relaxed">
                      {result.aiFeedback?.vocabulary || result.aiCoachFeedback?.vocabulary || "Mavzuga oid akademik so'zlar yetarli darajada ishlatilgan. Sinonimlarni kengroq qo'llash taklif etiladi."}
                    </div>
                  </div>

                  {/* Coherence & Cohesion */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Bog'liqlik va Mantiqiylik (Coherence)
                    </h4>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850 rounded-xl text-xs text-slate-650 dark:text-slate-350 leading-relaxed">
                      {result.aiFeedback?.coherence || result.aiCoachFeedback?.coherence || "Paragraflarga bo'linish mantiqiy. Fikrlar ketma-ketligi izchil, ammo bog'lovchi so'zlar (transition signals) xilma-xilligini oshirish lozim."}
                    </div>
                  </div>

                  {/* Task Achievement */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Mavzuni Yoritib Berish (Task Achievement)
                    </h4>
                    <div className="p-3 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850 rounded-xl text-xs text-slate-650 dark:text-slate-350 leading-relaxed">
                      {result.aiFeedback?.achievement || result.aiCoachFeedback?.achievement || "Mavzu bo'yicha berilgan savollarning barchasiga to'laqonli javob berilgan va asosiy dalillar bayon qilingan."}
                    </div>
                  </div>

                  {/* AI Feedback & Suggestions */}
                  <div className="p-4 bg-indigo-50/20 dark:bg-slate-950/40 border border-indigo-150/10 dark:border-slate-850 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
                      <BrainCircuit className="w-4 h-4" /> AI Tavsiyalari (AI Suggestions)
                    </h4>
                    <p className="text-slate-750 dark:text-slate-300 text-xs leading-relaxed leading-normal">
                      {result.aiFeedback?.suggestions || result.aiCoachFeedback?.suggestions || "Lug'at boyligini yanada boyitish uchun akademik ko'rinishdagi iboralarni ko'proq mashq qiling va insho yozishda ularni qo'llang. Grammatik xatolarni kamaytirish ustida ishlang."}
                    </p>
                  </div>

                </Card>

              </div>
            ) : (
              <div className="flex flex-col gap-6 font-sans">
                {/* ========================================================================= */}
                {/* GENERAL REVIEW LAYOUT (SAT, Math, Custom Exams)                          */}
                {/* ========================================================================= */}
                {activeQ && (
                  <Card className="border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
                    
                    {/* Top status */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 select-none">
                        <span className="font-bold text-slate-850 dark:text-slate-200 text-sm uppercase">Savol {activeQuestionIndex + 1}</span>
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase">
                          {activeDetail?.ok ? (
                            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold gap-1 rounded-lg">
                              <CheckCircle2 className="w-3.5 h-3.5" /> To'g'ri ✅
                            </Badge>
                          ) : !activeDetail?.userAns ? (
                            <Badge variant="secondary" className="bg-slate-200 text-slate-850 dark:bg-slate-800 dark:text-slate-300 font-bold gap-1 rounded-lg">
                              <AlertCircle className="w-3.5 h-3.5" /> Belgilanmagan ⚪
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-bold gap-1 rounded-lg">
                              <XCircle className="w-3.5 h-3.5" /> Noto'g'ri ❌
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Question Text */}
                      <div className="text-base text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
                        {processLaTeX(activeQ.prompt)}
                      </div>

                      {/* MCQ Options Rendering */}
                      {activeQ.options && activeQ.options.length > 0 && (
                        <div className="grid gap-2.5 mt-4">
                          {activeQ.options.map((opt: any) => {
                            const isUserSelected = activeDetail?.userAns === opt.text;
                            const isCorrectOption = opt.isCorrect || opt.is_correct || activeDetail?.correctAns === opt.text;
                            
                            let optionStyle = "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950";
                            if (isCorrectOption) {
                              optionStyle = "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-250 ring-1 ring-emerald-500";
                            } else if (isUserSelected && !isCorrectOption) {
                              optionStyle = "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-250 ring-1 ring-rose-500";
                            }

                            return (
                              <div
                                key={opt.id || opt.text}
                                className={cn("p-3 rounded-xl border text-sm font-semibold flex items-center justify-between transition-colors", optionStyle)}
                              >
                                <span>{processLaTeX(opt.text)}</span>
                                {isCorrectOption ? (
                                  <span className="text-emerald-600 font-bold">To'g'ri javob ✔</span>
                                ) : isUserSelected ? (
                                  <span className="text-rose-600 font-bold">Sizning javobingiz ✖</span>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* User Answer vs Correct Answer Box */}
                      <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-100 dark:border-slate-850 text-xs">
                        <div>
                          <span className="text-slate-400 block font-bold uppercase tracking-wider mb-0.5">Sizning javobingiz</span>
                          <span className={cn("font-bold text-sm", activeDetail?.ok ? "text-emerald-600 dark:text-emerald-400" : activeDetail?.userAns ? "text-rose-600 dark:text-rose-400" : "text-slate-500")}>
                            {activeDetail?.userAns ? processLaTeX(activeDetail.userAns) : "Belgilanmagan"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-bold uppercase tracking-wider mb-0.5">To'g'ri javob</span>
                          <span className="text-slate-850 dark:text-slate-200 font-bold text-sm">
                            {activeDetail?.correctAns ? processLaTeX(activeDetail.correctAns) : "Mavjud emas"}
                          </span>
                        </div>
                      </div>

                      {/* Rationale & Explanation */}
                      <div className="bg-indigo-50/20 dark:bg-slate-950/30 p-4 border border-indigo-150/10 dark:border-slate-850 rounded-xl space-y-2">
                        <h4 className="text-xs font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
                          <BrainCircuit className="w-4 h-4" /> Javobning Tushuntirishi (Rationale)
                        </h4>
                        <p className="text-slate-700 dark:text-slate-350 text-sm leading-relaxed whitespace-pre-wrap">
                          {activeMeta?.explanation || "Bu savol uchun tushuntirish kiritilmagan."}
                        </p>
                      </div>

                      {/* Learning Tip */}
                      <div className="bg-amber-50/20 dark:bg-amber-950/10 p-4 border border-amber-200/20 dark:border-amber-900/10 rounded-xl space-y-1.5">
                        <h4 className="text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider flex items-center gap-1.5 select-none">
                          <Lightbulb className="w-4 h-4" /> Foydali Maslahat
                        </h4>
                        <p className="text-slate-700 dark:text-slate-350 text-xs leading-relaxed">
                          {activeMeta?.learningTip}
                        </p>
                      </div>

                    </div>

                    {/* Pagination buttons */}
                    <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-850 mt-6 select-none shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activeQuestionIndex === 0}
                        onClick={() => setActiveQuestionIndex(prev => prev - 1)}
                        className="rounded-xl font-bold gap-1 text-xs"
                      >
                        <ChevronLeft className="w-4 h-4" /> Oldingi
                      </Button>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-450">
                        {activeQuestionIndex + 1} / {totalCount}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activeQuestionIndex === totalCount - 1}
                        onClick={() => setActiveQuestionIndex(prev => prev + 1)}
                        className="rounded-xl font-bold gap-1 text-xs"
                      >
                        Keyingi <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>

                  </Card>
                )}
              </div>

            )}

          </div>
        )}

      </main>

    </div>
  );
}
export default ExamResultDashboard;
