import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, BrainCircuit, LineChart, FastForward, Timer, XCircle, PlayCircle, BarChart3, Bookmark, FileText, ChevronRight, ShieldAlert, ShieldCheck, History, Target
} from "lucide-react";
import { satScore, milliyScore, scoreLevel, rawToBand } from "@/lib/ielts";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function ExamResultDashboard({ result, questions, exam }: { result: any, questions: any[], exam: any }) {
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const nav = useNavigate();

  const kind = (result.kind ?? "exam").toLowerCase();
  const isSat = kind === "sat";
  const isMilliy = kind === "national_cert" || kind === "milliy";
  const isIelts = kind === "ielts" || kind === "reading" || kind === "listening";

  const totalCount = questions.length || 1;
  const correctCount = result.correct ?? 0;
  
  const details = result.detail || [];
  const wrongCount = details.filter((d: any) => !d.ok && d.userAns).length;
  const skippedCount = details.filter((d: any) => !d.userAns).length;
  
  const accuracy = Math.round((correctCount / Math.max(totalCount, 1)) * 100);

  const satPts = satScore(correctCount, totalCount);
  const milliyPts = milliyScore(correctCount, totalCount);
  const band = result.bandScore ?? result.band ?? 0;

  const elapsedSec = result.elapsedSec ?? 0;
  const elapsedMin = Math.floor(elapsedSec / 60);
  const elapsedSecRem = elapsedSec % 60;
  const timeStr = `${elapsedMin}m ${elapsedSecRem}s`;

  const avgTimePerQuestion = Math.round(elapsedSec / totalCount);
  const timeSpentMap = result.timeSpent || {};
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

        {/* AI PERFORMANCE COACH - Diagnostic Report */}
        <div className="p-8 border-b border-slate-300">
          <div className="flex items-center gap-2 mb-6 border-b-2 border-slate-800 pb-2">
            <FileText className="w-6 h-6 text-slate-800" />
            <h3 className="text-lg font-bold uppercase tracking-widest text-slate-800 font-sans">Diagnostic Analysis</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h4 className="text-sm font-sans font-bold uppercase text-[#166534] mb-3 flex items-center gap-2 border-b border-slate-200 pb-1">
                <CheckCircle2 className="w-4 h-4" /> Demonstrated Strengths
              </h4>
              <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
                {accuracy >= 80 ? (
                  <li>Candidate exhibits exceptional comprehension and foundational knowledge.</li>
                ) : accuracy >= 50 ? (
                  <li>Candidate displays adequate understanding of core concepts.</li>
                ) : (
                  <li>Candidate attempted a majority of items under timed conditions.</li>
                )}
                {Object.entries(topicStats).filter(([_, s]) => s.correct / s.total >= 0.7).map(([topic], idx) => (
                  <li key={idx}>High proficiency in <strong>{topic.toUpperCase()}</strong> methodology.</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-sans font-bold uppercase text-[#991b1b] mb-3 flex items-center gap-2 border-b border-slate-200 pb-1">
                <AlertCircle className="w-4 h-4" /> Areas for Improvement
              </h4>
              <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
                {skippedCount > 0 && <li>Candidate omitted {skippedCount} items. Guessing is recommended when no penalty applies.</li>}
                {Object.entries(topicStats).filter(([_, s]) => s.correct / s.total < 0.5).map(([topic], idx) => (
                  <li key={idx}>Deficiency identified in <strong>{topic.toUpperCase()}</strong> format questions.</li>
                ))}
                {accuracy < 50 && <li>Overall accuracy falls below standard benchmarks. Remedial study required.</li>}
              </ul>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-6">
            <h4 className="text-sm font-sans font-bold uppercase text-[#0f2c59] mb-4 flex items-center gap-2">
              <Bookmark className="w-4 h-4" /> Recommended Study Plan
            </h4>
            <div className="space-y-4 text-sm text-slate-700">
              <p>Based on the psychometric analysis of this examination, the following targeted interventions are recommended:</p>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex gap-3 items-start border-l-2 border-[#0f2c59] pl-3">
                  <span className="font-bold font-sans text-[#0f2c59]">Step 1:</span>
                  <p>Conduct a thorough review of the {wrongCount} incorrectly answered items in the Detailed Item Analysis section to identify recurring logical errors.</p>
                </div>
                <div className="flex gap-3 items-start border-l-2 border-[#0f2c59] pl-3">
                  <span className="font-bold font-sans text-[#0f2c59]">Step 2:</span>
                  <p>Allocate focused study sessions to the following critical domains: <strong>{Object.entries(topicStats).filter(([_, s]) => s.correct / s.total < 0.5).map(([t]) => t.toUpperCase()).join(", ") || "Foundational concepts"}</strong>.</p>
                </div>
                <div className="flex gap-3 items-start border-l-2 border-[#0f2c59] pl-3">
                  <span className="font-bold font-sans text-[#0f2c59]">Step 3:</span>
                  <p>Implement timed practice protocols to optimize pacing, aiming to reduce the current average time of {avgTimePerQuestion} seconds per item.</p>
                </div>
              </div>
            </div>
          </div>
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

                      <div className="bg-white border border-slate-300 p-5">
                        <p className="text-xs font-sans font-bold uppercase text-[#0f2c59] mb-3 flex items-center gap-2">
                          <BrainCircuit className="w-4 h-4" /> Item Rationale & Analysis
                        </p>
                        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                          {q.explanation || getExplanation(q.qtype, detail.correctAns, detail.userAns)}
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
          <Button size="lg" className="bg-[#0f2c59] hover:bg-[#1a365d] text-white font-bold px-10 rounded-none h-12 uppercase tracking-widest text-sm w-full md:w-auto" onClick={() => nav('/student')}>
            Return to Platform
          </Button>
        </div>
      </div>
    </div>
  );
}
