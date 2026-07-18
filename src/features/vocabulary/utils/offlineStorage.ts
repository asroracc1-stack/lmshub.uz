import { VocabularyWord } from '../types/vocabulary';

const WORDS_CACHE_KEY = 'vocab_cached_words_';
const PROGRESS_QUEUE_KEY = 'vocab_offline_progress_queue';

export const offlineStorage = {
  cacheUnitWords(level: string, unit: number, words: VocabularyWord[]): void {
    try {
      localStorage.setItem(`${WORDS_CACHE_KEY}${level}_${unit}`, JSON.stringify(words));
    } catch (e) {
      console.error('Failed to cache words offline:', e);
    }
  },

  getCachedUnitWords(level: string, unit: number): VocabularyWord[] | null {
    try {
      const cached = localStorage.getItem(`${WORDS_CACHE_KEY}${level}_${unit}`);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      console.error('Failed to read cached words offline:', e);
      return null;
    }
  },

  queueOfflineProgress(level: string, unit: number, stage: number): void {
    try {
      const queue = this.getOfflineProgressQueue();
      // Remove any existing progress for this unit with lower or equal stage to prevent duplicates
      const filtered = queue.filter(item => !(item.level === level && item.unit === unit && item.stage <= stage));
      filtered.push({ level, unit, stage, timestamp: Date.now() });
      localStorage.setItem(PROGRESS_QUEUE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to queue progress offline:', e);
    }
  },

  getOfflineProgressQueue(): { level: string; unit: number; stage: number; timestamp: number }[] {
    try {
      const queueStr = localStorage.getItem(PROGRESS_QUEUE_KEY);
      return queueStr ? JSON.parse(queueStr) : [];
    } catch (e) {
      console.error('Failed to read offline progress queue:', e);
      return [];
    }
  },

  removeQueueItem(level: string, unit: number, stage: number): void {
    try {
      const queue = this.getOfflineProgressQueue();
      const filtered = queue.filter(item => !(item.level === level && item.unit === unit && item.stage === stage));
      localStorage.setItem(PROGRESS_QUEUE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to update offline progress queue:', e);
    }
  },

  clearOfflineProgressQueue(): void {
    localStorage.removeItem(PROGRESS_QUEUE_KEY);
  }
};
