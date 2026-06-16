import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useBlocker, useBeforeUnload, useSearchParams } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExamResultDashboard } from "@/components/exam/ExamResultDashboard";
import confetti from "canvas-confetti";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2, Sparkles, CheckCircle2, Clock, AlertCircle, Headphones,
  BookOpen, ChevronLeft, ChevronRight, Flag, Play, Pause,
  Volume2, VolumeX, Maximize2, Minimize2, Mic, Calculator, X, PenLine, XCircle,
  Award, Target, ThumbsUp, Lightbulb, BookMarked, Sun, Moon,
  Shield, Grid, CheckSquare, Menu, ArrowRight, ArrowLeft, Bookmark
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { rawToBand, checkAnswer, satScore, milliyScore, scoreLevel } from "@/lib/ielts";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Scratchpad from "@/components/Scratchpad";
import TigerPlayer from "@/components/TigerPlayer";
import { useTheme } from "@/contexts/ThemeContext";
// Icons are already imported above

// Java API dan keluvchi tuzilma
interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
  is_correct?: boolean;
  positionOrder: number;
  position_order?: number;
  imageUrl?: string;
  image_url?: string;
  imagePosition?: string;
  image_position?: string;
}

interface Q {
  id: string;
  text: string;
  questionType?: string;
  question_type?: string;
  correctAnswer?: string | null;
  correct_answer?: string | null;
  points: number;
  positionOrder?: number;
  position_order?: number;
  passageId?: string;
  passage_id?: string;
  options: QuestionOption[] | null;
  imageUrl?: string;
  image_url?: string;
  imagePosition?: string;
  image_position?: string;
  explanation?: string;
}

interface Passage {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  image_url?: string;
  positionOrder?: number;
  position_order?: number;
  questions: Q[];
}

interface ExamData {
  id: string;
  title: string;
  description?: string;
  type: string;
  difficulty?: string;
  audio_url?: string;
  audioUrl?: string;
  pdfUrl?: string;
  pdf_url?: string;
  duration_minutes?: number;
  durationMinutes?: number;
  passages: Passage[];        // backend primary field
  sections?: Passage[];       // fallback if backend sends 'sections'
  questions?: Q[];            // fallback: flat questions at root level
}

// MockTake ichki state uchun normallashtirish
interface NormalQ {
  id: string;
  position: number;
  section_index: number;
  prompt: string;
  qtype: string;
  options: QuestionOption[] | null;
  correct_answer: string | null;
  points: number;
  imageUrl?: string;
  imagePosition?: string;
  explanation?: string;
}

/** Java'dan kelgan questionType → frontend qtype ga mapping */
function mapQtype(raw: string | null | undefined): string {
  const t = (raw ?? "short").toLowerCase().replace(/-/g, "_");
  if (t === "multiple_choice" || t === "multiplechoice") return "mcq";
  if (t === "fill_in_blank" || t === "fill_in_blanks" || t === "fillinblank") return "fill";
  if (t === "true_false_not_given" || t === "tfng") return "tfng";
  if (t === "yes_no_not_given" || t === "ynng") return "ynng";
  if (t === "short_answer" || t === "shortanswer") return "short";
  if (t === "map_labeling" || t === "map") return "mcq"; // Treat as mcq or short depending on input
  return t; // mcq, fill, short, tfng, ynng, matching, headings — already correct
}

function normalize(exam: ExamData): { sections: { title: string; passage: string; imageUrl: string }[]; questions: NormalQ[] } {
  const sections: { title: string; passage: string; imageUrl: string }[] = [];
  const questions: NormalQ[] = [];

  // Support both 'passages' and 'sections' field names from backend
  const rawPassages = (exam.passages && exam.passages.length > 0)
    ? exam.passages
    : (exam.sections && exam.sections.length > 0)
      ? exam.sections
      : [];

  console.log("[MockTake] normalize — exam raw:", JSON.stringify({
    id: exam.id,
    type: exam.type,
    passagesCount: exam.passages?.length ?? 0,
    sectionsCount: (exam as any).sections?.length ?? 0,
    rootQuestionsCount: (exam as any).questions?.length ?? 0,
  }));

  if (rawPassages.length > 0) {
    rawPassages.forEach((p, sIdx) => {
      sections.push({ title: p.title ?? "", passage: p.content ?? "", imageUrl: p.imageUrl ?? p.image_url ?? "" });
      (p.questions ?? []).forEach((q) => {
        const qtype = mapQtype(q.questionType ?? q.question_type);
        const rawOpts = q.options && q.options.length > 0
          ? q.options.map(o => ({
              id: o.id,
              text: o.text,
              isCorrect: o.isCorrect ?? o.is_correct ?? false,
              positionOrder: o.positionOrder ?? o.position_order ?? 0,
              imageUrl: o.imageUrl ?? o.image_url,
              imagePosition: o.imagePosition ?? o.image_position ?? "left"
            })).sort((a, b) => a.positionOrder - b.positionOrder)
          : null;
        questions.push({
          id: q.id,
          position: questions.length + 1,
          section_index: sIdx,
          prompt: q.text ?? q.prompt ?? "",
          qtype,
          options: rawOpts,
          correct_answer: q.correctAnswer ?? q.correct_answer ?? null,
          points: q.points ?? 1,
          imageUrl: q.imageUrl ?? q.image_url,
          imagePosition: q.imagePosition ?? q.image_position,
          explanation: q.explanation ?? "",
        });
      });
    });
  } else if ((exam as any).questions && (exam as any).questions.length > 0) {
    // Flat questions at root level (some backends return this)
    sections.push({ title: exam.title ?? "Section 1", passage: "", imageUrl: "" });
    ((exam as any).questions as Q[]).forEach((q) => {
      const qtype = mapQtype(q.questionType ?? q.question_type);
      const rawOpts = q.options && q.options.length > 0
        ? q.options.map(o => ({
            id: o.id,
            text: o.text,
            isCorrect: o.isCorrect ?? o.is_correct ?? false,
            positionOrder: o.positionOrder ?? o.position_order ?? 0,
            imageUrl: o.imageUrl ?? o.image_url,
            imagePosition: o.imagePosition ?? o.image_position ?? "left"
          })).sort((a, b) => a.positionOrder - b.positionOrder)
        : null;
      questions.push({
        id: q.id,
        position: questions.length + 1,
        section_index: 0,
        prompt: q.text ?? q.prompt ?? "",
        qtype,
        options: rawOpts,
        correct_answer: q.correctAnswer ?? q.correct_answer ?? null,
        points: q.points ?? 1,
        imageUrl: q.imageUrl ?? q.image_url,
        imagePosition: q.imagePosition ?? q.image_position,
        explanation: q.explanation ?? "",
      });
    });
  }

  console.log(`[MockTake] normalize done — ${sections.length} sections, ${questions.length} questions`);
  return { sections, questions };
}

const getFullAudioUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;

  // Tozalamoq (Trim leading slashes)
  const cleanPath = url.startsWith("/") ? url.slice(1) : url;

  // Agar URL allaqachon /api bilan boshlansa, uni o'zgartirmaymiz
  if (cleanPath.startsWith("api/")) return `/${cleanPath}`;

  // Agar bu /uploads bilan boshlanadigan eski format bo'lsa
  if (cleanPath.startsWith("uploads/")) {
    // Uni /api/v1/files/view formatiga o'tkazishga harakat qilamiz 
    // yoki to'g'ridan-to'g'ri /uploads orqali so'raymiz (proxy orqali)
    return `/${cleanPath}`;
  }

  // Standart holatda API orqali faylni ko'rish
  return `/api/v1/files/view/${cleanPath}`;
};

const getFullImageUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("data:")) return url;

  // Trim leading slashes
  const cleanPath = url.startsWith("/") ? url.slice(1) : url;

  // If URL already starts with api/
  if (cleanPath.startsWith("api/")) return `/${cleanPath}`;

  // If it starts with uploads/
  if (cleanPath.startsWith("uploads/")) return `/${cleanPath}`;

  // Default to files view API
  return `/api/v1/files/view/${cleanPath}`;
};

function CustomAudioPlayer({ src, isExternalPaused }: { src: string, isExternalPaused?: boolean }) {
  const fullSrc = useMemo(() => getFullAudioUrl(src), [src]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (fullSrc) console.log("DEBUG: Final Audio Source:", fullSrc);
  }, [fullSrc]);

  const playingRef = useRef(playing);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  const [isBuffering, setIsBuffering] = useState(false);

  useEffect(() => {
    if (!fullSrc) {
      setLoadError(true);
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };
    const onLoadedMetadata = () => {
      setDuration(audio.duration);
      setLoadError(false);
    };
    const onCanPlay = () => {
      setIsLoaded(true);
      setIsBuffering(false);
      setLoadError(false);
    };
    const onEnded = () => setPlaying(false);
    const onError = (e: any) => {
      console.error("Audio Load Error:", audio.error);
      setLoadError(true);
      setIsBuffering(false);
    };
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => {
      setIsBuffering(false);
      setLoadError(false);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("canplaythrough", onCanPlay);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);

    const handleVisibility = () => {
      if (document.hidden && playingRef.current && audioRef.current) {
        audioRef.current.pause();
        setPlaying(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("canplaythrough", onCanPlay);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fullSrc]); // Only re-run if the source changes

  useEffect(() => {
    if (isExternalPaused && playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
    }
  }, [isExternalPaused, playing]);

  const togglePlay = () => {
    if (!audioRef.current || !isLoaded) return;
    if (playing) audioRef.current.pause();
    else {
      console.log('DEBUG: Playing Audio URL:', fullSrc);
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const onProgressChange = (val: number[]) => {
    if (!audioRef.current) return;
    const time = (val[0] / 100) * duration;
    audioRef.current.currentTime = time;
    setProgress(val[0]);
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-3 pl-4 pr-8 shadow-[0_20px_50px_-20px_rgba(139,92,246,0.3)] relative overflow-hidden group flex items-center gap-6">
      <audio ref={audioRef} src={fullSrc} preload="auto" />

      {(!isLoaded || isBuffering) && !loadError && (
        <div className="absolute inset-0 z-20 bg-slate-950/40 backdrop-blur-sm flex flex-col items-center justify-center rounded-[2.5rem]">
          <div className="h-16 w-16 animate-pulse">
            <TigerPlayer />
          </div>
          <p className="text-[8px] font-bold text-primary animate-pulse uppercase tracking-[0.2em] mt-1">
            {isBuffering ? "Kutilmoqda..." : "Yuklanmoqda..."}
          </p>
        </div>
      )}

      {(loadError || !src) && (
        <div className="absolute inset-0 z-20 bg-slate-950/80 flex items-center justify-center rounded-[2.5rem] border border-rose-500/20 px-6 text-center">
          <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Audio xatolik ➔ Iltimos sahifani yangilang</p>
        </div>
      )}

      {/* Main Controls Section */}
      <div className="flex items-center gap-4 relative z-10">
        <button
          onClick={togglePlay}
          className="h-14 w-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:scale-105 active:scale-95 transition-all"
        >
          {playing ? <Pause className="fill-current h-6 w-6" /> : <Play className="fill-current h-6 w-6 translate-x-0.5" />}
        </button>
        <div className="flex items-center gap-0.5">
          <button className="p-2 text-white/40 hover:text-white transition-colors"><ChevronLeft className="h-5 w-5" /></button>
          <button className="p-2 text-white/40 hover:text-white transition-colors"><ChevronRight className="h-5 w-5" /></button>
        </div>
      </div>

      {/* Waveform & Progress Section */}
      <div className="flex-1 flex items-center gap-6 relative z-10">
        <div className="flex-1 h-14 relative flex items-center">
          {/* Animated Waveform Background */}
          <div className="absolute inset-0 flex items-center justify-center gap-1.5 pointer-events-none">
            {[...Array(40)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 rounded-full bg-gradient-to-t from-violet-500/40 to-indigo-400/40 transition-all duration-300",
                  playing ? "animate-pulse" : "h-1 opacity-20"
                )}
                style={{
                  height: playing ? `${20 + Math.sin(i * 0.4) * 60}%` : '4px',
                  animationDelay: `${i * 0.05}s`
                }}
              />
            ))}
          </div>

          {/* Transparent Range Input Overlay */}
          <input
            type="range"
            min="0" max="100"
            value={progress}
            onChange={(e) => {
              if (!audioRef.current) return;
              const time = (+e.target.value / 100) * duration;
              audioRef.current.currentTime = time;
              setProgress(+e.target.value);
            }}
            className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
          />

          {/* Visual Progress Bar Overlay */}
          <div className="absolute inset-0 flex items-center pointer-events-none">
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-[0_0_15px_rgba(139,92,246,0.5)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div
              className="absolute h-3 w-3 bg-white rounded-full shadow-[0_0_10px_#fff] border-2 border-violet-600"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>
        </div>

        {/* Time Display */}
        <div className="flex items-center gap-2 font-mono text-sm tabular-nums whitespace-nowrap">
          <span className="text-white font-bold">{fmtTime(currentTime)}</span>
          <span className="text-white/20">/</span>
          <span className="text-white/40">{fmtTime(duration)}</span>
        </div>
      </div>

      {/* Volume Section */}
      <div className="flex items-center gap-4 relative z-10 group/vol">
        <button
          onClick={() => {
            if (!audioRef.current) return;
            const newMute = !isMuted;
            setIsMuted(newMute);
            audioRef.current.volume = newMute ? 0 : volume;
          }}
          className="text-white/30 group-hover/vol:text-white/60 transition-colors"
        >
          {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
        <div className="w-24 relative flex items-center">
          <input
            type="range"
            min="0" max="100"
            value={isMuted ? 0 : volume * 100}
            onChange={(e) => {
              const v = +e.target.value / 100;
              setVolume(v);
              if (audioRef.current) audioRef.current.volume = v;
              if (v > 0) setIsMuted(false);
            }}
            className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-violet-500"
          />
        </div>
        <button className="text-white/20 hover:text-white transition-colors"><Mic className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export default function MockTake() {
  const { t } = useTranslation();
  const { theme, toggle } = useTheme();
  const { testId } = useParams();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const isReviewMode = searchParams.get("review") === "true";

  const [exam, setExam] = useState<ExamData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [sections, setSections] = useState<{ title: string; passage: string; imageUrl: string }[]>([]);
  const [questions, setQuestions] = useState<NormalQ[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [writingAnswer, setWritingAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [started, setStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [grading, setGrading] = useState(false);
  
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  
  const startedAt = useRef<number>(0);
  const questionStartRef = useRef<Record<string, number>>({});
  const timeSpentRef = useRef<Record<string, number>>({}); 

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      started && !result && !showSuccessAnimation && currentLocation.pathname !== nextLocation.pathname
  );

  useBeforeUnload(
    (event) => {
      if (started && !result && !showSuccessAnimation) {
        event.preventDefault();
        return (event.returnValue = "Test is in progress. Do you want to leave?");
      }
    },
    { capture: true }
  );

  useEffect(() => {
    if (started && !result) {
      document.body.classList.add("exam-mode");
      return () => document.body.classList.remove("exam-mode");
    }
  }, [started, result]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  useEffect(() => {
    if (!testId) return;
    setLoading(true);
    setLoadError(null);
    api.get<ExamData>(`/admin/exams/${testId}?t=${Date.now()}`)
      .then((res) => {
        const data = res.data;
        setExam(data);
        const { sections: s, questions: q } = normalize(data);
        setSections(s);
        setQuestions(q);
        setTimeLeft((data.duration_minutes ?? 60) * 60);
        
        try {
          const saved = localStorage.getItem(`lmshub_exam_${testId}`);
          if (saved) {
            setAnswers(JSON.parse(saved));
            toast.info("Session restored", { duration: 3000 });
          }
        } catch { /* ignore */ }
        
        if (isReviewMode) {
          api.get(`/student/exams/${testId}/result`)
            .then((resResult) => {
              setResult(resResult.data);
              setStarted(true); 
            })
            .catch(() => toast.error("Error loading result"));
        }
      })
      .catch((err) => {
        setLoadError(err?.response?.data?.message ?? err?.message ?? "Failed to load exam");
      })
      .finally(() => setLoading(false));
  }, [testId, isReviewMode]);

  // Keyboard Shortcuts (A, B, C, D, Left, Right)
  useEffect(() => {
    if (!started || result || showReviewScreen || showSuccessAnimation) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      
      const currentQ = questions[activeQuestionIndex];
      if (!currentQ) return;

      if (e.key === "ArrowRight" || e.key === "PageDown") {
        setActiveQuestionIndex(i => Math.min(i + 1, questions.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        setActiveQuestionIndex(i => Math.max(i - 1, 0));
      } else if (e.key === "f" || e.key === "F") {
        toggleFlag(currentQ.id);
      } else if (currentQ.qtype === 'mcq' && currentQ.options && currentQ.options.length > 0) {
         const key = e.key.toUpperCase();
         const optIndex = ['A', 'B', 'C', 'D', 'E', 'F'].indexOf(key);
         if (optIndex !== -1 && optIndex < currentQ.options.length) {
            onAnswer(currentQ.id, currentQ.options[optIndex].text);
         }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [started, result, activeQuestionIndex, questions, showReviewScreen, showSuccessAnimation]);

  // Timer
  useEffect(() => {
    if (!started || result || isPaused || showSuccessAnimation) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(id); submit(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [started, result, isPaused, showSuccessAnimation]);
  
  // Track Time Spent per question
  useEffect(() => {
    if (!started || isPaused || result || showSuccessAnimation) return;
    const currentQ = questions[activeQuestionIndex];
    if (!currentQ) return;
    const interval = setInterval(() => {
      timeSpentRef.current[currentQ.id] = (timeSpentRef.current[currentQ.id] || 0) + 1;
    }, 1000);
    return () => clearInterval(interval);
  }, [started, isPaused, result, activeQuestionIndex, questions, showSuccessAnimation]);

  const onAnswer = (qid: string, val: string) => {
    setAnswers((p) => {
      const next = { ...p, [qid]: val };
      try { localStorage.setItem(`lmshub_exam_${testId}`, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const toggleFlag = (qid: string) => setFlagged((p) => { const n = new Set(p); n.has(qid) ? n.delete(qid) : n.add(qid); return n; });

  const submit = async (auto = false) => {
    if (submitting || !exam) return;
    setSubmitting(true);
    setShowSuccessAnimation(true);
    window.scrollTo(0,0);

    try {
      const kind = (exam.type ?? "").toLowerCase();
      const elapsedSec = Math.floor((Date.now() - startedAt.current) / 1000);

      const payload = {
        exam_id: exam.id,
        answers: answers,
        time_spent: timeSpentRef.current,
        writing_answer: writingAnswer || null
      };

      const res = await api.post("/exams/submit", payload);
      try { localStorage.removeItem(`lmshub_exam_${testId}`); } catch { /* ignore */ }
      
      // Clinical delay
      setTimeout(() => {
        setResult({ ...res.data, kind, elapsedSec, timeSpent: timeSpentRef.current });
        setShowSuccessAnimation(false);
      }, 3000);
      
    } catch (err: any) {
      console.error("Submission error:", err);
      toast.error("Error submitting exam: " + (err.response?.data?.message || err.message));
      setShowSuccessAnimation(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitRequest = () => {
    setShowReviewScreen(true);
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white text-slate-800 font-sans">
      <Loader2 className="h-8 w-8 animate-spin text-slate-800" />
      <p className="text-sm font-bold uppercase tracking-widest">System Initialization...</p>
    </div>
  );

  if (loadError || !exam) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white text-slate-800 font-sans">
      <AlertCircle className="h-12 w-12 text-rose-700" />
      <h2 className="text-xl font-bold uppercase tracking-widest">System Error</h2>
      <p className="text-slate-600">{loadError}</p>
      <Button variant="outline" className="rounded-none border-2 border-slate-800" onClick={() => nav(-1)}>Return to Menu</Button>
    </div>
  );

  const kind = (exam.type ?? "").toLowerCase();

  if (showSuccessAnimation) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center overflow-hidden border-[16px] border-[#0f2c59]">
        <Loader2 className="w-12 h-12 animate-spin text-[#0f2c59] mb-6" />
        <h2 className="text-2xl font-bold text-[#0f2c59] tracking-widest uppercase font-sans">Processing Data</h2>
        <p className="text-slate-600 mt-2 font-bold uppercase tracking-widest text-xs font-sans">Do not close this window.</p>
        <div className="w-64 h-2 bg-slate-200 mt-8 overflow-hidden border border-slate-300">
           <div className="h-full bg-[#0f2c59] animate-[progress_3s_ease-in-out_forwards]" style={{width: '0%'}} />
        </div>
      </div>
    );
  }

  if (result) {
    return <ExamResultDashboard result={result} questions={questions} exam={exam} />;
  }

  if (!started) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#f4f4f4] font-sans selection:bg-blue-200">
        <div className="w-full max-w-4xl bg-white border border-slate-300 shadow-xl rounded-none">
          <div className="bg-[#0f2c59] p-6 flex items-center justify-between">
            <h1 className="text-xl font-bold text-white tracking-widest uppercase">Official Examination Portal</h1>
            <Badge variant="outline" className="bg-transparent text-white border-white/30 rounded-none uppercase text-[10px] tracking-widest">{exam.type}</Badge>
          </div>
          <div className="p-10 space-y-8">
            <div className="border-b-2 border-slate-200 pb-4">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{exam.title}</h2>
              {exam.description && <p className="text-slate-600 mt-2">{exam.description}</p>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-slate-300">
              <div className="p-6 bg-slate-50 border-r border-slate-300 flex flex-col gap-1">
                <span className="text-xs uppercase font-bold text-slate-500 tracking-widest">Time Allotted</span>
                <span className="text-2xl font-bold text-slate-900">{exam.duration_minutes} minutes</span>
              </div>
              <div className="p-6 bg-slate-50 flex flex-col gap-1">
                <span className="text-xs uppercase font-bold text-slate-500 tracking-widest">Total Items</span>
                <span className="text-2xl font-bold text-slate-900">{questions.length}</span>
              </div>
            </div>
            
            <div className="p-6 border-l-4 border-[#0f2c59] bg-[#f8fafc] text-sm text-slate-800 space-y-4 font-medium">
              <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Non-Disclosure Agreement & Rules</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>By starting this exam, you agree to maintaining strict confidentiality of all test materials.</li>
                <li>No external aids, materials, or devices are permitted.</li>
                <li>Your session is actively monitored. Navigating away from this window may result in score invalidation.</li>
                <li>Use standard keyboard keys (A, B, C, D) for answering. Left/Right arrows for navigation.</li>
              </ul>
            </div>
          </div>
          <div className="bg-slate-100 p-6 border-t border-slate-300 flex justify-end">
            <Button size="lg" className="bg-[#0f2c59] hover:bg-[#1a365d] text-white font-bold px-10 rounded-none h-12 uppercase tracking-widest text-sm" onClick={() => { setStarted(true); startedAt.current = Date.now(); }}>
              Acknowledge & Start
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const currentQuestion = questions[activeQuestionIndex];
  const isReading = kind === "reading";
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const flaggedCount = flagged.size;

  // REVIEW SCREEN - Clinical
  if (showReviewScreen) {
    return (
      <div className="min-h-screen w-full bg-[#f4f4f4] flex flex-col items-center justify-center p-4 md:p-8 font-sans selection:bg-blue-200">
        <div className="w-full max-w-5xl bg-white border border-slate-300 shadow-xl rounded-none">
          <div className="bg-[#0f2c59] p-6 text-white flex justify-between items-center">
            <h2 className="text-xl font-bold uppercase tracking-widest">Section Review</h2>
            <div className="font-mono text-xl font-bold tracking-widest bg-white/10 px-4 py-1 border border-white/20">
              {fmt(timeLeft)}
            </div>
          </div>
          
          <div className="p-8">
            <div className="flex items-center gap-8 mb-8 border-b-2 border-slate-200 pb-6">
              <div className="text-center">
                <span className="block text-3xl font-bold text-[#166534]">{answeredCount}</span>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Answered</span>
              </div>
              <div className="text-center">
                <span className="block text-3xl font-bold text-[#ca8a04]">{flaggedCount}</span>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Marked</span>
              </div>
              <div className="text-center">
                <span className="block text-3xl font-bold text-[#991b1b]">{questions.length - answeredCount}</span>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Incomplete</span>
              </div>
            </div>
            
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 mb-8">
              {questions.map((q, idx) => {
                const hasAns = !!answers[q.id];
                const isFlg = flagged.has(q.id);
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setActiveQuestionIndex(idx);
                      setShowReviewScreen(false);
                    }}
                    className={cn(
                      "aspect-square flex items-center justify-center text-sm font-bold border rounded-none transition-colors",
                      hasAns && !isFlg ? "bg-white border-[#166534] text-[#166534] border-2" 
                      : isFlg ? "bg-white border-[#ca8a04] text-[#ca8a04] border-2"
                      : "bg-[#f8fafc] border-slate-300 text-slate-500"
                    )}
                  >
                    {q.position}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between items-center bg-slate-100 p-6 border-t border-slate-300">
            <Button variant="outline" size="lg" className="rounded-none border-2 border-slate-800 font-bold uppercase tracking-widest text-xs" onClick={() => setShowReviewScreen(false)}>
              <ChevronLeft className="w-4 h-4 mr-2" /> Return
            </Button>
            <Button size="lg" className="bg-[#0f2c59] hover:bg-[#1a365d] text-white font-bold px-10 rounded-none text-xs uppercase tracking-widest" onClick={() => submit(false)}>
              Submit Final Responses
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-blue-200">
      
      {/* EXAM COMMAND CENTER HEADER - Official Blue Bar */}
      <header className="h-[60px] shrink-0 bg-[#0f2c59] text-white flex items-center justify-between px-6 z-40 border-b border-[#0f2c59]">
        <div className="flex items-center gap-4">
           <h1 className="font-bold text-sm uppercase tracking-widest">{exam.title}</h1>
           <span className="text-[10px] bg-white/10 px-2 py-0.5 border border-white/20 uppercase tracking-widest">{exam.type}</span>
        </div>

        {/* TIMER */}
        <div className="flex items-center">
          <div className={cn(
            "flex items-center justify-center px-6 py-1.5 font-mono text-xl font-bold tracking-[0.1em] border-2",
            timeLeft < 60 ? "bg-[#991b1b] border-[#ef4444] animate-pulse" :
            timeLeft < 300 ? "bg-[#ca8a04] border-[#facc15]" :
            "bg-transparent border-transparent"
          )}>
            <Clock className="w-4 h-4 mr-2 opacity-50" />
            {fmt(timeLeft)}
          </div>
        </div>

        <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" className="rounded-none hover:bg-white/10" onClick={toggleFullscreen}>
             {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
           </Button>
           <Button variant="ghost" size="icon" className="rounded-none hover:bg-white/10" onClick={() => setShowCalculator(!showCalculator)}>
             <Calculator className="h-4 w-4" />
           </Button>
        </div>
      </header>

      {/* QUESTION AREA */}
      <main className="flex-1 flex overflow-hidden bg-[#f4f4f4]">
        {isReading && sections[currentQuestion?.section_index] && (sections[currentQuestion?.section_index].passage || sections[currentQuestion?.section_index].imageUrl) && (
          <div className="w-1/2 h-full overflow-y-auto border-r border-slate-300 p-8 xl:p-12 bg-white">
            <h2 className="text-xl font-bold mb-6 text-slate-900 uppercase tracking-widest border-b-2 border-slate-800 pb-2">{sections[currentQuestion.section_index].title}</h2>
            {sections[currentQuestion.section_index].imageUrl && (
              <img src={getFullImageUrl(sections[currentQuestion.section_index].imageUrl)} className="max-w-full border border-slate-300 mb-6" />
            )}
            <div className="prose prose-slate max-w-none text-slate-800 font-serif leading-loose text-lg whitespace-pre-wrap">
              {sections[currentQuestion.section_index].passage}
            </div>
          </div>
        )}

        <div className={cn("h-full overflow-y-auto flex flex-col p-8 xl:p-12 bg-white", isReading ? "w-1/2" : "w-full max-w-5xl mx-auto border-x border-slate-300")}>
          
          <div className="w-full flex-1 flex flex-col">
            {currentQuestion && (
              <div key={currentQuestion.id} className="w-full">
                
                {/* QUESTION HEADER */}
                <div className="flex items-center justify-between border-b-2 border-[#0f2c59] pb-4 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-[#0f2c59] text-white flex items-center justify-center text-sm font-bold">
                      {currentQuestion.position}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#0f2c59]">
                      Item {currentQuestion.position} of {questions.length}
                    </span>
                  </div>
                  <button 
                    className={cn(
                      "flex items-center text-xs font-bold uppercase tracking-widest px-3 py-1.5 border-2 transition-colors", 
                      flagged.has(currentQuestion.id) ? "border-[#ca8a04] text-[#ca8a04]" : "border-slate-300 text-slate-500 hover:border-slate-500 hover:text-slate-700"
                    )}
                    onClick={() => toggleFlag(currentQuestion.id)}
                  >
                    <Bookmark className={cn("w-3 h-3 mr-2", flagged.has(currentQuestion.id) ? "fill-current" : "")} /> 
                    {flagged.has(currentQuestion.id) ? "Marked" : "Mark"}
                  </button>
                </div>

                {/* PROMPT */}
                <div className="text-xl md:text-2xl font-serif leading-relaxed text-slate-900 mb-8">
                  {currentQuestion.prompt}
                </div>

                {/* MEDIA */}
                {currentQuestion.imageUrl && (
                  <img src={getFullImageUrl(currentQuestion.imageUrl)} className="max-w-full border border-slate-300 mb-8" />
                )}

                {/* OPTIONS */}
                {currentQuestion.options && currentQuestion.options.length > 0 ? (
                  <div className="space-y-3">
                    {currentQuestion.options.map((opt, oIdx) => {
                      const isSelected = answers[currentQuestion.id] === opt.text;
                      const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
                      return (
                        <button
                          key={opt.id}
                          onClick={() => onAnswer(currentQuestion.id, opt.text)}
                          className={cn(
                            "w-full text-left p-4 border-2 transition-none flex items-center gap-4 group rounded-none",
                            isSelected 
                              ? "border-[#0f2c59] bg-[#f0f4f8]" 
                              : "border-slate-300 bg-white hover:border-[#0f2c59]"
                          )}
                        >
                          <div className={cn(
                            "h-6 w-6 border-2 flex items-center justify-center font-bold text-xs shrink-0 rounded-full",
                            isSelected 
                              ? "border-[#0f2c59] bg-[#0f2c59] text-white" 
                              : "border-slate-400 text-slate-600 group-hover:border-[#0f2c59] group-hover:text-[#0f2c59]"
                          )}>
                            {labels[oIdx]}
                          </div>
                          <div className="flex-1">
                            {opt.imageUrl && <img src={getFullImageUrl(opt.imageUrl)} className="h-16 object-contain mb-2 border border-slate-200" />}
                            <span className="text-lg font-serif text-slate-800">
                              {opt.text}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="w-full">
                    <Textarea 
                      rows={6} 
                      className="w-full p-4 text-lg font-serif rounded-none border-2 border-slate-300 focus:border-[#0f2c59] resize-none bg-white"
                      placeholder="Type your response here..."
                      value={answers[currentQuestion.id] || ""}
                      onChange={(e) => onAnswer(currentQuestion.id, e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* EXAM NAVIGATOR - Formal Status Bar */}
      <footer className="h-[70px] bg-slate-100 border-t border-slate-300 flex items-center justify-between px-6 z-40">
        
        <div className="flex items-center gap-4 w-1/4">
          <Button 
            size="lg" 
            variant="outline" 
            onClick={() => setActiveQuestionIndex(Math.max(0, activeQuestionIndex - 1))}
            disabled={activeQuestionIndex === 0}
            className="rounded-none border-2 border-slate-400 font-bold text-xs uppercase tracking-widest text-slate-700 bg-white"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>

        <div className="flex-1 flex justify-center items-center gap-8 text-xs font-bold uppercase tracking-widest text-slate-500">
          <span className="text-[#166534]">Answered: {answeredCount}</span>
          <span className="text-[#ca8a04]">Marked: {flaggedCount}</span>
          <span className="text-slate-800">Unanswered: {questions.length - answeredCount}</span>
        </div>

        <div className="flex items-center justify-end gap-4 w-1/4">
          <Button 
            size="lg" 
            onClick={() => {
              if (activeQuestionIndex === questions.length - 1) {
                handleSubmitRequest();
              } else {
                setActiveQuestionIndex(Math.min(questions.length - 1, activeQuestionIndex + 1));
              }
            }}
            className="rounded-none font-bold text-xs uppercase tracking-widest bg-[#0f2c59] hover:bg-[#1a365d] text-white border-2 border-[#0f2c59]"
          >
            {activeQuestionIndex === questions.length - 1 ? "End Section" : "Next"} <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

      </footer>

      {showScratchpad && <Scratchpad onClose={() => setShowScratchpad(false)} />}
      {showCalculator && <div className="fixed bottom-24 left-8 z-[100] shadow-2xl border-2 border-slate-800"><DesmosCalculator /></div>}
    </div>
  );
}
