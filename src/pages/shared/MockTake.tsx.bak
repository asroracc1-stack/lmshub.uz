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
  Volume2, VolumeX, Maximize2, Minimize2, Mic, Calculator, X, PenLine,
  Award, Target, ThumbsUp, Lightbulb, BookMarked, Sun, Moon,
  Shield, Grid, CheckSquare, Menu, ArrowRight, ArrowLeft
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
  const [activeTab, setActiveTab] = useState("overview");
  const [showAllInReview, setShowAllInReview] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        toast.error("To'liq ekranga o'tishda xatolik: " + err.message);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => { });
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

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
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [grading, setGrading] = useState(false);
  const [timeSpentSec, setTimeSpentSec] = useState(0);
  const startedAt = useRef<number>(0);
  const questionStartRef = useRef<Record<string, number>>({});
  const timeSpentRef = useRef<Record<string, number>>({}); 

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      started && !result && currentLocation.pathname !== nextLocation.pathname
  );

  useBeforeUnload(
    (event) => {
      if (started && !result) {
        event.preventDefault();
        return (event.returnValue = "Test davom etmoqda. Chiqmoqchimisiz?");
      }
    },
    { capture: true }
  );

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && started && !result && !isPaused) {
        toast.warning("Diqqat! Test vaqtida tablarni almashtirish IELTS qoidalariga zid. Taymer to'xtamadi!", {
          duration: 5000,
          icon: <AlertCircle className="text-amber-500" />,
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [started, result, isPaused]);

  useEffect(() => {
    if (started && !result) {
      document.body.classList.add("exam-mode");
      return () => document.body.classList.remove("exam-mode");
    }
  }, [started, result]);

  useEffect(() => {
    if (result) {
      const timer = setTimeout(() => {
        if (typeof (window as any).renderMathInElement === "function") {
          (window as any).renderMathInElement(document.body, {
            delimiters: [
              { left: "$$", right: "$$", display: true },
              { left: "$", right: "$", display: false },
              { left: "\\(", right: "\\)", display: false },
              { left: "\\[", right: "\\]", display: true }
            ],
            throwOnError: false
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [result, activeTab, showAllInReview]);

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
        // Resume saved answers from localStorage
        try {
          const saved = localStorage.getItem(`lmshub_exam_${testId}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            setAnswers(parsed);
            toast.info("Oldingi javoblaringiz tiklandi", { duration: 3000 });
          }
        } catch { /* ignore */ }
        
        if (isReviewMode) {
          api.get(`/student/exams/${testId}/result`)
            .then((resResult) => {
              setResult(resResult.data);
              setStarted(true); // to skip the "Start" screen
            })
            .catch((err) => {
              console.error("Failed to load exam result review:", err);
              toast.error("Natijani yuklashda xatolik yuz berdi");
            });
        }
      })
      .catch((err) => {
        const msg = err?.response?.data?.message ?? err?.message ?? "Exam yuklanmadi";
        setLoadError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, [testId, isReviewMode]);

  // ⌨️ Keyboard shortcuts
  useEffect(() => {
    if (!started || result || showReviewScreen) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        setActiveQuestionIndex(i => Math.min(i + 1, questions.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        setActiveQuestionIndex(i => Math.max(i - 1, 0));
      } else if (e.key === "f" || e.key === "F") {
        const curQ = questions[activeQuestionIndex];
        if (curQ) toggleFlag(curQ.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [started, result, activeQuestionIndex, questions.length, questions, showReviewScreen]);


  useEffect(() => {
    if (!started || result || isPaused) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(id); submit(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [started, result, isPaused]);

  const sectionQs = useMemo(() => questions.filter((q) => q.section_index === sectionIdx), [questions, sectionIdx]);

  const onAnswer = (qid: string, val: string) => {
    if (!questionStartRef.current[qid]) questionStartRef.current[qid] = Date.now();
    setAnswers((p) => {
      const next = { ...p, [qid]: val };
      // Auto-save to localStorage
      try { localStorage.setItem(`lmshub_exam_${testId}`, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const trackQuestionTime = (qid: string) => {
    const start = questionStartRef.current[qid];
    if (start) {
      timeSpentRef.current[qid] = (timeSpentRef.current[qid] ?? 0) + (Date.now() - start);
      questionStartRef.current[qid] = Date.now();
    }
  };

  const toggleFlag = (qid: string) => setFlagged((p) => { const n = new Set(p); n.has(qid) ? n.delete(qid) : n.add(qid); return n; });

  const submit = async (auto = false) => {
    if (submitting || !exam) return;
    setShowSubmitDialog(false);

    setSubmitting(true);
    try {
      Object.keys(questionStartRef.current).forEach(trackQuestionTime);
      const kind = (exam.type ?? "").toLowerCase();
      const elapsedSec = Math.floor((Date.now() - startedAt.current) / 1000);

      const payload = {
        exam_id: exam.id,
        answers: answers,
        time_spent: timeSpentRef.current,
        writing_answer: writingAnswer || null
      };

      const res = await api.post("/exams/submit", payload);
      // Clear localStorage on successful submit
      try { localStorage.removeItem(`lmshub_exam_${testId}`); } catch { /* ignore */ }
      setResult({ ...res.data, kind, elapsedSec });
      toast.success(t("dynamic.mocktake.natijangiz_hisoblandi"));
    } catch (err: any) {
      console.error("Submission error:", err);
      toast.error("Natijani yuborishda xatolik: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitRequest = (auto = false) => {
    if (auto) { submit(true); return; }
    setShowSubmitDialog(true);
  };

  if (grading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <Loader2 className="h-20 w-20 animate-spin text-primary opacity-20" />
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Sparkles className="h-10 w-10 text-primary" />
        </motion.div>
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold animate-pulse">{t("dynamic.mocktake.ai_javobingizni_tahlil_qilmoqda")}</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Tajribali IELTS imtihonchisi kabi kriteriyalar asosida baholanmoqda. Bu taxminan 10-20 soniya vaqt oladi.
        </p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{t("dynamic.mocktake.test_yuklanmoqda")}</p>
    </div>
  );

  if (loadError || !exam) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
      <AlertCircle className="h-12 w-12 text-rose-500" />
      <h2 className="text-xl font-bold">{t("dynamic.mocktake.test_topilmadi")}</h2>
      <p className="text-sm text-muted-foreground">{loadError ?? "Noma'lum xatolik"}</p>
      <Button variant="outline" onClick={() => nav(-1)}>{t("dynamic.mocktake.orqaga")}</Button>
    </div>
  );

  const kind = (exam.type ?? "").toLowerCase();
  const isSat = kind === "sat";
  const isMilliy = kind === "national_cert" || kind === "milliy";

  if (result) {
    const isExam = result.kind !== "writing" && result.kind !== "speaking";
    const band = result.bandScore ?? result.band ?? 0;
    
    // Universal counts
    const totalCount = result.total || questions.length || 1;
    const correctCount = result.correct ?? 0;
    const accuracy = Math.round((correctCount / Math.max(totalCount, 1)) * 100);

    // Score by exam type
    const satPts = satScore(correctCount, totalCount);
    const milliyPts = milliyScore(correctCount, totalCount);
    const score100 = accuracy;
    const { color: lvlColor, label: lvlLabel } = scoreLevel(accuracy);

    // Time spent
    const elapsedSec = result.elapsedSec ?? 0;
    const elapsedMin = Math.floor(elapsedSec / 60);
    const elapsedSecRem = elapsedSec % 60;
    const timeStr = `${elapsedMin}:${String(elapsedSecRem).padStart(2, "0")}`;

    // Section performance
    const sectionPerf = sections.map((sec, sIdx) => {
      const secQs = questions.filter(q => q.section_index === sIdx);
      const secCorrect = result.detail
        ? result.detail.filter((d: any) => secQs.some(q => q.id === d.questionId) && d.ok).length
        : 0;
      return { title: sec.title || `Section ${sIdx + 1}`, correct: secCorrect, total: secQs.length };
    }).filter(s => s.total > 0);

    // Filter incorrect questions
    const incorrectDetails = result.detail ? result.detail.filter((d: any) => !d.ok) : [];
    
    const reviewDetails = result.detail 
      ? (showAllInReview ? result.detail : result.detail.filter((d: any) => !d.ok))
      : [];
    
    // Group incorrect questions by type to determine weaknesses
    const incorrectByQtype: Record<string, number> = {};
    incorrectDetails.forEach((d: any) => {
      const q = questions.find(question => question.id === d.questionId);
      if (q) {
        incorrectByQtype[q.qtype] = (incorrectByQtype[q.qtype] || 0) + 1;
      }
    });

    // Generate personalized recommendations
    const recommendations: string[] = [];
    if (incorrectByQtype["mcq"] && incorrectByQtype["mcq"] > 0) {
      recommendations.push("Ko'p variantli savollar (Multiple Choice): Variantlar orasidagi nozik farqlarni ajratish, chalg'ituvchi variantlarni (distractors) chiqarib tashlash ustida ko'proq ishlang. Matnda to'g'ridan-to'g'ri berilgan kalit so'zlarga emas, balki ularning sinonimlariga (paraphrasing) e'tibor bering.");
    }
    if (incorrectByQtype["tfng"] && incorrectByQtype["tfng"] > 0) {
      recommendations.push("True/False/Not Given savollari: 'False' va 'Not Given' o'rtasidagi farqga alohida ahamiyat qarating. Agar matnda ma'lumotga qarama-qarshi fikr isbotlansa 'False', ma'lumotning o'zi yoki uning to'g'riligini tasdiqlovchi fakt umuman bo'lmasa 'Not Given' deb belgilang.");
    }
    if (incorrectByQtype["ynng"] && incorrectByQtype["ynng"] > 0) {
      recommendations.push("Yes/No/Not Given savollari: Muallifning fikri yoki qarashlarini aniqlashda ehtiyot bo'ling. Matndagi faktlarni emas, balki muallifning nuqtai nazarini tushunishga harakat qiling.");
    }
    if (incorrectByQtype["fill"] && incorrectByQtype["fill"] > 0) {
      recommendations.push("Bo'sh joylarni to'ldirish (Fill in the Blanks): Gap strukturasiga qarab qaysi so'z turkumi (ot, fe'l, sifat) kerakligini oldindan aniqlang. Javobni matndagidek o'zgarishsiz ko'chiring va spelling (imlo) xatolariga yo'l qo'ymang.");
    }
    if (incorrectByQtype["short"] && incorrectByQtype["short"] > 0) {
      recommendations.push("Qisqa javobli savollar (Short Answer): So'z chegarasiga (Word Limit - masalan, 'NO MORE THAN TWO WORDS') qat'iy amal qiling. Keraksiz so'zlarni yozish balingizni tushiradi.");
    }
    if (incorrectByQtype["matching"] && incorrectByQtype["matching"] > 0) {
      recommendations.push("Moslashtirish savollari (Matching): Abzatslarning asosiy mazmunini tezda tushunish (skimming) ko'nikmasini rivojlantiring. Matn bo'limlari sarlavhalarini kalit so'zlar bilan bog'lang.");
    }
    if (result.kind === "listening" && incorrectDetails.length > 3) {
      recommendations.push("Eshitish va yozib olish tezligi: Audio eshitish jarayonida kalit so'zlarni tezda yozib borish ko'nikmangizni oshiring. Nutq tempiga moslashish uchun har kuni 20-30 daqiqa ingliz tilida podkast yoki yangiliklar tinglang.");
    }

    if (recommendations.length === 0) {
      recommendations.push("Sizda muayyan turdagi savollarda tizimli xatoliklar aniqlanmadi. Natijangizni yanada mukammal qilish uchun umumiy grammatika va lug'at boyligini oshirishda davom eting.");
    }

    // Motivational message based on Band score
    let motivationTitle = "";
    let motivationMessage = "";
    let motivationColor = "";
    const numBand = Number(band) || 0;
    if (numBand >= 8.0) {
      motivationTitle = "Ajoyib Natija! 🌟";
      motivationMessage = "Siz yuqori professional tayyorgarlik darajasini ko'rsatdingiz. C1/C2 darajasidagi mukammal bilimingiz bilan IELTSda eng yuqori natijalarni zabt eta olasiz!";
      motivationColor = "text-purple-650 dark:text-purple-450 border-purple-500/20 bg-purple-500/5";
    } else if (numBand >= 6.5) {
      motivationTitle = "Juda yaxshi ko'rsatkich! 🚀";
      motivationMessage = "Siz IELTS imtihonini muvaffaqiyatli topshirishga to'liq tayyorsiz. Yo'l qo'yilgan kichik xatolar ustida biroz ishlab, balingizni yanada maksimal darajaga ko'tarishingiz mumkin.";
      motivationColor = "text-violet-650 dark:text-violet-450 border-violet-500/20 bg-violet-500/5";
    } else if (numBand >= 5.0) {
      motivationTitle = "Yaxshi boshlanish! 👍";
      motivationMessage = "Imtihonda o'rtacha darajani qayd etdingiz. Natijani yanada yaxshilash va maqsadli balingizga erishish uchun tavsiya etilgan mavzular va savol turlari bo'yicha ko'proq mashq qiling.";
      motivationColor = "text-amber-650 dark:text-amber-450 border-amber-500/20 bg-amber-500/5";
    } else {
      motivationTitle = "Tushkunlikka tushmang! 💪";
      motivationMessage = "Har bir xato - bu o'rganish uchun ajoyib imkoniyat. Kuchsiz tomonlaringizni aniqlab oldik. Tizimli tayyorgarlik va tavsiyalarimiz yordamida natijangizni tez fursatda yuqori darajaga ko'tara olasiz.";
      motivationColor = "text-rose-650 dark:text-rose-450 border-rose-500/20 bg-rose-500/5";
    }

    const getExplanation = (qtype: string, correct: string, user: string) => {
      const u = user ? `"${user}"` : "belgilanmagan";
      const c = `"${correct}"`;
      if (qtype === "tfng") {
        return `True/False/Not Given savollarida: agar gap matndagi ma'lumotni tasdiqlasa "True", unga butunlay zid bo'lsa "False", matnda bu haqda ma'lumot bo'lmasa "Not Given" bo'ladi. Matnga ko'ra to'g'ri javob ${c} bo'lishi kerak. Siz esa ${u} javobini belgilagansiz.`;
      }
      if (qtype === "ynng") {
        return `Yes/No/Not Given savollarida: agar gap muallifning fikriga mos kelsa "Yes", unga qarshi bo'lsa "No", bu haqda muallif fikr bildirmagan bo'lsa "Not Given" bo'ladi. Ushbu savolda to'g'ri javob muallif fikriga ko'ra ${c} deb baholangan.`;
      }
      if (qtype === "mcq") {
        return `Ko'p variantli savollarda (MCQ) to'g'ri javob varianti matndagi so'zlarning sinonimlari va paraphrase (boshqacha ifodalash) orqali yashiringan bo'ladi. Bu savolda eng to'g'ri variant ${c} hisoblanadi.`;
      }
      if (qtype === "fill") {
        return `Bo'sh joyni to'ldirishda (Fill in the Blanks) so'z matndagidek harfma-harf aniq va grammatik jihatdan to'g'ri tushishi shart. To'g'ri javob ${c} bo'lib, imlo va so'z chegarasiga e'tibor qaratilishi talab etiladi.`;
      }
      return `Qisqa javobli savollarda to'g'ri javob matndagi faktlar asosida ${c} qilib belgilangan. Mashqlar davomida so'z chegarasi va to'g'ri yozilishiga e'tibor bering.`;
    };

    return (
      <div className="w-full max-w-[1200px] mx-auto space-y-8 pb-20 px-4 md:px-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="p-8 text-center bg-gradient-to-br from-slate-900/5 via-violet-500/5 to-purple-500/5 dark:from-slate-950/40 dark:via-violet-500/5 dark:to-purple-500/10 border-slate-200 dark:border-white/5 relative overflow-hidden rounded-2xl shadow-xl">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <CheckCircle2 className="h-14 w-14 text-purple-500 mx-auto mb-4" />
              <h2 className="text-3xl font-display font-extrabold text-slate-950 dark:text-white mb-2">{t("dynamic.mocktake.test_yakunlandi")}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">{t("dynamic.mocktake.siz_topshiriqlarni_yakunladingiz_quyida_")}</p>
            </div>
          </Card>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-3 rounded-xl bg-slate-100 dark:bg-white/5 p-1 h-12">
            <TabsTrigger value="overview" className="rounded-lg font-bold text-xs md:text-sm">{t("dynamic.mocktake.umumiy_natija")}</TabsTrigger>
            <TabsTrigger value="errors" className="rounded-lg font-bold text-xs md:text-sm flex items-center justify-center gap-1.5">
              Xatolar Tahlili 
              {isExam && incorrectDetails.length > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-black">{incorrectDetails.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="rounded-lg font-bold text-xs md:text-sm">{t("dynamic.mocktake.tavsiyalar")}</TabsTrigger>
          </TabsList>

          {/* 📊 TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-6 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* MAIN SCORE CARD — type-aware */}
              <Card className="p-6 flex flex-col items-center justify-center border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 shadow-md rounded-2xl">
                {isSat ? (
                  // SAT Score: 200-800
                  <>
                    <p className="text-xs uppercase font-extrabold text-slate-400 dark:text-slate-500 tracking-wider mb-6">{t("dynamic.mocktake.sat_ball")}</p>
                    <div className="relative h-44 w-44 flex items-center justify-center">
                      <svg className="h-full w-full -rotate-90">
                        <circle cx="88" cy="88" r="76" fill="transparent" stroke="currentColor" strokeWidth="10" className="text-slate-100 dark:text-white/5" />
                        <circle cx="88" cy="88" r="76" fill="transparent" stroke="currentColor" strokeWidth="10"
                          strokeDasharray={477}
                          strokeDashoffset={477 - (477 * (satPts - 200)) / 600}
                          strokeLinecap="round"
                          className="text-blue-500 dark:text-blue-400 transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-display font-black text-slate-800 dark:text-white">{satPts}</span>
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-1">/ 800</span>
                      </div>
                    </div>
                  </>
                ) : isMilliy ? (
                  // Milliy: 0-100
                  <>
                    <p className="text-xs uppercase font-extrabold text-slate-400 dark:text-slate-500 tracking-wider mb-6">{t("dynamic.mocktake.milliy_sertifikat_bali")}</p>
                    <div className="relative h-44 w-44 flex items-center justify-center">
                      <svg className="h-full w-full -rotate-90">
                        <circle cx="88" cy="88" r="76" fill="transparent" stroke="currentColor" strokeWidth="10" className="text-slate-100 dark:text-white/5" />
                        <circle cx="88" cy="88" r="76" fill="transparent" stroke="currentColor" strokeWidth="10"
                          strokeDasharray={477}
                          strokeDashoffset={477 - (477 * milliyPts) / 100}
                          strokeLinecap="round"
                          className={cn("transition-all duration-1000 ease-out", milliyPts >= 60 ? "text-emerald-500" : milliyPts >= 40 ? "text-amber-500" : "text-rose-500")}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-display font-black text-slate-800 dark:text-white">{milliyPts}</span>
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-1">/ 100 ball</span>
                      </div>
                    </div>
                  </>
                ) : (
                  // IELTS Band
                  <>
                    <p className="text-xs uppercase font-extrabold text-slate-400 dark:text-slate-500 tracking-wider mb-6">{t("dynamic.mocktake.ielts_band_score")}</p>
                    <div className="relative h-44 w-44 flex items-center justify-center">
                      <svg className="h-full w-full -rotate-90">
                        <circle cx="88" cy="88" r="76" fill="transparent" stroke="currentColor" strokeWidth="10" className="text-slate-100 dark:text-white/5" />
                        <circle cx="88" cy="88" r="76" fill="transparent" stroke="currentColor" strokeWidth="10"
                          strokeDasharray={477}
                          strokeDashoffset={477 - (477 * (Number(band) || 0)) / 9}
                          strokeLinecap="round"
                          className="text-purple-500 dark:text-purple-400 transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-5xl font-display font-black text-slate-800 dark:text-white">{band || "0.0"}</span>
                        <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 text-center px-2">
                          {result.kind.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </Card>

              {/* STATS CARD: accuracy, correct, wrong, time */}
              <Card className="p-6 flex flex-col justify-between border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 shadow-md rounded-2xl">
                <div>
                  <p className="text-xs uppercase font-extrabold text-slate-400 dark:text-slate-500 tracking-wider mb-4">{t("dynamic.mocktake.natija_statistikasi")}</p>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className={cn("text-6xl font-display font-black", lvlColor)}>{accuracy}</span>
                    <span className="text-xl font-bold text-slate-400 dark:text-slate-500">{t("dynamic.mocktake._aniqlik")}</span>
                  </div>
                  <Progress value={accuracy} className="h-3 bg-slate-100 dark:bg-white/10 rounded-full mb-1" />
                  <p className={cn("text-xs font-bold mt-1", lvlColor)}>{lvlLabel}</p>
                </div>

                {isExam ? (
                  <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">{t("dynamic.mocktake.to_g_ri")}</p>
                      <p className="text-xl font-black text-emerald-500 mt-0.5">{correctCount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">{t("dynamic.mocktake.noto_g_ri")}</p>
                      <p className="text-xl font-black text-rose-500 mt-0.5">{incorrectDetails.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">{t("dynamic.auditlogs.vaqt")}</p>
                      <p className="text-sm font-black text-slate-700 dark:text-slate-300 mt-0.5 flex items-center justify-center gap-1">
                        <Clock className="h-3.5 w-3.5" />{timeStr}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Yozma / Og'zaki javob muvaffaqiyatli topshirildi va sun'iy intellekt tomonidan baholandi.</p>
                  </div>
                )}
              </Card>
            </div>

            {/* SECTION PERFORMANCE */}
            {sectionPerf.length > 1 && (
              <Card className="p-6 border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 shadow-md rounded-2xl">
                <p className="text-xs uppercase font-extrabold text-slate-400 dark:text-slate-500 tracking-wider mb-4">{t("dynamic.mocktake.bo_lim_natijalari")}</p>
                <div className="space-y-3">
                  {sectionPerf.map((sec, i) => {
                    const pct = Math.round((sec.correct / Math.max(sec.total, 1)) * 100);
                    const { color } = scoreLevel(pct);
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[60%]">{sec.title}</span>
                          <span className={cn("text-sm font-black", color)}>{sec.correct}/{sec.total} ({pct}%)</span>
                        </div>
                        <Progress value={pct} className="h-2 bg-slate-100 dark:bg-white/10 rounded-full" />
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Motivational message banner */}
            <Card className={cn("p-6 border rounded-2xl flex items-start gap-4 shadow-sm", motivationColor)}>
              <Award className="h-6 w-6 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-extrabold text-sm uppercase tracking-wider mb-1">{motivationTitle}</h4>
                <p className="text-sm font-medium leading-relaxed opacity-95">{motivationMessage}</p>
              </div>
            </Card>

            {/* AI feedback section for Writing/Speaking */}
            {!isExam && result.feedback && (
              <Card className="p-6 md:p-8 border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 shadow-md rounded-2xl space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-white/5 pb-4">
                  <Sparkles className="h-5 w-5 text-violet-500" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI Examiner Feedback & Analysis</h3>
                </div>
                <div className="text-slate-700 dark:text-slate-300 text-sm md:text-base leading-relaxed whitespace-pre-wrap select-text">
                  {result.feedback}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ❌ TAB 2: ERRORS ANALYSIS */}
          <TabsContent value="errors" className="space-y-6 outline-none">
            {!isExam ? (
              <Card className="p-8 text-center border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 shadow-md rounded-2xl py-12">
                <AlertCircle className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm">{t("dynamic.mocktake.writing_yoki_speaking_bo_limlarida_avtom")}</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">{t("dynamic.mocktake.ushbu_bo_limlarda_batafsil_tavsiyalarni_")}</p>
              </Card>
            ) : incorrectDetails.length === 0 ? (
              <Card className="p-8 text-center border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 shadow-md rounded-2xl py-12">
                <ThumbsUp className="h-12 w-12 text-purple-500 mx-auto mb-3 animate-bounce" />
                <h3 className="text-xl font-bold text-purple-500 mb-1">{t("dynamic.mocktake.ajoyib_hech_qanday_xato_topilmadi")}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Siz barcha savollarga to'g'ri javob berdingiz. Mukammal natija! 🎉</p>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-bold text-sm text-slate-400 uppercase tracking-widest">Savollar Tahlili ({reviewDetails.length})</h3>
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 p-1 rounded-xl border">
                    <button
                      onClick={() => setShowAllInReview(false)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                        !showAllInReview ? "bg-white dark:bg-slate-900 shadow text-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-850"
                      )}
                    >
                      Faqat xatolar ({incorrectDetails.length})
                    </button>
                    <button
                      onClick={() => setShowAllInReview(true)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                        showAllInReview ? "bg-white dark:bg-slate-900 shadow text-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-850"
                      )}
                    >
                      Barcha savollar ({result.detail?.length || 0})
                    </button>
                  </div>
                </div>

                {reviewDetails.length === 0 && !showAllInReview ? (
                  <Card className="p-8 text-center border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 shadow-md rounded-2xl py-12">
                    <ThumbsUp className="h-12 w-12 text-purple-500 mx-auto mb-3 animate-bounce" />
                    <h3 className="text-xl font-bold text-purple-500 mb-1">{t("dynamic.mocktake.ajoyib_hech_qanday_xato_topilmadi")}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Siz barcha savollarga to'g'ri javob berdingiz. Mukammal natija! 🎉</p>
                  </Card>
                ) : (
                  reviewDetails.map((detail: any, idx: number) => {
                    const q = questions.find(question => question.id === detail.questionId);
                    if (!q) return null;
                    const isCorrect = detail.ok;

                    return (
                      <Card key={detail.questionId || idx} className="p-6 border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 shadow-md rounded-2xl space-y-4 text-left">
                        {/* Mistake Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              "h-7 w-7 rounded-lg flex items-center justify-center text-xs font-black",
                              isCorrect 
                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-450" 
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-450"
                            )}>
                              {q.position}
                            </span>
                            <Badge variant="outline" className="capitalize text-[10px] font-extrabold border-slate-250 dark:border-white/10 text-slate-500 bg-slate-50 dark:bg-slate-900 px-2.5 py-0.5">
                              {q.qtype.toUpperCase()}
                            </Badge>
                            <Badge className={cn(
                              "text-[10px] font-extrabold px-2.5 py-0.5",
                              isCorrect ? "bg-purple-500 hover:bg-purple-600 text-white" : "bg-rose-500 hover:bg-rose-600 text-white"
                            )}>
                              {isCorrect ? "To'g'ri" : "Noto'g'ri"}
                            </Badge>
                          </div>
                        </div>

                        {/* Prompt */}
                        <div>
                          <p className="text-slate-800 dark:text-slate-200 text-sm md:text-base font-semibold leading-relaxed">
                            {q.prompt}
                          </p>
                        </div>

                        {/* Answers comparison */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className={cn(
                            "p-3.5 rounded-xl border flex items-center gap-2",
                            isCorrect 
                              ? "border-purple-500/25 bg-purple-500/5" 
                              : "border-rose-500/20 bg-rose-500/5"
                          )}>
                            <span className={cn(
                              "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded",
                              isCorrect ? "bg-purple-500/10 text-purple-500 dark:text-purple-400" : "bg-rose-500/10 text-rose-500 dark:text-rose-400"
                            )}>{t("dynamic.mocktake.sizning_javobingiz")}</span>
                            <span className={cn(
                              "font-bold text-xs truncate",
                              isCorrect ? "text-purple-700 dark:text-purple-400" : "text-rose-700 dark:text-rose-400"
                            )}>{detail.userAns || "(javob berilmagan)"}</span>
                          </div>
                          {!isCorrect && (
                            <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5 flex items-center gap-2">
                              <span className="text-[10px] uppercase font-bold text-purple-500 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">{t("dynamic.mocktake.to_g_ri_javob")}</span>
                              <span className="font-bold text-xs text-purple-700 dark:text-purple-400 truncate">{detail.correctAns}</span>
                            </div>
                          )}
                        </div>

                        {/* Generic Explanation */}
                        <div className="p-4 rounded-xl border border-slate-200/50 dark:border-white/5 bg-slate-50 dark:bg-slate-950/40 flex gap-3">
                          <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{t("dynamic.mocktake.tushuntirish_explanation")}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                              {getExplanation(q.qtype, detail.correctAns, detail.userAns)}
                            </p>
                          </div>
                        </div>

                        {/* Custom Explanation */}
                        {q.explanation && (
                          <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/5 dark:bg-violet-950/20 flex gap-3 mt-3">
                            <Lightbulb className="h-5 w-5 text-violet-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[11px] font-extrabold text-violet-500 dark:text-violet-400 uppercase tracking-widest mb-1">To'liq Yechim / Tahlil</p>
                              <div className="text-xs text-slate-700 dark:text-slate-350 leading-relaxed font-medium whitespace-pre-wrap">
                                {q.explanation}
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </TabsContent>

          {/* 💡 TAB 3: RECOMMENDATIONS */}
          <TabsContent value="recommendations" className="space-y-6 outline-none">
            <Card className="p-6 md:p-8 border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 shadow-md rounded-2xl space-y-6 text-left">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-white/5 pb-4">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t("dynamic.mocktake.zaif_tomonlaringiz_asosida_shaxsiy_tavsi")}</h3>
              </div>

              <div className="space-y-4">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 flex gap-3.5 items-start">
                    <span className="h-6 w-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-black shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-sm text-slate-700 dark:text-slate-350 leading-relaxed font-medium">
                      {rec}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex gap-3 items-start p-4 rounded-xl bg-violet-500/5 text-violet-600 dark:text-violet-400">
                <BookMarked className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-widest mb-1">{t("dynamic.mocktake.keyingi_qadamlar")}</p>
                  <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed font-medium">
                    Tavsiyalarimiz asosida o'xshash bo'limlar yoki savol turlari bo'yicha qo'shimcha testlarni ishlang. Xatoliklar tushuntirishini tahlil qilish orqali siz real IELTS imtihonida bunday xatolarga qayta yo'l qo'ymaysiz.
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex gap-4 pt-4">
          <Button onClick={() => nav(-1)} variant="outline" size="lg" className="flex-1 rounded-xl font-bold h-12 shadow-sm">
            Chiqish
          </Button>
          <Button onClick={() => window.location.reload()} size="lg" className="flex-1 rounded-xl font-bold h-12 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-655 text-white shadow-md shadow-purple-500/10">
            Qaytadan topshirish
          </Button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-[#070b19]">
        <div className="w-full max-w-3xl">
          <Card className="p-0 shadow-2xl border-slate-200/50 dark:border-white/10 bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
            <div className="bg-slate-900 dark:bg-slate-950 p-6 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded bg-white/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">Official Test Environment</h1>
                  <p className="text-slate-400 text-sm">LMSHub Certification Platform</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700">{exam.type}</Badge>
            </div>
            
            <div className="p-8 space-y-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{exam.title}</h2>
              {exam.description && <p className="text-slate-600 dark:text-slate-400">{exam.description}</p>}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                  <span className="text-xs uppercase font-bold text-slate-500">Duration</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" /> {exam.duration_minutes} minutes
                  </span>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                  <span className="text-xs uppercase font-bold text-slate-500">Questions</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Flag className="h-5 w-5 text-blue-500" /> {questions.length} items
                  </span>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
                  <span className="text-xs uppercase font-bold text-slate-500">Format</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-500" /> CBT / Linear
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 text-sm text-blue-800 dark:text-blue-300 space-y-3">
                <h3 className="font-bold flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Exam Rules & Instructions</h3>
                <ul className="list-disc pl-5 space-y-1.5 opacity-90">
                  <li>Do not switch tabs or minimize the browser window during the exam.</li>
                  <li>Ensure your internet connection is stable.</li>
                  <li>You may mark questions for review and return to them later.</li>
                  <li>The exam will auto-submit when the timer reaches zero.</li>
                </ul>
              </div>

              {(kind === "listening" || exam.title.toLowerCase().includes("listening")) && (
                <div className="py-2">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Sound Check</p>
                  <CustomAudioPlayer src={exam.audio_url || (exam as any).audioUrl} />
                </div>
              )}

            </div>
            
            <div className="bg-slate-50 dark:bg-slate-900 p-6 border-t border-slate-200 dark:border-white/10 flex justify-end">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 shadow-lg shadow-blue-500/20" 
                onClick={() => { setStarted(true); startedAt.current = Date.now(); }}
              >
                Start Exam <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const lowTime = timeLeft < 300;

  if (kind === "writing" || kind === "speaking") {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className={cn("p-3 flex items-center justify-between sticky top-0 z-10", lowTime && "border-rose-500")}>
          <Badge variant="outline">{exam.title}</Badge>
          <div className={cn("flex items-center gap-2 font-mono font-bold", lowTime && "text-rose-500 animate-pulse")}>
            <Clock className="h-4 w-4" />{fmt(timeLeft)}
          </div>
        </Card>
        {sections[0]?.passage && <Card className="p-6 whitespace-pre-wrap">{sections[0].passage}</Card>}
        <Card className="p-4 space-y-2">
          <Textarea rows={16} value={writingAnswer} onChange={(e) => setWritingAnswer(e.target.value)} placeholder="Javobingizni yozing..." />
        </Card>
        <Button size="lg" className="w-full" onClick={() => handleSubmitRequest()} disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Topshirish
        </Button>
      </div>
    );
  }

  const currentSection = sections[sectionIdx];
  const answeredCount = Object.values(answers).filter(Boolean).length;

  const renderInlineInput = (q: NormalQ) => (
    <input type="text" value={answers[q.id] ?? ""} onChange={(e) => onAnswer(q.id, e.target.value)}
      onFocus={() => { if (!questionStartRef.current[q.id]) questionStartRef.current[q.id] = Date.now(); }}
      onBlur={() => trackQuestionTime(q.id)}
      className={cn("inline-block mx-1 px-2 h-7 text-sm rounded border bg-background align-middle min-w-[110px] max-w-[180px] text-center",
        answers[q.id] ? "border-primary/60 bg-primary/5 font-semibold" : "border-input")}
      placeholder={String(q.position)} />
  );

  const renderInlinePrompt = (q: NormalQ) => {
    const parts = (q.prompt ?? "").split(/_{2,}|\[\s*_+\s*\]|\{\{\s*\d+\s*\}\}|\[\s*\.{3}\s*\]|\[\s*…\s*\]|\[\s*\d+\s*\]|\.{3,}/);
    if (parts.length <= 1) return <span className="inline-flex items-center flex-wrap gap-1"><span className="text-sm">{q.prompt}</span>{renderInlineInput(q)}</span>;
    return (
      <span className="inline-flex items-baseline flex-wrap text-sm leading-8">
        {parts.map((p, idx) => <span key={idx} className="contents"><span>{p}</span>{idx < parts.length - 1 && renderInlineInput(q)}</span>)}
      </span>
    );
  };

  const currentQuestion = questions[activeQuestionIndex];
  const currentSection = sections[currentQuestion?.section_index || 0];
  const isReading = kind === "reading";
  const showPassage = isReading && (currentSection?.passage || currentSection?.imageUrl);
  const flaggedCount = flagged.size;

  if (showReviewScreen) {
    return (
      <div className="min-h-screen w-full bg-slate-100 dark:bg-[#070b19] flex flex-col p-4 md:p-8">
        <Card className="w-full max-w-5xl mx-auto p-6 md:p-10 shadow-2xl border-slate-200/50 dark:border-white/10 bg-white dark:bg-slate-900 rounded-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-6 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Exam Review</h2>
              <p className="text-slate-500 text-sm mt-1">Review your answers before final submission.</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="text-center px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                 <span className="block text-xl font-bold text-slate-900 dark:text-white">{answeredCount}</span>
                 <span className="text-[10px] uppercase font-bold text-slate-500">Answered</span>
               </div>
               <div className="text-center px-4 py-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg">
                 <span className="block text-xl font-bold text-amber-600 dark:text-amber-400">{flaggedCount}</span>
                 <span className="text-[10px] uppercase font-bold text-amber-600/70">Flagged</span>
               </div>
            </div>
          </div>
          
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-3 mb-8">
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
                    "aspect-square rounded-xl flex items-center justify-center text-sm font-black border-2 transition-all hover:scale-105",
                    hasAns 
                      ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20" 
                      : isFlg 
                        ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-500"
                  )}
                >
                  {q.position}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-white/10">
            <Button variant="outline" size="lg" onClick={() => setShowReviewScreen(false)}>
              <ChevronLeft className="w-5 h-5 mr-2" /> Return to Exam
            </Button>
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8" onClick={() => handleSubmitRequest()}>
              Submit Exam
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-100 dark:bg-[#070b19] text-slate-900 dark:text-slate-100 flex flex-col select-none overflow-x-hidden font-sans">
      {/* 🚀 OFFICIAL COMMAND CENTER HEADER */}
      <header className={cn(
        "h-[72px] shrink-0 border-b flex items-center justify-between px-6 sticky top-0 z-40 transition-all duration-300",
        theme === "dark" ? "bg-slate-900 border-slate-800 shadow-md" : "bg-white border-slate-200 shadow-sm"
      )}>
        <div className="flex items-center gap-4">
           <div className="h-10 w-10 bg-blue-600 rounded flex items-center justify-center shadow-lg shadow-blue-500/20">
             <Shield className="h-6 w-6 text-white" />
           </div>
           <div>
             <h1 className="font-bold text-sm md:text-base leading-tight max-w-[200px] md:max-w-[400px] truncate">{exam.title}</h1>
             <p className="text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">{exam.type}</p>
           </div>
        </div>

        {/* Dynamic Timer */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className={cn(
            "flex items-center gap-2 px-6 py-2 rounded-full font-mono text-lg md:text-xl font-black tracking-widest transition-colors border",
            timeLeft < 60 
              ? "bg-rose-500 text-white border-rose-600 animate-pulse" 
              : timeLeft < 300 
                ? "bg-amber-500 text-white border-amber-600"
                : timeLeft < 900
                  ? "bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-200 dark:border-yellow-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
          )}>
            <Clock className={cn("h-5 w-5", timeLeft < 60 && "animate-spin")} />
            {fmt(timeLeft)}
          </div>
        </div>

        <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" onClick={() => setShowCalculator(!showCalculator)} className="hidden md:flex"><Calculator className="h-5 w-5" /></Button>
           <Button variant="ghost" size="icon" onClick={() => setShowScratchpad(!showScratchpad)} className="hidden md:flex"><PenLine className="h-5 w-5" /></Button>
           <Button variant="ghost" size="icon" onClick={() => setIsPaused(!isPaused)}><Pause className="h-5 w-5" /></Button>
           <Button variant="ghost" size="icon" onClick={toggle}>{theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</Button>
           
           <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block" />
           <Button variant="outline" className="hidden sm:flex font-bold" onClick={() => setShowReviewScreen(true)}>
             Review
           </Button>
           <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={() => handleSubmitRequest()}>
             Finish
           </Button>
        </div>
      </header>

      {(kind === "listening" || exam.title.toLowerCase().includes("listening")) && (
        <div className="w-full bg-slate-900 border-b border-slate-800 py-2 px-6 flex justify-center">
          <div className="w-full max-w-3xl">
             <CustomAudioPlayer src={exam.audio_url || (exam as any).audioUrl} isExternalPaused={isPaused} />
          </div>
        </div>
      )}

      {/* PAUSE OVERLAY */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center text-center"
          >
            <Shield className="h-24 w-24 text-blue-500 mb-6 opacity-50" />
            <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Exam Paused</h2>
            <p className="text-slate-400 mb-8 max-w-md">Your timer is stopped. Note that in official exams, pauses may not be allowed. Return when you are ready.</p>
            <Button size="lg" onClick={() => setIsPaused(false)} className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-6 rounded-full text-lg font-bold shadow-2xl shadow-blue-500/20">
              <Play className="h-6 w-6 mr-2 fill-current" /> Resume Exam
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EXAM WORKSPACE */}
      <main className="flex-1 w-full flex flex-col xl:flex-row h-[calc(100vh-72px)] overflow-hidden relative">
        
        {/* PASSAGE PANEL (For Reading/PDF) */}
        {showPassage && (
          <div className="w-full xl:w-5/12 h-[40vh] xl:h-full border-b xl:border-b-0 xl:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1021] flex flex-col">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
               <span className="font-bold text-sm uppercase tracking-wider text-slate-500">Passage Material</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
              {currentSection.imageUrl && (
                <img src={getFullImageUrl(currentSection.imageUrl)} alt="Reference" className="max-w-full rounded-xl border border-slate-200 dark:border-slate-700 mb-6" />
              )}
              {currentSection.passage && (
                <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-300 text-base md:text-lg leading-loose whitespace-pre-wrap font-medium">
                  {currentSection.passage}
                </div>
              )}
            </div>
          </div>
        )}

        {/* QUESTION PANEL */}
        <div className={cn(
          "flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-[#070b19]",
          showPassage ? "w-full xl:flex-1" : "w-full xl:flex-1 max-w-5xl mx-auto"
        )}>
          {currentQuestion ? (
            <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar flex flex-col">
              
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                   <div className="h-10 w-10 bg-blue-600 text-white font-black text-lg flex items-center justify-center rounded-lg shadow-md">
                     {currentQuestion.position}
                   </div>
                   <span className="font-bold text-slate-400 uppercase tracking-widest text-xs">Question {currentQuestion.position} of {questions.length}</span>
                 </div>
                 <Button 
                   variant="outline" 
                   className={cn("h-10 gap-2 font-bold transition-colors", flagged.has(currentQuestion.id) ? "bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-500/10 dark:border-amber-500/30" : "")}
                   onClick={() => toggleFlag(currentQuestion.id)}
                 >
                   <Flag className={cn("h-4 w-4", flagged.has(currentQuestion.id) && "fill-current")} /> 
                   Mark for Review
                 </Button>
              </div>

              {/* Question Content */}
              <div className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-relaxed mb-8">
                {currentQuestion.imageUrl && (currentQuestion.imagePosition === "top" || !currentQuestion.imagePosition) && (
                  <img src={getFullImageUrl(currentQuestion.imageUrl)} className="mb-6 rounded-xl border border-slate-200 dark:border-slate-700 max-h-64 object-contain" />
                )}
                {currentQuestion.imageUrl && currentQuestion.imagePosition === "left" && (
                  <img src={getFullImageUrl(currentQuestion.imageUrl)} className="float-left mr-6 mb-4 rounded-xl border border-slate-200 dark:border-slate-700 max-h-48 object-contain" />
                )}
                
                {/* Using renderInlinePrompt for inline blanks */}
                {renderInlinePrompt(currentQuestion)}

                {currentQuestion.imageUrl && currentQuestion.imagePosition === "right" && (
                  <img src={getFullImageUrl(currentQuestion.imageUrl)} className="float-right ml-6 mb-4 rounded-xl border border-slate-200 dark:border-slate-700 max-h-48 object-contain" />
                )}
                {currentQuestion.imageUrl && currentQuestion.imagePosition === "bottom" && (
                  <img src={getFullImageUrl(currentQuestion.imageUrl)} className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700 max-h-64 object-contain" />
                )}
              </div>

              {/* Options for MCQ */}
              {Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 && currentQuestion.qtype !== "matching" && currentQuestion.qtype !== "headings" && (
                <div className="space-y-3 mt-auto">
                  {currentQuestion.options.map((optObj, idx) => {
                    const letter = ["A", "B", "C", "D", "E", "F", "G", "H"][idx] ?? String(idx + 1);
                    const isSelected = answers[currentQuestion.id] === optObj.text;
                    return (
                      <button
                        key={optObj.id || idx}
                        onClick={() => onAnswer(currentQuestion.id, optObj.text)}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border-2 flex items-center gap-4 transition-all hover:scale-[1.01] active:scale-[0.99]",
                          isSelected 
                            ? "border-blue-600 bg-blue-50 dark:bg-blue-600/10 shadow-md shadow-blue-500/10"
                            : "border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50 bg-white dark:bg-slate-800"
                        )}
                      >
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-colors",
                          isSelected ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                        )}>
                          {letter}
                        </div>
                        <span className={cn("text-base md:text-lg font-medium", isSelected ? "text-blue-900 dark:text-blue-100" : "text-slate-700 dark:text-slate-300")}>
                          {optObj.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* TFNG / YNNG Options */}
              {(currentQuestion.qtype === "tfng" || currentQuestion.qtype === "ynng") && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-auto">
                  {(currentQuestion.qtype === "tfng" ? ["TRUE", "FALSE", "NOT GIVEN"] : ["YES", "NO", "NOT GIVEN"]).map((v) => {
                    const isSelected = answers[currentQuestion.id] === v;
                    return (
                      <button
                        key={v}
                        onClick={() => onAnswer(currentQuestion.id, v)}
                        className={cn(
                          "p-6 rounded-xl border-2 font-black tracking-widest text-sm transition-all active:scale-95",
                          isSelected
                            ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:border-blue-300"
                        )}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Matching Dropdown */}
              {(currentQuestion.qtype === "matching" || currentQuestion.qtype === "headings") && Array.isArray(currentQuestion.options) && (
                <div className="mt-auto">
                  <select
                    className="w-full p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg font-bold focus:border-blue-500 focus:ring-0 outline-none"
                    value={answers[currentQuestion.id] ?? ""}
                    onChange={(e) => onAnswer(currentQuestion.id, e.target.value)}
                  >
                    <option value="">— Select an Option —</option>
                    {currentQuestion.options.map((o) => <option key={o.id || o.text} value={o.text}>{o.text}</option>)}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">Loading question...</div>
          )}

          {/* BOTTOM NAVIGATION BAR */}
          <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 md:p-6 shrink-0 flex items-center justify-between">
            <Button 
              size="lg" 
              variant="outline" 
              className="h-12 px-6 font-bold"
              disabled={activeQuestionIndex === 0}
              onClick={() => setActiveQuestionIndex(i => i - 1)}
            >
              <ArrowLeft className="w-5 h-5 mr-2" /> Previous
            </Button>
            
            <div className="hidden md:flex xl:hidden items-center gap-1 overflow-x-auto max-w-[40%] no-scrollbar px-4">
               {questions.map((q, idx) => {
                 const isActive = activeQuestionIndex === idx;
                 const hasAns = !!answers[q.id];
                 const isFlg = flagged.has(q.id);
                 return (
                   <button
                     key={q.id}
                     onClick={() => setActiveQuestionIndex(idx)}
                     className={cn(
                       "h-8 w-8 rounded flex items-center justify-center text-[10px] font-black shrink-0 transition-all",
                       isActive ? "border-2 border-blue-600 bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 scale-110" 
                         : hasAns ? "bg-emerald-500 text-white" 
                         : isFlg ? "bg-amber-500 text-white" 
                         : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                     )}
                   >
                     {q.position}
                   </button>
                 );
               })}
            </div>

            {activeQuestionIndex === questions.length - 1 ? (
              <Button size="lg" className="h-12 px-8 font-bold bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowReviewScreen(true)}>
                Review <Grid className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <Button size="lg" className="h-12 px-6 font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100" onClick={() => setActiveQuestionIndex(i => i + 1)}>
                Next <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* STATUS SIDEBAR (Desktop) */}
        <div className="hidden xl:flex flex-col w-[320px] shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-full p-6">
            <h3 className="font-bold text-slate-800 dark:text-white mb-6 uppercase tracking-widest text-xs flex items-center gap-2"><Target className="w-4 h-4 text-blue-600" /> Exam Status</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Answered</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{answeredCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Remaining</span>
                <span className="font-bold text-slate-900 dark:text-white">{questions.length - answeredCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Flagged</span>
                <span className="font-bold text-amber-500">{flaggedCount}</span>
              </div>
              
              <div className="pt-2">
                 <div className="flex justify-between text-xs font-bold mb-2">
                   <span className="text-slate-500">Completion</span>
                   <span className="text-blue-600">{Math.round((answeredCount/questions.length)*100)}%</span>
                 </div>
                 <Progress value={(answeredCount/questions.length)*100} className="h-2 bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2">
               <div className="grid grid-cols-5 gap-2">
                 {questions.map((q, idx) => {
                   const isActive = activeQuestionIndex === idx;
                   const hasAns = !!answers[q.id];
                   const isFlg = flagged.has(q.id);
                   return (
                     <button
                       key={q.id}
                       onClick={() => setActiveQuestionIndex(idx)}
                       className={cn(
                         "aspect-square rounded flex items-center justify-center text-xs font-black transition-all border",
                         isActive ? "border-blue-600 bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 scale-110 shadow-md" 
                           : hasAns ? "bg-emerald-500 border-emerald-500 text-white" 
                           : isFlg ? "bg-amber-500 border-amber-500 text-white" 
                           : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-300"
                       )}
                     >
                       {q.position}
                     </button>
                   );
                 })}
               </div>
            </div>
        </div>
      </main>

      {/* ⚠️ NAVIGATION GUARD ALERT */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-purple-500" />
              {t("dynamic.mocktake.testni_topshirmoqchimisiz")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-2 space-y-1">
              <span className="block">{t("dynamic.mocktake.javob_berilgan_savollar")}<strong className="text-slate-700 dark:text-slate-200">{Object.keys(answers).length}</strong> / {questions.length}</span>
              {questions.length - Object.keys(answers).length > 0 && (
                <span className="block text-amber-600 dark:text-amber-400 font-semibold">
                  ⚠️ {questions.length - Object.keys(answers).length} ta savol javobsiz qolmoqda
                </span>
              )}
              <span className="block pt-1">{t("dynamic.mocktake.testni_topshirgandan_keyin_javoblarni_o_")}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-2">
            <AlertDialogCancel className="rounded-xl font-bold">{t("dynamic.pricingplans.bekor_qilish")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => submit(false)}
              disabled={submitting}
              className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl px-6"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2 inline" /> : null}
              {t("dynamic.mocktake.topshirish")} ✓
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 🧮 FLOATING DESMOS CALCULATOR */}
      <AnimatePresence>
        {showCalculator && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-4 md:right-8 w-[90vw] md:w-[600px] h-[600px] max-h-[70vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 z-50 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950 shrink-0 cursor-move">
              <span className="font-bold text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300"><Calculator className="h-4 w-4 text-purple-500" />{t("dynamic.mocktake.desmos_graphing_calculator")}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full hover:bg-slate-200 dark:hover:bg-white/10" onClick={() => setShowCalculator(false)}><X className="h-4 w-4 text-slate-500" /></Button>
            </div>
            <div className="flex-1 w-full bg-white relative">
              <iframe src="https://www.desmos.com/calculator" width="100%" height="100%" style={{ border: 0 }}></iframe>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Scratchpad isOpen={showScratchpad} onClose={() => setShowScratchpad(false)} />

    </div>
  );
}