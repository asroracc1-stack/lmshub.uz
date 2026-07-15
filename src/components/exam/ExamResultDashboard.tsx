import React, { useState, useEffect, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, BrainCircuit,
  Timer, XCircle, PlayCircle, BarChart3, Bookmark, FileText, ChevronRight,
  ShieldAlert, ShieldCheck, History, Target, Loader2, ArrowLeft, ArrowRight,
  BookOpen, Headphones, HelpCircle, FileSignature, Lightbulb, Pause, Play,
  Volume2, Share2, RotateCcw, LayoutDashboard, Search, ChevronLeft, ThumbsUp,
  AlertTriangle, Gauge, Zap, Sparkles, Trophy, Coins, Award
} from "lucide-react";
import { getExamCalculator, SATCalculator } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { formatMathText, MathRenderer } from "@/lib/math";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { api } from "@/lib/axios";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, BarChart, Bar, LineChart, Line, Legend, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";

// Helper components
function AnimatedCounter({ value, duration = 1.2, isFloat = false }: { value: number; duration?: number; isFloat?: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setCount(end);
      return;
    }
    
    const range = end - start;
    let current = start;
    const stepTime = 1000 / 60; // 65fps
    const totalFrames = Math.round(duration * 60);
    const increment = range / totalFrames;
    
    const timer = setInterval(() => {
      current += increment;
      if (increment > 0 && current >= end) {
        clearInterval(timer);
        setCount(end);
      } else if (increment < 0 && current <= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(current);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{isFloat ? count.toFixed(1) : Math.round(count)}</>;
}

export function ExamResultDashboard({ result, questions, exam }: { result: any, questions: any[], exam: any }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<'analytics' | 'analysis' | 'review'>('analytics');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [filterState, setFilterState] = useState<'all' | 'correct' | 'wrong' | 'review' | 'skipped'>('all');
  
  // Historical data states
  const [previousAttempts, setPreviousAttempts] = useState<any[]>([]);
  const [scoreDifference, setScoreDifference] = useState<number | null>(null);

  const kind = (exam?.type ?? result?.kind ?? "exam").toLowerCase();
  const isSat = kind === "sat";
  const isMilliy = kind === "national_cert" || kind === "milliy";
  const isIelts = kind === "ielts" || kind === "reading" || kind === "listening" || kind === "writing";

  // Confetti effect on mount
  useEffect(() => {
    try {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.65 },
        colors: ["#10b981", "#3b82f6", "#a855f7", "#f59e0b"]
      });
    } catch (e) {
      console.log("Confetti trigger failed");
    }
  }, []);

  // Normalize details fields to support both camelCase and snake_case backend serializations
  const rawDetails = result.detail || result.details || [];
  const details = rawDetails.map((d: any) => ({
    questionId: d.questionId || d.question_id || d.id,
    userAns: d.userAns !== undefined ? d.userAns : (d.user_ans !== undefined ? d.user_ans : ""),
    correctAns: d.correctAns !== undefined ? d.correctAns : (d.correct_ans !== undefined ? d.correct_ans : ""),
    ok: d.ok !== undefined ? d.ok : d.ok,
    timeSpentSeconds: d.timeSpentSeconds !== undefined ? d.timeSpentSeconds : (d.time_spent_seconds !== undefined ? d.time_spent_seconds : 0),
    aiExplanation: d.aiExplanation || d.ai_explanation || d.explanation || ""
  }));

  // Build robust mapped question results to guarantee stats sum correctness: Total = Correct + Incorrect + Omitted
  const questionResults = questions.map((q: any, idx: number) => {
    const detail = details.find((d: any) => String(d.questionId) === String(q.id));
    const userAns = detail ? detail.userAns : undefined;
    
    // Fallback logic for correct answer parsing
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

    if (userAns === undefined || userAns === null) {
      isOmitted = true;
    } else {
      const s = String(userAns).trim();
      if (s === "" || s === "-" || s.toLowerCase() === "skipped" || s.toLowerCase() === "null" || s.toLowerCase() === "not answered" || s.toLowerCase() === "omitted") {
        isOmitted = true;
      }
    }

    // Force consistency: if omitted, it cannot be correct
    if (isOmitted) {
      isCorrect = false;
    }

    const isIncorrect = !isCorrect && !isOmitted;
    const timeSpent = detail ? (detail.timeSpentSeconds || 0) : 0;

    return {
      question: q,
      userAns: userAns || "",
      correctAns: correctAns || "",
      isCorrect,
      isOmitted,
      isIncorrect,
      timeSpent,
      detail
    };
  });

  const totalQuestions = questions.length || 1;
  const correctAnswers = questionResults.filter(r => r.isCorrect).length;

  // Determine if ALL questions are unanswered
  const allUnanswered = questionResults.every(r => {
    const s = String(r.userAns).trim();
    return s === "" || s === "-" || s.toLowerCase() === "skipped" || s.toLowerCase() === "null" || s.toLowerCase() === "not answered" || s.toLowerCase() === "omitted";
  });

  let omittedAnswers = 0;
  let incorrectAnswers = 0;

  if (allUnanswered) {
    omittedAnswers = 0;
    incorrectAnswers = totalQuestions;
  } else {
    omittedAnswers = questionResults.filter(r => r.isOmitted).length;
    incorrectAnswers = questionResults.filter(r => r.isIncorrect).length;
  }

  // Double check strict summation logic: Correct + Incorrect + Omitted = Total Questions
  const totalSum = correctAnswers + incorrectAnswers + omittedAnswers;
  if (totalSum !== totalQuestions) {
    incorrectAnswers = Math.max(0, totalQuestions - correctAnswers - omittedAnswers);
  }

  const accuracy = Math.round((correctAnswers / totalQuestions) * 100);

  // Mapped details with prompt and qtype for exact classification
  const mappedDetailsForCalc = questionResults.map(r => ({
    ...r.detail,
    ok: r.isCorrect,
    qtype: r.question.questionType || r.question.question_type || r.question.category || "",
    prompt: r.question.text || r.question.prompt || ""
  }));

  // If SAT, fetch details breakdown from the SATCalculator
  let satBreakdown = {
    rwCorrect: 0,
    rwTotal: 0,
    rwScore: 200,
    mathCorrect: 0,
    mathTotal: 0,
    mathScore: 200,
    totalScore: 400,
    isSingleSection: false,
    singleSectionName: ""
  };

  const satCalc = getExamCalculator("sat") as SATCalculator;
  if (isSat && satCalc && typeof satCalc.calculateBreakdown === "function") {
    satBreakdown = satCalc.calculateBreakdown(allUnanswered ? 0 : correctAnswers, totalQuestions, mappedDetailsForCalc, exam);
  }

  // Recalculate score using strategy classes
  const calculator = getExamCalculator(kind);
  let finalScore = allUnanswered ? 0 : calculator.calculate(correctAnswers, totalQuestions, mappedDetailsForCalc, exam);
  if (isSat && allUnanswered) {
    finalScore = satBreakdown.isSingleSection ? 200 : 400;
  }

  const numericScore = Number(finalScore) || 0;

  // Fetch past attempts to find score improvement
  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        const response = await api.get<any[]>('/student/exams/attempts');
        const attempts = response.data || [];
        setPreviousAttempts(attempts);

        const finishedAttempts = attempts
          .filter((a: any) => a.exam_id === exam?.id && a.finished_at && a.id !== result?.id)
          .sort((a: any, b: any) => new Date(b.finished_at).getTime() - new Date(a.finished_at).getTime());

        if (finishedAttempts.length > 0) {
          const latestPastAttempt = finishedAttempts[0];
          const pastVal = Number(latestPastAttempt.score ?? latestPastAttempt.overallBand ?? latestPastAttempt.totalScore) || 0;
          setScoreDifference(numericScore - pastVal);
        }
      } catch (err) {
        console.error("Failed to load historical attempts", err);
      }
    };
    fetchAttempts();
  }, [exam, result, numericScore]);

  // Performance Rating Logic for Circular progress label
  const scoreRatio = isSat
    ? Math.max(0, ((allUnanswered ? (satBreakdown.isSingleSection ? 200 : 400) : numericScore) - (satBreakdown.isSingleSection ? 200 : 400)) / (satBreakdown.isSingleSection ? 600 : 1200))
    : isMilliy
    ? (allUnanswered ? 0 : numericScore) / 100
    : isIelts
    ? numericScore / 9.0
    : accuracy / 100;

  // Color theme variables based on Score / IELTS Band
  const bandTheme = useMemo(() => {
    const ratio = scoreRatio;
    if (isIelts) {
      if (numericScore >= 8.0) {
        return {
          gradient: "from-emerald-500 to-cyan-400 dark:from-emerald-400 dark:to-cyan-400",
          glowColor: "rgba(16, 185, 129, 0.4)",
          textClass: "text-emerald-500 dark:text-emerald-400",
          cardClass: "border-emerald-500/20 bg-emerald-500/[0.02]",
          textColor: "text-emerald-600 dark:text-emerald-400",
          level: "Expert User / Advanced (C2)",
          target: 8.5,
          gap: 8.5 - numericScore
        };
      } else if (numericScore >= 6.0) {
        return {
          gradient: "from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400",
          glowColor: "rgba(59, 130, 246, 0.4)",
          textClass: "text-blue-500 dark:text-blue-400",
          cardClass: "border-blue-500/20 bg-blue-500/[0.02]",
          textColor: "text-blue-600 dark:text-blue-400",
          level: "Competent User / Upper Intermediate (B2)",
          target: 7.5,
          gap: 7.5 - numericScore
        };
      } else if (numericScore >= 4.0) {
        return {
          gradient: "from-orange-500 to-red-500 dark:from-orange-400 dark:to-red-400",
          glowColor: "rgba(249, 115, 22, 0.4)",
          textClass: "text-orange-500 dark:text-orange-400",
          cardClass: "border-orange-500/20 bg-orange-500/[0.02]",
          textColor: "text-orange-600 dark:text-orange-400",
          level: "Modest User / Intermediate (B1)",
          target: 6.5,
          gap: 6.5 - numericScore
        };
      } else {
        return {
          gradient: "from-red-600 to-rose-700 dark:from-red-500 dark:to-rose-600",
          glowColor: "rgba(239, 68, 68, 0.4)",
          textClass: "text-red-500 dark:text-red-400",
          cardClass: "border-red-500/20 bg-red-500/[0.02]",
          textColor: "text-red-600 dark:text-red-450",
          level: "Limited / Elementary (A1-A2)",
          target: 5.5,
          gap: 5.5 - numericScore
        };
      }
    } else {
      // General non-IELTS score ratio mapping
      if (ratio >= 0.85) {
        return {
          gradient: "from-emerald-500 to-cyan-400",
          glowColor: "rgba(16, 185, 129, 0.4)",
          textClass: "text-emerald-500 dark:text-emerald-400",
          cardClass: "border-emerald-500/20 bg-emerald-500/[0.02]",
          textColor: "text-emerald-600 dark:text-emerald-400",
          level: "Excellent",
          target: 100,
          gap: 0
        };
      } else if (ratio >= 0.70) {
        return {
          gradient: "from-blue-500 to-purple-500",
          glowColor: "rgba(59, 130, 246, 0.4)",
          textClass: "text-blue-500 dark:text-blue-400",
          cardClass: "border-blue-500/20 bg-blue-500/[0.02]",
          textColor: "text-blue-600 dark:text-blue-400",
          level: "Good",
          target: 85,
          gap: 0
        };
      } else if (ratio >= 0.50) {
        return {
          gradient: "from-orange-500 to-red-500",
          glowColor: "rgba(249, 115, 22, 0.4)",
          textClass: "text-orange-500 dark:text-orange-400",
          cardClass: "border-orange-500/20 bg-orange-500/[0.02]",
          textColor: "text-orange-600 dark:text-orange-400",
          level: "Average",
          target: 70,
          gap: 0
        };
      } else {
        return {
          gradient: "from-red-600 to-rose-700",
          glowColor: "rgba(239, 68, 68, 0.4)",
          textClass: "text-red-500 dark:text-red-400",
          cardClass: "border-red-500/20 bg-red-500/[0.02]",
          textColor: "text-red-600 dark:text-red-400",
          level: "Poor",
          target: 50,
          gap: 0
        };
      }
    }
  }, [numericScore, scoreRatio, isIelts]);

  let performanceLabel = bandTheme.level.split(" ")[0];
  let labelColor = bandTheme.textClass;

  const scoreType = isSat 
    ? (satBreakdown.isSingleSection ? (satBreakdown.singleSectionName === "math" ? "Math Section Score" : "R&W Section Score") : "SAT Score") 
    : isIelts ? "IELTS Band" : isMilliy ? "Milliy Sertifikat" : "General Score";
    
  const scoreSub = isSat 
    ? (satBreakdown.isSingleSection ? "200 - 800 Scale" : "400 - 1600 Scale") 
    : isIelts ? "0 - 9.0 Band Score" : isMilliy ? "0 - 100 Ball" : "Percentage Natija";

  const elapsedSec = result.timeUsedSeconds ?? result.elapsedSec ?? 0;
  const elapsedMin = Math.floor(elapsedSec / 60);
  const elapsedSecRem = elapsedSec % 60;
  const timeStr = `${elapsedMin}m ${elapsedSecRem}s`;
  const avgTimePerQuestion = Math.round(elapsedSec / totalQuestions);

  // Group Question Type stats dynamically
  const questionTypeStats = useMemo(() => {
    const stats: Record<string, { correct: number; total: number }> = {};
    questionResults.forEach((r) => {
      const rawType = r.question.questionType || r.question.question_type || r.question.category || "General";
      const label = mapQuestionTypeToLabel(rawType);
      if (!stats[label]) {
        stats[label] = { correct: 0, total: 0 };
      }
      stats[label].total++;
      if (r.isCorrect) {
        stats[label].correct++;
      }
    });

    return Object.entries(stats).map(([label, s]) => {
      const acc = Math.round((s.correct / s.total) * 100);
      return {
        label,
        correct: s.correct,
        total: s.total,
        accuracy: acc,
      };
    });
  }, [questionResults]);

  function mapQuestionTypeToLabel(raw: string): string {
    const t = (raw ?? "").toLowerCase().replace(/-/g, "_");
    if (t.includes("heading") || t === "headings") return "Matching Headings";
    if (t.includes("tfng") || t.includes("true_false") || t.includes("true false")) return "True / False / Not Given";
    if (t.includes("ynng") || t.includes("yes_no") || t.includes("yes no")) return "Yes / No / Not Given";
    if (t.includes("mcq") || t.includes("multiple_choice") || t.includes("multiplechoice") || t.includes("single_choice")) return "Multiple Choice";
    if (t.includes("sentence") || t.includes("sentence_completion")) return "Sentence Completion";
    if (t.includes("summary") || t.includes("summary_completion") || t.includes("fill")) return "Summary Completion";
    if (t.includes("matching") || t.includes("matching_info") || t.includes("matching_information")) return "Matching Information";
    if (t.includes("short") || t.includes("short_answer")) return "Short Answer Questions";
    return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "General Questions";
  }

  // Dynamic AI Strength & Weaknesses Diagnosis
  const analysis = useMemo(() => {
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    questionTypeStats.forEach(stat => {
      if (stat.accuracy >= 65) {
        strengths.push(`${stat.label} (${stat.accuracy}% accuracy)`);
      } else {
        weaknesses.push(`${stat.label} (${stat.accuracy}% accuracy)`);
      }
    });

    if (strengths.length === 0) strengths.push("Basic concept retrieval & outline matching");
    if (weaknesses.length === 0) weaknesses.push("None! Highly consistent performance");

    return {
      strengths,
      weaknesses
    };
  }, [questionTypeStats]);

  const aiRecommendation = useMemo(() => {
    if (questionTypeStats.length === 0) return "Maintain consistent simulated mock schedules to lock in pacing guidelines.";
    const sorted = [...questionTypeStats].sort((a, b) => a.accuracy - b.accuracy);
    const weakest = sorted[0];

    if (weakest.accuracy >= 85) {
      return "Outstanding balance of lexicon and speed! Continue practicing full IELTS simulations to build fatigue tolerance.";
    }

    const label = weakest.label;
    if (label === "Multiple Choice") {
      return "You lose most marks in Multiple Choice Questions. Spend more time practicing elimination techniques and keyword scanning, while ignoring common distractor synonym trap patterns.";
    } else if (label === "True / False / Not Given" || label === "Yes / No / Not Given") {
      return "Focus on distinguishing 'False' (the text contradicts) from 'Not Given' (the text provides no facts to confirm or deny). Scanning context is key.";
    } else if (label === "Matching Headings") {
      return "Avoid keyword matching traps. Read paragraphs for overall thematic intent, prioritizing the opening topic sentences and closing summaries.";
    } else if (label === "Sentence Completion" || label === "Summary Completion") {
      return "Ensure strict word counts are met and review spelling accuracy. Pay close attention to synonym matching for contextual words.";
    } else if (label === "Matching Information") {
      return "Skim paragraph blocks specifically to locate contextual triggers and synonyms instead of analyzing paragraph blocks in full depth.";
    } else {
      return `Practice vocabulary variations and scan synonym cues in passages to address comprehension performance in ${label}.`;
    }
  }, [questionTypeStats]);

  // Gamification & Achievements dynamic parsing
  const gamificationRewards = useMemo(() => {
    const list = [];
    if (isIelts || isSat || isMilliy) {
      list.push({ title: "IELTS Exam completed", xp: "+50 XP", coins: "+20 Coins", icon: Trophy });
    }

    const earnedAchievements = [];
    if (isIelts && kind.includes("reading")) {
      earnedAchievements.push({ title: "Reading Machine", desc: "Completed reading test simulation", icon: "📖" });
      if (avgTimePerQuestion < 45) {
        earnedAchievements.push({ title: "Fast Reader", desc: "Paced under 45 seconds average per item", icon: "⚡" });
      }
    }
    if (isIelts && kind.includes("listening")) {
      if (accuracy > 85) {
        earnedAchievements.push({ title: "Listening Expert", desc: "Achieved over 85% accuracy in Listening", icon: "🎧" });
      }
    }
    if (accuracy > 80) {
      earnedAchievements.push({ title: "Vocabulary Master", desc: "Lexical precision over 80%", icon: "🎓" });
    }
    if (kind.includes("writing") || accuracy > 80) {
      earnedAchievements.push({ title: "Grammar Hunter", desc: "High syntactical consistency", icon: "✍️" });
    }

    return {
      rewards: list,
      achievements: earnedAchievements
    };
  }, [isIelts, isSat, isMilliy, kind, avgTimePerQuestion, accuracy]);

  // Recharts historical attempts format
  const chartData = useMemo(() => {
    // Current attempt format
    const currentAttemptObj = {
      name: "Current",
      score: numericScore,
      accuracy: accuracy,
      speed: avgTimePerQuestion
    };

    if (previousAttempts.length === 0) {
      // Mock history details if first attempt to prevent empty charts
      return [
        { name: "Global Avg", score: isIelts ? 6.0 : (isSat ? 1000 : 60), accuracy: 60, speed: 60 },
        { name: "Target", score: isIelts ? 7.5 : (isSat ? 1350 : 80), accuracy: 80, speed: 45 },
        currentAttemptObj
      ];
    }

    // Sort chronologically and extract last 5 finished attempts
    const sorted = [...previousAttempts]
      .filter((a: any) => a.exam_id === exam?.id && a.finished_at)
      .sort((a: any, b: any) => new Date(a.finished_at).getTime() - new Date(b.finished_at).getTime())
      .slice(-6);

    const historyData = sorted.map((att: any, idx: number) => {
      const sc = Number(att.score ?? att.overallBand ?? att.totalScore) || 0;
      const totalQ = questions.length || 40;
      // Synthesize accuracy from past details or default estimates
      const correctCount = att.correctAnswers ?? Math.round(totalQ * (sc / (isIelts ? 9 : (isSat ? 1600 : 100))));
      const acc = Math.round((correctCount / totalQ) * 100);
      const elapsed = att.timeUsedSeconds ?? att.elapsedSec ?? 2400;
      const speed = Math.round(elapsed / totalQ);

      return {
        name: `Attempt ${idx + 1}`,
        score: sc,
        accuracy: acc,
        speed: speed
      };
    });

    // Append current
    return [...historyData, currentAttemptObj];
  }, [previousAttempts, exam, numericScore, accuracy, avgTimePerQuestion, isIelts, isSat, questions.length]);

  // PDF report card download utilizing jsPDF
  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    const primaryThemeColor = [139, 92, 246]; // Purple
    
    // Document Header
    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, 210, 45, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("LMSHub AI Result Report Card", 20, 28);
    
    // Exam metadata
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("World-class AI Performance Diagnostics Report", 20, 36);

    // Section 1: Score Footprint
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Performance Footprint", 20, 60);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Test Title: ${exam?.title || "Exam Simulator Result"}`, 20, 70);
    doc.text(`Date Completed: ${new Date().toLocaleDateString()}`, 20, 76);
    doc.text(`Exam Category: ${kind.toUpperCase()}`, 20, 82);

    doc.setFont("helvetica", "bold");
    doc.text(`Band Score / Score: ${finalScore} / ${isIelts ? '9.0' : (isSat ? '1600' : '100')}`, 120, 70);
    doc.text(`Correct Answers: ${correctAnswers} / ${totalQuestions} (${accuracy}%)`, 120, 76);
    doc.text(`Time Spent: ${timeStr} (Avg ${avgTimePerQuestion}s/q)`, 120, 82);

    // Section 2: AI Strengths & Weaknesses
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("AI Diagnostic Profile", 20, 100);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Strengths identified:", 20, 110);
    doc.setFont("helvetica", "normal");
    analysis.strengths.forEach((s, idx) => doc.text(`* ${s}`, 25, 118 + (idx * 6)));

    const yStartWeak = 118 + (analysis.strengths.length * 6) + 4;
    doc.setFont("helvetica", "bold");
    doc.text("Focus areas / Weaknesses:", 20, yStartWeak);
    doc.setFont("helvetica", "normal");
    analysis.weaknesses.forEach((w, idx) => doc.text(`* ${w}`, 25, yStartWeak + 8 + (idx * 6)));

    // Section 3: AI Recommendations
    const yStartRec = yStartWeak + 8 + (analysis.weaknesses.length * 6) + 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("AI Study Recommendations", 20, yStartRec);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const splitAdvice = doc.splitTextToSize(aiRecommendation, 170);
    doc.text(splitAdvice, 20, yStartRec + 10);

    // Section 4: Question Category Table
    const yStartTable = yStartRec + 10 + (splitAdvice.length * 5) + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Category Breakdown", 20, yStartTable);

    const tableRows = questionTypeStats.map(stat => [
      stat.label,
      `${stat.correct} / ${stat.total}`,
      `${stat.accuracy}%`
    ]);

    (doc as any).autoTable({
      startY: yStartTable + 6,
      head: [['Question Category', 'Correct / Total', 'Accuracy Rate']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: primaryThemeColor }
    });

    doc.save(`LMSHub_ExamReport_${exam?.title?.replace(/\s+/g, "_") || "IELTS"}.pdf`);
    toast.success("Professional PDF report downloaded!");
  };

  const handleShare = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Result details link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  // SVGs for Premium Animated progress rings
  const radius = 74;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - scoreRatio);

  const activeQ = questions[activeQuestionIndex];
  const activeResult = questionResults[activeQuestionIndex];

  // AI Transcript Highlights for Listening
  const highlightTranscriptKeywords = (text: string, correctAns: string) => {
    if (!text) return null;
    if (!correctAns) return <span>{text}</span>;
    const cleanAns = String(correctAns).trim();
    if (!cleanAns) return <span>{text}</span>;

    // Highlight answer key in reference transcript
    const escaped = cleanAns.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    try {
      const regex = new RegExp(`(${escaped})`, 'gi');
      const parts = text.split(regex);
      return (
        <span className="leading-relaxed">
          {parts.map((p, i) => 
            regex.test(p) ? (
              <span key={i} className="bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/20 animate-pulse">
                {p}
              </span>
            ) : p
          )}
        </span>
      );
    } catch {
      return <span>{text}</span>;
    }
  };

  // Framer Motion entry configurations
  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12 }
    }
  };

  const itemFadeInUp = {
    hidden: { opacity: 0, y: 35 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 14 }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 font-sans pb-16 transition-colors duration-300 animate-fade-in">
      
      {/* Header bar */}
      <header className="bg-white/80 dark:bg-[#0F172A]/80 border-b border-slate-200 dark:border-white/[0.06] py-4 px-6 sticky top-0 z-30 shadow-md backdrop-blur-md flex items-center justify-between transition-colors">
        <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="ghost" className="rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300" onClick={() => nav(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-extrabold text-lg text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1">{exam?.title || "IELTS Analytics"}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">LMSHub AI Diagnostic Center</p>
            </div>
          </div>
          
          {/* Action Tabs & Controls */}
          <div className="flex items-center flex-wrap gap-2.5">
            <Badge variant="secondary" className="px-3 py-1 text-[10px] font-black uppercase bg-[#8B5CF6]/15 text-[#8b5cf6] dark:text-[#a855f7] border border-[#8B5CF6]/20">
              {kind.toUpperCase()}
            </Badge>

            <Button
              variant={activeTab === 'analytics' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('analytics')}
              className={cn(
                "rounded-xl gap-2 font-bold text-xs h-9 px-4 transition-all duration-300",
                activeTab === 'analytics' 
                  ? "bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white shadow-lg shadow-[#8B5CF6]/25 border-none animate-[scale-in_0.2s_ease-out]" 
                  : "bg-white dark:bg-[#0F172A] border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
              )}
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
            </Button>
            
            <Button
              variant={activeTab === 'analysis' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('analysis')}
              className={cn(
                "rounded-xl gap-2 font-bold text-xs h-9 px-4 transition-all duration-300",
                activeTab === 'analysis' 
                  ? "bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white shadow-lg shadow-[#8B5CF6]/25 border-none animate-[scale-in_0.2s_ease-out]" 
                  : "bg-white dark:bg-[#0F172A] border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
              )}
            >
              <BrainCircuit className="w-3.5 h-3.5" /> AI Coach
            </Button>

            <Button
              variant={activeTab === 'review' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('review')}
              className={cn(
                "rounded-xl gap-2 font-bold text-xs h-9 px-4 transition-all duration-300",
                activeTab === 'review' 
                  ? "bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white shadow-lg shadow-[#8B5CF6]/25 border-none animate-[scale-in_0.2s_ease-out]" 
                  : "bg-white dark:bg-[#0F172A] border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
              )}
            >
              <Search className="w-3.5 h-3.5" /> Question Review
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* TAB 1: ANALYTICS DASHBOARD */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              
              {/* HERO METRICS SECTION */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Visual score circular progress ring */}
                <motion.div variants={itemFadeInUp}>
                  <Card className="border border-slate-200 dark:border-white/[0.06] p-8 rounded-2xl bg-white dark:bg-[#0F172A] flex flex-col items-center justify-between shadow-xl relative overflow-hidden group h-full transition-[border-color,box-shadow] duration-350 hover:border-violet-500/20 hover:shadow-violet-500/[0.02]">
                    {/* Orb Glow backdrop */}
                    <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none transition-all duration-500 bg-gradient-to-r", bandTheme.gradient)} />

                    <div className="w-full text-center sm:text-left select-none">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{scoreType}</h3>
                      <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">{scoreSub}</p>
                    </div>

                    {/* Progress Circle Visualizer */}
                    <div className="relative my-6 flex items-center justify-center select-none">
                      <svg className="w-48 h-48 transform -rotate-90">
                        <defs>
                          <linearGradient id="scoreGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#3b82f6" />
                          </linearGradient>
                          <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="5" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                          </filter>
                        </defs>
                        {/* Background ring */}
                        <circle
                          cx="96"
                          cy="96"
                          r={radius}
                          stroke="currentColor"
                          strokeWidth={strokeWidth}
                          fill="transparent"
                          className="text-slate-100 dark:text-white/[0.03]"
                        />
                        {/* Animated foreground ring */}
                        <motion.circle
                          cx="96"
                          cy="96"
                          r={radius}
                          stroke="url(#scoreGlowGrad)"
                          strokeWidth={strokeWidth}
                          fill="transparent"
                          strokeDasharray={circumference}
                          initial={{ strokeDashoffset: circumference }}
                          animate={{ strokeDashoffset: strokeDashoffset }}
                          transition={{ duration: 1.5, ease: "easeOut", delay: 0.1 }}
                          strokeLinecap="round"
                          filter="url(#ringGlow)"
                        />
                      </svg>

                      {/* Numeric values */}
                      <div className="absolute flex flex-col items-center justify-center text-center animate-[scale-in_0.4s_ease-out]">
                        <span className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
                          <AnimatedCounter value={numericScore} isFloat={isIelts} />
                        </span>
                        <span className={cn("text-[9px] font-extrabold uppercase mt-1 tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08]", labelColor)}>
                          {performanceLabel}
                        </span>
                      </div>
                    </div>

                    <div className="w-full border-t border-slate-200 dark:border-white/[0.06] pt-4 flex justify-between items-center text-xs font-semibold text-slate-400 select-none">
                      <span>Score Level</span>
                      <span className="text-slate-900 dark:text-white font-extrabold uppercase tracking-wide">
                        {isIelts ? `Target ${bandTheme.target}` : "Official"}
                      </span>
                    </div>
                  </Card>
                </motion.div>

                {/* Score Stats Details Grid */}
                <motion.div variants={itemFadeInUp} className="lg:col-span-2">
                  <Card className="border border-slate-200 dark:border-white/[0.06] p-6 rounded-2xl bg-white dark:bg-[#0F172A] shadow-xl flex flex-col justify-between h-full relative overflow-hidden transition-[border-color,box-shadow] duration-350 hover:border-violet-500/20 hover:shadow-violet-500/[0.02]">
                    <div>
                      <div className="flex justify-between items-center mb-5">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Performance Statistics</h3>
                        {scoreDifference !== null && (
                          <Badge className={cn("rounded-lg px-2.5 py-1 text-xs font-bold border flex items-center gap-1 shadow-sm", 
                            scoreDifference > 0 
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                              : scoreDifference < 0
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-455 border-rose-500/20"
                              : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
                          )}>
                            {scoreDifference > 0 ? "▲ Score Improved" : scoreDifference < 0 ? "▼ Score Decreased" : "No Change"}
                            {scoreDifference !== 0 && ` (${scoreDifference > 0 ? "+" : ""}${scoreDifference.toFixed(1)})`}
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Correct Answers */}
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] hover:border-emerald-500/30 hover:bg-emerald-500/[0.01] transition-all duration-300 relative overflow-hidden group">
                          <CheckCircle2 className="w-8 h-8 absolute top-2 right-2 text-emerald-500/10 group-hover:text-emerald-500/20 transition-colors" />
                          <span className="text-slate-400 block text-[9px] uppercase font-black tracking-wider mb-1">Correct Answers</span>
                          <span className="text-3xl font-black text-emerald-500 dark:text-emerald-400">
                            <AnimatedCounter value={correctAnswers} />
                          </span>
                          <span className="text-slate-500 text-xs font-bold block mt-1">({accuracy}% accuracy)</span>
                        </div>

                        {/* Wrong Answers */}
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] hover:border-rose-500/30 hover:bg-rose-500/[0.01] transition-all duration-300 relative overflow-hidden group">
                          <XCircle className="w-8 h-8 absolute top-2 right-2 text-rose-500/10 group-hover:text-rose-500/20 transition-colors" />
                          <span className="text-slate-400 block text-[9px] uppercase font-black tracking-wider mb-1">Wrong Answers</span>
                          <span className="text-3xl font-black text-rose-500">
                            <AnimatedCounter value={incorrectAnswers} />
                          </span>
                          <span className="text-slate-500 text-xs font-bold block mt-1">({Math.round((incorrectAnswers/totalQuestions)*100)}% count)</span>
                        </div>

                        {/* Omitted */}
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] hover:border-amber-500/30 hover:bg-amber-500/[0.01] transition-all duration-300 relative overflow-hidden group">
                          <AlertCircle className="w-8 h-8 absolute top-2 right-2 text-amber-500/10 group-hover:text-amber-500/20 transition-colors" />
                          <span className="text-slate-400 block text-[9px] uppercase font-black tracking-wider mb-1">Omitted</span>
                          <span className="text-3xl font-black text-amber-500">
                            <AnimatedCounter value={omittedAnswers} />
                          </span>
                          <span className="text-slate-500 text-xs font-bold block mt-1">({Math.round((omittedAnswers/totalQuestions)*100)}% skipped)</span>
                        </div>

                        {/* Time spent */}
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] hover:border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/[0.01] transition-all duration-300 relative overflow-hidden group">
                          <Clock className="w-8 h-8 absolute top-2 right-2 text-[#8B5CF6]/10 group-hover:text-[#8B5CF6]/20 transition-colors" />
                          <span className="text-slate-400 block text-[9px] uppercase font-black tracking-wider mb-1">Time Spent</span>
                          <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{timeStr}</span>
                          <span className="text-slate-500 text-xs font-bold block mt-1">Total Duration</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress indicators details footer */}
                    <div className="border-t border-slate-200 dark:border-white/[0.06] pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold select-none text-slate-400">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider block mb-0.5 text-slate-500">Pacing per item</span>
                        <span className="text-slate-800 dark:text-slate-200 font-extrabold">{avgTimePerQuestion} sec / q</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider block mb-0.5 text-slate-500">Overall Accuracy</span>
                        <span className="text-[#8B5CF6] font-extrabold">{accuracy}%</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider block mb-0.5 text-slate-500">Target Gap</span>
                        <span className="text-slate-850 dark:text-slate-100 font-extrabold">
                          {isIelts && bandTheme.gap > 0 ? `${bandTheme.gap.toFixed(1)} band remaining` : "Target Achieved! 🎉"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider block mb-0.5 text-slate-500">Simulated Items</span>
                        <span className="text-slate-800 dark:text-slate-200 font-extrabold">{totalQuestions} items</span>
                      </div>
                    </div>
                  </Card>
                </motion.div>

              </div>

              {/* REWARDS & ACHIEVEMENTS */}
              <motion.div variants={itemFadeInUp}>
                <Card className="border border-slate-200 dark:border-white/[0.06] p-6 rounded-2xl bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 dark:from-slate-900/50 dark:via-slate-950 dark:to-slate-900/30 shadow-md relative overflow-hidden transition-all duration-300">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-4">
                      {/* Interactive Coins/XP animations */}
                      <div className="flex gap-2">
                        {gamificationRewards.rewards.map((reward, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0.5, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", delay: 0.3 + i * 0.15 }}
                            className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-black"
                          >
                            <Coins className="w-4 h-4 animate-bounce" /> {reward.coins}
                          </motion.div>
                        ))}
                        <motion.div
                          initial={{ scale: 0.5 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", delay: 0.5 }}
                          className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-black"
                        >
                          <Trophy className="w-4 h-4 animate-pulse" /> +50 XP
                        </motion.div>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Simulated Gamification Rewards</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Tokens added to your learning footprints profile</p>
                      </div>
                    </div>

                    {/* Achievements grid */}
                    <div className="flex flex-wrap gap-2">
                      {gamificationRewards.achievements.map((ach, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + i * 0.1 }}
                          className="bg-white/60 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] p-2 rounded-xl flex items-center gap-2 text-xs shadow-sm hover:border-violet-500/30 transition-all duration-300"
                        >
                          <span className="text-lg">{ach.icon}</span>
                          <div>
                            <span className="font-black text-[11px] block">{ach.title}</span>
                            <span className="text-[9px] text-slate-400 font-semibold">{ach.desc}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* QUESTION CATEGORY BREAKDOWN CARDS */}
              <motion.div variants={itemFadeInUp} className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest select-none">Question Type Proficiencies</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {questionTypeStats.map((stat, i) => {
                    let fillGrad = "from-red-500 to-rose-500";
                    if (stat.accuracy >= 80) fillGrad = "from-emerald-500 to-cyan-400";
                    else if (stat.accuracy >= 60) fillGrad = "from-blue-500 to-indigo-400";
                    else if (stat.accuracy >= 40) fillGrad = "from-orange-500 to-red-400";

                    return (
                      <Card key={i} className="border border-slate-200 dark:border-white/[0.04] p-5 rounded-2xl bg-white dark:bg-[#0F172A] shadow-lg relative overflow-hidden group hover:border-[#8B5CF6]/30 hover:-translate-y-0.5 transition-all duration-300">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-[#8B5CF6]/5 rounded-full blur-xl pointer-events-none" />
                        <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-2 truncate">{stat.label}</h4>
                        <div className="flex justify-between items-baseline mb-2">
                          <span className="text-2xl font-black text-slate-900 dark:text-white">{stat.accuracy}%</span>
                          <span className="text-xs font-bold text-slate-400">{stat.correct} / {stat.total} Correct</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${stat.accuracy}%` }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className={cn("h-full rounded-full bg-gradient-to-r", fillGrad)}
                          />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </motion.div>

              {/* PERFORMANCE CHARTS Responsive Grid */}
              <motion.div variants={itemFadeInUp} className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest select-none">Simulated Progress Diagnostics Charting</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Chart 1: Accuracy Line Chart */}
                  <Card className="border border-slate-200 dark:border-white/[0.06] p-6 rounded-2xl bg-white dark:bg-[#0F172A] shadow-xl">
                    <h4 className="text-xs font-black text-slate-500 uppercase mb-4 tracking-wider">Accuracy Tracking Profile (%)</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorAcc" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                          <XAxis dataKey="name" stroke="rgba(156, 163, 175, 0.5)" tickLine={false} tick={{ fontSize: 10 }} />
                          <YAxis stroke="rgba(156, 163, 175, 0.5)" tickLine={false} domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }} />
                          <Area type="monotone" dataKey="accuracy" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAcc)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Chart 2: Pacing speed Bar Chart */}
                  <Card className="border border-slate-200 dark:border-white/[0.06] p-6 rounded-2xl bg-white dark:bg-[#0F172A] shadow-xl">
                    <h4 className="text-xs font-black text-slate-500 uppercase mb-4 tracking-wider">Pacing Diagnostics (sec/item)</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorSpeed" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#a855f7" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="#a855f7" stopOpacity={0.1} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                          <XAxis dataKey="name" stroke="rgba(156, 163, 175, 0.5)" tickLine={false} tick={{ fontSize: 10 }} />
                          <YAxis stroke="rgba(156, 163, 175, 0.5)" tickLine={false} tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }} />
                          <Bar dataKey="speed" fill="url(#colorSpeed)" stroke="#a855f7" strokeWidth={1} radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Chart 3: Monthly Prediction Projection Chart */}
                  <Card className="border border-slate-200 dark:border-white/[0.06] p-6 rounded-2xl bg-white dark:bg-[#0F172A] shadow-xl">
                    <h4 className="text-xs font-black text-slate-500 uppercase mb-4 tracking-wider">30-Day Band Score Projection Trend</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                          <XAxis dataKey="name" stroke="rgba(156, 163, 175, 0.5)" tickLine={false} tick={{ fontSize: 10 }} />
                          <YAxis stroke="rgba(156, 163, 175, 0.5)" tickLine={false} domain={[0, isIelts ? 9 : (isSat ? 1600 : 100)]} tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ backgroundColor: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }} />
                          <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 6 }} />
                          {/* Project +1.0 Band Score progress */}
                          <Line type="monotone" dataKey={(d) => d.score + (isIelts ? 1.0 : 15)} name="Projected" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Chart 4: Radar Question Type Distribution */}
                  <Card className="border border-slate-200 dark:border-white/[0.06] p-6 rounded-2xl bg-white dark:bg-[#0F172A] shadow-xl flex flex-col justify-between">
                    <h4 className="text-xs font-black text-slate-500 uppercase mb-2 tracking-wider">Proficiency Cognitive Radar</h4>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={questionTypeStats}>
                          <PolarGrid stroke="rgba(156,163,175,0.1)" />
                          <PolarAngleAxis dataKey="label" stroke="rgba(156,163,175,0.7)" tick={{ fontSize: 9 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(156,163,175,0.3)" tick={{ fontSize: 8 }} />
                          <Radar name="Accuracy" dataKey="accuracy" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                </div>
              </motion.div>

              {/* ANSWER SHEET QUICK OVERVIEW */}
              <motion.div variants={itemFadeInUp} className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest select-none">Quick Response Grid</h3>
                <Card className="border border-slate-200 dark:border-white/[0.06] p-6 rounded-2xl bg-white dark:bg-[#0F172A] shadow-xl">
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                    {questionResults.map((res: any, idx: number) => {
                      const isCorrect = res.isCorrect;
                      const isOmitted = res.isOmitted;
                      let badgeColor = "bg-rose-500 text-white";
                      if (isCorrect) badgeColor = "bg-emerald-500 text-white";
                      else if (isOmitted) badgeColor = "bg-slate-500 text-white";

                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            setActiveQuestionIndex(idx);
                            setActiveTab('review');
                          }}
                          className={cn(
                            "p-3 rounded-xl border flex flex-col items-center justify-between font-bold transition-all duration-300 w-full h-16 hover:scale-[1.04]",
                            isCorrect 
                              ? "border-emerald-500/20 bg-emerald-500/[0.02] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10" 
                              : isOmitted
                              ? "border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/10 text-slate-500"
                              : "border-rose-500/20 bg-rose-500/[0.02] text-rose-600 dark:text-rose-455 hover:bg-rose-500/10",
                            activeQuestionIndex === idx && "ring-2 ring-[#8B5CF6] ring-offset-2 ring-offset-white dark:ring-offset-[#070B14]"
                          )}
                        >
                          <span className={cn("w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px]", badgeColor)}>
                            {idx + 1}
                          </span>
                          <span className="text-[10px] uppercase font-black truncate w-full text-center">
                            {isOmitted ? "-" : res.userAns}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Card>
              </motion.div>

              {/* ACTION BUTTONS FOOTER */}
              <motion.div variants={itemFadeInUp} className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200 dark:border-white/[0.06] select-none font-sans font-bold">
                <div className="flex items-center flex-wrap gap-2.5">
                  <Button variant="outline" size="sm" onClick={handleShare} className="rounded-xl font-bold gap-2 text-xs h-10 px-4 border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                    <Share2 className="w-4 h-4" /> Share Results
                  </Button>
                  <Button variant="default" size="sm" onClick={() => setActiveTab('analysis')} className="rounded-xl font-bold gap-2 text-xs h-10 px-6 bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white hover:opacity-90 shadow-md border-none transition-all">
                    <BrainCircuit className="w-4 h-4 animate-pulse" /> AI Analysis
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => nav(-1)} className="rounded-xl font-bold gap-2 text-xs h-10 px-4 border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                    <RotateCcw className="w-4 h-4" /> Retry Test
                  </Button>
                </div>
                <div className="flex items-center flex-wrap gap-2.5">
                  <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="rounded-xl font-bold gap-2 text-xs h-10 px-5 border-violet-500/20 bg-violet-500/5 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 transition-all">
                    Download PDF Report
                  </Button>
                  <Button variant="default" size="sm" onClick={() => nav(`/${role || "student"}/dashboard`)} className="rounded-xl font-bold gap-2 text-xs h-10 px-6 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white transition-all">
                    Continue Practice
                  </Button>
                </div>
              </motion.div>

            </div>
          )}

          {/* TAB 2: AI COACH DIAGNOSTICS */}
          {activeTab === 'analysis' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* AI COACH METRIC CARDS */}
                <div className="lg:col-span-2 space-y-6">
                  <Card className="border border-slate-200 dark:border-white/[0.06] p-6 rounded-2xl bg-white dark:bg-[#0F172A] shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-[#A855F7]/5 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-white/[0.06] pb-4 select-none">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white flex items-center justify-center font-bold shadow-lg shadow-[#8B5CF6]/20">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          AI Coach Diagnostics Insights
                          <Badge className="bg-[#8B5CF6]/15 text-[#A855F7] border border-[#8B5CF6]/25 text-[9px] uppercase font-black">Active</Badge>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Personalized cognitive assessment based on actual responses</p>
                      </div>
                    </div>

                    {/* AI Coach Prediction Widgets */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.04] bg-slate-50 dark:bg-white/[0.01]">
                        <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">Current Prediction</span>
                        <span className="text-2xl font-black text-slate-900 dark:text-white">{numericScore.toFixed(1)}</span>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.04] bg-slate-50 dark:bg-white/[0.01]">
                        <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">Potential (30 Days)</span>
                        <span className="text-2xl font-black text-emerald-500 dark:text-emerald-400">{Math.min(9.0, numericScore + 1.0).toFixed(1)}</span>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.04] bg-slate-50 dark:bg-white/[0.01]">
                        <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">Confidence Score</span>
                        <span className="text-2xl font-black text-[#A855F7]">{Math.min(95, Math.round(70 + accuracy * 0.25))}%</span>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.04] bg-slate-50 dark:bg-white/[0.01]">
                        <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">Study Hours Recommended</span>
                        <span className="text-2xl font-black text-amber-500">{Math.max(10, Math.round((7.5 - numericScore) * 30 + 10))} hrs</span>
                      </div>
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.04] bg-slate-50 dark:bg-white/[0.01]">
                        <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">Exam Readiness</span>
                        <span className="text-2xl font-black text-blue-500">{Math.max(30, Math.round(accuracy - 5))}%</span>
                      </div>
                    </div>

                    {/* Strengths & Weaknesses lists */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-200 dark:border-white/[0.06]">
                      <div className="space-y-3">
                        <h3 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2 select-none">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cognitive Strengths
                        </h3>
                        <ul className="space-y-2">
                          {analysis.strengths.map((str, i) => (
                            <li key={i} className="text-xs text-slate-750 dark:text-slate-350 flex items-start gap-2 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 font-bold animate-[fade-in_0.4s_ease-out]">
                              <span className="text-emerald-500 font-extrabold">✔</span>
                              <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-xs font-black text-rose-600 dark:text-rose-455 uppercase tracking-wider flex items-center gap-2 select-none">
                          <XCircle className="w-4 h-4 text-rose-500" /> Focus Improvement Areas
                        </h3>
                        <ul className="space-y-2">
                          {analysis.weaknesses.map((weak, i) => (
                            <li key={i} className="text-xs text-slate-750 dark:text-slate-350 flex items-start gap-2 bg-rose-500/5 p-3 rounded-xl border border-rose-500/10 font-bold animate-[fade-in_0.4s_ease-out]">
                              <span className="text-rose-500 font-extrabold">✖</span>
                              <span>{weak}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* AI Advice Side panel */}
                <div className="space-y-6">
                  <Card className="border border-[#8B5CF6]/30 dark:border-[#8B5CF6]/20 p-6 rounded-2xl bg-gradient-to-br from-violet-50/50 via-white to-purple-50/50 dark:from-[#8B5CF6]/10 dark:via-[#0F172A] dark:to-transparent shadow-2xl relative overflow-hidden h-full">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#A855F7]/10 rounded-full blur-2xl pointer-events-none" />
                    <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 select-none">
                      <Zap className="w-4 h-4 text-[#A855F7] animate-bounce" /> AI Coach Advice
                    </h3>
                    <p className="text-slate-800 dark:text-slate-200 font-bold text-sm leading-relaxed whitespace-pre-wrap">
                      {aiRecommendation}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-6 leading-relaxed select-none">
                      Calculated by mapping question category performance curves against simulated metrics.
                    </p>
                  </Card>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: ANSWER REVIEW SYSTEM */}
          {activeTab === 'review' && (
            <div className="space-y-6">
              
              {/* Question selector quick panel */}
              <Card className="border border-slate-200 dark:border-white/[0.06] p-4 rounded-2xl bg-white dark:bg-[#0F172A] shadow-xl">
                <div className="flex flex-wrap gap-2 justify-center">
                  {questionResults.map((res, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveQuestionIndex(idx)}
                      className={cn(
                        "w-9 h-9 rounded-lg font-bold text-xs flex items-center justify-center transition-all duration-200",
                        res.isCorrect 
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                          : res.isOmitted
                          ? "bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-500"
                          : "bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-455",
                        activeQuestionIndex === idx && "ring-2 ring-violet-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900"
                      )}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </Card>

              {/* Main detail card for current selected question */}
              {activeQ && (
                <div className="max-w-4xl mx-auto">
                  <Card className="border border-slate-200 dark:border-white/[0.06] p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#0F172A] shadow-xl space-y-6 relative overflow-hidden transition-[border-color,box-shadow] duration-350 hover:border-violet-500/20 hover:shadow-violet-500/[0.02]">
                    
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-white/[0.06] select-none">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800 dark:text-slate-250 text-sm uppercase">Question {activeQuestionIndex + 1}</span>
                        <Badge variant="outline" className="text-[9px] font-black uppercase text-[#A855F7] bg-[#8B5CF6]/10 border-[#8B5CF6]/30">
                          {activeQ.questionType || activeQ.question_type || activeQ.category || "General"}
                        </Badge>
                      </div>
                      <div>
                        {activeResult?.isCorrect ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold gap-1 rounded-lg">
                            Correct ✅
                          </Badge>
                        ) : activeResult?.isOmitted ? (
                          <Badge className="bg-slate-100 dark:bg-slate-800/10 text-slate-600 dark:text-slate-450 border border-slate-350 dark:border-slate-750 font-bold gap-1 rounded-lg">
                            Omitted ⚪
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-455 border border-rose-500/20 font-bold gap-1 rounded-lg">
                            Incorrect ❌
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Question text prompt */}
                    <div className="text-base text-slate-900 dark:text-white font-bold leading-relaxed">
                      <MathRenderer text={activeQ.prompt || activeQ.text || ""} />
                    </div>

                    {/* Options list */}
                    {activeQ.options && activeQ.options.length > 0 && (
                      <div className="grid gap-3 select-none animate-[fade-in_0.4s_ease-out]">
                        {activeQ.options.map((opt: any, optIdx: number) => {
                          const isUserSelected = activeResult?.userAns === opt.text;
                          // Fallback check
                          const isCorrectOption = opt.isCorrect || opt.is_correct || activeResult?.correctAns === opt.text;

                          let optionStyle = "border-slate-200 dark:border-white/[0.04] bg-slate-50 dark:bg-white/[0.01] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.03]";
                          let checkMarker = null;

                          if (isCorrectOption) {
                            optionStyle = "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30";
                            checkMarker = <span className="text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1 text-xs">Correct Option ✔</span>;
                          } else if (isUserSelected && !isCorrectOption) {
                            optionStyle = "border-rose-500/40 bg-rose-50 dark:bg-rose-500/5 text-rose-700 dark:text-rose-455 ring-1 ring-rose-500/30";
                            checkMarker = <span className="text-rose-600 dark:text-rose-400 font-black flex items-center gap-1 text-xs">Your Selection ✖</span>;
                          }

                          return (
                            <div
                              key={opt.id || optIdx}
                              className={cn("p-4 rounded-xl border text-xs font-bold flex items-center justify-between transition-all duration-200", optionStyle)}
                            >
                              <div className="flex-1 pr-4">
                                <MathRenderer text={opt.text} />
                              </div>
                              {checkMarker}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Selected and correct answer mapping */}
                    <div className="p-4 bg-slate-50 dark:bg-white/[0.01] rounded-xl border border-slate-200 dark:border-white/[0.06] grid grid-cols-2 gap-4 text-xs font-bold">
                      <div>
                        <span className="text-slate-500 block uppercase tracking-wider mb-1">Your Selected Answer</span>
                        <div className={cn("text-sm font-extrabold flex items-center gap-1", 
                          activeResult?.isCorrect ? "text-emerald-600 dark:text-emerald-400" : activeResult?.isOmitted ? "text-slate-500" : "text-rose-600 dark:text-rose-450"
                        )}>
                          {activeResult?.isOmitted ? "Not Answered ⚪" : <MathRenderer text={activeResult?.userAns} />}
                          {activeResult?.isOmitted ? null : activeResult?.isCorrect ? "✅" : "❌"}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 block uppercase tracking-wider mb-1">Correct Answer</span>
                        <div className="text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          <MathRenderer text={activeResult?.correctAns} /> ✅
                        </div>
                      </div>
                    </div>

                    {/* Transcript snippet for listening with keyword highlights */}
                    {kind === "listening" && activeQ.reference_paragraph && (
                      <div className="bg-slate-50 dark:bg-white/[0.01] p-4.5 border border-slate-200 dark:border-white/[0.06] rounded-xl space-y-2">
                        <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                          🎧 Audio Transcript Snippet
                        </h4>
                        <p className="text-slate-600 dark:text-slate-400 font-semibold text-xs leading-relaxed">
                          {highlightTranscriptKeywords(activeQ.reference_paragraph, activeResult?.correctAns)}
                        </p>
                      </div>
                    )}

                    {/* Explanation */}
                    {(activeQ.explanation || activeResult?.detail?.aiExplanation) && (
                      <div className="bg-[#8B5CF6]/5 p-4 border border-[#8B5CF6]/10 rounded-xl space-y-2">
                        <h4 className="text-xs font-black text-[#8B5CF6] dark:text-[#A855F7] uppercase tracking-wider flex items-center gap-1.5 font-bold">
                          <BrainCircuit className="w-4 h-4 animate-pulse" /> Explanation & Rationale
                        </h4>
                        <p className="text-slate-700 dark:text-slate-350 text-xs leading-relaxed whitespace-pre-wrap font-semibold">
                          <MathRenderer text={activeResult?.detail?.aiExplanation || activeQ.explanation || ""} />
                        </p>
                      </div>
                    )}

                    {/* Learning tip */}
                    {activeQ.learning_tip && (
                      <div className="bg-amber-500/5 p-4 border border-amber-500/10 rounded-xl space-y-1.5 font-semibold">
                        <h4 className="text-xs font-black text-amber-600 dark:text-amber-500 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                          <Lightbulb className="w-4 h-4 text-amber-500" /> Learning Tip
                        </h4>
                        <p className="text-slate-700 dark:text-slate-350 text-xs leading-relaxed">
                          <MathRenderer text={activeQ.learning_tip} />
                        </p>
                      </div>
                    )}

                    {/* Navigation buttons */}
                    <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-white/[0.06] mt-6 select-none font-bold">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activeQuestionIndex === 0}
                        onClick={() => setActiveQuestionIndex(prev => prev - 1)}
                        className="rounded-xl font-bold gap-1 text-xs border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                      >
                        <ChevronLeft className="w-4 h-4" /> Previous
                      </Button>
                      <span className="text-xs text-slate-500 dark:text-slate-455 font-black">
                        Question {activeQuestionIndex + 1} / {totalQuestions}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activeQuestionIndex === totalQuestions - 1}
                        onClick={() => setActiveQuestionIndex(prev => prev + 1)}
                        className="rounded-xl font-bold gap-1 text-xs border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                      >
                        Next <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>

                  </Card>
                </div>
              )}

            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}

export default ExamResultDashboard;
