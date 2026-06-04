import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, BookOpen, Mic, MicOff, Loader2, Sparkles, Lightbulb, Award, 
  ChevronLeft, ChevronRight, RotateCw, ChevronDown, ChevronUp, Play, Pause, 
  CheckCircle2, AlertCircle, Bookmark, Volume2, Settings, HelpCircle
} from "lucide-react";
import { TOPICS } from "./speakingTopicsData";

import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { usePracticeLogger } from "@/hooks/usePracticeLogger";

type Tab = "questions" | "vocab" | "ideas" | "answers";

interface Feedback {
  band?: number;
  fluency?: number;
  lexical?: number;
  grammar?: number;
  pronunciation?: number;
  pronunciation_hint?: string;
  grammar_feedback?: string;
  vocabulary_feedback?: string;
  strengths?: string[];
  improvements?: string[];
  model_answer?: string;
  audio_url?: string;
  is_test_mode?: boolean;
}

const getSpeechRecognition = () =>
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export default function SpeakingTopicDetail({ basePath = "/user" }: { basePath?: string }) {
  const { slug } = useParams();
  const nav = useNavigate();
  const { session, role } = useAuth();
  const topic = useMemo(() => TOPICS.find((t) => t.slug === slug), [slug]);

  // Track active minutes on this practice page
  usePracticeLogger("speaking");

  const [tab, setTab] = useState<Tab>("questions");
  const [partIdx, setPartIdx] = useState(0); // 0 = part1, 1 = part2, 2 = part3
  const [qIdx, setQIdx] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [recording, setRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [menuOpen, setMenuOpen] = useState(true);

  // Audio Recording (MediaRecorder) States
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playingVoice, setPlayingVoice] = useState(false);
  
  const recRef = useRef<any>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const finalRef = useRef("");

  // Helper content caches
  type VocabItem = { word: string; type?: string; meaning: string; example: string };
  type IdeaItem = { title: string; explanation: string; example: string };
  type AnswerItem = { band: number; answer: string; highlight?: string };
  const [helperLoading, setHelperLoading] = useState<Record<string, boolean>>({});
  const [vocabCache, setVocabCache] = useState<Record<string, VocabItem[]>>({});
  const [ideasCache, setIdeasCache] = useState<Record<string, IdeaItem[]>>({});
  const [answersCache, setAnswersCache] = useState<Record<string, AnswerItem[]>>({});

  if (!topic) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground">Topic topilmadi</p>
        <Button asChild variant="link"><Link to={`${basePath}/speaking/topics`}>Mavzularga qaytish</Link></Button>
      </div>
    );
  }

  const partsMeta = [
    { label: "Qism 1", sub: "Tanish mavzular", count: topic.part1.length },
    { label: "Qism 2", sub: "Uzun nutq (karta)", count: 1 },
    { label: "Qism 3", sub: "Muhokama", count: topic.part3.length },
  ];

  const currentQuestion =
    partIdx === 0 ? topic.part1[qIdx] :
    partIdx === 1 ? topic.part2.cue :
    topic.part3[qIdx];

  const totalQ = partIdx === 0 ? topic.part1.length : partIdx === 1 ? 1 : topic.part3.length;

  useEffect(() => {
    setQIdx(0); 
    resetAudioStates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partIdx]);

  useEffect(() => {
    resetAudioStates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIdx]);

  const resetAudioStates = () => {
    setTranscript(""); 
    setFeedback(null); 
    finalRef.current = ""; 
    stopRec();
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    stopAudioPlayback();
  };

  const startRec = async () => {
    const SR = getSpeechRecognition();
    
    // 1. Initialize MediaRecorder for high-fidelity audio capture
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } 
      });
      
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : undefined;
        
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      
      mr.ondataavailable = (e) => { 
        if (e.data.size > 0) chunksRef.current.push(e.data); 
      };
      
      mr.onstop = () => {
        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };
      
      mr.start(250);
      mediaRecRef.current = mr;
    } catch (err: any) {
      console.warn("MediaRecorder mic access error:", err);
      toast.error("Mikrofondan ovoz yozib olish imkoni bo'lmadi.");
    }

    // 2. Initialize real-time Web SpeechRecognition as an instant-feedback overlay
    if (SR) {
      try {
        const r = new SR();
        r.lang = "en-US"; 
        r.continuous = true; 
        r.interimResults = true;
        finalRef.current = "";
        setTranscript("");
        
        r.onresult = (e: any) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const txt = e.results[i][0].transcript;
            if (e.results[i].isFinal) {
              finalRef.current = (finalRef.current + " " + txt).replace(/\s+/g, " ").trim();
            } else {
              interim += txt;
            }
          }
          setTranscript((finalRef.current + " " + interim).replace(/\s+/g, " ").trim());
        };
        
        r.onerror = (e: any) => { 
          if (e.error !== "no-speech" && e.error !== "aborted") {
            console.warn("SpeechRecognition error: " + e.error);
          }
        };
        
        r.onend = () => setRecording(false);
        r.start();
        recRef.current = r;
      } catch (err: any) {
        console.warn("SpeechRecognition error:", err);
      }
    } else {
      toast.info("Eslatma: Brauzeringizda real vaqtda transkriptlash rejimi mavjud emas, lekin ovozingiz to'liq yozib olinadi va baholanadi!");
    }

    setRecording(true);
    stopAudioPlayback();
  };

  const stopRec = () => {
    try { recRef.current?.stop(); } catch {/* noop */ }
    try { 
      if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
        mediaRecRef.current.stop(); 
      }
    } catch {/* noop */}
    setRecording(false);
  };

  const playRecordedAudio = () => {
    const playUrl = feedback?.audio_url || audioUrl;
    if (!playUrl) return;

    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }

      const player = new Audio(playUrl);
      audioPlayerRef.current = player;
      
      player.onended = () => {
        setPlayingVoice(false);
        audioPlayerRef.current = null;
      };
      
      player.onerror = () => {
        setPlayingVoice(false);
        audioPlayerRef.current = null;
        toast.error("Ovozli faylni eshitib bo'lmadi.");
      };

      setPlayingVoice(true);
      player.play().catch(() => {
        setPlayingVoice(false);
        toast.error("Audio ijro etish bloklandi.");
      });
    } catch (e) {
      setPlayingVoice(false);
    }
  };

  const stopAudioPlayback = () => {
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    } catch {/* noop */}
    audioPlayerRef.current = null;
    setPlayingVoice(false);
  };

  const grade = async () => {
    if (!transcript.trim() && !audioBlob) { 
      toast.error("Avval mikrofon tugmasini bosib gapiring!"); 
      return; 
    }
    
    setSubmitting(true);
    stopAudioPlayback();

    try {
      const fd = new FormData();
      if (audioBlob) {
        fd.append("audio", audioBlob, "user_speaking.webm");
      }
      fd.append("question", currentQuestion);
      fd.append("part", String(partIdx + 1));
      fd.append("topic", topic.title);
      fd.append("user_role", role || "student");
      fd.append("transcript", transcript);

      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/speaking-feedback`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: fd,
      });

      const data = await r.json();
      if (!r.ok) { 
        toast.error(data?.error ?? "Baho olishda xatolik yuz berdi."); 
        setSubmitting(false); 
        return; 
      }

      if (data.transcript) {
        setTranscript(data.transcript);
      }

      setFeedback(data);
      toast.success(
        role === "student" 
          ? "Sizning Speaking javobingiz baholandi va profilingizga muvaffaqiyatli saqlandi!" 
          : "Sinov rejimida AI tahlil javobi qaytarildi!"
      );
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => qIdx + 1 < totalQ ? setQIdx(qIdx + 1) : (partIdx < 2 ? setPartIdx(partIdx + 1) : null);
  const prev = () => qIdx > 0 ? setQIdx(qIdx - 1) : (partIdx > 0 ? setPartIdx(partIdx - 1) : null);

  const helperKey = `${topic.slug}::p${partIdx}::q${qIdx}`;

  const fetchHelper = async (kind: "vocab" | "ideas" | "answers", force = false) => {
    const cacheMap =
      kind === "vocab" ? vocabCache : kind === "ideas" ? ideasCache : answersCache;
    if (!force && cacheMap[helperKey]?.length) return;
    const loadKey = `${kind}::${helperKey}`;
    setHelperLoading((m) => ({ ...m, [loadKey]: true }));
    try {
      const r = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/speaking-helper`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          kind,
          question: currentQuestion,
          topic: topic.title,
          part: partIdx + 1,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        toast.error(data?.error ?? "AI yordam olishda xato");
        return;
      }
      const items = Array.isArray(data?.items) ? data.items : [];
      if (kind === "vocab") setVocabCache((m) => ({ ...m, [helperKey]: items }));
      else if (kind === "ideas") setIdeasCache((m) => ({ ...m, [helperKey]: items }));
      else setAnswersCache((m) => ({ ...m, [helperKey]: items }));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setHelperLoading((m) => ({ ...m, [loadKey]: false }));
    }
  };

  useEffect(() => {
    if (tab === "vocab" && !vocabCache[helperKey]) fetchHelper("vocab");
    if (tab === "ideas" && !ideasCache[helperKey]) fetchHelper("ideas");
    if (tab === "answers" && !answersCache[helperKey]) fetchHelper("answers");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, helperKey]);

  const vocabItems = vocabCache[helperKey] ?? [];
  const ideaItems = ideasCache[helperKey] ?? [];
  const answerItems = answersCache[helperKey] ?? [];
  const isLoading = (kind: string) => !!helperLoading[`${kind}::${helperKey}`];

  useEffect(() => {
    return () => {
      stopRec();
      stopAudioPlayback();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <div className="space-y-6 w-full px-4 py-2">
      {/* Topic Card Banner */}
      <Card className={cn("p-6 border-l-8 rounded-2xl shadow-elegant relative overflow-hidden bg-gradient-to-r from-card to-background", topic.color)}>
        <div className="flex items-start gap-5 flex-wrap md:flex-nowrap">
          <div className={cn("w-20 h-20 rounded-2xl grid place-items-center text-4xl shrink-0 shadow-md", topic.bg)}>
            {topic.emoji}
          </div>
          <div className="flex-1 min-w-[200px]">
            <button 
              onClick={() => nav(`${basePath}/speaking/topics`)} 
              className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 mb-2 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Mavzular ro'yxatiga qaytish
            </button>
            <h1 className="text-2xl md:text-4xl font-display font-bold leading-tight tracking-tight">{topic.title}</h1>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold px-2.5 py-0.5 text-xs">BEPUL MASHQ</Badge>
              <Badge variant="outline" className="text-xs font-medium"><BookOpen className="h-3.5 w-3.5 mr-1" /> {topic.part1.length + 1 + topic.part3.length} ta savol</Badge>
              <Badge variant="outline" className="text-xs font-medium">{topic.category}</Badge>
            </div>
          </div>
          <Card className="p-4 bg-muted/40 text-xs space-y-1.5 shrink-0 border border-border/60 rounded-xl backdrop-blur-sm">
            <p className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">IELTS Speaking taqsimoti</p>
            <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-violet-500" /><span className="font-bold text-violet-600 dark:text-violet-400">{topic.part1.length} ta</span> Part 1 savollari</p>
            <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" /><span className="font-bold text-amber-600 dark:text-amber-400">1 ta</span> Part 2 Cue Card</p>
            <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-pink-500" /><span className="font-bold text-pink-600 dark:text-pink-400">{topic.part3.length} ta</span> Part 3 savollari</p>
          </Card>
        </div>
      </Card>

      {/* Tabs Menu */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 p-1.5 rounded-xl border border-border/40">
        <div className="flex flex-wrap gap-1.5">
          {([
            { k: "questions", label: "🎯 Savollar", n: topic.part1.length + 1 + topic.part3.length },
            { k: "vocab", label: "📚 So'z boyligi", n: 10 },
            { k: "ideas", label: "💡 Fikrlar", n: 3 },
            { k: "answers", label: "📝 Namunalar", n: 4 },
          ] as { k: Tab; label: string; n: number }[]).map((x) => (
            <button 
              key={x.k} 
              onClick={() => setTab(x.k)}
              className={cn(
                "relative px-4 py-2 text-sm rounded-lg font-semibold transition-all duration-300", 
                tab === x.k 
                  ? "bg-primary text-primary-foreground shadow-elegant scale-102" 
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {x.label}
              <span className={cn(
                "ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold", 
                tab === x.k ? "bg-primary-foreground text-primary" : "bg-muted-foreground/20 text-muted-foreground"
              )}>
                {x.n}
              </span>
            </button>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={() => setMenuOpen((v) => !v)} className="gap-1.5 text-xs font-semibold h-9">
          {menuOpen ? <><ChevronUp className="h-4 w-4" /> Menyuni yopish</> : <><ChevronDown className="h-4 w-4" /> Menyuni ochish</>}
        </Button>
      </div>

      <AnimatePresence>
        {menuOpen && tab === "questions" && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: "auto" }} 
            exit={{ opacity: 0, height: 0 }}
            className="grid sm:grid-cols-3 gap-3 overflow-hidden"
          >
            {partsMeta.map((p, i) => (
              <button 
                key={p.label} 
                onClick={() => setPartIdx(i)}
                className={cn(
                  "p-4 rounded-xl text-left transition-all duration-300 border backdrop-blur-sm", 
                  partIdx === i 
                    ? "bg-primary text-primary-foreground border-primary shadow-elegant scale-102" 
                    : "bg-card hover:border-primary/30 hover:shadow-sm"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold tracking-tight">{p.label}</p>
                  <Badge variant={partIdx === i ? "secondary" : "outline"} className="text-[10px] uppercase font-bold">{p.count} ta savol</Badge>
                </div>
                <p className={cn("text-xs font-medium", partIdx === i ? "text-primary-foreground/80" : "text-muted-foreground")}>{p.sub}</p>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {tab === "questions" && (
        <div className="space-y-6">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold px-1">
              <span>SAVOL PROGRESSI</span>
              <span>{qIdx + 1} / {totalQ}</span>
            </div>
            <Progress value={((qIdx + 1) / totalQ) * 100} className="h-2 rounded-full shadow-inner" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left/Middle Column: Question and AI Feedback Dashboard */}
            <Card className="lg:col-span-2 p-6 rounded-2xl shadow-elegant space-y-6 flex flex-col bg-card/60 backdrop-blur-sm border-border/40">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border border-primary/20 font-bold uppercase text-[10px] tracking-wider">
                    PART {partIdx + 1}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-medium">IELTS Speaking</span>
                </div>
                
                <div className="flex items-start gap-3">
                  <span className="h-3 w-3 rounded-full bg-primary mt-2 shrink-0 animate-pulse" />
                  <h2 className="text-xl md:text-2xl font-display font-bold leading-tight tracking-tight">{currentQuestion}</h2>
                </div>

                {partIdx === 1 && (
                  <Card className="p-4 bg-muted/30 border-l-4 border-amber-500 rounded-xl space-y-2 text-sm mt-3 shadow-inner">
                    <p className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                      <Bookmark className="h-4 w-4" /> Cue Card Yo'riqnomalari:
                    </p>
                    <ul className="text-muted-foreground space-y-1.5 pl-5 list-disc font-medium">
                      {topic.part2.bullets.map((b) => <li key={b}>{b}</li>)}
                    </ul>
                  </Card>
                )}
              </div>

              {/* Real-time speech transcription preview */}
              {transcript && (
                <Card className="p-4 bg-muted/40 border border-border/60 rounded-xl space-y-1.5 shadow-inner">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Real-vaqt transkripti:
                  </p>
                  <p className="text-sm font-medium leading-relaxed italic text-foreground/90">"{transcript}"</p>
                </Card>
              )}

              {/* 🏆 PREMIUM AI FEEDBACK RESULTS DASHBOARD */}
              {feedback && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-5"
                >
                  <div className="border-t border-border/60 pt-5 space-y-4">
                    {/* Header info bar */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 bg-primary/10 text-primary px-3.5 py-1.5 rounded-xl border border-primary/20 shadow-sm">
                        <Award className="h-5 w-5" /> 
                        <span className="font-bold text-sm">AI IELTS Baholash Tahlili</span>
                      </div>
                      
                      {feedback.is_test_mode && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] font-extrabold uppercase py-1">
                          SINOV REJIMI (TEST MODE)
                        </Badge>
                      )}
                    </div>

                    {/* Radial / Circle overall score container */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-gradient-to-br from-primary/5 via-violet-500/5 to-indigo-500/10 p-5 rounded-2xl border border-primary/10">
                      
                      {/* Overall Band circle */}
                      <div className="flex flex-col items-center justify-center text-center p-3 border-r md:border-r border-border/50 col-span-1">
                        <div className="relative h-24 w-24 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex flex-col items-center justify-center text-white shadow-elegant scale-102">
                          <span className="text-[10px] uppercase font-bold tracking-wider opacity-85">IELTS Band</span>
                          <span className="text-3xl font-extrabold leading-none">{feedback.band !== undefined ? feedback.band.toFixed(1) : "N/A"}</span>
                        </div>
                        <p className="text-xs font-bold mt-2 text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Umumiy Ball</p>
                      </div>

                      {/* Criteria Visual Bar charts */}
                      <div className="col-span-1 md:col-span-3 space-y-3">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">IELTS Me'yoriy Ko'rsatkichlari (0 - 9)</p>
                        
                        {/* Fluency */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-muted-foreground">Fluency and Coherence (Nutq ravonligi)</span>
                            <span className="text-primary">{feedback.fluency ?? "N/A"} / 9.0</span>
                          </div>
                          <Progress value={((feedback.fluency ?? 0) / 9) * 100} className="h-1.5 bg-muted rounded-full" />
                        </div>

                        {/* Lexical */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-muted-foreground">Lexical Resource (So'z boyligi)</span>
                            <span className="text-primary">{feedback.lexical ?? "N/A"} / 9.0</span>
                          </div>
                          <Progress value={((feedback.lexical ?? 0) / 9) * 100} className="h-1.5 bg-muted rounded-full" />
                        </div>

                        {/* Grammar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-muted-foreground">Grammatical Range & Accuracy (Grammatika)</span>
                            <span className="text-primary">{feedback.grammar ?? "N/A"} / 9.0</span>
                          </div>
                          <Progress value={((feedback.grammar ?? 0) / 9) * 100} className="h-1.5 bg-muted rounded-full" />
                        </div>

                        {/* Pronunciation */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-muted-foreground">Pronunciation (Talaffuz)</span>
                            <span className="text-primary">{feedback.pronunciation ?? "N/A"} / 9.0</span>
                          </div>
                          <Progress value={((feedback.pronunciation ?? 0) / 9) * 100} className="h-1.5 bg-muted rounded-full" />
                        </div>

                      </div>
                    </div>

                    {/* Detailed evaluation sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Strengths card */}
                      {feedback.strengths && feedback.strengths.length > 0 && (
                        <Card className="p-4 bg-emerald-500/5 border-emerald-500/10 rounded-xl space-y-2">
                          <p className="font-bold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="h-4.5 w-4.5" /> 🌟 Kuchli jihatlar (Strengths)
                          </p>
                          <ul className="text-xs list-disc pl-4 space-y-1 text-muted-foreground font-medium leading-relaxed">
                            {feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </Card>
                      )}

                      {/* Improvements card */}
                      {feedback.improvements && feedback.improvements.length > 0 && (
                        <Card className="p-4 bg-amber-500/5 border-amber-500/10 rounded-xl space-y-2">
                          <p className="font-bold text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                            <AlertCircle className="h-4.5 w-4.5" /> 🚀 Kamchiliklar & Rivojlanish (Improvements)
                          </p>
                          <ul className="text-xs list-disc pl-4 space-y-1 text-muted-foreground font-medium leading-relaxed">
                            {feedback.improvements.map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </Card>
                      )}
                    </div>

                    {/* Pronunciation Hint */}
                    {feedback.pronunciation_hint && (
                      <Card className="p-4 bg-violet-500/5 border-violet-500/10 rounded-xl flex gap-3">
                        <Volume2 className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-sm text-violet-700 dark:text-violet-400">🗣 Talaffuz bo'yicha tavsiyalar (Pronunciation)</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-medium">{feedback.pronunciation_hint}</p>
                        </div>
                      </Card>
                    )}

                    {/* Grammatical Error Feedback detail */}
                    {feedback.grammar_feedback && (
                      <Card className="p-4 bg-card border border-border rounded-xl space-y-1.5">
                        <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <Settings className="h-4.5 w-4.5 text-primary" /> Grammatik xatolar tahlili (Grammar Feedback)
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed font-medium whitespace-pre-wrap">{feedback.grammar_feedback}</p>
                      </Card>
                    )}

                    {/* Vocabulary suggestions detail */}
                    {feedback.vocabulary_feedback && (
                      <Card className="p-4 bg-card border border-border rounded-xl space-y-1.5">
                        <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                          <HelpCircle className="h-4.5 w-4.5 text-primary" /> Lug'at tahlili va sinonimlar (Lexical Feedback)
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed font-medium whitespace-pre-wrap">{feedback.vocabulary_feedback}</p>
                      </Card>
                    )}

                    {/* Band 9 Model Answer comparison */}
                    {feedback.model_answer && (
                      <Card className="p-4 bg-gradient-to-r from-primary/10 to-indigo-500/10 border border-primary/20 rounded-xl space-y-2">
                        <p className="font-bold text-sm text-primary flex items-center gap-1.5">
                          <Sparkles className="h-4.5 w-4.5 text-primary animate-pulse" /> ✨ Namuna Javob (IELTS Band 9 Sample Answer)
                        </p>
                        <p className="text-xs md:text-sm italic text-foreground leading-relaxed font-medium bg-background/50 p-3 rounded-lg border border-primary/5">
                          "{feedback.model_answer}"
                        </p>
                      </Card>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Navigation controls */}
              <div className="flex items-center gap-2 border-t border-border/40 pt-4 mt-auto">
                <Button 
                  variant="outline" 
                  onClick={prev} 
                  disabled={qIdx === 0 && partIdx === 0}
                  className="font-semibold text-xs h-10 px-4"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Oldingi Savol
                </Button>
                
                <Button 
                  onClick={next} 
                  disabled={qIdx + 1 === totalQ && partIdx === 2}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-10 px-4"
                >
                  Keyingi Savol <ChevronRight className="h-4 w-4 ml-1" />
                </Button>

                {transcript && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={resetAudioStates} 
                    className="ml-auto font-bold text-xs h-10 text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <RotateCw className="h-3.5 w-3.5 mr-1" /> Qaytadan gapirish
                  </Button>
                )}
              </div>
            </Card>

            {/* Right Column: Microphone controls, audio storage and instructions */}
            <Card className="p-6 rounded-2xl shadow-elegant space-y-5 flex flex-col bg-card/60 backdrop-blur-sm border-border/40">
              <p className="font-bold text-base tracking-tight text-foreground border-b border-border/40 pb-2">Mikrofon va Baholash</p>
              
              <div className="flex flex-col items-center gap-3 py-6">
                <button
                  onClick={() => recording ? stopRec() : startRec()}
                  disabled={submitting}
                  className={cn(
                    "h-24 w-24 rounded-full grid place-items-center transition-all duration-300 shadow-lg scale-102 hover:scale-105 active:scale-95 disabled:opacity-50",
                    recording 
                      ? "bg-rose-500 hover:bg-rose-600 animate-pulse text-white shadow-rose-500/30" 
                      : "bg-primary hover:bg-primary/95 text-primary-foreground shadow-primary/30"
                  )}
                >
                  {recording ? <MicOff className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
                </button>
                <p className="text-xs font-bold text-center uppercase tracking-wider text-muted-foreground">
                  {recording ? "Yozib olinmoqda... Yakunlash uchun bosing" : "Tugmani bosib gapiring"}
                </p>
              </div>

              {/* Own Voice Playback Container */}
              {(audioUrl || feedback?.audio_url) && (
                <Card className="p-4 bg-muted/30 border border-border/60 rounded-xl space-y-3 shadow-inner">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <Volume2 className="h-4 w-4 text-primary" /> Talaba Ovoz Yozuvi (Audio Player):
                  </p>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant={playingVoice ? "destructive" : "default"}
                      size="sm"
                      onClick={playingVoice ? stopAudioPlayback : playRecordedAudio}
                      className="w-full h-10 font-bold text-xs gap-1.5 shadow-sm"
                    >
                      {playingVoice ? (
                        <>
                          <Pause className="h-4 w-4" /> Ijroni To'xtatish
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" /> O'z Ovozini Eshitish
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              )}

              {/* Main Submit grading action */}
              <Button 
                onClick={grade} 
                disabled={submitting || (!transcript.trim() && !audioBlob)} 
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold h-12 rounded-xl shadow-md transition-all duration-300"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-1.5" /> AI Tahlil qilinmoqda (OpenAI)...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-1.5 animate-pulse" /> OpenAI AI Baholash
                  </>
                )}
              </Button>

              <Card className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl text-xs space-y-2">
                <div className="flex items-start gap-2.5">
                  <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <p className="font-bold text-amber-800 dark:text-amber-400">Amaliy Maslahat (IELTS Tip):</p>
                    <p className="italic text-amber-900/80 dark:text-amber-200/80 mt-1 leading-relaxed font-medium">
                      Javobingizni qisqa, tushunarli va tabiiy gapiring. 
                      {partIdx === 1 ? " Part 2 (Cue Card)da kamida 1.5 - 2 daqiqa to'xtamasdan" : " Part 1 va 3da esa 25-45 soniya davomida"} gapirish ko'nikmangizni shakllantiring.
                    </p>
                  </div>
                </div>
              </Card>
            </Card>
          </div>
        </div>
      )}

      {/* Tabs with helpers contents (vocab, ideas, answers) */}
      {(tab === "vocab" || tab === "ideas" || tab === "answers") && (
        <Card className="p-6 rounded-2xl shadow-elegant space-y-5 bg-card/60 backdrop-blur-sm border-border/40">
          <div className="flex items-start justify-between gap-3 flex-wrap border-b border-border/40 pb-4">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                TANLANGAN SAVOL (QISM {partIdx + 1})
              </p>
              <p className="font-display font-bold text-lg mt-1 text-foreground">"{currentQuestion}"</p>
            </div>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchHelper(tab as "vocab" | "ideas" | "answers", true)}
              disabled={isLoading(tab)}
              className="gap-1.5 font-bold text-xs h-9"
            >
              {isLoading(tab) ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCw className="h-3.5 w-3.5" />
              )}
              AI Yordamni Yangilash
            </Button>
          </div>

          {tab === "vocab" && (
            <>
              {isLoading("vocab") && vocabItems.length === 0 ? (
                <div className="py-12 grid place-items-center text-muted-foreground space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs font-semibold">IELTS yuqori balli so'z va iboralar yuklanmoqda...</p>
                </div>
              ) : vocabItems.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-6">Mavzuga oid so'zlar AI tomonidan yuklanmadi.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {vocabItems.map((v, i) => (
                    <Card key={`${v.word}-${i}`} className="p-4 space-y-2 rounded-xl border border-border/50 shadow-sm hover:border-primary/20 transition-all duration-300">
                      <div className="flex items-center justify-between gap-2 border-b border-border/30 pb-1.5">
                        <p className="font-bold text-base text-primary">{v.word}</p>
                        {v.type && (
                          <Badge variant="outline" className="text-[9px] uppercase font-bold py-0">{v.type}</Badge>
                        )}
                      </div>
                      <p className="text-xs font-bold text-muted-foreground">Ma'nosi: <span className="font-medium text-foreground">{v.meaning}</span></p>
                      <p className="text-xs font-semibold text-muted-foreground italic bg-muted/40 p-2 rounded-lg border">
                        "e.g. {v.example}"
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "ideas" && (
            <>
              {isLoading("ideas") && ideaItems.length === 0 ? (
                <div className="py-12 grid place-items-center text-muted-foreground space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs font-semibold">IELTS g'oya va argumentlar yuklanmoqda...</p>
                </div>
              ) : ideaItems.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-6">Fikrlar topilmadi.</p>
              ) : (
                <div className="space-y-4">
                  {ideaItems.map((it, i) => (
                    <Card key={i} className="p-4 border-l-4 border-l-amber-500 rounded-r-xl space-y-2 bg-amber-500/5 border border-border/40">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-amber-500" />
                        <p className="font-bold text-sm text-foreground">{it.title}</p>
                      </div>
                      <p className="text-xs font-semibold text-muted-foreground leading-relaxed pl-7">{it.explanation}</p>
                      <p className="text-xs font-bold text-muted-foreground pl-7 italic">
                        Misol: <span className="font-medium text-foreground">"{it.example}"</span>
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "answers" && (
            <>
              {isLoading("answers") && answerItems.length === 0 ? (
                <div className="py-12 grid place-items-center text-muted-foreground space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs font-semibold">IELTS turli darajadagi namunaviy javoblar yuklanmoqda...</p>
                </div>
              ) : answerItems.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-6">Namunaviy javoblar topilmadi.</p>
              ) : (
                <div className="space-y-4">
                  {answerItems
                    .slice()
                    .sort((a, b) => a.band - b.band)
                    .map((a, i) => (
                      <Card key={i} className="p-4 space-y-3 rounded-xl border border-border/50 shadow-sm">
                        <div className="flex items-center justify-between border-b border-border/30 pb-2">
                          <Badge
                            className={cn(
                              "text-white font-extrabold text-[10px] uppercase px-2.5 py-0.5",
                              a.band >= 8
                                ? "bg-emerald-500 hover:bg-emerald-500"
                                : a.band >= 7
                                  ? "bg-teal-500 hover:bg-teal-500"
                                  : a.band >= 6
                                    ? "bg-amber-500 hover:bg-amber-500"
                                    : "bg-rose-500 hover:bg-rose-500",
                            )}
                          >
                            Band {a.band.toFixed(1)} Answer
                          </Badge>
                          {a.highlight && (
                            <p className="text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/10">{a.highlight}</p>
                          )}
                        </div>
                        <p className="text-xs md:text-sm leading-relaxed font-medium text-foreground/90 italic">"{a.answer}"</p>
                      </Card>
                    ))}
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}

