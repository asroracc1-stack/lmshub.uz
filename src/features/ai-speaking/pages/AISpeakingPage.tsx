import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, StopCircle, Play, Settings, Volume2, VolumeX,
  ChevronRight, Clock, CheckCircle2, AlertCircle, BookOpen,
  Wifi, WifiOff, Zap, Trophy, SkipForward, User,
} from "lucide-react";
import { useAISpeaking } from "../hooks/useAISpeaking";
import AISpeakingSettings from "../components/AISpeakingSettings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { IELTS_PARTS, IELTSPart, TranscriptMessage } from "../types";

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

/** Animated waveform bars */
function Waveform({ levels, active }: { levels: number[]; active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-8">
      {levels.map((h, i) => (
        <motion.div
          key={i}
          className={cn(
            "w-[3px] rounded-full",
            active ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"
          )}
          animate={{ height: active ? `${h}%` : "20%" }}
          transition={{ duration: 0.1, ease: "easeOut" }}
          style={{ minHeight: 4, maxHeight: 32 }}
        />
      ))}
    </div>
  );
}

/** Circular countdown clock */
function CircularTimer({
  secondsLeft,
  totalSeconds,
  label,
}: {
  secondsLeft: number;
  totalSeconds: number;
  label: string;
}) {
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(1, secondsLeft / totalSeconds));
  const dashOffset = circumference * (1 - progress);
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isLow = progress < 0.25;

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" width="96" height="96" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor"
            className="text-slate-200 dark:text-slate-700/60" strokeWidth="6" />
          <circle cx="48" cy="48" r={r} fill="none"
            stroke={isLow ? "#ef4444" : "#6366f1"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <span className={cn("text-lg font-black tabular-nums", isLow ? "text-red-500" : "text-slate-800 dark:text-white")}>
          {mins}:{secs.toString().padStart(2, "0")}
        </span>
      </div>
      <p className="text-[10px] text-slate-400 dark:text-slate-500">
        / {Math.floor(totalSeconds / 60)}:00
      </p>
    </div>
  );
}

/** Part progress stepper */
function PartStepper({ current }: { current: IELTSPart }) {
  return (
    <div className="flex items-center gap-2">
      {([1, 2, 3] as IELTSPart[]).map((p, i) => {
        const done = p < current;
        const active = p === current;
        return (
          <React.Fragment key={p}>
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300",
              done ? "bg-green-500 text-white" :
              active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 scale-110" :
              "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
            )}>
              {done ? <CheckCircle2 className="w-4 h-4" /> : p}
            </div>
            {i < 2 && (
              <div className={cn(
                "flex-1 h-0.5 rounded-full transition-all duration-500",
                done ? "bg-green-500" : "bg-slate-200 dark:bg-slate-700"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/** Examiner avatar section with animated states */
function ExaminerSection({
  avatarState,
  isPrepPhase,
  prepSecondsLeft,
  currentQuestion,
  waveformLevels,
}: {
  avatarState: string;
  isPrepPhase: boolean;
  prepSecondsLeft: number;
  currentQuestion: string;
  waveformLevels: number[];
}) {
  const stateLabel: Record<string, { label: string; color: string }> = {
    idle: { label: "Examiner is ready", color: "text-green-500" },
    listening: { label: "Listening to you...", color: "text-blue-500" },
    thinking: { label: "Thinking...", color: "text-amber-500" },
    speaking: { label: "Examiner is speaking", color: "text-indigo-500" },
    error: { label: "Connection issue", color: "text-red-500" },
    happy: { label: "Great answer!", color: "text-green-500" },
  };
  const info = stateLabel[avatarState] ?? { label: "Ready", color: "text-green-500" };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-b from-[#1a1f35] to-[#0d1120]">
      {/* Status bar */}
      <div className="w-full flex items-center justify-between px-4 pt-4 pb-2 z-10">
        <div className="flex items-center gap-1.5">
          <span className={cn("w-2 h-2 rounded-full animate-pulse", info.color.replace("text-", "bg-"))} />
          <span className={cn("text-xs font-semibold", info.color)}>{info.label}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Wifi className="w-3 h-3 text-green-400" />
          <span className="text-green-400 font-medium">Excellent</span>
          <span className="mx-1 text-slate-600">·</span>
          <Zap className="w-3 h-3 text-indigo-400" />
          <span className="text-indigo-400 font-medium">Gemini 2.0</span>
        </div>
      </div>

      {/* Examiner image */}
      <div className="flex-1 flex items-center justify-center w-full px-6 relative">
        <motion.div
          className="relative"
          animate={{
            scale: avatarState === "speaking" ? [1, 1.01, 1] : 1,
          }}
          transition={{ repeat: avatarState === "speaking" ? Infinity : 0, duration: 1.5, ease: "easeInOut" }}
        >
          <img
            src="/ai_examiner_avatar.png"
            alt="IELTS Examiner"
            className={cn(
              "w-56 h-56 md:w-64 md:h-64 object-cover rounded-full border-4 shadow-2xl transition-all duration-500",
              avatarState === "speaking" ? "border-indigo-500 shadow-indigo-500/40" :
              avatarState === "listening" ? "border-blue-500 shadow-blue-500/40" :
              avatarState === "thinking" ? "border-amber-500 shadow-amber-500/30" :
              "border-slate-600/60 shadow-slate-900/60"
            )}
          />
          {/* Speaking pulse ring */}
          {avatarState === "speaking" && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-indigo-500"
              animate={{ scale: [1, 1.15, 1], opacity: [0.8, 0, 0.8] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          {avatarState === "listening" && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-blue-400"
              animate={{ scale: [1, 1.12, 1], opacity: [0.9, 0, 0.9] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
            />
          )}
        </motion.div>
      </div>

      {/* Current question bubble */}
      <AnimatePresence mode="wait">
        {currentQuestion && !isPrepPhase && (
          <motion.div
            key={currentQuestion.slice(0, 30)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-4 mb-4 w-[calc(100%-2rem)] bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-3"
          >
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <Waveform levels={waveformLevels.slice(0, 5)} active={avatarState === "speaking"} />
              </div>
              <p className="text-white text-sm font-medium leading-relaxed line-clamp-3">
                {currentQuestion}
              </p>
            </div>
          </motion.div>
        )}
        {isPrepPhase && (
          <motion.div
            key="prep"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-4 mb-4 w-[calc(100%-2rem)] bg-amber-500/15 backdrop-blur-md border border-amber-500/30 rounded-2xl px-4 py-3 text-center"
          >
            <p className="text-amber-300 text-xs font-bold uppercase tracking-wider mb-1">Preparation Time</p>
            <p className="text-white text-2xl font-black tabular-nums">
              {Math.floor(prepSecondsLeft / 60)}:{(prepSecondsLeft % 60).toString().padStart(2, "0")}
            </p>
            <p className="text-amber-200/70 text-xs mt-1">Read your cue card carefully</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────────────────────────
export default function AISpeakingPage() {
  const [showSettings, setShowSettings] = useState(false);
  const [textInput, setTextInput] = useState("");
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const {
    avatarState,
    session,
    transcript,
    isMuted,
    waveformLevels,
    isSpeechSupported,
    currentPart,
    partSecondsLeft,
    isPrepPhase,
    prepSecondsLeft,
    cueCard,
    setIsMuted,
    startSession,
    endSession,
    advanceToPart,
    startListening,
    stopListeningAndProcess,
    processUserSpeech,
  } = useAISpeaking();

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const handleSendText = useCallback(() => {
    const text = textInput.trim();
    if (!text) return;
    processUserSpeech(text);
    setTextInput("");
  }, [textInput, processUserSpeech]);

  // Latest AI message (for examiner bubble)
  const lastAiMessage = useMemo(
    () => [...transcript].reverse().find((m) => m.sender === "ai")?.text ?? "",
    [transcript]
  );

  const partCfg = IELTS_PARTS[currentPart - 1];

  return (
    <div className="w-full min-h-screen bg-white dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-5 md:px-8 py-4 border-b border-slate-100 dark:border-slate-800/70">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 select-none">
            <Link to="/super-admin/dashboard" className="hover:text-indigo-500 transition-colors">
              Superadmin
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-600 dark:text-slate-300">IELTS Speaking</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white leading-none">
            IELTS Speaking Test
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            AI Examiner · Tested by Gemini 2.0 Flash
          </p>
        </div>

        <div className="flex items-center gap-2">
          {session.isActive && (
            <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 text-[11px] font-semibold gap-1.5 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live Session
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMuted(!isMuted)}
            disabled={!session.isActive}
            className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-slate-500" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
            className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" /> Settings
          </Button>

          {!session.isActive ? (
            <Button
              size="sm"
              onClick={startSession}
              className="h-9 px-5 rounded-xl font-bold text-xs uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 gap-1.5"
            >
              <Play className="w-3.5 h-3.5" /> Start Session
            </Button>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              onClick={endSession}
              className="h-9 px-4 rounded-xl font-bold text-xs uppercase tracking-wider gap-1.5"
            >
              <StopCircle className="w-3.5 h-3.5" /> End
            </Button>
          )}
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {!session.isActive ? (
          /* ════ IDLE / WELCOME SCREEN ════ */
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="max-w-4xl mx-auto px-5 md:px-8 py-10"
          >
            {/* Hero card */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-700 p-8 md:p-12 text-white shadow-2xl shadow-indigo-500/20 mb-8">
              <div className="absolute inset-0 bg-[url('/ai_examiner_avatar.png')] bg-cover bg-right opacity-20 mix-blend-luminosity" />
              <div className="relative z-10 max-w-lg">
                <Badge className="bg-white/20 text-white border-0 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                  IELTS Speaking · AI Examiner
                </Badge>
                <h2 className="text-3xl md:text-4xl font-black leading-tight mb-3">
                  Practice Your IELTS<br />Speaking Test
                </h2>
                <p className="text-indigo-100 text-sm leading-relaxed mb-8">
                  Experience a fully simulated IELTS Speaking exam with our AI examiner.
                  Complete all 3 parts — Introduction, Cue Card, and Discussion — just like the real test.
                </p>
                <Button
                  size="lg"
                  onClick={startSession}
                  className="rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-black px-8 shadow-xl gap-2"
                >
                  <Play className="w-5 h-5" /> Begin IELTS Speaking Test
                </Button>
              </div>
            </div>

            {/* 3 parts overview */}
            <div className="grid md:grid-cols-3 gap-4">
              {IELTS_PARTS.map((p) => (
                <div
                  key={p.part}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-sm">
                    {p.part}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-800 dark:text-white">{p.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{p.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{Math.round(p.durationSeconds / 60)} minutes</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          /* ════ ACTIVE SESSION ════ */
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="h-[calc(100vh-73px)] grid grid-cols-1 lg:grid-cols-[260px_1fr_280px] xl:grid-cols-[280px_1fr_300px] gap-0"
          >
            {/* ── LEFT SIDEBAR ── */}
            <div className="hidden lg:flex flex-col gap-4 p-5 border-r border-slate-100 dark:border-slate-800/70 overflow-y-auto">
              {/* IELTS logo + examiner info */}
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-white">IELTS Speaking</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Tested by AI Examiner</p>
                </div>
              </div>

              {/* Session progress */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Session Progress
                </p>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Part {currentPart} of 3
                </p>
                <PartStepper current={currentPart} />
              </div>

              {/* Current part info */}
              <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 p-4 space-y-1.5">
                <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Part {currentPart}
                </p>
                <p className="text-sm font-black text-slate-800 dark:text-white">{partCfg.title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{partCfg.description}</p>
              </div>

              {/* Part timer */}
              <div className="flex justify-center">
                <CircularTimer
                  secondsLeft={partSecondsLeft}
                  totalSeconds={partCfg.durationSeconds}
                  label="Time Remaining"
                />
              </div>

              {/* Advance to next part */}
              {currentPart < 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => advanceToPart((currentPart + 1) as IELTSPart)}
                  className="rounded-xl border-slate-200 dark:border-slate-700 text-xs font-semibold gap-1.5"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  Next Part
                </Button>
              )}

              {/* Tips */}
              <div className="space-y-2 mt-auto">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Session Tips
                </p>
                <ul className="space-y-2">
                  {partCfg.tips.map((tip) => (
                    <li key={tip} className="flex items-start gap-2 text-[12px] text-slate-600 dark:text-slate-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ── CENTER: EXAMINER ── */}
            <div className="flex flex-col p-4 gap-4 overflow-hidden">
              {/* Mobile part progress */}
              <div className="flex lg:hidden items-center justify-between bg-slate-100 dark:bg-slate-800/60 rounded-2xl px-4 py-2.5">
                <PartStepper current={currentPart} />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-4">
                  {Math.floor(partSecondsLeft / 60)}:{(partSecondsLeft % 60).toString().padStart(2, "0")}
                </span>
              </div>

              {/* Examiner visual */}
              <div className="flex-1 min-h-0 rounded-2xl overflow-hidden shadow-xl">
                <ExaminerSection
                  avatarState={avatarState}
                  isPrepPhase={isPrepPhase}
                  prepSecondsLeft={prepSecondsLeft}
                  currentQuestion={lastAiMessage}
                  waveformLevels={waveformLevels}
                />
              </div>

              {/* Controls bar */}
              <div className="flex flex-col items-center gap-3">
                {/* Waveform strip */}
                <div className="w-full max-w-xs h-8">
                  <Waveform
                    levels={waveformLevels}
                    active={avatarState === "listening" || avatarState === "speaking"}
                  />
                </div>

                {/* Mic / text input */}
                {!isSpeechSupported ? (
                  <div className="w-full max-w-md flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 shadow-sm">
                    <input
                      type="text"
                      placeholder="Type your answer and press Enter..."
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendText()}
                      className="flex-1 bg-transparent outline-none text-sm px-3 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                      disabled={avatarState === "thinking" || avatarState === "speaking" || isPrepPhase}
                    />
                    <Button
                      size="sm"
                      onClick={handleSendText}
                      disabled={!textInput.trim() || avatarState === "thinking" || avatarState === "speaking" || isPrepPhase}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4"
                    >
                      Send
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <motion.button
                      onPointerDown={startListening}
                      onPointerUp={stopListeningAndProcess}
                      onPointerLeave={stopListeningAndProcess}
                      disabled={avatarState === "thinking" || avatarState === "speaking" || isPrepPhase || isMuted}
                      whileTap={{ scale: 0.93 }}
                      className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 outline-none select-none",
                        avatarState === "listening"
                          ? "bg-blue-500 shadow-blue-500/40 ring-4 ring-blue-400/40"
                          : isPrepPhase || isMuted
                          ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
                          : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30 cursor-pointer"
                      )}
                    >
                      {isMuted ? (
                        <MicOff className="w-7 h-7 text-slate-500" />
                      ) : (
                        <Mic className="w-7 h-7 text-white" />
                      )}
                    </motion.button>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium select-none">
                      {avatarState === "listening" ? "Release to send" : isPrepPhase ? "Preparing..." : "Hold to speak"}
                    </p>
                  </div>
                )}

                {/* Bottom action row */}
                <div className="flex items-center justify-center gap-6 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  <button
                    onClick={() => advanceToPart((currentPart + 1) as IELTSPart)}
                    disabled={currentPart >= 3}
                    className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-30 transition-colors"
                  >
                    <SkipForward className="w-3.5 h-3.5" /> Skip question
                  </button>
                  <button
                    onClick={endSession}
                    className="flex items-center gap-1 text-red-400 hover:text-red-500 transition-colors"
                  >
                    <StopCircle className="w-3.5 h-3.5" /> End session
                  </button>
                </div>
              </div>
            </div>

            {/* ── RIGHT SIDEBAR ── */}
            <div className="hidden lg:flex flex-col gap-4 p-5 border-l border-slate-100 dark:border-slate-800/70 overflow-y-auto">

              {/* Examiner info */}
              <button className="w-full flex items-center gap-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Examiner info</span>
              </button>

              {/* Cue card (Part 2) */}
              <AnimatePresence>
                {currentPart === 2 && cueCard && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 space-y-2"
                  >
                    <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> Cue Card
                    </p>
                    <p className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{cueCard}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Live transcript */}
              <div className="flex-1 flex flex-col min-h-0">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Live Transcript
                </p>
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {transcript.length === 0 && (
                    <p className="text-[12px] text-slate-400 dark:text-slate-500 text-center py-6">
                      Conversation will appear here...
                    </p>
                  )}
                  {transcript.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex flex-col rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed max-w-[92%]",
                        msg.sender === "user"
                          ? "bg-indigo-600 text-white ml-auto rounded-tr-none"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 mr-auto rounded-tl-none border border-slate-200 dark:border-slate-700"
                      )}
                    >
                      <p>{msg.text}</p>
                      <span className={cn(
                        "text-[9px] font-bold mt-1 block text-right",
                        msg.sender === "user" ? "text-indigo-200" : "text-slate-400"
                      )}>
                        Part {msg.part} · {msg.time}
                      </span>
                    </div>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>
              </div>

              {/* Performance */}
              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Your Performance
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">–</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">Band score</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Connection status footer */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap text-[11px] text-slate-400 dark:text-slate-500">
                <span className="flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-green-400" />
                  <span className="text-green-500">Excellent</span>
                </span>
                <span className="flex items-center gap-1">
                  <Mic className="w-3 h-3 text-green-400" />
                  <span className="text-green-500">Good</span>
                </span>
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Noise: Low</span>
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AISpeakingSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
