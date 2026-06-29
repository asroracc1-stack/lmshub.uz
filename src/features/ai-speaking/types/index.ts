export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'happy' | 'error' | 'disconnected';

export type IELTSPart = 1 | 2 | 3;

export interface IELTSPartConfig {
  part: IELTSPart;
  title: string;
  description: string;
  durationSeconds: number; // max duration for that part
  tips: string[];
}

export interface SpeakingSession {
  id: string;
  topic: string;
  duration: number; // seconds elapsed
  level: string;
  language: string;
  totalWords: number;
  status: string;
  isActive: boolean;
  currentPart: IELTSPart;
  partStartedAt: number; // timestamp (Date.now())
  cueCard?: string; // for Part 2
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

export interface TranscriptMessage {
  sender: 'user' | 'ai';
  text: string;
  time: string;
  part: IELTSPart;
}

export const IELTS_PARTS: IELTSPartConfig[] = [
  {
    part: 1,
    title: 'Introduction & Interview',
    description: 'The examiner will ask you general questions about yourself and familiar topics.',
    durationSeconds: 5 * 60, // 5 minutes
    tips: [
      'Speak clearly and confidently',
      'Give extended answers (2-3 sentences)',
      'Use a variety of vocabulary',
      'Avoid one-word answers',
    ],
  },
  {
    part: 2,
    title: 'Individual Long Turn',
    description: 'You will be given a cue card and asked to talk for 1-2 minutes on a topic.',
    durationSeconds: 4 * 60, // 4 minutes (incl. 1 min prep)
    tips: [
      'Use your 1 minute preparation time wisely',
      'Cover all bullet points on the cue card',
      'Use past tenses when describing events',
      'Organise your answer with a clear structure',
    ],
  },
  {
    part: 3,
    title: 'Two-way Discussion',
    description: 'The examiner will discuss more abstract issues related to the Part 2 topic.',
    durationSeconds: 5 * 60, // 5 minutes
    tips: [
      'Give and justify your opinions',
      'Use complex sentence structures',
      'Show awareness of different perspectives',
      'Use linking words and discourse markers',
    ],
  },
];
