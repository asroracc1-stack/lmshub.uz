import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useBlocker, useBeforeUnload } from "react-router-dom";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2, Sparkles, CheckCircle2, Clock, AlertCircle, Headphones,
  BookOpen, ChevronLeft, ChevronRight, Flag, Play, Pause,
  Volume2, VolumeX, Maximize2, Minimize2, Mic, Calculator, X, PenLine
} from "lucide-react";
import { toast } from "sonner";
import { rawToBand, checkAnswer } from "@/lib/ielts";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import Scratchpad from "@/components/Scratchpad";
import TigerPlayer from "@/components/TigerPlayer";
import { useTheme } from "@/contexts/ThemeContext";
// Icons are already imported above

// Java API dan keluvchi tuzilma
interface QuestionOption { id: string; text: string; isCorrect?: boolean; positionOrder: number; imageUrl?: string; imagePosition?: string; }
interface Q { id: string; text: string; questionType: string; correctAnswer: string | null; points: number; positionOrder: number; passageId: string; options: QuestionOption[] | null; imageUrl?: string; imagePosition?: string; }
interface Passage { id: string; title: string; content: string; imageUrl?: string; positionOrder: number; questions: Q[]; }
interface ExamData { id: string; title: string; description?: string; type: string; difficulty?: string; audio_url?: string; duration_minutes: number; passages: Passage[]; }

// MockTake ichki state uchun normallashtirish
interface NormalQ { id: string; position: number; section_index: number; prompt: string; qtype: string; options: QuestionOption[] | null; correct_answer: string | null; points: number; imageUrl?: string; imagePosition?: string; }

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
  (exam.passages ?? []).forEach((p, sIdx) => {
    sections.push({ title: p.title ?? "", passage: p.content ?? "", imageUrl: p.imageUrl ?? "" });
    (p.questions ?? []).forEach((q) => {
      const qtype = mapQtype(q.questionType);
      // Options: faqat mcq/matching/headings uchun kerak
      const rawOpts = q.options && q.options.length > 0 ? [...q.options].sort((a, b) => a.positionOrder - b.positionOrder) : null;
      questions.push({
        id: q.id,
        position: questions.length + 1, // Global question number
        section_index: sIdx,
        prompt: q.text ?? "",
        qtype,
        options: rawOpts,
        correct_answer: q.correctAnswer ?? null,
        points: q.points ?? 1,
        imageUrl: q.imageUrl,
        imagePosition: q.imagePosition,
      });
    });
  });
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
  const { theme } = useTheme();
  const { testId } = useParams();
  const nav = useNavigate();

  const [exam, setExam] = useState<ExamData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
  const [timeLeft, setTimeLeft] = useState(0);
  const [started, setStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [grading, setGrading] = useState(false);
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
      })
      .catch((err) => {
        const msg = err?.response?.data?.message ?? err?.message ?? "Exam yuklanmadi";
        setLoadError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, [testId]);

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
    setAnswers((p) => ({ ...p, [qid]: val }));
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
    if (!auto && !window.confirm("Testni topshirmoqchimisiz?")) return;

    setSubmitting(true);
    try {
      Object.keys(questionStartRef.current).forEach(trackQuestionTime);
      const kind = (exam.type ?? "").toLowerCase();

      const payload = {
        exam_id: exam.id,
        answers: answers,
        time_spent: timeSpentRef.current,
        writing_answer: writingAnswer || null
      };

      const res = await api.post("/exams/submit", payload);
      setResult({ ...res.data, kind });
      toast.success("Natijangiz hisoblandi!");
    } catch (err: any) {
      console.error("Submission error:", err);
      toast.error("Natijani yuborishda xatolik: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
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
        <h2 className="text-2xl font-bold animate-pulse">AI javobingizni tahlil qilmoqda...</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Tajribali IELTS imtihonchisi kabi kriteriyalar asosida baholanmoqda. Bu taxminan 10-20 soniya vaqt oladi.
        </p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Test yuklanmoqda...</p>
    </div>
  );

  if (loadError || !exam) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
      <AlertCircle className="h-12 w-12 text-rose-500" />
      <h2 className="text-xl font-bold">Test topilmadi</h2>
      <p className="text-sm text-muted-foreground">{loadError ?? "Noma'lum xatolik"}</p>
      <Button variant="outline" onClick={() => nav(-1)}>Orqaga</Button>
    </div>
  );

  const kind = (exam.type ?? "").toLowerCase();

  if (result) {
    const isExam = result.kind === "reading" || result.kind === "listening";
    const band = result.bandScore ?? result.band;

    return (
      <div className="w-full space-y-6 pb-20">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-8 text-center bg-gradient-to-br from-primary/10 via-violet-500/5 to-emerald-500/10 border-primary/30 relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl" />
            <div className="h-32 w-32 mx-auto mb-4 relative z-10">
              <TigerPlayer text="" />
            </div>
            <h2 className="text-4xl font-display font-bold mb-2 relative z-10">Tabriklaymiz!</h2>
            <p className="text-muted-foreground mb-6 relative z-10">Test muvaffaqiyatli topshirildi</p>

            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-display font-bold">Test yakunlandi!</h2>

            <div className="mt-8 flex flex-col items-center">
              <div className="relative h-40 w-40 flex items-center justify-center">
                <svg className="h-full w-full -rotate-90">
                  <circle
                    cx="80" cy="80" r="70"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-muted/20"
                  />
                  <circle
                    cx="80" cy="80" r="70"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={440}
                    strokeDashoffset={440 - (440 * (Number(band) || 0)) / 9}
                    strokeLinecap="round"
                    className="text-primary transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-display font-bold bg-gradient-to-br from-primary to-violet-500 bg-clip-text text-transparent">
                    {band || "0.0"}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">Band Score</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4 font-medium uppercase tracking-widest">IELTS {result.kind}</p>
            </div>

            {isExam && (
              <div className="mt-8 grid grid-cols-3 gap-4 max-w-md mx-auto">
                <Card className="p-4 bg-background/50 backdrop-blur border-emerald-500/20">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">To'g'ri</p>
                  <p className="text-2xl font-bold text-emerald-500">{result.correct}</p>
                </Card>
                <Card className="p-4 bg-background/50 backdrop-blur">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Jami</p>
                  <p className="text-2xl font-bold">{result.total}</p>
                </Card>
                <Card className="p-4 bg-background/50 backdrop-blur border-primary/20">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">%</p>
                  <p className="text-2xl font-bold text-primary">
                    {Math.round((result.correct / Math.max(result.total, 1)) * 100)}%
                  </p>
                </Card>
              </div>
            )}
          </Card>
        </motion.div>
        <div className="flex gap-3 mt-4">
          <Button onClick={() => nav(-1)} variant="outline" size="lg" className="flex-1">
            Chiqish
          </Button>
          <Button onClick={() => window.location.reload()} size="lg" className="flex-1">
            Qaytadan topshirish
          </Button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-[85vh] w-full flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <Card className="p-8 space-y-5 shadow-xl border border-slate-200/50 dark:border-white/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
            <div className="flex items-center gap-3">
              {kind === "reading" ? <BookOpen className="h-8 w-8 text-violet-500" /> : kind === "listening" ? <Headphones className="h-8 w-8 text-amber-500" /> : <Sparkles className="h-8 w-8 text-emerald-500" />}
              <div>
                <Badge variant="outline">{exam.type}</Badge>
                <h1 className="text-2xl md:text-3xl font-display font-bold">{exam.title}</h1>
              </div>
            </div>
            {exam.description && <p className="text-muted-foreground">{exam.description}</p>}

            {(kind === "listening" || exam.title.toLowerCase().includes("listening")) && (
              <div className="py-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 ml-1">Sound Check</p>
                <CustomAudioPlayer src={exam.audio_url || (exam as any).audioUrl} />
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 text-center"><Clock className="h-5 w-5 mx-auto mb-1 text-primary" /><p className="text-xs text-muted-foreground">Vaqt</p><p className="font-bold">{exam.duration_minutes} daq</p></Card>
              <Card className="p-3 text-center"><Flag className="h-5 w-5 mx-auto mb-1 text-primary" /><p className="text-xs text-muted-foreground">Savollar</p><p className="font-bold">{questions.length}</p></Card>
              <Card className="p-3 text-center"><Sparkles className="h-5 w-5 mx-auto mb-1 text-primary" /><p className="text-xs text-muted-foreground">Qiyinlik</p><p className="font-bold capitalize">{exam.difficulty ?? "—"}</p></Card>
            </div>
            <Button size="lg" className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold transition-all duration-300 shadow-md shadow-emerald-500/10" onClick={() => { setStarted(true); startedAt.current = Date.now(); }}>
              Boshlash
            </Button>
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
        <Button size="lg" className="w-full" onClick={() => submit()} disabled={submitting}>
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

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-[#070b19] text-slate-900 dark:text-slate-100 flex flex-col select-none overflow-x-hidden font-sans">
      {/* 🚀 PREMIUM HUD HEADER */}
      <header className={cn(
        "h-16 shrink-0 border-b flex items-center justify-between px-4 md:px-8 sticky top-0 z-40 backdrop-blur-xl transition-all duration-300",
        theme === "dark"
          ? "bg-slate-950/80 border-white/5 shadow-lg shadow-black/20"
          : "bg-white/80 border-slate-200/80 shadow-sm"
      )}>
        {/* Left Side: Brand & Title (Hidden on Mobile) */}
        <div className="hidden md:flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20">
              L
            </div>
            <span className="font-display font-extrabold text-base tracking-tight hidden sm:block">
              LMS<span className="text-emerald-500">Hub</span>
            </span>
          </div>
          <div className="h-5 w-px bg-slate-200 dark:bg-white/10 shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant="outline" className="capitalize text-[10px] font-extrabold border-emerald-500/30 text-emerald-600 bg-emerald-500/5 px-2.5 py-0.5 shrink-0">
              IELTS {exam.type}
            </Badge>
            <h1 className="font-bold text-sm truncate opacity-90 hidden md:block max-w-[240px] xl:max-w-[400px]" title={exam.title}>
              {exam.title}
            </h1>
          </div>
        </div>

        {/* Center: Glowing Pulse Timer (Absolute on Desktop, Normal flow on Mobile) */}
        <div className="md:absolute md:left-1/2 md:-translate-x-1/2 flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2.5 px-4 md:px-5 py-2 md:py-2.5 rounded-2xl font-mono font-black text-xs md:text-sm transition-all duration-500 shadow-sm",
            lowTime
              ? "bg-rose-500 text-white animate-pulse shadow-rose-500/20 border border-rose-400/20"
              : "bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-emerald-400 border border-slate-200/50 dark:border-white/5"
          )}>
            <Clock className={cn("h-4 w-4", lowTime ? "animate-spin" : "text-emerald-500")} />
            <span className="tracking-widest">{fmt(timeLeft)}</span>
          </div>
        </div>

        {/* Right Side: Stats & Utility Controls */}
        <div className="flex items-center gap-2 md:gap-4 ml-auto md:ml-0">
          {/* Progress Tracker */}
          <div className="hidden lg:flex flex-col items-end text-xs shrink-0">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Topshirildi
            </span>
            <span className="font-black text-slate-700 dark:text-slate-300">
              {answeredCount} / {questions.length} savol
            </span>
          </div>

          <div className="h-5 w-px bg-slate-200 dark:bg-white/10 shrink-0 hidden lg:block" />

          {/* Calculator Button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowCalculator(!showCalculator)}
            className={cn(
              "h-10 w-10 rounded-xl transition-all shrink-0 hidden sm:inline-flex",
              showCalculator ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : "bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300"
            )}
            title="Desmos kalkulyator"
          >
            <Calculator className="h-4.5 w-4.5" />
          </Button>

          {/* Scratchpad Button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowScratchpad(!showScratchpad)}
            className={cn(
              "h-10 w-10 rounded-xl transition-all shrink-0 hidden sm:inline-flex",
              showScratchpad ? "bg-violet-500/10 text-violet-500 hover:bg-violet-500/20" : "bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300"
            )}
            title="Qoralama daftari"
          >
            <PenLine className="h-4.5 w-4.5" />
          </Button>

          {/* Pause Button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsPaused(!isPaused)}
            className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all shrink-0"
            title={isPaused ? "Davom ettirish" : "Vaqtincha to'xtatish"}
          >
            {isPaused ? <Play className="h-4.5 w-4.5 fill-current text-emerald-500" /> : <Pause className="h-4.5 w-4.5 fill-current" />}
          </Button>

          {/* Fullscreen Button (Hidden on Mobile) */}
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleFullscreen}
            className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all shrink-0 hidden sm:inline-flex"
            title="To'liq ekran rejimi"
          >
            {isFullscreen ? <Minimize2 className="h-4.5 w-4.5" /> : <Maximize2 className="h-4.5 w-4.5" />}
          </Button>

          {/* Direct Submit Button */}
          <Button
            size="sm"
            onClick={() => submit()}
            disabled={submitting}
            className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-extrabold px-4 md:px-5 py-2 md:py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/10 shrink-0 text-[11px] md:text-xs tracking-tight"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
            Yakunlash
          </Button>
        </div>
      </header>

      {/* 🎧 LISTENING COMPACT PLAYER */}
      {(kind === "listening" || exam.title.toLowerCase().includes("listening")) && (
        <div className="shrink-0 w-full max-w-[1440px] mx-auto px-4 md:px-8 py-3 bg-transparent z-30">
          <CustomAudioPlayer
            src={exam.audio_url || (exam as any).audioUrl}
            isExternalPaused={isPaused}
          />
        </div>
      )}

      {/* ⏸️ PAUSE OVERLAY */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="h-48 w-48 mb-6">
              <TigerPlayer />
            </div>
            <h2 className="text-3xl font-display font-black text-white mb-2 tracking-tight">Test to'xtatildi</h2>
            <p className="text-slate-400 max-w-md mb-8 text-sm">Hozir dam olib oling. Taymer siz davom ettirmaguningizcha to'xtatib turiladi.</p>
            <Button
              size="lg"
              onClick={() => setIsPaused(false)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-6 rounded-full font-black text-base transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Play className="h-5 w-5 mr-2 fill-current" /> Davom ettirish
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📝 EXAM WORKSPACE */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 md:px-8 py-4 min-h-0 flex flex-col">
        <div className={cn(
          "grid gap-8 xl:gap-12 flex-1 min-h-0",
          kind === "reading" && (currentSection?.passage || currentSection?.imageUrl) ? "lg:grid-cols-2" : "grid-cols-1"
        )}>
          {/* LEFT PANEL: PASSAGE (READING ONLY) */}
          {kind === "reading" && (currentSection?.passage || currentSection?.imageUrl) && (
            <Card className="flex flex-col min-h-[calc(100vh-180px)] w-full max-w-3xl mx-auto border-slate-200/50 dark:border-white/5 shadow-xl shadow-slate-100/50 dark:shadow-none bg-white dark:bg-slate-900/40 backdrop-blur-md rounded-2xl overflow-hidden">
              {currentSection.title && (
                <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/20">
                  <h2 className="font-display font-extrabold text-base tracking-tight text-slate-800 dark:text-white">
                    {currentSection.title}
                  </h2>
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-6">
                {currentSection.imageUrl && (
                  <div className="rounded-xl overflow-hidden border border-slate-200/60 dark:border-white/5 bg-slate-50 dark:bg-slate-950 p-3 shadow-inner">
                    <img src={currentSection.imageUrl} alt="Map/Diagram" className="max-w-full h-auto mx-auto rounded-lg" />
                  </div>
                )}
                <div className="prose prose-slate dark:prose-invert max-w-none text-slate-750 dark:text-slate-350 text-sm md:text-base leading-relaxed font-normal whitespace-pre-wrap select-text selection:bg-emerald-500/20 selection:text-emerald-500">
                  {currentSection.passage}
                </div>
              </div>
            </Card>
          )}

          {/* RIGHT PANEL: QUESTIONS */}
          <Card className="flex flex-col min-h-[calc(100vh-180px)] w-full max-w-3xl mx-auto border-slate-200/50 dark:border-white/5 shadow-xl shadow-slate-100/50 dark:shadow-none bg-white dark:bg-slate-900/40 backdrop-blur-md rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-950/20">
              <span className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Savollar va Topshiriqlar
              </span>
              <span className="text-xs font-black text-emerald-500">
                {sectionQs.length} ta savol
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-6">
              {/* Listening Visual Reference */}
              {kind === "listening" && currentSection?.imageUrl && (
                <div className="mb-6 rounded-2xl overflow-hidden border border-slate-200/60 dark:border-white/5 bg-slate-50 dark:bg-slate-950 p-3 shadow-inner">
                  <img src={currentSection.imageUrl} alt="Map/Diagram" className="max-w-full h-auto mx-auto rounded-lg" />
                  <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-widest font-black">Visual Reference</p>
                </div>
              )}

              {sectionQs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                  <AlertCircle className="h-10 w-10 text-slate-300 dark:text-slate-700 animate-pulse" />
                  <p className="text-slate-400 dark:text-slate-500 text-sm font-semibold">Bu bo'limda hech qanday savollar kiritilmagan.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {sectionQs.map((q) => {
                    // isInline only if fill/short AND no options exist
                    const isInline = (q.qtype === "fill" || q.qtype === "short") && (!q.options || q.options.length === 0);
                    const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];
                    const hasAnswer = !!answers[q.id];
                    const isFlagged = flagged.has(q.id);

                    return (
                      <div
                        key={q.id}
                        id={`q-${q.id}`}
                        className={cn(
                          "group rounded-2xl p-4 md:p-5 border transition-all duration-300",
                          isFlagged
                            ? "bg-amber-500/5 border-amber-500/20 shadow-sm shadow-amber-500/5"
                            : hasAnswer
                              ? "bg-emerald-500/5 border-emerald-500/20 shadow-sm shadow-emerald-500/5"
                              : "bg-slate-50/50 dark:bg-white/[0.01] border-slate-200/60 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10"
                        )}
                      >
                        <div className="flex items-start gap-4">
                          {/* Question Number Badge */}
                          <span className={cn(
                            "flex-none h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black shadow-sm transition-all duration-300",
                            isFlagged
                              ? "bg-amber-500 text-white shadow-amber-500/10"
                              : hasAnswer
                                ? "bg-emerald-500 text-white shadow-emerald-500/10"
                                : "bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-350"
                          )}>
                            {q.position}
                          </span>

                          {/* Question Content */}
                          <div className="flex-1 min-w-0">
                            {isInline ? (
                              <div className="text-slate-800 dark:text-slate-200 font-medium space-y-2">
                                {/* Show image even for inline/short answer questions */}
                                {q.imageUrl && (
                                  <div className="mb-3">
                                    {q.imagePosition === "top" && <img src={q.imageUrl} alt="Question" className="max-h-64 w-auto rounded-xl object-contain border border-slate-200 dark:border-white/10 shadow-sm" />}
                                    {q.imagePosition === "left" && <img src={q.imageUrl} alt="Question" className="float-left mr-3 max-h-40 rounded-xl object-contain border border-slate-200 dark:border-white/10" />}
                                    {q.imagePosition === "right" && <img src={q.imageUrl} alt="Question" className="float-right ml-3 max-h-40 rounded-xl object-contain border border-slate-200 dark:border-white/10" />}
                                    {q.imagePosition === "bottom" && <img src={q.imageUrl} alt="Question" className="max-h-64 w-auto rounded-xl object-contain border border-slate-200 dark:border-white/10 shadow-sm" />}
                                  </div>
                                )}
                                {renderInlinePrompt(q)}
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <p className="text-slate-800 dark:text-slate-200 font-bold text-sm md:text-base leading-snug">
                                  {q.imagePosition === "top" && q.imageUrl && <img src={q.imageUrl} alt="Question" className="mb-3 max-h-48 rounded object-contain border" />}
                                  {q.imagePosition === "left" && q.imageUrl && <img src={q.imageUrl} alt="Question" className="float-left mr-3 max-h-48 rounded object-contain border" />}
                                  {q.prompt}
                                  {q.imagePosition === "right" && q.imageUrl && <img src={q.imageUrl} alt="Question" className="float-right ml-3 max-h-48 rounded object-contain border" />}
                                  {q.imagePosition === "bottom" && q.imageUrl && <img src={q.imageUrl} alt="Question" className="mt-3 max-h-48 rounded object-contain border" />}
                                </p>

                                {/* Multiple Choice options */}
                                {q.qtype === "mcq" && Array.isArray(q.options) && q.options.length > 0 ? (
                                  <div className="grid gap-2.5 mt-3">
                                    {q.options.map((optObj, idx) => {
                                      const opt = optObj.text;
                                      const letter = LETTERS[idx] ?? String(idx + 1);
                                      const selected = answers[q.id] === opt;
                                      return (
                                        <button
                                          key={optObj.id || idx}
                                          type="button"
                                          onClick={() => onAnswer(q.id, opt)}
                                          className={cn(
                                            "w-full flex items-center gap-3.5 px-4 py-3 rounded-xl border text-xs md:text-sm text-left transition-all duration-200",
                                            selected
                                              ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20 font-bold"
                                              : "bg-white dark:bg-slate-950 hover:bg-slate-100/50 dark:hover:bg-white/[0.03] border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300"
                                          )}
                                        >
                                          <span className={cn(
                                            "flex-none w-6 h-6 rounded-lg border flex items-center justify-center text-[10px] font-black tracking-wider transition-all",
                                            selected
                                              ? "bg-white text-emerald-500 border-white shadow-inner"
                                              : "border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-500"
                                          )}>
                                            {letter}
                                          </span>
                                          <span className="flex-1 leading-snug flex items-center gap-3">
                                            {optObj.imagePosition === 'left' && optObj.imageUrl && <img src={optObj.imageUrl} alt="Option" className="max-h-16 rounded border bg-white object-contain" />}
                                            <span className="flex-1">
                                              {optObj.imagePosition === 'top' && optObj.imageUrl && <img src={optObj.imageUrl} alt="Option" className="max-h-16 rounded border bg-white object-contain mb-2" />}
                                              {opt}
                                              {optObj.imagePosition === 'bottom' && optObj.imageUrl && <img src={optObj.imageUrl} alt="Option" className="max-h-16 rounded border bg-white object-contain mt-2" />}
                                            </span>
                                            {optObj.imagePosition === 'right' && optObj.imageUrl && <img src={optObj.imageUrl} alt="Option" className="max-h-16 rounded border bg-white object-contain" />}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : q.qtype === "mcq" ? (
                                  <div className="mt-2">
                                    {renderInlineInput(q)}
                                  </div>
                                ) : null}

                                {/* TFNG / YNNG Buttons */}
                                {(q.qtype === "tfng" || q.qtype === "ynng") && (
                                  <div className="grid grid-cols-3 gap-2 mt-3">
                                    {(q.qtype === "tfng" ? ["TRUE", "FALSE", "NOT GIVEN"] : ["YES", "NO", "NOT GIVEN"]).map((v) => {
                                      const selected = answers[q.id] === v;
                                      return (
                                        <button
                                          key={v}
                                          onClick={() => onAnswer(q.id, v)}
                                          className={cn(
                                            "py-3 rounded-xl text-[10px] md:text-xs font-black tracking-wider border transition-all duration-200 active:scale-95",
                                            selected
                                              ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/10"
                                              : "bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400"
                                          )}
                                        >
                                          {v}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Matching / Headings Dropdown */}
                                {(q.qtype === "matching" || q.qtype === "headings") && Array.isArray(q.options) && (
                                  <select
                                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-950 text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-350 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all outline-none"
                                    value={answers[q.id] ?? ""}
                                    onChange={(e) => onAnswer(q.id, e.target.value)}
                                  >
                                    <option value="">— Variantni tanlang —</option>
                                    {q.options.map((o) => <option key={o.id || o.text} value={o.text}>{o.text}</option>)}
                                  </select>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Flag/Bookmark Button */}
                          <button
                            onClick={() => toggleFlag(q.id)}
                            className={cn(
                              "p-2 rounded-xl border transition-all shrink-0 hover:scale-105 active:scale-95",
                              isFlagged
                                ? "text-amber-500 bg-amber-500/10 border-amber-500/20 opacity-100"
                                : "text-slate-300 dark:text-slate-600 hover:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 border-transparent"
                            )}
                            title="Keyinchalik qaytish uchun belgilash"
                          >
                            <Flag className={cn("h-4 w-4", isFlagged && "fill-current")} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* In-Panel Next/Prev Buttons */}
              <div className="flex justify-between pt-6 border-t border-slate-100 dark:border-white/5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSectionIdx((i) => Math.max(0, i - 1))}
                  disabled={sectionIdx === 0}
                  className="rounded-xl border-slate-200 dark:border-white/5 px-4 h-10 font-bold hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  <ChevronLeft className="h-4 w-4 mr-1.5" /> Oldingi Passage
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSectionIdx((i) => Math.min(sections.length - 1, i + 1))}
                  disabled={sectionIdx === sections.length - 1}
                  className="rounded-xl border-slate-200 dark:border-white/5 px-4 h-10 font-bold hover:bg-slate-50 dark:hover:bg-white/5"
                >
                  Keyingi Passage <ChevronRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>

      {/* 🎛️ FLOATING GLASSMORPHIC BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200/50 dark:border-white/5 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-[0_-12px_40px_rgba(0,0,0,0.1)] pb-safe shrink-0">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-3.5 flex items-center gap-4 justify-between overflow-x-auto scroll-smooth no-scrollbar select-none">
          <div className="flex items-center gap-3 shrink-0 flex-nowrap">
            {sections.map((s, i) => {
              const sQs = questions.filter((q) => q.section_index === i);
              const isActive = sectionIdx === i;
              const partLabel = kind === "reading" ? `Passage ${i + 1}` : `Part ${i + 1}`;
              return (
                <div key={i} className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setSectionIdx(i)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all duration-300 border active:scale-95",
                      isActive
                        ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20"
                        : "bg-slate-100 dark:bg-white/5 text-slate-500 border-transparent hover:bg-slate-200/60 dark:hover:bg-white/10 hover:text-slate-800 dark:hover:text-white"
                    )}
                  >
                    {partLabel}
                  </button>

                  {isActive ? (
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      {sQs.map((q) => {
                        const hasAns = !!answers[q.id];
                        const isFlg = flagged.has(q.id);
                        return (
                          <button
                            key={q.id}
                            onClick={() => {
                              const el = document.getElementById(`q-${q.id}`);
                              el?.scrollIntoView({ behavior: "smooth", block: "center" });
                            }}
                            className={cn(
                              "h-8 w-8 rounded-xl text-[10px] font-black border transition-all shrink-0 hover:scale-105 active:scale-90",
                              hasAns
                                ? "bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/10"
                                : isFlg
                                  ? "bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/10"
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/5 hover:border-emerald-500/40 text-slate-600 dark:text-slate-400"
                            )}
                          >
                            {q.position}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 whitespace-nowrap px-1.5 bg-slate-100 dark:bg-white/5 py-1.5 rounded-lg border border-slate-200/50 dark:border-transparent">
                      {sQs.filter((q) => answers[q.id]).length} / {sQs.length}
                    </span>
                  )}
                  {i < sections.length - 1 && <div className="w-[1px] h-6 bg-slate-200 dark:bg-white/10 mx-1 shrink-0" />}
                </div>
              );
            })}
          </div>

          <div className="flex-none w-px h-6 bg-slate-200 dark:bg-white/10 shrink-0 mx-2 hidden sm:block" />

          <Button
            size="default"
            onClick={() => submit()}
            disabled={submitting}
            className="shrink-0 bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-black rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md px-6 h-10 text-xs tracking-tight"
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Testni tugatish
          </Button>
        </div>
        <Progress value={(answeredCount / Math.max(questions.length, 1)) * 100} className="h-1 bg-slate-100 dark:bg-white/5" />
      </div>

      {/* ⚠️ NAVIGATION GUARD ALERT */}
      <AlertDialog open={blocker.state === "blocked"}>
        <AlertDialogContent className="max-w-[400px] border-slate-200 dark:border-white/5 dark:bg-[#090d1f] shadow-2xl rounded-2xl">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-rose-500/10 rounded-full">
                <AlertCircle className="h-10 w-10 text-rose-500 animate-pulse" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-xl font-bold">Diqqat! Test davom etmoqda</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
              Agar sahifadan hozir chiqsangiz, barcha belgilangan javoblaringiz va mehnatotingiz saqlanmasligi mumkin.
              <br /><br />
              Chindan ham chiqmoqchimisiz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <AlertDialogCancel
              onClick={() => blocker.reset?.()}
              className="flex-1 border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 font-bold h-11 rounded-xl"
            >
              Testda qolish
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                blocker.proceed?.();
              }}
              className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold h-11 rounded-xl shadow-md shadow-rose-500/10"
            >
              Testni yakunlash va chiqish
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
              <span className="font-bold text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300"><Calculator className="h-4 w-4 text-emerald-500" /> Desmos Graphing Calculator</span>
              <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full hover:bg-slate-200 dark:hover:bg-white/10" onClick={() => setShowCalculator(false)}><X className="h-4 w-4 text-slate-500" /></Button>
            </div>
            <div className="flex-1 w-full bg-white relative">
              {/* Note: Desmos doesn't support embedding calculator.js without an API key easily in React without the script, so we use their standard embed iframe */}
              <iframe src="https://www.desmos.com/calculator" width="100%" height="100%" style={{ border: 0 }}></iframe>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

