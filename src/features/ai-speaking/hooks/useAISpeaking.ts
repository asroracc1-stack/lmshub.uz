import { useState, useEffect, useRef, useCallback } from "react";
import { AvatarState, IELTSPart, SpeakingSession, TranscriptMessage, IELTS_PARTS } from "../types";
import { speakingService } from "../services/speakingService";

// ─── Question banks ────────────────────────────────────────────────────────────
const QUESTIONS: Record<IELTSPart, string[]> = {
  1: [
    "Can you tell me your full name, please?",
    "Where are you originally from?",
    "Do you work or are you a student?",
    "What do you enjoy doing in your free time?",
    "Do you like reading? What kind of books do you prefer?",
    "Let's talk about your hometown. What do you like about it?",
    "Do you prefer living in a city or the countryside? Why?",
    "How often do you use public transport?",
    "Do you think the weather affects your mood?",
    "What kind of food do you enjoy the most?",
  ],
  2: [
    "Describe a person who has had a significant influence on your life.\n\nYou should say:\n• Who this person is\n• How you know them\n• What qualities they have\n• Why they have been so influential",
    "Describe a place you visited that you particularly enjoyed.\n\nYou should say:\n• Where it was\n• Why you went there\n• What you did there\n• Why you enjoyed it so much",
    "Describe a skill you would like to learn.\n\nYou should say:\n• What the skill is\n• Why you want to learn it\n• How you would learn it\n• How this skill would benefit your life",
  ],
  3: [
    "Do you think young people today face more pressure than previous generations?",
    "How has technology changed the way people communicate?",
    "What role should governments play in improving public health?",
    "Do you think economic development always leads to a better quality of life?",
    "How can education systems better prepare students for the modern workplace?",
    "Should environmental protection be prioritised over economic growth?",
    "What are the most significant social changes in your country over the last 20 years?",
  ],
};

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function useAISpeaking() {
  const isSpeechSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // ── State ──────────────────────────────────────────────────────────────────
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [session, setSession] = useState<SpeakingSession>({
    id: "", topic: "IELTS Speaking Test", duration: 0,
    level: "B2", language: "English", totalWords: 0,
    status: "idle", isActive: false, currentPart: 1, partStartedAt: 0,
  });
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [waveformLevels, setWaveformLevels] = useState<number[]>(Array(15).fill(8));
  const [currentPart, setCurrentPart] = useState<IELTSPart>(1);
  const [partSecondsLeft, setPartSecondsLeft] = useState(IELTS_PARTS[0].durationSeconds);
  const [isPrepPhase, setIsPrepPhase] = useState(false);
  const [prepSecondsLeft, setPrepSecondsLeft] = useState(0);
  const [cueCard, setCueCard] = useState("");

  // ── Refs (avoid stale closures) ────────────────────────────────────────────
  const sessionIdRef = useRef("");
  const currentPartRef = useRef<IELTSPart>(1);
  const isMutedRef = useRef(false);
  const avatarStateRef = useRef<AvatarState>("idle");
  const isPrepRef = useRef(false);
  const askedRef = useRef<Set<string>>(new Set());
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const partTimerRef = useRef<any>(null);
  const prepTimerRef = useRef<any>(null);
  const waveRef = useRef<any>(null);
  const isProcessingRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { avatarStateRef.current = avatarState; }, [avatarState]);
  useEffect(() => { isPrepRef.current = isPrepPhase; }, [isPrepPhase]);
  useEffect(() => { currentPartRef.current = currentPart; }, [currentPart]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const setAvatar = (s: AvatarState) => {
    avatarStateRef.current = s;
    setAvatarState(s);
  };

  const startWave = (mode: "listening" | "speaking") => {
    clearInterval(waveRef.current);
    waveRef.current = setInterval(() => {
      setWaveformLevels(
        Array.from({ length: 15 }, () =>
          mode === "listening" ? Math.floor(Math.random() * 55) + 10 : Math.floor(Math.random() * 85) + 15
        )
      );
    }, 80);
  };

  const stopWave = () => {
    clearInterval(waveRef.current);
    setWaveformLevels(Array(15).fill(8));
  };

  const addMsg = (sender: "user" | "ai", text: string, part: IELTSPart) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setTranscript(prev => [...prev, { sender, text, time, part }]);
  };

  // ── TTS ────────────────────────────────────────────────────────────────────
  const speakText = useCallback((text: string, onDone?: () => void) => {
    if (!window.speechSynthesis) { onDone?.(); return; }
    if (isMutedRef.current) { onDone?.(); return; }

    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "en-GB";
    utt.rate = 0.9;
    utt.pitch = 1.1;

    // Try to get a good English voice
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find(v => v.lang === "en-GB")
        || voices.find(v => v.lang.startsWith("en"))
        || voices[0];
      if (v) utt.voice = v;
    };

    if (window.speechSynthesis.getVoices().length > 0) {
      setVoice();
    } else {
      window.speechSynthesis.addEventListener("voiceschanged", setVoice, { once: true });
    }

    utt.onstart = () => { setAvatar("speaking"); startWave("speaking"); };
    utt.onend = () => { setAvatar("idle"); stopWave(); onDone?.(); };
    utt.onerror = (e) => {
      console.error("TTS error", e);
      setAvatar("idle"); stopWave(); onDone?.();
    };

    window.speechSynthesis.speak(utt);
  }, []);

  // ── Ask next question ──────────────────────────────────────────────────────
  const askQuestion = useCallback((part: IELTSPart) => {
    const pool = QUESTIONS[part];
    const fresh = pool.filter(q => !askedRef.current.has(q));
    const q = fresh.length > 0 ? randomFrom(fresh) : randomFrom(pool);
    askedRef.current.add(q);
    addMsg("ai", q, part);
    speakText(q);
  }, [speakText]);

  // ── Process user speech → AI response → next question ─────────────────────
  const processUserSpeech = useCallback(async (userText: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const part = currentPartRef.current;
    setAvatar("thinking");
    stopWave();

    addMsg("user", userText, part);
    setSession(prev => ({
      ...prev,
      totalWords: prev.totalWords + userText.split(/\s+/).length,
    }));

    try {
      const sid = sessionIdRef.current;
      const res = await speakingService.sendChatMessage(userText, sid);
      const reply: string = res.response || "Thank you. Please continue.";

      addMsg("ai", reply, part);
      speakText(reply, () => {
        isProcessingRef.current = false;
        // After AI finishes speaking, ask next question (Parts 1 & 3)
        if (part !== 2) {
          setTimeout(() => askQuestion(part), 1000);
        }
      });
    } catch (err: any) {
      console.error("Chat error:", err);
      isProcessingRef.current = false;
      if (err?.response?.status === 403 || err?.response?.status === 429) {
        window.dispatchEvent(new CustomEvent("open-upgrade-modal", {
          detail: { error: err.response.data?.error, message: err.response.data?.message },
        }));
      }
      setAvatar("error");
      stopWave();
      setTimeout(() => setAvatar("idle"), 2500);
    }
  }, [speakText, askQuestion]);

  // ── Speech Recognition setup ───────────────────────────────────────────────
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onstart = () => { setAvatar("listening"); startWave("listening"); };

    rec.onresult = (event: any) => {
      const text: string = event.results[0]?.[0]?.transcript?.trim() || "";
      if (text) {
        processUserSpeech(text);
      } else {
        setAvatar("idle");
        stopWave();
      }
    };

    rec.onerror = (e: any) => {
      console.error("STT error:", e.error);
      if (e.error === "not-allowed") {
        alert("Microphone access denied. Please allow microphone access in your browser settings.");
      }
      setAvatar("error");
      stopWave();
      isProcessingRef.current = false;
      setTimeout(() => setAvatar("idle"), 2000);
    };

    rec.onend = () => {
      if (avatarStateRef.current === "listening") {
        setAvatar("idle");
        stopWave();
      }
    };

    recognitionRef.current = rec;
    return () => { window.speechSynthesis?.cancel(); };
  }, [processUserSpeech]); // re-init when processUserSpeech changes (session change)

  // ── Session timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (session.isActive) {
      timerRef.current = setInterval(() => {
        setSession(p => ({ ...p, duration: p.duration + 1 }));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [session.isActive]);

  // ── Per-part countdown ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!session.isActive || isPrepPhase) return;
    const cfg = IELTS_PARTS[currentPart - 1];
    setPartSecondsLeft(cfg.durationSeconds);
    clearInterval(partTimerRef.current);
    partTimerRef.current = setInterval(() => {
      setPartSecondsLeft(p => (p <= 1 ? (clearInterval(partTimerRef.current), 0) : p - 1));
    }, 1000);
    return () => clearInterval(partTimerRef.current);
  }, [currentPart, session.isActive, isPrepPhase]);

  // ── Start session ──────────────────────────────────────────────────────────
  const startSession = async () => {
    try {
      const res = await speakingService.startSession("IELTS Speaking Test");
      sessionIdRef.current = res.id;
      askedRef.current.clear();
      isProcessingRef.current = false;
      setCurrentPart(1);
      currentPartRef.current = 1;
      setIsPrepPhase(false);
      isPrepRef.current = false;
      setCueCard("");
      setTranscript([]);
      setAvatar("idle");

      setSession({
        id: res.id,
        topic: "IELTS Speaking Test",
        duration: 0,
        level: res.level || "B2",
        language: res.language || "English",
        totalWords: 0,
        status: "connected",
        isActive: true,
        currentPart: 1,
        partStartedAt: Date.now(),
      });

      const welcome = "Good morning. My name is Sarah and I'm your IELTS examiner today. I will start by asking you some questions about yourself. Could you tell me your full name, please?";
      addMsg("ai", welcome, 1);
      speakText(welcome);
    } catch (err: any) {
      console.error("startSession error:", err);
      if (err?.response?.status === 403 || err?.response?.status === 429) {
        window.dispatchEvent(new CustomEvent("open-upgrade-modal", {
          detail: { error: err.response.data?.error, message: err.response.data?.message },
        }));
      }
      setAvatar("error");
      setTimeout(() => setAvatar("idle"), 3000);
    }
  };

  // ── End session ────────────────────────────────────────────────────────────
  const endSession = async () => {
    window.speechSynthesis?.cancel();
    clearInterval(timerRef.current);
    clearInterval(partTimerRef.current);
    clearInterval(prepTimerRef.current);
    stopWave();
    isProcessingRef.current = false;

    if (sessionIdRef.current) {
      try { await speakingService.endSession(sessionIdRef.current); } catch { /* ignore */ }
    }

    const bye = "Thank you. That is the end of the IELTS Speaking test. Goodbye!";
    addMsg("ai", bye, currentPartRef.current);
    speakText(bye);

    setSession(p => ({ ...p, isActive: false, status: "completed" }));
    setAvatar("idle");
    setIsPrepPhase(false);
  };

  // ── Advance to next part ───────────────────────────────────────────────────
  const advanceToPart = useCallback((next: IELTSPart) => {
    window.speechSynthesis?.cancel();
    clearInterval(partTimerRef.current);
    askedRef.current.clear();
    isProcessingRef.current = false;

    setCurrentPart(next);
    currentPartRef.current = next;
    setSession(p => ({ ...p, currentPart: next }));

    if (next === 2) {
      const card = randomFrom(QUESTIONS[2]);
      setCueCard(card);
      const prepAnnounce = `Now we move to Part 2. You will have 1 minute to prepare your answer. Here is your topic: ${card.split("\n")[0]}`;
      addMsg("ai", prepAnnounce, 2);
      speakText(prepAnnounce, () => {
        setIsPrepPhase(true);
        isPrepRef.current = true;
        setPrepSecondsLeft(60);
        clearInterval(prepTimerRef.current);
        prepTimerRef.current = setInterval(() => {
          setPrepSecondsLeft(p => {
            if (p <= 1) {
              clearInterval(prepTimerRef.current);
              setIsPrepPhase(false);
              isPrepRef.current = false;
              const go = "Your preparation time is up. Please begin speaking now. You have up to 2 minutes.";
              addMsg("ai", go, 2);
              speakText(go);
              return 0;
            }
            return p - 1;
          });
        }, 1000);
      });
    } else {
      const msg = next === 3
        ? "Now let's move on to Part 3. I'd like to discuss some more abstract questions related to what we talked about."
        : "";
      if (msg) {
        addMsg("ai", msg, next);
        speakText(msg, () => setTimeout(() => askQuestion(next), 800));
      } else {
        askQuestion(next);
      }
    }
  }, [speakText, askQuestion]);

  // ── Mic controls ───────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const state = avatarStateRef.current;
    if (!session.isActive || isMutedRef.current || isPrepRef.current) return;
    if (state === "thinking" || state === "speaking" || state === "listening") return;
    window.speechSynthesis?.cancel();
    try { recognitionRef.current?.start(); } catch (e) { console.error("STT start:", e); }
  }, [session.isActive]);

  const stopListeningAndProcess = useCallback(() => {
    if (avatarStateRef.current === "listening") {
      try { recognitionRef.current?.stop(); } catch (e) { console.error("STT stop:", e); }
    }
  }, []);

  return {
    avatarState, session, transcript, isMuted, waveformLevels, isSpeechSupported,
    currentPart, partSecondsLeft, isPrepPhase, prepSecondsLeft, cueCard,
    setIsMuted, startSession, endSession, advanceToPart,
    startListening, stopListeningAndProcess, processUserSpeech,
  };
}
