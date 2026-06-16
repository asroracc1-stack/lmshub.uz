import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
  Shield, Grid, CheckSquare, Menu, ArrowRight, ArrowLeft, Bookmark, GripHorizontal
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { rawToBand, checkAnswer, satScore, milliyScore, scoreLevel } from "@/lib/ielts";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Scratchpad from "@/components/Scratchpad";
import TigerPlayer from "@/components/TigerPlayer";
import { useTheme } from "@/contexts/ThemeContext";
import { DotLottiePlayer } from "@dotlottie/react-player";
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

function DesmosCalculator({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [size, setSize] = useState({ w: 550, h: 420 });
  const resizing = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0, w: 550, h: 420 });

  useEffect(() => {
    const updateSizeForScreen = () => {
      if (window.innerWidth < 640) {
        setSize({
          w: Math.min(550, window.innerWidth - 24),
          h: Math.min(420, window.innerHeight - 140),
        });
      } else {
        setSize({ w: 550, h: 420 });
      }
    };
    updateSizeForScreen();
    window.addEventListener("resize", updateSizeForScreen);
    return () => window.removeEventListener("resize", updateSizeForScreen);
  }, []);

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const maxW = window.innerWidth - 24;
      const maxH = window.innerHeight - 140;
      setSize({
        w: Math.min(maxW, Math.max(300, resizeStart.current.w + ev.clientX - resizeStart.current.x)),
        h: Math.min(maxH, Math.max(250, resizeStart.current.h + ev.clientY - resizeStart.current.y)),
      });
    };
    const onUp = () => {
      resizing.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [size]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          style={{ width: size.w, height: size.h }}
          className="fixed bottom-20 right-3 sm:right-4 md:right-8 bg-white/97 dark:bg-slate-900/97 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.3)] border border-slate-200/80 dark:border-white/10 z-50 overflow-hidden flex flex-col select-none max-w-[calc(100vw-24px)] max-h-[calc(100vh-120px)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-white/5 bg-slate-50/60 dark:bg-slate-950/60 shrink-0">
            <span className="font-bold text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Calculator className="h-4 w-4 text-purple-500" /> Desmos Kalkulyator
            </span>
            <div className="flex items-center gap-1.5">
              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full hover:bg-slate-200 dark:hover:bg-white/10" onClick={onClose} title={t("dynamic.syllabus.yopish")}>
                <X className="h-3.5 w-3.5 text-slate-500" />
              </Button>
            </div>
          </div>

          {/* Iframe */}
          <div className="flex-1 relative overflow-hidden bg-white dark:bg-[#070b19]/60">
            <iframe
              src="https://www.desmos.com/calculator"
              title={t("dynamic.mocktake.desmos_graphing_calculator")}
              className="absolute inset-0 w-full h-full border-0 select-text"
              allow="clipboard-write"
            />
          </div>

          {/* Resize handle */}
          <div
            onMouseDown={onResizeMouseDown}
            className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize flex items-end justify-end pb-1.5 pr-1.5 group z-10"
            title="Kengaytirish"
          >
            <GripHorizontal className="h-4 w-4 text-slate-300 dark:text-slate-600 rotate-45 group-hover:text-purple-500 transition-colors" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

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
  
  const [cheatingStrikes, setCheatingStrikes] = useState(0);
  const [showCheatingWarning, setShowCheatingWarning] = useState(false);
  const [showCheatingLocked, setShowCheatingLocked] = useState(false);
  
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

  // Anti-Cheat focus/visibility listeners
  useEffect(() => {
    if (!started || result || isPaused || showSuccessAnimation || showCheatingLocked) return;

    const handleCheating = () => {
      if (showCheatingWarning) return;

      setCheatingStrikes((prev) => {
        const next = prev + 1;
        if (next === 1) {
          setShowCheatingWarning(true);
        } else if (next >= 2) {
          setShowCheatingLocked(true);
          submit(true);
        }
        return next;
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleCheating();
      }
    };

    const handleWindowBlur = () => {
      setTimeout(() => {
        if (document.activeElement && document.activeElement.tagName === "IFRAME") {
          return;
        }
        handleCheating();
      }, 100);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [started, result, isPaused, showSuccessAnimation, showCheatingWarning, showCheatingLocked]);
  
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
      const utterance = new SpeechSynthesisUtterance("Your test has been successfully completed.");
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("SpeechSynthesis error:", e);
    }

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
      <div className="fixed inset-0 z-[9999] bg-[#080410] flex items-center justify-center p-4 overflow-hidden">
        {/* Glow Backgrounds */}
        <div className="absolute top-1/4 left-1/4 h-[350px] w-[350px] rounded-full bg-blue-600/10 blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-[350px] w-[350px] rounded-full bg-purple-600/10 blur-[100px] animate-pulse" />

        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-white/5 dark:bg-[#140D23]/60 backdrop-blur-2xl p-10 text-center shadow-2xl shadow-purple-950/20"
        >
          {/* Top light beam */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[200px] h-[100px] bg-gradient-to-b from-blue-500/20 to-transparent blur-xl" />

          {/* Lottie Animation Container */}
          <div className="relative mx-auto mb-8 flex h-44 w-44 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-white/5 shadow-inner">
            {/* Glow ring */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 blur-md animate-pulse" />
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 4,
                ease: "easeInOut"
              }}
              className="z-10 w-36 h-36"
            >
              <DotLottiePlayer
                src="https://lottie.host/05a8da46-bffb-4416-a160-0b16adbce445/CxzFkSjThh.lottie"
                autoplay
                loop
                className="w-full h-full"
              />
            </motion.div>
          </div>

          {/* Status Text */}
          <motion.h3 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-display text-2xl font-black tracking-tight text-white mb-3"
          >
            Imtihon yakunlandi! 🎉
          </motion.h3>

          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-slate-300 leading-relaxed max-w-[280px] mx-auto mb-8 font-medium"
          >
            Javoblaringiz muvaffaqiyatli qabul qilindi. Natijalar tahlil qilinmoqda, iltimos oynani yopmang...
          </motion.p>

          {/* Premium Progress / Loader Dots */}
          <div className="flex flex-col items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 animate-pulse">
              Javoblar yuborilmoqda
            </span>
            <div className="flex gap-2 justify-center">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    scale: [1, 1.4, 1], 
                    opacity: [0.4, 1, 0.4],
                    backgroundColor: ["#3b82f6", "#a855f7", "#3b82f6"]
                  }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                  className="h-2 w-2 rounded-full"
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (result) {
    return <ExamResultDashboard result={result} questions={questions} exam={exam} />;
  }

  if (!started) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#f4f4f4] dark:bg-[#0c0817] font-sans selection:bg-blue-200 transition-colors">
        <div className="w-full max-w-4xl bg-white dark:bg-[#140D23] border border-slate-300 dark:border-slate-800 shadow-xl rounded-none transition-colors">
          <div className="bg-[#0f2c59] dark:bg-[#0b1e3b] p-6 flex items-center justify-between">
            <h1 className="text-xl font-bold text-white tracking-widest uppercase">Official Examination Portal</h1>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/10 rounded-none h-9 w-9" 
                onClick={toggle}
                title={theme === "dark" ? "Light Mode" : "Dark Mode"}
              >
                {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-300" />}
              </Button>
              <Badge variant="outline" className="bg-transparent text-white border-white/30 rounded-none uppercase text-[10px] tracking-widest">{exam.type}</Badge>
            </div>
          </div>
          <div className="p-10 space-y-8">
            <div className="border-b-2 border-slate-200 dark:border-slate-800 pb-4">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{exam.title}</h2>
              {exam.description && <p className="text-slate-600 dark:text-slate-400 mt-2">{exam.description}</p>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-slate-300 dark:border-slate-800">
              <div className="p-6 bg-slate-50 dark:bg-slate-900/10 border-r border-slate-300 dark:border-slate-800 flex flex-col gap-1">
                <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest">Time Allotted</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{exam.duration_minutes} minutes</span>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-900/10 flex flex-col gap-1">
                <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest">Total Items</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{questions.length}</span>
              </div>
            </div>
            
            <div className="p-6 border-l-4 border-[#0f2c59] dark:border-blue-500 bg-[#f8fafc] dark:bg-slate-900/40 text-sm text-slate-800 dark:text-slate-200 space-y-4 font-medium">
              <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2 text-slate-950 dark:text-white"><AlertCircle className="h-4 w-4" /> Non-Disclosure Agreement & Rules</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>By starting this exam, you agree to maintaining strict confidentiality of all test materials.</li>
                <li>No external aids, materials, or devices are permitted.</li>
                <li>Your session is actively monitored. Navigating away from this window may result in score invalidation.</li>
                <li>Use standard keyboard keys (A, B, C, D) for answering. Left/Right arrows for navigation.</li>
              </ul>
            </div>
          </div>
          <div className="bg-slate-100 dark:bg-[#0c0817]/60 p-6 border-t border-slate-300 dark:border-slate-800 flex justify-center">
            <Button size="lg" className="bg-[#0f2c59] dark:bg-blue-600 hover:bg-[#1a365d] dark:hover:bg-blue-700 text-white font-bold px-10 rounded-none h-12 uppercase tracking-widest text-sm" onClick={() => { setStarted(true); startedAt.current = Date.now(); }}>
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
      <div className="min-h-screen w-full bg-[#f4f4f4] dark:bg-[#0c0817] flex flex-col items-center justify-center p-4 md:p-8 font-sans selection:bg-blue-200 transition-colors">
        <div className="w-full max-w-5xl bg-white dark:bg-[#140D23] border border-slate-300 dark:border-slate-800 shadow-xl rounded-none transition-colors">
          <div className="bg-[#0f2c59] dark:bg-[#0b1e3b] p-6 text-white flex justify-between items-center">
            <h2 className="text-xl font-bold uppercase tracking-widest">Section Review</h2>
            <div className="font-mono text-xl font-bold tracking-widest bg-white/10 dark:bg-white/5 px-4 py-1 border border-white/20 dark:border-white/10">
              {fmt(timeLeft)}
            </div>
          </div>
          
          <div className="p-8">
            <div className="flex items-center gap-8 mb-8 border-b-2 border-slate-200 dark:border-slate-800 pb-6">
              <div className="text-center">
                <span className="block text-3xl font-bold text-[#166534] dark:text-[#22c55e]">{answeredCount}</span>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest">Answered</span>
              </div>
              <div className="text-center">
                <span className="block text-3xl font-bold text-[#ca8a04] dark:text-[#eab308]">{flaggedCount}</span>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest">Marked</span>
              </div>
              <div className="text-center">
                <span className="block text-3xl font-bold text-[#991b1b] dark:text-[#ef4444]">{questions.length - answeredCount}</span>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest">Incomplete</span>
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
                      hasAns && !isFlg ? "bg-white dark:bg-[#0f2c59]/20 border-[#166534] dark:border-[#22c55e] text-[#166534] dark:text-[#22c55e] border-2" 
                      : isFlg ? "bg-white dark:bg-[#ca8a04]/20 border-[#ca8a04] dark:border-[#eab308] text-[#ca8a04] dark:text-[#eab308] border-2"
                      : "bg-[#f8fafc] dark:bg-slate-900/50 border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400"
                    )}
                  >
                    {q.position}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between items-stretch sm:items-center bg-slate-100 dark:bg-[#140D23]/60 p-4 sm:p-6 border-t border-slate-300 dark:border-slate-800">
            <Button 
              variant="outline" 
              size="lg" 
              className="rounded-none border-2 border-slate-800 dark:border-slate-700 font-bold uppercase tracking-widest text-xs w-full sm:w-auto justify-center text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900" 
              onClick={() => setShowReviewScreen(false)}
            >
              <ChevronLeft className="w-4 h-4 mr-2" /> Return
            </Button>
            <Button 
              size="lg" 
              className="bg-[#0f2c59] hover:bg-[#1a365d] text-white font-bold px-4 sm:px-10 rounded-none text-xs uppercase tracking-widest w-full sm:w-auto justify-center" 
              onClick={() => submit(false)}
            >
              Submit Final Responses
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white dark:bg-[#080410] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-200 transition-colors">
      
      {/* EXAM COMMAND CENTER HEADER - Official Blue Bar */}
      <header className="h-[60px] shrink-0 bg-[#0f2c59] dark:bg-[#0b1e3b] text-white flex items-center justify-between px-6 z-40 border-b border-[#0f2c59] dark:border-[#0b1e3b] transition-colors">
        <div className="flex items-center gap-4 min-w-0">
           <h1 className="font-bold text-sm uppercase tracking-widest truncate max-w-[150px] sm:max-w-none">{exam.title}</h1>
           <span className="text-[10px] bg-white/10 px-2 py-0.5 border border-white/20 uppercase tracking-widest shrink-0">{exam.type}</span>
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
           <Button 
             variant="ghost" 
             size="icon" 
             className="rounded-none hover:bg-white/10" 
             onClick={toggle}
             title={theme === "dark" ? "Light Mode" : "Dark Mode"}
           >
             {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-300" />}
           </Button>
           <Button variant="ghost" size="icon" className="rounded-none hover:bg-white/10" onClick={toggleFullscreen}>
             {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
           </Button>
           <Button variant="ghost" size="icon" className="rounded-none hover:bg-white/10" onClick={() => setShowCalculator(!showCalculator)}>
             <Calculator className="h-4 w-4" />
           </Button>
        </div>
      </header>

      {/* QUESTION AREA */}
      <main className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden bg-[#f4f4f4] dark:bg-[#0c0817] transition-colors">
        {isReading && sections[currentQuestion?.section_index] && (sections[currentQuestion?.section_index].passage || sections[currentQuestion?.section_index].imageUrl) && (
          <div className="w-full md:w-1/2 h-1/2 md:h-full overflow-y-auto border-b md:border-b-0 md:border-r border-slate-300 dark:border-slate-800 p-6 md:p-8 xl:p-12 bg-white dark:bg-[#140D23] transition-colors">
            <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white uppercase tracking-widest border-b-2 border-slate-800 dark:border-slate-700 pb-2">{sections[currentQuestion.section_index].title}</h2>
            {sections[currentQuestion.section_index].imageUrl && (
              <img src={getFullImageUrl(sections[currentQuestion.section_index].imageUrl)} className="max-w-full border border-slate-300 dark:border-slate-800 mb-6" />
            )}
            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 font-serif leading-loose text-lg whitespace-pre-wrap">
              {sections[currentQuestion.section_index].passage}
            </div>
          </div>
        )}

        <div className={cn("overflow-y-auto flex flex-col p-6 md:p-8 xl:p-12 bg-white dark:bg-[#140D23] transition-colors", isReading ? "w-full md:w-1/2 h-1/2 md:h-full" : "w-full h-full max-w-5xl mx-auto border-x border-slate-300 dark:border-slate-800")}>
          
          <div className="w-full flex-1 flex flex-col">
            {currentQuestion && (
              <div key={currentQuestion.id} className="w-full">
                
                {/* QUESTION HEADER */}
                <div className="flex items-center justify-between border-b-2 border-[#0f2c59] dark:border-blue-500 pb-4 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-[#0f2c59] dark:bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                      {currentQuestion.position}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#0f2c59] dark:text-blue-400">
                      Item {currentQuestion.position} of {questions.length}
                    </span>
                  </div>
                  <button 
                    className={cn(
                      "flex items-center text-xs font-bold uppercase tracking-widest px-3 py-1.5 border-2 transition-colors", 
                      flagged.has(currentQuestion.id) ? "border-[#ca8a04] text-[#ca8a04]" : "border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-500 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                    onClick={() => toggleFlag(currentQuestion.id)}
                  >
                    <Bookmark className={cn("w-3 h-3 mr-2", flagged.has(currentQuestion.id) ? "fill-current" : "")} /> 
                    {flagged.has(currentQuestion.id) ? "Marked" : "Mark"}
                  </button>
                </div>

                {/* PROMPT */}
                <div className="text-xl md:text-2xl font-serif leading-relaxed text-slate-900 dark:text-white mb-8">
                  {currentQuestion.prompt}
                </div>

                {/* MEDIA */}
                {currentQuestion.imageUrl && (
                  <img src={getFullImageUrl(currentQuestion.imageUrl)} className="max-w-full border border-slate-300 dark:border-slate-800 mb-8" />
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
                              ? "border-[#0f2c59] dark:border-blue-500 bg-[#f0f4f8] dark:bg-blue-950/20" 
                              : "border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-[#0f2c59] dark:hover:border-blue-500"
                          )}
                        >
                          <div className={cn(
                            "h-6 w-6 border-2 flex items-center justify-center font-bold text-xs shrink-0 rounded-full",
                            isSelected 
                              ? "border-[#0f2c59] dark:border-blue-500 bg-[#0f2c59] dark:bg-blue-500 text-white" 
                              : "border-slate-400 dark:border-slate-600 text-slate-600 dark:text-slate-400 group-hover:border-[#0f2c59] dark:group-hover:border-blue-500 group-hover:text-[#0f2c59] dark:group-hover:text-blue-400"
                          )}>
                            {labels[oIdx]}
                          </div>
                          <div className="flex-1">
                            {opt.imageUrl && <img src={getFullImageUrl(opt.imageUrl)} className="h-16 object-contain mb-2 border border-slate-200 dark:border-slate-800" />}
                            <span className="text-lg font-serif text-slate-800 dark:text-slate-200">
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
                      className="w-full p-4 text-lg font-serif rounded-none border-2 border-slate-300 dark:border-slate-800 focus:border-[#0f2c59] dark:focus:border-blue-500 resize-none bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white"
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
      <footer className="h-[70px] bg-slate-100 dark:bg-[#140D23] border-t border-slate-300 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 z-40 transition-colors">
        
        <div className="flex items-center gap-2 sm:gap-4 w-1/2 sm:w-1/4">
          <Button 
            size="lg" 
            variant="outline" 
            onClick={() => setActiveQuestionIndex(Math.max(0, activeQuestionIndex - 1))}
            disabled={activeQuestionIndex === 0}
            className="rounded-none border-2 border-slate-400 dark:border-slate-700 font-bold text-xs uppercase tracking-widest text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900"
          >
            <ChevronLeft className="w-4 h-4 mr-1 sm:mr-2" /> Back
          </Button>
        </div>

        <div className="hidden md:flex flex-1 justify-center items-center gap-8 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          <span className="text-[#166534] dark:text-[#22c55e]">Answered: {answeredCount}</span>
          <span className="text-[#ca8a04] dark:text-[#eab308]">Marked: {flaggedCount}</span>
          <span className="text-slate-800 dark:text-slate-300">Unanswered: {questions.length - answeredCount}</span>
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-4 w-1/2 sm:w-1/4">
          <Button 
            size="lg" 
            onClick={() => {
              if (activeQuestionIndex === questions.length - 1) {
                handleSubmitRequest();
              } else {
                setActiveQuestionIndex(Math.min(questions.length - 1, activeQuestionIndex + 1));
              }
            }}
            className="rounded-none font-bold text-xs uppercase tracking-widest bg-[#0f2c59] dark:bg-blue-600 hover:bg-[#1a365d] dark:hover:bg-blue-700 text-white border-2 border-[#0f2c59] dark:border-blue-600"
          >
            {activeQuestionIndex === questions.length - 1 ? "End Section" : "Next"} <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

      </footer>

      {showScratchpad && <Scratchpad onClose={() => setShowScratchpad(false)} />}
      <DesmosCalculator isOpen={showCalculator} onClose={() => setShowCalculator(false)} />

      {/* Cheating Warning Modal */}
      <AlertDialog open={showCheatingWarning} onOpenChange={setShowCheatingWarning}>
        <AlertDialogContent className="rounded-3xl border border-amber-500/30 bg-[#160E26]/95 text-white backdrop-blur-md max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-extrabold text-amber-400 flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-amber-500 animate-bounce" /> Ogohlantirish!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300 mt-2 text-sm leading-relaxed">
              Siz imtihon oynasini tark etdingiz (Alt-Tab yoki boshqa ilovaga o'tish). Imtihon oynasini yana bir marta tark etsangiz, javoblaringiz avtomatik ravishda yuboriladi va imtihon yakunlanadi!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogAction
              onClick={() => setShowCheatingWarning(false)}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl py-2 w-full border-none shadow-lg shadow-amber-500/20"
            >
              Tushundim, imtihonni davom ettiraman
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cheating Locked Modal */}
      <AnimatePresence>
        {showCheatingLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md rounded-3xl border border-rose-500/30 bg-[#160E26] p-8 text-center shadow-2xl shadow-rose-500/10"
            >
              <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/15">
                <Shield className="h-10 w-10 text-rose-500" />
              </div>
              <h3 className="text-2xl font-black tracking-tight text-white">
                Imtihon Bloklandi! 🔒
              </h3>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                Tizim qoidalariga ko'ra, imtihon oynasini ikki marta tark etganingiz sababli imtihoningiz bloklandi va javoblaringiz avtomatik ravishda saqlab topshirildi.
              </p>
              <div className="mt-6 p-3 rounded-xl bg-rose-500/10 text-xs font-bold text-rose-400 border border-rose-500/20">
                Imtihon faoliyati shubhali deb baholandi
              </div>
              <div className="mt-8">
                <Button
                  onClick={() => {
                    if (result) {
                      setShowCheatingLocked(false);
                    } else {
                      toast.info("Tizim javoblarni yuklamoqda, kuting...");
                    }
                  }}
                  disabled={!result}
                  className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-bold text-base rounded-xl transition-all border-none"
                >
                  Natijani ko'rish
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
