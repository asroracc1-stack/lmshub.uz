import { useState, useEffect } from 'react';
import { vocabularyApi } from '../services/vocabularyApi';
import { offlineStorage } from '../utils/offlineStorage';
import { VocabularyWord, SpeechEvaluationResult } from '../types/vocabulary';
import { useVocabularyStore } from '../store/vocabularyStore';
import { toast } from 'sonner';

export const useVocabularyLesson = (level: string, unit: number) => {
  const { isOffline, fetchRoadmap } = useVocabularyStore();
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStage, setCurrentStage] = useState<number>(1); // 1: LEARN, 2: WRITE, 3: SPEAK
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [progressCoins, setProgressCoins] = useState(0);
  const [progressXp, setProgressXp] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  // Load words
  useEffect(() => {
    const loadWords = async () => {
      setLoading(true);
      if (isOffline) {
        const cached = offlineStorage.getCachedUnitWords(level, unit);
        if (cached) {
          setWords(cached);
        } else {
          // If no cache, create fake mock offline words so the user is never stuck
          const mockWords: VocabularyWord[] = Array.from({ length: 20 }, (_, i) => ({
            id: `offline-word-${i}`,
            word: i === 0 ? 'introduce' : i === 1 ? 'address' : i === 2 ? 'environment' : `word${i}`,
            translation: i === 0 ? 'Tanishtirmoq' : i === 1 ? 'Manzil' : i === 2 ? 'Atrof-muhit' : `tarjima${i}`,
            level,
            unit,
            difficultyScore: 1.0,
            ipaUs: i === 0 ? 'ˌɪntrəˈdus' : i === 1 ? 'əˈdrɛs' : 'ɪnˈvaɪrənmənt',
            partOfSpeech: i === 0 ? 'verb' : 'noun',
            definition: i === 0 ? 'To present someone by name to another.' : 'The place where someone lives.',
            exampleSentence: i === 0 ? 'Let me introduce you to my team.' : 'What is your home address?',
            uzbekExample: i === 0 ? 'Sizni jamoamiz bilan tanishtirishga ruxsat bering.' : 'Sizning uy manzilingiz nima?'
          }));
          setWords(mockWords);
          offlineStorage.cacheUnitWords(level, unit, mockWords);
        }
      } else {
        try {
          const fetchedWords = await vocabularyApi.getWordsByUnit(level, unit);
          setWords(fetchedWords);
          offlineStorage.cacheUnitWords(level, unit, fetchedWords);
        } catch (e) {
          console.error('Failed to load words online:', e);
          const cached = offlineStorage.getCachedUnitWords(level, unit);
          if (cached) setWords(cached);
        }
      }
      setLoading(false);
    };

    loadWords();
  }, [level, unit, isOffline]);

  const activeWord = words[currentWordIndex] || null;

  const nextWord = () => {
    if (currentWordIndex < words.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
    } else {
      // Completed current stage for all words
      completeStage();
    }
  };

  const prevWord = () => {
    if (currentWordIndex > 0) {
      setCurrentWordIndex(prev => prev - 1);
    }
  };

  const completeStage = async () => {
    if (isOffline) {
      offlineStorage.queueOfflineProgress(level, unit, currentStage);
      // Mock rewards
      const earnedCoins = currentStage === 1 ? 10 : currentStage === 2 ? 7 : 10;
      const earnedXp = currentStage === 1 ? 7 : currentStage === 2 ? 5 : 8;
      setProgressCoins(prev => prev + earnedCoins);
      setProgressXp(prev => prev + earnedXp);

      toast.info(`Offline: Stage ${currentStage} saqlandi! Internet yonganda sync bo'ladi.`);
      advanceStage();
    } else {
      try {
        const res = await vocabularyApi.submitProgress(level, unit, currentStage);
        if (res.success) {
          setProgressCoins(prev => prev + res.coins_earned);
          setProgressXp(prev => prev + res.xp_earned);
          toast.success(`Yutuqlar: +${res.coins_earned} Coin, +${res.xp_earned} XP!`);
          advanceStage();
        }
      } catch (e) {
        // Fallback to offline queuing if api fails
        offlineStorage.queueOfflineProgress(level, unit, currentStage);
        advanceStage();
      }
    }
  };

  const advanceStage = () => {
    setCurrentWordIndex(0);
    if (currentStage < 3) {
      setCurrentStage(prev => prev + 1);
    } else {
      // All 3 stages completed! Show final celebration
      setShowCelebration(true);
      fetchRoadmap(level);
    }
  };

  const submitSpelling = (inputWord: string): boolean => {
    if (!activeWord) return false;
    const isCorrect = inputWord.trim().toLowerCase() === activeWord.word.trim().toLowerCase();
    
    // Update local statistics offline
    if (isOffline) {
      // record offline statistics locally if needed
    }
    
    return isCorrect;
  };

  const evaluateSpeech = async (transcription: string): Promise<SpeechEvaluationResult> => {
    if (!activeWord) throw new Error('No active word');
    
    if (isOffline) {
      // Offline local evaluation fallback
      const isCorrect = transcription.trim().toLowerCase() === activeWord.word.trim().toLowerCase();
      return {
        score: isCorrect ? 95.0 : 40.0,
        stressScore: isCorrect ? 90.0 : 40.0,
        intonationScore: isCorrect ? 90.0 : 40.0,
        fluencyScore: isCorrect ? 95.0 : 40.0,
        feedback: isCorrect ? "Zo'r talaffuz!" : "Tovushni aniqroq ayting.",
        verdict: isCorrect ? 'Excellent' : 'Needs Practice',
        missingSounds: [],
        wrongSounds: []
      };
    }

    return await vocabularyApi.evaluateSpeech(activeWord.id, transcription);
  };

  return {
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
    resetCelebration: () => {
      setShowCelebration(false);
      setCurrentStage(1);
      setCurrentWordIndex(0);
      setProgressCoins(0);
      setProgressXp(0);
    }
  };
};
