import { useState, useEffect, useRef } from "react";
import { AvatarState, SpeakingSession } from "../types";
import { speakingService } from "../services/speakingService";

export function useAISpeaking(initialTopic: string = "Daily Conversation") {
  const isSpeechSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [session, setSession] = useState<SpeakingSession>({
    id: "",
    topic: initialTopic,
    duration: 0,
    level: "Intermediate (B2)",
    language: "English",
    totalWords: 0,
    status: "idle",
    isActive: false,
  });

  const [transcript, setTranscript] = useState<{ sender: 'user' | 'ai'; text: string; time: string }[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [waveformLevels, setWaveformLevels] = useState<number[]>([10, 10, 10, 10, 10]);

  const timerRef = useRef<any>(null);
  const waveformIntervalRef = useRef<any>(null);
  
  const recognitionRef = useRef<any>(null);
  const synthesisUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Timer simulation
  useEffect(() => {
    if (session.isActive) {
      timerRef.current = setInterval(() => {
        setSession((prev) => ({
          ...prev,
          duration: prev.duration + 1,
        }));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session.isActive]);

  // Waveform level simulator
  const startWaveformSimulation = (state: 'listening' | 'speaking') => {
    if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);
    waveformIntervalRef.current = setInterval(() => {
      setWaveformLevels(() => 
        Array.from({ length: 15 }, () => {
          if (state === 'listening') return Math.floor(Math.random() * 50) + 15;
          return Math.floor(Math.random() * 80) + 20;
        })
      );
    }, 100);
  };

  const stopWaveformSimulation = () => {
    if (waveformIntervalRef.current) clearInterval(waveformIntervalRef.current);
    setWaveformLevels([10, 10, 10, 10, 10]);
  };

  // Initialize Speech Recognition API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setAvatarState("listening");
        startWaveformSimulation("listening");
      };

      rec.onresult = async (event: any) => {
        const textResult = event.results[0][0].transcript;
        if (textResult && textResult.trim().length > 0) {
          await processUserSpeech(textResult);
        } else {
          setAvatarState("idle");
          stopWaveformSimulation();
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech recognition error:", e.error);
        if (e.error === "not-allowed") {
          alert("Microphone permission was denied. Please allow microphone access.");
        }
        setAvatarState("error");
        stopWaveformSimulation();
        setTimeout(() => setAvatarState("idle"), 2000);
      };

      rec.onend = () => {
        setWaveformLevels([10, 10, 10, 10, 10]);
      };

      recognitionRef.current = rec;
    } else {
      console.warn("SpeechRecognition API is not supported in this browser.");
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [session.id]);

  const startSession = async (topic: string = "Daily Conversation") => {
    try {
      const response = await speakingService.startSession(topic);
      setSession({
        id: response.id,
        topic: response.topic,
        duration: 0,
        level: response.level,
        language: response.language,
        totalWords: 0,
        status: "connected",
        isActive: true,
      });
      setAvatarState("idle");
      
      const welcomeText = `Hello! I'm your AI speaking assistant. Today, we're practicing: "${response.topic}". Please hold the microphone button to start speaking!`;
      setTranscript([
        {
          sender: 'ai',
          text: welcomeText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);

      speakText(welcomeText);
    } catch (err: any) {
      console.error("Failed to start speaking session:", err);
      if (err.response?.status === 403 || err.response?.status === 429) {
        window.dispatchEvent(new CustomEvent("open-upgrade-modal", {
          detail: {
            error: err.response.data?.error || "AI_LIMIT_REACHED",
            message: err.response.data?.message || "Limit exceeded"
          }
        }));
      }
      setAvatarState("error");
      setTimeout(() => setAvatarState("idle"), 3000);
    }
  };

  const endSession = async () => {
    if (!session.id) return;
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      await speakingService.endSession(session.id);
      setSession((prev) => ({ ...prev, isActive: false, status: "completed" }));
      setAvatarState("idle");
      stopWaveformSimulation();
    } catch (err) {
      console.error("Failed to end session:", err);
    }
  };

  const changeTopic = async (topic: string) => {
    if (!session.isActive) return;
    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      await endSession();
      await startSession(topic);
    } catch (err) {
      console.error("Failed to change topic:", err);
    }
  };

  const startListening = () => {
    if (!session.isActive || isMuted || avatarState === "thinking" || avatarState === "speaking") return;
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel(); 
    }
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
      }
    } else {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Safari or Edge.");
    }
  };

  const stopListeningAndProcess = () => {
    if (recognitionRef.current && avatarState === "listening") {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Failed to stop recognition:", e);
      }
    }
  };

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel(); 

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";

    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith("en") && v.name.includes("Google")) 
      || voices.find(v => v.lang.startsWith("en")) 
      || voices[0];
    
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => {
      setAvatarState("speaking");
      startWaveformSimulation("speaking");
    };

    utterance.onend = () => {
      setAvatarState("idle");
      stopWaveformSimulation();
    };

    utterance.onerror = (e) => {
      console.error("SpeechSynthesis error:", e);
      setAvatarState("idle");
      stopWaveformSimulation();
    };

    synthesisUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const processUserSpeech = async (userText: string) => {
    setAvatarState("thinking");
    stopWaveformSimulation();

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTranscript((prev) => [...prev, { sender: 'user', text: userText, time: now }]);
    
    setSession((prev) => ({
      ...prev,
      totalWords: prev.totalWords + userText.split(/\s+/).length,
    }));

    try {
      const response = await speakingService.sendChatMessage(userText, session.id);
      const aiReply = response.response;
      setTranscript((prev) => [...prev, { sender: 'ai', text: aiReply, time: now }]);
      speakText(aiReply);
    } catch (err: any) {
      console.error("Failed to send chat message:", err);
      if (err.response?.status === 403 || err.response?.status === 429) {
        window.dispatchEvent(new CustomEvent("open-upgrade-modal", {
          detail: {
            error: err.response.data?.error || "AI_LIMIT_REACHED",
            message: err.response.data?.message || "Limit exceeded"
          }
        }));
      }
      setAvatarState("error");
      stopWaveformSimulation();
      setTimeout(() => setAvatarState("idle"), 3000);
    }
  };

  return {
    avatarState,
    session,
    transcript,
    isMuted,
    waveformLevels,
    isSpeechSupported,
    setIsMuted,
    startSession,
    endSession,
    changeTopic,
    startListening,
    stopListeningAndProcess,
    processUserSpeech,
  };
}
