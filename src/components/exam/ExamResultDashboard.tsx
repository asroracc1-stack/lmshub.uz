import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Clock, AlertCircle, BrainCircuit,
  Coins, Star, Trophy, Award, Sparkles, Share2,
  RotateCcw, MessageSquare, ChevronRight, LayoutDashboard,
  Loader2, Check, X, ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { api } from "@/lib/axios";

interface QuestionDetail {
  questionId: string;
  userAns: string;
  correctAns: string;
  ok: boolean;
  timeSpentSeconds: number;
  aiExplanation?: string;
}

interface ExamResultDashboardProps {
  result: any;
  questions: any[];
  exam: any;
  onReviewQuestion?: (index: number) => void;
}

export function ExamResultDashboard({ result, questions, exam, onReviewQuestion }: ExamResultDashboardProps) {
  const nav = useNavigate();
  const { refresh } = useAuth();
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiReport, setAiReport] = useState<any>(null);

  // Normalize details
  const rawDetails = result?.detail || result?.details || [];
  const details: QuestionDetail[] = rawDetails.map((d: any) => ({
    questionId: d.questionId || d.question_id || d.id,
    userAns: d.userAns !== undefined ? d.userAns : (d.user_ans !== undefined ? d.user_ans : ""),
    correctAns: d.correctAns !== undefined ? d.correctAns : (d.correct_ans !== undefined ? d.correct_ans : ""),
    ok: d.ok !== undefined ? d.ok : false,
    timeSpentSeconds: d.timeSpentSeconds !== undefined ? d.timeSpentSeconds : (d.time_spent_seconds !== undefined ? d.time_spent_seconds : 0),
    aiExplanation: d.aiExplanation || d.ai_explanation || d.explanation || ""
  }));

  const totalQuestions = questions.length || 1;
  
  // Calculate correct answers
  const questionResults = questions.map((q: any, index: number) => {
    const detail = details.find((d) => String(d.questionId) === String(q.id));
    const userAns = detail ? detail.userAns : "";
    
    let correctAns = q.correctAnswer || q.correct_answer || "";
    if (!correctAns && q.options && q.options.length > 0) {
      const corrOpt = q.options.find((o: any) => o.isCorrect || o.is_correct);
      if (corrOpt) correctAns = corrOpt.text;
    }
    if (!correctAns && detail) {
      correctAns = detail.correctAns;
    }

    let isCorrect = false;
    let isOmitted = false;

    if (detail) {
      isCorrect = !!detail.ok;
    }

    const s = String(userAns).trim();
    if (s === "" || s === "-" || s.toLowerCase() === "skipped" || s.toLowerCase() === "null" || s.toLowerCase() === "not answered" || s.toLowerCase() === "omitted") {
      isOmitted = true;
    }

    if (isOmitted) {
      isCorrect = false;
    }

    return {
      index,
      question: q,
      userAns,
      correctAns,
      isCorrect,
      isOmitted,
      isIncorrect: !isCorrect && !isOmitted
    };
  });

  const correctCount = questionResults.filter(r => r.isCorrect).length;
  const accuracy = Math.round((correctCount / totalQuestions) * 100);
  const bandScore = Number(result?.bandScore) || 0.0;
  const timeUsedSeconds = result?.timeUsedSeconds ?? result?.elapsedSec ?? 0;

  // Format time
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  // Determine Band colors & metadata
  const getBandMeta = (band: number) => {
    if (band >= 8.0) {
      return {
        level: "Outstanding",
        cefr: "C2",
        gradient: "from-emerald-500/10 to-teal-500/10 border-emerald-500/30",
        text: "text-emerald-500 dark:text-emerald-400",
        badge: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        bar: "bg-emerald-500",
        advice: "Incredible mastery! You perform like an expert user. Keep practicing to maintain your peak shape."
      };
    } else if (band >= 6.5) {
      return {
        level: "Good User",
        cefr: "C1",
        gradient: "from-blue-500/10 to-indigo-500/10 border-blue-500/30",
        text: "text-blue-500 dark:text-blue-400",
        badge: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
        bar: "bg-blue-500",
        advice: "Solid performance! You show strong upper-intermediate skills. Focus on fine-tuning details to reach Band 8+."
      };
    } else if (band >= 5.0) {
      return {
        level: "Developing",
        cefr: "B2",
        gradient: "from-amber-500/10 to-orange-500/10 border-amber-500/30",
        text: "text-amber-500 dark:text-amber-400",
        badge: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
        bar: "bg-amber-500",
        advice: "Good progress! You show developing reading competence. Practice structured passages to target higher scores."
      };
    } else {
      return {
        level: "Needs Improvement",
        cefr: "B1",
        gradient: "from-rose-500/10 to-red-500/10 border-rose-500/30",
        text: "text-rose-500 dark:text-rose-400",
        badge: "bg-rose-500/20 text-rose-600 dark:text-rose-400",
        bar: "bg-rose-500",
        advice: "Need more practice. Concentrate on basic reading strategies, skimming/scanning, and vocabulary expansion."
      };
    }
  };

  const meta = getBandMeta(bandScore);

  // Trigger gamification & refresh auth profile on mount
  useEffect(() => {
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6"]
      });
    } catch (e) {
      console.log("Confetti trigger failed");
    }

    const awardUser = async () => {
      try {
        await api.post("/adventure/calculate", {
          testsSolved: 1,
          correctAnswers: correctCount,
          streakDays: 1,
          achievementsEarned: 0,
          newCoins: 5
        });
        await refresh();
      } catch (err) {
        console.error("Failed to credit rewards", err);
      }
    };
    awardUser();
  }, [correctCount, refresh]);

  // Load existing AI coach feedback if available on result object
  useEffect(() => {
    const feedback = result?.ai_coach_feedback || result?.aiCoachFeedback;
    if (feedback) {
      try {
        const parsed = typeof feedback === "string" ? JSON.parse(feedback) : feedback;
        if (parsed && (parsed.vocabularyAnalysis || parsed.studyPlan || parsed.strengths)) {
          setAiReport(parsed);
        }
      } catch (e) {
        // Fallback or ignore
      }
    }
  }, [result]);

  // Generate AI feedback handler
  const handleAiAnalyze = async () => {
    if (loadingAi) return;
    setLoadingAi(true);
    try {
      const attemptId = result?.attemptId || result?.attempt_id || result?.id;
      if (!attemptId) {
        toast.error("Attempt ID not found to run analysis.");
        setLoadingAi(false);
        return;
      }
      const res = await api.post(`/student/exams/attempts/${attemptId}/ai-diagnostic`);
      const parsed = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      setAiReport(parsed);
      toast.success("AI diagnostic report generated successfully!");
    } catch (err) {
      console.error("AI analysis failed", err);
      toast.error("Failed to generate AI diagnostic report.");
    } finally {
      setLoadingAi(false);
    }
  };

  // Action handlers
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Result URL copied to clipboard!");
  };

  const handleRetry = async () => {
    if (window.confirm("Do you want to retry this mock test? A new attempt will be created, and your previous attempts will be preserved in your history.")) {
      nav(`/student/exams/${exam.id}/take`);
    }
  };

  const handleBack = () => {
    nav("/student/dashboard");
  };

  return (
    <div className="w-full min-h-screen bg-slate-50/50 dark:bg-[#070311] py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-emerald-100 dark:selection:bg-emerald-950/40">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* 1. Success Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-3"
        >
          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 10 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 border border-emerald-100 dark:border-emerald-900/40 mb-2"
          >
            <Check className="w-8 h-8 stroke-[3]" />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Reading Test Complete!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg">
            Here are your results.
          </p>

          {/* ⭐ 5 Stars Animation */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex items-center justify-center gap-2 mt-2"
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.span
                key={i}
                initial={{ scale: 0, rotate: -30, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 12,
                  delay: 0.5 + i * 0.12
                }}
              >
                <Star className="w-8 h-8 fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]" />
              </motion.span>
            ))}
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.4 }}
            className="text-xs font-semibold text-amber-500 dark:text-amber-400 tracking-wider uppercase mt-1"
          >
            +5 Stars Earned
          </motion.p>
        </motion.div>

        {/* 2. Score Summary */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <Card className={cn(
            "relative overflow-hidden border shadow-xl rounded-3xl p-6 sm:p-8 bg-gradient-to-br transition-all duration-300",
            meta.gradient
          )}>
            <div className="flex flex-col items-center text-center space-y-6">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                IELTS Band Score
              </span>

              <div className="relative">
                <span className="text-7xl sm:text-8xl font-black text-slate-800 dark:text-white tracking-tighter">
                  {bandScore.toFixed(1)}
                </span>
                <span className="absolute -bottom-2 right-[-24px] text-xs font-bold text-slate-400">
                  / 9.0
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span className={cn("text-xl font-bold uppercase tracking-wider", meta.text)}>
                    {meta.level}
                  </span>
                  <span className="px-2 py-0.5 text-xs font-black rounded-md bg-white/40 dark:bg-black/20 border border-slate-200/50 dark:border-slate-800/40">
                    CEFR {meta.cefr}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md">
                  {meta.advice}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-sm space-y-1">
                <div className="flex justify-between text-[11px] font-bold text-slate-400">
                  <span>Progress</span>
                  <span>{correctCount} / {totalQuestions} Correct</span>
                </div>
                <div className="h-2 w-full bg-slate-200/60 dark:bg-slate-850 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${accuracy}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn("h-full rounded-full", meta.bar)}
                  />
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* 3. Statistics */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-4"
        >
          {/* Card: Accuracy */}
          <Card className="p-5 rounded-2xl border border-slate-100 dark:border-slate-850 bg-white/70 dark:bg-[#0f0a1d]/60 backdrop-blur-md flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-teal-500">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Accuracy</p>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">{accuracy}%</h3>
            </div>
          </Card>

          {/* Card: Correct / Total */}
          <Card className="p-5 rounded-2xl border border-slate-100 dark:border-slate-850 bg-white/70 dark:bg-[#0f0a1d]/60 backdrop-blur-md flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Correct</p>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">{correctCount} / {totalQuestions}</h3>
            </div>
          </Card>

          {/* Card: Time spent */}
          <Card className="p-5 rounded-2xl border border-slate-100 dark:border-slate-850 bg-white/70 dark:bg-[#0f0a1d]/60 backdrop-blur-md flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-500">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Time Spent</p>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">{formatTime(timeUsedSeconds)}</h3>
            </div>
          </Card>

          {/* Card: Coins */}
          <Card className="p-5 rounded-2xl border border-slate-100 dark:border-slate-850 bg-white/70 dark:bg-[#0f0a1d]/60 backdrop-blur-md flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-500 animate-pulse">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Coins Earned</p>
              <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">+5 Coins</h3>
            </div>
          </Card>

          {/* Card: Stars */}
          <Card className="p-5 rounded-2xl border border-slate-100 dark:border-slate-850 bg-white/70 dark:bg-[#0f0a1d]/60 backdrop-blur-md flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500">
              <Star className="w-6 h-6 fill-indigo-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Stars Earned</p>
              <h3 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">+5 Stars</h3>
            </div>
          </Card>

          {/* Card: XP Earned */}
          <Card className="p-5 rounded-2xl border border-slate-100 dark:border-slate-850 bg-white/70 dark:bg-[#0f0a1d]/60 backdrop-blur-md flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 text-purple-500">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">XP Awarded</p>
              <h3 className="text-xl font-bold text-purple-600 dark:text-purple-400">+{5 + Math.round(bandScore * 30)} XP</h3>
            </div>
          </Card>
        </motion.div>

        {/* 4. Answer Sheet */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              Answer Sheet
            </h2>
            
            {/* Show Correct Answers Toggle */}
            <div className="flex items-center space-x-2 bg-slate-100 dark:bg-[#140D23] border border-slate-200/60 dark:border-slate-800/40 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-semibold text-slate-500">Show Correct Answers</span>
              <button
                type="button"
                onClick={() => setShowCorrectAnswers(!showCorrectAnswers)}
                aria-pressed={showCorrectAnswers}
                aria-label="Toggle show correct answers"
                className={cn(
                  "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  showCorrectAnswers ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out",
                    showCorrectAnswers ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {questionResults.map((r) => {
              const itemColor = r.isCorrect 
                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/10"
                : r.isOmitted
                ? "border-slate-300 bg-slate-50 dark:bg-slate-900/10"
                : "border-rose-500 bg-rose-50/50 dark:bg-rose-950/10";
              
              const badgeColor = r.isCorrect
                ? "bg-emerald-500 text-white"
                : r.isOmitted
                ? "bg-slate-400 text-white"
                : "bg-rose-500 text-white";

              const qPos = r.question.position || r.question.positionOrder || r.question.position_order || (r.index + 1);

              return (
                <motion.div
                  key={r.question.id}
                  whileHover={{ scale: 1.01, y: -1 }}
                  onClick={() => onReviewQuestion && onReviewQuestion(r.index)}
                  className={cn(
                    "p-4 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all duration-200 shadow-xs",
                    itemColor
                  )}
                >
                  <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                    <span className={cn(
                       "w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 shadow-xs",
                       badgeColor
                    )}>
                      {qPos}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">User Answer</span>
                        <span className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest",
                          r.isCorrect ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" :
                          r.isOmitted ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" :
                          "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
                        )}>
                          {r.isCorrect ? "Correct" : r.isOmitted ? "Skipped" : "Wrong"}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate pr-2 mt-0.5">
                        {r.userAns ? r.userAns : <span className="text-slate-400 dark:text-slate-600 italic font-normal">— No answer —</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 pr-1 shrink-0">
                    {/* Correct Answers Slide-out */}
                    <AnimatePresence>
                      {showCorrectAnswers && (
                        <motion.div
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="text-right mr-2"
                        >
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Correct Answer</p>
                          <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 mt-0.5">
                            {r.correctAns || "TBD"}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Result Icon */}
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border-2",
                      r.isCorrect 
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-650"
                        : r.isOmitted
                        ? "border-slate-400 bg-slate-500/10 text-slate-500"
                        : "border-rose-500 bg-rose-500/10 text-rose-650"
                    )}>
                      {r.isCorrect ? <Check className="w-5 h-5 stroke-[3]" /> : r.isOmitted ? <span className="text-xs font-bold text-slate-500">—</span> : <X className="w-5 h-5 stroke-[3]" />}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* 5. AI Analyze */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="space-y-5"
        >
          <div className="flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800/40 pt-8">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-500" />
              AI Diagnostic Report
            </h2>
            {!aiReport && (
              <Button 
                onClick={handleAiAnalyze}
                disabled={loadingAi}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 border-0 shadow-md shadow-indigo-500/20 flex items-center gap-2"
              >
                {loadingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Analyze with AI
              </Button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {loadingAi ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-12 rounded-3xl border border-dashed border-indigo-200 dark:border-indigo-900/50 bg-indigo-500/[0.01] flex flex-col items-center justify-center space-y-4 text-center"
              >
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl animate-pulse" />
                  <Loader2 className="w-10 h-10 text-indigo-500 animate-spin relative" />
                </div>
                <h4 className="font-bold text-slate-700 dark:text-slate-350">Evaluating your performance details...</h4>
                <p className="text-xs text-slate-400 max-w-sm">Gemini is looking for patterns in your correct, incorrect, and omitted responses to draft a study priority plan.</p>
              </motion.div>
            ) : aiReport ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-5"
              >
                {/* Strengths Card */}
                <Card className="p-6 rounded-2xl border border-slate-100 dark:border-slate-850 bg-white dark:bg-[#0c0817] shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wider text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    Key Strengths
                  </h3>
                  <ul className="space-y-2">
                    {Array.isArray(aiReport.strengths) ? aiReport.strengths.map((s: string, idx: number) => (
                      <li key={idx} className="flex items-start text-sm text-slate-600 dark:text-slate-300">
                        <Check className="w-4 h-4 text-emerald-500 mr-2 mt-0.5 shrink-0" />
                        <span>{s}</span>
                      </li>
                    )) : <li className="text-sm text-slate-500">{aiReport.strengths || "Strengths analysis not generated."}</li>}
                  </ul>
                </Card>

                {/* Weaknesses Card */}
                <Card className="p-6 rounded-2xl border border-slate-100 dark:border-slate-850 bg-white dark:bg-[#0c0817] shadow-sm space-y-4">
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wider text-rose-600">
                    <ShieldAlert className="w-4 h-4" />
                    Target Weaknesses
                  </h3>
                  <ul className="space-y-2">
                    {Array.isArray(aiReport.weaknesses) ? aiReport.weaknesses.map((w: string, idx: number) => (
                      <li key={idx} className="flex items-start text-sm text-slate-600 dark:text-slate-300">
                        <X className="w-4 h-4 text-rose-500 mr-2 mt-0.5 shrink-0" />
                        <span>{w}</span>
                      </li>
                    )) : <li className="text-sm text-slate-500">{aiReport.weaknesses || "Weaknesses analysis not generated."}</li>}
                  </ul>
                </Card>

                {/* Question Type Analysis */}
                <Card className="p-6 rounded-2xl border border-slate-100 dark:border-slate-850 bg-white dark:bg-[#0c0817] shadow-sm space-y-4 md:col-span-2">
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wider text-indigo-600">
                    <BrainCircuit className="w-4 h-4" />
                    Question Type Analysis
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-300">
                    {Array.isArray(aiReport.questionTypeAnalysis) ? aiReport.questionTypeAnalysis.map((item: string, idx: number) => (
                      <div key={idx} className="bg-slate-55 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-80 border-slate-200/50 dark:border-slate-800/40 p-3 rounded-xl">
                        {item}
                      </div>
                    )) : <p>{aiReport.questionTypeAnalysis || "Question type statistics not analyzed."}</p>}
                  </div>
                </Card>

                {/* Vocabulary Analysis */}
                <Card className="p-6 rounded-2xl border border-slate-100 dark:border-slate-850 bg-white dark:bg-[#0c0817] shadow-sm space-y-3">
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider text-purple-600">
                    Vocabulary & Paraphrasing
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {aiReport.vocabularyAnalysis}
                  </p>
                </Card>

                {/* Time Analysis */}
                <Card className="p-6 rounded-2xl border border-slate-100 dark:border-slate-850 bg-white dark:bg-[#0c0817] shadow-sm space-y-3">
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider text-orange-600">
                    Time Management & Pacing
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {aiReport.timeAnalysis}
                  </p>
                </Card>

                {/* Study Plan */}
                <Card className="p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-500/[0.01] shadow-sm space-y-3 md:col-span-2">
                  <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wider text-indigo-600">
                    Personalized Study Recommendations Plan
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {aiReport.studyPlan}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/40">
                    <div className="text-xs">
                      <span className="text-slate-400 font-bold mr-1">Estimated Next:</span>
                      <span className="font-black text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">{aiReport.estimatedNextBand}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-slate-400 font-bold mr-1">Study Priority:</span>
                      <span className={cn(
                        "font-black px-2 py-0.5 rounded border",
                        String(aiReport.studyPriority).toLowerCase().includes("high") 
                          ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                          : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                      )}>{aiReport.studyPriority}</span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>

        {/* 6. Bottom Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-3 pt-6 border-t border-slate-200/60 dark:border-slate-800/40"
        >
          <Button 
            variant="outline" 
            onClick={handleShare}
            className="rounded-xl border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider px-5 py-2.5 flex items-center gap-2"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </Button>

          <Button 
            onClick={handleAiAnalyze}
            disabled={loadingAi || !!aiReport}
            className="rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 flex items-center gap-2"
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            Analyze
          </Button>

          <Button 
            variant="outline" 
            onClick={handleRetry}
            className="rounded-xl border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider px-5 py-2.5 flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Retry
          </Button>

          <Button 
            variant="outline" 
            onClick={() => {
              const comment = prompt("Please write your suggestion/feedback for this exam:");
              if (comment) toast.success("Thank you for your valuable feedback!");
            }}
            className="rounded-xl border-emerald-500/30 dark:border-emerald-900/50 bg-emerald-500/[0.02] hover:bg-emerald-500/[0.05] text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider px-5 py-2.5 flex items-center gap-2"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Leave Feedback
          </Button>

          <Button 
            onClick={handleBack}
            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 flex items-center gap-2"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Back to LMSHub
          </Button>
        </motion.div>

      </div>
    </div>
  );
}

export default ExamResultDashboard;
