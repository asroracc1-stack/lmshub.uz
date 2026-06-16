import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, Clock, AlertCircle, Award, Target, ThumbsUp, Lightbulb, BookMarked, ChevronDown, ChevronUp, BrainCircuit, LineChart, FastForward, Timer
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { satScore, milliyScore, scoreLevel, rawToBand } from "@/lib/ielts";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function ExamResultDashboard({ result, questions, exam }: { result: any, questions: any[], exam: any }) {
  const { t } = useTranslation();
  const [expandedQ, setExpandedQ] = useState<string | null>(null);

  const kind = (result.kind ?? "exam").toLowerCase();
  const isSat = kind === "sat";
  const isMilliy = kind === "national_cert" || kind === "milliy";
  const isIelts = kind === "ielts" || kind === "reading" || kind === "listening";

  const totalCount = questions.length || 1;
  const correctCount = result.correct ?? 0;
  
  // Also count skipped. A question is skipped if it has no userAns or userAns is empty.
  const details = result.detail || [];
  const wrongCount = details.filter((d: any) => !d.ok && d.userAns).length;
  const skippedCount = details.filter((d: any) => !d.userAns).length;
  
  const accuracy = Math.round((correctCount / Math.max(totalCount, 1)) * 100);

  const satPts = satScore(correctCount, totalCount);
  const milliyPts = milliyScore(correctCount, totalCount);
  const band = result.bandScore ?? result.band ?? 0;
  const { color: lvlColor, label: lvlLabel } = scoreLevel(accuracy);

  const elapsedSec = result.elapsedSec ?? 0;
  const elapsedMin = Math.floor(elapsedSec / 60);
  const elapsedSecRem = elapsedSec % 60;
  const timeStr = `${elapsedMin}:${String(elapsedSecRem).padStart(2, "0")}`;

  const avgTimePerQuestion = Math.round(elapsedSec / totalCount);
  const timeSpentMap = result.timeSpent || {};
  let fastest = Infinity;
  let slowest = 0;
  Object.values(timeSpentMap).forEach((t: any) => {
    if (t < fastest) fastest = t;
    if (t > slowest) slowest = t;
  });
  if (fastest === Infinity) fastest = 0;

  // Topic Analytics (using qtype as topic for now)
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
    if (qtype === "tfng") return `True/False/Not Given savollarida: agar gap matndagi ma'lumotni tasdiqlasa "True", unga butunlay zid bo'lsa "False", matnda bu haqda ma'lumot bo'lmasa "Not Given" bo'ladi. Matnga ko'ra to'g'ri javob ${c} bo'lishi kerak.`;
    if (qtype === "ynng") return `Yes/No/Not Given savollarida: agar gap muallifning fikriga mos kelsa "Yes", unga qarshi bo'lsa "No", bu haqda muallif fikr bildirmagan bo'lsa "Not Given" bo'ladi. Ushbu savolda to'g'ri javob muallif fikriga ko'ra ${c} deb baholangan.`;
    if (qtype === "mcq") return `Ko'p variantli savollarda (MCQ) to'g'ri javob varianti matndagi so'zlarning sinonimlari va paraphrase (boshqacha ifodalash) orqali yashiringan bo'ladi. Bu savolda eng to'g'ri variant ${c} hisoblanadi.`;
    if (qtype === "fill") return `Bo'sh joyni to'ldirishda (Fill in the Blanks) so'z matndagidek harfma-harf aniq va grammatik jihatdan to'g'ri tushishi shart. To'g'ri javob ${c}.`;
    return `Qisqa javobli savollarda to'g'ri javob matndagi faktlar asosida ${c} qilib belgilangan.`;
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-8 pb-20 px-4 md:px-8 mt-8">
      {/* 🚀 OFFICIAL SCORE REPORT HERO */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10">
        <div className="bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-slate-900 text-white p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div>
                <Badge className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 mb-4 border-blue-500/30">Official Score Report</Badge>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">{exam?.title || "Exam Result"}</h1>
                <p className="text-slate-400 text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" /> Completed in {timeStr}
                </p>
              </div>
              <div className="text-center bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl min-w-[200px]">
                <p className="text-slate-300 text-sm font-bold uppercase tracking-widest mb-2">
                  {isSat ? "Predicted SAT" : isMilliy ? "Predicted Ball" : isIelts ? "Predicted Band" : "Final Score"}
                </p>
                <div className="text-6xl font-black text-white">
                  {isSat ? satPts : isMilliy ? milliyPts : isIelts ? (band || "0.0") : `${accuracy}%`}
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-200 dark:bg-slate-800">
            <div className="bg-white dark:bg-[#0B1121] p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Accuracy</p>
              <p className={cn("text-3xl font-black", lvlColor)}>{accuracy}%</p>
            </div>
            <div className="bg-white dark:bg-[#0B1121] p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Correct</p>
              <p className="text-3xl font-black text-emerald-500">{correctCount}</p>
            </div>
            <div className="bg-white dark:bg-[#0B1121] p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Wrong</p>
              <p className="text-3xl font-black text-rose-500">{wrongCount}</p>
            </div>
            <div className="bg-white dark:bg-[#0B1121] p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Skipped</p>
              <p className="text-3xl font-black text-slate-400">{skippedCount}</p>
            </div>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="coach" className="w-full space-y-6 mt-8">
        <TabsList className="grid w-full grid-cols-4 rounded-xl bg-slate-100 dark:bg-white/5 p-1.5 h-14">
          <TabsTrigger value="coach" className="rounded-lg font-bold text-xs md:text-sm">AI Coach</TabsTrigger>
          <TabsTrigger value="questions" className="rounded-lg font-bold text-xs md:text-sm">Questions</TabsTrigger>
          <TabsTrigger value="topics" className="rounded-lg font-bold text-xs md:text-sm">Topics</TabsTrigger>
          <TabsTrigger value="time" className="rounded-lg font-bold text-xs md:text-sm">Time</TabsTrigger>
        </TabsList>

        {/* 🧠 AI COACH */}
        <TabsContent value="coach" className="space-y-6">
          <Card className="p-8 border-slate-200 dark:border-white/5 bg-white dark:bg-[#0B1121] shadow-xl rounded-3xl">
            <div className="flex items-center gap-4 mb-8 border-b border-slate-100 dark:border-white/5 pb-6">
              <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                <BrainCircuit className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Performance Analysis</h3>
                <p className="text-slate-500">Your personalized AI tutor feedback</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                  <h4 className="text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                    <ThumbsUp className="w-5 h-5" /> Strengths
                  </h4>
                  <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
                    {accuracy >= 80 ? (
                      <li>Excellent overall accuracy indicating strong foundational knowledge.</li>
                    ) : accuracy >= 50 ? (
                      <li>Good understanding of basic concepts.</li>
                    ) : (
                      <li>You attempted {totalCount - skippedCount} questions, showing good persistence.</li>
                    )}
                    {Object.entries(topicStats).filter(([_, s]) => s.correct / s.total >= 0.7).map(([topic], idx) => (
                      <li key={idx}>Strong performance in {topic.toUpperCase()} questions.</li>
                    ))}
                  </ul>
                </div>
                <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                  <h4 className="text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5" /> Weaknesses
                  </h4>
                  <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300 font-medium">
                    {skippedCount > 0 && <li>You left {skippedCount} questions unanswered. Always guess if there is no penalty!</li>}
                    {Object.entries(topicStats).filter(([_, s]) => s.correct / s.total < 0.5).map(([topic], idx) => (
                      <li key={idx}>Needs improvement in {topic.toUpperCase()} questions.</li>
                    ))}
                    {accuracy < 50 && <li>General accuracy is below target. Foundational review required.</li>}
                  </ul>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 h-full">
                  <h4 className="text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                    <BookMarked className="w-5 h-5" /> Study Plan & Next Steps
                  </h4>
                  <div className="space-y-4">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                      Based on your performance, we recommend the following 3-step action plan:
                    </p>
                    <ol className="space-y-4">
                      <li className="flex gap-3">
                        <span className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0">1</span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">Review all {wrongCount} incorrect answers in the Questions tab to understand your mistakes.</p>
                      </li>
                      <li className="flex gap-3">
                        <span className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0">2</span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                          Focus your study on {Object.entries(topicStats).filter(([_, s]) => s.correct / s.total < 0.5).map(([t]) => t.toUpperCase()).join(", ") || "core concepts"}.
                        </p>
                      </li>
                      <li className="flex gap-3">
                        <span className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0">3</span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">Take another practice test focusing on time management to improve your {avgTimePerQuestion}s average pace.</p>
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 📝 QUESTION ANALYSIS */}
        <TabsContent value="questions" className="space-y-4">
          {details.map((detail: any, idx: number) => {
            const q = questions.find(question => question.id === detail.questionId);
            if (!q) return null;
            
            const isCorrect = detail.ok;
            const isSkipped = !detail.userAns;
            const isExpanded = expandedQ === q.id;
            
            const cardColor = isCorrect 
              ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50" 
              : isSkipped 
                ? "border-slate-500/30 bg-slate-500/5 hover:border-slate-500/50"
                : "border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50";
                
            const badgeColor = isCorrect 
              ? "bg-emerald-500 text-white" 
              : isSkipped
                ? "bg-slate-500 text-white"
                : "bg-rose-500 text-white";

            return (
              <Card key={q.id} className={cn("transition-all duration-200 border-2 overflow-hidden", cardColor)}>
                <div 
                  className="p-4 md:p-6 cursor-pointer flex items-center justify-between"
                  onClick={() => setExpandedQ(isExpanded ? null : q.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center font-black text-white shadow-sm", badgeColor)}>
                      {q.position}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold border-slate-300 dark:border-slate-700">{q.qtype}</Badge>
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {(timeSpentMap[q.id] || 0)}s
                        </span>
                      </div>
                      <p className="text-sm md:text-base font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 max-w-[500px]">
                        {q.prompt}
                      </p>
                    </div>
                  </div>
                  <div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-200/50 dark:border-white/5 bg-white/50 dark:bg-black/20"
                    >
                      <div className="p-6 space-y-6">
                        <div>
                          <p className="text-xs uppercase font-extrabold text-slate-500 tracking-wider mb-2">Question</p>
                          <p className="text-base text-slate-800 dark:text-slate-200 font-medium">{q.prompt}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Your Answer</p>
                            <p className={cn("text-base font-bold", isCorrect ? "text-emerald-500" : isSkipped ? "text-slate-500" : "text-rose-500")}>
                              {detail.userAns || "Skipped"}
                            </p>
                          </div>
                          {!isCorrect && (
                            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                              <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 mb-1">Correct Answer</p>
                              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                                {detail.correctAns}
                              </p>
                            </div>
                          )}
                        </div>

                        {(!isCorrect || q.explanation) && (
                          <div className="p-5 rounded-xl border border-blue-500/20 bg-blue-500/5 flex gap-4">
                            <Lightbulb className="w-6 h-6 text-blue-500 shrink-0" />
                            <div>
                              <p className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider mb-2">Teacher's Explanation</p>
                              <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                                {q.explanation || getExplanation(q.qtype, detail.correctAns, detail.userAns)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </TabsContent>

        {/* 📊 TOPIC ANALYTICS */}
        <TabsContent value="topics" className="space-y-6">
          <Card className="p-8 border-slate-200 dark:border-white/5 bg-white dark:bg-[#0B1121] shadow-xl rounded-3xl">
            <div className="flex items-center gap-4 mb-8 border-b border-slate-100 dark:border-white/5 pb-6">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                <LineChart className="h-6 w-6 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Topic Performance</h3>
                <p className="text-slate-500">Your accuracy breakdown by question type</p>
              </div>
            </div>

            <div className="space-y-6">
              {Object.entries(topicStats).map(([topic, stat]) => {
                const pct = Math.round((stat.correct / stat.total) * 100);
                const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500";
                return (
                  <div key={topic}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide text-sm">{topic}</span>
                      <span className="font-black text-slate-900 dark:text-white">{stat.correct} / {stat.total} <span className="text-slate-400 font-semibold text-xs ml-2">({pct}%)</span></span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={cn("h-full transition-all duration-1000", color)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </TabsContent>

        {/* ⏱ TIME ANALYTICS */}
        <TabsContent value="time" className="space-y-6">
          <Card className="p-8 border-slate-200 dark:border-white/5 bg-white dark:bg-[#0B1121] shadow-xl rounded-3xl">
            <div className="flex items-center gap-4 mb-8 border-b border-slate-100 dark:border-white/5 pb-6">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <Timer className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Time Management</h3>
                <p className="text-slate-500">Analysis of your pacing</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                <p className="text-slate-500 font-bold uppercase tracking-wider text-xs mb-2">Average Time</p>
                <p className="text-4xl font-black text-slate-900 dark:text-white">{avgTimePerQuestion}s</p>
                <p className="text-slate-400 text-xs mt-2 font-medium">per question</p>
              </div>
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <FastForward className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                <p className="text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider text-xs mb-2">Fastest Answer</p>
                <p className="text-4xl font-black text-emerald-500">{fastest}s</p>
              </div>
              <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                <Clock className="w-6 h-6 text-rose-500 mx-auto mb-2" />
                <p className="text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider text-xs mb-2">Slowest Answer</p>
                <p className="text-4xl font-black text-rose-500">{slowest}s</p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
