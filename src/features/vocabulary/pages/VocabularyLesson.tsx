import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { VocabularyProvider } from '../store/vocabularyStore';
import { useVocabularyLesson } from '../hooks/useVocabularyLesson';
import { SpeechRecorder } from '../components/SpeechRecorder';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Volume2, 
  X as CloseIcon, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Bookmark,
  Flag,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Native Web Audio API sound generator (100% offline, zero latency beep synthesis)
const playSoundEffect = (type: 'correct' | 'wrong') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (type === 'correct') {
      // Ascending Duolingo-style double note chime (C5 then E5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
      gain1.gain.setValueAtTime(0.08, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.1);
      
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime);
        gain2.gain.setValueAtTime(0.08, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.15);
      }, 90);
    } else {
      // Descending sad buzzer note (E4 then C4)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(329.63, ctx.currentTime);
      gain1.gain.setValueAtTime(0.08, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.15);
      
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(261.63, ctx.currentTime);
        gain2.gain.setValueAtTime(0.08, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.2);
      }, 110);
    }
  } catch (e) {
    console.error('Failed to play sound chime:', e);
  }
};

const VocabularyLessonContent: React.FC = () => {
  const { level = 'A1', unit = '1' } = useParams();
  const unitNum = parseInt(unit);
  const navigate = useNavigate();
  const { role } = useAuth();
  const basePath = role === 'super_admin' ? '/super-admin' : role === 'student' ? '/student' : '/user';

  const {
    words,
    loading,
    currentStage: apiStage,
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

  // Re-map 3 stages to 4 visually distinct rounds
  // Stage 1: LEARN (Prompt: Please, learn new words attentively)
  // Stage 2: SPELL (Prompt: Spell the word correctly)
  // Stage 3: CHOOSE (Prompt: Choose the correct translation)
  // Stage 4: SPEAK (Prompt: Pronounce the word correctly)
  const [currentRoundStage, setCurrentRoundStage] = useState<number>(1); 

  // States
  const [accent, setAccent] = useState<'US' | 'UK'>('US');
  const [typedAnswer, setTypedAnswer] = useState('');
  const [multipleChoiceOptions, setMultipleChoiceOptions] = useState<string[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  // Evaluation states
  const [evaluationState, setEvaluationState] = useState<'IDLE' | 'CORRECT' | 'WRONG'>('IDLE');
  const [speechResult, setSpeechResult] = useState<any | null>(null);
  const [evaluatingSpeech, setEvaluatingSpeech] = useState(false);

  // Play Speech (TTS)
  const handlePlayAudio = (wordText: string) => {
    if (!wordText) return;
    try {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(wordText);
      utterance.lang = accent === 'US' ? 'en-US' : 'en-GB';
      synth.speak(utterance);
    } catch (e) {
      console.error(e);
    }
  };

  // Autoplay TTS when a word loads in LEARN, CHOOSE or SPEAK
  useEffect(() => {
    if (activeWord && (currentRoundStage === 1 || currentRoundStage === 3 || currentRoundStage === 4)) {
      handlePlayAudio(activeWord.word);
    }
  }, [activeWord, currentRoundStage, currentWordIndex]);

  // Construct MCQ options for Round 3 (Choose translation)
  useEffect(() => {
    if (!activeWord || currentRoundStage !== 3) return;

    const correctTranslation = activeWord.translation;
    const pool = words
      .map(w => w.translation)
      .filter(t => t !== correctTranslation);
    
    // Pick 3 random wrong options
    const wrongOptions = pool.sort(() => Math.random() - 0.5).slice(0, 3);
    
    // Fillers if pool is small
    const standardFillers = ['Xayrli tong', 'Kitob', 'Yaxshi', 'Koʻylak', 'Rahmat', 'Oila'];
    while (wrongOptions.length < 3) {
      const randomFiller = standardFillers[Math.floor(Math.random() * standardFillers.length)];
      if (!wrongOptions.includes(randomFiller) && randomFiller !== correctTranslation) {
        wrongOptions.push(randomFiller);
      }
    }

    // Combine and shuffle
    const shuffled = [correctTranslation, ...wrongOptions].sort(() => Math.random() - 0.5);
    setMultipleChoiceOptions(shuffled);
    setSelectedChoice(null);
    setEvaluationState('IDLE');
  }, [activeWord, currentRoundStage, currentWordIndex, words]);

  // Reset answer states on slide transitions
  useEffect(() => {
    setTypedAnswer('');
    setSelectedChoice(null);
    setEvaluationState('IDLE');
    setSpeechResult(null);
  }, [currentWordIndex, currentRoundStage]);

  // Stage 2 Slots key input handling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!activeWord || currentRoundStage !== 2 || evaluationState !== 'IDLE') return;

    if (e.key === 'Enter' && typedAnswer.trim()) {
      handleVerifySpelling();
    }
  };

  const handleVerifySpelling = () => {
    if (!activeWord) return;
    const isCorrect = submitSpelling(typedAnswer);
    if (isCorrect) {
      setEvaluationState('CORRECT');
      playSoundEffect('correct');
    } else {
      setEvaluationState('WRONG');
      playSoundEffect('wrong');
    }
  };

  // Handle MCQ click evaluation
  const handleSelectChoice = (option: string) => {
    if (evaluationState !== 'IDLE') return;
    setSelectedChoice(option);
    const isCorrect = option === activeWord?.translation;
    if (isCorrect) {
      setEvaluationState('CORRECT');
      playSoundEffect('correct');
    } else {
      setEvaluationState('WRONG');
      playSoundEffect('wrong');
    }
  };

  // Handle Voice evaluate
  const handleSpeechTranscript = async (text: string) => {
    if (!activeWord) return;
    setEvaluatingSpeech(true);
    setSpeechResult(null);

    try {
      const result = await evaluateSpeech(text);
      setSpeechResult(result);
      if (result.score >= 70) {
        setEvaluationState('CORRECT');
        playSoundEffect('correct');
      } else {
        setEvaluationState('WRONG');
        playSoundEffect('wrong');
      }
    } catch (e) {
      toast.error('Ovoz tahlil qilinmadi.');
    } finally {
      setEvaluatingSpeech(false);
    }
  };

  // Handle Next button trigger
  const handleNextAction = () => {
    if (evaluationState === 'IDLE' && (currentRoundStage === 2 || currentRoundStage === 3 || currentRoundStage === 4)) {
      // Must answer first before proceeding
      return;
    }

    setEvaluationState('IDLE');
    setSpeechResult(null);

    if (currentWordIndex < words.length - 1) {
      nextWord();
    } else {
      // Round completed for all words
      if (currentRoundStage < 4) {
        setCurrentRoundStage(prev => prev + 1);
        nextWord(); // resets to index 0
      } else {
        // All 4 rounds complete
        nextWord(); // calls final reward callback inside service hooks
      }
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
        <p className="text-slate-450 font-bold">Dars uchun soʻzlar topilmadi.</p>
        <Button onClick={() => navigate(`${basePath}/vocabulary`)} className="rounded-xl bg-slate-900 text-white">
          Roadmapga qaytish
        </Button>
      </div>
    );
  }

  const progressPercent = ((currentWordIndex + 1) / words.length) * 100;
  const promptText = 
    currentRoundStage === 1 ? 'Please, learn new words attentively' :
    currentRoundStage === 2 ? 'Spell the word correctly' :
    currentRoundStage === 3 ? 'Choose the correct translation' :
    'Pronounce the word correctly';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0c0817] flex flex-col justify-between select-none">
      {/* Top Header Section */}
      <div className="w-full max-w-4xl mx-auto px-4 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <Button
            onClick={() => navigate(`${basePath}/vocabulary`)}
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-slate-450 hover:bg-slate-200/50 dark:hover:bg-white/5 cursor-pointer"
          >
            <CloseIcon className="h-5 w-5" />
          </Button>

          <span className="text-xs font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">
            Round {currentRoundStage}
          </span>

          <span className="text-xs font-black tracking-wider text-slate-450 dark:text-slate-500 font-mono">
            {currentWordIndex + 1} of {words.length}
          </span>
        </div>

        {/* Dynamic yellow/emerald horizontal progress bar */}
        <Progress value={progressPercent} className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
      </div>

      {/* Primary Card View Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-3xl w-full mx-auto space-y-6">
        {/* Instruction Prompt */}
        <span className="text-sm font-black text-slate-700 dark:text-slate-300 block text-center tracking-tight">
          {promptText}
        </span>

        {activeWord && (
          <div className="w-full space-y-4">
            {/* Card 1: 3D Illustration / Image block */}
            <div className="bg-white dark:bg-[#160e2a] border border-slate-100 dark:border-white/5 rounded-[2rem] p-6 shadow-md flex items-center justify-center min-h-[180px] w-full relative">
              {activeWord.imageUrl ? (
                <img 
                  src={activeWord.imageUrl} 
                  alt={activeWord.word} 
                  className="h-32 object-contain"
                />
              ) : (
                <div className="text-center space-y-1">
                  <span className="text-5xl select-none block">
                    {currentRoundStage === 3 ? '❓' : currentRoundStage === 2 ? '📇' : '🧍'}
                  </span>
                </div>
              )}
            </div>

            {/* Card 2: Word & Pronunciation details */}
            {currentRoundStage !== 2 && (
              <div className="bg-white dark:bg-[#160e2a] border border-slate-100 dark:border-white/5 rounded-3xl p-5 shadow-sm flex items-center gap-4 w-full">
                <Button
                  onClick={() => handlePlayAudio(activeWord.word)}
                  className="h-12 w-12 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-900 border-none shadow-md cursor-pointer flex items-center justify-center"
                >
                  <Volume2 className="h-6 w-6" />
                </Button>
                <div>
                  <h3 className="text-xl font-black text-slate-850 dark:text-white capitalize">
                    {activeWord.word}
                  </h3>
                  <span className="text-xs font-semibold text-slate-400 tracking-wide font-mono">
                    {activeWord.ipaUs || ',ɪntrə\'dus'}
                  </span>
                </div>
              </div>
            )}

            {/* Stage-Specific layout cards */}
            
            {/* Round 1: LEARN DETAILS CARD */}
            {currentRoundStage === 1 && (
              <div className="bg-white dark:bg-[#160e2a] border border-slate-100 dark:border-white/5 rounded-3xl p-6 shadow-sm space-y-4 w-full text-left">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">part of speech</span>
                  <h4 className="text-lg font-black text-slate-850 dark:text-white">
                    {activeWord.partOfSpeech || 'verb'}
                  </h4>
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-50 dark:border-white/5">
                  <span className="text-[10px] font-black uppercase text-slate-400">translation (uzbek)</span>
                  <h4 className="text-base font-extrabold text-emerald-500 dark:text-emerald-400">
                    {activeWord.translation}
                  </h4>
                </div>

                {activeWord.exampleSentence && (
                  <div className="space-y-2 pt-2 border-t border-slate-50 dark:border-white/5 font-semibold text-xs leading-relaxed text-slate-650 dark:text-slate-350">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Example</span>
                    <p className="text-slate-800 dark:text-white font-bold">
                      {activeWord.exampleSentence}
                    </p>
                    {activeWord.uzbekExample && (
                      <p className="text-slate-450 dark:text-slate-400 mt-1">
                        {activeWord.uzbekExample}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Round 2: WRITE INPUT CARD (Highlights slots) */}
            {currentRoundStage === 2 && (
              <div className="bg-white dark:bg-[#160e2a] border border-slate-100 dark:border-white/5 rounded-3xl p-6 shadow-sm w-full text-center space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Uzbek translation</span>
                  <h4 className="text-xl font-black text-slate-850 dark:text-white mt-1">
                    {activeWord.translation}
                  </h4>
                </div>

                {/* Letter Slots */}
                <div className="flex justify-center gap-1.5 flex-wrap">
                  {activeWord.word.split('').map((char, charIdx) => {
                    const typedChar = typedAnswer[charIdx] || '';
                    const isActive = charIdx === typedAnswer.length && evaluationState === 'IDLE';

                    return (
                      <div
                        key={charIdx}
                        className={cn(
                          "h-11 w-11 rounded-xl border font-bold text-lg uppercase flex items-center justify-center transition-all",
                          isActive
                            ? "bg-amber-400 border-amber-400 text-slate-900 scale-105"
                            : typedChar
                            ? "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                            : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-white/5 text-transparent"
                        )}
                      >
                        {typedChar}
                      </div>
                    );
                  })}
                </div>

                {/* Hidden input overlay for full mobile keyboard support */}
                <input
                  type="text"
                  maxLength={activeWord.word.length}
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                  onKeyDown={handleKeyDown}
                  disabled={evaluationState !== 'IDLE'}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-text"
                  autoFocus
                />

                {evaluationState === 'IDLE' && (
                  <Button
                    onClick={handleVerifySpelling}
                    disabled={!typedAnswer.trim()}
                    className="h-10 px-6 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-none font-bold text-xs"
                  >
                    Tekshirish
                  </Button>
                )}
              </div>
            )}

            {/* Round 3: MCQ TRANSLATION GRID */}
            {currentRoundStage === 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {multipleChoiceOptions.map((option, idx) => {
                  const isSelected = selectedChoice === option;
                  const isCorrect = option === activeWord.translation;

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectChoice(option)}
                      disabled={evaluationState !== 'IDLE'}
                      className={cn(
                        "h-14 rounded-2xl border font-bold text-sm bg-white dark:bg-[#160e2a] text-slate-800 dark:text-slate-200 transition-all cursor-pointer flex items-center justify-center shadow-sm",
                        evaluationState === 'IDLE'
                          ? "border-slate-150/80 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5"
                          : isSelected && !isCorrect
                          ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : isCorrect
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-slate-100 dark:border-white/5 opacity-55"
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Round 4: TALAFFUZ VOICE CAPTURE CARD */}
            {currentRoundStage === 4 && (
              <div className="bg-white dark:bg-[#160e2a] border border-slate-100 dark:border-white/5 rounded-3xl p-6 shadow-sm w-full">
                <SpeechRecorder
                  targetWord={activeWord.word}
                  onTranscript={handleSpeechTranscript}
                  isProcessing={evaluatingSpeech}
                />

                {speechResult && (
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-black/20 rounded-2xl text-center space-y-2 border border-slate-100 dark:border-white/5">
                    <span className="text-xs font-black block">Natija: {speechResult.score}%</span>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                      {speechResult.feedback}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Actions and Evaluation Banners */}
      <div className="w-full">
        {/* Banner 1: IDLE / Learn Next control */}
        {evaluationState === 'IDLE' && (
          <div className="bg-white dark:bg-[#160e2a] border-t border-slate-150/40 dark:border-white/5 p-4 sm:p-5 flex justify-between items-center max-w-4xl mx-auto w-full rounded-t-[2rem]">
            {currentRoundStage === 1 ? (
              <>
                <Button
                  onClick={prevWord}
                  disabled={currentWordIndex === 0}
                  variant="ghost"
                  className="rounded-2xl h-11 px-4 text-xs font-bold dark:text-slate-350 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Oldingisi
                </Button>

                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-400">
                  <span>{currentWordIndex + 1} of {words.length}</span>
                </div>

                <Button
                  onClick={handleNextAction}
                  className="rounded-full h-12 w-12 bg-amber-400 hover:bg-amber-500 text-slate-900 border-none shadow-md flex items-center justify-center cursor-pointer shrink-0"
                >
                  <ChevronRight className="h-6 w-6 stroke-[3]" />
                </Button>
              </>
            ) : (
              <div className="text-center w-full py-2">
                <span className="text-xs font-black text-slate-400 tracking-wider flex items-center justify-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Javobingizni kiriting yoki tekshirishni bosing
                </span>
              </div>
            )}
          </div>
        )}

        {/* Banner 2: Correct answer response */}
        {evaluationState === 'CORRECT' && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-emerald-500/10 dark:bg-emerald-950/20 border-t-2 border-emerald-500 p-5 w-full flex flex-col sm:flex-row justify-between items-center gap-4 rounded-t-[2.5rem] max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                <Check className="h-5 w-5 stroke-[3]" />
              </div>
              <div>
                <h4 className="text-sm font-black text-emerald-600 dark:text-emerald-400">Toʻgʻri javob! 🎉</h4>
                <p className="text-[10px] text-emerald-500 dark:text-emerald-500/80 font-bold">Barakalla, mashqni davom ettiring.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl text-emerald-600 hover:bg-emerald-500/10 hidden sm:flex cursor-pointer"
              >
                <Bookmark className="h-4.5 w-4.5" />
              </Button>
              <Button
                onClick={handleNextAction}
                className="h-11 px-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs border-none shadow-md shadow-emerald-500/20 flex-1 sm:flex-none cursor-pointer"
              >
                Next
              </Button>
            </div>
          </motion.div>
        )}

        {/* Banner 3: Wrong answer response */}
        {evaluationState === 'WRONG' && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-rose-500/10 dark:bg-rose-950/20 border-t-2 border-rose-500 p-5 w-full flex flex-col sm:flex-row justify-between items-center gap-4 rounded-t-[2.5rem] max-w-4xl mx-auto"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-500 flex items-center justify-center text-white">
                <X className="h-5 w-5 stroke-[3]" />
              </div>
              <div>
                <h4 className="text-sm font-black text-rose-600 dark:text-rose-400">Xato javob!</h4>
                {activeWord && (
                  <p className="text-[10px] text-rose-500 font-bold">
                    Toʻgʻri javob: <span className="underline font-black">{currentRoundStage === 3 ? activeWord.translation : activeWord.word}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl text-rose-600 hover:bg-rose-500/10 cursor-pointer"
              >
                <Bookmark className="h-4.5 w-4.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl text-rose-600 hover:bg-rose-500/10 cursor-pointer"
              >
                <Flag className="h-4.5 w-4.5" />
              </Button>
              <Button
                onClick={handleNextAction}
                className="h-11 px-8 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs border-none shadow-md shadow-rose-500/20 flex-1 sm:flex-none cursor-pointer"
              >
                Next
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Stage Final Celebration Modal */}
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
              <h3 className="text-2xl font-black text-white mb-2">Dars yakunlandi! 🎉</h3>
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
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20 border-none cursor-pointer"
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
