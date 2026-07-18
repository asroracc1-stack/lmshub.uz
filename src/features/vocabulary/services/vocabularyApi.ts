import { api } from '@/lib/axios';
import { 
  VocabularyWord, 
  UnitProgress, 
  UserVocabularySettings, 
  DashboardStats 
} from '../types/vocabulary';

export const vocabularyApi = {
  async getWords(params: { search?: string; level?: string; category?: string; page?: number; size?: number }) {
    const { data } = await api.get('/vocabulary/words', { params });
    return data;
  },

  async getWordsByUnit(level: string, unit: number): Promise<VocabularyWord[]> {
    const { data } = await api.get('/vocabulary/words/unit', {
      params: { level, unit }
    });
    return data;
  },

  async getRoadmap(level: string): Promise<{
    level: string;
    daily_goal: number;
    current_streak: number;
    longest_streak: number;
    vocabulary_title: string;
    units: UnitProgress[];
  }> {
    const { data } = await api.get('/vocabulary/roadmap', {
      params: { level }
    });
    return data;
  },

  async submitProgress(level: string, unit: number, stage: number): Promise<{
    success: boolean;
    coins_earned: number;
    xp_earned: number;
    new_stage: number;
  }> {
    const { data } = await api.post('/vocabulary/progress', null, {
      params: { level, unit, stage }
    });
    return data;
  },

  async getStats(): Promise<DashboardStats> {
    const { data } = await api.get('/vocabulary/stats');
    return data;
  },

  async getReviews(): Promise<any[]> {
    const { data } = await api.get('/vocabulary/reviews');
    return data;
  },

  async submitReview(progressId: string, correct: boolean, difficulty: string) {
    const { data } = await api.post('/vocabulary/reviews/submit', null, {
      params: { progressId, correct, difficulty }
    });
    return data;
  },

  async getWeakWords(): Promise<any[]> {
    const { data } = await api.get('/vocabulary/weak-words');
    return data;
  },

  async toggleBookmark(wordId: string): Promise<{ success: boolean; is_bookmarked: boolean }> {
    const { data } = await api.post('/vocabulary/words/bookmark', null, {
      params: { wordId }
    });
    return data;
  },

  async toggleFavorite(wordId: string): Promise<{ success: boolean; is_favorite: boolean }> {
    const { data } = await api.post('/vocabulary/words/favorite', null, {
      params: { wordId }
    });
    return data;
  },

  async getBookmarks(): Promise<any[]> {
    const { data } = await api.get('/vocabulary/bookmarks');
    return data;
  },

  async getSettings(): Promise<UserVocabularySettings> {
    const { data } = await api.get('/vocabulary/settings');
    return data;
  },

  async updateDailyGoal(goal: number): Promise<UserVocabularySettings> {
    const { data } = await api.post('/vocabulary/settings/goal', null, {
      params: { goal }
    });
    return data;
  },

  async claimChest(chestType: 'DAILY' | 'WEEKLY' | 'MONTHLY'): Promise<{ success: boolean; coins: number; xp: number }> {
    const { data } = await api.post('/vocabulary/claim-chest', null, {
      params: { chestType }
    });
    return data;
  },

  async evaluateSpeech(wordId: string, transcription: string) {
    const { data } = await api.post('/vocabulary/ai/pronounce-check', null, {
      params: { wordId, transcription }
    });
    return data;
  },

  async generateWordDataAI(word: string, level: string): Promise<any> {
    const { data } = await api.post('/vocabulary/ai/generate-word-data', null, {
      params: { word, level }
    });
    return data;
  },

  async adminCreateWord(word: Partial<VocabularyWord>): Promise<VocabularyWord> {
    const { data } = await api.post('/vocabulary/admin/words', word);
    return data;
  },

  async adminUpdateWord(id: string, word: Partial<VocabularyWord>): Promise<VocabularyWord> {
    const { data } = await api.put(`/vocabulary/admin/words/${id}`, word);
    return data;
  },

  async adminDeleteWord(id: string): Promise<void> {
    await api.delete(`/vocabulary/admin/words/${id}`);
  },

  async exportCsv(): Promise<Blob> {
    const { data } = await api.get('/vocabulary/admin/export', {
      responseType: 'blob'
    });
    return data;
  },

  async importCsv(file: File, level?: string): Promise<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    if (level) formData.append('level', level);
    const { data } = await api.post('/vocabulary/admin/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return data;
  }
};
