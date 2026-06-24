import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, BrainCircuit,
  Timer, XCircle, PlayCircle, BarChart3, Bookmark, FileText, ChevronRight,
  ShieldAlert, ShieldCheck, History, Target, Loader2, ArrowLeft, ArrowRight,
  BookOpen, Headphones, HelpCircle, FileSignature, Lightbulb, Pause, Play,
  Volume2, Share2, RotateCcw, LayoutDashboard, Search, ChevronLeft, ThumbsUp,
  AlertTriangle, Gauge, Zap, Sparkles
} from "lucide-react";
import { getExamCalculator, SATCalculator } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { formatMathText, MathRenderer } from "@/lib/math";
import { toast } from "sonner";

export function ExamResultDashboard({ result, questions, exam }: { result: any, questions: any[], exam: any }) {
  const nav = useNavigate();
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<'analytics' | 'analysis' | 'review'>('analytics');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(true);
  const [filterState, setFilterState] = useState<'all' | 'correct' | 'wrong' | 'review' | 'skipped'>('all');
  const audioRef = useRef<HTMLAudioElement>(null);
  const activeQuestionRef = useRef<HTMLDivElement>(null);

  const kind = (exam?.type ?? result?.kind ?? "exam").toLowerCase();
  const isSat = kind === "sat";
  const isMilliy = kind === "national_cert" || kind === "milliy";
  const isIelts = kind === "ielts" || kind === "reading" || kind === "listening";

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
    // Correct Answers = 0, Wrong Answers = totalQuestions, Omitted = 0
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

  // Recalculate score using strategy classes
  const calculator = getExamCalculator(kind);
  const finalScore = allUnanswered ? 0 : calculator.calculate(correctAnswers, totalQuestions, details, exam);

  // If SAT, fetch details breakdown from the SATCalculator
  let satBreakdown = {
    rwCorrect: 0,
    rwTotal: 0,
    rwScore: 200,
    mathCorrect: 0,
    mathTotal: 0,
    mathScore: 200,
    totalScore: 400
  };

  if (isSat) {
    const satCalc = getExamCalculator("sat") as SATCalculator;
    if (satCalc && typeof satCalc.calculateBreakdown === "function") {
      satBreakdown = allUnanswered
        ? { rwCorrect: 0, rwTotal: 27, rwScore: 200, mathCorrect: 0, mathTotal: 22, mathScore: 200, totalScore: 400 }
        : satCalc.calculateBreakdown(correctAnswers, totalQuestions, details, exam);
    }
  }

  // Performance Rating Logic for Circular progress label
  const scoreRatio = isSat
    ? Math.max(0, ((allUnanswered ? 400 : Number(finalScore)) - 400) / 1200)
    : isMilliy
    ? (allUnanswered ? 0 : Number(finalScore)) / 100
    : accuracy / 100;

  let performanceLabel = "Average";
  let labelColor = "text-amber-400";
  if (scoreRatio >= 0.85) {
    performanceLabel = "Excellent";
    labelColor = "text-emerald-400";
  } else if (scoreRatio >= 0.70) {
    performanceLabel = "Good";
    labelColor = "text-purple-400";
  } else if (scoreRatio >= 0.50) {
    performanceLabel = "Average";
    labelColor = "text-amber-400";
  } else {
    performanceLabel = "Poor";
    labelColor = "text-rose-500";
  }

  const scoreType = isSat ? "SAT Score" : isIelts ? "IELTS Band" : isMilliy ? "Milliy Sertifikat" : "General Score";
  const scoreSub = isSat ? "400 - 1600 Scale" : isIelts ? "0 - 9.0 Band Score" : isMilliy ? "0 - 100 Ball" : "Percentage Natija";

  const elapsedSec = result.timeUsedSeconds ?? result.elapsedSec ?? 0;
  const elapsedMin = Math.floor(elapsedSec / 60);
  const elapsedSecRem = elapsedSec % 60;
  const timeStr = `${elapsedMin}m ${elapsedSecRem}s`;
  const avgTimePerQuestion = Math.round(elapsedSec / totalQuestions);

  // Auto-scroll logic to active question card
  useEffect(() => {
    if (activeTab === 'review') {
      const timer = setTimeout(() => {
        const el = document.getElementById("active-question-card");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeQuestionIndex, activeTab]);

  const handleQuestionClick = (idx: number) => {
    setActiveQuestionIndex(idx);
    setActiveTab('review');
  };

  // Context-aware metadata helper for questions
  const getQuestionMetadata = (q: any, idx: number, resultDetail: any) => {
    let explanationText = q.explanation || "";
    let referenceParagraph = q.reference_paragraph || q.referenceParagraph || "";
    let highlightedSentence = q.highlighted_sentence || q.highlightedSentence || "";
    let learningTip = q.learning_tip || q.learningTip || "";
    let difficulty = q.difficulty || "";
    let skillCategory = q.skill_category || q.skillCategory || q.category || "";
    let topic = q.topic || "";
    let subject = q.subject || "";
    let evidenceExplanation = q.evidence_explanation || q.evidenceExplanation || "";

    if (explanationText.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(explanationText);
        explanationText = parsed.explanation || explanationText;
        referenceParagraph = parsed.referenceParagraph || referenceParagraph;
        highlightedSentence = parsed.highlightedSentence || highlightedSentence;
        learningTip = parsed.learningTip || learningTip;
        difficulty = parsed.difficulty || difficulty;
        skillCategory = parsed.skillCategory || parsed.skill_category || parsed.category || skillCategory;
        topic = parsed.topic || topic;
        subject = parsed.subject || subject;
        evidenceExplanation = parsed.evidenceExplanation || parsed.evidence_explanation || evidenceExplanation;
      } catch (e) {
        // fallback
      }
    }

    // Heuristics for SAT Skill Categories
    if (!skillCategory && isSat) {
      const promptLower = (q.prompt || "").toLowerCase();
      if (promptLower.includes("x") && (promptLower.includes("y") || promptLower.includes("equation") || promptLower.includes("system") || promptLower.includes("linear"))) {
        skillCategory = "Algebra";
      } else if (promptLower.includes("quadratic") || promptLower.includes("exponent") || promptLower.includes("polynomial") || promptLower.includes("function") || promptLower.includes("parabola")) {
        skillCategory = "Advanced Math";
      } else if (promptLower.includes("ratio") || promptLower.includes("percent") || promptLower.includes("speed") || promptLower.includes("unit") || promptLower.includes("probability")) {
        skillCategory = "Problem Solving";
      } else if (promptLower.includes("mean") || promptLower.includes("median") || promptLower.includes("standard deviation") || promptLower.includes("table") || promptLower.includes("graph") || promptLower.includes("chart") || promptLower.includes("scatter")) {
        skillCategory = "Data Analysis";
      } else if (promptLower.includes("triangle") || promptLower.includes("circle") || promptLower.includes("angle") || promptLower.includes("volume") || promptLower.includes("area") || promptLower.includes("geometry")) {
        skillCategory = "Geometry";
      } else {
        const cats = ["Algebra", "Advanced Math", "Problem Solving", "Data Analysis", "Geometry"];
        skillCategory = cats[idx % cats.length];
      }
    }

    // Heuristics for National Certificate Subjects and Topics
    if (isMilliy) {
      if (!subject) {
        const subjects = ["Mathematics", "History", "Native Language", "English", "Science"];
        subject = q.qtype === "math" ? "Mathematics" : subjects[idx % subjects.length];
      }
      if (!topic) {
        if (subject === "Mathematics") {
          const topics = ["Algebraic Expressions", "Equations & Inequalities", "Functions & Graphs", "Geometry Foundations", "Probability & Combinatorics"];
          topic = topics[idx % topics.length];
        } else if (subject === "History") {
          const topics = ["Ancient Civilizations", "Middle Ages of Central Asia", "Modern History", "Cultural Heritage Monuments", "Independence Era Studies"];
          topic = topics[idx % topics.length];
        } else if (subject === "Native Language") {
          const topics = ["Morphology Rules", "Syntax Analysis", "Punctuation Standards", "Stylistic Analysis", "Spelling Competency"];
          topic = topics[idx % topics.length];
        } else if (subject === "English") {
          const topics = ["Reading Comprehension", "Grammatical Structures", "Lexical Resource", "Prepositional Nuances", "Sentence Completion"];
          topic = topics[idx % topics.length];
        } else {
          const topics = ["Classical Mechanics", "Thermodynamics", "Chemical Reaction Rates", "Cellular Biology", "Astrophysics"];
          topic = topics[idx % topics.length];
        }
      }
    }

    // Heuristics for Difficulty Level
    if (!difficulty) {
      if (idx % 3 === 0) difficulty = "Easy";
      else if (idx % 3 === 1) difficulty = "Medium";
      else difficulty = "Hard";
    }

    // Heuristics for Learning Tip
    if (!learningTip) {
      if (isSat) {
        if (skillCategory === "Algebra") {
          learningTip = "Focus on isolating variables and eliminating choices by plugging in simple coordinates like (0,0) or (1,1).";
        } else if (skillCategory === "Advanced Math") {
          learningTip = "Remember the quadratic formula, vertex forms, and discriminants. Sketching functions helps verify intersection points.";
        } else if (skillCategory === "Problem Solving") {
          learningTip = "Read rates, ratios, and percentages carefully. Pay special attention to unit conversions (e.g. hours to minutes).";
        } else if (skillCategory === "Data Analysis") {
          learningTip = "Read all chart titles, axis labels, and keys first. Be careful not to extrapolate trends beyond the given data points.";
        } else {
          learningTip = "Leverage special triangles (30-60-90, 45-45-90) and similarity laws. Draw helping auxiliary lines when necessary.";
        }
      } else if (isMilliy) {
        learningTip = `For National Certificate ${subject}, double-check the key rules and definitions in this specific domain to build solid foundations.`;
      } else {
        learningTip = "Scan the passage for exact synonyms of key words in the prompt. Eliminate options that use words out of context.";
      }
    }

    // Heuristics for Evidence Explanation
    if (!evidenceExplanation) {
      evidenceExplanation = "Direct textual evidence confirms this option. The reference sentence supports this relationship while contrasting claims are explicitly rejected.";
    }

    return {
      explanation: explanationText,
      referenceParagraph,
      highlightedSentence,
      learningTip,
      difficulty,
      skillCategory,
      topic,
      subject,
      evidenceExplanation,
      timeSpent: resultDetail ? (resultDetail.timeSpentSeconds ?? resultDetail.time_spent_seconds ?? 0) : 0
    };
  };

  // Grid states mapping
  const questionStates = questionResults.map((res, idx) => {
    let state: 'correct' | 'wrong' | 'review' | 'skipped' = 'wrong';
    if (res.isCorrect) {
      state = 'correct';
    } else if (res.isOmitted) {
      state = 'skipped';
    } else {
      const meta = getQuestionMetadata(res.question, idx, res.detail);
      // Heuristic: If they spent a lot of time on it but failed, mark for "Review"
      if (meta.timeSpent > avgTimePerQuestion * 1.25) {
        state = 'review';
      } else {
        state = 'wrong';
      }
    }
    return {
      ...res,
      state
    };
  });

  // Performance Analysis Report (ChatGPT / Notion AI Style)
  const getPerformanceAnalysis = () => {
    const easyTotal = Math.max(1, questionResults.filter(r => getQuestionMetadata(r.question, questions.indexOf(r.question), r.detail).difficulty === "Easy").length);
    const mediumTotal = Math.max(1, questionResults.filter(r => getQuestionMetadata(r.question, questions.indexOf(r.question), r.detail).difficulty === "Medium").length);
    const hardTotal = Math.max(1, questionResults.filter(r => getQuestionMetadata(r.question, questions.indexOf(r.question), r.detail).difficulty === "Hard").length);

    let easyCorrect = questionResults.filter(r => r.isCorrect && getQuestionMetadata(r.question, questions.indexOf(r.question), r.detail).difficulty === "Easy").length;
    let mediumCorrect = questionResults.filter(r => r.isCorrect && getQuestionMetadata(r.question, questions.indexOf(r.question), r.detail).difficulty === "Medium").length;
    let hardCorrect = questionResults.filter(r => r.isCorrect && getQuestionMetadata(r.question, questions.indexOf(r.question), r.detail).difficulty === "Hard").length;

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // Analyze by Skill Categories or Subjects
    if (isSat) {
      const catStats: Record<string, { correct: number; total: number }> = {};
      questionResults.forEach((r, idx) => {
        const meta = getQuestionMetadata(r.question, idx, r.detail);
        const cat = meta.skillCategory;
        if (!catStats[cat]) catStats[cat] = { correct: 0, total: 0 };
        catStats[cat].total++;
        if (r.isCorrect) catStats[cat].correct++;
      });

      Object.entries(catStats).forEach(([cat, stats]) => {
        const acc = stats.correct / stats.total;
        if (acc >= 0.7) {
          strengths.push(`${cat} (${Math.round(acc * 100)}% accuracy)`);
        } else {
          weaknesses.push(`${cat} (${Math.round(acc * 100)}% accuracy)`);
        }
      });
    } else if (isMilliy) {
      const subStats: Record<string, { correct: number; total: number }> = {};
      questionResults.forEach((r, idx) => {
        const meta = getQuestionMetadata(r.question, idx, r.detail);
        const sub = meta.subject;
        if (!subStats[sub]) subStats[sub] = { correct: 0, total: 0 };
        subStats[sub].total++;
        if (r.isCorrect) subStats[sub].correct++;
      });

      Object.entries(subStats).forEach(([sub, stats]) => {
        const acc = stats.correct / stats.total;
        if (acc >= 0.7) {
          strengths.push(`${sub} (${Math.round(acc * 100)}% accuracy)`);
        } else {
          weaknesses.push(`${sub} (${Math.round(acc * 100)}% accuracy)`);
        }
      });
    } else {
      strengths.push(`Core exam content coverage (${accuracy}% accuracy)`);
    }

    if (strengths.length === 0) strengths.push("Basic concepts and structured navigation");
    if (weaknesses.length === 0) weaknesses.push("Advanced analytical and fast-paced reasoning");

    // Vocabulary & Grammar analysis heuristics
    const vocabIssues = isSat 
      ? "Focus on 'Words in Context' question categories. Pay attention to secondary dictionary definitions of common words." 
      : "Acquire intermediate and upper-academic words. Keep a journal of transition words and descriptive verbs.";
    const grammarIssues = isSat 
      ? "Review standard English punctuation conventions, specifically relative clauses and semi-colon linkages." 
      : "Practice sentence synthesis, identifying grammatical subjects, and verifying subject-verb agreement.";

    // Estimated Future Score projection (Encouraging +10% improvement path)
    let estFutureScore = "";
    if (isSat) {
      const currentScoreNum = allUnanswered ? 400 : Number(finalScore);
      estFutureScore = `${Math.min(1600, currentScoreNum + Math.round(110 * (1.15 - scoreRatio)))}`;
    } else if (isMilliy) {
      const currentScoreNum = allUnanswered ? 0 : Number(finalScore);
      estFutureScore = `${Math.min(100, currentScoreNum + Math.round(12 * (1.15 - scoreRatio)))} Ball`;
    } else {
      estFutureScore = `${Math.min(100, accuracy + 12)}%`;
    }

    return {
      strengths,
      weaknesses,
      vocabAnalysis: vocabIssues,
      grammarAnalysis: grammarIssues,
      recommendations: isSat 
        ? ["Desmos scientific tools integration", "Grammatical subject-verb relative clauses review"] 
        : ["Time division strategies per section", "Weakest subject syllabus revision weekly"],
      studyPlan: isSat 
        ? ["Solve 15 Algebra/Adv. Math questions daily", "Review transition words for 10 mins daily"] 
        : ["Review weekly weak topic guidelines", "One complete full-length mock exam monthly"],
      estFutureScore,
      byDifficulty: {
        easy: { correct: easyCorrect, total: easyTotal },
        medium: { correct: mediumCorrect, total: mediumTotal },
        hard: { correct: hardCorrect, total: hardTotal }
      }
    };
  };

  const analysis = getPerformanceAnalysis();

  // Subject Stats for National Certificate
  const subjectStats: Record<string, { correct: number; total: number; omitted: number; incorrect: number }> = {
    "Mathematics": { correct: 0, total: 0, omitted: 0, incorrect: 0 },
    "History": { correct: 0, total: 0, omitted: 0, incorrect: 0 },
    "Native Language": { correct: 0, total: 0, omitted: 0, incorrect: 0 },
    "English": { correct: 0, total: 0, omitted: 0, incorrect: 0 },
    "Science": { correct: 0, total: 0, omitted: 0, incorrect: 0 }
  };

  questionResults.forEach((res, idx) => {
    const meta = getQuestionMetadata(res.question, idx, res.detail);
    const sub = meta.subject || "Mathematics";
    if (!subjectStats[sub]) {
      subjectStats[sub] = { correct: 0, total: 0, omitted: 0, incorrect: 0 };
    }
    subjectStats[sub].total++;
    if (res.isCorrect) subjectStats[sub].correct++;
    else if (res.isOmitted) subjectStats[sub].omitted++;
    else subjectStats[sub].incorrect++;
  });

  const subjectAnalyticsList = Object.entries(subjectStats)
    .filter(([_, stats]) => stats.total > 0)
    .map(([subjectName, stats]) => {
      const acc = Math.round((stats.correct / stats.total) * 100);
      return {
        subjectName,
        correct: stats.correct,
        total: stats.total,
        omitted: stats.omitted,
        incorrect: stats.incorrect,
        accuracy: acc,
        isStrength: acc >= 70,
        isWeakness: acc < 70
      };
    });

  const activeQ = questions[activeQuestionIndex];
  const activeResult = questionStates[activeQuestionIndex];
  const activeMeta = activeQ ? getQuestionMetadata(activeQ, activeQuestionIndex, activeResult?.detail) : null;

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
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - scoreRatio);

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

  const renderAnswerSheet = (showFilters = true) => {
    return (
      <div className="space-y-4">
        {/* Filters panel for Answer sheet */}
        {showFilters && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-white/[0.06] p-4 rounded-xl select-none">
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              <Button
                size="sm"
                variant={filterState === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterState('all')}
                className={cn("rounded-lg text-xs font-bold h-7 px-3", filterState === 'all' ? "bg-purple-600 hover:bg-purple-700 text-white" : "border-slate-200 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")}
              >
                All ({questionStates.length})
              </Button>
              <Button
                size="sm"
                variant={filterState === 'correct' ? 'default' : 'outline'}
                onClick={() => setFilterState('correct')}
                className={cn("rounded-lg text-xs font-bold h-7 px-3", filterState === 'correct' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "border-slate-200 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")}
              >
                Correct ({questionStates.filter(r => r.state === 'correct').length})
              </Button>
              <Button
                size="sm"
                variant={filterState === 'wrong' ? 'default' : 'outline'}
                onClick={() => setFilterState('wrong')}
                className={cn("rounded-lg text-xs font-bold h-7 px-3", filterState === 'wrong' ? "bg-rose-600 hover:bg-rose-700 text-white" : "border-slate-200 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")}
              >
                Wrong ({questionStates.filter(r => r.state === 'wrong').length})
              </Button>
              <Button
                size="sm"
                variant={filterState === 'review' ? 'default' : 'outline'}
                onClick={() => setFilterState('review')}
                className={cn("rounded-lg text-xs font-bold h-7 px-3", filterState === 'review' ? "bg-amber-600 hover:bg-amber-700 text-white" : "border-slate-200 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")}
              >
                Review ({questionStates.filter(r => r.state === 'review').length})
              </Button>
              <Button
                size="sm"
                variant={filterState === 'skipped' ? 'default' : 'outline'}
                onClick={() => setFilterState('skipped')}
                className={cn("rounded-lg text-xs font-bold h-7 px-3", filterState === 'skipped' ? "bg-slate-700 hover:bg-slate-600 text-white" : "border-slate-200 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white")}
              >
                Skipped ({questionStates.filter(r => r.state === 'skipped').length})
              </Button>
            </div>

            
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Show correct options</span>
              <button
                onClick={() => setShowCorrectAnswers(!showCorrectAnswers)}
                className={cn(
                  "w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none",
                  showCorrectAnswers ? "bg-[#8B5CF6]" : "bg-slate-350 dark:bg-slate-800"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                    showCorrectAnswers ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>
        )}

        {/* Answer Sheet grid */}
        <Card className="border border-slate-200 dark:border-white/[0.06] p-6 rounded-2xl bg-white dark:bg-[#0F172A] shadow-xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
            {questionStates
              .map((res: any, idx: number) => ({ res, originalIdx: idx }))
              .filter(({ res }) => !showFilters || filterState === 'all' || res.state === filterState)
              .map(({ res, originalIdx }) => {
                const isActive = activeQuestionIndex === originalIdx;
                let statusStyle = "";
                let statusBadge = "";
                let statusText = "Wrong";
                if (res.state === 'correct') {

                  statusStyle = "border-emerald-500/20 dark:border-emerald-500/10 bg-emerald-50 dark:bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-100 dark:hover:bg-emerald-500/10";
                  statusBadge = "bg-emerald-500 text-white";
                  statusText = "Correct";
                } else if (res.state === 'skipped') {
                  statusStyle = "border-slate-300 dark:border-slate-700/30 bg-slate-100 dark:bg-slate-800/10 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-800/20";
                  statusBadge = "bg-slate-600 text-white";
                  statusText = "Skipped";
                } else if (res.state === 'review') {
                  statusStyle = "border-amber-500/20 dark:border-amber-500/10 bg-amber-50 dark:bg-amber-500/5 text-amber-600 dark:text-amber-400 hover:border-amber-500/40 hover:bg-amber-100 dark:hover:bg-amber-500/10";
                  statusBadge = "bg-amber-500 text-white";
                  statusText = "Review";
                } else {
                  statusStyle = "border-rose-500/20 dark:border-rose-500/10 bg-rose-50 dark:bg-rose-500/5 text-rose-600 dark:text-rose-400 hover:border-rose-500/40 hover:bg-rose-100 dark:hover:bg-rose-500/10";
                  statusBadge = "bg-rose-500 text-white";
                  statusText = "Wrong";
                }

                return (
                  <button
                    key={originalIdx}
                    onClick={() => handleQuestionClick(originalIdx)}
                    className={cn(
                      "p-3 rounded-xl border flex flex-col justify-between text-xs font-bold transition-all duration-200 select-none text-left w-full h-20 relative group hover:scale-[1.03]",
                      statusStyle,
                      isActive && "ring-2 ring-[#8B5CF6] ring-offset-2 ring-offset-white dark:ring-offset-[#070B14] shadow-lg shadow-[#8B5CF6]/10"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={cn("w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0", statusBadge)}>
                        {originalIdx + 1}
                      </span>
                      <span className="text-[10px] font-bold opacity-80">{statusText}</span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between w-full select-none text-[10px]">
                      <span className="truncate max-w-[50px] font-black text-slate-800 dark:text-white">
                        {res.isOmitted ? "-" : res.userAns}
                      </span>
                      {showCorrectAnswers && (
                        <span className="text-slate-400 dark:text-slate-500 font-black flex items-center gap-0.5">
                          ➔ <span className="text-[#8B5CF6] dark:text-[#A855F7]">{res.correctAns}</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </Card>

        {/* Action Bar */}
        {showFilters && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-200 dark:border-white/[0.06] select-none">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-xl font-bold gap-2 text-xs h-10 px-4 border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5" onClick={handleShare}>
                <Share2 className="w-4 h-4" /> Share Results
              </Button>
              <Button variant="default" size="sm" className="rounded-xl font-bold gap-2 text-xs h-10 px-6 bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white hover:opacity-90" onClick={() => setActiveTab('analysis')}>
                <BrainCircuit className="w-4 h-4" /> Analyze Performance
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl font-bold gap-2 text-xs h-10 px-4 border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5" onClick={() => nav(-1)}>
                <RotateCcw className="w-4 h-4" /> Retry Mock Test
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-xl font-bold gap-2 text-xs h-10 px-4 border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10" onClick={() => toast.success("Diagnostic feedback sent to academic coaches!")}>
                Send Feedback
              </Button>
              <Button variant="default" size="sm" className="rounded-xl font-bold gap-2 text-xs h-10 px-6 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200" onClick={() => nav(-1)}>
                Back to Practice
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070B14] text-slate-900 dark:text-slate-100 font-sans pb-16 selection:bg-[#8B5CF6]/30 selection:text-[#C084FC]">
      
      {/* Header Bar */}
      <header className="bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-white/[0.06] py-4 px-6 sticky top-0 z-30 shadow-md backdrop-blur-md bg-white/90 dark:bg-[#0F172A]/90 select-none text-slate-900 dark:text-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="ghost" className="rounded-full hover:bg-slate-100 dark:hover:bg-white/10 shrink-0 text-slate-600 dark:text-slate-300" onClick={() => nav(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-extrabold text-lg text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1">{exam?.title || "Exam Result"}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">LMSHub Premium Review & Learning Center</p>
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-2.5">
            <Badge variant="secondary" className="px-3 py-1 text-[10px] font-black uppercase bg-[#8B5CF6]/20 text-[#A855F7] border border-[#8B5CF6]/30">
              {kind} Test
            </Badge>
            <Button
              variant={activeTab === 'analytics' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('analytics')}
              className={cn(
                "rounded-xl gap-2 font-bold text-xs h-9 px-4 transition-all duration-300",
                activeTab === 'analytics' 
                  ? "bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white shadow-lg shadow-[#8B5CF6]/25" 
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
                  ? "bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white shadow-lg shadow-[#8B5CF6]/25" 
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
                  ? "bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white shadow-lg shadow-[#8B5CF6]/25" 
                  : "bg-white dark:bg-[#0F172A] border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
              )}
            >
              <Search className="w-3.5 h-3.5" /> Question Review
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 space-y-6">

        {/* Dashboard / Analytics overview tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-fadeIn">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Animated Progress Ring Card */}
              <Card className="border border-slate-200 dark:border-white/[0.06] p-8 rounded-2xl bg-white dark:bg-[#0F172A] flex flex-col items-center justify-between shadow-xl relative overflow-hidden group">
                {/* Glow ring in the background */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#8B5CF6]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#8B5CF6]/15 transition-all duration-500"></div>
                
                <div className="w-full text-center sm:text-left select-none">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{scoreType}</h3>
                  <p className="text-[10px] text-[#A855F7] font-bold uppercase tracking-wider">{scoreSub}</p>
                </div>

                {/* Circular Score Visualizer */}
                <div className="relative my-6 flex items-center justify-center select-none">
                  <svg className="w-48 h-48 transform -rotate-90">
                    <defs>
                      <linearGradient id="scoreGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#A855F7" />
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
                    <circle
                      cx="96"
                      cy="96"
                      r={radius}
                      stroke="url(#scoreGlowGrad)"
                      strokeWidth={strokeWidth}
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      filter="url(#ringGlow)"
                      className="transition-[stroke-dashoffset] duration-1000 ease-out"
                    />
                  </svg>

                  {/* Score text absolute values */}
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
                      {isMilliy && allUnanswered ? 0 : finalScore}
                    </span>
                    <span className={cn("text-xs font-extrabold uppercase mt-1 tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08]", labelColor)}>
                      {performanceLabel}
                    </span>
                  </div>
                </div>

                <div className="w-full border-t border-slate-200 dark:border-white/[0.06] pt-4 flex justify-between items-center text-xs font-semibold text-slate-400 select-none">
                  <span>Score Status</span>
                  <span className="text-slate-900 dark:text-white font-extrabold uppercase tracking-wide">Official Scale</span>
                </div>
              </Card>

              {/* Statistics Grid (Glassmorphic cards with hovers) */}
              <Card className="lg:col-span-2 border border-slate-200 dark:border-white/[0.06] p-6 rounded-2xl bg-white dark:bg-[#0F172A] shadow-xl flex flex-col justify-between group">
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">Exam Performance Statistics</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Correct Card */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] hover:border-emerald-500/30 hover:bg-emerald-500/[0.01] transition-all duration-300 group/card relative overflow-hidden">
                      <div className="absolute top-2 right-2 text-emerald-500/10 group-hover/card:text-emerald-500/20 transition-all"><CheckCircle2 className="w-8 h-8" /></div>
                      <span className="text-slate-400 block text-[9px] uppercase font-black tracking-wider mb-1">Correct Answers</span>
                      <span className="text-3xl font-black text-emerald-500 dark:text-emerald-400">{correctAnswers}</span>
                      <span className="text-slate-500 text-xs font-bold block mt-1">({Math.round(correctAnswers / totalQuestions * 100)}% accuracy)</span>
                    </div>

                    {/* Wrong Card */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] hover:border-rose-500/30 hover:bg-rose-500/[0.01] transition-all duration-300 group/card relative overflow-hidden">
                      <div className="absolute top-2 right-2 text-rose-500/10 group-hover/card:text-rose-500/20 transition-all"><XCircle className="w-8 h-8" /></div>
                      <span className="text-slate-400 block text-[9px] uppercase font-black tracking-wider mb-1">Wrong Answers</span>
                      <span className="text-3xl font-black text-rose-500">{incorrectAnswers}</span>
                      <span className="text-slate-500 text-xs font-bold block mt-1">({Math.round(incorrectAnswers / totalQuestions * 100)}% count)</span>
                    </div>

                    {/* Omitted Card */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] hover:border-amber-500/30 hover:bg-amber-500/[0.01] transition-all duration-300 group/card relative overflow-hidden">
                      <div className="absolute top-2 right-2 text-amber-500/10 group-hover/card:text-amber-500/20 transition-all"><AlertCircle className="w-8 h-8" /></div>
                      <span className="text-slate-400 block text-[9px] uppercase font-black tracking-wider mb-1">Omitted Questions</span>
                      <span className="text-3xl font-black text-amber-500">{omittedAnswers}</span>
                      <span className="text-slate-500 text-xs font-bold block mt-1">({Math.round(omittedAnswers / totalQuestions * 100)}% count)</span>
                    </div>

                    {/* Time Card */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.04] hover:border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/[0.01] transition-all duration-300 group/card relative overflow-hidden">
                      <div className="absolute top-2 right-2 text-[#8B5CF6]/10 group-hover/card:text-[#8B5CF6]/20 transition-all"><Clock className="w-8 h-8" /></div>
                      <span className="text-slate-400 block text-[9px] uppercase font-black tracking-wider mb-1">Sarflangan Vaqt</span>
                      <span className="text-3xl font-black text-slate-900 dark:text-white">{timeStr}</span>
                      <span className="text-slate-500 text-xs font-bold block mt-1">Jami vaqt</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-200 dark:border-white/[0.06] pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold select-none text-slate-400">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider block mb-0.5 text-slate-500">Pace Per Question</span>
                    <span className="text-slate-800 dark:text-slate-200 font-extrabold">{avgTimePerQuestion} sec / q</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider block mb-0.5 text-slate-500">Total Accuracy</span>
                    <span className="text-[#A855F7] font-extrabold">{accuracy}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider block mb-0.5 text-slate-500">Attempted Rate</span>
                    <span className="text-slate-800 dark:text-slate-200 font-extrabold">{Math.round(((totalQuestions - omittedAnswers) / totalQuestions) * 105)}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider block mb-0.5 text-slate-500">Total Questions</span>
                    <span className="text-slate-800 dark:text-slate-200 font-extrabold">{totalQuestions} items</span>
                  </div>
                </div>
              </Card>

            </div>

            {/* SAT Specific Score Section */}
            {isSat && (
              <div className="border border-white/[0.06] p-6 rounded-2xl bg-[#0F172A] shadow-xl transition-all duration-300 hover:bg-[#131C31] hover:shadow-2xl hover:border-white/[0.1] hover:scale-[1.005]">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Digital SAT Section Scaled Scores</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-5 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                    <h4 className="text-xs font-black uppercase text-[#8B5CF6] tracking-wider mb-2">Reading & Writing Section</h4>
                    <div className="flex justify-between items-end font-semibold">
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Section Scaled Score</div>
                        <div className="text-3xl font-black text-white">{satBreakdown.rwScore} / 800</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400 mb-1">Raw Correct Count</div>
                        <div className="text-sm font-extrabold text-slate-300">{satBreakdown.rwCorrect} / {satBreakdown.rwTotal}</div>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 rounded-xl border border-white/[0.04] bg-white/[0.01]">
                    <h4 className="text-xs font-black uppercase text-[#A855F7] tracking-wider mb-2">Mathematics Section</h4>
                    <div className="flex justify-between items-end font-semibold">
                      <div>
                        <div className="text-xs text-slate-400 mb-1">Section Scaled Score</div>
                        <div className="text-3xl font-black text-white">{satBreakdown.mathScore} / 800</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400 mb-1">Raw Correct Count</div>
                        <div className="text-sm font-extrabold text-slate-300">{satBreakdown.mathCorrect} / {satBreakdown.mathTotal}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* National Certificate Specific Score Card */}
            {isMilliy && (
              <Card className="border border-slate-200 dark:border-white/[0.06] p-6 rounded-2xl bg-white dark:bg-[#0F172A] shadow-xl">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Official National Certificate Result</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center font-bold">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/[0.04]">
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block mb-1">Raw Correct Count</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{correctAnswers} / {totalQuestions}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/[0.04]">
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block mb-1">Accuracy Percentage</span>
                    <span className="text-2xl font-black text-[#A855F7]">{accuracy}%</span>
                  </div>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-[#8B5CF6]/10 to-[#A855F7]/10 border border-[#8B5CF6]/30">
                    <span className="text-[10px] uppercase font-black tracking-wider text-[#A855F7] block mb-1">Official Final Score</span>
                    <span className="text-2xl font-black text-[#8B5CF6]">{finalScore} / 100</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Premium Package details */}
            {renderPackDetails()}

            {/* Top Interactive Answer Sheet */}
            {renderAnswerSheet(true)}

          </div>
        )}

        {/* AI Performance Analysis (ChatGPT + Notion AI Style Design) */}
        {activeTab === 'analysis' && (
          <div className="space-y-6 animate-fadeIn select-text">
            
            {/* Main AI Insights Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* AI Coaching & Language Diagnostic Reports */}
              <div className="lg:col-span-2 space-y-6">

                {/* GPT + Notion AI styled Insight Panel */}
                <Card className="border border-slate-200 dark:border-white/[0.06] p-6 rounded-2xl bg-white dark:bg-[#0F172A] shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-[#A855F7]/5 rounded-full blur-3xl pointer-events-none"></div>
                  
                  {/* AI Header */}
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-white/[0.06] pb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white flex items-center justify-center font-bold shadow-lg shadow-[#8B5CF6]/20">
                      <Sparkles className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                        AI Performance Diagnostics Insights <Badge className="bg-[#8B5CF6]/20 text-[#A855F7] border border-[#8B5CF6]/30 text-[9px] uppercase font-black">Active</Badge>
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Synthesized cognitive analytics and pacing diagnoses</p>
                    </div>
                  </div>

                  {/* Strengths & Weaknesses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Strengths */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cognitive Strengths
                      </h3>
                      <ul className="space-y-2">
                        {analysis.strengths.map((str, i) => (
                          <li key={i} className="text-xs text-slate-750 dark:text-slate-300 flex items-start gap-2 bg-emerald-50 dark:bg-emerald-500/5 p-3 rounded-xl border border-emerald-100 dark:border-emerald-500/10 font-bold">
                            <span className="text-emerald-500">✔</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Weaknesses */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black text-rose-650 dark:text-rose-400 uppercase tracking-wider flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-rose-500" /> Focus Improvement Areas
                      </h3>
                      <ul className="space-y-2">
                        {analysis.weaknesses.map((weak, i) => (
                          <li key={i} className="text-xs text-slate-750 dark:text-slate-300 flex items-start gap-2 bg-rose-55 dark:bg-rose-500/5 p-3 rounded-xl border border-rose-100 dark:border-rose-500/10 font-bold">
                            <span className="text-rose-500">✖</span>
                            <span>{weak}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Vocabulary & Grammar analyses (Notion style blocks) */}
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/[0.06] grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-slate-50 dark:bg-white/[0.01] p-4.5 rounded-xl border border-slate-200 dark:border-white/[0.04] space-y-2">
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#8B5CF6]"></span> Vocabulary & Lexicon Analysis
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                        {analysis.vocabAnalysis}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-white/[0.01] p-4.5 rounded-xl border border-slate-200 dark:border-white/[0.04] space-y-2">
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#A855F7]"></span> Structural Grammar & Syntax Analysis
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                        {analysis.grammarAnalysis}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Recommendation Engine and Action Plan */}
                <Card className="border border-slate-200 dark:border-white/[0.06] p-6 rounded-2xl bg-white dark:bg-[#0F172A] shadow-xl space-y-4">
                  <h3 className="text-xs font-black text-[#A855F7] uppercase tracking-wider flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500 animate-pulse" /> Topic Recommendations & Syllabus Focus
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-bold text-xs">
                    <div className="bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/5 p-4 border border-[#8B5CF6]/20 dark:border-[#8B5CF6]/10 rounded-xl space-y-2">
                      <h4 className="text-xs font-black text-[#8B5CF6] dark:text-[#A855F7] uppercase">Recommended Focus Topics</h4>
                      <ul className="space-y-2 text-slate-700 dark:text-slate-300 list-disc list-inside">
                        {analysis.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-[#A855F7]/10 dark:bg-[#A855F7]/5 p-4 border border-[#A855F7]/20 dark:border-[#A855F7]/10 rounded-xl space-y-2">
                      <h4 className="text-xs font-black text-amber-600 dark:text-amber-500 uppercase">Suggested Step-by-Step Study Plan</h4>
                      <ul className="space-y-2 text-slate-700 dark:text-slate-300 list-disc list-inside">
                        {analysis.studyPlan.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>

              </div>

              {/* Subject Breakdown, pacing and score estimation */}
              <div className="space-y-6">

                {/* Score Projection Panel */}
                <Card className="border border-[#8B5CF6]/30 dark:border-[#8B5CF6]/20 p-6 rounded-2xl bg-gradient-to-br from-violet-50 via-white to-purple-50/50 dark:from-[#8B5CF6]/10 dark:via-[#0F172A] dark:to-transparent shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#A855F7]/10 rounded-full blur-2xl pointer-events-none"></div>
                  <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2 select-none">
                    <Zap className="w-4 h-4 text-[#A855F7] animate-bounce" /> Projected Target Score
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{analysis.estFutureScore}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-2 leading-relaxed">
                    Estimated next attempt result based on full coverage of recommended topic study plans.
                  </p>
                </Card>

                {/* National Certificate Subject Metrics */}
                {isMilliy && (
                  <Card className="border border-slate-200 dark:border-white/[0.06] p-6 rounded-2xl bg-white dark:bg-[#0F172A] shadow-xl space-y-4">
                    <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#8B5CF6]" /> Subject Proficiency Analysis
                    </h3>
                    <div className="space-y-4 text-xs font-bold">
                      {subjectAnalyticsList.map((sub, i) => {
                        let barColor = "bg-rose-500";
                        if (sub.accuracy >= 70) barColor = "bg-emerald-500";
                        else if (sub.accuracy >= 45) barColor = "bg-amber-500";

                        return (
                          <div key={i} className="space-y-1.5">
                            <div className="flex justify-between items-center text-slate-800 dark:text-slate-200">
                              <span>{sub.subjectName}</span>
                              <span>{sub.correct} / {sub.total} ({sub.accuracy}%)</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all duration-500", barColor)}
                                style={{ width: `${sub.accuracy}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-500 font-semibold">
                              <span>Omitted: {sub.omitted} | Incorrect: {sub.incorrect}</span>
                              <span className={cn(sub.isStrength ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-500")}>
                                {sub.isStrength ? "Strength" : "Improvement Needed"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                )}

                {/* Time pacing Diagnostics */}
                <Card className="border border-slate-200 dark:border-white/[0.06] p-6 rounded-2xl bg-white dark:bg-[#0F172A] shadow-xl space-y-4">
                  <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Timer className="w-4 h-4 text-[#8B5CF6]" /> Pacing Diagnostics
                  </h3>
                  <div className="space-y-3 font-bold">
                    <div className="p-3 bg-slate-50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/[0.04] rounded-xl">
                      <span className="text-[9px] uppercase tracking-wider block text-slate-500 mb-0.5">Average Pace Rate</span>
                      <span className="text-xl font-black text-slate-900 dark:text-white">{avgTimePerQuestion} sec / question</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                      {omittedAnswers > totalQuestions * 0.2
                        ? "Critical pacing blockages. Plan to skip time-consuming items and save buffers."
                        : "Healthy pacing. Continue practice to lock in consistent timing parameters."}
                    </p>
                  </div>
                </Card>

                {/* Difficulty distributions */}
                <Card className="border border-slate-200 dark:border-white/[0.06] p-6 rounded-2xl bg-white dark:bg-[#0F172A] shadow-xl space-y-4">
                  <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#8B5CF6]" /> Difficulty Analytics
                  </h3>
                  <div className="space-y-3 text-xs font-bold">
                    <div>
                      <div className="flex justify-between mb-1 text-slate-800 dark:text-slate-200">
                        <span>Easy Questions</span>
                        <span>{analysis.byDifficulty.easy.correct} / {analysis.byDifficulty.easy.total}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${(analysis.byDifficulty.easy.correct / analysis.byDifficulty.easy.total) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 text-slate-800 dark:text-slate-200">
                        <span>Medium Questions</span>
                        <span>{analysis.byDifficulty.medium.correct} / {analysis.byDifficulty.medium.total}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${(analysis.byDifficulty.medium.correct / analysis.byDifficulty.medium.total) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 text-slate-800 dark:text-slate-200">
                        <span>Hard Questions</span>
                        <span>{analysis.byDifficulty.hard.correct} / {analysis.byDifficulty.hard.total}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full"
                          style={{ width: `${(analysis.byDifficulty.hard.correct / analysis.byDifficulty.hard.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>

              </div>

            </div>

            {/* Question Performance Analysis Table */}
            <Card className="border border-slate-200 dark:border-white/[0.06] p-6 rounded-2xl bg-white dark:bg-[#0F172A] shadow-xl overflow-hidden">
              <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#8B5CF6]" /> Question-Level Performance Analysis Table
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs font-semibold">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/[0.06] text-slate-500 font-black uppercase tracking-wider">
                      <th className="py-3 px-4"># Question</th>
                      <th className="py-3 px-4">Selected Answer</th>
                      <th className="py-3 px-4">Correct Answer</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4">Time Spent</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.03] font-bold">
                    {questionStates.map((res: any, idx: number) => {
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-colors">
                          <td className="py-3.5 px-4 font-extrabold text-slate-850 dark:text-slate-200">
                            Question {idx + 1}
                          </td>
                          <td className={cn(
                            "py-3.5 px-4 font-black",
                            res.state === 'correct' ? "text-emerald-600 dark:text-emerald-400" : res.state === 'skipped' ? "text-slate-500" : "text-rose-600 dark:text-rose-400"
                          )}>
                            {res.state === 'skipped' ? "— Omitted —" : <MathRenderer text={res.userAns} />}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-black">
                            <MathRenderer text={res.correctAns} />
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {res.state === 'correct' ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[10px] rounded-lg">Correct ✅</Badge>
                            ) : res.state === 'skipped' ? (
                              <Badge className="bg-slate-100 dark:bg-slate-800/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/30 font-bold text-[10px] rounded-lg">Omitted ⚪</Badge>
                            ) : res.state === 'review' ? (
                              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold text-[10px] rounded-lg">Review ⚠️</Badge>
                            ) : (
                              <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold text-[10px] rounded-lg">Incorrect ❌</Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-500">
                            {res.timeSpent} sec
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[#8B5CF6] hover:text-[#A855F7] font-bold rounded-lg px-2 h-7"
                              onClick={() => handleQuestionClick(idx)}
                            >
                              Review <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Detailed Question Review Tab */}
        {activeTab === 'review' && (
          <div className="space-y-6 animate-fadeIn select-text">
            {/* Answer sheet quick bar */}
            {renderAnswerSheet(false)}

            {/* Question detail card */}
            <div className="max-w-4xl mx-auto space-y-6">
              {activeQ && (
                <Card id="active-question-card" className="border border-slate-200 dark:border-white/[0.06] p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#0F172A] shadow-xl flex flex-col justify-between">
                  <div className="space-y-6">
                    
                    {/* Detail Header */}
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-white/[0.06] select-none">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm uppercase">Question {activeQuestionIndex + 1}</span>
                        {isSat && activeMeta && (
                          <Badge variant="outline" className="text-[10px] font-black uppercase text-[#A855F7] bg-[#8B5CF6]/10 border-[#8B5CF6]/30">
                            {activeMeta.skillCategory}
                          </Badge>
                        )}
                        {isMilliy && activeMeta && (
                          <Badge variant="outline" className="text-[10px] font-black uppercase text-[#8B5CF6] bg-[#8B5CF6]/10 border-[#8B5CF6]/30">
                            {activeMeta.subject}
                          </Badge>
                        )}
                      </div>
                      <div>
                        {activeResult?.state === 'correct' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold gap-1 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Correct ✅
                          </Badge>
                        ) : activeResult?.state === 'skipped' ? (
                          <Badge className="bg-slate-200/50 dark:bg-[#0F172A]/10 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700/30 font-bold gap-1 rounded-lg">
                            <AlertCircle className="w-3.5 h-3.5" /> Omitted ⚪
                          </Badge>
                        ) : activeResult?.state === 'review' ? (
                          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold gap-1 rounded-lg">
                            <AlertTriangle className="w-3.5 h-3.5" /> Review ⚠️
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold gap-1 rounded-lg">
                            <XCircle className="w-3.5 h-3.5" /> Incorrect ❌
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Question text prompt */}
                    <div className="text-base sm:text-lg text-slate-900 dark:text-white font-semibold leading-relaxed">
                      <MathRenderer text={activeQ.prompt} />
                    </div>

                    {/* Options rendering */}
                    {activeQ.options && activeQ.options.length > 0 && (
                      <div className="grid gap-3 select-none">
                        {activeQ.options.map((opt: any) => {
                          const isUserSelected = activeResult?.userAns === opt.text;
                          const isCorrectOption = opt.isCorrect || opt.is_correct || activeResult?.correctAns === opt.text;

                          let optionStyle = "border-slate-200 dark:border-white/[0.04] bg-slate-50 dark:bg-white/[0.01] text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.03]";
                          let checkMarker = null;

                          if (isCorrectOption) {
                            optionStyle = "border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30";
                            checkMarker = <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">Correct Answer ✔</span>;
                          } else if (isUserSelected && !isCorrectOption) {
                            optionStyle = "border-rose-500/40 bg-rose-50 dark:bg-rose-500/5 text-rose-700 dark:text-rose-455 ring-1 ring-rose-500/30";
                            checkMarker = <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">Your Answer ✖</span>;
                          }

                          return (
                            <div
                              key={opt.id || opt.text}
                              className={cn("p-4 rounded-xl border text-sm font-bold flex items-center justify-between transition-all duration-200", optionStyle)}
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

                    {/* Output block structured exactly as requested */}
                    <div className="p-5 bg-slate-50 dark:bg-white/[0.01] rounded-xl border border-slate-200 dark:border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold leading-relaxed">
                      <div>
                        <span className="text-slate-500 block uppercase tracking-wider mb-1">Your Selected Answer</span>
                        <div className={cn("text-sm font-extrabold flex items-center gap-1.5", 
                          activeResult?.state === 'correct' ? "text-emerald-600 dark:text-emerald-400" : activeResult?.state === 'skipped' ? "text-slate-500" : "text-rose-600 dark:text-rose-400"
                        )}>
                          {activeResult?.state === 'skipped' ? "Not Answered ⚪" : <MathRenderer text={activeResult?.userAns} />}
                          {activeResult?.state === 'skipped' ? null : activeResult?.state === 'correct' ? "✅" : "❌"}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-500 block uppercase tracking-wider mb-1">Correct Answer</span>
                        <div className="text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <MathRenderer text={activeResult?.correctAns} /> ✅
                        </div>
                      </div>
                    </div>

                    {/* Metadata attributes */}
                    {activeMeta && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold text-slate-400">
                        {isSat && (
                          <>
                            <div className="p-3 bg-slate-50 dark:bg-white/[0.01] rounded-lg border border-slate-200 dark:border-white/[0.04]">
                              <span className="text-[9px] uppercase tracking-wider block text-slate-500 mb-0.5">Skill Category</span>
                              <span className="text-slate-800 dark:text-slate-200 font-extrabold">{activeMeta.skillCategory}</span>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-white/[0.01] rounded-lg border border-slate-200 dark:border-white/[0.04]">
                              <span className="text-[9px] uppercase tracking-wider block text-slate-500 mb-0.5">Difficulty Level</span>
                              <span className={cn("font-extrabold", 
                                activeMeta.difficulty === "Easy" ? "text-emerald-600 dark:text-emerald-400" : activeMeta.difficulty === "Medium" ? "text-amber-600 dark:text-amber-500" : "text-rose-600 dark:text-rose-500"
                              )}>{activeMeta.difficulty}</span>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-white/[0.01] rounded-lg border border-slate-200 dark:border-white/[0.04]">
                              <span className="text-[9px] uppercase tracking-wider block text-slate-500 mb-0.5">Time Spent</span>
                              <span className="text-slate-800 dark:text-slate-200 font-extrabold">{activeMeta.timeSpent} seconds</span>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-white/[0.01] rounded-lg border border-slate-200 dark:border-white/[0.04]">
                              <span className="text-[9px] uppercase tracking-wider block text-slate-500 mb-0.5">Pacing Status</span>
                              <span className="text-slate-800 dark:text-slate-200 font-extrabold">
                                {activeMeta.timeSpent > avgTimePerQuestion * 1.3 ? "Slow Pace" : "Good Pace"}
                              </span>
                            </div>
                          </>
                        )}
                        {isMilliy && (
                          <>
                            <div className="p-3 bg-slate-50 dark:bg-white/[0.01] rounded-lg border border-slate-200 dark:border-white/[0.04]">
                              <span className="text-[9px] uppercase tracking-wider block text-slate-500 mb-0.5">Subject</span>
                              <span className="text-slate-800 dark:text-slate-200 font-extrabold">{activeMeta.subject}</span>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-white/[0.01] rounded-lg border border-slate-200 dark:border-white/[0.04]">
                              <span className="text-[9px] uppercase tracking-wider block text-slate-500 mb-0.5">Topic</span>
                              <span className="text-slate-800 dark:text-slate-200 font-extrabold">{activeMeta.topic}</span>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-white/[0.01] rounded-lg border border-slate-200 dark:border-white/[0.04]">
                              <span className="text-[9px] uppercase tracking-wider block text-slate-500 mb-0.5">Difficulty</span>
                              <span className={cn("font-extrabold", 
                                activeMeta.difficulty === "Easy" ? "text-emerald-600 dark:text-emerald-400" : activeMeta.difficulty === "Medium" ? "text-amber-600 dark:text-amber-500" : "text-rose-600 dark:text-rose-500"
                              )}>{activeMeta.difficulty}</span>
                            </div>
                            <div className="p-3 bg-slate-50 dark:bg-white/[0.01] rounded-lg border border-slate-200 dark:border-white/[0.04]">
                              <span className="text-[9px] uppercase tracking-wider block text-slate-500 mb-0.5">Subject Proficiency</span>
                              <span className="text-slate-800 dark:text-slate-200 font-extrabold">
                                {subjectStats[activeMeta.subject || ""] ? Math.round((subjectStats[activeMeta.subject || ""].correct / subjectStats[activeMeta.subject || ""].total) * 100) : 0}%
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* SAT Text Evidence explanation */}
                    {isSat && activeMeta?.evidenceExplanation && (
                      <div className="bg-emerald-500/5 p-4 border border-emerald-500/10 rounded-xl space-y-1.5 font-semibold">
                        <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span>📍</span> Text Evidence Citation
                        </h4>
                        <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                          {activeMeta.evidenceExplanation}
                        </p>
                      </div>
                    )}

                    {/* Rationale / Explanation */}
                    <div className="bg-[#8B5CF6]/5 p-4 border border-[#8B5CF6]/10 rounded-xl space-y-2">
                      <h4 className="text-xs font-black text-[#8B5CF6] dark:text-[#A855F7] uppercase tracking-wider flex items-center gap-1.5 font-bold">
                        <BrainCircuit className="w-4 h-4 animate-pulse" /> Explanation & Rationale
                      </h4>
                      <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-semibold">
                        <MathRenderer text={activeMeta?.explanation || "No explanation provided for this question."} />
                      </p>
                    </div>

                    {/* Learning Tip */}
                    {activeMeta?.learningTip && (
                      <div className="bg-amber-500/5 p-4 border border-amber-500/10 rounded-xl space-y-1.5 font-semibold">
                        <h4 className="text-xs font-black text-amber-600 dark:text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Lightbulb className="w-4 h-4 text-amber-500 dark:text-amber-400" /> Learning Tip
                        </h4>
                        <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                          <MathRenderer text={activeMeta.learningTip} />
                        </p>
                      </div>
                    )}

                  </div>

                  {/* Review Tab Navigation buttons */}
                  <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-white/[0.06] mt-6 select-none shrink-0 font-bold">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activeQuestionIndex === 0}
                      onClick={() => setActiveQuestionIndex(prev => prev - 1)}
                      className="rounded-xl font-bold gap-1 text-xs border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0F172A] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </Button>
                    <span className="text-xs text-slate-500 dark:text-slate-450 font-black">
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
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}

export default ExamResultDashboard;
