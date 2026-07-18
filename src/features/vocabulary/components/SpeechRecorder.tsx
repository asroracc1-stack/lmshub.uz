import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SpeechRecorderProps {
  onTranscript: (transcription: string) => void;
  targetWord: string;
  isProcessing: boolean;
}

export const SpeechRecorder: React.FC<SpeechRecorderProps> = ({
  onTranscript,
  targetWord,
  isProcessing
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMsg("Sizning brauzeringiz ovozli tekshirishni qo'llab-quvvatlamaydi (Safari yoki Chrome tavsiya etiladi).");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsRecording(true);
      setErrorMsg(null);
      setTranscript('');
    };

    rec.onresult = (event: any) => {
      const resultText = event.results[0][0].transcript;
      setTranscript(resultText);
      onTranscript(resultText);
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      if (event.error === 'no-speech') {
        setErrorMsg('Ovoz eshitilmadi. Iltimos, qaytadan gapirib koʻring.');
      } else if (event.error === 'not-allowed') {
        setErrorMsg('Mikrofon ruxsati berilmagan. Sozlamalardan yoqing.');
      } else {
        setErrorMsg('Talaffuzni yozib olishda xatolik yuz berdi.');
      }
    };

    rec.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = rec;
  }, [onTranscript]);

  const toggleRecording = () => {
    if (isProcessing) return;

    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setErrorMsg(null);
      setTranscript('');
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 w-full max-w-md mx-auto">
      {/* Waveform / Visualizer */}
      <div className="h-16 flex items-center justify-center gap-1.5 w-full">
        {isRecording ? (
          Array.from({ length: 9 }).map((_, i) => (
            <motion.div
              key={i}
              animate={{
                height: [16, Math.random() * 48 + 16, 16]
              }}
              transition={{
                repeat: Infinity,
                duration: 0.6 + i * 0.05,
                ease: 'easeInOut'
              }}
              className="w-1.5 bg-emerald-500 rounded-full"
            />
          ))
        ) : isProcessing ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm font-bold animate-pulse">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            Talaffuzingiz AI orqali tekshirilmoqda...
          </div>
        ) : (
          <div className="text-slate-400 dark:text-slate-500 text-xs font-semibold select-none text-center">
            {targetWord ? `"${targetWord}" so'zini talaffuz qiling` : "Mikrofonni bosib gapiring"}
          </div>
        )}
      </div>

      {/* Mic Button */}
      <div className="relative">
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1.4, opacity: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full bg-emerald-500/20 blur-sm"
            />
          )}
        </AnimatePresence>

        <motion.div
          whileHover={{ scale: isProcessing ? 1 : 1.06 }}
          whileTap={{ scale: isProcessing ? 1 : 0.95 }}
        >
          <Button
            onClick={toggleRecording}
            disabled={isProcessing}
            size="icon"
            className={`h-20 w-20 rounded-full border-none shadow-2xl flex items-center justify-center cursor-pointer transition-all duration-300 ${
              isRecording
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30'
            }`}
          >
            {isRecording ? (
              <MicOff className="h-8 w-8 animate-pulse" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>
        </motion.div>
      </div>

      {/* Info & Transcript */}
      <div className="text-center min-h-[40px] px-4 w-full">
        {transcript && (
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 animate-fade-in">
            Siz aytdingiz: <span className="font-bold text-emerald-500">"{transcript}"</span>
          </p>
        )}

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 justify-center text-xs font-bold text-rose-500 bg-rose-500/10 py-1.5 px-3 rounded-full mt-2"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {errorMsg}
          </motion.div>
        )}
      </div>
    </div>
  );
};
