export type WordStatus = 'NEW' | 'LEARNING' | 'REVIEW' | 'MASTERED';

export interface VocabularyWord {
  id: string;
  word: string;
  translation: string;
  ipaUs?: string;
  ipaUk?: string;
  partOfSpeech?: string;
  definition?: string;
  exampleSentence?: string;
  uzbekExample?: string;
  imageUrl?: string;
  audioUsUrl?: string;
  audioUkUrl?: string;
  level: string;
  unit: number;
  synonyms?: string;
  antonyms?: string;
  difficultyScore: number;
  collocations?: string;
  commonMistakes?: string;
  pronunciationTips?: string;
  category?: string;
  createdAt?: string;
}

export interface UserVocabularyProgress {
  id?: string;
  userId?: string;
  wordId: string;
  word?: VocabularyWord;
  status: WordStatus;
  timesReviewed: number;
  timesCorrectWriting: number;
  timesTotalWriting: number;
  speakingAccuracyAvg: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  easeFactor: number;
  intervalDays: number;
  nextReviewAt?: string;
  lastReviewedAt?: string;
  isBookmarked: boolean;
  isFavorite: boolean;
}

export interface UnitProgress {
  unit: number;
  stageCompleted: number; // 0, 1, 2, 3
  totalWords: number;
  isUnlocked: boolean;
  remainingSeconds: number;
}

export interface UserVocabularySettings {
  userId: string;
  dailyGoal: number; // 10, 20, 30, 50
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
  totalMinutesStudied: number;
  vocabularyTitle: string;
  claimedChests?: string;
}

export interface SpeechEvaluationResult {
  score: number;
  stressScore: number;
  intonationScore: number;
  fluencyScore: number;
  feedback: string;
  verdict: 'Excellent' | 'Good' | 'Needs Practice';
  missingSounds: string[];
  wrongSounds: string[];
}

export interface DashboardStats {
  wordsLearned: number;
  masteredWords: number;
  learningWords: number;
  reviewWords: number;
  speakingAccuracy: number;
  writingAccuracy: number;
  streak: number;
  longestStreak: number;
  minutesStudied: number;
  coins: number;
  xp: number;
  vocabularyTitle: string;
  learningSpeedChart: { name: string; words: number }[];
  retentionRateChart: { name: string; rate: number }[];
}
