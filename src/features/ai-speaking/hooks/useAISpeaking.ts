import { useState, useEffect, useRef, useCallback } from "react";
import { AvatarState, IELTSPart, SpeakingSession, TranscriptMessage, IELTS_PARTS } from "../types";
import { speakingService } from "../services/speakingService";

// ─── IELTS part-specific question banks ──────────────────────────────────────
const IELTS_QUESTIONS: Record<IELTSPart, string[]> = {
  1: [
    "Can you tell me your full name, please?",
    "Where are you from originally?",
    "Do you work or are you a student?",
    "What do you do in your free time?",
    "Do you enjoy reading? What kinds of books do you like?",
    "Let's talk about your hometown. What do you like about it?",
    "Do you prefer living in a city or in the countryside? Why?",
    "How often do you use public transport?",
    "Do you think the weather affects your mood? In what way?",
    "What kind of food do you enjoy eating?",
  ],
  2: [
    "I'd like you to describe a person who has had a significant influence on your life.\n\nYou should say:\n• Who this person is\n• How you know them\n• What qualities they have\n• And explain why they have been so influential.",

    "Describe a place you visited that you particularly enjoyed.\n\nYou should say:\n• Where it was\n• Why you went there\n• What you did there\n• And explain why you enjoyed it so much.",

    "Describe a skill you would like to learn.\n\nYou should say:\n• What the skill is\n• Why you want to learn it\n• How you would go about learning it\n• And explain how this skill would benefit your life.",
  ],
  3: [
    "Do you think young people today face more pressure than previous generations? Why?",
    "How has technology changed the way people communicate in your country?",
    "What role should governments play in improving public health?",
    "Do you think economic development always leads to a better quality of life? Why or why not?",
    "How can education systems better prepare students for the modern workplace?",
    "Should environmental protection be prioritised over economic growth? Discuss.",
    "What do you think are the most significant social changes in your country over the last 20 years?",
  ],
};

// Cue cards for Part 2 (match index with IELTS_QUESTIONS[2])
const CUE_CARDS = IELTS_QUESTIONS[2];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function useAISpeaking() {
  const isSpeechSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [currentPart, setCurrentPart] = useState<IELTSPart>(1);
  const [partSecondsLeft, setPartSecondsLeft] = useState(IELTS_PARTS[0].durationSeconds);
  const [cueCard, setCueCard] = useState<string>("");
  const [prepSecondsLeft, setPrepSecondsLeft] = useState(0); // Part 2 prep countdown
  const [isPrepPhase, setIsPrepPhase] = useState(false);

  const [session, setSession] = useState<SpeakingSession>({
    id: "",
    topic: "IELTS Speaking Test",
    duration: 0,
    level: "B2 Upper-Intermediate",
    language: "English",
    totalWords: 0,
    status: "idle",
    isActive: false,
    currentPart: 1,
    partStartedAt: 0,
    cueCard: "",
  });

  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [waveformLevels, setWaveformLevels] = useState<number[]>(Array(15).fill(8));

  // Tracking asked questions per part to avoid repeats
  const askedQuestionsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<any>(null);
  const partTimerRef = useRef<any>(null);
  const prepTimerRef = useRef<any>(null);
  const waveformIntervalRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);

  // ── Waveform helpers ────────────────────────────────────────────────────────
  const startWaveform = useCallback((mode: "listening" | "speaking") => {
    if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);
    waveformIntervalRef.current = setInterval(() => {
      setWaveformLevels(
        Array.from({ length: 15 }, () =>
          mode === "listening"
            ? Math.floor(Math.random() * 55) + 10
            : Math.floor(Math.random() * 85) + 15
        )
      );
    }, 80);
  }, []);

  const stopWaveform = useCallback(() => {
    if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);
    setWaveformLevels(Array(15).fill(8));
  }, []);

  // ── TTS helper ─────────────────────────────────────────────────────────────
  const speakText = useCallback(
    (text: string, onDone?: () => void) => {
      if (!window.speechSynthesis || isMuted) {
        onDone?.();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-GB";
      utterance.rate = 0.92;
      utterance.pitch = 1.05;

      const pickVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        return (
          voices.find((v) => v.lang === "en-GB" && v.name.includes("Female")) ||
          voices.find((v) => v.lang.startsWith("en-GB")) ||
          voices.find((v) => v.lang.startsWith("en")) ||
          voices[0]
        );
      };

      const voice = pickVoice();
      if (voice) utterance.voice = voice;

      utterance.onstart = () => {
        isSpeakingRef.current = true;
        setAvatarState("speaking");
        startWaveform("speaking");
      };
      utterance.onend = () => {
        isSpeakingRef.current = false;
        setAvatarState("idle");
        stopWaveform();
        onDone?.();
      };
      utterance.onerror = () => {
        isSpeakingRef.current = false;
        setAvatarState("idle");
        stopWaveform();
        onDone?.();
      };

      window.speechSynthesis.speak(utterance);
    },
    [isMuted, startWaveform, stopWaveform]
  );

  // ── Add message to transcript ───────────────────────────────────────────────
  const addMessage = useCallback(
    (sender: "user" | "ai", text: string, part: IELTSPart) => {
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setTranscript((prev) => [...prev, { sender, text, time, part }]);
    },
    []
  );

  // ── Ask next question for current part ────────────────────────────────────
  const askNextQuestion = useCallback(
    (part: IELTSPart, onDone?: () => void) => {
      const pool = IELTS_QUESTIONS[part];
      const notAsked = pool.filter((q) => !askedQuestionsRef.current.has(q));
      const question = notAsked.length > 0 ? getRandomItem(notAsked) : getRandomItem(pool);
      askedQuestionsRef.current.add(question);
      addMessage("ai", question, part);
      speakText(question, onDone);
    },
    [addMessage, speakText]
  );

  // ── Session global timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (session.isActive) {
      timerRef.current = setInterval(() => {
        setSession((prev) => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [session.isActive]);

  // ── Per-part countdown ────────────────────────────────────────────────────
  useEffect(() => {
    if (!session.isActive || isPrepPhase) return;
    const cfg = IELTS_PARTS[currentPart - 1];
    setPartSecondsLeft(cfg.durationSeconds);
    clearInterval(partTimerRef.current);
    partTimerRef.current = setInterval(() => {
      setPartSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(partTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(partTimerRef.current);
  }, [currentPart, session.isActive, isPrepPhase]);

  // ── Speech Recognition init ───────────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onstart = () => {
      setAvatarState("listening");
      startWaveform("listening");
    };

    rec.onresult = async (event: any) => {
      const text: string = event.results[0][0].transcript.trim();
      if (text) {
        await processUserSpeech(text);
      } else {
        setAvatarState("idle");
        stopWaveform();
      }
    };

    rec.onerror = (e: any) => {
      console.error("STT error:", e.error);
      if (e.error === "not-allowed") {
        alert("Microphone access denied. Please allow microphone permission and try again.");
      }
      setAvatarState("error");
      stopWaveform();
      setTimeout(() => setAvatarState("idle"), 2000);
    };

    rec.onend = () => stopWaveform();

    recognitionRef.current = rec;

    return () => {
      window.speechSynthesis?.cancel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  // ── Move to next IELTS part ───────────────────────────────────────────────
  const advanceToPart = useCallback(
    (nextPart: IELTSPart) => {
      askedQuestionsRef.current.clear();
      setCurrentPart(nextPart);
      setSession((prev) => ({ ...prev, currentPart: nextPart }));

      const partCfg = IELTS_PARTS[nextPart - 1];

      if (nextPart === 2) {
        // Pick a cue card and give 1 minute prep
        const card = getRandomItem(CUE_CARDS);
        setCueCard(card);
        setSession((prev) => ({ ...prev, cueCard: card }));

        const prepMsg =
          `Now we move to Part 2. I'll give you a topic to talk about. You will have 1 minute to prepare your answer. Here is your topic:\n\n${card}\n\nYou have 1 minute. Start preparing now.`;
        addMessage("ai", prepMsg, 2);
        speakText(
          `Now we move to Part 2. You have 1 minute to prepare your answer. Here is your topic.`,
          () => {
            // 1 minute prep countdown
            setIsPrepPhase(true);
            setPrepSecondsLeft(60);
            clearInterval(prepTimerRef.current);
            prepTimerRef.current = setInterval(() => {
              setPrepSecondsLeft((prev) => {
                if (prev <= 1) {
                  clearInterval(prepTimerRef.current);
                  setIsPrepPhase(false);
                  // Ask to speak after prep
                  const prompt = "Your preparation time is up. Now please speak for 1 to 2 minutes on the topic.";
                  addMessage("ai", prompt, 2);
                  speakText(prompt);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }
        );
      } else {
        const transitionMsg =
          nextPart === 3
            ? "Excellent! Now let's move on to Part 3. I'd like to discuss some more abstract topics related to what we talked about in Part 2."
            : "";
        if (transitionMsg) {
          addMessage("ai", transitionMsg, nextPart);
          speakText(transitionMsg, () => askNextQuestion(nextPart));
        } else {
          askNextQuestion(nextPart);
        }
      }
    },
    [addMessage, askNextQuestion, speakText]
  );

  // ── Start full IELTS session ──────────────────────────────────────────────
  const startSession = async () => {
    try {
      const response = await speakingService.startSession("IELTS Speaking Test");
      askedQuestionsRef.current.clear();
      setCueCard("");
      setCurrentPart(1);
      setIsPrepPhase(false);

      setSession({
        id: response.id,
        topic: "IELTS Speaking Test",
        duration: 0,
        level: response.level || "B2 Upper-Intermediate",
        language: response.language || "English",
        totalWords: 0,
        status: "connected",
        isActive: true,
        currentPart: 1,
        partStartedAt: Date.now(),
        cueCard: "",
      });

      setTranscript([]);
      setAvatarState("idle");

      const welcome =
        "Good morning. My name is Sarah and I'm your IELTS examiner today. I'll start by asking you some questions about yourself. First, could you tell me your full name, please?";
      addMessage("ai", welcome, 1);
      speakText(welcome);
    } catch (err: any) {
      console.error("Failed to start IELTS session:", err);
      if (err.response?.status === 403 || err.response?.status === 429) {
        window.dispatchEvent(
          new CustomEvent("open-upgrade-modal", {
            detail: {
              error: err.response.data?.error || "AI_LIMIT_REACHED",
              message: err.response.data?.message || "Limit exceeded",
            },
          })
        );
      }
      setAvatarState("error");
      setTimeout(() => setAvatarState("idle"), 3000);
    }
  };

  // ── End session ────────────────────────────────────────────────────────────
  const endSession = async () => {
    window.speechSynthesis?.cancel();
    clearInterval(timerRef.current);
    clearInterval(partTimerRef.current);
    clearInterval(prepTimerRef.current);
    stopWaveform();

    if (session.id) {
      try {
        await speakingService.endSession(session.id);
      } catch (err) {
        console.error("endSession error:", err);
      }
    }

    const goodbye = "Thank you. That is the end of the IELTS Speaking test. You have done well. Goodbye!";
    addMessage("ai", goodbye, currentPart);

    setSession((prev) => ({ ...prev, isActive: false, status: "completed" }));
    setAvatarState("idle");
    setIsPrepPhase(false);
  };

  // ── Process user speech, reply via AI, then ask next question ─────────────
  const processUserSpeech = async (userText: string) => {
    setAvatarState("thinking");
    stopWaveform();

    addMessage("user", userText, currentPart);
    setSession((prev) => ({
      ...prev,
      totalWords: prev.totalWords + userText.split(/\s+/).length,
    }));

    try {
      const response = await speakingService.sendChatMessage(userText, session.id);
      const aiReply: string = response.response;
      addMessage("ai", aiReply, currentPart);
      speakText(aiReply, () => {
        // After AI speaks, ask another question for Part 1 or Part 3
        if (currentPart !== 2) {
          // small pause before next question
          setTimeout(() => askNextQuestion(currentPart), 1200);
        }
      });
    } catch (err: any) {
      console.error("Chat error:", err);
      if (err.response?.status === 403 || err.response?.status === 429) {
        window.dispatchEvent(
          new CustomEvent("open-upgrade-modal", {
            detail: {
              error: err.response.data?.error || "AI_LIMIT_REACHED",
              message: err.response.data?.message || "Limit exceeded",
            },
          })
        );
      }
      setAvatarState("error");
      stopWaveform();
      setTimeout(() => setAvatarState("idle"), 3000);
    }
  };

  // ── Microphone controls ───────────────────────────────────────────────────
  const startListening = () => {
    if (
      !session.isActive ||
      isMuted ||
      avatarState === "thinking" ||
      avatarState === "speaking" ||
      isPrepPhase
    )
      return;
    window.speechSynthesis?.cancel();
    try {
      recognitionRef.current?.start();
    } catch (e) {
      console.error("STT start error:", e);
    }
  };

  const stopListeningAndProcess = () => {
    if (avatarState === "listening") {
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.error("STT stop error:", e);
      }
    }
  };

  return {
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
    speakText,
    addMessage,
  };
}
