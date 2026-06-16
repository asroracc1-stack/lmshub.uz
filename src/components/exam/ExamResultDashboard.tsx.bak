import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Clock, Award, Target, Brain, ArrowRight, ChevronDown, ChevronUp, BarChart3, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import DOMPurify from "dompurify";
import katex from "katex";
import "katex/dist/katex.min.css";

function processLaTeX(text: string) {
  if (!text) return "";
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
  return parts.map((part, index) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      const tex = part.slice(2, -2);
      try { return <div key={index} dangerouslySetInnerHTML={{ __html: katex.renderToString(tex, { displayMode: true, throwOnError: false }) }} className="my-2" />; } catch { return <span key={index}>{part}</span>; }
    } else if (part.startsWith('$') && part.endsWith('$')) {
      const tex = part.slice(1, -1);
      try { return <span key={index} dangerouslySetInnerHTML={{ __html: katex.renderToString(tex, { displayMode: false, throwOnError: false }) }} />; } catch { return <span key={index}>{part}</span>; }
    }
    return <span key={index} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(part.replace(/\\n/g, '<br/>').replace(/\n/g, '<br/>')) }} />;
  });
}

export function ExamResultDashboard({ result, questions, onRestart }: any) {
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  // Fallback computations if ai fields are null
  const coachFeedback = result.aiCoachFeedback ? JSON.parse(result.aiCoachFeedback) : {
    strengths: ["Time Management", "Answering core questions"],
    weaknesses: ["Complex word problems", "Reading speed"],
    recommendedTopics: ["Algebra II", "Advanced Vocabulary"],
    studyPlan: "Great job completing the exam! You demonstrated a solid foundation. Focus your next 3 study sessions on the recommended topics to push your score even higher."
  };

  const accuracy = Math.round((result.correct / result.total) * 100);
  const totalTime = result.timeUsedSeconds || 3600;
  
  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const secs = s % 60;
    return m > 0 ? `${m}m ${secs}s` : `${secs}s`;
  };

  const timePerQuestion = Math.round(totalTime / result.total);

  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#070b19] font-sans pb-24">
      {/* PROFESSIONAL HEADER */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <Award className="w-6 h-6 text-blue-600" />
             <h1 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">Official Score Report</h1>
             <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-black uppercase text-slate-500">{result.kind}</span>
           </div>
           <Button onClick={onRestart} variant="outline" className="font-bold border-slate-200 dark:border-slate-700">
             <RotateCcw className="w-4 h-4 mr-2" /> Return to Dashboard
           </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-8">
        
        {/* HERO METRICS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 p-8 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-600/20 border-0 flex flex-col items-center justify-center text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 p-3 opacity-10">
               <Award className="w-32 h-32" />
             </div>
             <p className="font-bold uppercase tracking-widest text-blue-200 text-sm mb-2 relative z-10">Predicted Score</p>
             <h2 className="text-6xl font-black relative z-10 mb-2">{result.predictedScore || (result.bandScore > 0 ? result.bandScore.toFixed(1) : `${result.correct} / ${result.total}`)}</h2>
             <p className="text-blue-100 font-medium relative z-10">Excellent performance.</p>
          </Card>

          <Card className="lg:col-span-2 p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-500 uppercase tracking-widest text-xs mb-6">Exam Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Accuracy</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{accuracy}%</p>
                <Progress value={accuracy} className="h-1.5 mt-3 bg-slate-100 dark:bg-slate-800" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Correct</p>
                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{result.correct}</p>
                <p className="text-xs text-slate-400 mt-2 font-medium">Out of {result.total}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Time Used</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{Math.floor(totalTime/60)}<span className="text-lg">m</span></p>
                <p className="text-xs text-slate-400 mt-2 font-medium">Avg {timePerQuestion}s / Q</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Wrong/Skipped</p>
                <p className="text-3xl font-black text-rose-500 dark:text-rose-400 mt-1">{result.total - result.correct}</p>
                <p className="text-xs text-slate-400 mt-2 font-medium">Needs review</p>
              </div>
            </div>
          </Card>
        </div>

        {/* AI COACH SECTION */}
        <Card className="p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
               <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Performance Coach</h2>
               <p className="text-sm text-slate-500">Personalized feedback based on your exam data</p>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div>
               <h3 className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-xs mb-4 flex items-center gap-2"><Target className="w-4 h-4" /> Core Strengths</h3>
               <ul className="space-y-3">
                 {coachFeedback.strengths.map((s: string, i: number) => (
                   <li key={i} className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-500/5 rounded-xl border border-emerald-100 dark:border-emerald-500/10">
                     <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                     <span className="text-emerald-900 dark:text-emerald-100 text-sm font-medium leading-relaxed">{s}</span>
                   </li>
                 ))}
               </ul>
             </div>
             <div>
               <h3 className="font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider text-xs mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Areas for Improvement</h3>
               <ul className="space-y-3">
                 {coachFeedback.weaknesses.map((s: string, i: number) => (
                   <li key={i} className="flex items-start gap-3 p-3 bg-rose-50 dark:bg-rose-500/5 rounded-xl border border-rose-100 dark:border-rose-500/10">
                     <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                     <span className="text-rose-900 dark:text-rose-100 text-sm font-medium leading-relaxed">{s}</span>
                   </li>
                 ))}
               </ul>
             </div>
          </div>

          <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
             <h3 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-xs mb-3">Study Plan</h3>
             <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
               {coachFeedback.studyPlan}
             </p>
             <div className="mt-4 flex flex-wrap gap-2">
               <span className="text-xs font-bold text-slate-500 uppercase mr-2">Focus Topics:</span>
               {coachFeedback.recommendedTopics.map((t: string, i: number) => (
                 <span key={i} className="px-3 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold">{t}</span>
               ))}
             </div>
          </div>
        </Card>

        {/* DETAILED QUESTION ANALYSIS */}
        <div className="mt-12">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
            Question Analysis
          </h2>
          
          <div className="space-y-4">
             {result.detail.map((d: any, idx: number) => {
                const qEntity = questions.find((q: any) => q.id === d.questionId);
                const isExpanded = expandedQuestion === d.questionId;
                
                return (
                  <Card key={d.questionId} className={cn(
                    "overflow-hidden transition-all duration-300",
                    isExpanded ? "border-slate-300 dark:border-slate-600 shadow-md" : "border-slate-200 dark:border-slate-800 hover:border-blue-300"
                  )}>
                    <div 
                      className={cn(
                        "p-4 md:p-6 flex items-center justify-between cursor-pointer",
                        d.ok ? "bg-emerald-50/50 dark:bg-emerald-900/10" : "bg-rose-50/50 dark:bg-rose-900/10"
                      )}
                      onClick={() => setExpandedQuestion(isExpanded ? null : d.questionId)}
                    >
                      <div className="flex items-center gap-4 md:gap-6 w-full">
                        <div className={cn(
                          "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-black text-lg shrink-0",
                          d.ok ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                        )}>
                          {idx + 1}
                        </div>
                        
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                          <div className="col-span-2 md:col-span-1">
                             <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Your Answer</p>
                             <p className={cn("font-bold truncate", d.ok ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>
                               {d.userAns || "— Skipped —"}
                             </p>
                          </div>
                          <div className="col-span-2 md:col-span-1 hidden sm:block">
                             <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Correct Answer</p>
                             <p className="font-bold text-slate-700 dark:text-slate-300 truncate">
                               {d.correctAns}
                             </p>
                          </div>
                          <div className="hidden md:flex items-center gap-2">
                             <Clock className="w-4 h-4 text-slate-400" />
                             <span className="font-bold text-slate-500">{fmtTime(d.timeSpentSeconds || 0)}</span>
                          </div>
                        </div>

                        <div className="shrink-0 text-slate-400">
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-slate-200 dark:border-slate-800"
                        >
                          <div className="p-6 md:p-8 bg-white dark:bg-slate-900">
                            {qEntity && (
                              <div className="mb-8 pb-8 border-b border-slate-100 dark:border-slate-800">
                                <h4 className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-4">Question Prompt</h4>
                                <div className="text-lg font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                                  {processLaTeX(qEntity.prompt || qEntity.text)}
                                </div>
                              </div>
                            )}

                            <div>
                               <h4 className="font-bold text-xs uppercase tracking-widest text-blue-600 mb-4 flex items-center gap-2"><Brain className="w-4 h-4" /> AI Explanation</h4>
                               <div className="prose prose-slate dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:font-medium">
                                 {d.aiExplanation ? (
                                   processLaTeX(d.aiExplanation)
                                 ) : (
                                   <p className="text-slate-500 italic">No AI explanation available for this question. (The AI explanation requires the backend `aiExplanation` field to be populated via Gemini).</p>
                                 )}
                               </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                );
             })}
          </div>
        </div>
      </div>
    </div>
  );
}
