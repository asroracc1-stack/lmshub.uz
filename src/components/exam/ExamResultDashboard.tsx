import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, BrainCircuit, LineChart, FastForward, Timer, XCircle, PlayCircle, BarChart3, Bookmark, FileText, ChevronRight, ShieldAlert, ShieldCheck, History, Target, Loader2
} from "lucide-react";
import { satScore, milliyScore, scoreLevel, rawToBand } from "@/lib/ielts";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { formatMathText } from "@/lib/math";

function processLaTeX(text: string) {
  return formatMathText(text);
}

const UZ_DICTIONARY: Record<string, string> = {
  // Topics/skills translation
  "Reading speed": "Matn o'qish tezligi",
  "Algebra II": "Algebra II (Murakkab algebra)",
  "Advanced Vocabulary": "Kengaytirilgan lug'at boyligi",
  "Time Management": "Vaqtni rejalashtirish",
  "Answering core questions": "Asosiy savollarga javob berish",
  "Complex word problems": "Murakkab matnli masalalar",
  "Geometry": "Geometriya",
  "Trigonometry": "Trigonometriya",
  "Data Analysis": "Ma'lumotlar tahlili",
  "Grammar rules": "Grammatika qoidalari",
  "Listening comprehension": "Eshitib tushunish",
  "Reading comprehension": "O'qib tushunish",
  "Math calculations": "Matematik hisob-kitoblar",

  // Generic fallback sentences
  "Great job completing the exam! You demonstrated a solid foundation. Focus your next 3 study sessions on the recommended topics to push your score even higher.":
    "Imtihonni muvaffaqiyatli yakunlaganingiz bilan tabriklaymiz! Siz mustahkam bilim poydevorini namoyish etdingiz. Keyingi 3 ta o'quv mashg'ulotingizni ko'rsatilgan tavsiyaviy mavzularga yo'naltirsangiz, natijangiz yanada yuqori bo'ladi.",
  "You did well on": "Siz ushbu mavzularda yaxshi natija ko'rsatdingiz:",
  "Focus on improving": "Quyidagi kamchiliklarni yaxshilash ustida ishlang:",
  "Try to practice": "Ko'proq quyidagi mavzularda mashq qiling:"
};

function translateFeedbackToUz(text: string): string {
  if (!text) return "";
  let res = text;
  Object.entries(UZ_DICTIONARY).forEach(([en, uz]) => {
    const escaped = en.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escaped, "gi");
    res = res.replace(regex, uz);
  });
  return res;
}

function translateArrayToUz(arr: any[] | null | undefined): string[] {
  if (!arr) return [];
  return arr.map(item => {
    if (typeof item === 'string') {
      return translateFeedbackToUz(item);
    }
    return String(item);
  });
}

export function ExamResultDashboard({ result, questions, exam }: { result: any, questions: any[], exam: any }) {
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'correct' | 'incorrect' | 'omitted'>('all');
  const [interactiveModalType, setInteractiveModalType] = useState<'correct' | 'incorrect' | 'omitted' | null>(null);
  const nav = useNavigate();
  const { role } = useAuth();

  const [currentResult, setCurrentResult] = useState(result);

  useEffect(() => {
    if (currentResult?.aiCoachFeedback) return;

    let intervalId: any;
    
    const pollResult = async () => {
      try {
        const res = await api.get(`/student/exams/${exam?.id}/result`);
        if (res.data && res.data.aiCoachFeedback) {
          setCurrentResult((prev: any) => ({
            ...prev,
            aiCoachFeedback: res.data.aiCoachFeedback,
            predictedScore: res.data.predictedScore,
            detail: prev.detail.map((d: any) => {
              const freshDetail = res.data.detail?.find((fd: any) => fd.questionId === d.questionId);
              return freshDetail ? { ...d, aiExplanation: freshDetail.aiExplanation } : d;
            })
          }));
          clearInterval(intervalId);
        }
      } catch (e) {
        console.error("Error polling exam result:", e);
      }
    };

    intervalId = setInterval(pollResult, 3000);

    return () => clearInterval(intervalId);
  }, [exam?.id, currentResult?.aiCoachFeedback]);

  const kind = (currentResult.kind ?? "exam").toLowerCase();
  const isSat = kind === "sat";
  const isMilliy = kind === "national_cert" || kind === "milliy";
  const isIelts = kind === "ielts" || kind === "reading" || kind === "listening";

  const totalCount = questions.length || 1;
  const correctCount = currentResult.correct ?? 0;
  
  const details = currentResult.detail || [];
  const wrongCount = details.filter((d: any) => !d.ok && d.userAns).length;
  const skippedCount = details.filter((d: any) => !d.userAns).length;
  
  const accuracy = Math.round((correctCount / Math.max(totalCount, 1)) * 100);

  const satPts = satScore(correctCount, totalCount);
  const milliyPts = milliyScore(correctCount, totalCount);
  const band = currentResult.bandScore ?? currentResult.band ?? 0;

  const elapsedSec = currentResult.timeUsedSeconds ?? currentResult.elapsedSec ?? 0;
  const elapsedMin = Math.floor(elapsedSec / 60);
  const elapsedSecRem = elapsedSec % 60;
  const timeStr = `${elapsedMin}m ${elapsedSecRem}s`;

  const avgTimePerQuestion = Math.round(elapsedSec / totalCount);
  const timeSpentMap = currentResult.timeSpent || {};
  let fastest = Infinity;
  let slowest = 0;
  Object.values(timeSpentMap).forEach((t: any) => {
    if (t < fastest) fastest = t;
    if (t > slowest) slowest = t;
  });
  if (fastest === Infinity) fastest = 0;

  const topicStats: Record<string, { correct: number, total: number }> = {};
  questions.forEach(q => {
    if (!topicStats[q.qtype]) topicStats[q.qtype] = { correct: 0, total: 0 };
    topicStats[q.qtype].total += 1;
  });
  details.forEach((d: any) => {
    const q = questions.find(question => question.id === d.questionId);
    if (q && d.ok) {
      topicStats[q.qtype].correct += 1;
    }
  });

  const getExplanation = (qtype: string, correct: string, user: string) => {
    const c = `"${correct}"`;
    if (isMilliy) {
      if (qtype === "mcq") return `Ko'p variantli savol. To'g'ri javob: ${c}.`;
      if (qtype === "fill") return `Bo'sh joyni to'ldirish savoli. Matn yoki hisob-kitob bo'yicha to'g'ri qiymat: ${c}.`;
      return `To'g'ri javob rasmiy ravishda ${c} deb belgilangan.`;
    }
    if (qtype === "tfng") return `True/False/Not Given format: If the text agrees, it is True. If it contradicts, it is False. If there is no information, it is Not Given. The correct answer based on the text is ${c}.`;
    if (qtype === "ynng") return `Yes/No/Not Given format: Identifies writer's claims. Correct answer is ${c}.`;
    if (qtype === "mcq") return `Multiple Choice Questions require identifying paraphrased information. The correct option is ${c}.`;
    if (qtype === "fill") return `Fill in the Blanks require exact wording from the passage. The correct word(s): ${c}.`;
    return `The correct answer is officially designated as ${c}.`;
  };

  const finalScore = isSat ? satPts : isMilliy ? milliyPts : isIelts ? (band || "0.0") : `${accuracy}%`;
  const scoreType = isSat ? "Total Score" : isMilliy ? "Taxminiy Ball" : isIelts ? "Band Score" : "Accuracy";

  // Uzbek Localization strings
  const tOfficialReport = isMilliy ? "Rasmiy Natija Hisoboti" : "Official Score Report";
  const tTestDate = isMilliy ? "Imtihon topshirilgan sana" : "Test Date";
  const tCandidateId = isMilliy ? "Talaba ID" : "Candidate ID";
  const tPredictedScore = isMilliy ? "Yakuniy natija" : "Predicted Result";
  
  const tTotalQuestions = isMilliy ? "Jami Savollar" : "Total Questions";
  const tCorrect = isMilliy ? "To'g'ri javoblar" : "Correct";
  const tIncorrect = isMilliy ? "Noto'g'ri javoblar" : "Incorrect";
  const tOmitted = isMilliy ? "Belgilanmagan savollar" : "Omitted";
  const tTotalTimeUsed = isMilliy ? "Sarflangan vaqt" : "Total Time Used";
  const tAccuracy = isMilliy ? "Foiz ko'rsatkichi" : "Accuracy";

  const tCorrectTag = isMilliy ? "To'g'ri" : "Correct";
  const tIncorrectTag = isMilliy ? "Noto'g'ri" : "Incorrect";
  const tOmittedTag = isMilliy ? "Belgilanmagan" : "Omitted";

  const tCoachTitle = isMilliy ? "Sun'iy Intellekt Tahlili" : "AI Performance Coach";
  const tCoachLoadingDesc = isMilliy ? "Sun'iy intellekt xatolaringiz va ko'rsatkichlaringizni tahlil qilib, tavsiyalar tayyorlamoqda..." : "AI is analyzing your exam details to generate personalized feedback...";
  const tCoachLoadingMetrics = isMilliy ? "Ko'rsatkichlar tahlil qilinmoqda..." : "Gathering test metrics...";
  const tCoachLoadedDesc = isMilliy ? "Imtihon natijalaringiz asosida tayyorlangan tahliliy hisobot" : "Personalized feedback based on your exam data";

  const tStrengths = isMilliy ? "Kuchli tomonlar" : "Core Strengths";
  const tWeaknesses = isMilliy ? "Zaif tomonlar" : "Areas for Improvement";
  const tStudyPlan = isMilliy ? "Tavsiya etilgan reja" : "Study Plan";
  const tFocusTopics = isMilliy ? "E'tibor qaratilishi lozim bo'lgan mavzular" : "Focus Topics";
  const tNoStrengths = isMilliy ? "Kuchli tomonlar topilmadi." : "No strengths recorded.";
  const tNoWeaknesses = isMilliy ? "Kamchiliklar aniqlanmadi." : "No weaknesses recorded.";

  const tDomainPerformance = isMilliy ? "Mavzular bo'yicha samaradorlik" : "Domain Performance";
  const tTimingAnalytics = isMilliy ? "Vaqt sarfi tahlili" : "Timing Analytics";
  const tAvgPace = isMilliy ? "O'rtacha tezlik" : "Average Pace";
  const tFastest = isMilliy ? "Eng tezkor javob" : "Fastest Response";
  const tSlowest = isMilliy ? "Eng sekin javob" : "Slowest Response";
  const tPaceUnit = isMilliy ? "soniya/savol" : "sec/item";
  const tSecUnit = isMilliy ? "soniya" : "sec";

  const tDetailedAnalysis = isMilliy ? "Savollar bo'yicha batafsil tahlil" : "Detailed Item Analysis";
  const tCandidateResponse = isMilliy ? "Sizning javobingiz" : "Candidate Response";
  const tDesignatedCorrect = isMilliy ? "To'g'ri javob" : "Designated Correct Answer";
  const tRationaleTitle = isMilliy ? "Savolning to'liq yechimi va tushuntirishi" : "Item Rationale & Analysis";
  const tRationaleGenerating = isMilliy ? "Tushuntirish shakllantirilmoqda..." : "AI explanation is generating...";

  const tEndReport = isMilliy ? "Rasmiy natija hisoboti yakuni" : "End of Official Score Report";
  const tValidationCode = isMilliy ? "Xavfsizlik tekshiruv kodi" : "Secure validation code";
  const tReturnButton = isMilliy ? "Platformaga qaytish" : "Return to Platform";

  return (
    <div className={cn(
      "min-h-screen py-8 font-serif text-slate-900 transition-colors",
      isMilliy 
        ? "bg-[#f1f5f9] dark:bg-[#060b13] dark:text-slate-100 selection:bg-emerald-200" 
        : "bg-[#e5e7eb] dark:bg-[#0c0817] dark:text-slate-100 selection:bg-blue-200"
    )}>
      <div className={cn(
        "max-w-[900px] mx-auto bg-white shadow-2xl border transition-colors rounded-2xl overflow-hidden",
        isMilliy 
          ? "dark:bg-[#0b1624] border-emerald-600/20 dark:border-slate-800" 
          : "dark:bg-[#140D23] border-slate-300 dark:border-slate-800"
      )}>
        
        {/* OFFICIAL SCORE REPORT HEADER */}
        <div className={cn("border-b-[4px] p-8 bg-white flex justify-between items-start transition-colors", 
          isMilliy 
            ? "dark:bg-[#0b1624] border-[#10b981]" 
            : "dark:bg-[#140D23] border-[#0f2c59] dark:border-blue-500"
        )}>
          <div>
            <h1 className={cn("text-3xl font-bold tracking-tight uppercase mb-1", 
              isMilliy ? "text-[#059669] dark:text-[#10b981]" : "text-[#0f2c59] dark:text-blue-400"
            )}>{tOfficialReport}</h1>
            <p className="text-sm font-sans text-slate-500 dark:text-slate-400 uppercase tracking-widest">{exam?.title || "Standardized Examination"}</p>
          </div>
          <div className="text-right">
            <img src="/logo.png" alt="LMSHub Official" className="h-10 mb-2 opacity-80 grayscale ml-auto" onError={(e) => e.currentTarget.style.display = 'none'} />
            <p className="text-xs font-sans text-slate-500 dark:text-slate-400 uppercase tracking-widest">{tTestDate}: {new Date().toLocaleDateString()}</p>
            <p className="text-xs font-sans text-slate-500 dark:text-slate-400 uppercase tracking-widest">{tCandidateId}: {Math.floor(Math.random()*100000000)}</p>
          </div>
        </div>

        {/* HERO SCORES - Document Style */}
        <div className={cn("p-8 border-b flex flex-col md:flex-row gap-8 transition-colors", 
          isMilliy 
            ? "bg-[#f8fafc] dark:bg-[#070e17] border-slate-200 dark:border-slate-800" 
            : "border-slate-300 dark:border-slate-800 bg-[#f8fafc] dark:bg-[#0c0817]/40"
        )}>
          <div className={cn("w-full md:w-1/3 bg-white border p-6 flex flex-col items-center justify-center shadow-sm transition-colors rounded-xl", 
            isMilliy 
              ? "dark:bg-[#0b1624]/60 border-slate-200 dark:border-slate-800" 
              : "dark:bg-[#140D23]/60 border-slate-300 dark:border-slate-800"
          )}>
            <h2 className="text-xs font-sans font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 text-center">{scoreType}</h2>
            <div className={cn("text-6xl font-bold tracking-tighter mb-2", isMilliy ? "text-[#059669] dark:text-[#10b981]" : "text-[#0f2c59] dark:text-blue-400")}>{finalScore}</div>
            <p className="text-[10px] font-sans text-slate-400 uppercase text-center border-t border-slate-200 dark:border-slate-800 pt-2 w-full">{tPredictedScore}</p>
          </div>
          <div className="w-full md:w-2/3 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div 
              onClick={() => setFilterMode('all')}
              className={cn(
                "border p-4 flex flex-col justify-between rounded-xl cursor-pointer select-none transition-all duration-300",
                filterMode === 'all'
                  ? "border-slate-400 dark:border-slate-500 ring-2 ring-slate-400/50 bg-slate-50 dark:bg-slate-900/60 shadow-inner scale-[1.03]"
                  : cn("bg-white hover:border-slate-400 dark:hover:border-slate-500", isMilliy ? "dark:bg-[#0b1624]/60 border-slate-200 dark:border-slate-800" : "dark:bg-[#140D23]/60 border-slate-200 dark:border-slate-800")
              )}
            >
              <span className="text-[10px] font-sans font-bold text-slate-500 dark:text-slate-400 uppercase">{tTotalQuestions}</span>
              <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">{totalCount}</span>
            </div>
            <div 
              onClick={() => {
                if (isMilliy) {
                  setInteractiveModalType('correct');
                } else {
                  setFilterMode('correct');
                }
              }}
              className={cn(
                "border p-4 flex flex-col justify-between rounded-xl cursor-pointer select-none transition-all duration-300",
                !isMilliy && filterMode === 'correct'
                  ? "border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-inner scale-[1.03]"
                  : cn("bg-white hover:border-emerald-400 dark:hover:border-emerald-500", isMilliy ? "dark:bg-[#0b1624]/60 border-slate-200 dark:border-slate-800" : "dark:bg-[#140D23]/60 border-slate-200 dark:border-slate-800")
              )}
            >
              <span className="text-[10px] font-sans font-bold text-[#166534] dark:text-[#22c55e] uppercase">{tCorrect}</span>
              <span className="text-2xl font-bold text-[#166534] dark:text-[#22c55e]">{correctCount}</span>
            </div>
            <div 
              onClick={() => {
                if (isMilliy) {
                  setInteractiveModalType('incorrect');
                } else {
                  setFilterMode('incorrect');
                }
              }}
              className={cn(
                "border p-4 flex flex-col justify-between rounded-xl cursor-pointer select-none transition-all duration-300",
                !isMilliy && filterMode === 'incorrect'
                  ? "border-rose-500 dark:border-rose-400 ring-2 ring-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 shadow-inner scale-[1.03]"
                  : cn("bg-white hover:border-rose-400 dark:hover:border-rose-500", isMilliy ? "dark:bg-[#0b1624]/60 border-slate-200 dark:border-slate-800" : "dark:bg-[#140D23]/60 border-slate-200 dark:border-slate-800")
              )}
            >
              <span className="text-[10px] font-sans font-bold text-[#991b1b] dark:text-[#ef4444] uppercase">{tIncorrect}</span>
              <span className="text-2xl font-bold text-[#991b1b] dark:text-[#ef4444]">{wrongCount}</span>
            </div>
            <div 
              onClick={() => {
                if (isMilliy) {
                  setInteractiveModalType('omitted');
                } else {
                  setFilterMode('omitted');
                }
              }}
              className={cn(
                "border p-4 flex flex-col justify-between rounded-xl cursor-pointer select-none transition-all duration-300",
                !isMilliy && filterMode === 'omitted'
                  ? "border-slate-500 dark:border-slate-400 ring-2 ring-slate-500/30 bg-slate-500/5 dark:bg-slate-950/20 shadow-inner scale-[1.03]"
                  : cn("bg-white hover:border-slate-450 dark:hover:border-slate-500", isMilliy ? "dark:bg-[#0b1624]/60 border-slate-200 dark:border-slate-800" : "dark:bg-[#140D23]/60 border-slate-200 dark:border-slate-800")
              )}
            >
              <span className="text-[10px] font-sans font-bold text-slate-500 dark:text-slate-400 uppercase">{tOmitted}</span>
              <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">{skippedCount}</span>
            </div>
            <div className={cn("border p-4 flex flex-col justify-between col-span-2 transition-colors rounded-xl", 
              isMilliy ? "dark:bg-[#0b1624]/60 border-slate-200 dark:border-slate-800" : "dark:bg-[#140D23]/60 border-slate-200 dark:border-slate-800 bg-white"
            )}>
              <span className="text-[10px] font-sans font-bold text-slate-500 dark:text-slate-400 uppercase">{tTotalTimeUsed}</span>
              <span className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400 dark:text-slate-400"/> {timeStr}</span>
            </div>
            <div className={cn("border p-4 flex flex-col justify-between col-span-2 transition-colors rounded-xl", 
              isMilliy ? "dark:bg-[#0b1624]/60 border-slate-200 dark:border-slate-800" : "dark:bg-[#140D23]/60 border-slate-200 dark:border-slate-800 bg-white"
            )}>
              <span className={cn("text-[10px] font-sans font-bold uppercase", isMilliy ? "text-[#059669] dark:text-[#10b981]" : "text-[#0f2c59] dark:text-blue-400")}>{tAccuracy}</span>
              <span className={cn("text-xl font-bold flex items-center gap-2", isMilliy ? "text-[#059669] dark:text-[#10b981]" : "text-[#0f2c59] dark:text-blue-400")}><Target className="w-4 h-4"/> {accuracy}%</span>
            </div>
          </div>
        </div>

        {/* AI PERFORMANCE COACH - Dynamic Diagnostic Report */}
        <div className="p-8 border-b border-slate-300 dark:border-slate-800 transition-colors">
          {!currentResult?.aiCoachFeedback ? (
            <div className={cn(
              "border rounded-2xl p-6 md:p-8 shadow-sm transition-colors relative overflow-hidden backdrop-blur-sm",
              isMilliy 
                ? "bg-gradient-to-r from-emerald-50/80 to-amber-50/80 dark:from-emerald-950/10 dark:to-amber-950/10 border-emerald-100/50 dark:border-[#132d20]" 
                : "bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100/50 dark:border-[#2e1e52]"
            )}>
              <div className="flex items-center gap-3 mb-6">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center relative", 
                  isMilliy ? "bg-emerald-100 dark:bg-emerald-500/20" : "bg-indigo-100 dark:bg-indigo-500/20"
                )}>
                  <BrainCircuit className={cn("w-5 h-5 animate-pulse", 
                    isMilliy ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400"
                  )} />
                  <div className={cn("absolute inset-0 rounded-full border animate-ping opacity-25", 
                    isMilliy ? "border-emerald-400 dark:border-emerald-500" : "border-indigo-400 dark:border-indigo-500"
                  )}></div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {tCoachTitle}
                    <span className={cn("text-[10px] tracking-wider uppercase px-2 py-0.5 rounded font-sans font-extrabold animate-pulse", 
                      isMilliy ? "bg-emerald-600 dark:bg-emerald-500/20 text-white dark:text-emerald-300" : "bg-indigo-600 dark:bg-indigo-500/20 text-white dark:text-indigo-300"
                    )}>
                      {isMilliy ? "Tahlil qilinmoqda..." : "Analyzing..."}
                    </span>
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">{tCoachLoadingDesc}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-6 bg-gradient-to-r from-slate-200/80 via-indigo-100/30 to-slate-200/80 dark:from-slate-800/80 dark:via-indigo-950/20 dark:to-slate-800/80 rounded w-1/3 animate-pulse"></div>
                <div className="h-4 bg-gradient-to-r from-slate-200/80 via-indigo-100/30 to-slate-200/80 dark:from-slate-800/80 dark:via-indigo-950/20 dark:to-slate-800/80 rounded w-full animate-pulse"></div>
                <div className="h-4 bg-gradient-to-r from-slate-200/80 via-indigo-100/30 to-slate-200/80 dark:from-slate-800/80 dark:via-indigo-950/20 dark:to-slate-800/80 rounded w-5/6 animate-pulse"></div>
                <div className={cn("h-20 border rounded-xl mt-6 animate-pulse flex items-center justify-center", 
                  isMilliy ? "bg-emerald-100/60 dark:bg-[#070e17] border-emerald-200/40 dark:border-emerald-800/40" : "bg-slate-100/60 dark:bg-[#0c0817]/40 border border-slate-200/40 dark:border-slate-800/40"
                )}>
                  <div className={cn("flex items-center gap-2 text-xs font-semibold uppercase tracking-wider", 
                    isMilliy ? "text-emerald-500 dark:text-emerald-400" : "text-indigo-500 dark:text-indigo-400"
                  )}>
                    <Loader2 className="w-4 h-4 animate-spin" /> {tCoachLoadingMetrics}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {(() => {
                let coachFeedback = { strengths: [], weaknesses: [], recommendedTopics: [], studyPlan: "" };
                try {
                  coachFeedback = typeof currentResult.aiCoachFeedback === "string" 
                    ? JSON.parse(currentResult.aiCoachFeedback) 
                    : currentResult.aiCoachFeedback;
                } catch (e) {
                  console.error("Coach feedback parsing failed", e);
                }
 
                // Translate contents if isMilliy
                const finalStrengths = isMilliy ? translateArrayToUz(coachFeedback?.strengths) : (coachFeedback?.strengths || []);
                const finalWeaknesses = isMilliy ? translateArrayToUz(coachFeedback?.weaknesses) : (coachFeedback?.weaknesses || []);
                const finalRecommended = isMilliy ? translateArrayToUz(coachFeedback?.recommendedTopics) : (coachFeedback?.recommendedTopics || []);
                const finalStudyPlan = isMilliy ? translateFeedbackToUz(coachFeedback?.studyPlan) : (coachFeedback?.studyPlan || "");
 
                return (
                  <div className={cn("border rounded-2xl p-6 md:p-8 shadow-sm space-y-6 transition-all duration-300", 
                    isMilliy 
                      ? "bg-white dark:bg-[#0b1624]/60 border-slate-200 dark:border-slate-800" 
                      : "bg-gradient-to-br from-white to-slate-50/50 dark:from-[#140D23]/60 dark:to-[#1a122e]/40 border border-slate-200 dark:border-slate-800"
                  )}>
                    <div className="flex items-center gap-3 mb-2">
                       <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shadow-inner", isMilliy ? "bg-emerald-100 dark:bg-emerald-950" : "bg-indigo-100 dark:bg-indigo-500/20")}>
                         <BrainCircuit className={cn("w-5 h-5", isMilliy ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400")} />
                       </div>
                       <div>
                         <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{tCoachTitle}</h2>
                         <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{tCoachLoadedDesc}</p>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="bg-gradient-to-br from-emerald-50/60 to-teal-50/40 dark:from-emerald-950/10 dark:to-teal-950/10 border border-emerald-100/50 dark:border-emerald-900/30 rounded-xl p-4 shadow-sm transition-all duration-300">
                         <h3 className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-xs mb-3 flex items-center gap-2 font-sans"><Target className="w-4 h-4" /> {tStrengths}</h3>
                         <ul className="space-y-2.5">
                           {finalStrengths.map((s: string, i: number) => (
                             <li key={i} className="flex items-start gap-2.5">
                               <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                               <span className="text-emerald-900 dark:text-emerald-200 text-xs font-semibold leading-relaxed">{s}</span>
                             </li>
                           )) || <li className="text-xs text-slate-450">{tNoStrengths}</li>}
                         </ul>
                       </div>
                       <div className="bg-gradient-to-br from-rose-50/60 to-orange-50/40 dark:from-rose-950/10 dark:to-orange-950/10 border border-rose-100/50 dark:border-rose-900/30 rounded-xl p-4 shadow-sm transition-all duration-300">
                         <h3 className="font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider text-xs mb-3 flex items-center gap-2 font-sans"><AlertCircle className="w-4 h-4" /> {tWeaknesses}</h3>
                         <ul className="space-y-2.5">
                           {finalWeaknesses.map((s: string, i: number) => (
                             <li key={i} className="flex items-start gap-2.5">
                               <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5" />
                               <span className="text-rose-900 dark:text-rose-200 text-xs font-semibold leading-relaxed">{s}</span>
                             </li>
                           )) || <li className="text-xs text-slate-450">{tNoWeaknesses}</li>}
                         </ul>
                       </div>
                    </div>
 
                    <div className={cn("p-6 rounded-xl transition-all duration-300", 
                      isMilliy 
                        ? "bg-emerald-50/30 dark:bg-[#070e17] border border-emerald-100/50 dark:border-emerald-950/40" 
                        : "bg-indigo-50/30 dark:bg-[#0c0817]/40 border border-indigo-100/50 dark:border-indigo-950/40"
                    )}>
                       <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider text-xs mb-2 font-sans">{tStudyPlan}</h3>
                       <p className="text-slate-800 dark:text-slate-300 leading-relaxed text-sm font-medium">
                         {finalStudyPlan}
                       </p>
                       {finalRecommended && finalRecommended.length > 0 && (
                         <div className="mt-4 flex flex-wrap gap-2 items-center border-t border-slate-200/40 dark:border-slate-800/40 pt-4">
                           <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mr-2 font-sans">{tFocusTopics}:</span>
                           {finalRecommended.map((t: string, i: number) => (
                             <span key={i} className={cn("px-3 py-1 border rounded-full text-xs font-bold font-sans tracking-wide", 
                               isMilliy 
                                 ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-500/30" 
                                 : "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200/50 dark:border-indigo-500/30"
                             )}>{t}</span>
                           ))}
                         </div>
                       )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* DOMAIN & TIMING ANALYTICS ROW */}
        <div className={cn("p-8 border-b flex flex-col md:flex-row gap-8 transition-colors", 
          isMilliy 
            ? "bg-slate-50/50 dark:bg-[#070e17] border-slate-200 dark:border-slate-800" 
            : "border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0c0817]/20"
        )}>
          <div className="w-full md:w-1/2">
            <div className="flex items-center gap-2 mb-6 border-b-2 border-slate-800 dark:border-slate-700 pb-2">
              <BarChart3 className="w-5 h-5 text-slate-800 dark:text-slate-200" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-slate-200 font-sans">{tDomainPerformance}</h3>
            </div>
            <div className="space-y-4">
              {Object.entries(topicStats).map(([topic, stat]) => {
                const pct = Math.round((stat.correct / stat.total) * 100);
                const color = pct >= 80 
                  ? (isMilliy ? "bg-emerald-600 dark:bg-emerald-500" : "bg-emerald-600 dark:bg-emerald-500") 
                  : pct >= 50 
                    ? (isMilliy ? "bg-amber-500 dark:bg-amber-400" : "bg-amber-500 dark:bg-amber-400") 
                    : "bg-rose-600 dark:bg-rose-500";
                return (
                  <div key={topic} className="font-sans">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                        {isMilliy ? translateFeedbackToUz(topic) : topic}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{stat.correct}/{stat.total} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 overflow-hidden rounded-full">
                      <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="w-full md:w-1/2">
            <div className="flex items-center gap-2 mb-6 border-b-2 border-slate-800 dark:border-slate-700 pb-2">
              <Timer className="w-5 h-5 text-slate-800 dark:text-slate-200" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-slate-200 font-sans">{tTimingAnalytics}</h3>
            </div>
            <table className="w-full text-sm font-sans border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <tbody>
                <tr className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-900/20 transition-colors">
                  <td className={cn("p-3 text-slate-600 dark:text-slate-400 font-bold uppercase text-xs border-r border-slate-200 dark:border-slate-800", isMilliy ? "bg-slate-50 dark:bg-[#0b1624]" : "bg-slate-50 dark:bg-slate-900/60")}>{tAvgPace}</td>
                  <td className="p-3 text-right font-bold text-slate-900 dark:text-slate-100">{avgTimePerQuestion} {tPaceUnit}</td>
                </tr>
                <tr className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-900/20 transition-colors">
                  <td className={cn("p-3 text-slate-600 dark:text-slate-400 font-bold uppercase text-xs border-r border-slate-200 dark:border-slate-800", isMilliy ? "bg-slate-50 dark:bg-[#0b1624]" : "bg-slate-50 dark:bg-slate-900/60")}>{tFastest}</td>
                  <td className="p-3 text-right font-bold text-slate-900 dark:text-slate-100">{fastest} {tSecUnit}</td>
                </tr>
                <tr className="hover:bg-slate-100/50 dark:hover:bg-slate-900/20 transition-colors">
                  <td className={cn("p-3 text-slate-600 dark:text-slate-400 font-bold uppercase text-xs border-r border-slate-200 dark:border-slate-800", isMilliy ? "bg-slate-50 dark:bg-[#0b1624]" : "bg-slate-50 dark:bg-slate-900/60")}>{tSlowest}</td>
                  <td className="p-3 text-right font-bold text-slate-900 dark:text-slate-100">{slowest} {tSecUnit}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* DETAILED ITEM ANALYSIS */}
        <div className="p-8 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-6 border-b-2 border-slate-800 dark:border-slate-700 pb-2">
            <BarChart3 className="w-5 h-5 text-slate-800 dark:text-slate-200" />
            <h3 className="text-lg font-bold uppercase tracking-widest text-slate-800 dark:text-slate-200 font-sans">{tDetailedAnalysis}</h3>
          </div>

          <div className="space-y-3 font-sans">
            {(() => {
              const filteredDetails = details.filter((detail: any) => {
                if (filterMode === 'all') return true;
                if (filterMode === 'correct') return detail.ok;
                if (filterMode === 'incorrect') return !detail.ok && detail.userAns;
                if (filterMode === 'omitted') return !detail.userAns;
                return true;
              });

              if (filteredDetails.length === 0) {
                return (
                  <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-500 dark:text-slate-400">
                    <p className="font-bold text-sm">
                      {isMilliy ? "Ushbu turdagi savollar mavjud emas." : "No questions match the selected filter."}
                    </p>
                  </div>
                );
              }

              return filteredDetails.map((detail: any, idx: number) => {
                const q = questions.find(question => question.id === detail.questionId);
                if (!q) return null;
              
              const isCorrect = detail.ok;
              const isSkipped = !detail.userAns;
              const isExpanded = expandedQ === q.id;
              
              const statusColor = isCorrect 
                ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" 
                : isSkipped 
                  ? "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700" 
                  : "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20";

              return (
                <div key={q.id} className={cn("border rounded-xl overflow-hidden shadow-sm transition-all duration-200", 
                  isMilliy 
                    ? "bg-white dark:bg-[#0b1624]/40 border-emerald-600/10 hover:border-slate-350 dark:hover:border-slate-700" 
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#140D23]/40 hover:border-slate-300 dark:hover:border-slate-700"
                )}>
                  <div 
                    className={cn("p-4 cursor-pointer flex items-center justify-between transition-colors", 
                      isMilliy ? "hover:bg-slate-50 dark:hover:bg-[#0b1624]/80" : "hover:bg-slate-50 dark:hover:bg-[#140D23]/80"
                    )}
                    onClick={() => setExpandedQ(isExpanded ? null : q.id)}
                  >
                    <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
                      <div className="w-8 h-8 flex items-center justify-center font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm shrink-0">
                        {q.position}
                      </div>
                      <div className={cn("px-2.5 py-0.5 text-[10px] font-bold uppercase border rounded-md shrink-0", statusColor)}>
                        {isCorrect ? tCorrectTag : isSkipped ? tOmittedTag : tIncorrectTag}
                      </div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 w-16 shrink-0">{q.qtype}</span>
                      <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 w-16 shrink-0"><Clock className="inline w-3 h-3 mr-1"/>{timeSpentMap[q.id] || 0}s</span>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <div className="hidden md:flex text-xs font-semibold text-slate-600 dark:text-slate-400 w-48 truncate">
                        {q.prompt}
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className={cn("border-t p-6 font-serif", 
                      isMilliy 
                        ? "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#070e17]" 
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0c0817]/40"
                    )}>
                      <div className="mb-6">
                        <p className="text-xs font-sans font-bold uppercase text-slate-500 dark:text-slate-400 mb-2 border-b border-slate-200 dark:border-slate-800 pb-1">
                          {isMilliy ? `${q.position}-savol` : `Question Item ${q.position}`}
                        </p>
                        <p className="text-base text-slate-900 dark:text-slate-100 leading-relaxed font-sans">{q.prompt}</p>
                      </div>

                      <div className="overflow-x-auto mb-6">
                        <table className="w-full text-sm font-sans border-collapse">
                          <thead>
                            <tr>
                              <th className={cn("border border-slate-200 dark:border-slate-800 p-2 text-left w-1/2 uppercase text-xs text-slate-600 dark:text-slate-400 font-bold", 
                                isMilliy ? "bg-slate-100 dark:bg-[#0a1420]/80" : "bg-slate-100 dark:bg-slate-900/80"
                              )}>{tCandidateResponse}</th>
                              <th className={cn("border border-slate-200 dark:border-slate-800 p-2 text-left w-1/2 uppercase text-xs text-slate-600 dark:text-slate-400 font-bold", 
                                isMilliy ? "bg-slate-100 dark:bg-[#0a1420]/80" : "bg-slate-100 dark:bg-slate-900/80"
                              )}>{tDesignatedCorrect}</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className={cn("border border-slate-200 dark:border-slate-800 p-3 font-bold", isCorrect ? "text-[#166534] dark:text-[#22c55e]" : isSkipped ? "text-slate-500 dark:text-slate-400" : "text-[#991b1b] dark:text-[#f43f5e]")}>
                                {detail.userAns ? translateFeedbackToUz(detail.userAns) : (isMilliy ? "BELGILANMAGAN" : "OMITTED")}
                              </td>
                              <td className="border border-slate-200 dark:border-slate-800 p-3 font-bold text-slate-800 dark:text-slate-200">
                                {translateFeedbackToUz(detail.correctAns)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className={cn("border p-5 rounded-xl shadow-sm", 
                        isMilliy ? "bg-white dark:bg-[#0b1624]/60 border-slate-200 dark:border-slate-800" : "bg-white dark:bg-[#140D23]/60 border-slate-200 dark:border-slate-800"
                      )}>
                        <p className={cn("text-xs font-sans font-bold uppercase mb-3 flex items-center gap-2", 
                          isMilliy ? "text-[#059669] dark:text-[#10b981]" : "text-[#0f2c59] dark:text-blue-400"
                        )}>
                          <BrainCircuit className={cn("w-4 h-4", isMilliy ? "text-emerald-500" : "text-[#059669] dark:text-[#10b981]")} /> {tRationaleTitle}
                        </p>
                        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                          {detail.aiExplanation ? (
                            processLaTeX(isMilliy ? translateFeedbackToUz(detail.aiExplanation) : detail.aiExplanation)
                          ) : currentResult?.aiCoachFeedback ? (
                            q.explanation || getExplanation(q.qtype, detail.correctAns, detail.userAns)
                          ) : (
                            <div className={cn("flex items-center gap-2 animate-pulse font-medium", isMilliy ? "text-emerald-500" : "text-indigo-500")}>
                              <Loader2 className="h-4 w-4 animate-spin" /> {tRationaleGenerating}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          })()}
          </div>
        </div>

        <div className={cn("p-8 border-t text-center font-sans bg-white transition-colors", 
          isMilliy ? "dark:bg-[#0b1624] border-slate-200 dark:border-slate-800" : "border-slate-200 dark:border-slate-800 dark:bg-[#140D23]"
        )}>
          <p className="text-xs text-slate-450 uppercase tracking-widest mb-1">{tEndReport}</p>
          <p className="text-[10px] text-slate-450 mb-8">{tValidationCode}: {Math.random().toString(36).substring(2, 15).toUpperCase()}</p>
          <Button size="lg" className={cn("text-white font-bold px-10 rounded-xl h-12 uppercase tracking-widest text-sm w-full md:w-auto transition-all duration-200", isMilliy ? "bg-emerald-600 hover:bg-emerald-700" : "bg-[#0f2c59] hover:bg-[#1a365d] dark:bg-indigo-600 dark:hover:bg-indigo-500")} onClick={() => {
            const r = (role || 'student').toLowerCase();
            const path = r === 'super_admin' ? 'super-admin' : r === 'payment_manager' ? 'pack-manager' : r;
            nav(`/${path}`);
          }}>
            {tReturnButton}
          </Button>
        </div>

        {/* Interactive Modal for Milliy Sertifikat mock exam results */}
        {interactiveModalType && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0a192f] border-2 border-[#10b981] w-full max-w-3xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden transition-all duration-300">
              {/* Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-[#0b1624]/60">
                <h2 className="text-xl font-sans font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  {interactiveModalType === 'correct' && (
                    <span className="text-[#059669] dark:text-[#10b981]">To'g'ri javoblar ro'yxati</span>
                  )}
                  {interactiveModalType === 'incorrect' && (
                    <span className="text-rose-600 dark:text-rose-450">Noto'g'ri javoblar ro'yxati</span>
                  )}
                  {interactiveModalType === 'omitted' && (
                    <span className="text-amber-500 dark:text-amber-450">Belgilanmagan savollar ro'yxati</span>
                  )}
                </h2>
                <button 
                  onClick={() => setInteractiveModalType(null)} 
                  className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white dark:bg-[#0a192f]">
                {(() => {
                  const modalDetails = details.filter((d: any) => {
                    if (interactiveModalType === 'correct') return d.ok;
                    if (interactiveModalType === 'incorrect') return !d.ok && d.userAns;
                    if (interactiveModalType === 'omitted') return !d.userAns;
                    return false;
                  });

                  if (modalDetails.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-500 dark:text-slate-400 font-sans">
                        Savollar topilmadi.
                      </div>
                    );
                  }

                  return modalDetails.map((detail: any) => {
                    const q = questions.find((question: any) => question.id === detail.questionId);
                    if (!q) return null;

                    const isCorrect = detail.ok;
                    const isSkipped = !detail.userAns;
                    
                    const cardBorderColor = isCorrect 
                      ? "border-emerald-500/20 dark:border-emerald-800/40 bg-emerald-500/5 dark:bg-emerald-950/10 text-emerald-900 dark:text-emerald-250"
                      : isSkipped 
                        ? "border-amber-500/20 dark:border-amber-800/40 bg-amber-500/5 dark:bg-amber-950/10 text-amber-900 dark:text-amber-250"
                        : "border-rose-500/20 dark:border-rose-800/40 bg-rose-500/5 dark:bg-rose-950/10 text-rose-900 dark:text-rose-250";

                    return (
                      <div 
                        key={q.id} 
                        className={cn("border p-5 rounded-2xl flex flex-col gap-3 font-sans transition-all", cardBorderColor)}
                      >
                        <div className="flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="h-6 w-6 text-white font-bold bg-[#0a192f] dark:bg-[#10b981] flex items-center justify-center rounded-md text-xs">
                              {q.position}
                            </span>
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                              Savol ({q.qtype})
                            </span>
                          </div>
                          <span className={cn("text-xs font-bold px-2 py-0.5 rounded border uppercase", 
                            isCorrect ? "bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-850 dark:text-emerald-400"
                            : isSkipped ? "bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/40 dark:border-amber-850 dark:text-amber-400"
                            : "bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-950/40 dark:border-rose-850 dark:text-rose-400"
                          )}>
                            {isCorrect ? "To'g'ri" : isSkipped ? "Belgilanmagan" : "Noto'g'ri"}
                          </span>
                        </div>

                        {/* Prompt */}
                        <div className="text-sm leading-relaxed text-slate-850 dark:text-slate-100">
                          {processLaTeX(q.prompt)}
                        </div>

                        {/* Responses Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 text-xs">
                          <div className="p-3 bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                            <span className="block text-slate-500 dark:text-slate-400 font-semibold mb-1">Sizning javobingiz:</span>
                            <span className={cn("font-bold", 
                              isCorrect ? "text-[#059669] dark:text-[#10b981]" : isSkipped ? "text-slate-500 dark:text-slate-400" : "text-rose-600 dark:text-rose-450"
                            )}>
                              {detail.userAns ? translateFeedbackToUz(detail.userAns) : "BELGILANMAGAN"}
                            </span>
                          </div>
                          <div className="p-3 bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl">
                            <span className="block text-slate-500 dark:text-slate-400 font-semibold mb-1">To'g'ri javob:</span>
                            <span className="font-bold text-[#059669] dark:text-[#10b981]">
                              {translateFeedbackToUz(detail.correctAns)}
                            </span>
                          </div>
                        </div>

                        {/* Explanation */}
                        {(detail.aiExplanation || q.explanation) && (
                          <div className="mt-3 p-4 bg-white/80 dark:bg-[#0b1624] border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                            <span className="block font-bold text-slate-700 dark:text-slate-200 mb-1 flex items-center gap-1">
                              <BrainCircuit className="h-3.5 w-3.5 text-[#10b981]" /> Tushuntirish va yechim:
                            </span>
                            <div className="text-slate-650 dark:text-slate-350 leading-relaxed font-sans">
                              {processLaTeX(isMilliy ? translateFeedbackToUz(detail.aiExplanation || q.explanation) : (detail.aiExplanation || q.explanation))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Footer Close Button */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center bg-slate-50/50 dark:bg-[#0b1624]/60">
                <Button 
                  onClick={() => setInteractiveModalType(null)}
                  className="bg-[#059669] hover:bg-[#047857] dark:bg-[#10b981] dark:hover:bg-[#059669] text-white font-bold px-10 py-2.5 rounded-xl transition-all border-none"
                >
                  Yopish
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
