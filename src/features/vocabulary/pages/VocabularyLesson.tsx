import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { VocabularyProvider } from '../store/vocabularyStore';
import { useVocabularyLesson } from '../hooks/useVocabularyLesson';
import { SpeechRecorder } from '../components/SpeechRecorder';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Volume2, 
  ArrowLeft, 
  Check, 
  X, 
  Sparkles, 
  HelpCircle,
  HelpCircle as HintIcon,
  ChevronLeft,
  ChevronRight,
  Flame,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

const VocabularyLessonContent: React.FC = () => {
  const { level = 'A1', unit = '1' } = useParams();
  const unitNum = parseInt(unit);
  const navigate = useNavigate();
  const { role } = useAuth();
  const basePath = role === 'super_admin' ? '/super-admin' : role === 'student' ? '/student' : '/user';

  const {
    words,
    loading,
    currentStage,
    currentWordIndex,
    activeWord,
    nextWord,
    prevWord,
    submitSpelling,
    evaluateSpeech,
    progressCoins,
    progressXp,
    showCelebration,
    resetCelebration
  } = useVocabularyLesson(level, unitNum);

  // States
  const [accent, setAccent] = useState<'US' | 'UK'>('US');
  const [showTranslation, setShowTranslation] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [writeState, setWriteState] = useState<'IDLE' | 'CORRECT' | 'WRONG'>('IDLE');
  const [hintLetters, setHintLetters] = useState<string[]>([]);
  const [speechResult, setSpeechResult] = useState<any | null>(null);
  const [evaluatingSpeech, setEvaluatingSpeech] = useState(false);

  // Play Native Speech (TTS fallback using standard browser API)
  const handlePlayAudio = (wordText: string) => {
    if (!wordText) return;
    try {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(wordText);
      utterance.lang = accent === 'US' ? 'en-US' : 'en-GB';
      synth.speak(utterance);
    } catch (e) {
      console.error('Audio playback failed:', e);
    }
  };

  // Scramble letters helper for Stage 2 Hints
  const handleShowHint = () => {
    if (!activeWord) return;
    const scrambled = activeWord.word.toLowerCase().split('').sort(() => Math.random() - 0.5);
    setHintLetters(scrambled);
    toast.info("Soʻz tarkibidagi harflar aralashtirildi!");
  };

  // Handle Write Verification
  const handleVerifySpelling = () => {
    if (!activeWord) return;
    const correct = submitSpelling(typedAnswer);
    if (correct) {
      setWriteState('CORRECT');
      toast.success('Toʻgʻri spelling! 🎉');
      setTimeout(() => {
        setWriteState('IDLE');
        setTypedAnswer('');
        setHintLetters([]);
        nextWord();
      }, 1200);
    } else {
      setWriteState('WRONG');
      toast.error('Spellingda xato bor. Qaytadan urinib koʻring.');
      setTimeout(() => {
        setWriteState('IDLE');
      }, 1500);
    }
  };

  // Handle Speech evaluation transcript
  const handleSpeechTranscript = async (text: string) => {
    if (!activeWord) return;
    setEvaluatingSpeech(true);
    setSpeechResult(null);

    try {
      const result = await evaluateSpeech(text);
      setSpeechResult(result);
      if (result.score >= 70) {
        toast.success(`Ajoyib natija! Talaffuz: ${Math.round(result.score)}%`);
      } else {
        toast.error(`Kamchiliklar mavjud. Talaffuz: ${Math.round(result.score)}%`);
      }
    } catch (e) {
      toast.error('Ovozni tahlil qilish muvaffaqiyatsiz tugadi.');
    } finally {
      setEvaluatingSpeech(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="h-10 w-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
        <span className="text-sm font-semibold text-slate-400">Yuklanmoqda...</span>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-slate-400 font-bold">Bu unitda hozircha soʻzlar mavjud emas.</p>
        <Button onClick={() => navigate(`${basePath}/vocabulary`)} className="rounded-xl bg-slate-900 text-white">
          Orqaga qaytish
        </Button>
      </div>
    );
  }

  const progressPercent = ((currentWordIndex + 1) / words.length) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16 relative">
      {/* Top Controls / Header */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => navigate(`${basePath}/vocabulary`)}
          variant="ghost"
          className="rounded-2xl h-10 px-3 flex items-center gap-1.5 dark:text-slate-350"
        >
          <ArrowLeft className="h-4 w-4" />
          Roadmap
        </Button>

        <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-black">
          <button
            onClick={() => setAccent('US')}
            className={`px-3 py-1 rounded-lg transition-all ${
              accent === 'US' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'
            }`}
          >
            US Accent
          </button>
          <button
            onClick={() => setAccent('UK')}
            className={`px-3 py-1 rounded-lg transition-all ${
              accent === 'UK' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500'
            }`}
          >
            UK Accent
          </button>
        </div>
      </div>

      {/* Stage Banner & Overall Progress */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center text-xs font-black text-slate-450 uppercase tracking-widest">
          <span>Stage {currentStage}: {currentStage === 1 ? 'Learn' : currentStage === 2 ? 'Write' : 'Speak'}</span>
          <span>{currentWordIndex + 1} / {words.length}</span>
        </div>
        <Progress value={progressPercent} className="h-2 rounded-full" />
      </div>

      {/* Stage Layout Animation wrapper */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentStage}-${currentWordIndex}`}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
        >
          {activeWord && (
            <Card className="bg-white/40 dark:bg-[#160e2a]/45 border-slate-100 dark:border-white/5 rounded-[2.5rem] shadow-xl overflow-hidden backdrop-blur-xl">
              <CardContent className="p-8 sm:p-10 space-y-6 flex flex-col items-center">
                {/* Word Illustration (Large Image component) */}
                <div className="h-44 w-full max-w-sm rounded-[2rem] overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-white/5 shadow-inner flex items-center justify-center relative select-none">
                  {activeWord.imageUrl ? (
                    <img 
                      src={activeWord.imageUrl} 
                      alt={activeWord.word} 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl">🖼️</span>
                  )}
                </div>

                {/* Stage 1: LEARN LAYOUT */}
                {currentStage === 1 && (
                  <div className="w-full text-center space-y-5">
                    {/* Word and Sound Trigger */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex items-center justify-center gap-2">
                        <h3 className="text-3xl font-black tracking-tight text-slate-850 dark:text-white">
                          {activeWord.word}
                        </h3>
                        <Button
                          onClick={() => handlePlayAudio(activeWord.word)}
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 rounded-full text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-500 cursor-pointer"
                        >
                          <Volume2 className="h-5 w-5" />
                        </Button>
                      </div>

                      {activeWord.partOfSpeech && (
                        <Badge className="bg-purple-500/10 text-purple-500 dark:text-purple-400 font-extrabold text-[10px] uppercase rounded-md tracking-wider border-none">
                          {activeWord.partOfSpeech} {activeWord.ipaUs && `[${accent === 'US' ? activeWord.ipaUs : activeWord.ipaUk || activeWord.ipaUs}]`}
                        </Badge>
                      )}
                    </div>

                    {/* Definition */}
                    <div className="bg-slate-50/50 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/40 dark:border-white/5 font-semibold text-sm leading-relaxed text-slate-650 dark:text-slate-300">
                      <p className="text-xs font-black uppercase text-slate-400 mb-1 tracking-wider text-left">Definition</p>
                      <p className="text-left">{activeWord.definition || "No definition loaded."}</p>
                    </div>

                    {/* Example & Uzbek Example */}
                    <div className="text-left space-y-1.5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Example Sentence</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {activeWord.exampleSentence}
                      </p>
                      <p className="text-xs text-slate-450 dark:text-slate-400">
                        {activeWord.uzbekExample}
                      </p>
                    </div>

                    {/* Reveal Uzbek Translation button */}
                    <div className="pt-2">
                      {showTranslation ? (
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="bg-emerald-500/10 border border-emerald-500/20 py-3.5 px-6 rounded-2xl text-emerald-600 dark:text-emerald-400 font-black text-lg shadow-sm"
                        >
                          {activeWord.translation}
                        </motion.div>
                      ) : (
                        <Button
                          onClick={() => setShowTranslation(true)}
                          className="h-11 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-none font-bold text-xs"
                        >
                          Tarjimani koʻrish 👁️
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Stage 2: WRITE LAYOUT */}
                {currentStage === 2 && (
                  <div className="w-full space-y-6">
                    <div className="text-center space-y-1">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Uzbek Translation</p>
                      <h4 className="text-2xl font-black text-slate-850 dark:text-white">
                        {activeWord.translation}
                      </h4>
                    </div>

                    {/* Scrambled hints container */}
                    {hintLetters.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1.5 py-2">
                        {hintLetters.map((l, i) => (
                          <span 
                            key={i} 
                            className="h-8 w-8 rounded-xl bg-slate-150 dark:bg-slate-800 flex items-center justify-center font-bold text-xs uppercase text-slate-650 dark:text-slate-350 border border-slate-200/50 dark:border-white/5 select-none animate-fade-in"
                          >
                            {l}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Inputs */}
                    <div className="space-y-4">
                      <div className="relative">
                        <Input
                          placeholder="Spellingni kiriting..."
                          value={typedAnswer}
                          onChange={(e) => setTypedAnswer(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && typedAnswer.trim() && handleVerifySpelling()}
                          className={`h-12 rounded-2xl font-bold px-4 border-2 transition-all ${
                            writeState === 'CORRECT'
                              ? 'border-emerald-500 bg-emerald-500/10 focus-visible:ring-emerald-500'
                              : writeState === 'WRONG'
                              ? 'border-rose-500 bg-rose-500/10 focus-visible:ring-rose-500'
                              : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 focus-visible:ring-primary'
                          }`}
                        />
                        {writeState === 'CORRECT' && (
                          <Check className="absolute right-3.5 top-3.5 text-emerald-500 h-5 w-5 stroke-[3]" />
                        )}
                        {writeState === 'WRONG' && (
                          <X className="absolute right-3.5 top-3.5 text-rose-500 h-5 w-5 stroke-[3]" />
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleShowHint}
                          variant="ghost"
                          className="h-11 rounded-2xl border border-slate-200 dark:border-white/5 font-bold text-xs flex-1 flex items-center gap-1.5 dark:text-slate-350"
                        >
                          <HelpCircle className="h-4 w-4" />
                          Hint (Aralash harflar)
                        </Button>

                        <Button
                          onClick={handleVerifySpelling}
                          disabled={!typedAnswer.trim()}
                          className="h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex-1 border-none shadow-md"
                        >
                          Tekshirish
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stage 3: SPEAK LAYOUT */}
                {currentStage === 3 && (
                  <div className="w-full space-y-6">
                    <div className="text-center space-y-1.5 flex flex-col items-center">
                      <div className="flex items-center justify-center gap-2">
                        <h4 className="text-2xl font-black text-slate-850 dark:text-white">
                          {activeWord.word}
                        </h4>
                        <Button
                          onClick={() => handlePlayAudio(activeWord.word)}
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 rounded-full text-emerald-500 hover:bg-emerald-500/10"
                        >
                          <Volume2 className="h-5 w-5" />
                        </Button>
                      </div>
                      <span className="text-xs font-semibold text-slate-400">{activeWord.translation}</span>
                    </div>

                    {/* Microphone input component */}
                    <SpeechRecorder
                      targetWord={activeWord.word}
                      onTranscript={handleSpeechTranscript}
                      isProcessing={evaluatingSpeech}
                    />

                    {/* Speech diagnostic feedbacks */}
                    {speechResult && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`p-5 rounded-3xl border text-center ${
                          speechResult.score >= 85
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                            : speechResult.score >= 70
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        <h5 className="font-extrabold text-sm mb-1.5">Talaffuz natijasi: {speechResult.verdict}</h5>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3.5">
                          <div className="bg-white/50 dark:bg-black/20 p-2 rounded-xl text-xs font-bold shadow-sm">
                            <span className="block text-[10px] text-slate-400 mb-0.5">Umumiy</span>
                            <span>{Math.round(speechResult.score)}%</span>
                          </div>
                          <div className="bg-white/50 dark:bg-black/20 p-2 rounded-xl text-xs font-bold shadow-sm">
                            <span className="block text-[10px] text-slate-400 mb-0.5">Urgʻu</span>
                            <span>{Math.round(speechResult.stress_score)}%</span>
                          </div>
                          <div className="bg-white/50 dark:bg-black/20 p-2 rounded-xl text-xs font-bold shadow-sm">
                            <span className="block text-[10px] text-slate-400 mb-0.5">Intonatsiya</span>
                            <span>{Math.round(speechResult.intonation_score)}%</span>
                          </div>
                          <div className="bg-white/50 dark:bg-black/20 p-2 rounded-xl text-xs font-bold shadow-sm">
                            <span className="block text-[10px] text-slate-400 mb-0.5">Tezlik</span>
                            <span>{Math.round(speechResult.fluency_score)}%</span>
                          </div>
                        </div>

                        {/* Phonetics correction tips */}
                        <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed font-semibold">
                          AI Sharh: {speechResult.feedback || "Yaxshi talaffuz, mashq qilishda davom eting!"}
                        </p>
                      </motion.div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Prev / Next Navigation buttons */}
      <div className="flex justify-between items-center gap-4">
        <Button
          onClick={prevWord}
          disabled={currentWordIndex === 0}
          variant="outline"
          className="rounded-2xl h-11 px-4 border border-slate-200 dark:border-white/5 font-bold text-xs"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Oldingisi
        </Button>

        {currentStage === 1 && (
          <Button
            onClick={() => {
              setShowTranslation(false);
              nextWord();
            }}
            className="rounded-2xl h-11 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs border-none shadow-md"
          >
            Keyingisi
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}

        {currentStage === 3 && speechResult && (
          <Button
            onClick={() => {
              setSpeechResult(null);
              nextWord();
            }}
            className="rounded-2xl h-11 px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs border-none shadow-md"
          >
            Keyingisi
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Stage Final Celebration Popups */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="bg-[#160E26] border border-amber-500/20 rounded-[2.5rem] p-8 text-center max-w-sm w-full shadow-2xl"
            >
              <div className="mx-auto mb-6 h-28 w-28 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 animate-pulse relative">
                <Sparkles className="h-16 w-16" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Unit tugallandi! 🎉</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">Muvaffaqiyatli topshirdingiz! Sizga quyidagi mukofotlar taqdim etildi:</p>

              <div className="flex justify-center gap-4 mb-8">
                <div className="bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 rounded-2xl text-amber-400 font-extrabold text-sm flex items-center gap-1.5 shadow-sm">
                  <span>+{progressCoins} Coins</span>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-2xl text-emerald-400 font-extrabold text-sm flex items-center gap-1.5 shadow-sm">
                  <span>+{progressXp} XP (Stars)</span>
                </div>
              </div>

              <Button
                onClick={() => {
                  resetCelebration();
                  navigate(`${basePath}/vocabulary`);
                }}
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20 border-none"
              >
                Tugatish 👍
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function VocabularyLesson() {
  return (
    <VocabularyProvider>
      <VocabularyLessonContent />
    </VocabularyProvider>
  );
}
