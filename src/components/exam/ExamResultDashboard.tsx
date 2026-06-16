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
import DOMPurify from "dompurify";
import katex from "katex";
import "katex/dist/katex.min.css";
import { api } from "@/lib/axios";

function processLaTeX(text: string) {
  if (!text) return "";
  const parts = text.split(/(\$\$[\s\S]*?\ExternalString|[\s\S]*?\$)/g); // using standard split logic from .bak
  // Let's refine split regex to match backup file's exact regex: text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g)
  const partsRegex = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
  return partsRegex.map((part, index) => {
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

export function ExamResultDashboard({ result, questions, exam }: { result: any, questions: any[], exam: any }) {
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
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
    if (qtype === "tfng") return `True/False/Not Given format: If the text agrees, it is True. If it contradicts, it is False. If there is no information, it is Not Given. The correct answer based on the text is ${c}.`;
    if (qtype === "ynng") return `Yes/No/Not Given format: Identifies writer's claims. Correct answer is ${c}.`;
    if (qtype === "mcq") return `Multiple Choice Questions require identifying paraphrased information. The correct option is ${c}.`;
    if (qtype === "fill") return `Fill in the Blanks require exact wording from the passage. The correct word(s): ${c}.`;
    return `The correct answer is officially designated as ${c}.`;
  };

  const finalScore = isSat ? satPts : isMilliy ? milliyPts : isIelts ? (band || "0.0") : `${accuracy}%`;
  const scoreType = isSat ? "Total Score" : isMilliy ? "Total Ball" : isIelts ? "Band Score" : "Accuracy";

  return (
    <div className="min-h-screen bg-[#e5e7eb] py-8 font-serif text-slate-900 selection:bg-blue-200">
      <div className="max-w-[900px] mx-auto bg-white shadow-2xl border border-slate-300">
        
        {/* OFFICIAL SCORE REPORT HEADER */}
        <div className="border-b-[4px] border-[#0f2c59] p-8 bg-white flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0f2c59] uppercase mb-1">Official Score Report</h1>
            <p className="text-sm font-sans text-slate-500 uppercase tracking-widest">{exam?.title || "Standardized Examination"}</p>
          </div>
          <div className="text-right">
            <img src="/logo.png" alt="LMSHub Official" className="h-10 mb-2 opacity-80 grayscale ml-auto" onError={(e) => e.currentTarget.style.display = 'none'} />
            <p className="text-xs font-sans text-slate-500 uppercase tracking-widest">Test Date: {new Date().toLocaleDateString()}</p>
            <p className="text-xs font-sans text-slate-500 uppercase tracking-widest">Candidate ID: {Math.floor(Math.random()*100000000)}</p>
          </div>
        </div>

        {/* HERO SCORES - Document Style */}
        <div className="p-8 border-b border-slate-300 bg-[#f8fafc] flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/3 bg-white border border-slate-300 p-6 flex flex-col items-center justify-center shadow-sm">
            <h2 className="text-xs font-sans font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">{scoreType}</h2>
            <div className="text-6xl font-bold text-[#0f2c59] tracking-tighter mb-2">{finalScore}</div>
            <p className="text-[10px] font-sans text-slate-400 uppercase text-center border-t border-slate-200 pt-2 w-full">Predicted Result</p>
          </div>
          <div className="w-full md:w-2/3 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border border-slate-200 bg-white p-4 flex flex-col justify-between">
              <span className="text-[10px] font-sans font-bold text-slate-500 uppercase">Total Questions</span>
              <span className="text-2xl font-bold text-slate-800">{totalCount}</span>
            </div>
            <div className="border border-slate-200 bg-white p-4 flex flex-col justify-between">
              <span className="text-[10px] font-sans font-bold text-[#166534] uppercase">Correct</span>
              <span className="text-2xl font-bold text-[#166534]">{correctCount}</span>
            </div>
            <div className="border border-slate-200 bg-white p-4 flex flex-col justify-between">
              <span className="text-[10px] font-sans font-bold text-[#991b1b] uppercase">Incorrect</span>
              <span className="text-2xl font-bold text-[#991b1b]">{wrongCount}</span>
            </div>
            <div className="border border-slate-200 bg-white p-4 flex flex-col justify-between">
              <span className="text-[10px] font-sans font-bold text-slate-500 uppercase">Omitted</span>
              <span className="text-2xl font-bold text-slate-800">{skippedCount}</span>
            </div>
            <div className="border border-slate-200 bg-white p-4 flex flex-col justify-between col-span-2">
              <span className="text-[10px] font-sans font-bold text-slate-500 uppercase">Total Time Used</span>
              <span className="text-xl font-bold text-slate-800 flex items-center gap-2"><Clock className="w-4 h-4"/> {timeStr}</span>
            </div>
            <div className="border border-slate-200 bg-white p-4 flex flex-col justify-between col-span-2">
              <span className="text-[10px] font-sans font-bold text-[#0f2c59] uppercase">Accuracy</span>
              <span className="text-xl font-bold text-[#0f2c59] flex items-center gap-2"><Target className="w-4 h-4"/> {accuracy}%</span>
            </div>
          </div>
        </div>

        {/* AI PERFORMANCE COACH - Dynamic Diagnostic Report */}
        <div className="p-8 border-b border-slate-300">
          {!currentResult?.aiCoachFeedback ? (
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center animate-pulse">
                  <BrainCircuit className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" style={{ animationDuration: '4s' }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    AI Performance Coach <span className="text-xs bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded animate-pulse font-mono font-bold">Analyzing...</span>
                  </h2>
                  <p className="text-sm text-slate-500">AI is analyzing your exam details to generate personalized feedback...</p>
                </div>
              </div>
              <div className="space-y-4 animate-pulse">
                <div className="h-6 bg-slate-200/60 dark:bg-slate-800 rounded w-1/3"></div>
                <div className="h-4 bg-slate-200/60 dark:bg-slate-800 rounded w-full"></div>
                <div className="h-4 bg-slate-200/60 dark:bg-slate-800 rounded w-5/6"></div>
                <div className="h-20 bg-slate-100 dark:bg-slate-800/50 rounded-xl mt-6"></div>
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
                return (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                         <BrainCircuit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                       </div>
                       <div>
                         <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Performance Coach</h2>
                         <p className="text-sm text-slate-500">Personalized feedback based on your exam data</p>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                         <h3 className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-xs mb-3 flex items-center gap-2"><Target className="w-4 h-4" /> Core Strengths</h3>
                         <ul className="space-y-2.5">
                           {coachFeedback?.strengths?.map((s: string, i: number) => (
                             <li key={i} className="flex items-start gap-3 p-3 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-xl border border-emerald-100/50 dark:border-emerald-500/10">
                               <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                               <span className="text-emerald-900 dark:text-emerald-100 text-sm font-medium leading-relaxed">{s}</span>
                             </li>
                           )) || <li>No strengths recorded.</li>}
                         </ul>
                       </div>
                       <div>
                         <h3 className="font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider text-xs mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Areas for Improvement</h3>
                         <ul className="space-y-2.5">
                           {coachFeedback?.weaknesses?.map((s: string, i: number) => (
                             <li key={i} className="flex items-start gap-3 p-3 bg-rose-50/50 dark:bg-rose-500/5 rounded-xl border border-rose-100/50 dark:border-rose-500/10">
                               <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                               <span className="text-rose-900 dark:text-rose-100 text-sm font-medium leading-relaxed">{s}</span>
                             </li>
                           )) || <li>No weaknesses recorded.</li>}
                         </ul>
                       </div>
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                       <h3 className="font-bold text-slate-800 dark:text-white uppercase tracking-wider text-xs mb-2">Study Plan</h3>
                       <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                         {coachFeedback?.studyPlan}
                       </p>
                       {coachFeedback?.recommendedTopics && coachFeedback.recommendedTopics.length > 0 && (
                         <div className="mt-4 flex flex-wrap gap-2 items-center">
                           <span className="text-xs font-bold text-slate-500 uppercase mr-2">Focus Topics:</span>
                           {coachFeedback.recommendedTopics.map((t: string, i: number) => (
                             <span key={i} className="px-3 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold">{t}</span>
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

        {/* ANALYTICS: TOPIC & TIME - Formal Layout */}
        <div className="p-8 border-b border-slate-300 bg-white grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-6 border-b-2 border-slate-800 pb-2">
              <BarChart3 className="w-5 h-5 text-slate-800" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 font-sans">Domain Performance</h3>
            </div>
            <div className="space-y-4">
              {Object.entries(topicStats).map(([topic, stat]) => {
                const pct = Math.round((stat.correct / stat.total) * 100);
                const color = pct >= 80 ? "bg-[#166534]" : pct >= 50 ? "bg-[#ca8a04]" : "bg-[#991b1b]";
                return (
                  <div key={topic} className="font-sans">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{topic}</span>
                      <span className="text-xs font-bold text-slate-900">{stat.correct}/{stat.total} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 overflow-hidden">
                      <div className={cn("h-full", color)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-6 border-b-2 border-slate-800 pb-2">
              <Timer className="w-5 h-5 text-slate-800" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 font-sans">Timing Analytics</h3>
            </div>
            <table className="w-full text-sm font-sans border border-slate-200">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-3 bg-slate-50 text-slate-600 font-bold uppercase text-xs">Average Pace</td>
                  <td className="p-3 text-right font-bold text-slate-900">{avgTimePerQuestion} sec/item</td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-3 bg-slate-50 text-slate-600 font-bold uppercase text-xs">Fastest Response</td>
                  <td className="p-3 text-right font-bold text-slate-900">{fastest} sec</td>
                </tr>
                <tr>
                  <td className="p-3 bg-slate-50 text-slate-600 font-bold uppercase text-xs">Slowest Response</td>
                  <td className="p-3 text-right font-bold text-slate-900">{slowest} sec</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* DETAILED ITEM ANALYSIS */}
        <div className="p-8">
          <div className="flex items-center gap-2 mb-6 border-b-2 border-slate-800 pb-2">
            <BarChart3 className="w-5 h-5 text-slate-800" />
            <h3 className="text-lg font-bold uppercase tracking-widest text-slate-800 font-sans">Detailed Item Analysis</h3>
          </div>

          <div className="space-y-3 font-sans">
            {details.map((detail: any, idx: number) => {
              const q = questions.find(question => question.id === detail.questionId);
              if (!q) return null;
              
              const isCorrect = detail.ok;
              const isSkipped = !detail.userAns;
              const isExpanded = expandedQ === q.id;
              
              const statusColor = isCorrect ? "text-[#166534] bg-[#f0fdf4] border-[#166534]" : isSkipped ? "text-slate-500 bg-slate-100 border-slate-400" : "text-[#991b1b] bg-[#fef2f2] border-[#991b1b]";

              return (
                <div key={q.id} className="border border-slate-300 bg-white rounded-sm overflow-hidden">
                  <div 
                    className="p-3 cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors"
                    onClick={() => setExpandedQ(isExpanded ? null : q.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 flex items-center justify-center font-bold text-slate-800 bg-slate-100 border border-slate-300 text-sm">
                        {q.position}
                      </div>
                      <div className={cn("px-2 py-0.5 text-[10px] font-bold uppercase border", statusColor)}>
                        {isCorrect ? "Correct" : isSkipped ? "Omitted" : "Incorrect"}
                      </div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 w-16">{q.qtype}</span>
                      <span className="text-[10px] font-bold uppercase text-slate-400 w-16"><Clock className="inline w-3 h-3 mr-1"/>{timeSpentMap[q.id] || 0}s</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden md:flex text-xs font-medium text-slate-600 w-48 truncate">
                        {q.prompt}
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50 p-6 font-serif">
                      <div className="mb-6">
                        <p className="text-xs font-sans font-bold uppercase text-slate-500 mb-2 border-b border-slate-200 pb-1">Question Item {q.position}</p>
                        <p className="text-base text-slate-900 leading-relaxed">{q.prompt}</p>
                      </div>

                      <table className="w-full text-sm font-sans border-collapse mb-6">
                        <thead>
                          <tr>
                            <th className="border border-slate-300 bg-slate-200 p-2 text-left w-1/2 uppercase text-xs">Candidate Response</th>
                            <th className="border border-slate-300 bg-slate-200 p-2 text-left w-1/2 uppercase text-xs">Designated Correct Answer</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className={cn("border border-slate-300 p-3 font-bold", isCorrect ? "text-[#166534]" : isSkipped ? "text-slate-500" : "text-[#991b1b]")}>
                              {detail.userAns || "OMITTED"}
                            </td>
                            <td className="border border-slate-300 p-3 font-bold text-slate-800">
                              {detail.correctAns}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="bg-white border border-slate-300 p-5 rounded-xl shadow-inner">
                        <p className="text-xs font-sans font-bold uppercase text-[#0f2c59] mb-3 flex items-center gap-2">
                          <BrainCircuit className="w-4 h-4 text-indigo-500" /> Item Rationale & Analysis
                        </p>
                        <div className="text-sm text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">
                          {detail.aiExplanation ? (
                            processLaTeX(detail.aiExplanation)
                          ) : currentResult?.aiCoachFeedback ? (
                            q.explanation || getExplanation(q.qtype, detail.correctAns, detail.userAns)
                          ) : (
                            <div className="flex items-center gap-2 text-indigo-500 animate-pulse font-medium">
                              <Loader2 className="h-4 w-4 animate-spin" /> AI explanation is generating...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-8 border-t border-slate-300 text-center font-sans">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">End of Official Score Report</p>
          <p className="text-[10px] text-slate-400 mb-8">Secure validation code: {Math.random().toString(36).substring(2, 15).toUpperCase()}</p>
          <Button size="lg" className="bg-[#0f2c59] hover:bg-[#1a365d] text-white font-bold px-10 rounded-none h-12 uppercase tracking-widest text-sm w-full md:w-auto" onClick={() => nav(`/${role || 'student'}`)}>
            Return to Platform
          </Button>
        </div>
      </div>
    </div>
  );
}
