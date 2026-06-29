export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy' | 'error' | 'disconnected';

export interface SpeakingSession {
  id: string;
  topic: string;
  duration: number; // in seconds
  level: string;
  language: string;
  totalWords: number;
  status: string;
  isActive: boolean;
}

export interface SpeakingEnvironment {
  id: string;
  name: string;
  description: string;
  iconName: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface SpeakingSettings {
  avatarId: string;
  voiceId: string;
  inputDeviceId: string;
  outputDeviceId: string;
  cameraDeviceId: string;
  theme: 'light' | 'dark';
}

export interface HistoryItem {
  id: string;
  topic: string;
  date: string;
  duration: number; // in seconds
  score: number;
  language: string;
}

export interface SpeakingStats {
  pronunciation: number;
  fluency: number;
  grammar: number;
  vocabulary: number;
  confidence: number;
  dailySpeakingTime: number; // in minutes
  streak: number;
  wordsLearned: number;
  sessionsCompleted: number;
}
