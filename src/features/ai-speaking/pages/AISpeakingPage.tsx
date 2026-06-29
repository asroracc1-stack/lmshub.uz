import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, StopCircle, Play, Volume2, VolumeX,
  ChevronRight, Clock, CheckCircle2, BookOpen, Wifi,
  Zap, Trophy, SkipForward, User, AlertCircle,
} from "lucide-react";
import { useAISpeaking } from "../hooks/useAISpeaking";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { IELTS_PARTS, IELTSPart } from "../types";

// ──────────────────────────────────────────────────────────────────────────────
// Animated waveform
// ──────────────────────────────────────────────────────────────────────────────
function Waveform({ levels, active, color = "indigo" }: { levels: number[]; active: boolean; color?: string }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-7 w-full">
      {levels.map((h, i) => (
        <motion.div
          key={i}
          className={cn(
            "w-[3px] rounded-full transition-colors duration-200",
            active
              ? color === "blue" ? "bg-blue-400" : "bg-indigo-500"
              : "bg-slate-300 dark:bg-slate-600"
          )}
          animate={{ height: active ? `${Math.max(15, h)}%` : "18%" }}
          transition={{ duration: 0.09, ease: "easeOut" }}
          style={{ minHeight: 3, maxHeight: 28 }}
        />
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Circular timer
// ──────────────────────────────────────────────────────────────────────────────
function CircularTimer({ secondsLeft, totalSeconds }: { secondsLeft: number; totalSeconds: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, secondsLeft / totalSeconds));
  const offset = circ * (1 - pct);
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isLow = pct < 0.25;

  return (
    <div className="relative w-[92px] h-[92px] flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="92" height="92" viewBox="0 0 92 92">
        <circle cx="46" cy="46" r={r} fill="none" strokeWidth="5"
          className="stroke-slate-200 dark:stroke-slate-700/70" />
        <circle cx="46" cy="46" r={r} fill="none" strokeWidth="5"
          stroke={isLow ? "#ef4444" : "#6366f1"}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }} />
      </svg>
      <span className={cn("text-base font-black tabular-nums select-none",
        isLow ? "text-red-500" : "text-slate-800 dark:text-white")}>
        {mins}:{secs.toString().padStart(2, "0")}
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Part stepper
// ──────────────────────────────────────────────────────────────────────────────
function PartStepper({ current }: { current: IELTSPart }) {
  return (
    <div className="flex items-center gap-2 w-full">
      {([1, 2, 3] as IELTSPart[]).map((p, i) => {
        const done = p < current;
        const active = p === current;
        return (
          <React.Fragment key={p}>
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 transition-all duration-300",
              done ? "bg-emerald-500 text-white shadow-sm" :
              active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/40 scale-110" :
              "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
            )}>
              {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : p}
            </div>
            {i < 2 && (
              <div className={cn(
                "h-0.5 flex-1 rounded-full transition-all duration-500",
                done ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Examiner center card
// ──────────────────────────────────────────────────────────────────────────────
function ExaminerCard({
  avatarState, isPrepPhase, prepSecondsLeft, lastAiText, waveformLevels,
}: {
  avatarState: string;
  isPrepPhase: boolean;
  prepSecondsLeft: number;
  lastAiText: string;
  waveformLevels: number[];
}) {
  const STATE = {
    idle:       { dot: "bg-emerald-400", label: "Examiner is ready",     ring: "border-slate-600/50" },
    listening:  { dot: "bg-blue-400",    label: "Listening...",           ring: "border-blue-500 shadow-blue-500/40" },
    thinking:   { dot: "bg-amber-400",   label: "Thinking...",            ring: "border-amber-400 shadow-amber-400/30" },
    speaking:   { dot: "bg-indigo-400",  label: "Examiner is speaking",   ring: "border-indigo-500 shadow-indigo-500/40" },
    error:      { dot: "bg-red-400",     label: "Connection issue",       ring: "border-red-500" },
    happy:      { dot: "bg-emerald-400", label: "Great answer!",          ring: "border-emerald-500" },
    disconnected:{ dot:"bg-slate-500",   label: "Disconnected",           ring: "border-slate-600" },
  };
  const s = STATE[avatarState as keyof typeof STATE] ?? STATE.idle;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-b from-[#141929] via-[#0f1525] to-[#090e1c] select-none">
      {/* top bar */}
      <div className="w-full flex items-center justify-between px-5 pt-4 pb-2 z-10">
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full animate-pulse", s.dot)} />
          <span className="text-xs font-semibold text-white/70">{s.label}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-white/40 font-medium">
          <span className="flex items-center gap-1"><Wifi className="w-3 h-3 text-emerald-400" /><span className="text-emerald-400">Excellent</span></span>
          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-indigo-400" /><span className="text-indigo-400">Gemini 2.0 Flash</span></span>
        </div>
      </div>

      {/* Examiner image */}
      <div className="flex-1 flex items-center justify-center py-2 relative">
        <motion.div className="relative"
          animate={{ scale: avatarState === "speaking" ? [1, 1.015, 1] : 1 }}
          transition={{ repeat: avatarState === "speaking" ? Infinity : 0, duration: 1.6, ease: "easeInOut" }}
        >
          <img
            src="/ai_examiner_avatar.png"
            alt="IELTS Examiner"
            className={cn(
              "w-52 h-52 md:w-60 md:h-60 object-cover rounded-full border-[3px] shadow-2xl transition-all duration-400",
              s.ring
            )}
          />
          {/* Pulse rings */}
          {(avatarState === "speaking" || avatarState === "listening") && (
            <>
              <motion.div
                className={cn("absolute inset-0 rounded-full border-2",
                  avatarState === "speaking" ? "border-indigo-500" : "border-blue-400")}
                animate={{ scale: [1, 1.18], opacity: [0.7, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.div
                className={cn("absolute inset-0 rounded-full border",
                  avatarState === "speaking" ? "border-indigo-400" : "border-blue-300")}
                animate={{ scale: [1, 1.32], opacity: [0.4, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
              />
            </>
          )}
        </motion.div>
      </div>

      {/* Question / Prep bubble */}
      <div className="w-full px-4 pb-4">
        <AnimatePresence mode="wait">
          {isPrepPhase ? (
            <motion.div key="prep"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-2xl bg-amber-500/15 border border-amber-500/30 px-4 py-3 text-center"
            >
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Preparation Time</p>
              <p className="text-3xl font-black text-white tabular-nums">
                {Math.floor(prepSecondsLeft / 60)}:{(prepSecondsLeft % 60).toString().padStart(2, "0")}
              </p>
              <p className="text-[11px] text-amber-300/60 mt-1">Read your cue card carefully</p>
            </motion.div>
          ) : lastAiText ? (
            <motion.div key={lastAiText.slice(0, 24)}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="rounded-2xl bg-white/8 backdrop-blur border border-white/10 px-4 py-3"
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-1 shrink-0 w-6">
                  <Waveform levels={waveformLevels.slice(0, 5)} active={avatarState === "speaking"} />
                </div>
                <p className="text-white text-sm font-medium leading-relaxed line-clamp-3">{lastAiText}</p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────────────────────────────────────
export default function AISpeakingPage() {
  const [textInput, setTextInput] = useState("");
  const transcriptEnd = useRef<HTMLDivElement>(null);

  const {
    avatarState, session, transcript, isMuted, waveformLevels,
    isSpeechSupported, currentPart, partSecondsLeft, isPrepPhase,
    prepSecondsLeft, cueCard, setIsMuted,
    startSession, endSession, advanceToPart,
    startListening, stopListeningAndProcess, processUserSpeech,
  } = useAISpeaking();

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const handleSendText = useCallback(() => {
    const t = textInput.trim();
    if (!t) return;
    processUserSpeech(t);
    setTextInput("");
  }, [textInput, processUserSpeech]);

  const lastAiText = useMemo(
    () => [...transcript].reverse().find(m => m.sender === "ai")?.text ?? "",
    [transcript]
  );

  const partCfg = IELTS_PARTS[currentPart - 1];

  return (
    <div className="w-full min-h-screen bg-white dark:bg-[#0A0F1E] text-slate-800 dark:text-slate-100 transition-colors duration-300 flex flex-col">

      {/* ─── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-5 md:px-8 py-4 border-b border-slate-100 dark:border-slate-800/60 shrink-0">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
            <Link to="/super-admin/dashboard" className="hover:text-indigo-500 transition-colors">Superadmin</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-600 dark:text-slate-300">IELTS Speaking</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white leading-none">IELTS Speaking Test</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">AI Examiner · Tested by Gemini 2.0 Flash</p>
        </div>

        <div className="flex items-center gap-2">
          {session.isActive && (
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold gap-1.5 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Live
            </Badge>
          )}
          <Button variant="outline" size="sm"
            onClick={() => setIsMuted(!isMuted)}
            disabled={!session.isActive}
            className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80"
          >
            {isMuted
              ? <VolumeX className="w-4 h-4 text-red-500" />
              : <Volume2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />}
          </Button>
          {!session.isActive
            ? <Button size="sm" onClick={startSession}
                className="h-9 px-5 rounded-xl font-bold text-xs tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 gap-1.5">
                <Play className="w-3.5 h-3.5" /> Start Session
              </Button>
            : <Button size="sm" variant="destructive" onClick={endSession}
                className="h-9 px-4 rounded-xl font-bold text-xs tracking-wider gap-1.5">
                <StopCircle className="w-3.5 h-3.5" /> End
              </Button>
          }
        </div>
      </div>

      {/* ─── Content ─────────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">

        {/* ════ IDLE SCREEN ════ */}
        {!session.isActive && (
          <motion.div key="idle"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex-1 max-w-4xl w-full mx-auto px-5 md:px-8 py-10 space-y-6"
          >
            {/* Hero */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-700 to-indigo-800 p-8 md:p-12 text-white shadow-2xl shadow-indigo-500/20">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-[0.15] mix-blend-luminosity"
                style={{ backgroundImage: "url('/ai_examiner_avatar.png')" }}
              />
              <div className="relative z-10 max-w-lg">
                <Badge className="bg-white/20 text-white border-0 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                  IELTS Speaking · AI Examiner
                </Badge>
                <h2 className="text-3xl md:text-4xl font-black leading-tight mb-3">
                  Practice Your IELTS<br />Speaking Test
                </h2>
                <p className="text-indigo-100 text-sm leading-relaxed mb-8">
                  A fully simulated IELTS Speaking exam with an AI examiner. Complete all 3 parts — Introduction, Cue Card, and Discussion — exactly like the real test.
                </p>
                <Button size="lg" onClick={startSession}
                  className="rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-black px-8 shadow-xl gap-2">
                  <Play className="w-5 h-5" /> Begin IELTS Speaking Test
                </Button>
              </div>
            </div>

            {/* Parts overview */}
            <div className="grid md:grid-cols-3 gap-4">
              {IELTS_PARTS.map(p => (
                <div key={p.part}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-5 space-y-3 shadow-sm">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-sm">
                    {p.part}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-800 dark:text-white">{p.title}</p>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{p.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{Math.round(p.durationSeconds / 60)} minutes</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ════ ACTIVE EXAM SCREEN ════ */}
        {session.isActive && (
          <motion.div key="exam"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex-1 grid grid-cols-1 lg:grid-cols-[260px_1fr_280px] min-h-0"
          >
            {/* ── LEFT PANEL ── */}
            <div className="hidden lg:flex flex-col gap-5 p-5 border-r border-slate-100 dark:border-slate-800/60 overflow-y-auto">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-white">IELTS Speaking</p>
                  <p className="text-[11px] text-slate-500">Tested by AI Examiner</p>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2.5">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Session Progress</p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Part {currentPart} of 3</p>
                <PartStepper current={currentPart} />
              </div>

              {/* Current part */}
              <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 p-4 space-y-1">
                <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Part {currentPart}</p>
                <p className="text-sm font-black text-slate-800 dark:text-white">{partCfg.title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{partCfg.description}</p>
              </div>

              {/* Timer */}
              <div className="flex justify-center">
                <div className="flex flex-col items-center gap-1.5">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Time Remaining</p>
                  <CircularTimer secondsLeft={partSecondsLeft} totalSeconds={partCfg.durationSeconds} />
                  <p className="text-[10px] text-slate-400">/ {Math.floor(partCfg.durationSeconds / 60)}:00</p>
                </div>
              </div>

              {/* Next part */}
              {currentPart < 3 && (
                <Button variant="outline" size="sm"
                  onClick={() => advanceToPart((currentPart + 1) as IELTSPart)}
                  className="rounded-xl border-slate-200 dark:border-slate-700 text-xs font-semibold gap-1.5">
                  <SkipForward className="w-3.5 h-3.5" /> Move to Part {currentPart + 1}
                </Button>
              )}

              {/* Tips */}
              <div className="mt-auto space-y-2">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Session Tips</p>
                <ul className="space-y-2">
                  {partCfg.tips.map(tip => (
                    <li key={tip} className="flex items-start gap-2 text-[12px] text-slate-600 dark:text-slate-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ── CENTER: EXAMINER + MIC ── */}
            <div className="flex flex-col gap-3 p-4">
              {/* Mobile part bar */}
              <div className="flex lg:hidden items-center justify-between bg-slate-100 dark:bg-slate-800/60 rounded-2xl px-4 py-2.5 gap-3">
                <PartStepper current={currentPart} />
                <span className="text-xs font-black text-slate-500 shrink-0 tabular-nums">
                  {Math.floor(partSecondsLeft / 60)}:{(partSecondsLeft % 60).toString().padStart(2, "0")}
                </span>
              </div>

              {/* Examiner visual */}
              <div className="flex-1 min-h-0 rounded-2xl overflow-hidden shadow-2xl">
                <ExaminerCard
                  avatarState={avatarState}
                  isPrepPhase={isPrepPhase}
                  prepSecondsLeft={prepSecondsLeft}
                  lastAiText={lastAiText}
                  waveformLevels={waveformLevels}
                />
              </div>

              {/* Waveform */}
              <div className="px-8">
                <Waveform
                  levels={waveformLevels}
                  active={avatarState === "listening" || avatarState === "speaking"}
                  color={avatarState === "listening" ? "blue" : "indigo"}
                />
              </div>

              {/* MIC / TEXT */}
              {!isSpeechSupported ? (
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 mx-auto w-full max-w-md">
                  <input
                    type="text"
                    placeholder="Type your answer and press Enter..."
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSendText()}
                    className="flex-1 bg-transparent outline-none text-sm px-3 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                    disabled={avatarState === "thinking" || avatarState === "speaking" || isPrepPhase}
                  />
                  <Button size="sm" onClick={handleSendText}
                    disabled={!textInput.trim() || avatarState === "thinking" || avatarState === "speaking" || isPrepPhase}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4">
                    Send
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <motion.button
                    onPointerDown={startListening}
                    onPointerUp={stopListeningAndProcess}
                    onPointerLeave={stopListeningAndProcess}
                    disabled={isPrepPhase || isMuted || avatarState === "thinking" || avatarState === "speaking"}
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center shadow-xl outline-none select-none transition-all duration-200",
                      avatarState === "listening"
                        ? "bg-blue-500 shadow-blue-500/40 ring-4 ring-blue-400/30"
                        : isPrepPhase || isMuted || avatarState === "thinking" || avatarState === "speaking"
                        ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60"
                        : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30 cursor-pointer"
                    )}
                  >
                    {isMuted
                      ? <MicOff className="w-7 h-7 text-slate-400" />
                      : <Mic className="w-7 h-7 text-white" />}
                  </motion.button>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium select-none">
                    {avatarState === "listening" ? "Release to send"
                      : avatarState === "thinking" ? "Processing..."
                      : avatarState === "speaking" ? "Examiner is speaking"
                      : isPrepPhase ? "Preparing — please wait"
                      : isMuted ? "Microphone muted"
                      : "Hold to speak"}
                  </p>
                </div>
              )}

              {/* Bottom actions */}
              <div className="flex items-center justify-center gap-8 text-[11px] text-slate-400 dark:text-slate-500 font-medium pb-1">
                {currentPart < 3 && (
                  <button
                    onClick={() => advanceToPart((currentPart + 1) as IELTSPart)}
                    className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    <SkipForward className="w-3.5 h-3.5" /> Skip to Part {currentPart + 1}
                  </button>
                )}
                <button onClick={endSession}
                  className="flex items-center gap-1 text-red-400 hover:text-red-500 transition-colors">
                  <StopCircle className="w-3.5 h-3.5" /> End session
                </button>
              </div>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="hidden lg:flex flex-col gap-4 p-5 border-l border-slate-100 dark:border-slate-800/60 overflow-y-auto">
              {/* Examiner info badge */}
              <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3 py-2.5">
                <User className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Sarah J.</p>
                  <p className="text-[10px] text-slate-400">IELTS Examiner · Cambridge</p>
                </div>
              </div>

              {/* Cue card (Part 2) */}
              <AnimatePresence>
                {currentPart === 2 && cueCard && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-4 space-y-2">
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> Cue Card
                    </p>
                    <p className="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{cueCard}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Transcript */}
              <div className="flex-1 flex flex-col min-h-0">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Live Transcript</p>
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
                  {transcript.length === 0 && (
                    <p className="text-[12px] text-slate-400 dark:text-slate-500 text-center py-8 leading-relaxed">
                      Start speaking to see your<br />conversation here.
                    </p>
                  )}
                  {transcript.map((msg, i) => (
                    <div key={i} className={cn(
                      "flex flex-col rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed max-w-[94%] shadow-sm",
                      msg.sender === "user"
                        ? "bg-indigo-600 text-white ml-auto rounded-tr-none"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700"
                    )}>
                      <p>{msg.text}</p>
                      <span className={cn("text-[9px] font-bold mt-1 block text-right",
                        msg.sender === "user" ? "text-indigo-200" : "text-slate-400")}>
                        P{msg.part} · {msg.time}
                      </span>
                    </div>
                  ))}
                  <div ref={transcriptEnd} />
                </div>
              </div>

              {/* Band score + status */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">–.–</p>
                    <p className="text-[11px] text-slate-400">Band score</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1"><Wifi className="w-3 h-3 text-emerald-400" /><span className="text-emerald-500">Excellent</span></span>
                  <span className="flex items-center gap-1"><Mic className="w-3 h-3 text-emerald-400" /><span className="text-emerald-500">Voice: Good</span></span>
                  <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /><span>Noise: Low</span></span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
