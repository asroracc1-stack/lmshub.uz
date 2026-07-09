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
  Shield, Grid, CheckSquare, Menu, ArrowRight, ArrowLeft, Bookmark, GripHorizontal,
  BarChart3, Bell, ChevronsLeftRight
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
import { formatMathText } from "@/lib/math";

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

function hashStringToInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

function deterministicShuffle<T>(array: T[], seedStr: string): T[] {
  const seed = hashStringToInt(seedStr);
  const rand = mulberry32(seed);
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function normalize(exam: ExamData, attemptSeed?: string | null): { sections: { title: string; passage: string; imageUrl: string }[]; questions: NormalQ[] } {
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

  const passagesToUse = attemptSeed && rawPassages.length > 0
    ? deterministicShuffle(rawPassages, attemptSeed)
    : rawPassages;

  if (passagesToUse.length > 0) {
    passagesToUse.forEach((p, sIdx) => {
      sections.push({ title: p.title ?? "", passage: p.content ?? "", imageUrl: p.imageUrl ?? p.image_url ?? "" });
      
      const rawQuestions = p.questions ?? [];
      const questionsToUse = attemptSeed
        ? deterministicShuffle(rawQuestions, attemptSeed + "_" + (p.id || sIdx))
        : rawQuestions;

      questionsToUse.forEach((q) => {
        const qtype = mapQtype(q.questionType ?? q.question_type);
        let rawOpts = q.options && q.options.length > 0
          ? q.options.map(o => ({
              id: o.id,
              text: o.text,
              isCorrect: o.isCorrect ?? o.is_correct ?? false,
              positionOrder: o.positionOrder ?? o.position_order ?? 0,
              imageUrl: o.imageUrl ?? o.image_url,
              imagePosition: o.imagePosition ?? o.image_position ?? "left"
            })).sort((a, b) => a.positionOrder - b.positionOrder)
          : null;

        if (attemptSeed && rawOpts && rawOpts.length > 0) {
          rawOpts = deterministicShuffle(rawOpts, q.id + attemptSeed);
        }

        questions.push({
          id: q.id,
          position: questions.length + 1,
          section_index: sections.length - 1,
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
  } else {
    const rawRootQuestions = (exam as any).questions ?? [];
    const questionsToUse = attemptSeed
      ? deterministicShuffle(rawRootQuestions, attemptSeed)
      : rawRootQuestions;

    if (questionsToUse.length > 0) {
      sections.push({ title: exam.title ?? "Section 1", passage: "", imageUrl: "" });
      questionsToUse.forEach((q) => {
        const qtype = mapQtype(q.questionType ?? q.question_type);
        let rawOpts = q.options && q.options.length > 0
          ? q.options.map(o => ({
              id: o.id,
              text: o.text,
              isCorrect: o.isCorrect ?? o.is_correct ?? false,
              positionOrder: o.positionOrder ?? o.position_order ?? 0,
              imageUrl: o.imageUrl ?? o.image_url,
              imagePosition: o.imagePosition ?? o.image_position ?? "left"
            })).sort((a, b) => a.positionOrder - b.positionOrder)
          : null;

        if (attemptSeed && rawOpts && rawOpts.length > 0) {
          rawOpts = deterministicShuffle(rawOpts, q.id + attemptSeed);
        }

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
  const [searchParams, setSearchParams] = useSearchParams();
  const isReviewMode = searchParams.get("review") === "true";
  const attemptId = searchParams.get("attemptId");

  const [exam, setExam] = useState<ExamData | null>(null);
  const isMilliy = exam?.type ? (exam.type.toLowerCase() === "national_cert" || exam.type.toLowerCase() === "milliy") : false;
  const isSat = exam?.type ? (exam.type.toLowerCase() === "sat") : false;
  const kind = (exam?.type ?? "").toLowerCase();
  
  const isIeltsLayout = useMemo(() => {
    if (!exam?.type) return false;
    if (isMilliy || isSat) return false;
    const lowerType = exam.type.toLowerCase();
    return lowerType.includes("reading") || lowerType.includes("listening") || lowerType.includes("writing") || lowerType.includes("ielts");
  }, [exam, isMilliy, isSat]);

  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [optionsPanel, setOptionsPanel] = useState<"main" | "contrast" | "text-size">("main");
  const [ieltsContrast, setIeltsContrast] = useState<"black-on-white" | "white-on-black" | "yellow-on-black">("black-on-white");
  const [ieltsTextSize, setIeltsTextSize] = useState<"regular" | "large" | "extra-large">("regular");

  const [sections, setSections] = useState<{ title: string; passage: string; imageUrl: string }[]>([]);
  const [questions, setQuestions] = useState<NormalQ[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [writingAnswer, setWritingAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const ieltsDetails = useMemo(() => {
    if (!result) return [];
    const rawDetails = result.detail || result.details || [];
    return rawDetails.map((d: any) => ({
      questionId: d.questionId || d.question_id || d.id,
      userAns: d.userAns !== undefined ? d.userAns : (d.user_ans !== undefined ? d.user_ans : ""),
      correctAns: d.correctAns !== undefined ? d.correctAns : (d.correct_ans !== undefined ? d.correct_ans : ""),
      ok: d.ok !== undefined ? d.ok : d.ok,
    }));
  }, [result]);
  const [sectionIdx, setSectionIdx] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [started, setStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [grading, setGrading] = useState(false);
  const [countdownNum, setCountdownNum] = useState<number | null>(null);

  const triggerStartWithCountdown = () => {
    setCountdownNum(3);
    const interval = setInterval(() => {
      setCountdownNum((prev) => {
        if (prev === null) {
          clearInterval(interval);
          return null;
        }
        if (prev <= 1) {
          clearInterval(interval);
          handleStartExam();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  const [cheatingStrikes, setCheatingStrikes] = useState(0);
  const [leftWidth, setLeftWidth] = useState(50);
  const isResizingRef = useRef(false);
  const [audioStarted, setAudioStarted] = useState(false);

  const startResizing = useCallback(() => {
    isResizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const percentage = (e.clientX / window.innerWidth) * 100;
      if (percentage > 20 && percentage < 80) {
        setLeftWidth(percentage);
      }
    };
    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = "default";
        document.body.style.userSelect = "auto";
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);
  const [showCheatingWarning, setShowCheatingWarning] = useState(false);
  const [showCheatingLocked, setShowCheatingLocked] = useState(false);
  
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successAnimPhase, setSuccessAnimPhase] = useState<'idle' | 'loading' | 'success'>('idle');

  const currentQuestion = questions[activeQuestionIndex];
  const isReading = kind === "reading";

  const wordCount = useMemo(() => {
    if (!currentQuestion) return 0;
    const text = answers[currentQuestion.id] || "";
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  }, [answers, currentQuestion]);

  // fmt moved to top-level to be accessible from all early-return blocks
  const fmt = (s: number) => {
    const total = Math.max(0, Math.round(s));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };
  
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

  const attemptSeed = searchParams.get("seed");

  const handleStartExam = async () => {
    if (!testId) return;
    try {
      setLoading(true);
      const resStart = await api.post(`/student/exams/${testId}/start`);
      const attempt = resStart.data;
      setSearchParams({ attemptId: attempt.id, seed: attempt.attemptSeed });
      setStarted(true);
      startedAt.current = Date.now();
      
      const resExam = await api.get<ExamData>(`/admin/exams/${testId}?t=${Date.now()}`);
      setExam(resExam.data);
      const { sections: s, questions: q } = normalize(resExam.data, attempt.attemptSeed);
      setSections(s);
      setQuestions(q);
      
      const startTimeMs = new Date(attempt.startedAt).getTime();
      const elapsedSec = Math.floor((Date.now() - startTimeMs) / 1000);
      const totalSec = (resExam.data.duration_minutes ?? resExam.data.durationMinutes ?? 60) * 60;
      setTimeLeft(Math.max(0, totalSec - elapsedSec));
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.response?.data || err?.message || "Failed to start exam";
      toast.error(typeof errMsg === "string" ? errMsg : "Failed to start exam");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!testId) return;
    setLoading(true);
    setLoadError(null);

    // If not review mode and not already started/resumed, check for active or completed attempt
    if (!isReviewMode && !attemptId) {
      api.get<any[]>('/student/exams/attempts')
        .then((resAttempts) => {
          const active = resAttempts.data.find(a => a.examId === testId && !a.finishedAt);
          if (active) {
            setSearchParams({ attemptId: active.id, seed: active.attemptSeed });
            setStarted(true);
          } else {
            const completed = resAttempts.data.find(a => a.examId === testId && a.finishedAt);
            if (completed) {
              setSearchParams({ attemptId: completed.id, review: "true" });
            }
          }
        })
        .catch(console.error);
    }

    api.get<ExamData>(`/admin/exams/${testId}?t=${Date.now()}`)
      .then((res) => {
        const data = res.data;
        setExam(data);
        const { sections: s, questions: q } = normalize(data, attemptSeed);
        setSections(s);
        setQuestions(q);

        if (attemptId) {
          api.get<any[]>('/student/exams/attempts')
            .then(resAttempts => {
              const att = resAttempts.data.find(a => a.id === attemptId);
              if (att && att.startedAt) {
                const startTimeMs = new Date(att.startedAt).getTime();
                const elapsedSec = Math.floor((Date.now() - startTimeMs) / 1000);
                const totalSec = (data.duration_minutes ?? data.durationMinutes ?? 60) * 60;
                setTimeLeft(Math.max(0, totalSec - elapsedSec));
              } else {
                setTimeLeft((data.duration_minutes ?? data.durationMinutes ?? 60) * 60);
              }
            })
            .catch(() => setTimeLeft((data.duration_minutes ?? data.durationMinutes ?? 60) * 60));
        } else {
          setTimeLeft((data.duration_minutes ?? data.durationMinutes ?? 60) * 60);
        }
        
        try {
          const saved = localStorage.getItem(`lmshub_exam_${testId}`);
          if (saved) {
            setAnswers(JSON.parse(saved));
            toast.info("Session restored", { duration: 3000 });
          }
        } catch { /* ignore */ }
        
        if (isReviewMode) {
          const url = attemptId 
            ? `/student/exams/attempts/${attemptId}/result`
            : `/student/exams/${testId}/result`;
          api.get(url)
            .then((resResult) => {
              const resultData = resResult.data;
              setResult(resultData);
              setStarted(true);
              const { sections: sRev, questions: qRev } = normalize(data, resultData.attemptSeed);
              setSections(sRev);
              setQuestions(qRev);
            })
            .catch(() => toast.error("Error loading result"));
        }
      })
      .catch((err) => {
        setLoadError(err?.response?.data?.message ?? err?.message ?? "Failed to load exam");
      })
      .finally(() => setLoading(false));
  }, [testId, isReviewMode, attemptId, attemptSeed]);

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

  // Scroll active question into view (IELTS layout only)
  useEffect(() => {
    if (!isIeltsLayout) return;
    const activeQ = questions[activeQuestionIndex];
    if (activeQ) {
      const el = questionRefs.current[activeQ.id];
      if (el) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }
    }
  }, [activeQuestionIndex, questions, isIeltsLayout]);
 
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
      toast.warning(t("cheating.warning", { defaultValue: "Cheating is not allowed" }));
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
        toast.error(t("cheating.tabSwitchWarning", { defaultValue: "Tab switching detected! Cheating is not allowed." }));
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

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.warning(t("cheating.warning", { defaultValue: "Cheating is not allowed" }) + ": " + t("cheating.copyDisabled", { defaultValue: "Copying question content is disabled." }));
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.warning(t("cheating.warning", { defaultValue: "Cheating is not allowed" }) + ": " + t("cheating.pasteDisabled", { defaultValue: "Pasting content is disabled." }));
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.warning(t("cheating.warning", { defaultValue: "Cheating is not allowed" }));
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [started, result, isPaused, showSuccessAnimation, showCheatingWarning, showCheatingLocked, t]);
  
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
    window.scrollTo(0,0);

    const isMilliyVal = exam?.type ? (exam.type.toLowerCase() === "national_cert" || exam.type.toLowerCase() === "milliy") : false;

    if (isMilliyVal) {
      setShowSuccessAnimation(true);
      setSuccessAnimPhase('loading');
    } else {
      setShowSuccessAnimation(true);
    }

    let apiResponseData: any = null;
    let apiError: any = null;
    const startTime = Date.now();

    // Call submit API
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
      apiResponseData = { ...res.data, kind, elapsedSec, timeSpent: timeSpentRef.current };
      try { localStorage.removeItem(`lmshub_exam_${testId}`); } catch { /* ignore */ }
    } catch (err: any) {
      console.error("Submission error:", err);
      apiError = err;
    }

    if (isMilliyVal) {
      // Milliy mock exam loader must run for at least 2.5 seconds
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 2500 - elapsedTime);

      setTimeout(() => {
        if (apiError) {
          toast.error("Error submitting exam: " + (apiError.response?.data?.message || apiError.message));
          setShowSuccessAnimation(false);
          setSuccessAnimPhase('idle');
          setSubmitting(false);
          return;
        }

        // Transition to success checkmark phase
        setSuccessAnimPhase('success');

        // Play congrats.mp3 sound automatically
        try {
          const audio = new Audio('/congrats.mp3');
          audio.play().catch(e => {
            console.log("Failed to play congrats.mp3, using warm synth fallback:", e);
            // warm synthesizer fallback chord (sine wave)
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const now = audioCtx.currentTime;
            const playTone = (freq: number, startTimeVal: number, duration: number, vol = 0.15) => {
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.type = "sine";
              osc.frequency.setValueAtTime(freq, startTimeVal);
              gain.gain.setValueAtTime(0, startTimeVal);
              gain.gain.linearRampToValueAtTime(vol, startTimeVal + 0.1);
              gain.gain.exponentialRampToValueAtTime(0.0001, startTimeVal + duration);
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.start(startTimeVal);
              osc.stop(startTimeVal + duration);
            };
            playTone(261.63, now, 2.0, 0.12);     // C4
            playTone(329.63, now + 0.05, 1.9, 0.10); // E4
            playTone(392.00, now + 0.10, 1.8, 0.10); // G4
            playTone(493.88, now + 0.15, 1.75, 0.08); // B4
            playTone(587.33, now + 0.20, 1.7, 0.06);  // D5
          });
        } catch (soundErr) {
          console.error("Audio trigger error:", soundErr);
        }

        // Redirect to results dashboard after 2.0 seconds of success checkmark
        setTimeout(() => {
          setResult(apiResponseData);
          setShowSuccessAnimation(false);
          setSuccessAnimPhase('idle');
          setSubmitting(false);
        }, 2000);

      }, remainingTime);

    } else {
      // Standard SAT completion logic
      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance("Your test has been successfully completed.");
          utterance.lang = "en-US";
          window.speechSynthesis.speak(utterance);
        }
      } catch (soundErr) {
        console.error(soundErr);
      }

      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, 3000 - elapsedTime);

      setTimeout(() => {
        if (apiError) {
          toast.error("Error submitting exam: " + (apiError.response?.data?.message || apiError.message));
          setShowSuccessAnimation(false);
          setSubmitting(false);
          return;
        }
        setResult(apiResponseData);
        setShowSuccessAnimation(false);
        setSubmitting(false);
      }, remainingTime);
    }
  };

  const handleSubmitRequest = () => {
    setShowReviewScreen(true);
  };

  if (countdownNum !== null) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#080410] text-white">
        <div className="absolute top-1/4 left-1/4 h-[350px] w-[350px] rounded-full blur-[100px] bg-purple-500/10 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full blur-[80px] bg-blue-500/10" />
        <AnimatePresence mode="wait">
          <motion.div
            key={countdownNum}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="font-display font-extrabold text-[120px] md:text-[180px] text-purple-500 selection:bg-transparent z-10"
          >
            {countdownNum}
          </motion.div>
        </AnimatePresence>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse z-10">
          Entering Simulation Mode...
        </p>
      </div>
    );
  }

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

  if (showSuccessAnimation) {
    const isMilliyVal = exam?.type ? (exam.type.toLowerCase() === "national_cert" || exam.type.toLowerCase() === "milliy") : false;

    if (isMilliyVal) {
      return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 bg-gradient-to-br from-white via-emerald-50/20 to-white dark:from-[#060b13] dark:via-[#09221a] dark:to-[#060b13] transition-colors duration-500">
          <div className="w-full max-w-md p-10 flex flex-col items-center justify-center text-center">
            {successAnimPhase === 'loading' ? (
              <>
                {/* Modern circular progress loader */}
                <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
                  <svg className="animate-spin h-20 w-20 text-[#16a34a] dark:text-[#22c55e]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-85" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <h3 className="font-sans text-xl font-bold text-slate-800 dark:text-slate-100 animate-pulse">
                  Natijalar tayyorlanmoqda....
                </h3>
              </>
            ) : (
              <>
                {/* Checkmark ✔ scale + fade effect animation */}
                <motion.div
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 16 }}
                  className="h-24 w-24 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border-4 border-[#16a34a] dark:border-[#22c55e] flex items-center justify-center text-[#16a34a] dark:text-[#22c55e] text-5xl font-extrabold shadow-lg shadow-emerald-500/10 mb-8"
                >
                  ✔
                </motion.div>
                <motion.h2 
                  initial={{ opacity: 0, y: 12 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.15, duration: 0.4 }} 
                  className="font-sans text-2xl font-extrabold text-slate-800 dark:text-slate-100 mb-2"
                >
                  Tabriklaymiz! Test muvaffaqiyatli yakunlandi.
                </motion.h2>
              </>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={cn("fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden", isMilliyVal ? "bg-[#050c18]" : "bg-[#080410]")}>
        {/* Glow Backgrounds */}
        <div className={cn("absolute top-1/4 left-1/4 h-[350px] w-[350px] rounded-full blur-[100px] animate-pulse", isMilliyVal ? "bg-emerald-650/10" : "bg-blue-600/10")} />
        <div className={cn("absolute bottom-1/4 right-1/4 h-[350px] w-[350px] rounded-full blur-[100px] animate-pulse", isMilliyVal ? "bg-amber-600/10" : "bg-purple-600/10")} />

        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          className={cn(
            "relative w-full max-w-md overflow-hidden rounded-[32px] border backdrop-blur-2xl p-10 text-center shadow-2xl",
            isMilliyVal 
              ? "border-emerald-550/20 bg-white/5 dark:bg-[#0b1624]/60 shadow-emerald-950/20" 
              : "border-white/10 bg-white/5 dark:bg-[#140D23]/60 shadow-purple-950/20"
          )}
        >
          {/* Top light beam */}
          <div className={cn("absolute -top-20 left-1/2 -translate-x-1/2 w-[200px] h-[100px] blur-xl", isMilliyVal ? "bg-gradient-to-b from-emerald-500/20 to-transparent" : "bg-gradient-to-b from-blue-500/20 to-transparent")} />

          {/* Lottie Animation Container */}
          <div className={cn(
            "relative mx-auto mb-8 flex h-44 w-44 items-center justify-center rounded-full border shadow-inner",
            isMilliyVal 
              ? "from-emerald-500/5 to-amber-500/5 border-emerald-550/10" 
              : "from-blue-500/5 to-purple-500/5 border-white/5"
          )}>
            {/* Glow ring */}
            <div className={cn("absolute inset-2 rounded-full blur-md animate-pulse", isMilliyVal ? "bg-gradient-to-br from-emerald-500/10 to-amber-500/10" : "bg-gradient-to-br from-blue-500/10 to-purple-500/10")} />
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
            {isMilliyVal ? "Imtihon yakunlandi! 🎉" : "Section Completed! 🎉"}
          </motion.h3>

          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-slate-300 leading-relaxed max-w-[280px] mx-auto mb-8 font-medium"
          >
            {isMilliyVal 
              ? "Javoblaringiz muvaffaqiyatli qabul qilindi. Natijalar tahlil qilinmoqda, iltimos oynani yopmang..." 
              : "Your responses have been successfully submitted. Analyzing your performance, please do not close this window..."}
          </motion.p>

          {/* Premium Progress / Loader Dots */}
          <div className="flex flex-col items-center gap-3">
            <span className={cn("text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse", isMilliyVal ? "text-emerald-400" : "text-blue-400")}>
              {isMilliyVal ? "Javoblar yuborilmoqda" : "Submitting Responses"}
            </span>
            <div className="flex gap-2 justify-center">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    scale: [1, 1.4, 1], 
                    opacity: [0.4, 1, 0.4],
                    backgroundColor: isMilliyVal ? ["#10b981", "#f59e0b", "#10b981"] : ["#3b82f6", "#a855f7", "#3b82f6"]
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
      <div className={cn("min-h-screen w-full flex flex-col items-center justify-center p-4 font-sans transition-colors", 
        isMilliy ? "bg-[#f1f5f9] dark:bg-[#060b13] selection:bg-emerald-200" : "bg-[#f4f4f4] dark:bg-[#0c0817] selection:bg-blue-200"
      )}>
        <div className={cn("w-full max-w-5xl bg-white border shadow-xl rounded-2xl overflow-hidden transition-colors", 
          isMilliy ? "dark:bg-[#0b1624] border-slate-200 dark:border-slate-800" : "dark:bg-[#140D23] border-slate-300 dark:border-slate-805"
        )}>
          <div className={cn("p-6 flex items-center justify-between transition-colors text-white", 
            isMilliy ? "bg-[#0a192f] border-b-2 border-[#10b981]" : "bg-[#0f2c59] dark:bg-[#0b1e3b]"
          )}>
            <h1 className="text-sm md:text-base font-bold tracking-widest uppercase">
              {isMilliy ? "BILIM VA MALAKALARNI BAHOLASH AGENTLIGI — IMTIHON PORTALI" : "LMSHub IELTS CBT Simulation Center"}
            </h1>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/10 rounded-none h-9 w-9" 
                onClick={toggle}
                title={theme === "dark" ? (isMilliy ? "Yorug' rejim" : "Light Mode") : (isMilliy ? "Qorong'u rejim" : "Dark Mode")}
              >
                {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-300" />}
              </Button>
              <Badge variant="outline" className="bg-transparent text-white border-white/30 rounded-none uppercase text-[10px] tracking-widest">{exam.type}</Badge>
            </div>
          </div>
          <div className={cn("p-8 md:p-10 bg-white transition-colors", 
            isMilliy ? "dark:bg-[#0b1624]" : "dark:bg-[#140D23]"
          )}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left rules section (2 cols) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="border-b-2 border-slate-200 dark:border-slate-800 pb-4">
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{exam.title}</h2>
                  {exam.description && <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm leading-relaxed">{exam.description}</p>}
                </div>
                
                <div className="grid grid-cols-2 gap-4 border border-slate-200 dark:border-slate-805 rounded-xl overflow-hidden shadow-sm">
                  <div className="p-5 border-r border-slate-200 dark:border-slate-800 flex flex-col gap-1 bg-slate-50/50 dark:bg-slate-900/10">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest">{isMilliy ? "Berilgan vaqt" : "Time Allotted"}</span>
                    <span className="text-xl font-bold text-slate-900 dark:text-white">{exam.duration_minutes} {isMilliy ? "daqiqa" : "minutes"}</span>
                  </div>
                  <div className="p-5 flex flex-col gap-1 bg-slate-50/50 dark:bg-slate-900/10">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest">{isMilliy ? "Jami savollar" : "Total Items"}</span>
                    <span className="text-xl font-bold text-slate-900 dark:text-white">{questions.length}</span>
                  </div>
                </div>

                <div className="p-6 border-l-4 rounded-r-2xl text-xs text-slate-800 dark:text-slate-300 space-y-3 font-medium bg-[#f8fafc] dark:bg-slate-900/40 border-[#0f2c59] dark:border-blue-500">
                  <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2 text-slate-955 dark:text-white">
                    <Shield className="h-4 w-4 text-purple-500 animate-pulse" />
                    {isMilliy ? "Imtihon qoidalari va o'tish shartlari" : "Non-Disclosure Agreement & Rules"}
                  </h3>
                  {isMilliy ? (
                    <ul className="list-disc pl-5 space-y-2 leading-relaxed">
                      <li>Ushbu imtihonni boshlash orqali siz test materiallarining maxfiyligini saqlashga rozilik bildirasiz.</li>
                      <li>Har qanday yordamchi ma'lumotlar, taqiqlangan kalkulyatorlar yoki boshqa elektron qurilmalardan foydalanish qat'iyan man etiladi.</li>
                      <li>Sessiyangiz to'liq nazorat qilinadi. Brauzer oynasini tark etish yoki boshqa sahifaga o'tish test natijalarining bekor bo'lishiga olib kelishi mumkin.</li>
                    </ul>
                  ) : (
                    <ul className="list-disc pl-5 space-y-2 leading-relaxed">
                      <li>By starting this exam, you agree to maintaining strict confidentiality of all test materials.</li>
                      <li>No external aids, materials, or devices are permitted.</li>
                      <li>Your session is actively monitored. Navigating away from this window may result in score invalidation.</li>
                      <li>Use standard keyboard keys (A, B, C, D) for answering. Left/Right arrows for navigation.</li>
                    </ul>
                  )}
                </div>
              </div>

              {/* Right System Check Section (1 col) */}
              <div className="space-y-4">
                <div className="p-6 bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
                  <h3 className="text-xs uppercase font-black text-slate-400 tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-emerald-500 animate-pulse" />
                    System diagnostics
                  </h3>
                  <div className="space-y-3.5">
                    {/* Internet Check */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><CheckSquare className="h-4 w-4" /></span>
                        <div>
                          <p className="font-bold text-slate-700 dark:text-slate-300">Internet Connection</p>
                          <p className="text-[10px] text-slate-400 font-bold">Stable (Ping: 14ms)</p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-bold uppercase text-[9px]">Online</Badge>
                    </div>

                    {/* Audio Check */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center"><Headphones className="h-4 w-4" /></span>
                        <div>
                          <p className="font-bold text-slate-700 dark:text-slate-300">Audio Output</p>
                          <p className="text-[10px] text-slate-400 font-bold">Stereo valid</p>
                        </div>
                      </div>
                      <Badge className="bg-purple-500/10 text-purple-500 border-none font-bold uppercase text-[9px]">Ready</Badge>
                    </div>

                    {/* Full Screen */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center"><Maximize2 className="h-4 w-4" /></span>
                        <div>
                          <p className="font-bold text-slate-700 dark:text-slate-300">Fullscreen mode</p>
                          <p className="text-[10px] text-slate-400 font-bold">Viewport configured</p>
                        </div>
                      </div>
                      <Badge className="bg-blue-500/10 text-blue-500 border-none font-bold uppercase text-[9px]">Supported</Badge>
                    </div>

                    {/* Keyboard Check */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center"><Grid className="h-4 w-4" /></span>
                        <div>
                          <p className="font-bold text-slate-700 dark:text-slate-300">Keyboard Input</p>
                          <p className="text-[10px] text-slate-400 font-bold">ANSI/ISO Active</p>
                        </div>
                      </div>
                      <Badge className="bg-amber-500/10 text-amber-500 border-none font-bold uppercase text-[9px]">Online</Badge>
                    </div>

                    {/* Auto Save Sync */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="h-7 w-7 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center"><CheckCircle2 className="h-4 w-4" /></span>
                        <div>
                          <p className="font-bold text-slate-700 dark:text-slate-300">Local & Cloud Sync</p>
                          <p className="text-[10px] text-slate-400 font-bold">Secure WebSocket</p>
                        </div>
                      </div>
                      <Badge className="bg-cyan-500/10 text-cyan-500 border-none font-bold uppercase text-[9px]">Sync'd</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className={cn("p-6 border-t flex justify-center transition-colors", 
            isMilliy ? "bg-slate-50/50 dark:bg-[#070e17] border-slate-205 dark:border-slate-800" : "bg-slate-50 dark:bg-[#0c0817]/60 border-slate-200 dark:border-slate-800"
          )}>
            <Button 
              size="lg" 
              className={cn("text-white font-bold px-10 rounded-xl h-12 uppercase tracking-widest text-sm transition-all duration-300", 
                isMilliy ? "bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/10" : "bg-[#0f2c59] dark:bg-blue-600 hover:bg-[#1a365d] dark:hover:bg-blue-700"
              )} 
              onClick={triggerStartWithCountdown}
            >
              {isMilliy ? "Qoidalarni qabul qilaman va testni boshlayman" : "Acknowledge & Start"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const answeredCount = Object.values(answers).filter(Boolean).length;
  const flaggedCount = flagged.size;

  // REVIEW SCREEN - Clinical
  if (showReviewScreen) {
    return (
      <div className={cn("min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-8 font-sans transition-colors", 
        isMilliy ? "bg-[#f1f5f9] dark:bg-[#060b13] selection:bg-emerald-200" : "bg-[#f4f4f4] dark:bg-[#0c0817] selection:bg-blue-200"
      )}>
        <div className={cn("w-full max-w-5xl bg-white border shadow-xl rounded-2xl overflow-hidden transition-colors", 
          isMilliy ? "dark:bg-[#0b1624] border-slate-200 dark:border-slate-800" : "dark:bg-[#140D23] border-slate-300 dark:border-slate-800"
        )}>
          <div className={cn("p-6 text-white flex justify-between items-center transition-colors", 
            isMilliy ? "bg-[#0a192f] border-b-2 border-[#10b981]" : "bg-[#0f2c59] dark:bg-[#0b1e3b]"
          )}>
            <h2 className="text-xl font-bold uppercase tracking-widest">
              {isMilliy ? "Tekshirish" : "Section Review"}
            </h2>
            <div className="font-mono text-xl font-bold tracking-widest bg-white/10 dark:bg-white/5 px-4 py-1 border border-white/20 dark:border-white/10">
              {fmt(timeLeft)}
            </div>
          </div>
          
          <div className="p-8">
            <div className="flex items-center gap-8 mb-8 border-b-2 border-slate-200 dark:border-slate-850 pb-6">
              <div className="text-center">
                <span className={cn("block text-3xl font-bold", isMilliy ? "text-[#059669] dark:text-[#10b981]" : "text-[#166534] dark:text-[#22c55e]")}>{answeredCount}</span>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest">
                  {isMilliy ? "Javob berildi" : "Answered"}
                </span>
              </div>
              <div className="text-center">
                <span className={cn("block text-3xl font-bold", isMilliy ? "text-amber-600 dark:text-amber-500" : "text-[#ca8a04] dark:text-[#eab308]")}>{flaggedCount}</span>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest">
                  {isMilliy ? "Belgilandi" : "Marked"}
                </span>
              </div>
              <div className="text-center">
                <span className={cn("block text-3xl font-bold", isMilliy ? "text-rose-600 dark:text-rose-500" : "text-[#991b1b] dark:text-[#ef4444]")}>{questions.length - answeredCount}</span>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-widest">
                  {isMilliy ? "Belgilanmagan" : "Incomplete"}
                </span>
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
                      hasAns && !isFlg 
                        ? (isMilliy 
                            ? "bg-white dark:bg-emerald-950/20 border-[#10b981] dark:border-[#10b981] text-[#059669] dark:text-[#10b981] border-2" 
                            : "bg-white dark:bg-[#0f2c59]/20 border-[#166534] dark:border-[#22c55e] text-[#166534] dark:text-[#22c55e] border-2")
                        : isFlg 
                          ? (isMilliy 
                              ? "bg-white dark:bg-amber-950/20 border-amber-500 dark:border-amber-450 text-amber-600 dark:text-amber-500 border-2" 
                              : "bg-white dark:bg-[#ca8a04]/20 border-[#ca8a04] dark:border-[#eab308] text-[#ca8a04] dark:text-[#eab308] border-2")
                          : (isMilliy 
                              ? "bg-slate-100 dark:bg-slate-800/50 border-slate-350 dark:border-slate-700 text-slate-550 dark:text-slate-400" 
                              : "bg-[#f8fafc] dark:bg-slate-900/50 border-slate-300 dark:border-slate-800 text-slate-500 dark:text-slate-400")
                    )}
                  >
                    {q.position}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={cn("flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between items-stretch sm:items-center p-4 sm:p-6 border-t transition-colors", 
            isMilliy ? "bg-slate-50 dark:bg-[#0a192f]/60 border-slate-200 dark:border-slate-850" : "bg-slate-100 dark:bg-[#140D23]/60 border-slate-300 dark:border-slate-800"
          )}>
            <Button 
              variant="outline" 
              size="lg" 
              className={cn("rounded-none border-2 font-bold uppercase tracking-widest text-xs w-full sm:w-auto justify-center text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900", 
                isMilliy ? "border-[#0a192f] dark:border-[#10b981]" : "border-slate-800 dark:border-slate-700"
              )}
              onClick={() => setShowReviewScreen(false)}
            >
              <ChevronLeft className="w-4 h-4 mr-2" /> {isMilliy ? "Oldingi savol" : "Return"}
            </Button>
            <Button 
              size="lg" 
              className={cn("text-white font-bold px-4 sm:px-10 rounded-none text-xs uppercase tracking-widest w-full sm:w-auto justify-center", 
                isMilliy ? "bg-[#059669] hover:bg-[#047857] dark:bg-[#10b981] dark:hover:bg-[#059669] border-none shadow-lg shadow-emerald-600/10" : "bg-[#0f2c59] hover:bg-[#1a365d]"
              )} 
              onClick={() => submit(false)}
            >
              Submit
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- IELTS CBT Redesign Layout Rendering ---
  const isBW = ieltsContrast === "black-on-white";
  const isWB = ieltsContrast === "white-on-black";
  const isYB = ieltsContrast === "yellow-on-black";

  const cStyle = {
    // Common
    bg: isBW ? "bg-[#f7f8fa]" : "bg-black",
    text: isBW ? "text-slate-800" : isWB ? "text-white" : "text-[#ffff00]",
    border: isBW ? "border-slate-200" : isWB ? "border-slate-800" : "border-[#333300]",
    
    // Header
    headerBg: isBW ? "bg-white" : "bg-black",
    headerBorder: isBW ? "border-slate-200" : isWB ? "border-slate-800" : "border-[#333300]",
    logoText: isBW ? "text-[#e11d48]" : isWB ? "text-red-500" : "text-[#ffff00]",
    
    // Timer Box
    timerBox: isBW 
      ? "bg-white border-slate-355 text-slate-800 border-slate-300" 
      : isWB 
        ? "bg-black border-slate-800 text-white" 
        : "bg-black border-[#ffff00] text-[#ffff00]",
    
    // Icon Buttons
    iconBtn: isBW 
      ? "hover:bg-slate-100 text-slate-600" 
      : isWB 
        ? "hover:bg-slate-850 text-slate-400" 
        : "hover:bg-[#222200] text-[#ffff00]",
    
    // Passage Panel
    passageBg: isBW ? "bg-white" : "bg-black",
    passageBorder: isBW ? "border-slate-200" : isWB ? "border-slate-800" : "border-[#333300]",
    passageTitle: isBW ? "text-slate-900" : isWB ? "text-white" : "text-[#ffff00]",
    passageText: isBW ? "text-slate-800" : isWB ? "text-slate-205" : "text-[#ffff00]",
    
    // Divider Resizer
    dividerLine: isBW ? "bg-slate-200" : isWB ? "bg-slate-800" : "bg-[#333300]",
    dividerHandle: isBW 
      ? "bg-white border-slate-300 text-slate-500 shadow-md" 
      : isWB 
        ? "bg-[#121212] border-slate-800 text-white shadow-none" 
        : "bg-black border-[#ffff00] text-[#ffff00] shadow-none",
    
    // Question Card
    cardBg: isBW ? "bg-white" : isWB ? "bg-[#141c2e]" : "bg-black",
    cardBorder: isBW ? "border-slate-200" : isWB ? "border-slate-850" : "border-[#333300]",
    cardActiveBorder: isBW 
      ? "border-l-4 border-l-blue-600 border-slate-300" 
      : isWB 
        ? "border-l-4 border-l-blue-500 border-slate-700" 
        : "border-l-4 border-l-[#ffff00] border-[#ffff00]",
    cardText: isBW ? "text-slate-900" : isWB ? "text-white" : "text-[#ffff00]",
    cardSubtext: isBW ? "text-slate-500" : isWB ? "text-slate-400" : "text-[#ffff00]",
    
    // Option item
    optHover: isBW 
      ? "hover:bg-slate-50" 
      : isWB 
        ? "hover:bg-slate-800/40" 
        : "hover:bg-[#222200]",
    optRadioCircle: isBW 
      ? "border-slate-300 bg-white" 
      : isWB 
        ? "border-slate-700 bg-slate-900" 
        : "border-[#ffff00] bg-black",
    optRadioCircleSelected: isBW 
      ? "border-slate-800 bg-white" 
      : isWB 
        ? "border-slate-200 bg-slate-900" 
        : "border-[#ffff00] bg-black",
    optRadioDot: isBW ? "bg-slate-800" : isWB ? "bg-slate-200" : "bg-[#ffff00]",
    
    // Input fields
    input: isBW 
      ? "bg-white border-slate-300 text-slate-900 focus:border-blue-500" 
      : isWB 
        ? "bg-slate-950 border-slate-700 text-white focus:border-blue-500" 
        : "bg-black border-[#ffff00] text-[#ffff00] focus:border-[#ffff00]",
    
    // Floating Nav
    floatBg: isBW ? "bg-[#1e2022] border-slate-700" : isWB ? "bg-slate-900 border-slate-855" : "bg-black border-[#ffff00]",
    floatDivider: isBW ? "divide-slate-700" : isWB ? "divide-slate-800" : "divide-[#ffff00]",
    floatBtnHover: isBW ? "hover:bg-slate-800" : isWB ? "hover:bg-slate-800" : "hover:bg-[#222200]",
    floatBtnText: isBW ? "text-white" : isWB ? "text-white" : "text-[#ffff00]",

    // Part Banner
    bannerBg: isBW ? "bg-[#f0f2f5] border-slate-200" : isWB ? "bg-[#141c2e] border-slate-850" : "bg-black border-[#ffff00]",
    
    // Footer
    footerBg: isBW ? "bg-[#f0f2f5]" : "bg-black",
    footerBorder: isBW ? "border-slate-300" : isWB ? "border-slate-850" : "border-[#333300]",
    footerText: isBW ? "text-slate-700" : isWB ? "text-slate-300" : "text-[#ffff00]",
    
    // Pagination
    pagUnanswered: isBW 
      ? "bg-white border-slate-300 text-slate-600 hover:bg-slate-50" 
      : isWB 
        ? "bg-slate-900 border-slate-750 text-slate-400 hover:bg-slate-800" 
        : "bg-black border-[#ffff00] text-[#ffff00] hover:bg-[#222200]",
    pagActive: isBW 
      ? "border-blue-600 bg-blue-50 text-blue-600 border-2" 
      : isWB 
        ? "border-blue-500 bg-blue-950/20 text-blue-400 border-2" 
        : "border-[#ffff00] bg-black text-[#ffff00] border-2",
    pagAnswered: isBW 
      ? "border-blue-300 bg-blue-50/30 text-slate-700 border-b-4 border-b-blue-600" 
      : isWB 
        ? "border-blue-800/40 bg-blue-950/10 text-slate-300 border-b-4 border-b-blue-500" 
        : "border-[#ffff00] bg-black text-[#ffff00] border-b-4 border-b-[#ffff00]",
    pagFlagged: isBW 
      ? "bg-amber-500/10 border-amber-500 text-amber-600" 
      : isWB 
        ? "bg-amber-950/10 border-amber-600 text-amber-400" 
        : "bg-black border-amber-500 text-amber-500 border-2",
  };

  const textSizeStyle = {
    passage: ieltsTextSize === "regular" ? "text-[17px]" : ieltsTextSize === "large" ? "text-[20px]" : "text-[24px]",
    prompt: ieltsTextSize === "regular" ? "text-[15px]" : ieltsTextSize === "large" ? "text-[18px]" : "text-[22px]",
    option: ieltsTextSize === "regular" ? "text-sm" : ieltsTextSize === "large" ? "text-base" : "text-lg",
    input: ieltsTextSize === "regular" ? "text-sm" : ieltsTextSize === "large" ? "text-base" : "text-lg",
  };

  const renderIeltsHeader = () => {
    return (
      <header className={cn("h-[65px] shrink-0 border-b flex items-center justify-between px-6 z-40 select-none", cStyle.headerBg, cStyle.headerBorder, cStyle.text)}>
        {/* Left: Logo and Test Title */}
        <div className="flex items-center gap-4 min-w-0">
          <span className={cn("font-extrabold text-2xl tracking-tighter shrink-0 select-none", cStyle.logoText)}>
            IELTS
          </span>
          <div className={cn("h-6 w-[1px] hidden sm:block shrink-0", isYB ? "bg-[#ffff00]" : "bg-slate-200 dark:bg-slate-800")} />
          <div className="min-w-0 leading-tight">
            <h1 className="font-bold text-sm truncate max-w-[200px] sm:max-w-none">
              {exam?.title || "IELTS Practice Test"}
            </h1>
            <div className="flex items-center gap-2 text-[10px] mt-0.5 font-bold uppercase tracking-wider opacity-85">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{isReviewMode ? "Review | " : ""}{kind} mode</span>
            </div>
          </div>
        </div>

        {/* Center: Timer Box */}
        <div className={cn("flex items-center justify-center border rounded-md px-5 py-1.5 shadow-sm font-sans font-bold text-lg select-none", cStyle.timerBox)}>
          <Clock className="w-5 h-5 mr-2 opacity-80" />
          {isReviewMode ? "FINISHED" : fmt(timeLeft)}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("rounded-full h-9 w-9 cursor-pointer", cStyle.iconBtn)} 
            onClick={toggle}
            title={theme === "dark" ? "Light Mode" : "Dark Mode"}
          >
            {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("rounded-full h-9 w-9 cursor-pointer", cStyle.iconBtn)} 
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("rounded-full h-9 w-9 cursor-pointer", cStyle.iconBtn)}
            onClick={() => setShowCalculator(!showCalculator)}
            title="Calculator"
          >
            <Calculator className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("rounded-full h-9 w-9 cursor-pointer", cStyle.iconBtn)}
            onClick={() => {
              setShowOptionsModal(true);
              setOptionsPanel("main");
            }}
            title="Options"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </header>
    );
  };

  const renderIeltsPartBanner = (currentSectionIdx: number) => {
    const sectionQuestions = questions.filter(q => q.section_index === currentSectionIdx);
    const firstQPos = sectionQuestions[0]?.position ?? 1;
    const lastQPos = sectionQuestions[sectionQuestions.length - 1]?.position ?? 1;
    
    const bannerText = isReading 
      ? `Read and answer questions ${firstQPos}-${lastQPos}.` 
      : kind === "listening" 
        ? `Answer questions ${firstQPos}-${lastQPos}.` 
        : `Complete the writing task.`;

    return (
      <div className={cn("border p-4 rounded-lg mb-6 shadow-sm", cStyle.bannerBg, cStyle.text)}>
        <h3 className="font-extrabold text-base">
          Part {currentSectionIdx + 1}
        </h3>
        <p className="text-xs mt-1 font-semibold opacity-90">
          {bannerText}
        </p>
      </div>
    );
  };

  const renderIeltsPassagePanel = (currentSectionIdx: number) => {
    const currentSection = sections[currentSectionIdx];
    if (!currentSection || (!currentSection.passage && !currentSection.imageUrl)) return null;

    return (
      <div
        style={{ width: `${leftWidth}%`, flexShrink: 0 }}
        className={cn("h-full overflow-y-auto border-r p-8 xl:p-12 transition-colors select-text", cStyle.passageBg, cStyle.passageBorder, cStyle.text)}
      >
        <div className="max-w-3xl mx-auto">
          <h2 className={cn("text-3xl font-extrabold text-center font-serif mb-2 leading-tight", cStyle.passageTitle)}>
            {currentSection.title}
          </h2>
          {currentSection.imageUrl && (
            <img 
              src={getFullImageUrl(currentSection.imageUrl)} 
              className={cn("max-w-full mx-auto border my-6 shadow-sm", cStyle.border)} 
              alt="Passage context"
            />
          )}
          <div className={cn("prose dark:prose-invert max-w-none font-serif leading-relaxed whitespace-pre-wrap mt-8", cStyle.passageText, textSizeStyle.passage)}>
            {formatMathText(currentSection.passage)}
          </div>
        </div>
      </div>
    );
  };

  const renderIeltsDivider = () => {
    return (
      <div
        onMouseDown={startResizing}
        className={cn("hidden md:flex w-[3px] hover:bg-blue-500 cursor-col-resize shrink-0 transition-all duration-150 relative z-20 items-center justify-center group", cStyle.dividerLine)}
      >
        <div className={cn("absolute h-10 w-6 border rounded-md flex items-center justify-center pointer-events-none select-none z-30", cStyle.dividerHandle)}>
          <span className="font-bold text-xs select-none">↔</span>
        </div>
      </div>
    );
  };

  const renderIeltsListeningControls = () => {
    if (kind !== "listening" || !exam?.audioUrl || isReviewMode) return null;
    return (
      <div className="max-w-3xl mx-auto mb-6 px-4 md:px-0">
        {!audioStarted ? (
          <div className={cn("border p-8 rounded-xl text-center shadow-sm flex flex-col items-center justify-center", cStyle.cardBg, cStyle.cardBorder, cStyle.text)}>
            <Headphones className="h-12 w-12 text-blue-555 animate-bounce mb-4 text-blue-600" />
            <p className={cn("max-w-md text-xs font-semibold leading-relaxed mb-6", cStyle.cardSubtext)}>
              You will be listening to an audio clip during this test. You will not be permitted to pause or rewind the audio while answering the questions. To continue, click Play.
            </p>
            <Button 
              onClick={() => setAudioStarted(true)} 
              className={cn("text-white font-bold px-8 py-2 rounded-lg flex items-center gap-2 shadow-sm border-none cursor-pointer", isYB ? "bg-[#ffff00] !text-black hover:bg-[#dddd00]" : "bg-blue-650 hover:bg-blue-700")}
            >
              <Play className="h-4 w-4 fill-current" /> Play Audio
            </Button>
          </div>
        ) : (
          <CustomAudioPlayer src={exam.audioUrl} />
        )}
      </div>
    );
  };

  const renderIeltsFloatingNav = () => {
    return (
      <div className={cn("absolute bottom-6 right-8 flex items-center rounded-md shadow-lg border overflow-hidden z-30 divide-x", cStyle.floatBg, cStyle.floatDivider)}>
        <button
          onClick={() => setActiveQuestionIndex(i => Math.max(0, i - 1))}
          disabled={activeQuestionIndex === 0}
          className={cn("px-5 py-3 transition-colors cursor-pointer disabled:opacity-20", cStyle.floatBtnHover, cStyle.floatBtnText)}
          title="Previous Question"
        >
          <span className="text-base font-bold">←</span>
        </button>
        <button
          onClick={() => {
            if (activeQuestionIndex === questions.length - 1) {
              if (isReviewMode) return;
              handleSubmitRequest();
            } else {
              setActiveQuestionIndex(i => Math.min(questions.length - 1, i + 1));
            }
          }}
          className={cn("px-5 py-3 transition-colors cursor-pointer", cStyle.floatBtnHover, cStyle.floatBtnText)}
          title="Next Question"
        >
          <span className="text-base font-bold">→</span>
        </button>
      </div>
    );
  };

  const renderIeltsQuestionsPanel = (currentSectionIdx: number) => {
    const sectionQuestions = questions.filter(q => q.section_index === currentSectionIdx);

    return (
      <div
        style={{ width: "100%" }}
        className={cn("h-full overflow-hidden flex flex-col transition-colors relative", isBW ? "bg-[#f7f8fa]" : "bg-black")}
      >
        <div className="flex-1 overflow-y-auto p-6 md:p-8 xl:p-12 pb-32 animate-fade-in">
          <div className="max-w-3xl mx-auto">
            {renderIeltsPartBanner(currentSectionIdx)}
            
            <div className="space-y-6">
              {sectionQuestions.map(q => {
                const isQActive = q.position - 1 === activeQuestionIndex;
                let opts = q.options;
                if ((!opts || opts.length === 0) && (q.qtype === "tfng" || q.qtype === "ynng")) {
                  const labels = q.qtype === "tfng" ? ["TRUE", "FALSE", "NOT GIVEN"] : ["YES", "NO", "NOT GIVEN"];
                  opts = labels.map((l, i) => ({
                    id: `${q.id}_opt_${i}`,
                    text: l,
                    positionOrder: i,
                    isCorrect: false
                  }));
                }

                // If in review mode, fetch what the user submitted
                const detailForQ = ieltsDetails.find((d: any) => String(d.questionId) === String(q.id));
                const submittedAns = detailForQ ? detailForQ.userAns : undefined;

                return (
                  <div
                    key={q.id}
                    ref={el => { questionRefs.current[q.id] = el; }}
                    className={cn(
                      "p-6 border rounded-lg transition-all scroll-mt-6 cursor-pointer",
                      cStyle.cardBg,
                      isQActive ? cStyle.cardActiveBorder : cStyle.cardBorder,
                      cStyle.cardText
                    )}
                    onClick={() => {
                      if (!isQActive) {
                        setActiveQuestionIndex(q.position - 1);
                      }
                    }}
                  >
                    {/* Badge & Flag Button */}
                    <div className={cn("flex items-center justify-between border-b pb-3 mb-4", isYB ? "border-[#333300]" : "border-slate-100 dark:border-slate-800")}>
                      <span className="font-extrabold text-sm">
                        Question {q.position}
                      </span>
                      {!isReviewMode && (
                        <button 
                          className={cn(
                            "flex items-center text-xs font-bold uppercase tracking-widest px-2.5 py-1 border transition-colors rounded-sm cursor-pointer", 
                            flagged.has(q.id)
                              ? isYB 
                                ? "border-[#ffff00] text-[#ffff00] bg-yellow-955/20" 
                                : "border-amber-500 text-amber-600 bg-amber-50/50 dark:bg-amber-950/20"
                              : isYB 
                                ? "border-[#ffff00] text-[#ffff00] hover:bg-[#222200]" 
                                : "border-slate-205 dark:border-slate-750 text-slate-400 hover:border-slate-400 hover:text-slate-655"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFlag(q.id);
                          }}
                        >
                          <Bookmark className={cn("w-3.5 h-3.5 mr-1.5", flagged.has(q.id) ? "fill-current" : "")} /> 
                          {flagged.has(q.id) ? "Flagged" : "Flag"}
                        </button>
                      )}
                      {isReviewMode && (
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-sm border", 
                          detailForQ?.ok 
                            ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-600 dark:text-emerald-400" 
                            : "bg-rose-500/10 border-rose-500/35 text-rose-600 dark:text-rose-400"
                        )}>
                          {detailForQ?.ok ? "Correct" : "Incorrect"}
                        </span>
                      )}
                    </div>

                    {/* Prompt */}
                    <div className={cn("font-bold leading-relaxed mb-4", textSizeStyle.prompt)}>
                      {formatMathText(q.prompt)}
                    </div>

                    {/* Media */}
                    {q.imageUrl && (
                      <img 
                        src={getFullImageUrl(q.imageUrl)} 
                        className={cn("max-w-full border my-4 rounded-md shadow-sm", cStyle.border)} 
                        alt="Question context" 
                      />
                    )}

                    {/* Inputs */}
                    {opts && opts.length > 0 ? (
                      <div className="space-y-2 pl-1">
                        {opts.map((opt, oIdx) => {
                          const isSelected = answers[q.id] === opt.text;
                          const isUserSelected = submittedAns === opt.text;
                          const isCorrectOption = opt.isCorrect || opt.is_correct || detailForQ?.correctAns === opt.text;

                          const isSelectedState = isReviewMode ? isUserSelected : isSelected;
                          const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

                          // Options colors for Review vs Exam Mode
                          let optBgHighlight = "";
                          if (isReviewMode) {
                            if (isCorrectOption) {
                              optBgHighlight = isYB 
                                ? "bg-[#002b00] border-[#ffff00] text-[#ffff00]" 
                                : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold";
                            } else if (isUserSelected && !isCorrectOption) {
                              optBgHighlight = isYB 
                                ? "bg-[#2b0000] border-[#ffff00] text-[#ffff00]" 
                                : "bg-rose-50 dark:bg-rose-955/20 border-rose-500 text-rose-700 dark:text-rose-455 font-bold";
                            }
                          }

                          return (
                            <button
                              key={opt.id}
                              disabled={isReviewMode}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAnswer(q.id, opt.text);
                                setActiveQuestionIndex(q.position - 1);
                              }}
                              className={cn(
                                "flex items-center gap-3 w-full text-left py-2.5 rounded-md px-3 border border-transparent transition-all group cursor-pointer", 
                                optBgHighlight ? "" : cStyle.optHover,
                                optBgHighlight
                              )}
                            >
                              <div className={cn(
                                "h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-all",
                                isSelectedState ? cStyle.optRadioCircleSelected : cStyle.optRadioCircle
                              )}>
                                {isSelectedState && (
                                  <div className={cn("w-2.5 h-2.5 rounded-full", cStyle.optRadioDot)} />
                                )}
                              </div>
                              <div className={cn("flex items-center gap-1.5 min-w-0", textSizeStyle.option)}>
                                {q.options && q.options.length > 0 && (
                                  <span className="font-bold text-sm">
                                    {labels[oIdx]}.
                                  </span>
                                )}
                                {opt.imageUrl && <img src={getFullImageUrl(opt.imageUrl)} className="h-10 object-contain mr-2 border rounded-sm border-slate-105" alt="Option visual" />}
                                <span className="font-semibold">
                                  {formatMathText(opt.text)}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="w-full mt-3">
                        {isReviewMode ? (
                          <div className="space-y-3 font-semibold text-xs leading-relaxed select-text mt-3">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Your answer</span>
                              <div className={cn("p-3.5 rounded-md border text-sm font-extrabold", 
                                detailForQ?.ok 
                                  ? isYB ? "border-[#ffff00]" : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-450" 
                                  : isYB ? "border-[#ffff00]" : "bg-rose-50 dark:bg-rose-955/20 border-rose-500/30 text-rose-700 dark:text-rose-455"
                              )}>
                                {submittedAns || "— No answer submitted —"} {detailForQ?.ok ? "✓" : "✗"}
                              </div>
                            </div>
                            {!detailForQ?.ok && (
                              <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Correct answer</span>
                                <div className={cn("p-3.5 rounded-md border text-sm font-extrabold", isYB ? "border-[#ffff00]" : "border-emerald-500/30 bg-emerald-50/10 text-emerald-700 dark:text-emerald-400")}>
                                  {detailForQ?.correctAns || "— No correct answer key —"}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          kind === "writing" ? (
                            <div>
                              <Textarea
                                rows={16}
                                className={cn("w-full p-5 font-serif rounded-md border focus:ring-0 resize-none h-[380px] shadow-inner focus:outline-none", cStyle.input, textSizeStyle.input)}
                                placeholder="Write your essay here..."
                                value={answers[q.id] || ""}
                                onChange={(e) => {
                                  onAnswer(q.id, e.target.value);
                                  setActiveQuestionIndex(q.position - 1);
                                }}
                              />
                              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest mt-2 px-1 opacity-80">
                                <span>Words: {answers[q.id]?.trim() ? answers[q.id].trim().split(/\s+/).length : 0}</span>
                                <span>Characters: {(answers[q.id] || "").length}</span>
                              </div>
                            </div>
                          ) : (
                            <input
                              type="text"
                              className={cn("w-full max-w-md p-3 font-semibold rounded-md border shadow-sm focus:outline-none focus:ring-0", cStyle.input, textSizeStyle.input)}
                              placeholder="Type your answer here..."
                              value={answers[q.id] || ""}
                              onChange={(e) => {
                                onAnswer(q.id, e.target.value);
                                setActiveQuestionIndex(q.position - 1);
                              }}
                            />
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Floating Controls */}
        {renderIeltsFloatingNav()}
      </div>
    );
  };

  const renderIeltsFooter = (currentSectionIdx: number) => {
    return (
      <footer className={cn("h-[70px] border-t flex items-center justify-between px-6 z-40 select-none", cStyle.footerBg, cStyle.footerBorder, cStyle.footerText)}>
        {/* Left side: Part info */}
        <div className="flex items-center gap-3 w-1/4">
          <span className="font-extrabold text-sm uppercase tracking-wide">
            Part {currentSectionIdx + 1}
          </span>
        </div>

        {/* Middle side: Square Pagination Buttons */}
        <div className="flex-1 flex justify-center items-center gap-1.5 overflow-x-auto max-w-[60%] px-4 py-1 scrollbar-thin">
          {questions.map((q, idx) => {
            const isCurrent = idx === activeQuestionIndex;
            const hasAns = !!answers[q.id];
            const isFlg = flagged.has(q.id);
            
            let btnStyle = cStyle.pagUnanswered;
            if (isReviewMode) {
              const qDetail = ieltsDetails.find((d: any) => String(d.questionId) === String(q.id));
              const isQCorrect = qDetail ? !!qDetail.ok : false;
              const wasQAnswered = qDetail && qDetail.userAns !== undefined && String(qDetail.userAns).trim() !== "";
              
              if (isQCorrect) {
                btnStyle = isYB 
                  ? "border-[#ffff00] text-[#ffff00] bg-[#002200]" 
                  : "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/10";
              } else if (wasQAnswered) {
                btnStyle = isYB 
                  ? "border-[#ffff00] text-[#ffff00] bg-[#220000] line-through" 
                  : "border-rose-500 text-rose-600 dark:text-rose-455 bg-rose-50/10";
              } else {
                btnStyle = isYB 
                  ? "border-[#333300] text-[#888800] bg-black" 
                  : "border-slate-300 dark:border-slate-750 text-slate-500 dark:text-slate-400 bg-slate-100/30";
              }
              if (isCurrent) {
                btnStyle = cn(btnStyle, "ring-2 ring-blue-500 ring-offset-1");
              }
            } else {
              if (isCurrent) {
                btnStyle = cStyle.pagActive;
              } else if (isFlg) {
                btnStyle = cStyle.pagFlagged;
              } else if (hasAns) {
                btnStyle = cStyle.pagAnswered;
              }
            }

            return (
              <button
                key={q.id}
                onClick={() => {
                  setActiveQuestionIndex(idx);
                  const el = questionRefs.current[q.id];
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }}
                className={cn("h-9 w-9 text-xs font-black transition-all duration-150 border flex items-center justify-center rounded-sm shrink-0 cursor-pointer", btnStyle)}
              >
                {q.position}
              </button>
            );
          })}
        </div>

        {/* Right side: Checkmark or Back Button */}
        <div className="flex items-center justify-end w-1/4">
          {isReviewMode ? (
            <Button
              onClick={() => setSearchParams({ attemptId: result?.id || attemptId, review: "false" })}
              className={cn("h-10 px-6 rounded-sm font-bold text-xs uppercase tracking-widest cursor-pointer border-none text-white", isYB ? "bg-[#ffff00] !text-black hover:bg-[#dddd00]" : "bg-slate-700 hover:bg-slate-800")}
            >
              Back
            </Button>
          ) : (
            <Button 
              size="lg" 
              onClick={handleSubmitRequest}
              className={cn("h-10 w-10 p-0 rounded-sm text-white flex items-center justify-center shadow-md transition-colors border-none cursor-pointer", isYB ? "bg-[#ffff00] !text-black hover:bg-[#dddd00]" : "bg-emerald-600 hover:bg-emerald-700")}
              title="Submit Exam"
            >
              <span className="text-xl font-bold font-sans">✓</span>
            </Button>
          )}
        </div>
      </footer>
    );
  };

  const renderIeltsResultDashboard = () => {
    if (!result) return null;

    const totalQ = questions.length || 1;
    const correctAns = questions.filter(q => {
      const detail = ieltsDetails.find((d: any) => String(d.questionId) === String(q.id));
      return detail ? !!detail.ok : false;
    }).length;
    
    const pctAccuracy = Math.round((correctAns / totalQ) * 100);
    
    // Format duration spent
    const elapsedSeconds = result.timeUsedSeconds ?? result.elapsedSec ?? 0;
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const elapsedSecondsRem = elapsedSeconds % 60;
    const durationStr = elapsedMinutes > 0 ? `${elapsedMinutes}m ${elapsedSecondsRem}s` : `${elapsedSeconds}s`;

    // Convert raw correct count to Band score (or get final score)
    const bandScoreVal = result.score || rawToBand(kind, correctAns, totalQ);

    // Performance analysis feedback & stars
    let scoreFeedback = "This score needs serious improvement. Dedicate more time to reading and vocabulary.";
    let starsCount = 1;
    if (bandScoreVal >= 7.5) {
      scoreFeedback = "Outstanding score! You have shown excellent language proficiency.";
      starsCount = 3;
    } else if (bandScoreVal >= 5.5) {
      scoreFeedback = "Good effort. You have a solid grasp but keep practicing for higher bands.";
      starsCount = 2;
    }

    // Modal theme configurations matching active Contrast theme
    const resultBg = isYB ? "bg-black text-[#ffff00]" : isWB ? "bg-[#0b0c10] text-white" : "bg-[#f4f7f6] text-slate-800";
    const cardContainerBg = isYB ? "bg-black border-[#ffff00]" : isWB ? "bg-[#161a22] border-slate-850" : "bg-white border-slate-200 shadow-xl";
    const innerCardBg = isYB ? "bg-black border-[#ffff00]" : isWB ? "bg-[#251212] border-rose-950/30 text-rose-300" : "bg-[#fff5f5] border-rose-100 text-rose-800";
    
    const metricCardBg = isYB ? "bg-black border-[#ffff00]" : isWB ? "bg-[#1c2331] border-slate-800" : "bg-[#fcfdfd] border-slate-200 shadow-xs";
    const metricText = isYB ? "text-[#ffff00]" : isWB ? "text-white" : "text-slate-800";

    return (
      <div className={cn("min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-8 font-sans transition-colors", resultBg)}>
        {/* White Centered Container Card */}
        <div className={cn("w-full max-w-3xl border rounded-2xl overflow-hidden p-8 md:p-12 text-center", cardContainerBg)}>
          
          {/* Checkmark circular logo */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/20 border-4 border-emerald-500 shadow-inner text-emerald-500">
            <span className="text-3xl font-extrabold select-none">✓</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-1">
            {kind.charAt(0).toUpperCase() + kind.slice(1)} Test Complete!
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-8">
            Here are your results
          </p>

          {/* Large evaluations card (light red / custom) */}
          <div className={cn("border rounded-2xl p-6 md:p-8 text-center max-w-2xl mx-auto mb-8 relative", innerCardBg)}>
            <span className="block font-extrabold text-xs uppercase tracking-widest text-emerald-650 dark:text-emerald-400">
              IELTS Band Score
            </span>
            
            {/* Score digit */}
            <span className="block text-7xl md:text-8xl font-black text-rose-600 dark:text-rose-400 my-4 tracking-tighter drop-shadow-sm select-none">
              {bandScoreVal}
            </span>
            
            <span className="block text-xs font-bold text-slate-500 dark:text-slate-400">
              out of 9.0
            </span>

            {/* score feedback */}
            <p className="text-rose-600 dark:text-rose-400 font-bold text-xs max-w-md mx-auto my-4 leading-relaxed">
              {scoreFeedback}
            </p>

            {/* lightbulb */}
            <div className="flex justify-center mb-5 opacity-90">
              <span className="text-lg">💡</span>
            </div>

            {/* Stars evaluation */}
            <div className="flex items-center justify-center gap-1.5 mb-8 select-none">
              {[1, 2, 3].map((starIdx) => {
                const isFilled = starIdx <= starsCount;
                return (
                  <span 
                    key={starIdx} 
                    className={cn("text-3xl transition-transform", isFilled ? "text-amber-500 animate-scale-up" : "text-slate-350 dark:text-slate-700")}
                  >
                    ★
                  </span>
                );
              })}
            </div>

            {/* Progress bar correct answers */}
            <div className="w-full text-left mt-6">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                <span>Correct answers</span>
                <span className="text-emerald-650 dark:text-emerald-400 font-extrabold">{correctAns} / {totalQ}</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                  style={{ width: `${pctAccuracy}%` }}
                />
              </div>
            </div>

            {/* Metrics cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {/* Accuracy Card */}
              <div className={cn("border p-4 rounded-xl text-left", metricCardBg)}>
                <span className="text-[9px] font-black text-emerald-650 dark:text-emerald-400 uppercase tracking-widest block">
                  Accuracy
                </span>
                <span className={cn("text-xl font-extrabold block mt-1", metricText)}>
                  {pctAccuracy}%
                </span>
              </div>

              {/* Correct/Total Card */}
              <div className={cn("border p-4 rounded-xl text-left", metricCardBg)}>
                <span className="text-[9px] font-black text-emerald-650 dark:text-emerald-400 uppercase tracking-widest block">
                  Correct / Total
                </span>
                <span className={cn("text-xl font-extrabold block mt-1", metricText)}>
                  {correctAns} / {totalQ}
                </span>
              </div>

              {/* Time Spent Card */}
              <div className={cn("border p-4 rounded-xl text-left", metricCardBg)}>
                <span className="text-[9px] font-black text-emerald-650 dark:text-emerald-400 uppercase tracking-widest block">
                  Time Spent
                </span>
                <span className={cn("text-xl font-extrabold block mt-1", metricText)}>
                  {durationStr}
                </span>
              </div>
            </div>

          </div>

          {/* Action buttons below */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center select-none mt-6">
            <Button
              onClick={() => {
                setSearchParams({ attemptId: result.id || attemptId, review: "true" });
              }}
              className={cn("w-full sm:w-auto px-8 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-opacity cursor-pointer border-none text-white", isYB ? "bg-[#ffff00] !text-black hover:bg-[#dddd00]" : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:opacity-90 shadow-md")}
            >
              Review Answers
            </Button>
            <Button
              onClick={() => nav(-1)}
              variant="outline"
              className={cn("w-full sm:w-auto px-8 py-3 rounded-lg font-bold text-xs uppercase tracking-widest cursor-pointer border-2 bg-transparent", isYB ? "border-[#ffff00] text-[#ffff00] hover:bg-[#222200]" : "border-slate-350 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900")}
            >
              Back to Practice
            </Button>
          </div>

        </div>
        {renderIeltsOptionsModal()}
      </div>
    );
  };

  const renderIeltsOptionsModal = () => {
    if (!showOptionsModal) return null;

    // Modal theme configurations matching active Contrast theme
    const modalBg = isYB ? "bg-black text-[#ffff00] border-[#ffff00]" : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800";
    const modalHeaderBorder = isYB ? "border-[#ffff00]" : "border-slate-200 dark:border-slate-800";
    const modalRowBg = isYB ? "bg-black border-[#ffff00] hover:bg-[#222200]" : "bg-[#f7f8fa] dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-855";
    const modalBoxBg = isYB ? "bg-black border-[#ffff00] divide-[#ffff00]" : "bg-white dark:bg-slate-955 border-slate-200 dark:border-slate-800 divide-slate-200 dark:divide-slate-800";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-fade-in">
        <div className={cn("w-full max-w-[480px] rounded-lg shadow-2xl overflow-hidden border flex flex-col animate-scale-up", modalBg)}>
          {/* Header */}
          <div className={cn("px-6 py-4 border-b flex items-center justify-between shrink-0", modalHeaderBorder)}>
            {optionsPanel === "main" ? (
              <>
                <div className="w-10" />
                <h3 className="font-bold text-base text-center flex-1">Options</h3>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setOptionsPanel("main")}
                  className="flex items-center gap-1.5 text-sm font-semibold hover:opacity-85 cursor-pointer"
                >
                  <span>←</span> <span>Options</span>
                </button>
                <h3 className="font-bold text-base text-center capitalize">
                  {optionsPanel === "contrast" ? "Contrast" : "Text size"}
                </h3>
              </>
            )}
            <button 
              onClick={() => setShowOptionsModal(false)}
              className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-white/10 dark:hover:bg-white/5 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {optionsPanel === "main" && (
              <div className="space-y-4">
                {/* Contrast Toggle */}
                <button
                  onClick={() => setOptionsPanel("contrast")}
                  className={cn("flex items-center justify-between w-full p-4 border rounded-md transition-colors cursor-pointer", modalRowBg)}
                >
                  <div className="flex items-center gap-3.5">
                    <svg className="w-5 h-5 text-current shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 2v20a10 10 0 0 0 0-20z" fill="currentColor" />
                    </svg>
                    <span className="font-bold text-sm">Contrast</span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </button>

                {/* Text Size Toggle */}
                <button
                  onClick={() => setOptionsPanel("text-size")}
                  className={cn("flex items-center justify-between w-full p-4 border rounded-md transition-colors cursor-pointer", modalRowBg)}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="font-serif font-black text-base select-none shrink-0 w-5 text-center">T</span>
                    <span className="font-bold text-sm">Text size</span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {optionsPanel === "contrast" && (
              <div className={cn("border rounded-md overflow-hidden divide-y", modalBoxBg)}>
                <button
                  onClick={() => setIeltsContrast("black-on-white")}
                  className="flex items-center justify-between w-full px-5 py-4 hover:bg-white/5 dark:hover:bg-white/5 transition-colors text-left cursor-pointer"
                >
                  <span className="text-sm font-semibold">Black on white</span>
                  {ieltsContrast === "black-on-white" && <span className="text-base font-bold">✓</span>}
                </button>

                <button
                  onClick={() => setIeltsContrast("white-on-black")}
                  className="flex items-center justify-between w-full px-5 py-4 hover:bg-white/5 dark:hover:bg-white/5 transition-colors text-left cursor-pointer"
                >
                  <span className="text-sm font-semibold">White on black</span>
                  {ieltsContrast === "white-on-black" && <span className="text-base font-bold">✓</span>}
                </button>

                <button
                  onClick={() => setIeltsContrast("yellow-on-black")}
                  className="flex items-center justify-between w-full px-5 py-4 hover:bg-white/5 dark:hover:bg-white/5 transition-colors text-left cursor-pointer"
                >
                  <span className="text-sm font-semibold">Yellow on black</span>
                  {ieltsContrast === "yellow-on-black" && <span className="text-base font-bold">✓</span>}
                </button>
              </div>
            )}

            {optionsPanel === "text-size" && (
              <div className={cn("border rounded-md overflow-hidden divide-y", modalBoxBg)}>
                <button
                  onClick={() => setIeltsTextSize("regular")}
                  className="flex items-center justify-between w-full px-5 py-4 hover:bg-white/5 dark:hover:bg-white/5 transition-colors text-left cursor-pointer"
                >
                  <span className="text-sm font-semibold">Regular</span>
                  {ieltsTextSize === "regular" && <span className="text-base font-bold">✓</span>}
                </button>

                <button
                  onClick={() => setIeltsTextSize("large")}
                  className="flex items-center justify-between w-full px-5 py-4 hover:bg-white/5 dark:hover:bg-white/5 transition-colors text-left cursor-pointer"
                >
                  <span className="text-sm font-semibold">Large</span>
                  {ieltsTextSize === "large" && <span className="text-base font-bold">✓</span>}
                </button>

                <button
                  onClick={() => setIeltsTextSize("extra-large")}
                  className="flex items-center justify-between w-full px-5 py-4 hover:bg-white/5 dark:hover:bg-white/5 transition-colors text-left cursor-pointer"
                >
                  <span className="text-sm font-semibold">Extra large</span>
                  {ieltsTextSize === "extra-large" && <span className="text-base font-bold">✓</span>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderIeltsLayout = () => {
    const currentSectionIdx = currentQuestion?.section_index ?? 0;

    return (
      <div className={cn("w-full h-screen flex flex-col font-sans transition-colors relative overflow-hidden", cStyle.bg)}>
        {renderIeltsHeader()}
        
        {/* Main Content Area */}
        <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {(isReading || kind === "writing") && renderIeltsPassagePanel(currentSectionIdx)}
          
          {(isReading || kind === "writing") && renderIeltsDivider()}
          
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {kind === "listening" && renderIeltsListeningControls()}
            {renderIeltsQuestionsPanel(currentSectionIdx)}
          </div>
        </main>

        {renderIeltsFooter(currentSectionIdx)}
        
        {showScratchpad && <Scratchpad isOpen={showScratchpad} onClose={() => setShowScratchpad(false)} />}
        <DesmosCalculator isOpen={showCalculator} onClose={() => setShowCalculator(false)} />
        {renderIeltsOptionsModal()}
      </div>
    );
  };

  if (result && isIeltsLayout) {
    if (isReviewMode) {
      return renderIeltsLayout();
    } else {
      return renderIeltsResultDashboard();
    }
  }

  if (started && isIeltsLayout && !result && !showReviewScreen && !showSuccessAnimation) {
    return renderIeltsLayout();
  }

  return (
    <div className={cn("w-full h-screen flex flex-col font-sans transition-colors",
      isMilliy ? "bg-[#f1f5f9] dark:bg-[#060b13] text-slate-900 dark:text-slate-100 selection:bg-emerald-200" : "bg-white dark:bg-[#080410] text-slate-900 dark:text-slate-100 selection:bg-blue-200"
    )}>
      
      {/* EXAM COMMAND CENTER HEADER - Official Deep Blue/Teal Bar */}
      <header className={cn("h-[60px] shrink-0 text-white flex items-center justify-between px-6 z-40 border-b transition-colors", 
        isMilliy ? "bg-[#0a192f] border-b-2 border-b-[#10b981]" : "bg-[#0f2c59] dark:bg-[#0b1e3b] border-[#0f2c59] dark:border-[#0b1e3b]"
      )}>
        <div className="flex items-center gap-4 min-w-0">
           <h1 className="font-bold text-sm uppercase tracking-widest truncate max-w-[150px] sm:max-w-none">
             {isMilliy ? "O'ZBEKISTON RESPUBLIKASI MILLIY SERTIFIKAT IMTIHONI" : exam.title}
           </h1>
           <span className="text-[10px] bg-white/10 px-2 py-0.5 border border-white/20 uppercase tracking-widest shrink-0">
             {isMilliy ? "Milliy Sertifikat" : exam.type}
           </span>
        </div>

        {/* TIMER */}
        <div className="flex items-center">
          <span className="text-xs uppercase font-bold tracking-wider mr-2 hidden sm:inline text-white/80">
            {isMilliy ? "Qolgan vaqt:" : "Time Remaining:"}
          </span>
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
             title={theme === "dark" ? (isMilliy ? "Yorug' rejim" : "Light Mode") : (isMilliy ? "Qorong'u rejim" : "Dark Mode")}
           >
             {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-300" />}
           </Button>
           <Button variant="ghost" size="icon" className="rounded-none hover:bg-white/10" onClick={toggleFullscreen}>
             {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
           </Button>
           {isMilliy ? (
             <Button 
               variant="ghost" 
               size="icon" 
               className="rounded-none hover:bg-white/10 text-emerald-400 hover:text-emerald-300" 
               onClick={() => setShowScratchpad(!showScratchpad)}
               title="Qoralama daftari (Doska)"
             >
               <PenLine className="h-4 w-4" />
             </Button>
           ) : (
             <Button variant="ghost" size="icon" className="rounded-none hover:bg-white/10" onClick={() => setShowCalculator(!showCalculator)}>
               <Calculator className="h-4 w-4" />
             </Button>
           )}
        </div>
      </header>

      {/* QUESTION AREA — both panels scroll independently */}
      <main className={cn(
        "flex-1 flex flex-col md:flex-row overflow-hidden transition-colors relative",
        isMilliy ? "bg-[#f1f5f9] dark:bg-[#060b13]" : "bg-[#f4f4f4] dark:bg-[#0c0817]"
      )}>
        {(isReading || kind === "writing") && sections[currentQuestion?.section_index] && (sections[currentQuestion?.section_index].passage || sections[currentQuestion?.section_index].imageUrl) && (
          <div
            style={{ width: `${leftWidth}%`, flexShrink: 0 }}
            className={cn(
              "h-full overflow-y-auto border-b md:border-b-0 md:border-r p-6 md:p-8 xl:p-12 transition-colors",
              isMilliy
                ? "bg-white dark:bg-[#0b1624] border-slate-200 dark:border-slate-800"
                : "bg-white dark:bg-[#140D23] border-slate-300 dark:border-slate-800"
            )}
          >
            <h2 className={cn("text-xl font-bold mb-6 uppercase tracking-widest border-b-2 pb-2",
              isMilliy ? "border-slate-200 dark:border-slate-800 text-[#0a192f] dark:text-white" : "border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
            )}>
              {sections[currentQuestion.section_index].title}
            </h2>
            {sections[currentQuestion.section_index].imageUrl && (
              <img src={getFullImageUrl(sections[currentQuestion.section_index].imageUrl)} className={cn("max-w-full border mb-6", isMilliy ? "border-slate-200 dark:border-slate-800" : "border-slate-300 dark:border-slate-800")} />
            )}
            <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 font-serif leading-loose text-lg whitespace-pre-wrap">
              {formatMathText(sections[currentQuestion.section_index].passage)}
            </div>
          </div>
        )}

        {(isReading || kind === "writing") && (
          <div
            onMouseDown={startResizing}
            className="hidden md:flex w-1 hover:w-2 bg-slate-200 hover:bg-blue-500 dark:bg-slate-800 dark:hover:bg-blue-600 cursor-col-resize shrink-0 transition-all duration-150 relative z-20 items-center justify-center group"
          >
            <div className="absolute h-8 w-8 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-md flex items-center justify-center pointer-events-none select-none">
              <GripHorizontal className="h-4 w-4 text-slate-400 group-hover:text-blue-500 rotate-90" />
            </div>
          </div>
        )}

        <div
          style={{ width: (isReading || kind === "writing") ? `${100 - leftWidth}%` : "100%" }}
          className={cn(
            "h-full overflow-y-auto flex flex-col p-6 md:p-8 xl:p-12 transition-colors relative",
            !(isReading || kind === "writing") && "max-w-5xl mx-auto border-x",
            isMilliy
              ? "bg-white dark:bg-[#0b1624] border-slate-200 dark:border-slate-800"
              : "bg-white dark:bg-[#140D23] border-slate-300 dark:border-slate-800"
          )}
        >
          {/* Listening Headphones overlay prompt */}
          {kind === "listening" && exam.audioUrl && !audioStarted && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center text-white z-30">
              <div className="relative mx-auto mb-8 flex h-40 w-40 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-inner">
                <Headphones className="h-16 w-16 text-blue-500 animate-bounce" />
              </div>
              <p className="max-w-md text-sm font-semibold leading-relaxed mb-6 text-slate-300">
                You will be listening to an audio clip during this test. You will not be permitted to pause or rewind the audio while answering the questions. To continue, click Play.
              </p>
              <Button 
                onClick={() => setAudioStarted(true)} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <Play className="h-4 w-4 fill-current" /> Play
              </Button>
            </div>
          )}

          {/* Listening Sticky player */}
          {kind === "listening" && exam.audioUrl && audioStarted && (
            <div className="mb-6 z-20">
              <CustomAudioPlayer src={exam.audioUrl} />
            </div>
          )}
          
          <div className="w-full flex-1 flex flex-col">
            {currentQuestion && (
              <div key={currentQuestion.id} className="w-full">
                
                {/* QUESTION HEADER */}
                <div className={cn("flex items-center justify-between border-b-2 pb-4 mb-8", 
                  isMilliy ? "border-[#10b981]" : "border-[#0f2c59] dark:border-blue-500"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn("h-8 w-8 text-white flex items-center justify-center text-sm font-bold", 
                      isMilliy ? "bg-[#0a192f]" : "bg-[#0f2c59] dark:bg-blue-600"
                    )}>
                      {currentQuestion.position}
                    </div>
                    <span className={cn("text-xs font-bold uppercase tracking-widest", 
                      isMilliy ? "text-[#059669] dark:text-[#10b981]" : "text-[#0f2c59] dark:text-blue-400"
                    )}>
                      {isMilliy ? `${currentQuestion.position} - savol (jami ${questions.length} ta)` : `Item ${currentQuestion.position} of ${questions.length}`}
                    </span>
                  </div>
                  <button 
                    className={cn(
                      "flex items-center text-xs font-bold uppercase tracking-widest px-3 py-1.5 border-2 transition-colors", 
                      flagged.has(currentQuestion.id)
                        ? (isMilliy ? "border-amber-500 text-amber-600" : "border-[#ca8a04] text-[#ca8a04]")
                        : (isMilliy ? "border-slate-200 dark:border-slate-800 text-slate-500 hover:border-[#10b981] hover:text-[#10b981]" : "border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-500 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-300")
                    )}
                    onClick={() => toggleFlag(currentQuestion.id)}
                  >
                    <Bookmark className={cn("w-3 h-3 mr-2", flagged.has(currentQuestion.id) ? "fill-current" : "")} /> 
                    {isMilliy ? (flagged.has(currentQuestion.id) ? "Belgilandi" : "Belgilash") : (flagged.has(currentQuestion.id) ? "Marked" : "Mark")}
                  </button>
                </div>

                {/* PROMPT */}
                <div className="text-xl md:text-2xl font-serif leading-relaxed text-slate-900 dark:text-white mb-8">
                  {formatMathText(currentQuestion.prompt)}
                </div>

                {/* MEDIA */}
                {currentQuestion.imageUrl && (
                  <img src={getFullImageUrl(currentQuestion.imageUrl)} className={cn("max-w-full border mb-8", isMilliy ? "border-slate-200 dark:border-slate-805" : "border-slate-300 dark:border-slate-800")} />
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
                              ? (isMilliy ? "border-[#10b981] bg-emerald-500/5 dark:bg-emerald-950/20" : "border-[#0f2c59] dark:border-blue-500 bg-[#f0f4f8] dark:bg-blue-950/20")
                              : (isMilliy ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1624] hover:border-[#10b981]" : "border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-[#0f2c59] dark:hover:border-blue-500")
                          )}
                        >
                          <div className={cn(
                            "h-6 w-6 border-2 flex items-center justify-center font-bold text-xs shrink-0 rounded-full",
                            isSelected 
                              ? (isMilliy ? "border-[#10b981] bg-[#10b981] text-white" : "border-[#0f2c59] dark:border-blue-500 bg-[#0f2c59] dark:bg-blue-500 text-white")
                              : (isMilliy ? "border-slate-300 dark:border-slate-700 text-slate-650 group-hover:border-[#10b981] group-hover:text-[#10b981]" : "border-slate-400 dark:border-slate-600 text-slate-600 dark:text-slate-400 group-hover:border-[#0f2c59] dark:group-hover:border-blue-500 group-hover:text-[#0f2c59] dark:group-hover:text-blue-400")
                          )}>
                            {labels[oIdx]}
                          </div>
                          <div className="flex-1">
                            {opt.imageUrl && <img src={getFullImageUrl(opt.imageUrl)} className={cn("h-16 object-contain mb-2 border", isMilliy ? "border-slate-200 dark:border-slate-800" : "border-slate-200 dark:border-slate-800")} />}
                            <span className={cn("text-lg", isMilliy ? "font-sans text-slate-800 dark:text-slate-200" : "font-serif text-slate-800 dark:text-slate-200")}>
                              {formatMathText(opt.text)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="w-full">
                    <Textarea 
                      rows={12}
                      className={cn("w-full p-6 text-lg font-serif rounded-none border-2 resize-none h-[400px] focus:ring-0 focus:outline-none", 
                        isMilliy 
                          ? "bg-white dark:bg-[#0b1624] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:border-[#10b981]" 
                          : "bg-white dark:bg-slate-950/30 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus:border-slate-500 dark:focus:border-slate-400"
                      )}
                      placeholder={isMilliy ? "Javobingizni shu yerga yozing..." : "Start typing your response here..."}
                      value={answers[currentQuestion.id] || ""}
                      onChange={(e) => onAnswer(currentQuestion.id, e.target.value)}
                    />
                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2 px-1">
                      <span>Words: {wordCount}</span>
                      <span>Characters: {(answers[currentQuestion.id] || "").length}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* EXAM NAVIGATOR - Formal Status Bar */}
      <footer className={cn("h-[70px] border-t flex items-center justify-between px-4 sm:px-6 z-40 transition-colors", 
        isMilliy ? "bg-white dark:bg-[#0a192f] border-slate-200 dark:border-slate-850" : "bg-slate-100 dark:bg-[#140D23] border-t border-slate-300 dark:border-slate-800"
      )}>
        
        <div className="flex items-center gap-2 sm:gap-4 w-1/2 sm:w-1/4">
          <Button 
            size="lg" 
            variant="outline" 
            onClick={() => setActiveQuestionIndex(Math.max(0, activeQuestionIndex - 1))}
            disabled={activeQuestionIndex === 0}
            className={cn("rounded-none border-2 font-bold text-xs uppercase tracking-widest", 
              isMilliy 
                ? "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900" 
                : "border-slate-400 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900"
            )}
          >
            <ChevronLeft className="w-4 h-4 mr-1 sm:mr-2" /> {isMilliy ? "Oldingi savol" : "Back"}
          </Button>
        </div>

        <div className="hidden md:flex flex-1 justify-center items-center gap-1.5 overflow-x-auto max-w-[60%] px-4 py-1 select-none scrollbar-thin">
          {questions.map((q, idx) => {
            const isCurrent = idx === activeQuestionIndex;
            const hasAns = !!answers[q.id];
            const isFlg = flagged.has(q.id);
            
            return (
              <button
                key={q.id}
                onClick={() => setActiveQuestionIndex(idx)}
                className={cn(
                  "h-8 w-8 text-xs font-black transition-all duration-200 border flex items-center justify-center rounded-lg hover:scale-105 shrink-0",
                  isCurrent 
                    ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20 hover:bg-blue-700" 
                    : isFlg
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                      : hasAns 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20" 
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border-transparent text-slate-600 dark:text-slate-400"
                )}
              >
                {q.position}
              </button>
            );
          })}
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
            className={cn("rounded-none font-bold text-xs uppercase tracking-widest text-white border-2 transition-colors", 
              isMilliy 
                ? "bg-[#059669] hover:bg-[#047857] border-[#059669] dark:bg-[#10b981] dark:hover:bg-[#059669] dark:border-[#10b981]" 
                : "bg-[#0f2c59] dark:bg-blue-600 hover:bg-[#1a365d] dark:hover:bg-blue-700 border-[#0f2c59] dark:border-blue-600"
            )}
          >
            {activeQuestionIndex === questions.length - 1 ? (isMilliy ? "Testni yakunlash" : "End Section") : (isMilliy ? "Keyingi savol" : "Next")} <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

      </footer>

      {showScratchpad && <Scratchpad isOpen={showScratchpad} onClose={() => setShowScratchpad(false)} />}
      <DesmosCalculator isOpen={showCalculator} onClose={() => setShowCalculator(false)} />

      {/* Cheating Warning Modal */}
      <AlertDialog open={showCheatingWarning} onOpenChange={setShowCheatingWarning}>
        <AlertDialogContent className={cn("rounded-3xl border text-white backdrop-blur-md max-w-md", 
          isMilliy ? "border-amber-500/30 bg-[#0a192f]/95" : "border-amber-500/30 bg-[#160E26]/95"
        )}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-extrabold text-amber-400 flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-amber-500 animate-bounce" /> {isMilliy ? "Ogohlantirish!" : "Warning!"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300 mt-2 text-sm leading-relaxed">
              {isMilliy 
                ? "Siz imtihon oynasini tark etdingiz (Alt-Tab yoki boshqa ilovaga o'tish). Imtihon oynasini yana bir marta tark etsangiz, javoblaringiz avtomatik ravishda yuboriladi va imtihon yakunlanadi!" 
                : "You have navigated away from the exam window (Alt-Tab or switched applications). If you leave the exam window one more time, your responses will be automatically submitted and the exam will end!"
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogAction
              onClick={() => setShowCheatingWarning(false)}
              className={cn("text-white font-bold rounded-xl py-2 w-full border-none shadow-lg", 
                isMilliy 
                  ? "bg-[#059669] hover:bg-[#047857] shadow-emerald-500/20" 
                  : "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20"
              )}
            >
              {isMilliy ? "Tushundim, imtihonni davom ettiraman" : "I understand, resume exam"}
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
              className={cn("w-full max-w-md rounded-3xl border p-8 text-center shadow-2xl", 
                isMilliy 
                  ? "border-rose-500/30 bg-[#0a192f] shadow-rose-950/20" 
                  : "border-rose-500/30 bg-[#160E26] shadow-rose-500/10"
              )}
            >
              <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/15">
                <Shield className="h-10 w-10 text-rose-500" />
              </div>
              <h3 className="text-2xl font-black tracking-tight text-white">
                {isMilliy ? "Imtihon Bloklandi! 🔒" : "Exam Locked! 🔒"}
              </h3>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                {isMilliy 
                  ? "Tizim qoidalariga ko'ra, imtihon oynasini ikki marta tark etganingiz sababli imtihoningiz bloklandi va javoblaringiz avtomatik ravishda saqlab topshirildi." 
                  : "According to system rules, because you left the exam window twice, your exam has been locked and your responses have been automatically submitted."
                }
              </p>
              <div className="mt-6 p-3 rounded-xl bg-rose-500/10 text-xs font-bold text-rose-400 border border-rose-500/20">
                {isMilliy ? "Imtihon faoliyati shubhali deb baholandi" : "Exam activity flagged as suspicious"}
              </div>
              <div className="mt-8">
                <Button
                  onClick={() => {
                    if (result) {
                      setShowCheatingLocked(false);
                    } else {
                      toast.info(isMilliy ? "Tizim javoblarni yuklamoqda, kuting..." : "System is submitting responses, please wait...");
                    }
                  }}
                  disabled={!result}
                  className={cn("w-full h-12 text-white font-bold text-base rounded-xl transition-all border-none", 
                    isMilliy ? "bg-[#059669] hover:bg-[#047857]" : "bg-rose-600 hover:bg-rose-700"
                  )}
                >
                  {isMilliy ? "Natijani ko'rish" : "View Result"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
